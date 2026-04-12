"""Discord OAuth2 authentication for public users.

Completely separate from the admin fastapi-users instance.
Admin: User model + BearerTransport + JWT (30 min) + cookie name "token".
Public: PublicUser model + CookieTransport + JWT (30 days) + cookie name "user_token".
"""

import secrets
import uuid
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from fastapi_users import FastAPIUsers, UUIDIDMixin
from fastapi_users.authentication import (
    AuthenticationBackend,
    CookieTransport,
    JWTStrategy,
)
from fastapi_users.db import SQLAlchemyUserDatabase
from fastapi_users.jwt import decode_jwt
from fastapi_users.manager import BaseUserManager
from fastapi_users.router.oauth import (
    CSRF_TOKEN_COOKIE_NAME,
    STATE_TOKEN_AUDIENCE,
    generate_csrf_token,
    generate_state_token,
)
from httpx_oauth.clients.discord import DiscordOAuth2
from httpx_oauth.integrations.fastapi import OAuth2AuthorizeCallback
from httpx_oauth.oauth2 import OAuth2Token
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.auth.config import auth_settings
from src.auth.models import PublicOAuthAccount
from src.database import get_db
from src.users.constants import NicknameScript
from src.users.models import PublicUser

# ---------------------------------------------------------------------------
# Discord OAuth2 client
# ---------------------------------------------------------------------------

discord_client = DiscordOAuth2(
    client_id=auth_settings.DISCORD_CLIENT_ID,
    client_secret=auth_settings.DISCORD_CLIENT_SECRET,
    # We only need identify scope — no email required (RULES.md #U1)
    scopes=["identify"],
)

# ---------------------------------------------------------------------------
# Cookie transport + JWT strategy for public users
# ---------------------------------------------------------------------------

_cookie_secure = auth_settings.APP_ENV == "production"

public_cookie_transport = CookieTransport(
    cookie_name="user_token",
    cookie_httponly=True,
    cookie_samesite="lax",
    cookie_secure=_cookie_secure,
    # 30-day max_age so the browser keeps the cookie even without remember-me
    cookie_max_age=30 * 24 * 60 * 60,
)

_PUBLIC_JWT_LIFETIME = 30 * 24 * 60 * 60  # 30 days in seconds


def get_public_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(
        secret=auth_settings.JWT_SECRET,
        lifetime_seconds=_PUBLIC_JWT_LIFETIME,
        algorithm=auth_settings.JWT_ALG,
    )


public_auth_backend = AuthenticationBackend(
    name="public-jwt",
    transport=public_cookie_transport,
    get_strategy=get_public_jwt_strategy,
)

# ---------------------------------------------------------------------------
# DB dependency for PublicUser
# ---------------------------------------------------------------------------


async def get_public_user_db(session: AsyncSession = Depends(get_db)):
    yield SQLAlchemyUserDatabase(session, PublicUser, PublicOAuthAccount)


# ---------------------------------------------------------------------------
# PublicUserManager
# ---------------------------------------------------------------------------


class PublicUserManager(UUIDIDMixin, BaseUserManager[PublicUser, uuid.UUID]):
    reset_password_token_secret = auth_settings.JWT_SECRET
    verification_token_secret = auth_settings.JWT_SECRET

    async def on_after_register(
        self, user: PublicUser, request: Optional[Request] = None
    ):
        logger.info(f"New public user registered: id={user.id} discord_id={user.discord_id}")

    async def oauth_callback(
        self,
        oauth_name: str,
        access_token: str,
        account_id: str,
        account_email: str,  # may be empty string — Discord identify scope has no email
        expires_at: Optional[int] = None,
        refresh_token: Optional[str] = None,
        request: Optional[Request] = None,
        *,
        associate_by_email: bool = False,
        is_verified_by_default: bool = False,
    ) -> PublicUser:
        """Custom OAuth callback that uses discord_id for user lookup/creation.

        Overrides BaseUserManager.oauth_callback because:
        - Our PublicUser has no email/password fields.
        - We must persist discord_id and discord_username on the PublicUser row.
        - We do NOT use email for matching — Discord id is the authoritative key.
        """
        # Fetch Discord profile to get username/global_name
        profile = await discord_client.get_profile(access_token)
        discord_username: str = profile.get("global_name") or profile.get("username", "")

        session: AsyncSession = self.user_db.session

        # Look up existing PublicUser by discord_id (denormalized column)
        result = await session.execute(
            select(PublicUser)
            .where(PublicUser.discord_id == account_id)
            .options(selectinload(PublicUser.oauth_accounts))
        )
        user: Optional[PublicUser] = result.scalar_one_or_none()

        oauth_account_dict = {
            "oauth_name": oauth_name,
            "access_token": access_token,
            "account_id": account_id,
            "account_email": account_email or "",
            "expires_at": expires_at,
            "refresh_token": refresh_token,
            "user_id": None,  # filled in after user creation
        }

        if user is None:
            # First login — create PublicUser.
            # email is a synthetic value required by fastapi-users' Authenticator;
            # it is never exposed in the API and never used for login.
            synthetic_email = f"discord:{account_id}@rift.internal"
            new_user = PublicUser(
                id=uuid.uuid4(),
                discord_id=account_id,
                discord_username=discord_username,
                email=synthetic_email,
                hashed_password="",
                is_active=True,
                is_superuser=False,
                is_verified=True,
            )
            session.add(new_user)
            await session.flush()  # get new_user.id without committing; display_id is now populated via RETURNING

            # Auto-assign default nickname from sequential display_id (soft onboarding)
            # display_id is GENERATED ALWAYS AS IDENTITY — guaranteed unique, no collision possible
            _auto_nick = f"user{new_user.display_id:05d}"
            new_user.nickname = _auto_nick
            new_user.nickname_lower = _auto_nick  # already lowercase
            new_user.nickname_script = NicknameScript.LATIN
            # nickname_changed_at stays None → user can rename immediately with no cooldown

            oauth_account_dict["user_id"] = new_user.id
            oauth_account = PublicOAuthAccount(**oauth_account_dict)
            session.add(oauth_account)
            await session.commit()
            await session.refresh(new_user)

            # Reload with relationship
            result = await session.execute(
                select(PublicUser)
                .where(PublicUser.id == new_user.id)
                .options(selectinload(PublicUser.oauth_accounts))
            )
            user = result.scalar_one()
            await self.on_after_register(user, request)
            user._is_new = True
        else:
            # Returning user — update discord_username and refresh OAuth tokens
            user.discord_username = discord_username
            session.add(user)

            # Find and update existing oauth account
            existing_account = next(
                (
                    a
                    for a in user.oauth_accounts
                    if a.oauth_name == oauth_name and a.account_id == account_id
                ),
                None,
            )
            if existing_account is not None:
                existing_account.access_token = access_token
                existing_account.account_email = account_email or ""
                if expires_at is not None:
                    existing_account.expires_at = expires_at
                if refresh_token is not None:
                    existing_account.refresh_token = refresh_token
                session.add(existing_account)
            else:
                # OAuth account row missing — add it
                oauth_account_dict["user_id"] = user.id
                oauth_account = PublicOAuthAccount(**oauth_account_dict)
                session.add(oauth_account)

            await session.commit()
            await session.refresh(user)
            user._is_new = False

        return user


async def get_public_user_manager(user_db=Depends(get_public_user_db)):
    yield PublicUserManager(user_db)


# ---------------------------------------------------------------------------
# FastAPIUsers instance for public users
# ---------------------------------------------------------------------------

public_fastapi_users = FastAPIUsers[PublicUser, uuid.UUID](
    get_public_user_manager,
    [public_auth_backend],
)

current_public_user = public_fastapi_users.current_user(active=True)

# ---------------------------------------------------------------------------
# Auth router (logout only)
# ---------------------------------------------------------------------------

discord_auth_router = public_fastapi_users.get_auth_router(public_auth_backend)

# NOTE: We do NOT use public_fastapi_users.get_users_router() here because the
# auto-generated GET /users/me would conflict with the admin GET /users/me route.
# Instead, GET /users/me for public users is defined in users/router.py.

# ---------------------------------------------------------------------------
# Custom Discord OAuth2 router
#
# We cannot use public_fastapi_users.get_oauth_router() directly because:
#  1. The stock callback raises 400 if account_email is None (Discord identify
#     scope doesn't guarantee an email address).
#  2. After login we need to redirect to the frontend (not return 204).
#
# This router replicates the fastapi-users OAuth flow with two adjustments:
#  - account_email is allowed to be None/empty (we generate a synthetic value)
#  - The callback returns a RedirectResponse with the cookie attached
# ---------------------------------------------------------------------------

_CALLBACK_ROUTE_NAME = f"oauth:{discord_client.name}.{public_auth_backend.name}.callback"

_oauth2_authorize_callback = OAuth2AuthorizeCallback(
    discord_client,
    redirect_url=auth_settings.DISCORD_REDIRECT_URI,
)

discord_oauth_router = APIRouter()


@discord_oauth_router.get(
    "/authorize",
    name=f"oauth:{discord_client.name}.{public_auth_backend.name}.authorize",
)
async def discord_authorize(
    request: Request,
    scopes: list[str] = Query(None),
) -> RedirectResponse:
    """Redirect the browser to Discord OAuth2 authorization page."""
    csrf_token = generate_csrf_token()
    state_data: dict[str, str] = {"csrftoken": csrf_token}
    state = generate_state_token(state_data, auth_settings.JWT_SECRET)

    authorization_url = await discord_client.get_authorization_url(
        auth_settings.DISCORD_REDIRECT_URI,
        state,
        scopes,
    )

    redirect = RedirectResponse(url=authorization_url, status_code=status.HTTP_302_FOUND)
    redirect.set_cookie(
        CSRF_TOKEN_COOKIE_NAME,
        csrf_token,
        max_age=3600,
        path="/",
        secure=_cookie_secure,
        httponly=True,
        samesite="lax",
    )
    return redirect


@discord_oauth_router.get(
    "/callback",
    name=_CALLBACK_ROUTE_NAME,
)
async def discord_callback(
    request: Request,
    access_token_state: tuple[OAuth2Token, str] = Depends(_oauth2_authorize_callback),
    user_manager: PublicUserManager = Depends(get_public_user_manager),
    strategy: JWTStrategy = Depends(get_public_jwt_strategy),
):
    """Exchange Discord code for token, find/create user, set cookie, redirect to frontend."""
    token, state = access_token_state

    # Validate state JWT
    try:
        state_data = decode_jwt(state, auth_settings.JWT_SECRET, [STATE_TOKEN_AUDIENCE])
    except jwt.DecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ACCESS_TOKEN_DECODE_ERROR",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ACCESS_TOKEN_ALREADY_EXPIRED",
        )

    # Validate CSRF
    cookie_csrf_token = request.cookies.get(CSRF_TOKEN_COOKIE_NAME)
    state_csrf_token = state_data.get("csrftoken")
    if (
        not cookie_csrf_token
        or not state_csrf_token
        or not secrets.compare_digest(cookie_csrf_token, state_csrf_token)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAUTH_INVALID_STATE",
        )

    # Fetch Discord account_id (and optional email)
    account_id, account_email = await discord_client.get_id_email(token["access_token"])

    # Find or create public user via our custom manager
    user = await user_manager.oauth_callback(
        oauth_name=discord_client.name,
        access_token=token["access_token"],
        account_id=account_id,
        account_email=account_email or "",
        expires_at=token.get("expires_at"),
        refresh_token=token.get("refresh_token"),
        request=request,
        associate_by_email=False,
        is_verified_by_default=False,
    )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="LOGIN_BAD_CREDENTIALS",
        )

    # Write JWT and set cookie on a RedirectResponse
    jwt_token = await strategy.write_token(user)

    is_new = getattr(user, "_is_new", False)
    redirect_url = (
        f"{auth_settings.FRONTEND_URL}/?welcome=1" if is_new else auth_settings.FRONTEND_URL
    )
    redirect_response = RedirectResponse(
        url=redirect_url,
        status_code=status.HTTP_302_FOUND,
    )
    public_cookie_transport._set_login_cookie(redirect_response, jwt_token)

    # Clear the CSRF cookie
    redirect_response.delete_cookie(CSRF_TOKEN_COOKIE_NAME)

    logger.info(f"Public user logged in via Discord: id={user.id}")
    return redirect_response

import uuid

from fastapi_users import FastAPIUsers
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    JWTStrategy,
)

from src.auth.config import auth_settings
from src.auth.models import User
from src.auth.schemas import UserRead, UserUpdate
from src.auth.service import get_user_manager

bearer_transport = BearerTransport(tokenUrl="/auth/login")


def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(
        secret=auth_settings.JWT_SECRET,
        lifetime_seconds=auth_settings.JWT_EXP * 60,
        algorithm=auth_settings.JWT_ALG,
    )


auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

fastapi_users = FastAPIUsers[User, uuid.UUID](get_user_manager, [auth_backend])

current_user = fastapi_users.current_user(active=True)
current_superuser = fastapi_users.current_user(active=True, superuser=True)

auth_router = fastapi_users.get_auth_router(auth_backend)
users_router = fastapi_users.get_users_router(UserRead, UserUpdate)

import uuid

import sqlalchemy as sa
from fastapi_users.db import SQLAlchemyBaseOAuthAccountTableUUID, SQLAlchemyBaseUserTableUUID
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.models import Base


class User(SQLAlchemyBaseUserTableUUID, Base):
    __tablename__ = "user"


class PublicOAuthAccount(SQLAlchemyBaseOAuthAccountTableUUID, Base):
    """Discord OAuth2 account linked to a PublicUser.

    Managed entirely by fastapi-users OAuth2 flow.
    Do not read from or write to this table directly in the users module.
    """

    __tablename__ = "public_oauth_account"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        sa.ForeignKey("public_user.id", ondelete="CASCADE"),
        nullable=False,
    )

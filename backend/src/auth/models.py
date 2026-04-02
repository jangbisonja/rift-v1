from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from src.models import Base


class User(SQLAlchemyBaseUserTableUUID, Base):
    __tablename__ = "user"

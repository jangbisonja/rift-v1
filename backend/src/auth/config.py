from pydantic_settings import BaseSettings, SettingsConfigDict


class AuthConfig(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    JWT_SECRET: str = "change-me"
    JWT_ALG: str = "HS256"
    JWT_EXP: int = 30  # minutes


auth_settings = AuthConfig()

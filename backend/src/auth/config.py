from pydantic_settings import BaseSettings, SettingsConfigDict


class AuthConfig(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    JWT_SECRET: str = "change-me"
    JWT_ALG: str = "HS256"
    JWT_EXP: int = 30  # minutes (admin)

    DISCORD_CLIENT_ID: str = ""
    DISCORD_CLIENT_SECRET: str = ""
    DISCORD_REDIRECT_URI: str = "http://localhost:8000/auth/discord/callback"

    FRONTEND_URL: str = "http://localhost:3000"

    APP_ENV: str = "local"


auth_settings = AuthConfig()

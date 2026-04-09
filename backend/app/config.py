from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Application
    app_name: str = "Codeint API"
    debug: bool = False

    # Neon PostgreSQL
    database_url: str

    # JWT
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480  # 8 hours

    # AWS S3
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_bucket_name: str = "codeint-images"
    aws_region: str = "ap-south-1"

    # WhatsApp
    whatsapp_api_url: str = ""
    whatsapp_api_token: str = ""
    whatsapp_phone_number_id: str = ""

    # Redis / Celery
    redis_url: str = "redis://localhost:6379/0"

    # File uploads
    max_upload_size_mb: int = 500


@lru_cache
def get_settings() -> Settings:
    return Settings()

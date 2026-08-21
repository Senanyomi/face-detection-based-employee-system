from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_service_role_key: str

    # JWT
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # App
    environment: str = "development"
    log_level: str = "info"

    # Service ports
    auth_service_port: int = 8001
    attendance_service_port: int = 8002
    analytics_service_port: int = 8003
    device_service_port: int = 8004
    audit_service_port: int = 8005

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton — reads .env once."""
    return Settings()

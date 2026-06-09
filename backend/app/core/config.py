from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "SynapseIQ"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # JWT Settings
    JWT_SECRET: str = "supersecretjwtkeychangeinproduction1234567890"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 11520

    # PostgreSQL Database Settings
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/synapseiq"

    # Redis Settings
    REDIS_URL: str = "redis://localhost:6379/0"

    # Groq API Settings
    GROQ_API_KEY: str = Field(default="your_groq_api_key_here")

    # Notification Settings (Resend / Brevo)
    RESEND_API_KEY: str = Field(default="your_resend_api_key_here")
    BREVO_API_KEY: str = Field(default="your_brevo_api_key_here")
    SENDER_EMAIL: str = "noreply@synapseiq.com"

    # Load variables from .env file
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8", 
        extra="ignore"
    )

settings = Settings()

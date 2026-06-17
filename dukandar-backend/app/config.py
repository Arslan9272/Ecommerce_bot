from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://postgres:root@localhost:5432/postgres"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    eleven_api_key: str = ""
    eleven_voice_id: str = ""
    tts_lang: str = "ur-PK"

    # Anthropic — powers the bot's free-text understanding. Blank => deterministic fallback.
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-haiku-4-5-20251001"

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()

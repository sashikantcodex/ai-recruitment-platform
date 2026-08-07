from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    port: int = 8000
    ai_service_token: str
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    ai_mode: str = "mock"  # mock | openai


settings = Settings()

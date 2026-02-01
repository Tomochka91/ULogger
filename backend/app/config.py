# app/config.py
"""
Application configuration module.

Defines the AppConfig class based on Pydantic BaseSettings.
Responsible for loading global application configuration,
including the path to the main JSON settings file and .env support.
"""

from pydantic_settings import BaseSettings


class AppConfig(BaseSettings):
    # Path to the application settings JSON file
    SETTINGS_FILE: str = "backend/config/app_settings.json"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


config = AppConfig()

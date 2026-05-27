from __future__ import annotations

from pathlib import Path
from pydantic_settings import BaseSettings


ROOT_DIR = Path(__file__).resolve().parents[2]
WORKSPACE_DIR = ROOT_DIR.parent


class Settings(BaseSettings):
    AZURE_TENANT_ID: str = ""
    AZURE_CLIENT_ID: str = ""
    AZURE_CLIENT_SECRET: str = ""
    SHAREPOINT_SITE_ID: str = ""
    SHAREPOINT_DRIVE_ID: str = ""
    EXCEL_FILE_ID: str = ""
    # Allotment sheets (merged together as primary data)
    ALLOTMENT_SHEETS: str = "Allotment Data,Sheet1"
    # Additional data sheets
    TRAINER_SHEET: str = "Trainer Data Live"
    MASTER_SHEET: str = "Master Data"
    REQUEST_TRACK_SHEET: str = "Request ID Track"
    ARCHIVE_SHEET: str = "Archeive"
    POLL_INTERVAL_SECONDS: int = 300
    CORS_ORIGINS: str = "*"

    # MongoDB connection settings
    MONGODB_URI: str = ""
    MONGODB_DB_NAME: str = "timesheet"

    # JWT Authentication settings
    JWT_SECRET_KEY: str = "a_very_secure_random_hex_string_here"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440


    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def allotment_sheets_list(self) -> list[str]:
        return [s.strip() for s in self.ALLOTMENT_SHEETS.split(",") if s.strip()]

    @property
    def graph_configured(self) -> bool:
        return all(
            [
                self.AZURE_TENANT_ID,
                self.AZURE_CLIENT_ID,
                self.AZURE_CLIENT_SECRET,
                self.SHAREPOINT_DRIVE_ID,
                self.EXCEL_FILE_ID,
            ]
        )

    class Config:
        env_file = ".env"
        extra = "ignore"


# Trigger Uvicorn reload to load updated environment variables
settings = Settings()


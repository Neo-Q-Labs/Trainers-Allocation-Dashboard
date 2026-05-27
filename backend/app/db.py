from __future__ import annotations

import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger(__name__)

# Initialize the motor async MongoDB client
db_client: AsyncIOMotorClient | None = None
db = None

if settings.MONGODB_URI:
    try:
        db_client = AsyncIOMotorClient(settings.MONGODB_URI)
        # Connect to 'timesheet' database where all active Timesheet users are registered
        db_name = "timesheet"
        db = db_client[db_name]
        logger.info(f"MongoDB connected successfully to database: {db_name}")
    except Exception as exc:
        logger.error(f"Failed to connect to MongoDB: {exc}")
else:
    logger.warning("MONGODB_URI is not set. Database operations will fail.")


def get_db():
    """Dependency helper to get the active database instance."""
    if db is None:
        raise RuntimeError("Database connection not initialized. Please verify MONGODB_URI.")
    return db


def get_users_collection():
    """Retrieve the users collection from MongoDB."""
    return get_db()["users"]

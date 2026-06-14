from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.config import settings
from app.db import get_users_collection

# OAuth2 scheme configures FastAPI to inspect the Authorization header for a Bearer token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


# ---------------------------------------------------------------------------
# Password hashing and verification utilities
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    """Hash a cleartext password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a cleartext password against a hashed bcrypt password."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


# ---------------------------------------------------------------------------
# JWT creation and decoding utilities
# ---------------------------------------------------------------------------

def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT access token for authentication."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and validate a JWT token, returning the payload if valid."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


# ---------------------------------------------------------------------------
# FastAPI Dependency for Protecting Routes
# ---------------------------------------------------------------------------

async def get_current_user(token: str | None = Depends(oauth2_scheme)) -> dict[str, Any]:
    """Retrieve the currently authenticated user from the database.
    
    Raises 401 Unauthenticated on missing or invalid tokens.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
        
    email: str | None = payload.get("sub")
    if email is None:
        raise credentials_exception
        
    users_coll = get_users_collection()
    # Search by email, employeeId, or username
    user = await users_coll.find_one({
        "$or": [
            {"email": email},
            {"employeeId": email},
            {"username": email}
        ]
    })
    
    if user is None:
        raise credentials_exception
        
    # Standardize MongoDB document: remove _id which is ObjectID (not serializable)
    user["id"] = str(user.pop("_id"))
    if "password" in user:
        del user["password"] # Never return the hashed password in current user payload
        
    # No role gate — the dashboard is open to every authenticated user.
    # Any user with a valid token can call any protected endpoint.
    return user

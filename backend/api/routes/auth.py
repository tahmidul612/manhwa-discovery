# Authentication routes - AniList OAuth flow
import json
import logging
import secrets
from datetime import datetime, timedelta
from urllib.parse import urlencode
from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import RedirectResponse
from backend.config.settings import settings
from backend.services.anilist.client import anilist_client
from backend.api.middleware.auth import create_jwt_token, get_current_user
from backend.database.connection import get_db

FRONTEND_URL = "http://localhost:3009"

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/anilist/login")
async def anilist_login():
    """
    Redirect to AniList OAuth authorization page.
    """
    state = secrets.token_urlsafe(32)
    auth_url = anilist_client.get_authorization_url(state=state)

    return RedirectResponse(url=auth_url)


@router.get("/anilist/callback")
async def anilist_callback(
    code: str = Query(..., description="Authorization code from AniList"),
    state: str = Query(default="", description="CSRF state parameter")
):
    """
    Handle AniList OAuth callback.
    Exchanges auth code for token, creates/updates user, returns JWT.
    """
    try:
        # Exchange code for access token
        token_data = await anilist_client.exchange_code(code)
        access_token = token_data.get("access_token")
        expires_in = token_data.get("expires_in", 31536000)  # Default 1 year
        refresh_token = token_data.get("refresh_token")

        if not access_token:
            raise HTTPException(status_code=400, detail="Failed to obtain access token")

        # Get user info from AniList
        anilist_user = await anilist_client.get_current_user(access_token)

        if not anilist_user or not anilist_user.get("id"):
            raise HTTPException(status_code=400, detail="Failed to fetch AniList user info")

        anilist_id = str(anilist_user["id"])
        username = anilist_user.get("name", f"user_{anilist_id}")

        # Create or update user in database
        db = get_db()
        now = datetime.utcnow()
        token_expires = now + timedelta(seconds=expires_in)

        existing_user = await db.users.find_one({"anilist_id": anilist_id})

        if existing_user:
            # Update existing user
            await db.users.update_one(
                {"anilist_id": anilist_id},
                {"$set": {
                    "username": username,
                    "avatar": anilist_user.get("avatar", {}).get("large"),
                    "anilist_token": access_token,
                    "anilist_token_expires": token_expires,
                    "refresh_token": refresh_token,
                    "updated_at": now
                }}
            )
            user_id = str(existing_user["_id"])
            logger.info(f"Updated existing user: {username} (AniList ID: {anilist_id})")
        else:
            # Create new user
            result = await db.users.insert_one({
                "anilist_id": anilist_id,
                "username": username,
                "avatar": anilist_user.get("avatar", {}).get("large"),
                "anilist_token": access_token,
                "anilist_token_expires": token_expires,
                "refresh_token": refresh_token,
                "preferences": {},
                "created_at": now,
                "updated_at": now
            })
            user_id = str(result.inserted_id)
            logger.info(f"Created new user: {username} (AniList ID: {anilist_id})")

        # Create JWT token
        jwt_token = create_jwt_token(user_id, anilist_id)

        user_data = {
            "id": user_id,
            "anilist_id": anilist_id,
            "username": username,
            "avatar": anilist_user.get("avatar", {}).get("large")
        }

        # Redirect back to frontend with token and user data
        params = urlencode({
            "token": jwt_token,
            "user": json.dumps(user_data)
        })
        return RedirectResponse(url=f"{FRONTEND_URL}/auth/callback?{params}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth callback failed: {e}")
        # Redirect to frontend with error
        params = urlencode({"error": "Authentication failed"})
        return RedirectResponse(url=f"{FRONTEND_URL}/auth/callback?{params}")


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Invalidate current session"""
    # For JWT-based auth, the client just discards the token.
    # Optionally we could blacklist the token in Redis.
    logger.info(f"User {current_user.get('username')} logged out")
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user info"""
    return {
        "id": current_user["_id"],
        "anilist_id": current_user.get("anilist_id"),
        "username": current_user.get("username"),
        "avatar": current_user.get("avatar"),
        "preferences": current_user.get("preferences", {}),
        "created_at": current_user.get("created_at")
    }

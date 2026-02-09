# User data models
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId


class PyObjectId(ObjectId):
    """Custom ObjectId type for Pydantic"""
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema):
        field_schema.update(type="string")


class User(BaseModel):
    """User model with AniList OAuth tokens"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    anilist_id: str = Field(..., description="AniList user ID")
    username: str = Field(..., description="AniList username")
    anilist_token: str = Field(..., description="Encrypted AniList OAuth token")
    anilist_token_expires: datetime = Field(..., description="Token expiration time")
    refresh_token: Optional[str] = Field(None, description="AniList refresh token")
    preferences: Dict[str, Any] = Field(default_factory=dict, description="User preferences")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        populate_by_name = True


class UserCreate(BaseModel):
    """User creation model"""
    anilist_id: str
    username: str
    anilist_token: str
    anilist_token_expires: datetime
    refresh_token: Optional[str] = None


class UserResponse(BaseModel):
    """User response model (without sensitive data)"""
    id: str
    anilist_id: str
    username: str
    preferences: Dict[str, Any] = {}
    created_at: datetime

    class Config:
        from_attributes = True


class UserPreferences(BaseModel):
    """User preferences model"""
    theme: str = "dark"
    language: str = "en"
    auto_match_threshold: float = 0.85
    show_nsfw: bool = False
    notifications_enabled: bool = True

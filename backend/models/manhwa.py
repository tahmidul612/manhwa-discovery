# Manhwa data models
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId
from enum import Enum


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


class MangaStatus(str, Enum):
    """Manga publication status"""
    ONGOING = "ongoing"
    COMPLETED = "completed"
    HIATUS = "hiatus"
    CANCELLED = "cancelled"


class ListStatus(str, Enum):
    """User list status"""
    READING = "READING"
    COMPLETED = "COMPLETED"
    PAUSED = "PAUSED"
    DROPPED = "DROPPED"
    PLANNING = "PLANNING"


class AniListTitle(BaseModel):
    """AniList title format"""
    romaji: Optional[str] = None
    english: Optional[str] = None
    native: Optional[str] = None


class AniListData(BaseModel):
    """AniList manga data"""
    id: str
    title: AniListTitle
    alternative_titles: List[str] = []
    synonyms: List[str] = []
    status: Optional[str] = None
    progress: int = 0
    score: Optional[float] = None
    cover_image: Optional[str] = None
    chapters: Optional[int] = None
    average_score: Optional[float] = None
    start_date: Optional[Dict[str, int]] = None
    updated_at: Optional[datetime] = None


class MangaDexData(BaseModel):
    """MangaDex manga data"""
    id: str
    title: str
    alternative_titles: List[str] = []
    description: Optional[str] = None
    cover_url: Optional[str] = None
    chapters_count: Optional[int] = None
    rating: Optional[float] = None
    year: Optional[int] = None
    status: Optional[str] = None
    tags: List[str] = []
    latest_chapter: Optional[str] = None
    last_updated: Optional[datetime] = None
    authors: List[str] = []
    artists: List[str] = []


class ManhwaConnection(BaseModel):
    """Connection between AniList and MangaDex entries"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: PyObjectId = Field(..., description="User ID")
    anilist_id: str = Field(..., description="AniList manga ID")
    mangadex_id: str = Field(..., description="MangaDex manga ID")
    anilist_data: AniListData
    mangadex_data: MangaDexData
    match_confidence: float = Field(..., ge=0, le=1, description="Fuzzy matching confidence (0-1)")
    manually_linked: bool = Field(default=False, description="Whether manually linked by user")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        populate_by_name = True


class ManhwaConnectionCreate(BaseModel):
    """Create manhwa connection"""
    user_id: str
    anilist_id: str
    mangadex_id: str
    anilist_data: AniListData
    mangadex_data: MangaDexData
    match_confidence: float = 1.0
    manually_linked: bool = False


class ManhwaConnectionResponse(BaseModel):
    """Manhwa connection response"""
    id: str
    user_id: str
    anilist_id: str
    mangadex_id: str
    anilist_data: AniListData
    mangadex_data: MangaDexData
    match_confidence: float
    manually_linked: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Manhwa(BaseModel):
    """Unified manhwa model"""
    id: str
    source: str  # "anilist" or "mangadex"
    title: str
    alternative_titles: List[str] = []
    description: Optional[str] = None
    cover_url: Optional[str] = None
    authors: List[str] = []
    artists: List[str] = []
    genres: List[str] = []
    tags: List[str] = []
    status: Optional[str] = None
    year: Optional[int] = None
    chapters_count: Optional[int] = None
    rating: Optional[float] = None
    user_status: Optional[str] = None
    user_progress: Optional[int] = None
    user_score: Optional[float] = None


class ManhwaSearchResult(BaseModel):
    """Search result model"""
    results: List[Manhwa] = []
    total: int = 0
    page: int = 1
    per_page: int = 20
    has_next: bool = False


class CacheEntry(BaseModel):
    """Cache entry model"""
    id: str = Field(..., alias="_id")
    user_id: Optional[str] = None
    data: Dict[str, Any]
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        arbitrary_types_allowed = True
        populate_by_name = True


class SearchFilters(BaseModel):
    """Search filter model"""
    min_chapters: Optional[int] = None
    max_chapters: Optional[int] = None
    min_rating: Optional[float] = None
    status: Optional[str] = None
    release_year_min: Optional[int] = None
    release_year_max: Optional[int] = None
    tags: List[str] = []
    genres: List[str] = []


class SearchParams(BaseModel):
    """Search parameters"""
    query: str
    page: int = 1
    per_page: int = 20
    filters: Optional[SearchFilters] = None
    sort_by: str = "relevance"  # relevance, rating, chapters, latest_update, release_date
    sort_order: str = "desc"
    user_id: Optional[str] = None

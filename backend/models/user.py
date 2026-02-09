# User data models
# TODO: Define user-related data models


class User:
    """User model"""

    def __init__(self):
        self.id = None
        self.username = None
        self.anilist_id = None
        self.preferences = {}


class UserManhwaList:
    """User's manhwa list model"""

    def __init__(self):
        self.user_id = None
        self.entries = []
        self.last_updated = None


class ManhwaListEntry:
    """Single entry in user's manhwa list"""

    def __init__(self):
        self.manhwa_id = None
        self.status = None  # reading, completed, plan_to_read, dropped
        self.progress = 0
        self.score = None
        self.notes = None

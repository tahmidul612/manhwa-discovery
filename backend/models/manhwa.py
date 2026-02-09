# Manhwa data models
# TODO: Define data models for manhwa entities


class Manhwa:
    """Manhwa model representing a manhwa entry"""

    def __init__(self):
        self.id = None
        self.title = None
        self.alternative_titles = []
        self.description = None
        self.cover_url = None
        self.authors = []
        self.artists = []
        self.genres = []
        self.tags = []
        self.status = None
        self.year = None
        self.chapters_count = None
        self.rating = None


class ManhwaSearchResult:
    """Search result model"""

    def __init__(self):
        self.results = []
        self.total = 0
        self.page = 1
        self.per_page = 20

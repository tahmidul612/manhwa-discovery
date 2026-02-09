# Service for fuzzy matching and comparing manhwa between MangaDex and AniList
import logging
import re
from typing import List, Dict, Any, Optional, Tuple
from rapidfuzz import fuzz, process
from backend.services.mangadex.client import mangadex_client
from backend.models.manhwa import AniListData, MangaDexData, ManhwaConnection

logger = logging.getLogger(__name__)


class ComparisonService:
    """Service to compare and match manhwa across AniList and MangaDex platforms"""

    def __init__(self):
        self.min_auto_match_confidence = 0.85

    @staticmethod
    def normalize_title(title: str) -> str:
        """
        Normalize title for matching by removing special characters and standardizing

        Args:
            title: Original title

        Returns:
            Normalized title
        """
        if not title:
            return ""

        # Convert to lowercase
        normalized = title.lower()

        # Remove common variations
        normalized = re.sub(r'\s*[:\-–—]\s*', ' ', normalized)  # Replace : - – — with space
        normalized = re.sub(r'[^\w\s]', '', normalized)  # Remove special characters
        normalized = re.sub(r'\s+', ' ', normalized)  # Normalize whitespace
        normalized = normalized.strip()

        # Remove common prefixes/suffixes that don't affect matching
        patterns_to_remove = [
            r'\bthe\b',
            r'\ban\b',
            r'\ba\b',
            r'\bofficial\b',
            r'\bcolored\b',
            r'\bofficial colored\b'
        ]

        for pattern in patterns_to_remove:
            normalized = re.sub(pattern, '', normalized, flags=re.IGNORECASE)

        # Clean up extra whitespace from removals
        normalized = re.sub(r'\s+', ' ', normalized).strip()

        return normalized

    def extract_year(self, date_obj: Optional[Dict[str, int]]) -> Optional[int]:
        """
        Extract year from AniList date object

        Args:
            date_obj: Date object with year, month, day fields

        Returns:
            Year as integer or None
        """
        if date_obj and isinstance(date_obj, dict):
            return date_obj.get("year")
        return None

    def get_all_titles(
        self,
        anilist_title: Dict[str, Optional[str]],
        synonyms: List[str]
    ) -> List[str]:
        """
        Extract all available titles from AniList data

        Args:
            anilist_title: AniList title object (romaji, english, native)
            synonyms: List of synonyms

        Returns:
            List of all unique titles
        """
        titles = []

        # Add main titles
        if anilist_title:
            for key in ["romaji", "english", "native"]:
                title = anilist_title.get(key)
                if title:
                    titles.append(title)

        # Add synonyms
        if synonyms:
            titles.extend(synonyms)

        # Deduplicate while preserving order
        seen = set()
        unique_titles = []
        for title in titles:
            normalized = self.normalize_title(title)
            if normalized and normalized not in seen:
                seen.add(normalized)
                unique_titles.append(title)

        return unique_titles

    def match_titles(
        self,
        mangadex_title: str,
        mangadex_alts: List[str],
        anilist_title: Dict[str, Optional[str]],
        anilist_synonyms: List[str],
        mangadex_year: Optional[int] = None,
        anilist_year: Optional[int] = None
    ) -> float:
        """
        Multi-stage fuzzy matching between MangaDex and AniList titles

        Matching stages:
        1. Exact match (case-insensitive) → 100%
        2. High fuzzy match (>95) on main titles → 95%
        3. Strong fuzzy match (>85) with year validation → 90%
        4. Alternative titles match (>90) → 85%
        5. Partial token match with year → 80%

        Args:
            mangadex_title: Main MangaDex title
            mangadex_alts: Alternative MangaDex titles
            anilist_title: AniList title object
            anilist_synonyms: AniList synonyms
            mangadex_year: Publication year from MangaDex
            anilist_year: Start year from AniList

        Returns:
            Confidence score (0-1)
        """
        # Get all titles to compare
        anilist_titles = self.get_all_titles(anilist_title, anilist_synonyms)
        mangadex_titles = [mangadex_title] + (mangadex_alts or [])

        # Normalize all titles
        md_normalized = [self.normalize_title(t) for t in mangadex_titles if t]
        al_normalized = [self.normalize_title(t) for t in anilist_titles if t]

        if not md_normalized or not al_normalized:
            return 0.0

        # Stage 1: Exact match (case-insensitive)
        for md_title in md_normalized:
            if md_title in al_normalized:
                logger.debug(f"Exact match: {md_title}")
                return 1.0

        # Stage 2: High fuzzy match on main titles
        main_md = md_normalized[0]
        main_al = al_normalized[0]

        ratio = fuzz.ratio(main_md, main_al)
        if ratio > 95:
            logger.debug(f"High fuzzy match: {main_md} <-> {main_al} (ratio: {ratio})")
            return 0.95

        # Stage 3: Strong fuzzy match with year validation
        if ratio > 85:
            # Check if years match (if both available)
            if mangadex_year and anilist_year:
                year_diff = abs(mangadex_year - anilist_year)
                if year_diff <= 1:  # Allow 1 year difference
                    logger.debug(f"Strong fuzzy + year match: {main_md} <-> {main_al} (ratio: {ratio}, year: {mangadex_year})")
                    return 0.90
                else:
                    logger.debug(f"Strong fuzzy but year mismatch: {mangadex_year} vs {anilist_year}")
                    return 0.70  # Lower confidence due to year mismatch
            else:
                # No year data, use fuzzy score
                return 0.85

        # Stage 4: Alternative titles match
        best_ratio = 0.0
        for md_title in md_normalized:
            for al_title in al_normalized:
                current_ratio = fuzz.ratio(md_title, al_title)
                if current_ratio > best_ratio:
                    best_ratio = current_ratio

        if best_ratio > 90:
            logger.debug(f"Alternative titles match (ratio: {best_ratio})")
            return 0.85
        elif best_ratio > 85:
            return 0.80

        # Stage 5: Partial token match with year
        # Split titles into tokens and compare
        md_tokens = set(main_md.split())
        al_tokens = set(main_al.split())

        if len(md_tokens) > 1 and len(al_tokens) > 1:
            token_overlap = len(md_tokens & al_tokens) / max(len(md_tokens), len(al_tokens))
            if token_overlap > 0.7:
                # Check year if available
                if mangadex_year and anilist_year and abs(mangadex_year - anilist_year) <= 1:
                    logger.debug(f"Token overlap + year match: {token_overlap}")
                    return 0.80
                elif token_overlap > 0.85:
                    return 0.75

        # Use best fuzzy ratio as baseline
        confidence = best_ratio / 100.0
        logger.debug(f"Final confidence: {confidence} for {main_md} <-> {main_al}")
        return confidence

    async def find_best_match(
        self,
        anilist_entry: Dict[str, Any],
        search_limit: int = 5
    ) -> Optional[Tuple[Dict[str, Any], float]]:
        """
        Find best MangaDex match for an AniList entry

        Args:
            anilist_entry: AniList manga entry
            search_limit: Number of MangaDex results to check

        Returns:
            Tuple of (mangadex_data, confidence) or None
        """
        media = anilist_entry.get("media", {})
        title = media.get("title", {})

        # Try multiple title variations for searching
        search_titles = []
        if title.get("romaji"):
            search_titles.append(title["romaji"])
        if title.get("english"):
            search_titles.append(title["english"])

        if not search_titles:
            logger.warning("No titles available for matching")
            return None

        best_match = None
        best_confidence = 0.0

        # Extract year from AniList
        anilist_year = self.extract_year(media.get("startDate"))

        # Search MangaDex with each title variation
        for search_title in search_titles:
            try:
                results = await mangadex_client.search_manga(
                    query=search_title,
                    limit=search_limit
                )

                for result in results.get("data", []):
                    attributes = result.get("attributes", {})
                    md_title = attributes.get("title", {}).get("en", "")
                    md_alts = list(attributes.get("altTitles", [{}])[0].values()) if attributes.get("altTitles") else []
                    md_year = attributes.get("year")

                    # Calculate confidence
                    confidence = self.match_titles(
                        mangadex_title=md_title,
                        mangadex_alts=md_alts,
                        anilist_title=title,
                        anilist_synonyms=media.get("synonyms", []),
                        mangadex_year=md_year,
                        anilist_year=anilist_year
                    )

                    if confidence > best_confidence:
                        best_confidence = confidence
                        best_match = result

                    # Early exit if perfect match
                    if confidence >= 1.0:
                        break

                if best_confidence >= 1.0:
                    break

            except Exception as e:
                logger.error(f"Error searching MangaDex for '{search_title}': {e}")

        if best_match and best_confidence >= 0.70:
            logger.info(f"Found match for '{search_titles[0]}' with confidence {best_confidence:.2f}")
            return (best_match, best_confidence)

        logger.info(f"No suitable match found for '{search_titles[0]}' (best: {best_confidence:.2f})")
        return None

    async def auto_match_user_list(
        self,
        user_id: str,
        anilist_list: List[Dict[str, Any]],
        min_confidence: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Automatically match AniList entries to MangaDex

        Args:
            user_id: User ID
            anilist_list: List of AniList manga entries
            min_confidence: Minimum confidence threshold (default: 0.85)

        Returns:
            List of matched connections with metadata
        """
        if min_confidence is None:
            min_confidence = self.min_auto_match_confidence

        matched_connections = []

        logger.info(f"Auto-matching {len(anilist_list)} entries for user {user_id}")

        for entry in anilist_list:
            try:
                match_result = await self.find_best_match(entry)

                if match_result:
                    mangadex_data, confidence = match_result

                    if confidence >= min_confidence:
                        connection_data = {
                            "user_id": user_id,
                            "anilist_entry": entry,
                            "mangadex_data": mangadex_data,
                            "confidence": confidence,
                            "manually_linked": False
                        }
                        matched_connections.append(connection_data)
                        logger.info(f"Auto-matched: {entry.get('media', {}).get('title', {})} (confidence: {confidence:.2f})")
                    else:
                        logger.debug(f"Confidence too low ({confidence:.2f}) for: {entry.get('media', {}).get('title', {})}")

            except Exception as e:
                logger.error(f"Error matching entry: {e}")

        logger.info(f"Auto-matched {len(matched_connections)} out of {len(anilist_list)} entries")
        return matched_connections


# Global comparison service instance
comparison_service = ComparisonService()

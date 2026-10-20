"""
BaseSite abstract adapter defining the discovery, parsing, media extraction, and download lifecycle.
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from core.database import Database
from core.downloader import FileDownloader
from core.utils import logger


class BaseSite(ABC):
    """Abstract base class for all site crawlers."""

    def __init__(self, db: Optional[Database] = None, downloader: Optional[FileDownloader] = None):
        self.db = db or Database()
        self.downloader = downloader or FileDownloader(db=self.db)
        self.site_name = "base"

    @abstractmethod
    def discover_categories(self) -> List[Dict[str, Any]]:
        """Discover categories/filters available on the site."""
        pass

    @abstractmethod
    def discover_collections(self, category_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Discover collections/series of tests."""
        pass

    @abstractmethod
    def discover_tests(self, category_id: Optional[str] = None, collection_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Discover all tests under category/collection handling pagination."""
        pass

    @abstractmethod
    def discover_parts(self, test_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Discover parts for a given test."""
        pass

    @abstractmethod
    def parse_test(self, test_info: Dict[str, Any]) -> Dict[str, Any]:
        """Parse full test data, passages, questions, options, answers, and explanations."""
        pass

    @abstractmethod
    def extract_media(self, test_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract all audio, images, and document URLs from the parsed test."""
        pass

    @abstractmethod
    def download_media(self, test_data: Dict[str, Any], dry_run: bool = False, resume: bool = True) -> Dict[str, Any]:
        """Organize directories and download media files."""
        pass

    def run_discovery(self) -> Dict[str, Any]:
        """Run discovery mode and print summary information."""
        logger.info(f"[{self.site_name.upper()}] Running Discovery Mode...")
        categories = self.discover_categories()
        collections = self.discover_collections()
        tests = self.discover_tests()

        print(f"\n[DISCOVERY] Site: {self.site_name.upper()}")
        print(f"Categories: {len(categories)}")
        for c in categories[:5]:
            print(f"  - {c.get('name')} ({c.get('url')})")

        print(f"Collections: {len(collections)}")
        for col in collections[:5]:
            print(f"  - {col.get('name')}")

        print(f"Tests: {len(tests)}")
        for t in tests[:5]:
            print(f"  - {t.get('name')} (ID: {t.get('test_id')})")

        return {
            "categories": categories,
            "collections": collections,
            "tests": tests
        }

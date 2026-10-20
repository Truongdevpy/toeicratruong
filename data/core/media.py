"""
Media extraction layer for discovering and categorizing audio, image, and document URLs.
"""
import re
from typing import Any, Dict, List, Optional, Set
from urllib.parse import urlparse
from bs4 import BeautifulSoup

from config import (
    AUDIO_EXTENSIONS,
    IMAGE_EXTENSIONS,
    DOC_EXTENSIONS,
    ALL_MEDIA_EXTENSIONS,
)
from core.utils import normalize_url, get_file_extension


def categorize_media_type(url_or_ext: str) -> str:
    """Categorize file into audio, image, document, or other."""
    if not url_or_ext:
        return "other"
    val = url_or_ext.lower().split("?")[0].split("#")[0]
    if val.startswith("."):
        ext = val
    else:
        ext = get_file_extension(val)
    if ext in AUDIO_EXTENSIONS:
        return "audio"
    if ext in IMAGE_EXTENSIONS:
        return "image"
    if ext in DOC_EXTENSIONS:
        return "document"
    return "other"


def is_media_url(url: str) -> bool:
    """Check if URL points to a recognized media file."""
    if not url or not isinstance(url, str):
        return False
    clean = url.split("?")[0].split("#")[0].lower()
    return any(clean.endswith(ext) for ext in ALL_MEDIA_EXTENSIONS)


def create_media_item(
    url: str,
    source: str = "",
    test_id: str = "",
    part: Optional[int] = None,
    question: Optional[int] = None,
    base_url: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """Create normalized media dict."""
    norm_url = normalize_url(url, base_url=base_url)
    if not norm_url or not is_media_url(norm_url):
        return None

    ext = get_file_extension(norm_url)
    m_type = categorize_media_type(ext)
    return {
        "url": norm_url,
        "type": m_type,
        "extension": ext,
        "source": source,
        "test_id": str(test_id) if test_id else "",
        "part": part,
        "question": question
    }


def extract_media_from_html(
    html: str,
    base_url: Optional[str] = None,
    source: str = "",
    test_id: str = "",
    part: Optional[int] = None,
    question: Optional[int] = None
) -> List[Dict[str, Any]]:
    """Extract media URLs from HTML markup tags and attributes."""
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    found_urls: Set[str] = set()
    results: List[Dict[str, Any]] = []

    # 1. Tags with direct attributes: audio, video, source, img, a, iframe, embed, object
    target_attrs = ["src", "data-src", "data-url", "data-audio", "data-original", "href"]
    target_tags = ["audio", "video", "source", "img", "a", "iframe", "embed", "track"]

    ignore_patterns = ["zalo", "messenger", "logo", "facebook", "tiktok", "download_extension", "static/dist", "static/img/"]
    for tag in soup.find_all(target_tags):
        for attr in target_attrs:
            val = tag.get(attr)
            if val and isinstance(val, str) and is_media_url(val):
                val_lower = val.lower()
                if not any(ig in val_lower for ig in ignore_patterns):
                    found_urls.add(val)

    # 2. Extract from embedded script tags
    for script in soup.find_all("script"):
        stype = script.get("type", "")
        if "json" in stype or not script.get("src"):
            text = script.text
            if text:
                # Fallback regex for URLs ending with media extensions
                matches = re.findall(r'["''](https?:[^\s"'']+\.(?:' + '|'.join(ext.lstrip('.') for ext in ALL_MEDIA_EXTENSIONS) + r')[^\s"'']*)["'']', text, re.IGNORECASE)
                for m in matches:
                    found_urls.add(m)
                rel_matches = re.findall(r'["''](/[^\s"'']+\.(?:' + '|'.join(ext.lstrip('.') for ext in ALL_MEDIA_EXTENSIONS) + r')[^\s"'']*)["'']', text, re.IGNORECASE)
                for rm in rel_matches:
                    found_urls.add(rm)

    # Normalize and convert to result items
    for u in found_urls:
        item = create_media_item(u, source=source, test_id=test_id, part=part, question=question, base_url=base_url)
        if item:
            results.append(item)

    return results


def extract_media_from_json(
    data: Any,
    base_url: Optional[str] = None,
    source: str = "",
    test_id: str = "",
    part: Optional[int] = None,
    question: Optional[int] = None
) -> List[Dict[str, Any]]:
    """Recursively traverse a JSON object/list/dict and extract all media URLs."""
    found_urls: Set[str] = set()

    def _traverse(obj: Any):
        if isinstance(obj, dict):
            for k, v in obj.items():
                # Check key hints if value is a string
                _traverse(v)
        elif isinstance(obj, list):
            for item in obj:
                _traverse(item)
        elif isinstance(obj, str):
            if is_media_url(obj):
                found_urls.add(obj)
            elif any(ext in obj.lower() for ext in ALL_MEDIA_EXTENSIONS):
                # Search for media url within string
                m = re.findall(r'https?://[^\s"\'<>]+|(?:/[a-zA-Z0-9_\-\.]+)+\.(?:' + '|'.join(ext.lstrip('.') for ext in ALL_MEDIA_EXTENSIONS) + r')[^\s"\'<>]*', obj, re.IGNORECASE)
                for match in m:
                    if is_media_url(match):
                        found_urls.add(match)

    _traverse(data)

    results: List[Dict[str, Any]] = []
    for u in found_urls:
        item = create_media_item(u, source=source, test_id=test_id, part=part, question=question, base_url=base_url)
        if item:
            results.append(item)

    return results


def extract_media_from_dom(page, base_url: Optional[str] = None, source: str = "", test_id: str = "") -> List[Dict[str, Any]]:
    """Extract media elements from live Playwright page DOM."""
    try:
        urls = page.evaluate("""() => {
            const urls = new Set();
            const add = (u) => { if (u && typeof u === 'string') urls.add(u); };
            
            // Audio & Video
            document.querySelectorAll('audio, video, source').forEach(el => {
                add(el.src);
                add(el.getAttribute('src'));
                add(el.getAttribute('data-src'));
                add(el.getAttribute('data-url'));
            });

            // Images
            document.querySelectorAll('img').forEach(el => {
                add(el.src);
                add(el.getAttribute('data-src'));
                add(el.getAttribute('data-original'));
            });

            // Links (documents, pdfs, audio)
            document.querySelectorAll('a[href]').forEach(el => {
                add(el.href);
                add(el.getAttribute('href'));
            });

            // Iframes
            document.querySelectorAll('iframe').forEach(el => {
                add(el.src);
            });

            return Array.from(urls);
        }""")

        results = []
        for u in urls:
            item = create_media_item(u, source=source, test_id=test_id, base_url=base_url or page.url)
            if item:
                results.append(item)
        return results
    except Exception:
        return []

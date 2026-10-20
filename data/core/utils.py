"""
Utility functions for file handling, hashing, URL normalization, and structured logging.
"""
import hashlib
import json
import logging
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse, urldefrag
from typing import Union, Optional

from config import LOGS_DIR, ERROR_LOG_PATH


def sanitize_filename(name: str, max_length: int = 100) -> str:
    """Sanitize a filename for cross-platform and Windows filesystem compatibility."""
    if not name:
        return "unnamed"
    # Remove Windows illegal chars: <>:"/\|?*
    cleaned = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', str(name))
    cleaned = re.sub(r'[\s_]+', '_', cleaned).strip(' ._')
    if not cleaned:
        return "unnamed"
    if len(cleaned) > max_length:
        base, dot, ext = cleaned.rpartition('.')
        if dot and len(ext) <= 10:
            allowed_base = max(1, max_length - len(ext) - 1)
            cleaned = base[:allowed_base] + '.' + ext
        else:
            cleaned = cleaned[:max_length]
    return cleaned


def sanitize_path_segment(segment: str, max_length: int = 120) -> str:
    """Sanitize a folder/directory name segment."""
    if not segment:
        return "default"
    cleaned = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', str(segment))
    cleaned = re.sub(r'\s+', '_', cleaned).strip(' ._')
    if not cleaned:
        return "default"
    return cleaned[:max_length]


def compute_file_sha256(target: Union[Path, str, bytes]) -> str:
    """Compute SHA-256 hash of a file or byte string."""
    sha = hashlib.sha256()
    if isinstance(target, bytes):
        sha.update(target)
        return sha.hexdigest()

    path = Path(target)
    if not path.is_file():
        return ""
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()


def normalize_url(url: str, base_url: Optional[str] = None) -> str:
    """Normalize relative, protocol-relative, or fragmented URLs to absolute URLs."""
    if not url:
        return ""
    url = url.strip()
    # Remove hash fragment
    url, _ = urldefrag(url)
    if url.startswith("//"):
        url = "https:" + url
    elif url.startswith("/") and base_url:
        url = urljoin(base_url, url)
    elif not urlparse(url).scheme and base_url:
        url = urljoin(base_url, url)
    return url


def get_file_extension(url_or_path: str) -> str:
    """Extract clean lowercase file extension from URL or path without query params."""
    if not url_or_path:
        return ""
    parsed = urlparse(str(url_or_path))
    path = parsed.path
    _, ext = os.path.splitext(path)
    return ext.lower()


def format_bytes(size_bytes: int) -> str:
    """Format bytes into human-readable representation."""
    if size_bytes <= 0:
        return "0 B"
    units = ["B", "KB", "MB", "GB", "TB"]
    size = float(size_bytes)
    unit_idx = 0
    while size >= 1024.0 and unit_idx < len(units) - 1:
        size /= 1024.0
        unit_idx += 1
    return f"{size:.2f} {units[unit_idx]}"


# Global Logger setup
logger = logging.getLogger("toeic_crawler")
logger.setLevel(logging.INFO)

if not logger.handlers:
    # Console Handler
    c_handler = logging.StreamHandler(sys.stdout)
    c_handler.setLevel(logging.INFO)
    c_format = logging.Formatter("[%(asctime)s] [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
    c_handler.setFormatter(c_format)
    logger.addHandler(c_handler)

    # File Handler
    crawler_log = LOGS_DIR / "crawler.log"
    f_handler = logging.FileHandler(crawler_log, encoding="utf-8")
    f_handler.setLevel(logging.DEBUG)
    f_format = logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s")
    f_handler.setFormatter(f_format)
    logger.addHandler(f_handler)


def log_error(site: str, url: str, error_msg: str, status: Optional[int] = None, test_id: Optional[str] = None):
    """Write structured error records to logs/errors.jsonl."""
    logger.error(f"[{site.upper()}] URL: {url} | Status: {status} | Error: {error_msg}")
    record = {
        "site": site,
        "test_id": test_id,
        "url": url,
        "status": status,
        "error": str(error_msg),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    try:
        with open(ERROR_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    except Exception as exc:
        logger.debug(f"Failed writing error to {ERROR_LOG_PATH}: {exc}")

"""
Global Configuration for TOEIC Crawler & Downloader.
"""
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
LOGS_DIR = BASE_DIR / "logs"
EXPORT_DIR = BASE_DIR / "export"
RAW_DIR = DATA_DIR / "raw"
JSON_DIR = DATA_DIR / "json"
SESSIONS_DIR = DATA_DIR / "sessions"
DB_PATH = DATA_DIR / "crawler.db"
ERROR_LOG_PATH = LOGS_DIR / "errors.jsonl"

# Ensure essential runtime directories exist
for directory in [DATA_DIR, LOGS_DIR, EXPORT_DIR, RAW_DIR, JSON_DIR, SESSIONS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Network & Rate Limiting Defaults
DEFAULT_CONCURRENCY = 3
DEFAULT_DELAY_MIN = 1.0
DEFAULT_DELAY_MAX = 2.0
MAX_RETRIES = 3
REQUEST_TIMEOUT = 30.0

# User-Agent & Request Headers
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)

DEFAULT_HEADERS = {
    "User-Agent": DEFAULT_USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
}

# Dau TOEIC Configuration
DAUTOEIC_CONFIG = {
    "site_name": "dautoeic",
    "base_url": "https://dauenglish.com",
    "alt_url": "https://dautoeic.vn",
    "supabase_url": "https://odlnhfaygiotcyehuysw.supabase.co",
    "supabase_anon_key": "sb_publishable_4Gim-4AGEqRCeNXSVp8Xzw_P3_Lz8CB",
    "storage_url": "https://odlnhfaygiotcyehuysw.supabase.co/storage/v1/object/public/mock-test-media",
}

# Study4 Configuration
STUDY4_CONFIG = {
    "site_name": "study4",
    "base_url": "https://study4.com",
    "library_toeic_url": "https://study4.com/tests/toeic/",
    "library_sw_url": "https://study4.com/tests/toeic-sw/",
    "login_url": "https://study4.com/login/",
    "session_file": SESSIONS_DIR / "study4_storage_state.json",
    "cookies_file": SESSIONS_DIR / "study4_cookies.json",
}

# Media Extensions
AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".webm", ".aac", ".flac"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".bmp"}
DOC_EXTENSIONS = {".pdf", ".doc", ".docx", ".xlsx", ".xls", ".zip", ".rar", ".txt", ".json", ".csv"}
ALL_MEDIA_EXTENSIONS = AUDIO_EXTENSIONS | IMAGE_EXTENSIONS | DOC_EXTENSIONS

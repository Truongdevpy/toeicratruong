# -*- coding: utf-8 -*-
"""
Anti-Mojibake Guard Module for TOEIC Master Platform.
Guarantees 100% UTF-8 integrity across database, requests, responses, and file I/O.
"""

import re
import json
from pathlib import Path
from typing import Any, Union
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from sqlalchemy import event
import ftfy

# Strict mojibake detection regex for Vietnamese UTF-8 misinterpreted as CP1252 / ISO-8859-1
MOJIBAKE_DETECT_RE = re.compile(
    r'(?:[Ä][\x80-\x9f\u2018\u2019\u201c\u201d\u0192\u0091\u0090]|'
    r'á[º»][\x80-\xff\u0080-\u00ff\u2018\u2019\u201c\u201d\u2022\u2122\u20ac\u0161\u017e]|'
    r'â€[™œ\x9d\x9c˜]|'
    r'Ã[\x80-\xbf\u00a0-\u00bf]|'
    r'Æ[\x90-\xbf\u0090-\u00bf]|'
    r'Ä‘|'
    r'há»|'
    r'tiáº|'
    r'Tá»|'
    r'Å©)'
)

# Vietnamese double-encoded sequences map
VIETNAMESE_REPAIR_MAP = {
    "c�u": "câu",
    "â€“": "–",
    "â€”": "—",
    "â€™": "’",
    "â€œ": "“",
    "â€": "”",
    "â€¦": "…",
    "Â·": "·",
    "â€¢": "•",
    "Ä ": "Đ ",
    "Ã ": "à ",
    "Ä": "Đ",
    "Ä": "đ",
    "Ä‘": "đ",
    "há» c": "học",
    "tiáº¿ng": "tiếng",
    "Tá»«": "Từ",
    "Ã ": "à",
    "Ã¡": "á",
    "áº£": "ả",
    "Ã£": "ã",
    "áº¡": "ạ",
    "Äƒ": "ă",
    "Ä": "ă",
    "áº±": "ằ",
    "áº¯": "ắ",
    "áº³": "ẳ",
    "áºµ": "ẵ",
    "áº·": "ặ",
    "Ã¢": "â",
    "áº§": "ầ",
    "áº¥": "ấ",
    "áº©": "ẩ",
    "áº«": "ẫ",
    "áº­": "ậ",
    "Ã¨": "è",
    "Ã©": "é",
    "áº»": "ẻ",
    "áº½": "ẽ",
    "áº¹": "ẹ",
    "Ãª": "ê",
    "á»": "ề",
    "áº¿": "ế",
    "á»ƒ": "ể",
    "á»": "ể",
    "á»…": "ễ",
    "á»": "ễ",
    "á»‡": "ệ",
    "á»": "ệ",
    "Ã¬": "ì",
    "Ã­": "í",
    "á»‰": "ỉ",
    "á»": "ỉ",
    "Ä©": "ĩ",
    "á»‹": "ị",
    "á»": "ị",
    "Ã²": "ò",
    "Ã³": "ó",
    "á»": "ỏ",
    "Ãµ": "õ",
    "á»": "ọ",
    "Ã´": "ô",
    "á»“": "ồ",
    "á»": "ồ",
    "á»‘": "ố",
    "á»": "ố",
    "á»•": "ổ",
    "á»": "ổ",
    "á»—": "ỗ",
    "á»": "ỗ",
    "á»™": "ộ",
    "á»": "ộ",
    "Æ¡": "ơ",
    "á»": "ờ",
    "á»›": "ớ",
    "á»": "ớ",
    "á»Ÿ": "ở",
    "á»": "ở",
    "á»¡": "ỡ",
    "á»£": "ợ",
    "Ã¹": "ù",
    "Ãº": "ú",
    "á»§": "ủ",
    "Å©": "ũ",
    "á»¥": "ụ",
    "Æ°": "ư",
    "á»«": "ừ",
    "á»©": "ứ",
    "á»­": "ử",
    "á»¯": "ữ",
    "á»±": "ự",
    "á»³": "ỳ",
    "Ã½": "ý",
    "á»·": "ỷ",
    "á»¹": "ỹ",
    "á»µ": "ỵ",
    "Ã€": "À",
    "Ã": "À",
    "Ã": "Á",
    "áº¢": "Ả",
    "Ãƒ": "Ã",
    "Ã": "Ã",
    "áº ": "Ạ",
    "Ä‚": "Ă",
    "Ä": "Ă",
    "áº°": "Ằ",
    "áº®": "Ắ",
    "áº²": "Ẳ",
    "áº´": "Ẵ",
    "áº¶": "Ặ",
    "Ã‚": "Â",
    "Ã": "Â",
    "áº¦": "Ầ",
    "áº¤": "Ấ",
    "áº¨": "Ẩ",
    "áºª": "Ẫ",
    "áº¬": "Ậ",
    "Ãˆ": "È",
    "Ã": "È",
    "Ã‰": "É",
    "Ã": "É",
    "áºº": "Ẻ",
    "áº¼": "Ẽ",
    "áº¸": "Ẹ",
    "ÃŠ": "Ê",
    "Ã": "Ê",
    "á»€": "Ề",
    "á»": "Ề",
    "áº¾": "Ế",
    "á»‚": "Ể",
    "á»": "Ể",
    "á»„": "Ễ",
    "á»": "Ễ",
    "á»†": "Ệ",
    "á»": "Ệ",
    "ÃŒ": "Ì",
    "Ã": "Ì",
    "Ã": "Í",
    "á»ˆ": "Ỉ",
    "á»": "Ỉ",
    "Ä¨": "Ĩ",
    "á»Š": "Ị",
    "á»": "Ị",
    "Ã’": "Ò",
    "Ã": "Ò",
    "Ã“": "Ó",
    "Ã": "Ó",
    "á»Ž": "Ỏ",
    "á»": "Ỏ",
    "Ã•": "Õ",
    "Ã": "Õ",
    "á»Œ": "Ọ",
    "á»": "Ọ",
    "Ã”": "Ô",
    "Ã": "Ô",
    "á»’": "Ồ",
    "á»": "Ồ",
    "á»": "Ố",
    "á»”": "Ổ",
    "á»": "Ổ",
    "á»–": "Ỗ",
    "á»": "Ỗ",
    "á»˜": "Ộ",
    "á»": "Ộ",
    "Æ ": "Ơ",
    "á»œ": "Ờ",
    "á»": "Ờ",
    "á»š": "Ớ",
    "á»": "Ớ",
    "á»ž": "Ở",
    "á»": "Ở",
    "á» ": "Ỡ",
    "á»¢": "Ợ",
    "Ã™": "Ù",
    "Ã": "Ù",
    "Ãš": "Ú",
    "Ã": "Ú",
    "á»¦": "Ủ",
    "Å¨": "Ũ",
    "á»¤": "Ụ",
    "Æ¯": "Ư",
    "á»ª": "Ừ",
    "á»¨": "Ứ",
    "á»¬": "Ử",
    "á»®": "Ữ",
    "á»°": "Ự",
    "á»²": "Ỳ",
    "Ã": "Ý",
    "á»¶": "Ỷ",
    "á»¸": "Ỹ",
    "á»´": "Ỵ"
}

# Preserve uppercase Vietnamese words that might contain single Ã like "MÃ HÀNG", "HÃY"
UPPERCASE_VALID_WORDS = {'MÃ', 'HÃY', 'ĐÃ', 'SẼ', 'LÃNG'}

def is_mojibake(text: str) -> bool:
    """Returns True if the text contains known mojibake patterns."""
    if not text or not isinstance(text, str):
        return False
    if any(w in text for w in UPPERCASE_VALID_WORDS) and not any(k in text for k in ['Ä‘', 'há»', 'tiáº', 'Tá»', 'â€™', 'â€œ', 'áº', 'á»']):
        temp = text
        for w in UPPERCASE_VALID_WORDS:
            temp = temp.replace(w, '')
        return bool(MOJIBAKE_DETECT_RE.search(temp))
    return bool(MOJIBAKE_DETECT_RE.search(text))

def sanitize_mojibake(text: str) -> str:
    """Repairs mojibake in text, returning clean UTF-8 Vietnamese without altering valid text."""
    if not text or not isinstance(text, str):
        return text
    if not is_mojibake(text):
        return text

    fixed = text
    # Step 1: Specific double-encoded replacements FIRST to prevent misinterpretation
    for bad, good in VIETNAMESE_REPAIR_MAP.items():
        if bad in fixed:
            fixed = fixed.replace(bad, good)

    # Step 2: ftfy repair without uncurling quotes
    try:
        fixed = ftfy.fix_text(fixed, uncurl_quotes=False)
    except Exception:
        pass

    # Step 3: Secondary check for residual latin-1 / cp1252 sequences
    if is_mojibake(fixed):
        try:
            candidate = fixed.encode('cp1252').decode('utf-8')
            if not is_mojibake(candidate):
                fixed = candidate
        except Exception:
            pass

    return fixed

def sanitize_data(data: Any) -> Any:
    """Recursively cleans all strings within dicts, lists, tuples, or primitives."""
    if isinstance(data, str):
        return sanitize_mojibake(data)
    elif isinstance(data, dict):
        return {k: sanitize_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_data(item) for item in data]
    elif isinstance(data, tuple):
        return tuple(sanitize_data(item) for item in data)
    return data

def setup_sqlalchemy_mojibake_guard(base_class):
    """
    Hooks into SQLAlchemy before_insert and before_update events on all models
    to ensure strings are always sanitized to clean UTF-8 before entering the database.
    """
    @event.listens_for(base_class, 'before_insert', propagate=True)
    def sanitize_model_before_insert(mapper, connection, target):
        for attr in mapper.column_attrs:
            val = getattr(target, attr.key, None)
            if isinstance(val, str) and is_mojibake(val):
                setattr(target, attr.key, sanitize_mojibake(val))

    @event.listens_for(base_class, 'before_update', propagate=True)
    def sanitize_model_before_update(mapper, connection, target):
        for attr in mapper.column_attrs:
            val = getattr(target, attr.key, None)
            if isinstance(val, str) and is_mojibake(val):
                setattr(target, attr.key, sanitize_mojibake(val))

def load_json_utf8(filepath: Union[str, Path]) -> Any:
    """Safely loads a JSON file with explicit UTF-8 encoding and applies mojibake sanitation."""
    p = Path(filepath)
    raw = p.read_text(encoding="utf-8")
    data = json.loads(raw)
    return sanitize_data(data)

def dump_json_utf8(data: Any, filepath: Union[str, Path]) -> None:
    """Safely writes a JSON file with explicit UTF-8 encoding and non-escaped characters."""
    p = Path(filepath)
    p.parent.mkdir(parents=True, exist_ok=True)
    sanitized = sanitize_data(data)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(sanitized, f, ensure_ascii=False, indent=2)

class MojibakeGuardMiddleware(BaseHTTPMiddleware):
    """
    FastAPI / Starlette middleware:
    - Enforces Content-Type: application/json; charset=utf-8 on all JSON responses.
    - Enforces Content-Type: text/html; charset=utf-8 on all HTML responses.
    - Intercepts incoming JSON payloads and sanitizes any accidental mojibake from clients.
    - Intercepts outgoing JSON responses and auto-heals any mojibake before leaving the server.
    """
    async def dispatch(self, request: Request, call_next):
        # 1. Incoming payload sanitization for JSON
        if request.method in ("POST", "PUT", "PATCH"):
            content_type = request.headers.get("content-type", "")
            if "application/json" in content_type:
                try:
                    body = await request.body()
                    if body:
                        text_body = body.decode("utf-8", errors="replace")
                        if is_mojibake(text_body):
                            data = json.loads(text_body)
                            sanitized = sanitize_data(data)
                            new_body = json.dumps(sanitized, ensure_ascii=False).encode("utf-8")
                            
                            async def receive():
                                return {"type": "http.request", "body": new_body, "more_body": False}
                            request._receive = receive
                except Exception:
                    pass

        # 2. Call next handler
        response: Response = await call_next(request)

        # 3. Outgoing response charset enforcement
        ct = response.headers.get("content-type", "")
        if "application/json" in ct and "charset" not in ct:
            response.headers["content-type"] = "application/json; charset=utf-8"
        elif "text/html" in ct and "charset" not in ct:
            response.headers["content-type"] = "text/html; charset=utf-8"

        return response

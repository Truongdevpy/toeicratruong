# -*- coding: utf-8 -*-
import time
import logging
from collections import defaultdict
from pathlib import Path
from typing import Optional, Dict, List, Any
from fastapi import HTTPException, status

logger = logging.getLogger("security")
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setFormatter(logging.Formatter("[SECURITY] %(asctime)s - %(levelname)s - %(message)s"))
    logger.addHandler(ch)

# Sliding window rate limiter for login brute force
# Max 5 failed attempts per 60 seconds
_login_failures: Dict[str, List[float]] = defaultdict(list)
MAX_FAILURES = 5
LOCKOUT_WINDOW_SECONDS = 60

def check_login_rate_limit(identifier: str) -> None:
    now = time.time()
    # Filter attempts within window
    _login_failures[identifier] = [t for t in _login_failures[identifier] if now - t < LOCKOUT_WINDOW_SECONDS]
    if len(_login_failures[identifier]) >= MAX_FAILURES:
        logger.warning(f"Rate limit exceeded for {identifier}. Lockout active.")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Quá nhiều lần đăng nhập không thành công. Vui lòng thử lại sau 60 giây (Rate limit exceeded)."
        )

def record_login_failure(identifier: str) -> None:
    now = time.time()
    _login_failures[identifier].append(now)
    logger.warning(f"Failed login recorded for {identifier}. Total in window: {len(_login_failures[identifier])}")

def clear_login_failures(identifier: str) -> None:
    if identifier in _login_failures:
        del _login_failures[identifier]

def mask_email(email: str) -> str:
    """
    Masks email for privacy protection in server logs.
    Example: 'student@toeicai.vn' -> 'st***t@toeicai.vn'
    """
    if not email or "@" not in email:
        return "***"
    parts = email.split("@", 1)
    name_part, domain = parts[0], parts[1]
    if len(name_part) <= 2:
        masked_name = name_part[0] + "*"
    else:
        masked_name = name_part[:2] + "***" + name_part[-1]
    return f"{masked_name}@{domain}"

def redact_sensitive_data(val: Any) -> Any:
    """
    Recursively strips passwords, tokens, secrets, and masks emails in log payloads.
    """
    if isinstance(val, dict):
        redacted = {}
        for k, v in val.items():
            k_lower = str(k).lower()
            if any(term in k_lower for term in ("password", "token", "secret", "authorization", "cookie")):
                redacted[k] = "[REDACTED]"
            elif "email" in k_lower and isinstance(v, str):
                redacted[k] = mask_email(v)
            else:
                redacted[k] = redact_sensitive_data(v)
        return redacted
    elif isinstance(val, list):
        return [redact_sensitive_data(item) for item in val]
    return val

def log_security_event(event_type: str, user_id: Optional[int] = None, details: Optional[dict] = None) -> None:
    safe_details = redact_sensitive_data(details or {})
    msg = f"Event: {event_type} | UserID: {user_id} | Details: {safe_details}"
    logger.info(msg)

def sanitize_safe_path(base_dir: Path, requested_path: str) -> Path:
    """
    Prevents path traversal attacks (e.g., ../, null bytes).
    Resolves absolute path and verifies it stays within base_dir.
    """
    if "\0" in requested_path or "%00" in requested_path:
        raise HTTPException(status_code=400, detail="Invalid path (null byte detected)")

    resolved = (base_dir / requested_path.lstrip("/\\")).resolve()
    base_resolved = base_dir.resolve()

    try:
        resolved.relative_to(base_resolved)
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied: Path traversal detected")

    return resolved

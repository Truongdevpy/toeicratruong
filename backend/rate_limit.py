import os
import time
import re
import threading
from collections import defaultdict, deque
from typing import Dict, Tuple, Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
import jwt

# Configuration: path regex -> (max_requests, window_seconds, require_user_id)
# require_user_id=True: rate limits per user_id if Bearer token present, falls back to IP.
# require_user_id=False: rate limits strictly per client IP (e.g. login).
RATE_LIMIT_RULES: Dict[str, Tuple[int, int, bool]] = {
    r"^/api/auth/login$": (5, 60, False),
    r"^/api/auth/register$": (5, 60, False),                             # 5 registrations / 60s by IP
    r"^/api/(mock-)?tests/[^/]+/submit$": (10, 60, True),                # 10 test submits / 60s by user_id
    r"^/api/placement-test/submit$": (10, 60, True),                    # 10 placement submits / 60s by user_id
    r"^/api/ai-tutor/chat$": (20, 60, True),                            # 20 AI chats / 60s by user_id
    r"^/api/learning-path/recalculate$": (10, 60, True),                # 10 roadmap recalculations / 60s by user_id
}

JWT_SECRET = os.getenv("JWT_SECRET", "super-toeic-secret-key-edtech-platform-2026")
JWT_ALGORITHM = "HS256"

class SlidingWindowLimiter:
    """
    Thread-safe sliding-window in-memory rate limiter.
    Maintains a FIFO queue of timestamps for each key.
    """
    def __init__(self):
        self._history: Dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()
        self._last_prune = time.time()

    def check_and_record(self, key: str, max_requests: int, window_seconds: int) -> Tuple[bool, int, int, int]:
        """
        Returns: (allowed: bool, remaining: int, retry_after: int, reset_time: int)
        """
        now = time.time()
        window_start = now - window_seconds

        with self._lock:
            # Periodic cleanup of empty or inactive deques every 5 minutes
            if now - self._last_prune > 300:
                self._prune_stale(now)

            q = self._history[key]

            # Drop timestamps outside sliding window
            while q and q[0] <= window_start:
                q.popleft()

            reset_time = int(q[0] + window_seconds) if q else int(now + window_seconds)

            if len(q) >= max_requests:
                oldest = q[0]
                retry_after = max(1, int(oldest + window_seconds - now))
                return False, 0, retry_after, reset_time

            # Record this hit
            q.append(now)
            remaining = max_requests - len(q)
            return True, remaining, 0, reset_time

    def _prune_stale(self, now: float):
        self._last_prune = now
        stale_keys = []
        for k, q in self._history.items():
            while q and q[0] <= (now - 300):
                q.popleft()
            if not q:
                stale_keys.append(k)
        for k in stale_keys:
            del self._history[k]

limiter = SlidingWindowLimiter()

def get_client_ip(request: Request) -> str:
    """
    Resolves client IP, respecting X-Forwarded-For if behind a reverse proxy.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # First IP in list is client IP
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"

def extract_user_id_from_header(request: Request) -> Optional[str]:
    """
    Attempts to parse user identity from Bearer token without raising exceptions.
    """
    auth_header = request.headers.get("authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM], options={"verify_exp": False})
        user_id = payload.get("sub") or payload.get("user_id")
        return str(user_id) if user_id else None
    except Exception:
        return None

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method

        # Only apply rate limits to mutating requests (POST, PUT, PATCH, DELETE) or specific protected endpoints
        matched_rule: Optional[Tuple[str, int, int, bool]] = None
        for pattern, (max_req, win_sec, require_user) in RATE_LIMIT_RULES.items():
            if re.match(pattern, path):
                matched_rule = (pattern, max_req, win_sec, require_user)
                break

        if not matched_rule:
            return await call_next(request)

        pattern, max_req, win_sec, prefer_user = matched_rule

        # Identify client: either user_id or IP
        key_identifier = ""
        if prefer_user:
            user_id = extract_user_id_from_header(request)
            if user_id:
                key_identifier = f"user:{user_id}"
            else:
                key_identifier = f"ip:{get_client_ip(request)}"
        else:
            key_identifier = f"ip:{get_client_ip(request)}"

        limit_key = f"{pattern}:{key_identifier}"
        allowed, remaining, retry_after, reset_time = limiter.check_and_record(
            limit_key, max_requests=max_req, window_seconds=win_sec
        )

        if not allowed:
            headers = {
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(max_req),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(reset_time),
                "Content-Type": "application/json; charset=utf-8"
            }
            return JSONResponse(
                status_code=429,
                content={
                    "detail": f"Quá nhiều yêu cầu (Rate limit exceeded). Vui lòng thử lại sau {retry_after} giây.",
                    "retry_after_seconds": retry_after
                },
                headers=headers
            )

        response: Response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(max_req)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_time)
        return response
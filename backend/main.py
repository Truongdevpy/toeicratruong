from pathlib import Path
import os
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base
import models
from routers import (
    auth, onboarding, placement, learning_path, dashboard,
    practice, tests, dictation, vocabulary, grammar, sw,
    ai_tutor, statistics, community, achievements,
    notifications, admin, leaderboard, chat, translate, history, payments
)

from sqlalchemy import text

Base.metadata.create_all(bind=engine)

def run_db_migrations():
    with engine.connect() as conn:
        try:
            res = conn.execute(text("PRAGMA table_info(question_attempts)"))
            cols = [row[1] for row in res.fetchall()]
            if cols:
                if "test_id" not in cols:
                    conn.execute(text("ALTER TABLE question_attempts ADD COLUMN test_id VARCHAR(100) DEFAULT ''"))
                if "question_number" not in cols:
                    conn.execute(text("ALTER TABLE question_attempts ADD COLUMN question_number INTEGER"))
                if "question_text" not in cols:
                    conn.execute(text("ALTER TABLE question_attempts ADD COLUMN question_text TEXT DEFAULT ''"))
                conn.commit()
        except Exception as err:
            print("DB migration check:", err)

        # Ensure simulated community members exist for foreign key integrity
        try:
            bot_users = [
                (101, 'community_101@toeicai.vn', 'simulated_account', 'Nguyễn Thu Hà', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', 'student'),
                (102, 'community_102@toeicai.vn', 'simulated_account', 'Trần Minh Quân', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'student'),
                (103, 'community_103@toeicai.vn', 'simulated_account', 'Lê Bảo Anh', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'student'),
                (104, 'community_104@toeicai.vn', 'simulated_account', 'Phạm Hoàng Long', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'student'),
                (105, 'community_105@toeicai.vn', 'simulated_account', 'Vũ Mai Phương', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 'student'),
            ]
            for b in bot_users:
                conn.execute(text("""
                    INSERT OR IGNORE INTO users (id, email, password_hash, full_name, avatar_url, role, is_active, token_version)
                    VALUES (:id, :email, :password_hash, :full_name, :avatar_url, :role, 1, 1)
                """), {
                    'id': b[0],
                    'email': b[1],
                    'password_hash': b[2],
                    'full_name': b[3],
                    'avatar_url': b[4],
                    'role': b[5]
                })
            conn.commit()
        except Exception as err:
            print('DB bot seed check:', err)

run_db_migrations()

app = FastAPI(
    title="TOEIC Master Platform API",
    description="Nền tảng luyện thi TOEIC trực tuyến toàn diện chuẩn ETS",
    version="1.0.0"
)

# Robust CORS Configuration supporting localhost development across any port
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:8001",
    "http://127.0.0.1:8001",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

logger = logging.getLogger("uvicorn.error")

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(self), camera=()"
        
        # Enforce UTF-8 charset on JSON and HTML responses
        content_type = response.headers.get("content-type", "")
        if "application/json" in content_type and "charset" not in content_type:
            response.headers["content-type"] = "application/json; charset=utf-8"
        elif "text/html" in content_type and "charset" not in content_type:
            response.headers["content-type"] = "text/html; charset=utf-8"
            
        return response

from rate_limit import RateLimitMiddleware
from mojibake_guard import MojibakeGuardMiddleware
app.add_middleware(MojibakeGuardMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, (HTTPException, RequestValidationError)):
        raise exc
    logger.error(f"Internal error at {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Đã xảy ra lỗi hệ thống nội bộ. Vui lòng thử lại sau (Internal Server Error)."}
    )


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data" / "data"

class CORSStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        # Prevent access to sensitive directories and file types
        normalized_path = path.replace("\\", "/").lower()
        if "sessions" in normalized_path or normalized_path.endswith((".db", ".env", ".py")):
            return Response(status_code=403, content="Access Denied")
        response = await super().get_response(path, scope)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Accept-Ranges"] = "bytes"
        if response.status_code == 200:
            response.headers["Cache-Control"] = "public, max-age=86400"
        return response

# 1. Mount Study4 Media: /media/...
media_folder = DATA_DIR / "media"
if media_folder.exists():
    app.mount("/media", CORSStaticFiles(directory=str(media_folder)), name="media")

# 2. Mount Dau TOEIC Media: /dautoeic_media/...
dau_folder = DATA_DIR / "dautoeic"
if dau_folder.exists():
    app.mount("/dautoeic_media", CORSStaticFiles(directory=str(dau_folder)), name="dautoeic_media")

# 3. Mount Data root: /data/...
if DATA_DIR.exists():
    app.mount("/data", CORSStaticFiles(directory=str(DATA_DIR)), name="data")

# Register API routers
app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(placement.router)
app.include_router(learning_path.router)
app.include_router(dashboard.router)
app.include_router(practice.router)
app.include_router(tests.router, prefix="/api/tests")
app.include_router(tests.router, prefix="/api/mock-tests")
app.include_router(dictation.router)
app.include_router(vocabulary.router)
app.include_router(grammar.router)
app.include_router(sw.router)
app.include_router(ai_tutor.router)
app.include_router(statistics.router)
app.include_router(community.router)
app.include_router(achievements.router)
app.include_router(notifications.router)
app.include_router(admin.router)
app.include_router(leaderboard.router)
app.include_router(chat.router)
app.include_router(translate.router)
app.include_router(history.router, prefix="/api/history")
app.include_router(payments.router)

@app.get("/")
def root_endpoint():
    return {
        "status": "ok",
        "platform": "TOEIC Master Platform API",
        "description": "Nền tảng luyện thi TOEIC trực tuyến toàn diện chuẩn ETS",
        "version": "1.0.0"
    }

@app.get("/api/system/encoding-status")
def encoding_status():
    with engine.connect() as conn:
        try:
            res = conn.execute(text("PRAGMA encoding")).scalar()
        except Exception:
            res = "UTF-8"
    return {
        "status": "healthy",
        "system_encoding": "utf-8",
        "database_encoding": res,
        "mojibake_guard_active": True,
        "sample_vietnamese": "Nền tảng luyện thi TOEIC chuẩn ETS - Tiếng Việt chuẩn UTF-8"
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "platform": "TOEIC Master Platform API",
        "media_study4_mounted": media_folder.exists(),
        "media_dautoeic_mounted": dau_folder.exists(),
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=False)

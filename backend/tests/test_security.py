import pytest
import time
from datetime import datetime, timedelta
import jwt
from fastapi.testclient import TestClient
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from main import app
from database import SessionLocal
import models
from auth import SECRET_KEY, ALGORITHM, create_access_token, hash_password
from media_resolver import resolve_media_url
from security import clear_login_failures

client = TestClient(app)

@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    yield session
    session.close()

def create_user_token(user):
    return create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "token_version": user.token_version
    })

@pytest.fixture
def student_user(db):
    user = db.query(models.User).filter(models.User.email == "student@toeicai.vn").first()
    if not user:
        user = models.User(
            email="student@toeicai.vn",
            password_hash=hash_password("password123"),
            full_name="Student Test",
            role="student",
            is_active=True,
            token_version=1
        )
        db.add(user)
        db.commit()
    db.refresh(user)
    return user

@pytest.fixture
def admin_user(db):
    user = db.query(models.User).filter(models.User.email == "admin@toeicai.vn").first()
    if not user:
        user = models.User(
            email="admin@toeicai.vn",
            password_hash=hash_password("admin123"),
            full_name="Admin Test",
            role="admin",
            is_active=True,
            token_version=1
        )
        db.add(user)
        db.commit()
    db.refresh(user)
    return user

# --- 1. AUTHENTICATION TESTS (OWASP A01 & A07) ---

def test_auth_missing_jwt():
    res = client.get("/api/auth/me")
    assert res.status_code == 401
    assert "detail" in res.json()

def test_auth_invalid_jwt():
    res = client.get("/api/auth/me", headers={"Authorization": "Bearer bad_tampered_token_xyz"})
    assert res.status_code == 401

def test_auth_expired_jwt(student_user):
    expired_payload = {
        "sub": str(student_user.id),
        "email": student_user.email,
        "iat": int((datetime.utcnow() - timedelta(hours=2)).timestamp()),
        "exp": int((datetime.utcnow() - timedelta(hours=1)).timestamp()),
        "token_version": student_user.token_version
    }
    expired_token = jwt.encode(expired_payload, SECRET_KEY, algorithm=ALGORITHM)
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == 401
    assert "hết hạn" in res.json()["detail"].lower() or "expired" in res.json()["detail"].lower()

def test_auth_token_revocation_on_logout(db):
    # Create isolated user for logout test
    u = db.query(models.User).filter(models.User.email == "logout_temp@toeicai.vn").first()
    if not u:
        u = models.User(
            email="logout_temp@toeicai.vn",
            password_hash=hash_password("password123"),
            full_name="Logout Test User",
            role="student",
            is_active=True,
            token_version=1
        )
        db.add(u)
        db.commit()
    db.refresh(u)

    token = create_user_token(u)

    # Token works initially
    res1 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res1.status_code == 200

    # Logout to revoke
    res_logout = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert res_logout.status_code == 200

    # Old token must now be rejected with 401
    res2 = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res2.status_code == 401
    assert "thu hồi" in res2.json()["detail"].lower() or "revoked" in res2.json()["detail"].lower()

# --- 2. RBAC TESTS (OWASP A01 Broken Access Control) ---

def test_rbac_student_access_admin_api_forbidden(student_user):
    token = create_user_token(student_user)
    # A regular student must receive 403 Forbidden on admin metrics
    res = client.get("/api/admin/metrics", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert "quản trị viên" in res.json()["detail"].lower() or "admin" in res.json()["detail"].lower()

def test_rbac_admin_access_admin_metrics_allowed(admin_user):
    token = create_user_token(admin_user)
    res = client.get("/api/admin/metrics", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert "total_users" in res.json()

# --- 3. ADMIN SELF-PROTECTION (Section 2 & 3) ---

def test_admin_self_protection_role_change(admin_user):
    token = create_user_token(admin_user)
    # Admin cannot demote self
    res = client.patch(
        f"/api/admin/users/{admin_user.id}/role",
        json={"role": "student"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 400
    assert "chính mình" in res.json()["detail"].lower() or "self-protection" in res.json()["detail"].lower()

def test_admin_self_protection_lock(admin_user):
    token = create_user_token(admin_user)
    # Admin cannot lock self
    res = client.post(
        f"/api/admin/users/{admin_user.id}/status",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 400
    assert "chính mình" in res.json()["detail"].lower()

def test_admin_self_protection_delete(admin_user):
    token = create_user_token(admin_user)
    # Admin cannot delete self
    res = client.delete(
        f"/api/admin/users/{admin_user.id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 400
    assert "chính mình" in res.json()["detail"].lower()

# --- 4. IDOR / BOLA TESTS (Section 5) ---

def test_idor_learning_node_cross_user(db, student_user):
    token = create_user_token(student_user)

    # Create another user and learning path
    other_user = db.query(models.User).filter(models.User.email == "other@toeicai.vn").first()
    if not other_user:
        other_user = models.User(
            email="other@toeicai.vn",
            password_hash=hash_password("password123"),
            full_name="Other User",
            role="student",
            is_active=True,
            token_version=1
        )
        db.add(other_user)
        db.flush()

    other_path = db.query(models.LearningPath).filter(models.LearningPath.user_id == other_user.id).first()
    if not other_path:
        other_path = models.LearningPath(user_id=other_user.id, title="Other Path")
        db.add(other_path)
        db.flush()

    other_node = db.query(models.LearningNode).filter(models.LearningNode.path_id == other_path.id).first()
    if not other_node:
        other_node = models.LearningNode(
            path_id=other_path.id,
            order_index=1,
            title="Private Node",
            skill="Listening",
            status="locked",
            progress_pct=0
        )
        db.add(other_node)
        db.commit()

    # Student trying to update Other User's node must be rejected with 404 (IDOR prevented)
    res = client.patch(
        f"/api/learning-path/node/{other_node.id}/update",
        json={"status": "completed", "progress_pct": 100},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 404

# --- 5. RATE LIMITING / BRUTE FORCE (Section 18 & 19) ---

def test_login_brute_force_rate_limit():
    dummy_email = "victim_target@toeicai.vn"
    clear_login_failures(f"testclient:{dummy_email}")

    # Send 5 failed login attempts
    for _ in range(5):
        client.post("/api/auth/login", json={"email": dummy_email, "password": "wrong_password"})

    # 6th attempt must be throttled with 429 Too Many Requests
    blocked_res = client.post("/api/auth/login", json={"email": dummy_email, "password": "wrong_password"})
    assert blocked_res.status_code == 429
    assert "quá nhiều lần" in blocked_res.json()["detail"].lower() or "rate limit" in blocked_res.json()["detail"].lower()

    # Clean up
    clear_login_failures(f"testclient:{dummy_email}")

# --- 6. INPUT VALIDATION & PAGINATION (Section 10 & 17) ---

def test_pagination_bounds_rejection():
    # Negative limit must be rejected with 422
    res1 = client.get("/api/tests?limit=-5")
    assert res1.status_code == 422

    # Limit > 100 must be rejected with 422
    res2 = client.get("/api/tests?limit=500")
    assert res2.status_code == 422

    # Page < 1 must be rejected with 422
    res3 = client.get("/api/tests?page=0")
    assert res3.status_code == 422

# --- 7. PATH TRAVERSAL (Section 41) ---

def test_path_traversal_rejection():
    assert resolve_media_url("../../../windows/system32/cmd.exe") == ""
    assert resolve_media_url("media/../../etc/passwd") == ""
    assert resolve_media_url("photo.jpg\0.png") == ""

# --- 8. SECURITY HEADERS (Section 28) ---

def test_security_headers_present():
    res = client.get("/api/health")
    assert res.headers.get("x-content-type-options") == "nosniff"
    assert res.headers.get("x-frame-options") == "DENY"
    assert "1; mode=block" in res.headers.get("x-xss-protection", "")
    assert res.headers.get("referrer-policy") == "strict-origin-when-cross-origin"

# --- 9. MASS ASSIGNMENT (Section 9) ---

def test_mass_assignment_profile_update(student_user, db):
    token = create_user_token(student_user)
    # Try to elevate role to admin via profile update
    res = client.post(
        "/api/auth/update-profile",
        json={"role": "admin", "target_score": 750},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200

    # Verify role was NOT elevated
    db.refresh(student_user)
    assert student_user.role == "student"
    assert student_user.profile.target_score == 750

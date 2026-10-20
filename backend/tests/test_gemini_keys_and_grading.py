# -*- coding: utf-8 -*-
import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from main import app
from database import SessionLocal
import models
from auth import create_access_token

client = TestClient(app)

@pytest.fixture
def admin_token():
    db = SessionLocal()
    admin = db.query(models.User).filter(models.User.email == "admin@toeicai.vn").first()
    if not admin:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        admin = models.User(
            email="admin@toeicai.vn",
            password_hash=pwd_context.hash("admin123"),
            full_name="Qu?n tr? vi�n H? th?ng",
            role="admin",
            is_active=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
    token = create_access_token({"sub": str(admin.id), "role": "admin"})
    db.close()
    return token

def test_admin_gemini_keys_auth_and_management(admin_token):
    # Preserve current .env content
    env_file = backend_dir / ".env"
    saved_env = env_file.read_text(encoding="utf-8-sig") if env_file.exists() else None

    try:
        # 1. Non-admin should be forbidden (403)
        guest_res = client.get("/api/admin/gemini-keys")
        assert guest_res.status_code in [401, 403]

        # 2. Admin should get key list
        headers = {"Authorization": f"Bearer {admin_token}"}
        res = client.get("/api/admin/gemini-keys", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "keys" in data
        assert "active_models" in data

        # 3. Admin updates keys
        test_key = "AIzaSyTestKeyForDeepTutor0123456789"
        update_res = client.post("/api/admin/gemini-keys", headers=headers, json={"keys": test_key})
        assert update_res.status_code == 200
        u_data = update_res.json()
        assert u_data["status"] == "success"
        assert any(k["masked_key"].startswith("AIzaSy") for k in u_data["keys"])

        # 4. Test connection endpoint returns response structure
        test_res = client.post("/api/admin/gemini-keys/test", headers=headers, json={"key": test_key})
        assert test_res.status_code == 200
        t_data = test_res.json()
        assert "masked_key" in t_data
    finally:
        if saved_env is not None:
            env_file.write_text(saved_env, encoding="utf-8")
            from gemini_pool import gemini_pool
            gemini_pool._load_keys()

def test_practice_ai_grade_endpoint():
    # Test grading a mock set of Reading Part 5 questions
    payload = {
        "skill": "reading",
        "part": 5,
        "title": "Luy?n d?c Part 5 - C�u 101-104",
        "answers": [
            {
                "question_number": 101,
                "question_text": "Ms. Johnson requested that the sales report be submitted _______ Friday.",
                "selected_option": "B",
                "correct_option": "B",
                "is_correct": True,
                "explanation": "Cần giới từ chỉ thời hạn trước một mốc thời gian -> before Friday."
            },
            {
                "question_number": 102,
                "question_text": "The marketing department achieved _______ results this quarter.",
                "selected_option": "A",
                "correct_option": "C",
                "is_correct": False,
                "explanation": "C?n t�nh t? 'impressive' d?ng tru?c danh t? 'results'."
            }
        ]
    }
    res = client.post("/api/practice/ai-grade", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "band_score_estimate" in data
    assert "accuracy_rate" in data
    assert "overall_comment" in data
    assert "traps_identified" in data
    assert len(data["traps_identified"]) >= 1
    assert "vocabulary_to_learn" in data
    assert len(data["vocabulary_to_learn"]) > 0
    assert "action_plan" in data

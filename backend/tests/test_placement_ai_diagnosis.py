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

client = TestClient(app)

@pytest.fixture
def student_auth():
    r = client.post("/api/auth/demo", json={"role": "student"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_placement_ai_diagnosis_lifecycle(student_auth):
    # 1. Fetch placement questions
    res_qs = client.get("/api/placement-test/questions", headers=student_auth)
    assert res_qs.status_code == 200
    qs_data = res_qs.json()
    assert "questions" in qs_data
    assert len(qs_data["questions"]) > 0

    first_qs = qs_data["questions"][:5]
    answers_payload = {str(q["id"]): "A" for q in first_qs}

    # 2. Submit placement test
    submit_res = client.post("/api/placement-test/submit", headers=student_auth, json={
        "test_type": "full",
        "answers": answers_payload,
        "time_spent_seconds": 600
    })
    assert submit_res.status_code == 200
    data = submit_res.json()
    assert data["status"] == "success"
    analysis = data["result"]
    assert "estimated_score" in analysis
    assert "ai_summary" in analysis
    assert "ai_memory_notes" in analysis

    # 3. Verify user profile has updated memory notes
    db = SessionLocal()
    user = db.query(models.User).filter(models.User.email == "student@toeicai.vn").first()
    assert user is not None
    assert user.profile is not None
    assert user.profile.ai_memory_notes is not None
    assert len(user.profile.ai_memory_notes) > 0
    assert user.profile.weak_areas is not None
    db.close()

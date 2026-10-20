# -*- coding: utf-8 -*-
import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from main import app

client = TestClient(app)

@pytest.fixture
def admin_headers():
    r = client.post("/api/auth/demo", json={"role": "admin"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_admin_list_tests(admin_headers):
    res = client.get("/api/admin/tests", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "tests" in data
    assert data["total"] > 0
    assert len(data["tests"]) > 0

def test_admin_create_test_and_manage_questions(admin_headers):
    # 1. Create a new test
    test_title = "ETS Test Automated Suite 2026"
    custom_slug = "ets-auto-suite-2026"
    create_res = client.post("/api/admin/tests", headers=admin_headers, json={
        "name": test_title,
        "slug": custom_slug,
        "collection_id": "ets_2026",
        "total_questions": 200,
        "duration_minutes": 120,
        "year": 2026,
        "is_vip": False
    })
    assert create_res.status_code == 200
    test_data = create_res.json()["test"]
    test_id = test_data["id"]

    try:
        # 2. Add question to the test
        q_res = client.post(f"/api/admin/tests/{test_id}/questions", headers=admin_headers, json={
            "part": 5,
            "question_number": 101,
            "question_text": "The marketing director ______ the proposal before the conference began.",
            "option_a": "review",
            "option_b": "reviewed",
            "option_c": "reviewing",
            "option_d": "reviews",
            "correct_answer": "B",
            "explanation": "Hành động xảy ra trong quá khứ trước 'conference began', dùng thì quá khứ đơn 'reviewed'."
        })
        assert q_res.status_code == 200
        new_q = q_res.json()["question"]
        q_id = new_q["id"]
        assert new_q["part"] == 5
        assert new_q["correct_answer"] == "B"

        # 3. Get test questions
        get_qs = client.get(f"/api/admin/tests/{test_id}/questions", headers=admin_headers)
        assert get_qs.status_code == 200
        qs_data = get_qs.json()
        assert qs_data["total_questions"] >= 1
        assert any(q["id"] == q_id for q in qs_data["questions"])

        # 4. Update the question
        upd_q = client.put(f"/api/admin/tests/{test_id}/questions/{q_id}", headers=admin_headers, json={
            "question_text": "The marketing director ______ the revised proposal before the conference began.",
            "correct_answer": "B"
        })
        assert upd_q.status_code == 200
        assert "revised proposal" in upd_q.json()["question"]["question_text"]

        # 5. Delete question
        del_q = client.delete(f"/api/admin/tests/{test_id}/questions/{q_id}", headers=admin_headers)
        assert del_q.status_code == 200

    finally:
        # 6. Delete test clean-up
        del_test = client.delete(f"/api/admin/tests/{test_id}", headers=admin_headers)
        assert del_test.status_code == 200

def test_admin_question_stats(admin_headers):
    res = client.get("/api/admin/questions/stats", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "distribution" in data
    assert len(data["distribution"]) == 7
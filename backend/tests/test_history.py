import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from main import app

client = TestClient(app)

def test_history_summary_and_empty():
    res = client.get("/api/history/summary")
    assert res.status_code == 200
    data = res.json()
    assert "total_tests" in data
    assert "total_questions" in data
    assert "accuracy" in data

def test_record_question_and_correct_list():
    payload = {
        "question_id": "test_q_hist_1",
        "test_id": "test_hist_suite",
        "question_number": 1,
        "part": 1,
        "section": "listening",
        "question_text": "Sample question text for testing history",
        "selected_option": "B",
        "correct_option": "B",
        "is_correct": True,
        "time_spent_sec": 20
    }
    res = client.post("/api/history/record-question", json=payload)
    assert res.status_code == 200
    assert res.json()["status"] == "success"

    # Verify in questions history
    q_res = client.get("/api/history/questions?part=1")
    assert q_res.status_code == 200
    items = q_res.json()["items"]
    assert any(item["question_id"] == "test_q_hist_1" for item in items)

    # Verify in correct questions list
    corr_res = client.get("/api/history/correct-questions")
    assert corr_res.status_code == 200
    assert "test_q_hist_1" in corr_res.json()["correct_question_ids"]

def test_test_history_endpoints():
    res = client.get("/api/history/tests")
    assert res.status_code == 200
    assert "items" in res.json()
    assert "total" in res.json()


def test_history_attempt_idor_protection():
    # Login as demo student
    r_student = client.post("/api/auth/demo", json={"role": "student"})
    student_token = r_student.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # Login as demo admin
    r_admin = client.post("/api/auth/demo", json={"role": "admin"})
    admin_token = r_admin.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    admin_id = r_admin.json()["user"]["id"]

    from database import SessionLocal
    import models
    db = SessionLocal()
    try:
        att = models.TestAttempt(
            user_id=admin_id,
            test_id="test_idor_check",
            test_title="Admin Only Attempt",
            mode="full",
            total_questions=200,
            total_correct=180,
            total_score=900,
            time_spent_seconds=7200,
            answers_json="{}",
            review_json="[]"
        )
        db.add(att)
        db.commit()
        db.refresh(att)
        att_id = att.id
    finally:
        db.close()

    # Unauthenticated user tries to view admin attempt -> 403
    r_view_guest = client.get(f"/api/history/tests/{att_id}")
    assert r_view_guest.status_code == 403

    # Student tries to view admin attempt -> 403
    r_view_student = client.get(f"/api/history/tests/{att_id}", headers=student_headers)
    assert r_view_student.status_code == 403

    # Student tries to delete admin attempt -> 403
    r_del_student = client.delete(f"/api/history/tests/{att_id}", headers=student_headers)
    assert r_del_student.status_code == 403

    # Admin CAN view own attempt -> 200
    r_view_admin = client.get(f"/api/history/tests/{att_id}", headers=admin_headers)
    assert r_view_admin.status_code == 200

    # Admin CAN delete own attempt -> 200
    r_del_admin = client.delete(f"/api/history/tests/{att_id}", headers=admin_headers)
    assert r_del_admin.status_code == 200

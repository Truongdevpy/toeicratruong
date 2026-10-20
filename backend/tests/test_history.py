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

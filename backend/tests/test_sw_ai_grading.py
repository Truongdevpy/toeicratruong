# -*- coding: utf-8 -*-
import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from main import app

client = TestClient(app)

def test_sw_grade_speaking_question():
    payload = {
        "test_type": "speaking",
        "question_number": 1,
        "prompt": "Read a text aloud",
        "context": "Welcome to the annual tech conference. Please register at booth 4.",
        "user_answer": "Welcome to the annual tech conference. Please register at booth four."
    }
    res = client.post("/api/sw/grade-question", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "score_estimate" in data
    assert "level" in data
    assert "pronunciation_score" in data
    assert "grammar_score" in data
    assert "fluency_score" in data
    assert "overall_comment" in data
    assert "sample_answer" in data

def test_sw_grade_writing_question():
    payload = {
        "test_type": "writing",
        "question_number": 6,
        "prompt": "Respond to a written request",
        "context": "Customer asking about refund policy for damaged goods.",
        "user_answer": "Dear Customer, Thank you for contacting us. We apologize for the damaged package. You can return it within 30 days for a full refund."
    }
    res = client.post("/api/sw/grade-question", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "score_estimate" in data
    assert "level" in data
    assert "grammar_score" in data
    assert "vocabulary_score" in data
    assert "organization_score" in data
    assert "overall_comment" in data
    assert "corrections" in data

def test_sw_grade_full_test():
    payload = {
        "test_type": "writing",
        "test_name": "TOEIC SW Writing Test 1",
        "answers": [
            {
                "question_number": 1,
                "prompt": "Write a sentence based on a picture",
                "context": "boardroom / present",
                "user_answer": "The executive is presenting the quarterly revenue report in the boardroom."
            },
            {
                "question_number": 6,
                "prompt": "Respond to an email",
                "context": "Scheduling inquiry",
                "user_answer": "Dear Mr. Smith, I would be pleased to attend the meeting on Thursday at 2 PM. Best regards."
            }
        ]
    }
    res = client.post("/api/sw/grade-test", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "total_score_estimate" in data
    assert "level" in data
    assert "overall_comment" in data
    assert "action_plan" in data

def test_shadowing_lessons_list():
    res = client.get("/api/sw/shadowing-lessons?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert "lessons" in data
    assert "total" in data
    assert "category_counts" in data
    assert "accent_counts" in data
    assert len(data["lessons"]) > 0
    first = data["lessons"][0]
    assert "title" in first
    assert "youtube_id" in first

def test_shadowing_evaluate_endpoint():
    payload = {
        "target_text": "Good morning, everyone. Welcome to the conference.",
        "user_speech": "Good morning everyone. Welcome to the conference."
    }
    res = client.post("/api/sw/shadowing-evaluate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "accuracy" in data
    assert data["accuracy"] >= 90
    assert data["status"] == "excellent"
    assert "words" in data
    assert len(data["words"]) > 0
    assert any(w["status"] == "correct" for w in data["words"])

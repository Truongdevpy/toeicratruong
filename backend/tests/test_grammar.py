import pytest
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_list_grammar_topics():
    res = client.get("/api/grammar")
    assert res.status_code == 200
    data = res.json()
    assert "topics" in data
    topics = data["topics"]
    assert len(topics) >= 15
    
    # Check first topic
    t1 = topics[0]
    assert t1["title_vi"] == "Danh từ"
    assert t1["formula"] is not None
    assert len(t1["tips"]) > 0
    assert len(t1["examples"]) > 0
    assert len(t1["practice_questions"]) > 0
    
    # Ensure distinct questions across topics
    t2 = topics[1]
    q1_text = t1["practice_questions"][0]["question_text"]
    q2_text = t2["practice_questions"][0]["question_text"]
    assert q1_text != q2_text, "Questions must be unique across different grammar topics"

def test_get_grammar_topic_detail():
    res = client.get("/api/grammar")
    assert res.status_code == 200
    topics = res.json()["topics"]
    first_id = topics[0]["id"]
    
    detail_res = client.get(f"/api/grammar/{first_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == first_id
    assert len(detail["practice_questions"]) >= len(topics[0]["practice_questions"])

def test_get_grammar_topic_not_found():
    res = client.get("/api/grammar/invalid-topic-id-99999")
    assert res.status_code == 404

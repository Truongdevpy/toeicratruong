# -*- coding: utf-8 -*-
import sys
from pathlib import Path
from fastapi.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from main import app
from auth import create_access_token

client = TestClient(app)

def test_part3_practice_has_evidence_and_passages():
    res = client.get("/api/practice/part/3")
    assert res.status_code == 200
    data = res.json()
    assert "questions" in data
    assert "passages" in data
    assert len(data["passages"]) > 0
    first_passage = data["passages"][0]
    assert "transcript" in first_passage
    assert "passage_text" in first_passage
    assert "questions" in first_passage
    assert len(first_passage["questions"]) > 0
    q = first_passage["questions"][0]
    assert "evidence" in q
    assert "evidence_vi" in q
    assert "paraphrase" in q

def test_part7_practice_has_passages_and_evidence():
    res = client.get("/api/practice/part/7")
    assert res.status_code == 200
    data = res.json()
    assert "questions" in data
    assert "passages" in data
    assert len(data["passages"]) > 0
    first_passage = data["passages"][0]
    assert "passage_text" in first_passage
    assert "questions" in first_passage
    assert len(first_passage["questions"]) > 0
    q = first_passage["questions"][0]
    assert "evidence" in q
    assert "evidence_vi" in q
    assert "paraphrase" in q

def test_part4_and_part6_have_evidence():
    res4 = client.get("/api/practice/part/4")
    assert res4.status_code == 200
    d4 = res4.json()
    assert len(d4["questions"]) > 0
    assert "evidence" in d4["questions"][0]

    res6 = client.get("/api/practice/part/6")
    assert res6.status_code == 200
    d6 = res6.json()
    assert len(d6["questions"]) > 0
    assert "evidence" in d6["questions"][0]

def test_mock_test_detail_has_evidence():
    token = create_access_token(data={"sub": "2", "role": "admin"})
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/api/mock-tests/crack-toeic-vol-1-test-01", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "questions" in data
    p3_qs = [q for q in data["questions"] if q.get("part") == 3]
    assert len(p3_qs) > 0
    assert "evidence" in p3_qs[0]
    assert len(p3_qs[0]["evidence"]) > 0

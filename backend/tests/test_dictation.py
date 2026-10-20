import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from main import app

client = TestClient(app)

def test_list_dictation_challenges():
    res = client.get("/api/dictation/challenges?limit=5")
    assert res.status_code == 200
    data = res.json()
    assert "challenges" in data
    assert len(data["challenges"]) > 0
    item = data["challenges"][0]
    assert "full_sentence" in item
    assert "lines" in item
    assert "segments" in item
    assert "key_vocab" in item

def test_dictation_check_diff_highlight_states():
    # Target text
    target = "The manager will conduct an inspection tomorrow morning"
    
    # 1. Exact match
    res_exact = client.post("/api/dictation/check", json={
        "target_text": target,
        "user_text": "The manager will conduct an inspection tomorrow morning"
    })
    assert res_exact.status_code == 200
    d_exact = res_exact.json()
    assert d_exact["accuracy_pct"] == 100.0
    assert d_exact["is_correct"] is True
    assert all(w["status"] == "correct" for w in d_exact["diff"])

    # 2. Test with missing, wrong, and extra words
    user_text = "manager will conduct an inspec tomorrow morning fast"
    res_diff = client.post("/api/dictation/check", json={
        "target_text": target,
        "user_text": user_text
    })
    assert res_diff.status_code == 200
    d_diff = res_diff.json()
    statuses = [w["status"] for w in d_diff["diff"]]
    
    assert "correct" in statuses
    assert "missing" in statuses
    assert "wrong" in statuses
    assert "extra" in statuses
    assert "stats" in d_diff
    assert d_diff["stats"]["missing_words"] >= 1
    assert d_diff["stats"]["wrong_words"] >= 1
    assert d_diff["stats"]["extra_words"] >= 1
    assert "explanation" in d_diff
    assert "segments" in d_diff

def test_dictation_check_multiline_options_and_questions():
    target = "(A) Some cords are hanging on a wall.\n(B) A lamp has fallen over on the floor.\n(C) A jacket has been left on a chair.\n(D) Some tools have been put away in a bin."
    user = "Some cords are hanging on a wall.\n(B) A lamp has fallen on the floor.\n(C) A jacket has been left on a chair.\n(D) Some tools have been put away in a bin."

    res = client.post("/api/dictation/check", json={
        "target_text": target,
        "user_text": user
    })
    assert res.status_code == 200
    data = res.json()
    assert "line_diffs" in data
    assert len(data["line_diffs"]) == 4
    assert data["line_diffs"][0]["accuracy_pct"] == 100.0
    assert data["line_diffs"][1]["accuracy_pct"] < 100.0
    assert data["stats"]["missing_words"] >= 1
    assert data["stats"]["correct_words"] >= 20
    assert data["accuracy_pct"] >= 90.0

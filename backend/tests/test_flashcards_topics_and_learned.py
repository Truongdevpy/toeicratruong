import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).resolve().parent.parent))
from main import app
from database import SessionLocal
import models

client = TestClient(app)

def test_flashcards_topic_classification_and_metrics():
    # 1. Fetch all flashcards
    res = client.get("/api/practice/flashcards?filter_type=all&topic=all")
    assert res.status_code == 200
    data = res.json()
    assert "deck" in data
    assert "topics" in data
    assert len(data["deck"]) > 0
    assert len(data["topics"]) >= 9 # All + 8 topics + General

    # Verify every topic has id, name, icon
    topic_ids = {t["id"] for t in data["topics"]}
    assert "office" in topic_ids
    assert "finance" in topic_ids
    assert "personnel" in topic_ids
    assert "travel" in topic_ids
    assert "dining" in topic_ids
    assert "contract" in topic_ids
    assert "technology" in topic_ids

    # 2. Check topic-specific filtering
    res_office = client.get("/api/practice/flashcards?filter_type=all&topic=office")
    assert res_office.status_code == 200
    data_office = res_office.json()
    assert len(data_office["deck"]) > 0
    for card in data_office["deck"]:
        assert card["topic"] == "office"
        assert card["topic_name"] == "Văn phòng & Công sở"

def test_flashcards_learned_review_persistence():
    # 1. Test reviewing a card with rating 'good'
    test_word = "benchmark"
    review_res = client.post("/api/practice/flashcards/review", json={
        "word_id": "test_fc_benchmark_001",
        "word": test_word,
        "rating": "good",
        "meaning": "tiêu chuẩn đối sánh trong kinh doanh",
        "ipa": "/ˈbentʃmɑːk/",
        "topic": "office",
        "topic_name": "Văn phòng & Công sở"
    })
    assert review_res.status_code == 200
    r_data = review_res.json()
    assert r_data["status"] == "success"
    assert r_data["rating"] == "good"
    assert r_data["next_review_days"] == 3

    # 2. Verify word appears in learned filter
    learned_res = client.get("/api/practice/flashcards?filter_type=learned&topic=all")
    assert learned_res.status_code == 200
    l_data = learned_res.json()
    learned_words = [c["word"].lower() for c in l_data["deck"]]
    assert test_word.lower() in learned_words

def test_flashcards_add_and_remove():
    add_word = "collaborator"
    add_res = client.post("/api/practice/flashcards/add", json={
        "word": add_word,
        "meaning": "người cộng tác",
        "ipa": "/kəˈlæb.ə.reɪ.tər/",
        "part_of_speech": "n",
        "example": "He is a reliable collaborator on this project."
    })
    assert add_res.status_code == 200

    # Verify in learned deck
    res = client.get("/api/practice/flashcards?filter_type=learned&topic=all")
    words = [c["word"].lower() for c in res.json()["deck"]]
    assert add_word.lower() in words

    # Remove
    del_res = client.post("/api/practice/flashcards/remove", json={"word": add_word})
    assert del_res.status_code == 200

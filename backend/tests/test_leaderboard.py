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

@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    yield session
    session.close()

@pytest.fixture
def student_user(db):
    user = db.query(models.User).filter(models.User.email == "student@toeicai.vn").first()
    return user

def create_user_token(user):
    return create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "token_version": user.token_version
    })

def test_get_leaderboard_guest():
    res = client.get("/api/leaderboard")
    assert res.status_code == 200
    data = res.json()
    assert "podium" in data
    assert len(data["podium"]) == 3
    assert "rankings" in data
    assert "summary" in data
    assert "leagues" in data
    assert data["podium"][0]["rank"] == 1
    assert data["podium"][1]["rank"] == 2
    assert data["podium"][2]["rank"] == 3

def test_get_leaderboard_categories():
    for cat in ["score", "streak", "practice", "growth"]:
        res = client.get(f"/api/leaderboard?category={cat}")
        assert res.status_code == 200
        data = res.json()
        assert data["category"] == cat
        assert len(data["podium"]) == 3

def test_get_leaderboard_leagues():
    res = client.get("/api/leaderboard?league=master")
    assert res.status_code == 200
    data = res.json()
    all_users = data["podium"] + data["rankings"]
    for u in all_users:
        assert u["current_score"] >= 800

def test_get_leaderboard_search():
    res = client.get("/api/leaderboard?search=Bách+Khoa")
    assert res.status_code == 200
    data = res.json()
    all_users = data["podium"] + data["rankings"]
    assert len(all_users) >= 1
    assert any("Bách Khoa" in u["school_or_org"] or "Bách Khoa" in u["full_name"] for u in all_users)

def test_get_leaderboard_with_auth(student_user):
    token = create_user_token(student_user)
    res = client.get("/api/leaderboard", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["my_rank"] is not None
    assert data["my_rank"]["user_id"] == student_user.id
    assert data["my_rank"]["is_me"] is True

def test_cheer_learner():
    # First get an ID
    res = client.get("/api/leaderboard")
    data = res.json()
    first_id = data["podium"][0]["id"]
    old_cheers = data["podium"][0]["cheer_count"]

    cheer_res = client.post(f"/api/leaderboard/cheer/{first_id}")
    assert cheer_res.status_code == 200
    cheer_data = cheer_res.json()
    assert cheer_data["status"] == "success"
    assert cheer_data["cheer_count"] == old_cheers + 1

def test_get_leaderboard_rules():
    res = client.get("/api/leaderboard/rules")
    assert res.status_code == 200
    data = res.json()
    assert "scoring_system" in data
    assert "rewards" in data

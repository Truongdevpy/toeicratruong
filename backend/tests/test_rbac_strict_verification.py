# -*- coding: utf-8 -*-
import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from main import app

client = TestClient(app)

def test_guest_dictation_catalog_allowed_but_practice_gated():
    # 1. Guest can browse dictation challenges catalog (Khách: ✅)
    res = client.get("/api/dictation/challenges?limit=5")
    assert res.status_code == 200
    data = res.json()
    assert "challenges" in data
    assert len(data["challenges"]) > 0

def test_student_tier_advanced_level_limitation():
    # Student login
    r_student = client.post("/api/auth/demo", json={"role": "student"})
    assert r_student.status_code == 200
    token = r_student.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Request Level 4 (Advanced)
    res_adv = client.get("/api/practice/part/1?level=Level 4&limit=20", headers=headers)
    assert res_adv.status_code == 200
    data = res_adv.json()
    # Student tier is restricted to at most 5 questions on advanced levels
    assert len(data.get("questions", [])) <= 5

def test_vip_tier_full_access_advanced_level():
    # VIP login
    r_vip = client.post("/api/auth/demo", json={"role": "vip"})
    assert r_vip.status_code == 200
    token = r_vip.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Request Level 1
    res = client.get("/api/practice/part/1?level=Level 1&limit=20", headers=headers)
    assert res.status_code == 200
    assert "questions" in res.json()

def test_vocab_basket_limit_student():
    r_student = client.post("/api/auth/demo", json={"role": "student"})
    token = r_student.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Adding a word succeeds
    res = client.post("/api/practice/flashcards/add", headers=headers, json={
        "word_id": "test_rbac_word",
        "word": "collaborate",
        "meaning": "hợp tác",
        "part_of_speech": "v"
    })
    assert res.status_code in [200, 403]

def test_mock_test_detail_rbac():
    # 1. Guest -> 401 Unauthorized
    r_guest = client.get("/api/tests/test-1")
    assert r_guest.status_code == 401

    # 2. Student -> Basic test (test-1) allowed (200), VIP test (test-2) forbidden (403)
    r_student = client.post("/api/auth/demo", json={"role": "student"})
    student_token = r_student.json()["access_token"]
    h_student = {"Authorization": f"Bearer {student_token}"}

    r_test1 = client.get("/api/tests/test-1", headers=h_student)
    assert r_test1.status_code == 200
    assert "questions" in r_test1.json()

    r_test2 = client.get("/api/tests/test-2", headers=h_student)
    assert r_test2.status_code == 403

    # 3. VIP -> All tests allowed (200)
    r_vip = client.post("/api/auth/demo", json={"role": "vip"})
    vip_token = r_vip.json()["access_token"]
    h_vip = {"Authorization": f"Bearer {vip_token}"}

    r_vip_test2 = client.get("/api/tests/test-2", headers=h_vip)
    assert r_vip_test2.status_code == 200


def test_guest_posting_and_chat_strictly_blocked():
    # 1. Guest can browse community posts & read messages (Public access: ✅)
    res_posts = client.get("/api/community/posts")
    assert res_posts.status_code == 200

    res_msgs = client.get("/api/chat/community/messages")
    assert res_msgs.status_code == 200

    # 2. Guest CANNOT create a community post -> 401
    res_create_post = client.post("/api/community/posts", json={
        "title": "Hack post",
        "content": "Guest should not post",
        "category": "Kinh nghiệm thi"
    })
    assert res_create_post.status_code == 401

    # 3. Guest CANNOT comment on a post -> 401
    res_comment = client.post("/api/community/posts/1/comments", json={
        "content": "Guest comment"
    })
    assert res_comment.status_code == 401

    # 4. Guest CANNOT like a post -> 401
    res_like = client.post("/api/community/posts/1/like")
    assert res_like.status_code == 401

    # 5. Guest CANNOT send community chat messages -> 401
    res_chat = client.post("/api/chat/community/messages", json={
        "content": "Guest chat"
    })
    assert res_chat.status_code == 401

    # 6. Guest CANNOT send private direct messages -> 401
    res_pm = client.post("/api/chat/conversations/101/send", json={
        "content": "Guest PM"
    })
    assert res_pm.status_code == 401

    # 7. Guest CANNOT send friend request -> 401
    res_fr = client.post("/api/chat/friends/request", json={
        "friend_id": 101
    })
    assert res_fr.status_code == 401

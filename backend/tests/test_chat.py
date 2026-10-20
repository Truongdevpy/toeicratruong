import pytest
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models
from auth import create_access_token

client = TestClient(app)

@pytest.fixture
def auth_headers():
    db = SessionLocal()
    user = db.query(models.User).filter(models.User.email == "student@toeicai.vn").first()
    if not user:
        user = models.User(
            email="student@toeicai.vn",
            password_hash="fake",
            full_name="Demo Student",
            role="student"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role, "token_version": user.token_version})
    db.close()
    return {"Authorization": f"Bearer {token}"}

def test_get_online_users():
    res = client.get("/api/chat/online-users")
    assert res.status_code == 200
    data = res.json()
    assert data["total_online"] >= 128
    assert "●" in data["display_text"]
    assert "người đang online" in data["display_text"]
    assert len(data["users"]) > 0
    u = data["users"][0]
    assert "id" in u
    assert "full_name" in u
    assert "target_score" in u
    assert u["is_online"] is True

def test_conversations_and_messaging(auth_headers):
    # 1. Get conversations (seeds initial threads if empty)
    res_convs = client.get("/api/chat/conversations", headers=auth_headers)
    assert res_convs.status_code == 200
    data_convs = res_convs.json()
    assert "conversations" in data_convs
    assert len(data_convs["conversations"]) > 0

    # 2. Send message to user 101 (Nguyễn Thu Hà)
    res_send = client.post(
        "/api/chat/conversations/101/send",
        json={"content": "Chào Hà, bạn có tài liệu Part 7 hay không?"},
        headers=auth_headers
    )
    assert res_send.status_code == 200
    sent_data = res_send.json()
    assert sent_data["content"] == "Chào Hà, bạn có tài liệu Part 7 hay không?"
    assert sent_data["recipient_id"] == 101

    # 3. Retrieve messages with user 101
    res_msgs = client.get("/api/chat/conversations/101/messages", headers=auth_headers)
    assert res_msgs.status_code == 200
    data_msgs = res_msgs.json()
    assert len(data_msgs["messages"]) > 0
    assert any(m["content"] == "Chào Hà, bạn có tài liệu Part 7 hay không?" for m in data_msgs["messages"])

    # 4. Typing indicator
    res_typing = client.post(
        "/api/chat/typing",
        json={"recipient_id": 101, "is_typing": True},
        headers=auth_headers
    )
    assert res_typing.status_code == 200

    # 5. Mark as read
    res_read = client.post(
        "/api/chat/read",
        json={"sender_id": 101},
        headers=auth_headers
    )
    assert res_read.status_code == 200

def test_chat_websocket():
    with client.websocket_connect("/api/chat/ws") as ws:
        # Client receives initial broadcast online_count
        data = ws.receive_json()
        assert data["type"] == "online_count"
        assert data["total_online"] >= 128

        # Send ping, receive pong
        ws.send_json({"type": "ping"})
        pong = ws.receive_json()
        assert pong["type"] == "pong"


def test_community_messages(auth_headers):
    # 1. Get community messages (Public access allowed for reading)
    res = client.get("/api/chat/community/messages")
    assert res.status_code == 200
    data = res.json()
    assert "messages" in data
    assert len(data["messages"]) >= 4
    m0 = data["messages"][0]
    assert "sender_name" in m0
    assert "content" in m0

    # 2. Unauthenticated user CANNOT post community message (Must return 401)
    res_unauth = client.post(
        "/api/chat/community/messages",
        json={"content": "Tin nhắn từ khách chưa đăng nhập"}
    )
    assert res_unauth.status_code == 401

    # 3. Authenticated user can post community message
    res_post = client.post(
        "/api/chat/community/messages",
        json={"content": "Xin chào cộng đồng luyện thi TOEIC!"},
        headers=auth_headers
    )
    assert res_post.status_code == 200
    msg = res_post.json()
    assert msg["content"] == "Xin chào cộng đồng luyện thi TOEIC!"
    assert msg["sender_name"] is not None

    # Clean up test message
    db = SessionLocal()
    db.query(models.CommunityChatMessage).filter(models.CommunityChatMessage.id == msg["id"]).delete()
    db.commit()
    db.close()


def test_friendship_system(auth_headers):
    # 1. Get friends
    res = client.get("/api/chat/friends", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "friends" in data
    assert "incoming_requests" in data
    assert "outgoing_requests" in data

    # 2. Send friend request to 104
    res_req = client.post("/api/chat/friends/request", json={"friend_id": 104}, headers=auth_headers)
    assert res_req.status_code == 200
    assert res_req.json()["status"] == "success"

    # 3. Check friendship status with 104
    res_st = client.get("/api/chat/friends/status/104", headers=auth_headers)
    assert res_st.status_code == 200
    assert res_st.json()["status"] == "friends"

    # 4. Remove friend
    res_rem = client.post("/api/chat/friends/remove", json={"friend_id": 104}, headers=auth_headers)
    assert res_rem.status_code == 200

# -*- coding: utf-8 -*-
import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from main import app

client = TestClient(app)

@pytest.fixture
def auth_headers():
    r = client.post("/api/auth/demo", json={"role": "vip"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_deeptutor_memory_lifecycle(auth_headers):
    # 1. Get memory
    res_get = client.get("/api/ai-tutor/memory", headers=auth_headers)
    assert res_get.status_code == 200
    data = res_get.json()
    assert data["status"] == "success"
    assert "target_score" in data
    assert "framework" in data
    assert "DeepTutor" in data["framework"]

    # 2. Update memory notes and target score
    res_put = client.put("/api/ai-tutor/memory", headers=auth_headers, json={
        "target_score": 750,
        "weak_areas": ["Part 5 Word Form", "Part 2 Echo Words"],
        "ai_memory_notes": "Tôi muốn học theo phương pháp Socratic, luôn kèm câu hỏi gợi mở."
    })
    assert res_put.status_code == 200
    upd_data = res_put.json()
    assert upd_data["status"] == "success"
    assert upd_data["memory"]["target_score"] == 750
    assert "Socratic" in upd_data["memory"]["ai_memory_notes"]

    # 3. Create conversation
    res_conv = client.post("/api/ai-tutor/conversations", headers=auth_headers, json={
        "title": "Luyện Part 5 Word Form"
    })
    assert res_conv.status_code == 200
    conv_id = res_conv.json()["conversation"]["id"]

    # 4. Chat with DeepTutor (Pass conversation_id)
    res_chat = client.post("/api/ai-tutor/chat", headers=auth_headers, json={
        "message": "Cho tôi 1 bài tập trắc nghiệm Part 5 dạng từ loại",
        "action": "quiz",
        "conversation_id": conv_id
    })
    assert res_chat.status_code == 200
    chat_data = res_chat.json()
    assert "reply" in chat_data
    assert chat_data["conversation_id"] == conv_id

    # 5. Delete conversation
    res_del_conv = client.delete(f"/api/ai-tutor/conversations/{conv_id}", headers=auth_headers)
    assert res_del_conv.status_code == 200

    # 6. Reset memory
    res_reset = client.delete("/api/ai-tutor/memory/reset", headers=auth_headers)
    assert res_reset.status_code == 200

def test_deeptutor_multi_turn_history(auth_headers):
    # 1. Create a conversation
    res_conv = client.post("/api/ai-tutor/conversations", headers=auth_headers, json={
        "title": "Hội thoại đa lượt Socratic"
    })
    assert res_conv.status_code == 200
    conv_id = res_conv.json()["conversation"]["id"]

    # 2. Turn 1
    res1 = client.post("/api/ai-tutor/chat", headers=auth_headers, json={
        "message": "Tôi đang yếu câu hỏi gián tiếp Part 2",
        "action": "explain_simpler",
        "conversation_id": conv_id
    })
    assert res1.status_code == 200

    # 3. Turn 2 (building on prior context)
    res2 = client.post("/api/ai-tutor/chat", headers=auth_headers, json={
        "message": "Hãy cho tôi 1 ví dụ thực tế kèm bẫy lặp âm",
        "action": "give_examples",
        "conversation_id": conv_id
    })
    assert res2.status_code == 200
    assert "reply" in res2.json()

    # 4. Check conversation messages list
    res_msgs = client.get(f"/api/ai-tutor/conversations/{conv_id}/messages", headers=auth_headers)
    assert res_msgs.status_code == 200
    data = res_msgs.json()
    assert len(data["messages"]) >= 4  # 2 user + 2 ai

    # 5. Clean up
    client.delete(f"/api/ai-tutor/conversations/{conv_id}", headers=auth_headers)

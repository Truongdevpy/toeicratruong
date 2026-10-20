# -*- coding: utf-8 -*-
import pytest
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app
from database import get_db, SessionLocal
import models
from mojibake_guard import is_mojibake, sanitize_mojibake, sanitize_data

client = TestClient(app)

def test_mojibake_detection():
    # True positives: corrupted strings
    assert is_mojibake("Học tiáº¿ng Anh cÃ¹ng Ä‘á»™i ngÅ© â€™") is True
    assert is_mojibake("Tá»« vá»±ng vÃ  ngá»¯ phÃ¡p") is True
    assert is_mojibake("Ä‘Ã¢y lÃ  bÃ i kiá»ƒm tra") is True
    assert is_mojibake("khoÃ¡ há» c") is True

    # True negatives: valid UTF-8 Vietnamese
    assert is_mojibake("Học tiếng Anh cùng đội ngũ ’") is False
    assert is_mojibake("Từ vựng và ngữ pháp") is False
    assert is_mojibake("Đây là bài kiểm tra TOEIC chuẩn ETS") is False
    assert is_mojibake("MÃ HÀNG | HÃY LÀM BÀI") is False
    assert is_mojibake("Xin chào bạn, chúc bạn học tốt!") is False

def test_mojibake_repair():
    corrupted = "Học tiáº¿ng Anh cÃ¹ng Ä‘á»™i ngÅ© â€™"
    repaired = sanitize_mojibake(corrupted)
    assert "tiếng" in repaired
    assert "đội" in repaired
    assert "ngũ" in repaired
    assert "’" in repaired or "'" in repaired

    corrupted2 = "Tá»« vá»±ng vÃ  ngá»¯ phÃ¡p"
    repaired2 = sanitize_mojibake(corrupted2)
    assert repaired2 == "Từ vựng và ngữ pháp"

    # Already clean text must remain identical
    clean_text = "Nền tảng luyện thi TOEIC trực tuyến toàn diện chuẩn ETS"
    assert sanitize_mojibake(clean_text) == clean_text

def test_sanitize_nested_data():
    raw_data = {
        "title": "BÃ i há» c TOEIC",
        "tags": ["tiáº¿ng Anh", "ngá»¯ phÃ¡p"],
        "info": {
            "author": "Ä‘á»™i ngÅ© chuyÃªn gia",
            "count": 42
        }
    }
    cleaned = sanitize_data(raw_data)
    assert cleaned["title"] == "Bài học TOEIC"
    assert "tiếng Anh" in cleaned["tags"]
    assert "ngữ pháp" in cleaned["tags"]
    assert "đội ngũ chuyên gia" in cleaned["info"]["author"]
    assert cleaned["info"]["count"] == 42

def test_system_encoding_endpoint():
    response = client.get("/api/system/encoding-status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["system_encoding"] == "utf-8"
    assert data["mojibake_guard_active"] is True
    assert "Tiếng Việt chuẩn UTF-8" in data["sample_vietnamese"]
    assert "charset=utf-8" in response.headers.get("content-type", "").lower()

def test_sqlalchemy_auto_healing_insert():
    db = SessionLocal()
    try:
        # Create test object with intentional mojibake in text field
        test_msg = models.CommunityChatMessage(
            sender_id=1,
            sender_name="Người dùng",
            content="Tin nháº¯n thá»­ nghiá»‡m vá»›i Ä‘á»™i ngÅ©"
        )
        db.add(test_msg)
        db.commit()
        db.refresh(test_msg)

        # Value saved in DB must be auto-sanitized clean UTF-8
        assert "nhắn" in test_msg.content
        assert "thử nghiệm" in test_msg.content
        assert "đội ngũ" in test_msg.content

        db.delete(test_msg)
        db.commit()
    finally:
        db.close()

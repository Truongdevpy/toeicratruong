# -*- coding: utf-8 -*-
from datetime import datetime, timezone, timedelta
import pytest
from pathlib import Path
import sys

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from timezone_utils import (
    to_vn_datetime,
    to_iso_utc,
    format_vn_time,
    format_vn_datetime,
    format_relative_time_vn,
    get_vn_day_start_utc,
    VN_TZ_OFFSET,
    VN_TIMEZONE
)
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models
from auth import create_access_token

client = TestClient(app)

def test_timezone_conversion_helpers():
    # 03:02:00 UTC -> 10:02:00 Vietnam time (UTC+7)
    utc_dt = datetime(2026, 9, 29, 3, 2, 0)
    vn_dt = to_vn_datetime(utc_dt)
    assert vn_dt is not None
    assert vn_dt.hour == 10
    assert vn_dt.minute == 2

    # String format
    assert format_vn_time(utc_dt, "%H:%M") == "10:02"
    assert format_vn_datetime(utc_dt) == "29/09/2026 10:02"

    # ISO UTC
    iso_utc = to_iso_utc(utc_dt)
    assert iso_utc.endswith("Z")
    assert "2026-09-29T03:02:00" in iso_utc

def test_chat_api_returns_vietnam_time():
    # User 2 (Admin)
    token = create_access_token({"sub": "2", "email": "admin@toeicai.vn", "role": "admin", "token_version": 1})
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch messages with user 102
    res = client.get("/api/chat/conversations/102/messages", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "messages" in data
    assert len(data["messages"]) > 0

    for msg in data["messages"]:
        assert "created_at" in msg
        assert "created_at_raw" in msg
        # created_at_raw must be valid ISO ending with Z or offset
        raw = msg["created_at_raw"]
        assert raw.endswith("Z") or "+" in raw

def test_conversations_list_timezone():
    token = create_access_token({"sub": "2", "email": "admin@toeicai.vn", "role": "admin", "token_version": 1})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/chat/conversations", headers=headers)
    assert res.status_code == 200
    convs = res.json()["conversations"]
    assert len(convs) > 0
    c0 = convs[0]
    assert "last_message_at" in c0
    assert "last_message_raw" in c0
    assert c0["last_message_raw"].endswith("Z") or "+" in c0["last_message_raw"]
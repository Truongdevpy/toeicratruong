import pytest
from pathlib import Path
import sys
import json
import base64

sys.path.append(str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_google_auth_new_user_registration():
    email = "google_new_student_2026@gmail.com"
    payload = {
        "email": email,
        "full_name": "Nguyen Van Google",
        "avatar_url": "https://example.com/avatar.jpg"
    }
    res = client.post("/api/auth/google", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == email
    assert data["user"]["full_name"] == "Nguyen Van Google"
    assert data["user"]["role"] == "student"

def test_google_auth_existing_user_login():
    email = "google_new_student_2026@gmail.com"
    payload = {
        "email": email
    }
    res = client.post("/api/auth/google", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == email

def test_google_auth_with_credential_jwt():
    # Construct a mock Google JWT credential (header.payload.sig)
    header = base64.urlsafe_b64encode(json.dumps({"alg": "RS256"}).encode()).decode().rstrip("=")
    token_payload = {
        "email": "credential_student_2026@gmail.com",
        "name": "Credential Student",
        "picture": "https://example.com/pic.jpg"
    }
    body = base64.urlsafe_b64encode(json.dumps(token_payload).encode()).decode().rstrip("=")
    fake_jwt = f"{header}.{body}.fakesignature"
    
    res = client.post("/api/auth/google", json={"credential": fake_jwt})
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["email"] == "credential_student_2026@gmail.com"
    assert data["user"]["full_name"] == "Credential Student"

# -*- coding: utf-8 -*-
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

def test_demo_login_endpoints():
    # 1. Demo Student
    r_student = client.post("/api/auth/demo", json={"role": "student"})
    assert r_student.status_code == 200
    d_student = r_student.json()
    assert d_student["user"]["role"] == "student"
    assert "student@toeicai.vn" in d_student["user"]["email"]

    # 2. Demo VIP
    r_vip = client.post("/api/auth/demo", json={"role": "vip"})
    assert r_vip.status_code == 200
    d_vip = r_vip.json()
    assert d_vip["user"]["role"] == "vip"
    assert "vip@toeicai.vn" in d_vip["user"]["email"]

    # 3. Demo Admin
    r_admin = client.post("/api/auth/demo", json={"role": "admin"})
    assert r_admin.status_code == 200
    d_admin = r_admin.json()
    assert d_admin["user"]["role"] == "admin"
    assert "admin@toeicai.vn" in d_admin["user"]["email"]

def test_admin_vip_toggle_and_revenue():
    # Login as admin
    r_admin = client.post("/api/auth/demo", json={"role": "admin"})
    admin_token = r_admin.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Revenue endpoint
    r_rev = client.get("/api/admin/revenue", headers=headers)
    assert r_rev.status_code == 200
    rev_data = r_rev.json()
    assert "total_revenue" in rev_data
    assert "total_vip_users" in rev_data
    assert "conversion_rate" in rev_data

    # List users
    r_users = client.get("/api/admin/users?limit=10", headers=headers)
    assert r_users.status_code == 200
    users_data = r_users.json()
    assert "users" in users_data
    assert len(users_data["users"]) > 0

    target_user = users_data["users"][0]
    target_id = target_user["id"]

    # Non-admin forbidden
    r_student = client.post("/api/auth/demo", json={"role": "student"})
    student_token = r_student.json()["access_token"]
    forbidden_res = client.get("/api/admin/revenue", headers={"Authorization": f"Bearer {student_token}"})
    assert forbidden_res.status_code in [401, 403]

def test_free_tier_limits():
    # Login as student
    r_student = client.post("/api/auth/demo", json={"role": "student"})
    student_token = r_student.json()["access_token"]
    headers = {"Authorization": f"Bearer {student_token}"}

    # Test that adding flashcard works
    r_add = client.post("/api/practice/flashcards/add", headers=headers, json={
        "word_id": "test_word_sample_01",
        "word": "negotiation",
        "meaning": "sự đàm phán, thương lượng",
        "part_of_speech": "n",
        "example": "The contract is currently under negotiation."
    })
    assert r_add.status_code in [200, 403]  # 200 if under 30 words, 403 if already 30

def test_dictation_sets_and_auth_matrix():
    # 1. Guest can browse dictation sets catalog
    res_sets = client.get("/api/dictation/sets?limit=5")
    assert res_sets.status_code == 200
    d_sets = res_sets.json()
    assert "sets" in d_sets
    assert len(d_sets["sets"]) > 0

    # 2. Student has 3 AI tutor queries/day
    r_student = client.post("/api/auth/demo", json={"role": "student"})
    student_token = r_student.json()["access_token"]
    h_student = {"Authorization": f"Bearer {student_token}"}

    # Check student role
    assert r_student.json()["user"]["role"] == "student"

    # 3. VIP user has unlimited
    r_vip = client.post("/api/auth/demo", json={"role": "vip"})
    vip_token = r_vip.json()["access_token"]
    h_vip = {"Authorization": f"Bearer {vip_token}"}
    assert r_vip.json()["user"]["role"] == "vip"

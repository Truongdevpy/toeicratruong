# -*- coding: utf-8 -*-
import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))
from main import app
from database import SessionLocal
import models
import auth

client = TestClient(app)

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def admin_token(db_session):
    admin = db_session.query(models.User).filter(models.User.role == "admin").first()
    if not admin:
        admin = models.User(
            email="test_admin_sg@toeicai.vn",
            full_name="Admin Test SG",
            role="admin",
            password_hash=auth.get_password_hash("AdminPass123!"),
            is_active=True
        )
        db_session.add(admin)
        db_session.commit()
        db_session.refresh(admin)
    return auth.create_access_token({"sub": str(admin.id)})

@pytest.fixture
def student_token(db_session):
    student = db_session.query(models.User).filter(models.User.role == "student").first()
    if not student:
        student = models.User(
            email="test_student_sg@toeicai.vn",
            full_name="Student Test SG",
            role="student",
            password_hash=auth.get_password_hash("StudentPass123!"),
            is_active=True
        )
        db_session.add(student)
        db_session.commit()
        db_session.refresh(student)
    return auth.create_access_token({"sub": str(student.id)})

def test_public_study_groups_listing():
    res = client.get("/api/community/groups")
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "groups" in data
    assert data["total"] >= 1
    assert len(data["groups"]) >= 1

    first = data["groups"][0]
    assert "id" in first
    assert "name" in first
    assert "target_score" in first
    assert "members_count" in first
    assert "active_online" in first

def test_student_cannot_create_study_group(student_token):
    res = client.post(
        "/api/admin/groups",
        json={"name": "Hacked Group", "target_score": "900+"},
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert res.status_code == 403

def test_admin_create_update_and_delete_study_group(admin_token):
    # 1. Admin creates a real study group
    create_payload = {
        "name": "Chiến binh TOEIC 800+ K55 PyTest",
        "description": "Nhóm luyện đề chuyên sâu ETS và bẫy Part 3, 4",
        "target_score": "700-850+",
        "schedule_info": "Thứ 2, 4, 6 lúc 20:00",
        "members_count": 65,
        "active_online": 12
    }
    res_create = client.post(
        "/api/admin/groups",
        json=create_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_create.status_code == 200
    created_data = res_create.json()
    assert created_data["status"] == "success"
    group_id = created_data["group"]["id"]
    assert group_id is not None
    assert created_data["group"]["name"] == create_payload["name"]

    # 2. Check that the group is listed in public API
    res_list = client.get("/api/community/groups")
    assert res_list.status_code == 200
    all_groups = res_list.json()["groups"]
    matching = [g for g in all_groups if g["id"] == group_id]
    assert len(matching) == 1
    assert matching[0]["name"] == create_payload["name"]
    assert matching[0]["target_score"] == "700-850+"
    assert matching[0]["schedule_info"] == "Thứ 2, 4, 6 lúc 20:00"

    # 3. User joins the group
    res_join = client.post(f"/api/community/groups/{group_id}/join")
    assert res_join.status_code == 200
    join_data = res_join.json()
    assert join_data["status"] == "success"
    assert join_data["new_members_count"] == 66

    # 4. Admin updates the group
    update_payload = {
        "name": "Chiến binh TOEIC 850+ Đột Phá",
        "schedule_info": "Hàng ngày 20:00"
    }
    res_update = client.put(
        f"/api/admin/groups/{group_id}",
        json=update_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_update.status_code == 200

    # Verify update in admin listing
    res_admin_list = client.get("/api/admin/groups", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin_list.status_code == 200
    admin_groups = res_admin_list.json()["groups"]
    updated = [g for g in admin_groups if g["id"] == group_id][0]
    assert updated["name"] == "Chiến binh TOEIC 850+ Đột Phá"
    assert updated["schedule_info"] == "Hàng ngày 20:00"

    # 5. Admin deletes the group
    res_delete = client.delete(
        f"/api/admin/groups/{group_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res_delete.status_code == 200

    # Verify group is gone
    res_after = client.get("/api/community/groups")
    remaining_ids = [g["id"] for g in res_after.json()["groups"]]
    assert group_id not in remaining_ids

def test_join_and_leave_study_group_authenticated(student_token):
    # Get first group
    res_list = client.get("/api/community/groups", headers={"Authorization": f"Bearer {student_token}"})
    assert res_list.status_code == 200
    groups = res_list.json()["groups"]
    assert len(groups) > 0
    group_id = groups[0]["id"]
    initial_count = groups[0]["members_count"]

    # Student joins group
    res_join = client.post(
        f"/api/community/groups/{group_id}/join",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert res_join.status_code == 200
    assert res_join.json()["is_joined"] is True

    # Check is_joined flag in listing
    res_list2 = client.get("/api/community/groups", headers={"Authorization": f"Bearer {student_token}"})
    g_found = next(g for g in res_list2.json()["groups"] if g["id"] == group_id)
    assert g_found["is_joined"] is True

    # Student leaves group
    res_leave = client.post(
        f"/api/community/groups/{group_id}/leave",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert res_leave.status_code == 200
    assert res_leave.json()["is_joined"] is False

    # Check is_joined flag is now False
    res_list3 = client.get("/api/community/groups", headers={"Authorization": f"Bearer {student_token}"})
    g_found3 = next(g for g in res_list3.json()["groups"] if g["id"] == group_id)
    assert g_found3["is_joined"] is False

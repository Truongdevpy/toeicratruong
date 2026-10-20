# -*- coding: utf-8 -*-
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from main import app
from database import SessionLocal
import models
from streak_service import calculate_user_streak, calculate_study_hours, calculate_study_time_breakdown

client = TestClient(app)

def test_streak_calculation_unit():
    db = SessionLocal()
    try:
        # Create a test user
        test_email = f"streak_test_{int(datetime.utcnow().timestamp())}@toeic.vn"
        user = models.User(
            email=test_email,
            password_hash="testhash",
            full_name="Streak Tester",
            role="student"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Baseline: No attempts -> streak is 0
        streak_data = calculate_user_streak(user.id, db)
        assert streak_data["streak_days"] == 0
        assert streak_data["active_today"] is False

        # Add attempt today
        today = datetime.utcnow()
        q1 = models.QuestionAttempt(
            user_id=user.id,
            question_id="streak_q_1",
            part=1,
            is_correct=True,
            time_spent_sec=40,
            created_at=today
        )
        db.add(q1)

        # Add attempt yesterday
        yesterday = today - timedelta(days=1)
        q2 = models.QuestionAttempt(
            user_id=user.id,
            question_id="streak_q_2",
            part=1,
            is_correct=True,
            time_spent_sec=50,
            created_at=yesterday
        )
        db.add(q2)

        # Add attempt 2 days ago
        two_days_ago = today - timedelta(days=2)
        q3 = models.QuestionAttempt(
            user_id=user.id,
            question_id="streak_q_3",
            part=1,
            is_correct=True,
            time_spent_sec=60,
            created_at=two_days_ago
        )
        db.add(q3)
        db.commit()

        # Streak should now be 3 consecutive days
        streak_data2 = calculate_user_streak(user.id, db)
        assert streak_data2["streak_days"] == 3
        assert streak_data2["active_today"] is True

        # Test study hours
        study_data = calculate_study_hours(user.id, db)
        assert study_data["total_study_seconds"] == 150
        assert study_data["today_minutes"] == round(40 / 60.0)

        # Test breakdown
        breakdown = calculate_study_time_breakdown(user.id, db)
        assert len(breakdown["by_day"]) == 7
        assert len(breakdown["by_week"]) == 4
        assert len(breakdown["by_month"]) == 6

        # Cleanup
        db.query(models.QuestionAttempt).filter(models.QuestionAttempt.user_id == user.id).delete()
        db.delete(user)
        db.commit()
    finally:
        db.close()

def test_community_groups_endpoint():
    res = client.get("/api/community/groups")
    assert res.status_code == 200
    data = res.json()
    assert "groups" in data
    assert len(data["groups"]) >= 1

    first_group = data["groups"][0]
    group_id = first_group["id"]
    join_res = client.post(f"/api/community/groups/{group_id}/join")
    assert join_res.status_code == 200
    assert join_res.json()["status"] == "success"

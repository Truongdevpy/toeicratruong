# -*- coding: utf-8 -*-
from datetime import datetime, date, timedelta
from typing import Dict, Any, Set, List
from sqlalchemy.orm import Session
from sqlalchemy import func
import models

VN_DAY_NAMES = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"]

def get_user_active_dates(user_id: int, db: Session) -> Set[date]:
    """
    Returns the set of unique calendar dates on which the user actually
    completed at least one real question attempt or test attempt.
    Excludes synthetic automated test records and initial dummy seeds.
    """
    active_dates: Set[date] = set()

    # 1. Real Question Attempts (exclude synthetic test runs)
    q_dates = db.query(models.QuestionAttempt.created_at).filter(
        models.QuestionAttempt.user_id == user_id,
        ~models.QuestionAttempt.question_id.like("test_q%")
    ).all()
    for (d,) in q_dates:
        if d:
            active_dates.add(d.date())

    # 2. Test Attempts
    t_dates = db.query(models.TestAttempt.created_at).filter(
        models.TestAttempt.user_id == user_id
    ).all()
    for (d,) in t_dates:
        if d:
            active_dates.add(d.date())

    # 3. Placement Attempts (exclude synthetic initial seed before user joined)
    p_dates = db.query(models.PlacementAttempt.created_at).filter(
        models.PlacementAttempt.user_id == user_id,
        models.PlacementAttempt.created_at >= '2026-09-27'
    ).all()
    for (d,) in p_dates:
        if d:
            active_dates.add(d.date())

    return active_dates

def calculate_user_streak(user_id: int, db: Session) -> Dict[str, Any]:
    """
    Calculates consecutive study day streak strictly from real database records.
    If studied today: streak starts from today.
    If not studied today but studied yesterday: streak starts from yesterday (grace period for today).
    Otherwise: streak is 0.
    """
    active_dates = get_user_active_dates(user_id, db)
    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)
    active_today = today in active_dates

    streak = 0
    if active_today:
        check = today
        while check in active_dates:
            streak += 1
            check -= timedelta(days=1)
    elif yesterday in active_dates:
        check = yesterday
        while check in active_dates:
            streak += 1
            check -= timedelta(days=1)
    else:
        streak = 0

    # Sync into UserProfile
    profile = db.query(models.UserProfile).filter(models.UserProfile.user_id == user_id).first()
    if profile:
        profile.streak_days = streak
        if active_today:
            profile.last_study_date = today.isoformat()
        try:
            db.commit()
        except Exception:
            db.rollback()

    return {
        "streak_days": streak,
        "active_today": active_today,
        "total_active_days": len(active_dates)
    }

def calculate_study_hours(user_id: int, db: Session) -> Dict[str, Any]:
    """
    Computes total study hours and today's study minutes strictly from real attempts.
    Treo web / idle without submitting answers does NOT accumulate study minutes.
    """
    today = datetime.utcnow().date()
    today_start = datetime(today.year, today.month, today.day, 0, 0, 0)

    # Real question attempts seconds
    q_attempts = db.query(
        models.QuestionAttempt.time_spent_sec,
        models.QuestionAttempt.created_at
    ).filter(
        models.QuestionAttempt.user_id == user_id,
        ~models.QuestionAttempt.question_id.like("test_q%")
    ).all()

    total_q_sec = sum(rec[0] or 0 for rec in q_attempts)
    today_q_sec = sum(rec[0] or 0 for rec in q_attempts if rec[1] and rec[1] >= today_start)

    # Test attempts seconds
    t_attempts = db.query(
        models.TestAttempt.time_spent_seconds,
        models.TestAttempt.created_at
    ).filter(models.TestAttempt.user_id == user_id).all()

    total_t_sec = sum(rec[0] or 0 for rec in t_attempts)
    today_t_sec = sum(rec[0] or 0 for rec in t_attempts if rec[1] and rec[1] >= today_start)

    total_sec = total_q_sec + total_t_sec
    today_sec = today_q_sec + today_t_sec

    total_hours = round(total_sec / 3600.0, 1)
    today_minutes = round(today_sec / 60.0)

    # Sync into profile
    profile = db.query(models.UserProfile).filter(models.UserProfile.user_id == user_id).first()
    if profile:
        profile.today_minutes_completed = today_minutes
        try:
            db.commit()
        except Exception:
            db.rollback()

    return {
        "total_study_hours": total_hours,
        "total_study_seconds": total_sec,
        "today_minutes": today_minutes
    }

def calculate_study_time_breakdown(user_id: int, db: Session) -> Dict[str, Any]:
    """
    Aggregates real study time broken down by day (last 7 days), week (last 4 weeks),
    and month (last 6 months).
    """
    today = datetime.utcnow().date()

    q_rows = db.query(
        models.QuestionAttempt.time_spent_sec,
        models.QuestionAttempt.created_at
    ).filter(
        models.QuestionAttempt.user_id == user_id,
        ~models.QuestionAttempt.question_id.like("test_q%")
    ).all()

    t_rows = db.query(
        models.TestAttempt.time_spent_seconds,
        models.TestAttempt.created_at
    ).filter(models.TestAttempt.user_id == user_id).all()

    # 1. By Day: Last 7 days
    by_day: List[Dict[str, Any]] = []
    for i in range(6, -1, -1):
        day_date = today - timedelta(days=i)
        day_start = datetime(day_date.year, day_date.month, day_date.day, 0, 0, 0)
        day_end = day_start + timedelta(days=1)

        sec = sum(r[0] or 0 for r in q_rows if r[1] and day_start <= r[1] < day_end)
        sec += sum(r[0] or 0 for r in t_rows if r[1] and day_start <= r[1] < day_end)
        q_count = sum(1 for r in q_rows if r[1] and day_start <= r[1] < day_end)

        by_day.append({
            "date": day_date.strftime("%d/%m"),
            "full_date": day_date.isoformat(),
            "day": VN_DAY_NAMES[day_date.weekday()],
            "minutes": round(sec / 60.0),
            "hours": round(sec / 3600.0, 2),
            "questions_count": q_count
        })

    # 2. By Week: Last 4 weeks
    by_week: List[Dict[str, Any]] = []
    for w in range(3, -1, -1):
        w_end_date = today - timedelta(days=w * 7)
        w_start_date = w_end_date - timedelta(days=6)
        w_start = datetime(w_start_date.year, w_start_date.month, w_start_date.day, 0, 0, 0)
        w_end = datetime(w_end_date.year, w_end_date.month, w_end_date.day, 23, 59, 59)

        sec = sum(r[0] or 0 for r in q_rows if r[1] and w_start <= r[1] <= w_end)
        sec += sum(r[0] or 0 for r in t_rows if r[1] and w_start <= r[1] <= w_end)
        q_count = sum(1 for r in q_rows if r[1] and w_start <= r[1] <= w_end)

        label = "Tuần này" if w == 0 else f"{w} tuần trước"
        by_week.append({
            "week_label": label,
            "period": f"{w_start_date.strftime('%d/%m')} - {w_end_date.strftime('%d/%m')}",
            "minutes": round(sec / 60.0),
            "hours": round(sec / 3600.0, 2),
            "questions_count": q_count
        })

    # 3. By Month: Last 6 months
    by_month: List[Dict[str, Any]] = []
    current_year = today.year
    current_month = today.month

    for m_back in range(5, -1, -1):
        m = current_month - m_back
        y = current_year
        while m <= 0:
            m += 12
            y -= 1

        sec = sum(r[0] or 0 for r in q_rows if r[1] and r[1].year == y and r[1].month == m)
        sec += sum(r[0] or 0 for r in t_rows if r[1] and r[1].year == y and r[1].month == m)
        q_count = sum(1 for r in q_rows if r[1] and r[1].year == y and r[1].month == m)

        by_month.append({
            "month_label": f"Tháng {m}/{y}",
            "month": m,
            "year": y,
            "hours": round(sec / 3600.0, 1),
            "questions_count": q_count
        })

    return {
        "by_day": by_day,
        "by_week": by_week,
        "by_month": by_month
    }

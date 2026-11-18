# -*- coding: utf-8 -*-
from datetime import datetime, date, timedelta, time
from typing import Dict, Any, Set, List
from sqlalchemy.orm import Session
from sqlalchemy import func
import models
from timezone_utils import to_vn_datetime, get_today_vn_date, get_vn_day_start_utc, VN_TZ_OFFSET

VN_DAY_NAMES = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"]

def utc_to_vn_date(dt: datetime) -> date:
    """
    Converts a naive or aware UTC datetime to Vietnam calendar date (UTC+7).
    Guarantees streak calculations respect local midnight in Vietnam.
    """
    if not dt:
        return None
    vn_dt = to_vn_datetime(dt)
    return vn_dt.date() if vn_dt else dt.date()

def get_user_active_dates(user_id: int, db: Session) -> Set[date]:
    """
    Returns the set of unique Vietnam calendar dates on which the user completed
    at least one real question attempt or test attempt.
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
            active_dates.add(utc_to_vn_date(d))

    # 2. Test Attempts
    t_dates = db.query(models.TestAttempt.created_at).filter(
        models.TestAttempt.user_id == user_id
    ).all()
    for (d,) in t_dates:
        if d:
            active_dates.add(utc_to_vn_date(d))

    # 3. Placement Attempts (exclude synthetic initial seed before user joined)
    p_dates = db.query(models.PlacementAttempt.created_at).filter(
        models.PlacementAttempt.user_id == user_id,
        models.PlacementAttempt.created_at >= '2026-09-27'
    ).all()
    for (d,) in p_dates:
        if d:
            active_dates.add(utc_to_vn_date(d))

    return active_dates

def calculate_user_streak(user_id: int, db: Session) -> Dict[str, Any]:
    """
    Calculates consecutive study day streak strictly from real database records using Vietnam timezone.
    If studied today: streak starts from today.
    If not studied today but studied yesterday: streak starts from yesterday (grace period for today).
    Otherwise: streak is 0.
    """
    active_dates = get_user_active_dates(user_id, db)
    today = get_today_vn_date()
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
    Computes total study hours and today's study minutes strictly from real attempts in VN time.
    Treo web / idle without submitting answers does NOT accumulate study minutes.
    """
    today_start_utc = get_vn_day_start_utc()

    # Real question attempts seconds
    q_attempts = db.query(
        models.QuestionAttempt.time_spent_sec,
        models.QuestionAttempt.created_at
    ).filter(
        models.QuestionAttempt.user_id == user_id,
        ~models.QuestionAttempt.question_id.like("test_q%")
    ).all()

    total_q_sec = sum(rec[0] or 0 for rec in q_attempts)
    today_q_sec = sum(rec[0] or 0 for rec in q_attempts if rec[1] and rec[1] >= today_start_utc)

    # Test attempts seconds
    t_attempts = db.query(
        models.TestAttempt.time_spent_seconds,
        models.TestAttempt.created_at
    ).filter(models.TestAttempt.user_id == user_id).all()

    total_t_sec = sum(rec[0] or 0 for rec in t_attempts)
    today_t_sec = sum(rec[0] or 0 for rec in t_attempts if rec[1] and rec[1] >= today_start_utc)

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
    and month (last 6 months), keyed to Vietnam midnight.
    """
    vn_today = get_today_vn_date()

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

    # 1. By Day: Last 7 days in VN time
    by_day: List[Dict[str, Any]] = []
    for i in range(6, -1, -1):
        day_date = vn_today - timedelta(days=i)
        day_start_utc = datetime.combine(day_date, time.min) - VN_TZ_OFFSET
        day_end_utc = day_start_utc + timedelta(days=1)

        sec = sum(r[0] or 0 for r in q_rows if r[1] and day_start_utc <= r[1] < day_end_utc)
        sec += sum(r[0] or 0 for r in t_rows if r[1] and day_start_utc <= r[1] < day_end_utc)
        q_count = sum(1 for r in q_rows if r[1] and day_start_utc <= r[1] < day_end_utc)

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
    for w in range(4):
        w_end_date = vn_today - timedelta(days=w * 7)
        w_start_date = w_end_date - timedelta(days=6)
        w_start_utc = datetime.combine(w_start_date, time.min) - VN_TZ_OFFSET
        w_end_utc = datetime.combine(w_end_date, time.max) - VN_TZ_OFFSET

        sec = sum(r[0] or 0 for r in q_rows if r[1] and w_start_utc <= r[1] <= w_end_utc)
        sec += sum(r[0] or 0 for r in t_rows if r[1] and w_start_utc <= r[1] <= w_end_utc)
        q_count = sum(1 for r in q_rows if r[1] and w_start_utc <= r[1] <= w_end_utc)

        label = "Tuần này" if w == 0 else f"{w} tuần trước"
        by_week.append({
            "week_label": label,
            "range": f"{w_start_date.strftime('%d/%m')} - {w_end_date.strftime('%d/%m')}",
            "minutes": round(sec / 60.0),
            "hours": round(sec / 3600.0, 1),
            "questions_count": q_count
        })

    # 3. By Month: Last 6 months
    by_month: List[Dict[str, Any]] = []
    cur_year = vn_today.year
    cur_month = vn_today.month
    for m in range(6):
        month_idx = cur_month - m
        year_idx = cur_year
        while month_idx <= 0:
            month_idx += 12
            year_idx -= 1

        m_start_date = date(year_idx, month_idx, 1)
        if month_idx == 12:
            m_end_date = date(year_idx + 1, 1, 1) - timedelta(days=1)
        else:
            m_end_date = date(year_idx, month_idx + 1, 1) - timedelta(days=1)

        m_start_utc = datetime.combine(m_start_date, time.min) - VN_TZ_OFFSET
        m_end_utc = datetime.combine(m_end_date, time.max) - VN_TZ_OFFSET

        sec = sum(r[0] or 0 for r in q_rows if r[1] and m_start_utc <= r[1] <= m_end_utc)
        sec += sum(r[0] or 0 for r in t_rows if r[1] and m_start_utc <= r[1] <= m_end_utc)

        by_month.append({
            "month_label": f"T{month_idx}/{str(year_idx)[2:]}",
            "minutes": round(sec / 60.0),
            "hours": round(sec / 3600.0, 1)
        })

    return {
        "by_day": by_day,
        "by_week": by_week,
        "by_month": by_month
    }

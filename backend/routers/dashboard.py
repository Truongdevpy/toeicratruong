# -*- coding: utf-8 -*-
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import json
from database import get_db
import models
from auth import get_current_user
from streak_service import calculate_user_streak, calculate_study_hours

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/overview")
def get_dashboard_overview(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = user.profile
    path = user.learning_path

    current_score = profile.current_score if profile else 425
    target_score = profile.target_score if profile else 650
    daily_minutes = profile.daily_minutes if profile else 45

    # 1. Real streak and study time calculation from DB
    streak_info = calculate_user_streak(user.id, db)
    study_info = calculate_study_hours(user.id, db)

    today_completed = study_info["today_minutes"]
    total_study_hours = study_info["total_study_hours"]

    score_progress_pct = min(100, int((current_score / max(1, target_score)) * 100))
    daily_progress_pct = min(100, int((today_completed / max(1, daily_minutes)) * 100))
    minutes_remaining = max(0, daily_minutes - today_completed)

    # Active node to continue learning
    active_node = None
    if path:
        active_node = db.query(models.LearningNode).filter(
            models.LearningNode.path_id == path.id,
            models.LearningNode.status == "in_progress"
        ).first()

    continue_learning = {
        "title": active_node.title if active_node else "Vocabulary 500 (Văn phòng & Công sở)",
        "skill": active_node.skill if active_node else "Vocabulary",
        "progress_pct": active_node.progress_pct if active_node else 65,
        "description": active_node.description if active_node else "Luyện tập 15 từ vựng công sở tiếp theo.",
        "link": f"/practice/{active_node.skill.lower()}" if active_node and active_node.skill.lower() in ["listening", "reading", "grammar", "vocabulary"] else "/practice/vocabulary"
    }

    # 2. Fetch real question attempts for skill accuracy
    q_attempts = db.query(models.QuestionAttempt).filter(models.QuestionAttempt.user_id == user.id).all()
    total_attempts = len(q_attempts)
    correct_attempts = sum(1 for q in q_attempts if q.is_correct)

    def calc_skill_acc(attempts_list):
        if not attempts_list:
            return 0
        return round((sum(1 for a in attempts_list if a.is_correct) / len(attempts_list)) * 100)

    listening_attempts = [q for q in q_attempts if (q.part and q.part in [1, 2, 3, 4]) or q.section == 'listening']
    reading_attempts = [q for q in q_attempts if (q.part and q.part in [5, 6, 7]) or q.section == 'reading']
    grammar_attempts = [q for q in q_attempts if (q.part == 5) or ('grammar' in str(q.topic).lower())]
    vocab_attempts = [q for q in q_attempts if 'vocab' in str(q.topic).lower()]

    skill_overview = {
        "listening": calc_skill_acc(listening_attempts) if listening_attempts else 0,
        "reading": calc_skill_acc(reading_attempts) if reading_attempts else 0,
        "grammar": calc_skill_acc(grammar_attempts) if grammar_attempts else 0,
        "vocabulary": calc_skill_acc(vocab_attempts) if vocab_attempts else 0
    }

    weak_areas = json.loads(profile.weak_areas) if profile and profile.weak_areas else [
        "Listening Part 3 (Hội thoại có biểu đồ)",
        "Word Form (Hậu tố từ loại danh từ -al, -ive)",
        "Reading Part 7 (Đoạn kép & suy luận)"
    ]

    strengths = json.loads(profile.strengths) if profile and profile.strengths else [
        "Listening Part 1 (Mô tả tranh trực quan)",
        "Reading Part 5 (Nhận diện thì cơ bản)"
    ]

    # Real flashcards due
    flashcards_due = db.query(models.UserFlashcard).filter(
        models.UserFlashcard.user_id == user.id,
        models.UserFlashcard.next_review_at <= datetime.utcnow()
    ).count()

    overall_acc = round((correct_attempts / total_attempts) * 100, 1) if total_attempts > 0 else 0.0

    return {
        "user": {
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
            "role": user.role
        },
        "greeting": f"Chào {user.full_name.split()[-1] if user.full_name else 'bạn'} 👋",
        "subtitle": "Hôm nay bạn muốn học gì?",
        "current_goal": {
            "current_score": current_score,
            "target_score": target_score,
            "progress_pct": score_progress_pct,
            "cefr_level": profile.cefr_level if profile else "B1"
        },
        "continue_learning": continue_learning,
        "daily_goal": {
            "completed_minutes": today_completed,
            "target_minutes": daily_minutes,
            "remaining_minutes": minutes_remaining,
            "progress_pct": daily_progress_pct
        },
        "streak": {
            "days": streak_info["streak_days"],
            "active_today": streak_info["active_today"]
        },
        "skill_overview": skill_overview,
        "weak_areas": weak_areas,
        "strengths": strengths,
        "quick_stats": {
            "total_questions_solved": total_attempts,
            "overall_accuracy_pct": overall_acc,
            "flashcards_due": flashcards_due,
            "study_hours": total_study_hours
        }
    }

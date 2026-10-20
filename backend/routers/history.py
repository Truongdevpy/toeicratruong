import json
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from database import get_db
import models
from auth import get_current_user_optional, get_current_user

router = APIRouter(tags=["history"])

@router.get("/tests")
def get_test_history(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    effective_uid = user.id if user else 1
    query = db.query(models.TestAttempt).filter(models.TestAttempt.user_id == effective_uid)

    total = query.count()
    items = query.order_by(desc(models.TestAttempt.created_at)).offset(offset).limit(limit).all()

    return {
        "total": total,
        "items": [
            {
                "id": a.id,
                "test_id": a.test_id,
                "test_title": a.test_title,
                "test_type": a.test_type,
                "mode": a.mode,
                "target_part": a.target_part,
                "total_score": a.total_score,
                "listening_score": a.listening_score,
                "reading_score": a.reading_score,
                "listening_correct": a.listening_correct,
                "reading_correct": a.reading_correct,
                "total_correct": a.total_correct,
                "total_questions": a.total_questions,
                "accuracy": a.accuracy,
                "time_spent_seconds": a.time_spent_seconds,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in items
        ]
    }

@router.get("/tests/{attempt_id}")
def get_test_attempt_detail(
    attempt_id: int,
    user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    attempt = db.query(models.TestAttempt).filter(models.TestAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài thi đã làm")

    effective_uid = user.id if user else 1
    if attempt.user_id and attempt.user_id != effective_uid:
        raise HTTPException(status_code=403, detail="Bạn không có quyền xem bài làm này")

    try:
        review_answers = json.loads(attempt.review_json) if attempt.review_json else []
    except Exception:
        review_answers = []

    try:
        answers = json.loads(attempt.answers_json) if attempt.answers_json else {}
    except Exception:
        answers = {}

    return {
        "id": attempt.id,
        "test_id": attempt.test_id,
        "test_title": attempt.test_title,
        "test_type": attempt.test_type,
        "mode": attempt.mode,
        "target_part": attempt.target_part,
        "total_score": attempt.total_score,
        "listening_score": attempt.listening_score,
        "reading_score": attempt.reading_score,
        "listening_correct": attempt.listening_correct,
        "reading_correct": attempt.reading_correct,
        "total_correct": attempt.total_correct,
        "total_questions": attempt.total_questions,
        "accuracy": attempt.accuracy,
        "time_spent_seconds": attempt.time_spent_seconds,
        "time_spent_minutes": round(attempt.time_spent_seconds / 60, 1),
        "review_answers": review_answers,
        "answers": answers,
        "created_at": attempt.created_at.isoformat() if attempt.created_at else None
    }

@router.delete("/tests/{attempt_id}")
def delete_test_attempt(
    attempt_id: int,
    user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    attempt = db.query(models.TestAttempt).filter(models.TestAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài làm")
    effective_uid = user.id if user else 1
    if attempt.user_id and attempt.user_id != effective_uid:
        raise HTTPException(status_code=403, detail="Không có quyền xóa bài làm này")

    db.delete(attempt)
    db.commit()
    return {"status": "success", "message": "Đã xóa lịch sử bài thi"}

@router.get("/questions")
def get_question_history(
    part: Optional[int] = Query(None),
    is_correct: Optional[bool] = Query(None),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    effective_uid = user.id if user else 1
    query = db.query(models.QuestionAttempt).filter(models.QuestionAttempt.user_id == effective_uid)
    if part is not None:
        query = query.filter(models.QuestionAttempt.part == part)
    if is_correct is not None:
        query = query.filter(models.QuestionAttempt.is_correct == is_correct)

    total = query.count()
    items = query.order_by(desc(models.QuestionAttempt.created_at)).offset(offset).limit(limit).all()

    return {
        "total": total,
        "items": [
            {
                "id": q.id,
                "question_id": q.question_id,
                "test_id": q.test_id,
                "question_number": q.question_number,
                "part": q.part,
                "section": q.section,
                "topic": q.topic,
                "question_text": q.question_text,
                "selected_option": q.selected_option,
                "correct_option": q.correct_option,
                "is_correct": q.is_correct,
                "time_spent_sec": q.time_spent_sec,
                "created_at": q.created_at.isoformat() if q.created_at else None
            }
            for q in items
        ]
    }

@router.post("/record-question")
def record_question_attempt(
    payload: dict,
    user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    q_id = str(payload.get("question_id") or "")
    if not q_id:
        raise HTTPException(status_code=400, detail="Thiếu question_id")

    attempt = models.QuestionAttempt(
        user_id=user.id if user else 1,
        question_id=q_id,
        test_id=str(payload.get("test_id") or ""),
        question_number=payload.get("question_number"),
        part=int(payload.get("part") or 1),
        section=str(payload.get("section") or ("listening" if int(payload.get("part") or 1) <= 4 else "reading")),
        topic=str(payload.get("topic") or ""),
        question_text=str(payload.get("question_text") or ""),
        selected_option=str(payload.get("selected_option") or "").strip().upper(),
        correct_option=str(payload.get("correct_option") or "").strip().upper(),
        is_correct=bool(payload.get("is_correct")),
        time_spent_sec=int(payload.get("time_spent_sec") or 30),
        created_at=datetime.utcnow()
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return {"status": "success", "id": attempt.id, "is_correct": attempt.is_correct}

@router.get("/correct-questions")
def get_correct_question_ids(
    user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    effective_uid = user.id if user else 1
    query = db.query(models.QuestionAttempt.question_id).filter(
        models.QuestionAttempt.is_correct == True,
        models.QuestionAttempt.user_id == effective_uid
    )

    rows = query.distinct().all()
    return {"correct_question_ids": [r[0] for r in rows]}

@router.get("/summary")
def get_history_summary(
    user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    effective_uid = user.id if user else 1
    t_query = db.query(models.TestAttempt).filter(models.TestAttempt.user_id == effective_uid)

    total_tests = t_query.count()
    best_score_record = t_query.order_by(desc(models.TestAttempt.total_score)).first()
    recent_test_record = t_query.order_by(desc(models.TestAttempt.created_at)).first()

    q_query = db.query(models.QuestionAttempt).filter(models.QuestionAttempt.user_id == effective_uid)

    total_questions = q_query.count()
    correct_questions = q_query.filter(models.QuestionAttempt.is_correct == True).count()
    accuracy = round((correct_questions / max(1, total_questions)) * 100, 1) if total_questions > 0 else 0.0

    return {
        "total_tests": total_tests,
        "best_score": best_score_record.total_score if best_score_record else 0,
        "recent_score": recent_test_record.total_score if recent_test_record else 0,
        "recent_test_title": recent_test_record.test_title if recent_test_record else "",
        "total_questions": total_questions,
        "correct_questions": correct_questions,
        "accuracy": accuracy
    }

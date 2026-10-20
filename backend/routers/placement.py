from ai_placement import generate_ai_placement_diagnosis
from media_resolver import resolve_media_url
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
import json
from typing import Optional
from database import get_db
import models
import schemas
from auth import get_current_user
from personalization_engine import analyze_diagnostic_results, recalculate_adaptive_weights

router = APIRouter(prefix="/api/placement-test", tags=["placement"])

@router.get("/questions")
def get_placement_questions(
    test_type: str = Query("full", description="full or custom"),
    db: Session = Depends(get_db)
):
    """
    Returns a balanced set of diagnostic questions across Listening (Parts 1-4)
    and Reading (Parts 5-7).
    """
    selected_questions = []

    part_quotas = {
        1: 4,
        2: 5,
        3: 4,
        4: 3,
        5: 8,
        6: 3,
        7: 4
    }

    for part_num, quota in part_quotas.items():
        qs = db.query(models.CachedQuestion).filter(models.CachedQuestion.part == part_num).limit(quota).all()
        for q in qs:
            passage = None
            if q.passage_id:
                passage_obj = db.query(models.CachedPassage).filter(models.CachedPassage.id == q.passage_id).first()
                if passage_obj:
                    passage = passage_obj.passage_text
            elif q.passage_text:
                passage = q.passage_text

            selected_questions.append({
                "id": q.id,
                "part": q.part,
                "section": q.section,
                "question_number": len(selected_questions) + 1,
                "question_text": q.question_text,
                "option_a": q.option_a,
                "option_b": q.option_b,
                "option_c": q.option_c,
                "option_d": q.option_d,
                "audio_url": resolve_media_url(q.audio_url, media_type="audio"),
                "image_url": resolve_media_url(q.image_url, media_type="image"),
                "passage_text": passage,
                "difficulty_level": q.difficulty_level
            })

    return {
        "test_type": test_type,
        "total_questions": len(selected_questions),
        "duration_minutes": 25,
        "questions": selected_questions
    }

@router.post("/submit")
def submit_placement_test(
    data: schemas.PlacementSubmitRequest,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    answers = data.answers
    attempts_by_part = {p: {"correct": 0, "total": 0} for p in range(1, 8)}
    question_ids = list(answers.keys())
    
    questions = db.query(models.CachedQuestion).filter(models.CachedQuestion.id.in_(question_ids)).all()
    q_map = {q.id: q for q in questions}

    recent_attempts = []
    incorrect_questions = []
    for q_id, chosen in answers.items():
        q = q_map.get(q_id)
        if not q:
            continue
        is_correct = (chosen.strip().upper() == (q.correct_answer or "A").strip().upper())
        part_num = q.part or 1
        attempts_by_part[part_num]["total"] += 1
        if is_correct:
            attempts_by_part[part_num]["correct"] += 1
        else:
            incorrect_questions.append({
                "part": part_num,
                "text": q.question_text or "",
                "selected": chosen,
                "correct": q.correct_answer or "A"
            })

        attempt_record = models.QuestionAttempt(
            user_id=user.id,
            question_id=q.id,
            part=q.part,
            section=q.section,
            selected_option=chosen,
            correct_option=q.correct_answer,
            is_correct=is_correct,
            time_spent_sec=30
        )
        db.add(attempt_record)
        recent_attempts.append(attempt_record)

    target_score = user.profile.target_score if user.profile else 650
    analysis = analyze_diagnostic_results(attempts_by_part, target_score=target_score)

    # Invoke Gemini AI Diagnostic & Profiler Engine
    ai_diag = generate_ai_placement_diagnosis(
        user_name=user.full_name or "Học viên",
        target_score=target_score,
        estimated_score=analysis["estimated_score"],
        listening_score=analysis["listening_score"],
        reading_score=analysis["reading_score"],
        attempts_by_part=attempts_by_part,
        incorrect_questions=incorrect_questions
    )

    profile = user.profile
    if not profile:
        profile = models.UserProfile(user_id=user.id)
        db.add(profile)

    profile.current_score = analysis["estimated_score"]
    profile.ai_memory_notes = ai_diag.get("ai_memory_notes", "")
    
    if ai_diag.get("root_cause_weaknesses"):
        profile.weak_areas = json.dumps([w.get("weakness_title", str(w)) for w in ai_diag["root_cause_weaknesses"]], ensure_ascii=False)
        analysis["error_patterns"] = [
            {
                "category": w.get("weakness_title", "Bẫy đề thi"),
                "severity": w.get("severity", "Cao"),
                "description": w.get("evidence", ""),
                "recommendation": w.get("remedy", "")
            }
            for w in ai_diag["root_cause_weaknesses"]
        ]
    else:
        profile.weak_areas = json.dumps(analysis["weak_areas"], ensure_ascii=False)

    if ai_diag.get("diagnostic_summary"):
        analysis["ai_summary"] = ai_diag["diagnostic_summary"]
    analysis["ai_memory_notes"] = profile.ai_memory_notes
    analysis["ai_powered"] = ai_diag.get("ai_powered", False)

    profile.strengths = json.dumps(analysis["strengths"], ensure_ascii=False)
    profile.placement_completed = True

    attempt = models.PlacementAttempt(
        user_id=user.id,
        test_type=data.test_type,
        estimated_score=analysis["estimated_score"],
        listening_score=analysis["listening_score"],
        reading_score=analysis["reading_score"],
        listening_pct=analysis["skills_pct"]["listening"],
        reading_pct=analysis["skills_pct"]["reading"],
        grammar_pct=analysis["skills_pct"]["grammar"],
        vocabulary_pct=analysis["skills_pct"]["vocabulary"],
        speaking_pct=analysis["skills_pct"]["speaking"],
        writing_pct=analysis["skills_pct"]["writing"],
        strengths_json=json.dumps(analysis["strengths"]),
        weak_areas_json=json.dumps(analysis["weak_areas"]),
        detailed_analysis_json=json.dumps(analysis["part_analysis"])
    )
    db.add(attempt)

    adaptation = recalculate_adaptive_weights(recent_attempts)
    path = user.learning_path
    if path:
        path.current_score = analysis["estimated_score"]
        path.adaptive_weights = json.dumps(adaptation["weights"])
        path.last_adaptation_reason = adaptation["reason"]

    db.add(models.Notification(
        user_id=user.id,
        title="Hoàn thành Đánh giá trình độ!",
        message=f"Điểm TOEIC ước tính của bạn là {analysis['estimated_score']}. Lộ trình học tập đã được đồng bộ.",
        type="path"
    ))

    db.commit()

    return {
        "status": "success",
        "result": analysis,
        "next_step": "/placement-test/result"
    }

@router.get("/latest")
def get_latest_placement_result(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    attempt = db.query(models.PlacementAttempt).filter(
        models.PlacementAttempt.user_id == user.id
    ).order_by(models.PlacementAttempt.created_at.desc()).first()

    if not attempt:
        default_data = {
            1: {"correct": 3, "total": 4},
            2: {"correct": 3, "total": 5},
            3: {"correct": 1, "total": 4},
            4: {"correct": 1, "total": 3},
            5: {"correct": 6, "total": 8},
            6: {"correct": 2, "total": 3},
            7: {"correct": 2, "total": 4}
        }
        return analyze_diagnostic_results(default_data, target_score=user.profile.target_score if user.profile else 650)

    strengths = json.loads(attempt.strengths_json) if attempt.strengths_json else []
    weak_areas = json.loads(attempt.weak_areas_json) if attempt.weak_areas_json else []
    part_analysis = json.loads(attempt.detailed_analysis_json) if attempt.detailed_analysis_json else {}

    return {
        "estimated_score": attempt.estimated_score,
        "listening_score": attempt.listening_score,
        "reading_score": attempt.reading_score,
        "skills_pct": {
            "listening": attempt.listening_pct,
            "reading": attempt.reading_pct,
            "grammar": attempt.grammar_pct,
            "vocabulary": attempt.vocabulary_pct,
            "speaking": attempt.speaking_pct,
            "writing": attempt.writing_pct
        },
        "part_analysis": part_analysis,
        "strengths": strengths,
        "weak_areas": weak_areas,
        "error_patterns": [
            {
                "category": "Nghe bẫy đồng âm (Distractors)",
                "severity": "Cao",
                "description": "Thường bị lừa bởi các từ đồng âm hoặc âm gần giống trong Part 2 và Part 3.",
                "recommendation": "Luyện nghe bắt từ khóa (Keywords) thay vì cố dịch từng từ theo thứ tự."
            },
            {
                "category": "Ngữ pháp Word Form (Từ loại)",
                "severity": "Trung bình",
                "description": "Gặp khó khăn khi xác định nhanh hậu tố danh từ ghép và vị trí trạng từ trong câu phức Part 5.",
                "recommendation": "Học nhóm hậu tố đặc biệt (-al, -ive, -ment, -ance) và làm 30 bài tập chuyên sâu."
            },
            {
                "category": "Kỹ năng Skimming & Scanning Part 7",
                "severity": "Cao",
                "description": "Đọc quá kỹ từng dòng trong đoạn đơn, dẫn tới thiếu thời gian làm các đoạn văn kép.",
                "recommendation": "Áp dụng kỹ thuật đọc câu hỏi trước để định vị từ khóa trong bài đọc."
            }
        ],
        "ai_summary": (
            f"Trình độ hiện tại của bạn đạt TOEIC {attempt.estimated_score} "
            f"(Listening: {attempt.listening_score}, Reading: {attempt.reading_score}). "
            f"Điểm mạnh nổi bật: {strengths[0] if strengths else 'Part 1'}. "
            f"Điểm yếu cần tập trung cải thiện: {weak_areas[0] if weak_areas else 'Part 3 và Word Form'}."
        )
    }

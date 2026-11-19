from ai_placement import generate_ai_placement_diagnosis
from media_resolver import resolve_media_url
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
import json
import re
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
    skills: Optional[str] = Query(None, description="Comma-separated skills: Listening,Reading,Grammar,Vocabulary"),
    db: Session = Depends(get_db)
):
    selected_questions = []

    active_skills = set()
    if test_type == "custom" and skills:
        active_skills = {s.strip().lower() for s in skills.split(",") if s.strip()}
    else:
        active_skills = {"listening", "reading", "grammar", "vocabulary"}

    include_listening = "listening" in active_skills
    include_reading = "reading" in active_skills
    include_grammar = "grammar" in active_skills
    include_vocab = "vocabulary" in active_skills

    # Listening Parts: 1, 2, 3, 4
    if include_listening:
        # 1. Part 1: 4 individual questions
        p1_qs = db.query(models.CachedQuestion).filter(models.CachedQuestion.part == 1).limit(4).all()
        for q in p1_qs:
            selected_questions.append((q, None))

        # 2. Part 2: 5 individual questions
        p2_qs = db.query(models.CachedQuestion).filter(models.CachedQuestion.part == 2).limit(5).all()
        for q in p2_qs:
            selected_questions.append((q, None))

        # 3. Part 3: 1 cohesive passage group of 3 questions
        p3_group = (
            db.query(models.CachedQuestion.passage_id)
            .filter(models.CachedQuestion.part == 3, models.CachedQuestion.passage_id.isnot(None))
            .group_by(models.CachedQuestion.passage_id)
            .having(func.count() == 3)
            .first()
        )
        if p3_group and p3_group[0]:
            qs = (
                db.query(models.CachedQuestion)
                .filter(models.CachedQuestion.passage_id == p3_group[0])
                .order_by(models.CachedQuestion.question_number)
                .all()
            )
            for q in qs:
                selected_questions.append((q, None))
        else:
            qs = db.query(models.CachedQuestion).filter(models.CachedQuestion.part == 3).limit(3).all()
            for q in qs:
                selected_questions.append((q, None))

        # 4. Part 4: 1 cohesive passage group of 3 questions
        p4_group = (
            db.query(models.CachedQuestion.passage_id)
            .filter(models.CachedQuestion.part == 4, models.CachedQuestion.passage_id.isnot(None))
            .group_by(models.CachedQuestion.passage_id)
            .having(func.count() == 3)
            .first()
        )
        if p4_group and p4_group[0]:
            qs = (
                db.query(models.CachedQuestion)
                .filter(models.CachedQuestion.passage_id == p4_group[0])
                .order_by(models.CachedQuestion.question_number)
                .all()
            )
            for q in qs:
                selected_questions.append((q, None))
        else:
            qs = db.query(models.CachedQuestion).filter(models.CachedQuestion.part == 4).limit(3).all()
            for q in qs:
                selected_questions.append((q, None))

    # Grammar / Vocab (Part 5)
    p5_count = 0
    if include_grammar and include_vocab:
        p5_count = 8
    elif include_grammar or include_vocab:
        p5_count = 5

    if p5_count > 0:
        p5_qs = db.query(models.CachedQuestion).filter(models.CachedQuestion.part == 5).limit(p5_count).all()
        for q in p5_qs:
            selected_questions.append((q, None))

    # Reading Passages (Part 6 & Part 7)
    if include_reading:
        # 6. Part 6: 1 cohesive passage group of 4 questions
        p6_group = (
            db.query(models.CachedQuestion.passage_id)
            .filter(models.CachedQuestion.part == 6, models.CachedQuestion.passage_id.isnot(None))
            .group_by(models.CachedQuestion.passage_id)
            .having(func.count() == 4)
            .first()
        )
        if p6_group and p6_group[0]:
            qs = (
                db.query(models.CachedQuestion)
                .filter(models.CachedQuestion.passage_id == p6_group[0])
                .order_by(models.CachedQuestion.question_number)
                .all()
            )
            p_obj = db.query(models.CachedPassage).filter(models.CachedPassage.id == p6_group[0]).first()
            passage_text = p_obj.passage_text if p_obj else None
            for q in qs:
                selected_questions.append((q, passage_text))
        else:
            qs = db.query(models.CachedQuestion).filter(models.CachedQuestion.part == 6).limit(4).all()
            for q in qs:
                selected_questions.append((q, None))

        # 7. Part 7: 1 cohesive passage group of 4 questions
        p7_group = (
            db.query(models.CachedQuestion.passage_id)
            .filter(models.CachedQuestion.part == 7, models.CachedQuestion.passage_id.isnot(None))
            .group_by(models.CachedQuestion.passage_id)
            .having(func.count() == 4)
            .first()
        )
        if p7_group and p7_group[0]:
            qs = (
                db.query(models.CachedQuestion)
                .filter(models.CachedQuestion.passage_id == p7_group[0])
                .order_by(models.CachedQuestion.question_number)
                .all()
            )
            p_obj = db.query(models.CachedPassage).filter(models.CachedPassage.id == p7_group[0]).first()
            passage_text = p_obj.passage_text if p_obj else None
            for q in qs:
                selected_questions.append((q, passage_text))
        else:
            qs = db.query(models.CachedQuestion).filter(models.CachedQuestion.part == 7).limit(4).all()
            for q in qs:
                selected_questions.append((q, None))

    formatted_questions = []
    for idx, (q, override_passage) in enumerate(selected_questions):
        passage = override_passage
        if not passage and q.part in (6, 7):
            if q.passage_id:
                passage_obj = db.query(models.CachedPassage).filter(models.CachedPassage.id == q.passage_id).first()
                if passage_obj:
                    passage = passage_obj.passage_text
            elif q.passage_text:
                passage = q.passage_text

        # Clean question text for Part 6 so it displays standard fill-the-blank prompt instead of repeating 'Questions 135-138 refer to...'
        q_text = q.question_text or ""
        if q.part == 6 and re.search(r'Questions?\s*\d+-\d+\s*refer\s*to', q_text, re.IGNORECASE):
            q_text = f"Chọn từ hoặc câu thích hợp nhất để điền vào vị trí trống [{idx + 1}]."

        formatted_questions.append({
            "id": q.id,
            "part": q.part,
            "section": q.section,
            "question_number": idx + 1,
            "original_number": q.question_number,
            "passage_id": q.passage_id,
            "question_text": q_text,
            "option_a": q.option_a,
            "option_b": q.option_b,
            "option_c": q.option_c,
            "option_d": q.option_d,
            "audio_url": resolve_media_url(q.audio_url, media_type="audio"),
            "image_url": resolve_media_url(q.image_url, media_type="image"),
            "passage_text": passage if q.part in (6, 7) else None,
            "difficulty_level": q.difficulty_level
        })

    total_q = len(formatted_questions)
    calc_duration = max(10, min(60, int(total_q * 0.8) + 1))

    return {
        "test_type": test_type,
        "total_questions": total_q,
        "duration_minutes": calc_duration if test_type == "custom" else 25,
        "questions": formatted_questions
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
        strengths_json=json.dumps(analysis["strengths"], ensure_ascii=False),
        weak_areas_json=json.dumps(analysis["weak_areas"], ensure_ascii=False),
        detailed_analysis_json=json.dumps(analysis["part_analysis"], ensure_ascii=False),
        error_patterns_json=json.dumps(analysis.get("error_patterns", []), ensure_ascii=False),
        ai_summary=analysis.get("ai_summary", "")
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
    error_patterns = json.loads(attempt.error_patterns_json) if getattr(attempt, 'error_patterns_json', None) else []
    ai_summary = getattr(attempt, 'ai_summary', None) or (
        f"Trình độ hiện tại của bạn đạt TOEIC {attempt.estimated_score} "
        f"(Listening: {attempt.listening_score}, Reading: {attempt.reading_score}). "
        + (f"Điểm mạnh nổi bật: {strengths[0]}. " if strengths else "Chưa ghi nhận điểm mạnh nổi bật do chưa có câu trả lời đúng. ")
        + f"Điểm yếu cần tập trung: {weak_areas[0] if weak_areas else 'Củng cố nền tảng ngữ pháp & từ vựng cốt lõi'}."
    )

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
        "error_patterns": error_patterns,
        "ai_summary": ai_summary
    }

# -*- coding: utf-8 -*-
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

import models

logger = logging.getLogger(__name__)

STANDARD_TIME_PER_PART = {
    1: 30,  # ~30s per question (listening audio + response)
    2: 25,  # ~25s per question
    3: 35,  # ~35s per question
    4: 35,  # ~35s per question
    5: 30,  # ~30s per question (target in real TOEIC Reading)
    6: 45,  # ~45s per question
    7: 60,  # ~60s per question
}

def parse_scope(scope: str) -> Dict[str, Any]:
    """
    scope can be: 'overall', 'listening', 'reading', 'part1'..'part7', 'grammar'
    """
    clean = (scope or "overall").strip().lower()
    if clean.startswith("part"):
        try:
            part_no = int(clean.replace("part", ""))
            return {"type": "part", "parts": [part_no], "name": f"Part {part_no}"}
        except ValueError:
            pass
    if clean in ["listening", "nghe"]:
        return {"type": "section", "parts": [1, 2, 3, 4], "name": "Kỹ năng Nghe (Listening)"}
    if clean in ["reading", "doc", "đọc"]:
        return {"type": "section", "parts": [5, 6, 7], "name": "Kỹ năng Đọc (Reading)"}
    if clean == "grammar":
        return {"type": "part", "parts": [5], "name": "Ngữ pháp (Part 5)"}
    return {"type": "overall", "parts": [1, 2, 3, 4, 5, 6, 7], "name": "Toàn bộ kỹ năng TOEIC"}

def buildStats(user_id: int, scope: str, time_range: str, db: Session) -> Dict[str, Any]:
    """
    Computes all verifiable statistics strictly by code.
    AI is not allowed to compute or estimate any numbers.
    """
    parsed_scope = parse_scope(scope)
    now = datetime.utcnow()

    # Determine date threshold for time_range
    since_date = None
    if time_range == "7d":
        since_date = now - timedelta(days=7)
    elif time_range == "30d":
        since_date = now - timedelta(days=30)

    query = db.query(models.QuestionAttempt).filter(models.QuestionAttempt.user_id == user_id)
    if parsed_scope["parts"] and len(parsed_scope["parts"]) < 7:
        query = query.filter(models.QuestionAttempt.part.in_(parsed_scope["parts"]))
    if since_date:
        query = query.filter(models.QuestionAttempt.created_at >= since_date)

    attempts = query.order_by(models.QuestionAttempt.created_at.asc()).all()
    total_count = len(attempts)
    correct_count = sum(1 for a in attempts if a.is_correct)
    wrong_count = total_count - correct_count
    accuracy = round((correct_count / total_count * 100), 1) if total_count > 0 else 0.0

    # Determine data confidence tier
    if total_count < 15:
        data_confidence = "insufficient"
    elif total_count < 50:
        data_confidence = "low"
    elif total_count < 100:
        data_confidence = "medium"
    else:
        data_confidence = "high"

    # Part breakdown
    part_stats: Dict[int, Dict[str, Any]] = {}
    for a in attempts:
        p = a.part or 1
        if p not in part_stats:
            part_stats[p] = {"part": p, "total": 0, "correct": 0}
        part_stats[p]["total"] += 1
        if a.is_correct:
            part_stats[p]["correct"] += 1

    part_breakdown = []
    for p, pdata in sorted(part_stats.items()):
        acc = round((pdata["correct"] / pdata["total"] * 100), 1) if pdata["total"] > 0 else 0.0
        part_breakdown.append({
            "part": p,
            "part_name": f"Part {p}",
            "total": pdata["total"],
            "correct": pdata["correct"],
            "accuracy": acc
        })

    # Topic / Question Type breakdown
    topic_map: Dict[str, Dict[str, Any]] = {}
    for a in attempts:
        t = (a.topic or "").strip()
        if not t:
            t = f"Part {a.part}"
        if t not in topic_map:
            topic_map[t] = {"topic": t, "part": a.part, "total": 0, "correct": 0}
        topic_map[t]["total"] += 1
        if a.is_correct:
            topic_map[t]["correct"] += 1

    verified_strengths = []
    verified_weaknesses = []
    need_more_data_topics = []

    for t, tdata in topic_map.items():
        t_tot = tdata["total"]
        t_cor = tdata["correct"]
        t_acc = round((t_cor / t_tot * 100), 1) if t_tot > 0 else 0.0
        entry = {
            "topic": t,
            "part": tdata["part"],
            "total": t_tot,
            "correct": t_cor,
            "accuracy": t_acc,
            "evidence": f"{t_cor}/{t_tot} câu đúng ({t_acc}%)"
        }

        # Threshold rules:
        # Under 15 total questions overall: do not classify any topic as strength/weakness
        if total_count < 15 or t_tot < 5:
            need_more_data_topics.append({
                **entry,
                "reason": f"Chỉ mới làm {t_tot} câu (yêu cầu tối thiểu 5 câu và toàn bài đạt ít nhất 15 câu để kết luận)."
            })
        else:
            if t_acc >= 75.0:
                verified_strengths.append(entry)
            elif t_acc <= 55.0:
                verified_weaknesses.append(entry)
            elif t_acc < (accuracy - 15.0):
                # Significantly below overall accuracy
                verified_weaknesses.append(entry)

    # Sort weaknesses by total attempts (impact) and accuracy ascending
    verified_weaknesses.sort(key=lambda x: (x["accuracy"], -x["total"]))
    verified_strengths.sort(key=lambda x: (-x["accuracy"], -x["total"]))

    # Timing analysis
    time_list = [a.time_spent_sec for a in attempts if a.time_spent_sec and a.time_spent_sec > 0]
    avg_time_sec = round(sum(time_list) / len(time_list), 1) if time_list else 30.0

    # Suspicious rush (< 8 seconds) and overtime (> 2.5x standard)
    too_fast_count = 0
    too_slow_count = 0
    for a in attempts:
        std = STANDARD_TIME_PER_PART.get(a.part, 30)
        t = a.time_spent_sec or 30
        if t < 8:
            too_fast_count += 1
        elif t > (std * 2.5):
            too_slow_count += 1

    # Option bias analysis (e.g. favoring 'C' or 'A')
    option_counts = {"A": 0, "B": 0, "C": 0, "D": 0}
    for a in attempts:
        opt = (a.selected_option or "").upper().strip()
        if opt in option_counts:
            option_counts[opt] += 1

    dominant_option = None
    if total_count >= 15:
        for opt, cnt in option_counts.items():
            if cnt / total_count > 0.45:  # Over 45% selecting same option
                dominant_option = f"Có xu hướng chọn đáp án {opt} bất thường ({cnt}/{total_count} câu - {round(cnt/total_count*100)}%)"

    # Time trend (compare first half vs second half or week by week)
    trend_description = "Chưa đủ dữ liệu để phân tích xu hướng"
    if total_count >= 20:
        mid = total_count // 2
        first_half = attempts[:mid]
        second_half = attempts[mid:]
        acc_first = round((sum(1 for a in first_half if a.is_correct) / len(first_half) * 100), 1)
        acc_second = round((sum(1 for a in second_half if a.is_correct) / len(second_half) * 100), 1)
        diff = round(acc_second - acc_first, 1)
        if diff >= 5.0:
            trend_description = f"Tiến bộ rõ rệt (+{diff}%: từ {acc_first}% lên {acc_second}%)"
        elif diff <= -5.0:
            trend_description = f"Đang có dấu hiệu chững lại hoặc giảm nhẹ ({diff}%: từ {acc_first}% xuống {acc_second}%)"
        else:
            trend_description = f"Độ chính xác ổn định quanh mức {acc_second}%"

    # Repeated mistakes & top 20 representative wrong questions
    wrong_attempts = [a for a in attempts if not a.is_correct]
    wrong_by_qid: Dict[str, List[models.QuestionAttempt]] = {}
    for wa in wrong_attempts:
        qid = wa.question_id
        if qid not in wrong_by_qid:
            wrong_by_qid[qid] = []
        wrong_by_qid[qid].append(wa)

    repeated_wrong_qids = [qid for qid, list_a in wrong_by_qid.items() if len(list_a) > 1]

    # Select up to 20 representative wrong questions for the AI prompt
    representative_wrong = []
    seen_q = set()
    for wa in wrong_attempts:
        if wa.question_id in seen_q:
            continue
        seen_q.add(wa.question_id)
        # Shorten text to 120 chars to conserve tokens
        short_text = (wa.question_text or "").strip()
        if len(short_text) > 120:
            short_text = short_text[:117] + "..."
        representative_wrong.append({
            "id": wa.question_id,
            "part": wa.part,
            "topic": wa.topic or f"Part {wa.part}",
            "question_text": short_text or f"Câu hỏi Part {wa.part}",
            "selected_option": wa.selected_option,
            "correct_option": wa.correct_option,
            "is_repeated": wa.question_id in repeated_wrong_qids
        })
        if len(representative_wrong) >= 20:
            break

    return {
        "user_id": user_id,
        "scope": scope,
        "scope_name": parsed_scope["name"],
        "time_range": time_range,
        "total_count": total_count,
        "correct_count": correct_count,
        "wrong_count": wrong_count,
        "accuracy": accuracy,
        "data_confidence": data_confidence,
        "part_breakdown": part_breakdown,
        "verified_strengths": verified_strengths,
        "verified_weaknesses": verified_weaknesses,
        "need_more_data_topics": need_more_data_topics,
        "avg_time_sec": avg_time_sec,
        "too_fast_count": too_fast_count,
        "too_slow_count": too_slow_count,
        "dominant_option": dominant_option,
        "trend_description": trend_description,
        "repeated_wrong_count": len(repeated_wrong_qids),
        "representative_wrong": representative_wrong
    }

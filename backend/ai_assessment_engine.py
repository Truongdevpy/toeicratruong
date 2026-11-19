# -*- coding: utf-8 -*-
import os
import json
import glob
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from pathlib import Path
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

PART_SPECIFIC_MAP = {
    1: "Part 1: Mô tả tranh (Photographs)",
    2: "Part 2: Hỏi & Đáp (Question-Response)",
    3: "Part 3: Hội thoại ngắn (Conversations)",
    4: "Part 4: Bài nói ngắn (Short Talks)",
    5: "Part 5: Điền câu (Incomplete Sentences)",
    6: "Part 6: Điền đoạn văn (Text Completion)",
    7: "Part 7: Đọc hiểu văn bản (Reading Comprehension)",
}

# Cache for question metadata looked up from json files
_Q_META_CACHE: Dict[str, Dict[str, Any]] = {}

def normalize_topic_name(t: Optional[str], part: int) -> str:
    clean = (t or "").strip()
    clean_lower = clean.lower()
    for p_num in range(1, 8):
        if clean_lower in [f"part {p_num}", f"part{p_num}", f"part {p_num}:", f"part{p_num}:", f"part {p_num} · level 1", f"part {p_num} · level 2"]:
            return PART_SPECIFIC_MAP.get(p_num, f"Part {p_num}")
    if not clean or clean_lower in ["part", "none", "null"]:
        return PART_SPECIFIC_MAP.get(part, f"Part {part}")
    return clean

_CATALOG_FILE_MAP: Dict[str, str] = {}
_INDEXED_PRACTICE = False

def _ensure_practice_index():
    global _INDEXED_PRACTICE
    if _INDEXED_PRACTICE:
        return
    _INDEXED_PRACTICE = True
    data_dir = Path(__file__).resolve().parent.parent / "data" / "data" / "web_ready"
    if not data_dir.exists():
        return
    
    cat_file = data_dir / "tests_catalog.json"
    if cat_file.exists():
        try:
            with open(cat_file, "r", encoding="utf-8") as f:
                for it in json.load(f):
                    fn = it.get("file_name")
                    if fn:
                        if it.get("id"): _CATALOG_FILE_MAP[it["id"]] = fn
                        if it.get("slug"): _CATALOG_FILE_MAP[it["slug"]] = fn
                        if it.get("test_id"): _CATALOG_FILE_MAP[it["test_id"]] = fn
        except Exception:
            pass

    for pfile in glob.glob(str(data_dir / "practice_by_part" / "*.json")):
        try:
            with open(pfile, "r", encoding="utf-8") as f:
                d = json.load(f)
                qs = d.get("questions", []) if isinstance(d, dict) else []
                for q in qs:
                    qid = q.get("id")
                    if qid:
                        entry = {
                            "part": q.get("part"),
                            "topic": q.get("topic") or q.get("question_type") or q.get("photo_type"),
                            "question_text": q.get("question_text", "")
                        }
                        _Q_META_CACHE[qid] = entry
                        _Q_META_CACHE[qid.replace("dautoeic_", "")] = entry
                        _Q_META_CACHE["dautoeic_" + qid] = entry
        except Exception:
            pass

def get_question_meta_from_files(question_id: str) -> Optional[Dict[str, Any]]:
    """Look up question topic/question_type from data json files when attempt record lacks it."""
    if not question_id:
        return None
    _ensure_practice_index()

    if question_id in _Q_META_CACHE:
        return _Q_META_CACHE[question_id]
    clean_id = question_id.replace("dautoeic_", "")
    if clean_id in _Q_META_CACHE:
        return _Q_META_CACHE[clean_id]

    data_dir = Path(__file__).resolve().parent.parent / "data" / "data" / "web_ready"
    mock_dir = data_dir / "mock_tests"
    if not mock_dir.exists():
        return None

    tokens = question_id.split("_")
    for i in range(len(tokens), 0, -1):
        pref = "_".join(tokens[:i])
        matched_file = None
        if pref in _CATALOG_FILE_MAP:
            p = mock_dir / _CATALOG_FILE_MAP[pref]
            if p.exists(): matched_file = p
        if not matched_file:
            for cand in [f"{pref}.json", f"tooich_{pref}.json", f"dau_{pref}.json"]:
                p = mock_dir / cand
                if p.exists():
                    matched_file = p
                    break
        if matched_file:
            try:
                with open(matched_file, "r", encoding="utf-8") as mf:
                    d = json.load(mf)
                    qs = d.get("questions", []) if isinstance(d, dict) else (d if isinstance(d, list) else [])
                    for q in qs:
                        if isinstance(q, dict):
                            cur_qid = q.get("id")
                            if cur_qid:
                                entry = {
                                    "part": q.get("part"),
                                    "topic": q.get("topic") or q.get("question_type") or q.get("photo_type"),
                                    "question_text": q.get("question_text", "")
                                }
                                _Q_META_CACHE[cur_qid] = entry
                                _Q_META_CACHE[cur_qid.replace("dautoeic_", "")] = entry
                                _Q_META_CACHE["dautoeic_" + cur_qid] = entry
                    if question_id in _Q_META_CACHE: return _Q_META_CACHE[question_id]
                    if clean_id in _Q_META_CACHE: return _Q_META_CACHE[clean_id]
            except Exception:
                pass

    return None

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

def buildStats(
    user_id: int,
    scope: str,
    time_range: str,
    db: Session,
    local_attempts: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Computes all verifiable statistics strictly by code.
    Enforces strict sample size threshold rules:
    - Minimum 5 questions per topic to classify as strength or weakness.
    - Under 5 questions MUST be placed into 'need_more_data_topics' and never called a weakness.
    """
    parsed_scope = parse_scope(scope)
    now = datetime.utcnow()

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

    db_attempts = query.order_by(models.QuestionAttempt.created_at.asc()).all()

    attempts_dict_list: List[Dict[str, Any]] = []
    seen_q_keys = set()

    for a in db_attempts:
        k = f"{a.question_id}_{a.created_at.isoformat() if a.created_at else ''}"
        seen_q_keys.add(k)

        # Enriched topic
        t = (a.topic or "").strip()
        if not t:
            meta = get_question_meta_from_files(a.question_id)
            if meta and meta.get("topic"):
                t = meta["topic"]
        t = normalize_topic_name(t, a.part or 1)

        attempts_dict_list.append({
            "question_id": a.question_id,
            "part": a.part or 1,
            "topic": t,
            "question_text": a.question_text or "",
            "selected_option": a.selected_option or "",
            "correct_option": a.correct_option or "",
            "is_correct": bool(a.is_correct),
            "time_spent_sec": a.time_spent_sec or 25,
            "created_at": a.created_at or now
        })

    # Merge client local attempts
    if local_attempts and isinstance(local_attempts, list):
        for la in local_attempts:
            qid = str(la.get("questionId") or la.get("question_id") or "")
            if not qid:
                continue
            p = int(la.get("part") or 1)
            if parsed_scope["parts"] and len(parsed_scope["parts"]) < 7 and p not in parsed_scope["parts"]:
                continue

            dt_raw = la.get("createdAt") or la.get("created_at")
            att_time = now
            if dt_raw:
                try:
                    att_time = datetime.fromisoformat(str(dt_raw).replace("Z", "+00:00")).replace(tzinfo=None)
                except Exception:
                    att_time = now
            if since_date and att_time < since_date:
                continue

            k = f"{qid}_{att_time.isoformat()}"
            if k in seen_q_keys:
                continue
            seen_q_keys.add(k)

            t = str(la.get("topic") or la.get("question_type") or "").strip()
            if not t:
                meta = get_question_meta_from_files(qid)
                if meta and meta.get("topic"):
                    t = meta["topic"]
            t = normalize_topic_name(t, p)

            attempts_dict_list.append({
                "question_id": qid,
                "part": p,
                "topic": t,
                "question_text": str(la.get("questionText") or la.get("question_text") or ""),
                "selected_option": str(la.get("selectedOption") or la.get("selected_option") or ""),
                "correct_option": str(la.get("correctOption") or la.get("correct_option") or ""),
                "is_correct": bool(la.get("isCorrect") if "isCorrect" in la else la.get("is_correct")),
                "time_spent_sec": int(la.get("timeSpentSec") or la.get("time_spent_sec") or 25),
                "created_at": att_time
            })

    attempts = attempts_dict_list
    attempts.sort(key=lambda x: x["created_at"] if isinstance(x["created_at"], datetime) else now)

    total_count = len(attempts)
    correct_count = sum(1 for a in attempts if a["is_correct"])
    wrong_count = total_count - correct_count
    accuracy = round((correct_count / total_count * 100), 1) if total_count > 0 else 0.0

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
        p = a["part"] or 1
        if p not in part_stats:
            part_stats[p] = {"part": p, "total": 0, "correct": 0}
        part_stats[p]["total"] += 1
        if a["is_correct"]:
            part_stats[p]["correct"] += 1

    part_breakdown = []
    for p, pdata in sorted(part_stats.items()):
        acc = round((pdata["correct"] / pdata["total"] * 100), 1) if pdata["total"] > 0 else 0.0
        part_breakdown.append({
            "part": p,
            "part_name": PART_SPECIFIC_MAP.get(p, f"Part {p}"),
            "total": pdata["total"],
            "correct": pdata["correct"],
            "accuracy": acc
        })

    # Topic / Question Type breakdown
    topic_map: Dict[str, Dict[str, Any]] = {}
    for a in attempts:
        t = normalize_topic_name(a["topic"], a["part"])
        if t not in topic_map:
            topic_map[t] = {"topic": t, "part": a["part"], "total": 0, "correct": 0}
        topic_map[t]["total"] += 1
        if a["is_correct"]:
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

        # STRICT THRESHOLD ENFORCEMENT:
        # 1. Under 15 total overall attempts -> Cannot conclude any strength/weakness
        # 2. Under 5 attempts for a specific topic -> MUST NEVER be called a weakness or strength!
        if total_count < 15 or t_tot < 5:
            need_more_data_topics.append({
                **entry,
                "reason": f"Chỉ mới làm {t_tot}/5 câu tối thiểu (cần làm thêm để có kết luận chính xác)."
            })
        else:
            if t_acc >= 75.0:
                verified_strengths.append(entry)
            elif t_acc <= 55.0:
                verified_weaknesses.append(entry)
            elif t_acc < (accuracy - 15.0):
                verified_weaknesses.append(entry)

    # Sort weaknesses by total attempts (impact) and accuracy ascending
    verified_weaknesses.sort(key=lambda x: (x["accuracy"], -x["total"]))
    verified_strengths.sort(key=lambda x: (-x["accuracy"], -x["total"]))

    # Timing analysis
    time_list = [a["time_spent_sec"] for a in attempts if a["time_spent_sec"] and a["time_spent_sec"] > 0]
    avg_time_sec = round(sum(time_list) / len(time_list), 1) if time_list else 30.0

    too_fast_count = 0
    too_slow_count = 0
    for a in attempts:
        std = STANDARD_TIME_PER_PART.get(a["part"], 30)
        t = a["time_spent_sec"] or 30
        if t < 8:
            too_fast_count += 1
        elif t > (std * 2.5):
            too_slow_count += 1

    option_counts = {"A": 0, "B": 0, "C": 0, "D": 0}
    for a in attempts:
        opt = (a["selected_option"] or "").upper().strip()
        if opt in option_counts:
            option_counts[opt] += 1

    dominant_option = None
    if total_count >= 15:
        for opt, cnt in option_counts.items():
            if cnt / total_count > 0.45:
                dominant_option = f"Có xu hướng chọn đáp án {opt} bất thường ({cnt}/{total_count} câu - {round(cnt/total_count*100)}%)"

    trend_description = "Chưa đủ dữ liệu để phân tích xu hướng"
    if total_count >= 20:
        mid = total_count // 2
        first_half = attempts[:mid]
        second_half = attempts[mid:]
        acc_first = round((sum(1 for a in first_half if a["is_correct"]) / len(first_half) * 100), 1)
        acc_second = round((sum(1 for a in second_half if a["is_correct"]) / len(second_half) * 100), 1)
        diff = round(acc_second - acc_first, 1)
        if diff >= 5.0:
            trend_description = f"Tiến bộ rõ rệt (+{diff}%: từ {acc_first}% lên {acc_second}%)"
        elif diff <= -5.0:
            trend_description = f"Đang có dấu hiệu chững lại hoặc giảm nhẹ ({diff}%: từ {acc_first}% xuống {acc_second}%)"
        else:
            trend_description = f"Độ chính xác ổn định quanh mức {acc_second}%"

    wrong_attempts = [a for a in attempts if not a["is_correct"]]
    wrong_by_qid: Dict[str, List[Dict[str, Any]]] = {}
    for wa in wrong_attempts:
        qid = wa["question_id"]
        if qid not in wrong_by_qid:
            wrong_by_qid[qid] = []
        wrong_by_qid[qid].append(wa)

    repeated_wrong_qids = [qid for qid, list_a in wrong_by_qid.items() if len(list_a) > 1]

    representative_wrong = []
    seen_q = set()
    for wa in wrong_attempts:
        if wa["question_id"] in seen_q:
            continue
        seen_q.add(wa["question_id"])
        short_text = (wa["question_text"] or "").strip()
        if len(short_text) > 120:
            short_text = short_text[:117] + "..."
        representative_wrong.append({
            "id": wa["question_id"],
            "part": wa["part"],
            "topic": wa["topic"],
            "question_text": short_text or f"Câu hỏi Part {wa['part']}",
            "selected_option": wa["selected_option"],
            "correct_option": wa["correct_option"],
            "is_repeated": wa["question_id"] in repeated_wrong_qids
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

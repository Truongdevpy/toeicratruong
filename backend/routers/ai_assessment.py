# -*- coding: utf-8 -*-
import os
import json
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel, Field

from database import get_db
import models
from auth import get_current_user
from gemini_pool import GeminiPoolService
from ai_assessment_engine import buildStats

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/assessment", tags=["ai-assessment"])

# Initialize gemini service singleton
gemini_service = GeminiPoolService()

# Prompt file location
PROMPT_FILE = Path(__file__).resolve().parent.parent / "prompts" / "ai-assessment.md"

def load_system_prompt() -> str:
    if PROMPT_FILE.exists():
        try:
            return PROMPT_FILE.read_text(encoding="utf-8").strip()
        except Exception:
            pass
    return (
        "You are a TOEIC tutor analyzing a learner's practice data. All numbers are pre-computed "
        "and verified by code: never recompute, estimate, or invent numbers, question content, or "
        "scores that are not in the input. Only call something a weakness or strength if the input "
        "supports it (respect the minimum sample sizes provided). If data is insufficient, say so "
        "plainly. Every claim must cite concrete evidence from the input. Write in simple Vietnamese; "
        "keep English only for quoted terms and examples. Never promise score outcomes."
    )

class AssessmentRequest(BaseModel):
    scope: str = Field(default="overall", description="Scope e.g. 'overall', 'reading', 'listening', 'part5', 'grammar'")
    time_range: str = Field(default="all", description="'7d', '30d', 'all'")
    force_refresh: bool = Field(default=False, description="Bypass cache and re-analyze")

# In-memory daily rate limit tracker: { user_id: [timestamp, timestamp, ...] }
DAILY_LIMITS: Dict[int, List[float]] = {}
MAX_ASSESSMENTS_PER_DAY = 25

def check_rate_limit(user_id: int):
    now = datetime.utcnow().timestamp()
    day_ago = now - 86400
    if user_id not in DAILY_LIMITS:
        DAILY_LIMITS[user_id] = []
    # Filter only attempts within last 24h
    DAILY_LIMITS[user_id] = [t for t in DAILY_LIMITS[user_id] if t > day_ago]
    if len(DAILY_LIMITS[user_id]) >= MAX_ASSESSMENTS_PER_DAY:
        raise HTTPException(
            status_code=429,
            detail=f"Bạn đã đạt giới hạn {MAX_ASSESSMENTS_PER_DAY} lần đánh giá AI mỗi ngày. Vui lòng thử lại sau."
        )
    DAILY_LIMITS[user_id].append(now)

@router.post("/analyze")
def generate_ai_assessment(
    req: AssessmentRequest,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Rate limit per user
    check_rate_limit(user.id)

    # 1. Build stats with verified code logic
    stats = buildStats(user_id=user.id, scope=req.scope, time_range=req.time_range, db=db)
    total_q = stats["total_count"]
    confidence = stats["data_confidence"]

    # 2. Ngưỡng dữ liệu: Dưới 15 câu -> Trả về trạng thái chưa đủ dữ liệu ngay, không gọi AI tốn chi phí
    if total_q < 15:
        insufficient_result = {
            "summary_vi": f"Bạn mới hoàn thành {total_q}/15 câu hỏi trong phạm vi {stats['scope_name']}. Cần làm thêm ít nhất {15 - total_q} câu để gia sư AI có đủ căn cứ phân tích chi tiết điểm mạnh, điểm yếu và đưa ra lộ trình phù hợp.",
            "data_confidence": "insufficient",
            "strengths": [],
            "weaknesses": [],
            "patterns_vi": [
                f"Đã làm {total_q} câu ({stats['correct_count']} đúng, {stats['wrong_count']} sai). Dữ liệu chưa đủ ngưỡng tin cậy 15 câu."
            ],
            "trend_vi": "Chưa có đủ dữ liệu chuỗi thời gian",
            "study_plan": [
                {
                    "day_or_step": "Bước 1",
                    "action_vi": f"Làm thêm {max(5, 15 - total_q)} câu hỏi {stats['scope_name']} để mở khóa đánh giá AI chuyên sâu.",
                    "link_target": {
                        "type": "practice",
                        "params": {"part": stats["scope"] if "part" in stats["scope"] else "part5"}
                    }
                }
            ],
            "encouragement_vi": "Mỗi câu luyện tập là một bước tiến! Hãy hoàn thành thêm một vài câu nữa nhé."
        }

        # Lưu bản ghi lịch sử
        record = models.AIAssessmentRecord(
            user_id=user.id,
            scope=req.scope,
            time_range=req.time_range,
            total_questions=total_q,
            accuracy=stats["accuracy"],
            data_confidence="insufficient",
            summary_vi=insufficient_result["summary_vi"],
            stats_json=json.dumps(stats, ensure_ascii=False),
            result_json=json.dumps(insufficient_result, ensure_ascii=False),
            created_at=datetime.utcnow()
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        return {
            "id": record.id,
            "scope": req.scope,
            "scope_name": stats["scope_name"],
            "time_range": req.time_range,
            "stats": stats,
            "assessment": insufficient_result,
            "created_at": record.created_at.isoformat(),
            "cached": False
        }

    # 3. Check Cache if not force_refresh
    # Cache key based on hash(user_id, scope, time_range, total_q, correct_count)
    cache_signature = f"{user.id}:{req.scope}:{req.time_range}:{total_q}:{stats['correct_count']}:v1"
    cache_hash = hashlib.md5(cache_signature.encode("utf-8")).hexdigest()

    if not req.force_refresh:
        recent_record = db.query(models.AIAssessmentRecord).filter(
            models.AIAssessmentRecord.user_id == user.id,
            models.AIAssessmentRecord.scope == req.scope,
            models.AIAssessmentRecord.time_range == req.time_range,
            models.AIAssessmentRecord.total_questions == total_q
        ).order_by(desc(models.AIAssessmentRecord.created_at)).first()

        if recent_record and recent_record.result_json:
            try:
                cached_data = json.loads(recent_record.result_json)
                return {
                    "id": recent_record.id,
                    "scope": req.scope,
                    "scope_name": stats["scope_name"],
                    "time_range": req.time_range,
                    "stats": stats,
                    "assessment": cached_data,
                    "created_at": recent_record.created_at.isoformat(),
                    "cached": True
                }
            except Exception:
                pass

    # 4. Construct AI Prompt with verified code stats
    system_instruction = load_system_prompt()

    # Data package sent to Gemini (strictly verifiable facts)
    data_payload = {
        "scope": stats["scope_name"],
        "time_range": req.time_range,
        "total_questions": stats["total_count"],
        "correct_count": stats["correct_count"],
        "wrong_count": stats["wrong_count"],
        "accuracy_pct": stats["accuracy"],
        "data_confidence": stats["data_confidence"],
        "average_time_per_question_sec": stats["avg_time_sec"],
        "questions_done_too_fast_under_8s": stats["too_fast_count"],
        "questions_done_too_slow": stats["too_slow_count"],
        "dominant_option_bias": stats["dominant_option"],
        "time_trend": stats["trend_description"],
        "part_breakdown": stats["part_breakdown"],
        "verified_strengths": stats["verified_strengths"],
        "verified_weaknesses": stats["verified_weaknesses"],
        "need_more_data_topics": stats["need_more_data_topics"],
        "repeated_wrong_count": stats["repeated_wrong_count"],
        "sample_wrong_questions": stats["representative_wrong"]
    }

    user_prompt = f"""
<<<VERIFIED_DATA_START>>>
{json.dumps(data_payload, ensure_ascii=False, indent=2)}
<<<VERIFIED_DATA_END>>>

Hãy đóng vai Gia sư AI TOEIC, đọc kỹ toàn bộ khối dữ liệu đã được xác thực ở trên và phân tích kết quả học tập của học viên.
CHÚ Ý CÁC QUY TẮC BẮT BUỘC:
1. Tuyệt đối không tự bịa thêm số liệu, điểm số hay câu hỏi ngoài khối dữ liệu trên.
2. RÀNG BUỘC ĐIỂM YẾU: Danh sách "weaknesses" CHỈ ĐƯỢC CHỌN TỪ "verified_weaknesses" trong dữ liệu. TUYỆT ĐỐI KHÔNG đưa bất kỳ chủ điểm nào trong "need_more_data_topics" hoặc các chủ điểm dưới 5 câu vào "weaknesses".
3. Nếu 'data_confidence' là 'low' (15 - 49 câu), bắt buộc phải ghi rõ ở đầu nhận xét: 'Dữ liệu còn ít ({stats['total_count']} câu), kết luận chỉ mang tính tham khảo sơ bộ.'
4. Phân tích nguyên nhân có thể (do từ vựng, bẫy thì, vội vàng đoán bừa hay thời gian).
5. Trả về định dạng JSON thuần túy (không kèm markdown ngoài khối JSON) khớp chính xác với cấu trúc sau:

{{
  "summary_vi": "3-4 câu tóm tắt tình hình luyện tập",
  "data_confidence": "{confidence}",
  "strengths": [
    {{
      "topic": "Tên chủ điểm",
      "evidence": "Số liệu cụ thể (ví dụ: 12/15 câu đúng - 80%)",
      "comment_vi": "Nhận xét ngắn gọn, thực tế"
    }}
  ],
  "weaknesses": [
    {{
      "topic": "Tên chủ điểm",
      "evidence": "Số liệu cụ thể (ví dụ: 2/8 câu đúng - 25%)",
      "likely_cause_vi": "Nguyên nhân có thể gây sai sót",
      "example_question_ids": ["id1", "id2"],
      "priority": 1
    }}
  ],
  "patterns_vi": [
    "Mẫu lỗi phát hiện được, ví dụ: làm quá nhanh ở các câu từ loại, hoặc nghi đoán bừa"
  ],
  "trend_vi": "Xu hướng tiến bộ theo thời gian",
  "study_plan": [
    {{
      "day_or_step": "Ngày 1-2 / Bước 1",
      "action_vi": "Hành động cụ thể",
      "link_target": {{
        "type": "practice",
        "params": {{"part": "part5"}}
      }}
    }}
  ],
  "encouragement_vi": "Lời động viên chân thành, thực tế"
}}
"""

    ai_result = None
    last_error = None

    # Try up to 2 times with low temperature
    for attempt_idx in range(2):
        try:
            res = gemini_service.generate_content(
                system_instruction=system_instruction,
                user_prompt=user_prompt,
                max_tokens=2048,
                temperature=0.1,
                response_mime_type="application/json"
            )

            if res.get("success") and res.get("text"):
                raw_text = res["text"].strip()
                # Clean possible markdown wrap
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                raw_text = raw_text.strip()

                parsed = json.loads(raw_text)
                if isinstance(parsed, dict) and "summary_vi" in parsed:
                    # Sanitize weaknesses: strictly eliminate any topic with < 5 attempts
                    verified_weak_names = {w["topic"].strip().lower() for w in stats["verified_weaknesses"]}
                    need_more_names = {n["topic"].strip().lower() for n in stats["need_more_data_topics"]}
                    sanitized_weaknesses = []
                    for wk in parsed.get("weaknesses", []):
                        w_topic = str(wk.get("topic") or "").strip().lower()
                        # If topic is in need_more_names, strip it immediately!
                        if w_topic in need_more_names:
                            continue
                        # If verified_weaknesses is available, prefer matching verified weaknesses
                        if verified_weak_names:
                            if any(vw in w_topic or w_topic in vw for vw in verified_weak_names):
                                sanitized_weaknesses.append(wk)
                        else:
                            sanitized_weaknesses.append(wk)
                    
                    # If AI returned no valid weaknesses but verified_weaknesses exist in code stats, populate them
                    if not sanitized_weaknesses and stats["verified_weaknesses"]:
                        sanitized_weaknesses = [
                            {
                                "topic": w["topic"],
                                "evidence": w["evidence"],
                                "likely_cause_vi": "Cần luyện tập thêm các câu hỏi dạng bài này để cải thiện tỉ lệ chính xác.",
                                "example_question_ids": [],
                                "priority": idx + 1
                            }
                            for idx, w in enumerate(stats["verified_weaknesses"][:4])
                        ]
                    parsed["weaknesses"] = sanitized_weaknesses
                    ai_result = parsed
                    break
            else:
                last_error = res.get("error", "Gemini did not return text")
        except Exception as e:
            last_error = str(e)
            logger.warning(f"[AIAssessment] Attempt {attempt_idx+1} failed: {e}")

    # Fallback response if AI is unavailable
    if not ai_result:
        logger.error(f"[AIAssessment] AI call failed after retries: {last_error}")
        # Build programmatic rule-based assessment fallback
        ai_result = {
            "summary_vi": f"Bạn đã hoàn thành {total_q} câu hỏi trong phạm vi {stats['scope_name']} với độ chính xác đạt {stats['accuracy']}%. {stats['trend_description']}.",
            "data_confidence": confidence,
            "strengths": [
                {
                    "topic": s["topic"],
                    "evidence": s["evidence"],
                    "comment_vi": f"Nắm vững kiến thức phần {s['topic']} với độ chính xác cao."
                }
                for s in stats["verified_strengths"][:3]
            ],
            "weaknesses": [
                {
                    "topic": w["topic"],
                    "evidence": w["evidence"],
                    "likely_cause_vi": "Cần củng cố ngữ pháp cốt lõi và làm quen với các dạng bẫy phổ biến của phần này.",
                    "example_question_ids": [],
                    "priority": idx + 1
                }
                for idx, w in enumerate(stats["verified_weaknesses"][:3])
            ],
            "patterns_vi": [
                p for p in [
                    f"Thời gian trung bình: {stats['avg_time_sec']}s / câu.",
                    f"Có {stats['too_fast_count']} câu làm quá nhanh (< 8s) nghi ngờ đoán bừa." if stats["too_fast_count"] > 2 else None,
                    stats["dominant_option"]
                ] if p
            ],
            "trend_vi": stats["trend_description"],
            "study_plan": [
                {
                    "day_or_step": f"Bước {idx+1}",
                    "action_vi": f"Luyện tập 10 câu về chủ điểm {w['topic']}",
                    "link_target": {"type": "practice", "params": {"part": f"part{w['part']}"}}
                }
                for idx, w in enumerate(stats["verified_weaknesses"][:3])
            ] or [
                {
                    "day_or_step": "Bước 1",
                    "action_vi": f"Tiếp tục làm thêm các bài luyện tập {stats['scope_name']}",
                    "link_target": {"type": "practice", "params": {"part": "part5"}}
                }
            ],
            "encouragement_vi": "Kiên trì luyện tập đều đặn mỗi ngày là chìa khóa vàng để đạt mục tiêu TOEIC!"
        }

    # Save to Database
    record = models.AIAssessmentRecord(
        user_id=user.id,
        scope=req.scope,
        time_range=req.time_range,
        total_questions=total_q,
        accuracy=stats["accuracy"],
        data_confidence=confidence,
        summary_vi=ai_result.get("summary_vi", "")[:500],
        stats_json=json.dumps(stats, ensure_ascii=False),
        result_json=json.dumps(ai_result, ensure_ascii=False),
        created_at=datetime.utcnow()
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "id": record.id,
        "scope": req.scope,
        "scope_name": stats["scope_name"],
        "time_range": req.time_range,
        "stats": stats,
        "assessment": ai_result,
        "created_at": record.created_at.isoformat(),
        "cached": False
    }

@router.get("/history")
def get_assessment_history(
    scope: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.AIAssessmentRecord).filter(models.AIAssessmentRecord.user_id == user.id)
    if scope:
        query = query.filter(models.AIAssessmentRecord.scope == scope)

    items = query.order_by(desc(models.AIAssessmentRecord.created_at)).limit(limit).all()

    results = []
    for it in items:
        try:
            res_json = json.loads(it.result_json) if it.result_json else {}
        except Exception:
            res_json = {}
        try:
            stats_json = json.loads(it.stats_json) if it.stats_json else {}
        except Exception:
            stats_json = {}

        results.append({
            "id": it.id,
            "scope": it.scope,
            "time_range": it.time_range,
            "total_questions": it.total_questions,
            "accuracy": it.accuracy,
            "data_confidence": it.data_confidence,
            "summary_vi": it.summary_vi,
            "assessment": res_json,
            "stats": stats_json,
            "created_at": it.created_at.isoformat() if it.created_at else None
        })

    return {"total": len(results), "items": results}

@router.delete("/history/{assessment_id}")
def delete_assessment_item(
    assessment_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rec = db.query(models.AIAssessmentRecord).filter(
        models.AIAssessmentRecord.id == assessment_id,
        models.AIAssessmentRecord.user_id == user.id
    ).first()

    if not rec:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi đánh giá")

    db.delete(rec)
    db.commit()
    return {"status": "success", "message": "Đã xóa bản ghi đánh giá"}

@router.delete("/history")
def clear_all_assessment_history(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deleted = db.query(models.AIAssessmentRecord).filter(
        models.AIAssessmentRecord.user_id == user.id
    ).delete()
    db.commit()
    return {"status": "success", "message": f"Đã xóa {deleted} bản ghi đánh giá"}

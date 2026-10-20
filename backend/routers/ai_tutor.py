from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json
from database import get_db
import models
import schemas
from auth import get_current_user
from timezone_utils import get_vn_day_start_utc
from ai_tutor import answer_tutor_query
from ai_security import sanitize_user_input, validate_ai_output, validate_quiz_data

router = APIRouter(prefix="/api/ai-tutor", tags=["ai-tutor"])

@router.post("/chat")
def chat_with_tutor(
    data: schemas.AITutorChatRequest,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 0. RBAC: Free tier limit 3 questions / day
    if user and user.role not in ["vip", "admin"]:
        from datetime import datetime, time
        today_start = get_vn_day_start_utc()
        today_count = db.query(models.AIMessage).join(models.AIConversation).filter(
            models.AIConversation.user_id == user.id,
            models.AIMessage.sender == "user",
            models.AIMessage.created_at >= today_start
        ).count()
        if today_count >= 3:
            raise HTTPException(
                status_code=403,
                detail="Tài khoản gói thường giới hạn 3 lượt hỏi AI mỗi ngày. Nâng cấp VIP Pro để hỏi gia sư AI không giới hạn!"
            )

    # 1. Sanitize user input against prompt injection and oversized inputs
    clean_message = sanitize_user_input(data.message, max_length=1000)

    conv = None
    if data.conversation_id:
        conv = db.query(models.AIConversation).filter(
            models.AIConversation.id == data.conversation_id,
            models.AIConversation.user_id == user.id
        ).first()

    if not conv:
        title = clean_message[:30] + "..." if len(clean_message) > 30 else clean_message
        conv = models.AIConversation(user_id=user.id, title=title)
        db.add(conv)
        db.flush()

    # Save sanitized user message
    user_msg = models.AIMessage(
        conversation_id=conv.id,
        sender="user",
        content=clean_message,
        prompt_action=data.action
    )
    db.add(user_msg)

    # Generate tutor answer
    tutor_res = answer_tutor_query(db, user, clean_message, data.action, conversation_id=conv.id)
    raw_reply = tutor_res["reply"]
    raw_quiz = tutor_res.get("quiz_data")

    # 2. Validate AI output to block any dangerous scripts or injected tags
    reply_text = validate_ai_output(raw_reply)
    quiz_data = validate_quiz_data(raw_quiz)

    # Save validated AI message
    ai_msg = models.AIMessage(
        conversation_id=conv.id,
        sender="ai",
        content=reply_text,
        prompt_action=data.action,
        quiz_data=json.dumps(quiz_data) if quiz_data else None
    )
    db.add(ai_msg)
    db.commit()

    return {
        "conversation_id": conv.id,
        "sender": "ai",
        "reply": reply_text,
        "quiz_data": quiz_data,
        "quiz": quiz_data[0] if (quiz_data and len(quiz_data) > 0) else None,
        "created_at": ai_msg.created_at.isoformat()
    }

@router.get("/conversations")
def get_conversations(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    convs = db.query(models.AIConversation).filter(
        models.AIConversation.user_id == user.id
    ).order_by(models.AIConversation.updated_at.desc()).all()

    result = []
    for c in convs:
        last_msg = db.query(models.AIMessage).filter(
            models.AIMessage.conversation_id == c.id
        ).order_by(models.AIMessage.created_at.desc()).first()

        result.append({
            "id": c.id,
            "title": c.title,
            "created_at": c.created_at.isoformat(),
            "last_message": last_msg.content[:50] + "..." if last_msg else ""
        })
    return {"conversations": result}

@router.get("/conversations/{conv_id}/messages")
def get_conversation_messages(
    conv_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = db.query(models.AIConversation).filter(
        models.AIConversation.id == conv_id,
        models.AIConversation.user_id == user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc hội thoại")

    msgs = db.query(models.AIMessage).filter(
        models.AIMessage.conversation_id == conv.id
    ).order_by(models.AIMessage.created_at.asc()).all()

    return {
        "conversation_id": conv.id,
        "title": conv.title,
        "messages": [
            {
                "id": m.id,
                "sender": m.sender,
                "content": m.content,
                "prompt_action": m.prompt_action,
                "quiz_data": json.loads(m.quiz_data) if m.quiz_data else None,
                "quiz": (json.loads(m.quiz_data)[0] if json.loads(m.quiz_data) else None) if m.quiz_data else None,
                "created_at": m.created_at.isoformat()
            }
            for m in msgs
        ]
    }


@router.post("/conversations")
def create_new_conversation(
    payload: dict = None,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    title = (payload.get("title") if payload else "") or "Cuộc trò chuyện mới"
    conv = models.AIConversation(user_id=user.id, title=title)
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return {
        "status": "success",
        "conversation": {
            "id": conv.id,
            "title": conv.title,
            "created_at": conv.created_at.isoformat()
        }
    }

@router.delete("/conversations/{conv_id}")
def delete_conversation(
    conv_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = db.query(models.AIConversation).filter(
        models.AIConversation.id == conv_id,
        models.AIConversation.user_id == user.id
    ).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc hội thoại")

    db.delete(conv)
    db.commit()
    return {"status": "success", "message": "Đã xóa cuộc hội thoại thành công"}

@router.get("/memory")
def get_deeptutor_memory(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns user cognitive profile and long-term DeepTutor memory trace.
    Inspired by HKUDS DeepTutor architecture.
    """
    p = user.profile
    if not p:
        p = models.UserProfile(user_id=user.id, target_score=650, current_score=425)
        db.add(p)
        db.commit()
        db.refresh(p)

    weak_areas = []
    if p.weak_areas:
        try:
            weak_areas = json.loads(p.weak_areas) if isinstance(p.weak_areas, str) and p.weak_areas.startswith("[") else [p.weak_areas]
        except Exception:
            weak_areas = [str(p.weak_areas)]

    strengths = []
    if p.strengths:
        try:
            strengths = json.loads(p.strengths) if isinstance(p.strengths, str) and p.strengths.startswith("[") else [p.strengths]
        except Exception:
            strengths = [str(p.strengths)]

    total_convs = db.query(models.AIConversation).filter(models.AIConversation.user_id == user.id).count()

    return {
        "status": "success",
        "user_id": user.id,
        "full_name": user.full_name or "Học viên",
        "target_score": p.target_score or 650,
        "current_score": p.current_score or 425,
        "weak_areas": weak_areas or ["Part 3 Graphic", "Part 5 Word Form", "Part 7 Double Passages"],
        "strengths": strengths or ["Part 1 Photographs", "Part 5 Basic Grammar"],
        "ai_memory_notes": getattr(p, "ai_memory_notes", "") or "",
        "learning_style": "Socratic Guidance & 5s ETS Trap Analysis",
        "framework": "HKUDS DeepTutor Multi-Turn Socratic AI",
        "total_conversations": total_convs
    }

@router.put("/memory")
def update_deeptutor_memory(
    payload: dict,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates persistent cognitive memory (target score, weak areas, custom notes).
    """
    p = user.profile
    if not p:
        p = models.UserProfile(user_id=user.id)
        db.add(p)

    if "target_score" in payload:
        try:
            p.target_score = int(payload["target_score"])
        except Exception:
            pass

    if "weak_areas" in payload:
        wa = payload["weak_areas"]
        if isinstance(wa, list):
            p.weak_areas = json.dumps(wa, ensure_ascii=False)
        elif isinstance(wa, str):
            p.weak_areas = json.dumps([w.strip() for w in wa.split(",") if w.strip()], ensure_ascii=False)

    if "ai_memory_notes" in payload:
        p.ai_memory_notes = str(payload["ai_memory_notes"] or "").strip()

    db.commit()
    return {
        "status": "success",
        "message": "Đã lưu trí nhớ DeepTutor thành công!",
        "memory": {
            "target_score": p.target_score,
            "weak_areas": json.loads(p.weak_areas) if p.weak_areas else [],
            "ai_memory_notes": p.ai_memory_notes
        }
    }

@router.delete("/memory/reset")
def reset_deeptutor_memory(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    p = user.profile
    if p:
        p.ai_memory_notes = ""
        p.weak_areas = json.dumps(["Part 3 Graphic", "Part 5 Word Form", "Part 7 Double Passages"], ensure_ascii=False)
        db.commit()
    return {"status": "success", "message": "Đã làm mới trí nhớ DeepTutor về trạng thái mặc định"}

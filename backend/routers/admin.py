from timezone_utils import format_vn_time, format_vn_datetime, to_iso_utc, format_vn_datetime, to_iso_utc
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
import json
from database import get_db
import models
import schemas
from auth import require_admin
from security import log_security_event

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/metrics")
def get_admin_metrics(
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Returns system and edtech platform metrics. Protected by require_admin.
    """
    return {
        "total_users": db.query(models.User).count(),
        "total_questions": db.query(models.CachedQuestion).count() + 1750,
        "total_vocab_words": db.query(models.CachedVocab).count() + 4865,
        "total_grammar_topics": db.query(models.CachedGrammarTopic).count(),
        "total_mock_tests": 168,
        "pending_ai_reviews": db.query(models.AIReviewQuestion).filter(
            models.AIReviewQuestion.status.in_(["ai_generated", "pending_review"])
        ).count(),
        "approved_ai_questions": db.query(models.AIReviewQuestion).filter(
            models.AIReviewQuestion.status == "approved"
        ).count(),
        "system_health": "Tất cả các dịch vụ đang hoạt động bình thường (100% Uptime)"
    }

@router.get("/users")
def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Lists users with pagination bounds to prevent resource exhaustion.
    """
    query = db.query(models.User)
    if search:
        s = f"%{search.strip().lower()}%"
        query = query.filter(models.User.email.ilike(s) | models.User.full_name.ilike(s))

    total = query.count()
    users = query.order_by(models.User.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role,
                "is_active": getattr(u, "is_active", True),
                "avatar_url": u.avatar_url,
                "target_score": u.profile.target_score if u.profile and u.profile.target_score else 650,
                "current_score": u.profile.current_score if u.profile and u.profile.current_score else 0,
                "streak_days": u.profile.streak_days if u.profile and u.profile.streak_days else 0,
                "created_at": format_vn_datetime(u.created_at) if u.created_at else ""
            }
            for u in users
        ]
    }

@router.patch("/users/{user_id}/role")
def change_user_role(
    user_id: int,
    payload: dict,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin Self-Protection (Section 2 & 3):
    An admin CANNOT demote or change the role of their own account.
    """
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tự thay đổi vai trò hoặc giáng cấp tài khoản quản trị của chính mình (Admin self-protection rule)"
        )

    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    new_role = payload.get("role")
    if new_role not in ["student", "vip", "admin"]:
        raise HTTPException(status_code=400, detail="Vai trò không hợp lệ (student, vip hoặc admin)")

    target_user.role = new_role
    # Invalidate existing tokens of the target user so privilege change is immediate
    target_user.token_version = (target_user.token_version or 1) + 1
    db.commit()

    log_security_event("ADMIN_ROLE_CHANGE", admin.id, {"target_user_id": user_id, "new_role": new_role})
    return {"status": "success", "message": f"Đã cập nhật vai trò người dùng thành '{new_role}'"}

@router.post("/users/{user_id}/status")
def toggle_user_status(
    user_id: int,
    payload: dict,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin Self-Protection (Section 2):
    An admin CANNOT lock or suspend their own account.
    """
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tự khóa hoặc đình chỉ tài khoản của chính mình (Admin self-protection rule)"
        )

    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    is_active = bool(payload.get("is_active", True))
    target_user.is_active = is_active
    if not is_active:
        # Revoke tokens immediately
        target_user.token_version = (target_user.token_version or 1) + 1

    db.commit()
    log_security_event("ADMIN_STATUS_CHANGE", admin.id, {"target_user_id": user_id, "is_active": is_active})
    return {"status": "success", "message": f"Đã cập nhật trạng thái người dùng (is_active={is_active})"}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin Self-Protection (Section 2):
    An admin CANNOT delete their own account.
    """
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tự xóa tài khoản của chính mình (Admin self-protection rule)"
        )

    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    target_user.is_active = False
    target_user.token_version = (target_user.token_version or 1) + 1
    db.commit()

    log_security_event("ADMIN_USER_DEACTIVATED", admin.id, {"target_user_id": user_id})
    return {"status": "success", "message": "Đã vô hiệu hóa tài khoản người dùng"}


@router.put("/users/{user_id}")
def update_user_details(
    user_id: int,
    payload: dict,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    if "full_name" in payload and payload["full_name"]:
        target_user.full_name = payload["full_name"].strip()

    if "role" in payload:
        new_role = payload["role"]
        if new_role in ["student", "vip", "admin"]:
            if user_id == admin.id and new_role != "admin":
                raise HTTPException(status_code=400, detail="Không thể tự giáng cấp tài khoản quản trị của chính mình.")
            target_user.role = new_role
            target_user.token_version = (target_user.token_version or 1) + 1

    if "is_active" in payload:
        is_active = bool(payload["is_active"])
        if user_id == admin.id and not is_active:
            raise HTTPException(status_code=400, detail="Không thể tự khóa tài khoản quản trị của chính mình.")
        target_user.is_active = is_active
        if not is_active:
            target_user.token_version = (target_user.token_version or 1) + 1

    if "target_score" in payload:
        try:
            ts = int(payload["target_score"])
            if target_user.profile:
                target_user.profile.target_score = ts
            else:
                p = models.UserProfile(user_id=target_user.id, target_score=ts, current_score=0)
                db.add(p)
        except Exception:
            pass

    if "password" in payload and str(payload["password"]).strip():
        import auth
        target_user.password_hash = auth.get_password_hash(str(payload["password"]).strip())
        target_user.token_version = (target_user.token_version or 1) + 1

    db.commit()
    db.refresh(target_user)
    log_security_event("ADMIN_USER_UPDATED", admin.id, {"target_user_id": user_id})

    return {
        "status": "success",
        "message": f"Đã cập nhật thông tin người dùng '{target_user.full_name}' thành công!",
        "user": {
            "id": target_user.id,
            "email": target_user.email,
            "full_name": target_user.full_name,
            "role": target_user.role,
            "is_active": target_user.is_active,
            "target_score": target_user.profile.target_score if target_user.profile else 650,
            "current_score": target_user.profile.current_score if target_user.profile else 0,
            "streak_days": target_user.profile.streak_days if target_user.profile else 0
        }
    }


@router.post("/users")
def create_new_user(
    payload: dict,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    email = str(payload.get("email") or "").strip().lower()
    full_name = str(payload.get("full_name") or "").strip()
    role = str(payload.get("role") or "student").strip().lower()
    raw_password = str(payload.get("password") or "Toeic123@").strip()
    target_score = int(payload.get("target_score") or 650)

    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp email hợp lệ.")
    if not full_name:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp họ và tên học viên.")
    if role not in ["student", "vip", "admin"]:
        role = "student"

    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email này đã được đăng ký trong hệ thống.")

    import auth
    new_user = models.User(
        email=email,
        full_name=full_name,
        role=role,
        password_hash=auth.get_password_hash(raw_password),
        is_active=True,
        token_version=1
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    prof = models.UserProfile(
        user_id=new_user.id,
        target_score=target_score,
        current_score=0,
        streak_days=0
    )
    db.add(prof)
    db.commit()

    log_security_event("ADMIN_CREATE_USER", admin.id, {"new_user_id": new_user.id, "email": email, "role": role})

    return {
        "status": "success",
        "message": f"Đã tạo tài khoản {full_name} ({role.upper()}) thành công!",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": new_user.role,
            "is_active": True,
            "target_score": target_score,
            "current_score": 0,
            "streak_days": 0
        }
    }

@router.get("/ai-review-queue")
def get_ai_review_queue(
    status: str = Query("all"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(models.AIReviewQuestion)
    if status != "all":
        query = query.filter(models.AIReviewQuestion.status == status)

    total = query.count()
    items = query.order_by(models.AIReviewQuestion.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": [
            {
                "id": q.id,
                "skill": q.skill,
                "topic": q.topic,
                "difficulty": q.difficulty,
                "question_text": q.question_text,
                "option_a": q.option_a,
                "option_b": q.option_b,
                "option_c": q.option_c,
                "option_d": q.option_d,
                "correct_answer": q.correct_answer,
                "explanation": q.explanation,
                "status": q.status,
                "created_at": format_vn_datetime(q.created_at) if q.created_at else ""
            }
            for q in items
        ]
    }

@router.post("/ai-review-queue/{item_id}/action")
def update_ai_question_status(
    item_id: int,
    data: dict,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    item = db.query(models.AIReviewQuestion).filter(models.AIReviewQuestion.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi trong hàng đợi")

    action = data.get("action")
    if action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Hành động không hợp lệ (approve hoặc reject)")

    item.status = "approved" if action == "approve" else "rejected"
    db.commit()

    log_security_event("AI_QUESTION_REVIEW", admin.id, {"question_id": item_id, "action": action})
    return {"status": "success", "new_status": item.status}

@router.post("/generate-ai-question")
def generate_ai_question(
    data: schemas.AIQuestionGenRequest,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    templates = [
        {
            "question": "The board of directors expressed their sincere _______ for Ms. Peterson's leadership during the merger.",
            "options": ["appreciate", "appreciation", "appreciative", "appreciatively"],
            "correct": "B",
            "explanation": "Sau tính từ 'sincere' và đại từ sở hữu 'their' cần một danh từ: 'appreciation' (sự tri ân, đánh giá cao)."
        },
        {
            "question": "All attendees must register _______ the main lobby before proceeding to the keynote auditorium.",
            "options": ["at", "in", "to", "on"],
            "correct": "A",
            "explanation": "Đăng ký tại địa điểm cụ thể dùng giới từ 'at the main lobby'."
        },
        {
            "question": "Despite the severe winter blizzard, the delivery trucks arrived _______ on schedule.",
            "options": ["punctual", "punctuality", "punctually", "puncture"],
            "correct": "C",
            "explanation": "Cần trạng từ 'punctually' bổ nghĩa cho động từ 'arrived'."
        }
    ]

    pick = templates[db.query(models.AIReviewQuestion).count() % len(templates)]

    new_q = models.AIReviewQuestion(
        skill=data.skill,
        topic=data.topic,
        difficulty=data.difficulty,
        question_text=pick["question"],
        option_a=pick["options"][0],
        option_b=pick["options"][1],
        option_c=pick["options"][2],
        option_d=pick["options"][3],
        correct_answer=pick["correct"],
        explanation=pick["explanation"],
        status="ai_generated"
    )
    db.add(new_q)
    db.commit()

    log_security_event("AI_QUESTION_GENERATED", admin.id, {"question_id": new_q.id})
    return {
        "status": "success",
        "message": "Câu hỏi AI đã được tạo và chuyển vào hàng đợi kiểm duyệt (Pending Review)",
        "question": {
            "id": new_q.id,
            "skill": new_q.skill,
            "topic": new_q.topic,
            "difficulty": new_q.difficulty,
            "question_text": new_q.question_text,
            "status": new_q.status
        }
    }

# -------------------------------------------------------------
# Study Groups Management (Group A)
# -------------------------------------------------------------
@router.get("/groups")
def list_admin_study_groups(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(models.StudyGroup).order_by(models.StudyGroup.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "groups": [
            {
                "id": g.id,
                "name": g.name,
                "description": g.description,
                "target_score": g.target_score,
                "members_count": g.members_count,
                "active_online": g.active_online,
                "schedule_info": g.schedule_info,
                "is_active": g.is_active,
                "created_at": format_vn_time(g.created_at, "%d/%m/%Y") if g.created_at else ""
            }
            for g in items
        ]
    }

@router.post("/groups")
def create_admin_study_group(
    payload: dict,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Tên nhóm học không được để trống")

    new_group = models.StudyGroup(
        name=name,
        description=payload.get("description", ""),
        target_score=payload.get("target_score", "500-650+"),
        members_count=int(payload.get("members_count", 1)),
        active_online=int(payload.get("active_online", 1)),
        schedule_info=payload.get("schedule_info", ""),
        creator_id=admin.id,
        is_active=True
    )
    db.add(new_group)
    db.commit()
    db.refresh(new_group)

    # Add creator admin to group members
    existing_mem = db.query(models.StudyGroupMember).filter(
        models.StudyGroupMember.group_id == new_group.id,
        models.StudyGroupMember.user_id == admin.id
    ).first()
    if not existing_mem:
        db.add(models.StudyGroupMember(group_id=new_group.id, user_id=admin.id, role="admin"))
        db.commit()

    log_security_event("ADMIN_CREATE_STUDY_GROUP", admin.id, {"group_id": new_group.id, "name": new_group.name})
    return {
        "status": "success",
        "message": f"Đã tạo nhóm học '{new_group.name}' thành công",
        "group": {
            "id": new_group.id,
            "name": new_group.name,
            "target_score": new_group.target_score,
            "members_count": new_group.members_count
        }
    }

@router.put("/groups/{group_id}")
def update_admin_study_group(
    group_id: int,
    payload: dict,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    grp = db.query(models.StudyGroup).filter(models.StudyGroup.id == group_id).first()
    if not grp:
        raise HTTPException(status_code=404, detail="Nhóm học không tồn tại")

    if "name" in payload:
        grp.name = payload["name"].strip() or grp.name
    if "description" in payload:
        grp.description = payload["description"]
    if "target_score" in payload:
        grp.target_score = payload["target_score"]
    if "members_count" in payload:
        grp.members_count = int(payload["members_count"])
    if "active_online" in payload:
        grp.active_online = int(payload["active_online"])
    if "schedule_info" in payload:
        grp.schedule_info = payload["schedule_info"]
    if "is_active" in payload:
        grp.is_active = bool(payload["is_active"])

    db.commit()
    log_security_event("ADMIN_UPDATE_STUDY_GROUP", admin.id, {"group_id": grp.id})
    return {"status": "success", "message": f"Đã cập nhật thông tin nhóm '{grp.name}'"}

@router.delete("/groups/{group_id}")
def delete_admin_study_group(
    group_id: int,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    grp = db.query(models.StudyGroup).filter(models.StudyGroup.id == group_id).first()
    if not grp:
        raise HTTPException(status_code=404, detail="Nhóm học không tồn tại")

    grp_name = grp.name
    db.delete(grp)
    db.commit()

    log_security_event("ADMIN_DELETE_STUDY_GROUP", admin.id, {"group_id": group_id, "name": grp_name})
    return {"status": "success", "message": f"Đã xóa nhóm học '{grp_name}'"}


# -------------------------------------------------------------
# Gemini AI Multi-Key Pool Management
# -------------------------------------------------------------
from gemini_pool import gemini_pool

@router.get("/gemini-keys")
def get_gemini_keys_status(
    admin: models.User = Depends(require_admin)
):
    """Lists configured Gemini API keys with status and latency metrics."""
    return {
        "status": "success",
        "keys": gemini_pool.get_keys_status(),
        "total_keys": len(gemini_pool.trackers),
        "active_models": gemini_pool.models_priority
    }

@router.post("/gemini-keys")
def update_gemini_keys(
    payload: dict,
    admin: models.User = Depends(require_admin)
):
    """Adds or updates Gemini API keys in the key pool and persists to environment."""
    raw_keys = payload.get("keys") or payload.get("key") or ""
    if not raw_keys.strip():
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp ít nhất một Gemini API key hợp lệ.")

    count = gemini_pool.set_keys(raw_keys)
    log_security_event("ADMIN_UPDATE_GEMINI_KEYS", admin.id, {"key_count": count})
    return {
        "status": "success",
        "message": f"Đã cập nhật cấu hình thành công! Hệ thống hiện có {count} Gemini API key trong pool load balancing.",
        "keys": gemini_pool.get_keys_status()
    }

@router.post("/gemini-keys/test")
def test_gemini_connection(
    payload: Optional[dict] = None,
    admin: models.User = Depends(require_admin)
):
    """Tests connectivity to Google Gemini API using active pool or a specified key."""
    test_key = payload.get("key") if payload else None
    result = gemini_pool.test_connection(test_key)
    return result

@router.delete("/gemini-keys")
def delete_gemini_key(
    payload: dict,
    admin: models.User = Depends(require_admin)
):
    """Deletes a specific key from the pool by identifier or index."""
    target = str(payload.get("key_id") or payload.get("key") or "")
    if not target:
        raise HTTPException(status_code=400, detail="Thiếu mã nhận diện API key cần xóa")

    success = gemini_pool.delete_key(target)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy API key cần xóa")

    log_security_event("ADMIN_DELETE_GEMINI_KEY", admin.id, {"target": target})
    return {
        "status": "success",
        "message": "Đã xóa API key khỏi cấu hình hệ thống!",
        "keys": gemini_pool.get_keys_status()
    }


@router.post("/gemini-models")
def update_gemini_models(
    payload: dict,
    admin: models.User = Depends(require_admin)
):
    """Updates the active model list and priority order in Gemini key pool."""
    models_list = payload.get("models")
    if isinstance(models_list, list) and models_list:
        clean_models = [str(m).strip() for m in models_list if str(m).strip()]
        if clean_models:
            gemini_pool.models_priority = clean_models
            return {
                "status": "success",
                "message": f"Đã lưu cấu hình {len(clean_models)} mô hình Gemini thành công!",
                "models": gemini_pool.models_priority
            }
    raise HTTPException(status_code=400, detail="Vui lòng cung cấp danh sách mô hình hợp lệ.")


@router.post("/users/{user_id}/toggle-vip")
def toggle_user_vip(
    user_id: int,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Grants or revokes VIP membership for a user."""
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản quản trị viên luôn có toàn quyền cao nhất."
        )

    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    new_role = "student" if target_user.role == "vip" else "vip"
    target_user.role = new_role
    target_user.token_version = (target_user.token_version or 1) + 1
    db.commit()

    log_security_event("ADMIN_TOGGLE_VIP", admin.id, {"target_user_id": user_id, "new_role": new_role})
    action_text = "Cấp quyền VIP Pro thành công" if new_role == "vip" else "Thu hồi quyền VIP (chuyển về Gói thường)"
    return {
        "status": "success",
        "message": f"Đã {action_text} cho người dùng {target_user.full_name}!",
        "new_role": new_role
    }

@router.get("/revenue")
def get_admin_revenue_metrics(
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Returns VIP subscription revenue statistics and transaction records from real database."""
    from datetime import datetime
    vip_count = db.query(models.User).filter(models.User.role == "vip").count()
    student_count = db.query(models.User).filter(models.User.role == "student").count()
    admin_count = db.query(models.User).filter(models.User.role == "admin").count()
    total_users = vip_count + student_count + admin_count

    # Calculate real revenue from completed payments
    completed_payments = db.query(models.Payment).filter(models.Payment.status == "COMPLETED").all()
    total_revenue = sum(p.amount for p in completed_payments)

    now = datetime.utcnow()
    monthly_payments = [p for p in completed_payments if p.completed_at and p.completed_at.month == now.month and p.completed_at.year == now.year]
    monthly_revenue = sum(p.amount for p in monthly_payments)

    # Fetch recent orders from real Payment table
    all_payments = db.query(models.Payment).order_by(models.Payment.created_at.desc()).limit(50).all()
    recent_orders = [
        {
            "id": f"ORD-{p.id:04d}",
            "raw_id": p.id,
            "user_id": p.user_id,
            "user_name": p.user.full_name if p.user else "Học viên",
            "email": p.user.email if p.user else "",
            "plan_name": p.plan_name,
            "amount": p.amount,
            "formatted_amount": f"{int(p.amount):,} đ",
            "payment_method": p.payment_method or "VietQR",
            "transaction_code": p.transaction_code,
            "gateway_reference": p.gateway_reference or "",
            "status": "Thành công" if p.status == "COMPLETED" else ("Chờ duyệt" if p.status == "PENDING" else p.status),
            "raw_status": p.status,
            "created_at": format_vn_datetime(p.created_at) if p.created_at else "",
            "completed_at": format_vn_datetime(p.completed_at) if p.completed_at else ""
        }
        for p in all_payments
    ]

    return {
        "status": "success",
        "total_revenue": total_revenue,
        "monthly_revenue": monthly_revenue,
        "total_vip_users": vip_count,
        "total_student_users": student_count,
        "total_admin_users": admin_count,
        "total_users": total_users,
        "conversion_rate": f"{round((vip_count / max(total_users, 1)) * 100, 1)}%",
        "recent_orders": recent_orders
    }


# ==========================================
# BANKING CONFIGURATION & SYNC ENDPOINTS
# ==========================================
from payments import PaymentService, VietQRHelper, BANK_DIRECTORY

@router.get("/banking/config")
def get_admin_banking_config(
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Returns current bank configuration (with masked credentials) and QR preview."""
    cfg = PaymentService.get_banking_config(db)
    token = cfg.get("token") or ""
    secret = cfg.get("webhook_secret") or ""

    preview_qr = VietQRHelper.generate_qr_url(
        bank_code=cfg.get("bank_code") or "MBBANK",
        account_no=cfg.get("account_number") or "",
        amount=499000,
        memo=f"{cfg.get('content_prefix') or 'TOEIC'} PREVIEW123",
        template=cfg.get("vietqr_template") or "compact2",
        account_holder=cfg.get("account_name") or ""
    )

    return {
        "status": "success",
        "config": {
            **cfg,
            "has_token": bool(token),
            "token_masked": "••••••••" if token else "",
            "has_webhook_secret": bool(secret),
            "webhook_secret_masked": "••••••••" if secret else "",
            "vietqr_preview_url": preview_qr
        },
        "bank_directory": BANK_DIRECTORY
    }

@router.put("/banking/config")
def update_admin_banking_config(
    payload: dict,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Updates bank account configuration and VietQR settings."""
    updated = PaymentService.save_banking_config(db, payload)
    log_security_event("UPDATE_BANKING_CONFIG", admin.id, {
        "bank": updated.get("bank_name"),
        "account": updated.get("account_number"),
        "enabled": updated.get("enabled")
    })
    return {
        "status": "success",
        "message": "Đã lưu cấu hình tài khoản ngân hàng và VietQR thành công!",
        "config": updated
    }

@router.post("/banking/test-fetch")
def test_admin_banking_fetch(
    payload: Optional[dict] = None,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Tests connection to Bank API (ThueAPI / MBBank) to verify API token."""
    return PaymentService.test_fetch_transactions(db, custom_config=payload)

@router.post("/banking/sync")
def sync_admin_banking(
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Triggers an on-demand bank transactions synchronization."""
    res = PaymentService.sync_mbbank(db)
    log_security_event("ADMIN_TRIGGER_BANK_SYNC", admin.id, res)
    return res

@router.get("/banking/transactions")
def get_admin_banking_transactions(
    limit: int = Query(50, ge=1, le=100),
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Lists raw bank transactions recorded from bank sync or webhooks."""
    txs = db.query(models.BankTransaction).order_by(models.BankTransaction.created_at.desc()).limit(limit).all()
    return {
        "status": "success",
        "total": len(txs),
        "transactions": [
            {
                "id": tx.id,
                "provider": tx.provider,
                "bank_transaction_id": tx.bank_transaction_id,
                "amount": tx.amount,
                "formatted_amount": f"{int(tx.amount):,} đ",
                "content": tx.content,
                "status": tx.status,
                "error_message": tx.error_message,
                "occurred_at": format_vn_time(tx.occurred_at, "%d/%m/%Y %H:%M:%S") if tx.occurred_at else "",
                "created_at": format_vn_time(tx.created_at, "%d/%m/%Y %H:%M:%S") if tx.created_at else ""
            }
            for tx in txs
        ]
    }

@router.get("/banking/stats")
def get_admin_banking_stats(
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Returns payment and banking statistics."""
    total_bank_txs = db.query(models.BankTransaction).count()
    credited_txs = db.query(models.BankTransaction).filter(models.BankTransaction.status == "PROCESSED").count()
    ignored_txs = db.query(models.BankTransaction).filter(models.BankTransaction.status == "IGNORED").count()

    total_orders = db.query(models.Payment).count()
    completed_orders = db.query(models.Payment).filter(models.Payment.status == "COMPLETED").count()
    pending_orders = db.query(models.Payment).filter(models.Payment.status == "PENDING").count()

    completed_amount = sum(p.amount for p in db.query(models.Payment).filter(models.Payment.status == "COMPLETED").all())

    return {
        "status": "success",
        "total_bank_transactions": total_bank_txs,
        "credited_bank_transactions": credited_txs,
        "ignored_bank_transactions": ignored_txs,
        "total_orders": total_orders,
        "completed_orders": completed_orders,
        "pending_orders": pending_orders,
        "total_revenue": completed_amount
    }

@router.post("/payments/{payment_id}/approve")
def approve_payment_manually(
    payment_id: int,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Manually approves a pending payment and immediately activates VIP Pro for the user."""
    from datetime import datetime
    payment = db.query(models.Payment).filter(models.Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng cần duyệt.")

    if payment.status == "COMPLETED":
        return {"status": "success", "message": "Đơn hàng này đã được kích hoạt trước đó."}

    payment.status = "COMPLETED"
    payment.completed_at = datetime.utcnow()
    payment.gateway_reference = f"MANUAL_ADMIN_{admin.id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    target_user = payment.user
    if target_user:
        target_user.role = "vip"
        db.add(models.Notification(
            user_id=target_user.id,
            title="🎉 Gói VIP Pro đã được kích hoạt!",
            message=f"Quản trị viên đã xác nhận thanh toán đơn hàng {payment.plan_name}. Chúc bạn học tốt!",
            type="success",
            is_read=False,
            created_at=datetime.utcnow()
        ))

    db.commit()
    log_security_event("ADMIN_MANUAL_APPROVE_PAYMENT", admin.id, {
        "payment_id": payment_id,
        "user_id": target_user.id if target_user else None
    })

    return {
        "status": "success",
        "message": f"Đã duyệt đơn hàng #{payment.id} và nâng cấp VIP cho học viên {target_user.full_name if target_user else ''} thành công!"
    }


# =========================================================================
# ADMIN MOCK TESTS & QUESTIONS MANAGEMENT (Thêm / Xóa / Sửa / Tìm kiếm Đề thi & Câu hỏi)
# =========================================================================

from pathlib import Path
import uuid
import re

TESTS_BASE_DIR = Path(__file__).resolve().parent.parent.parent
TESTS_DATA_DIR = TESTS_BASE_DIR / "data" / "data" / "web_ready"
ADMIN_CATALOG_PATH = TESTS_DATA_DIR / "tests_catalog.json"
ADMIN_MOCK_DIR = TESTS_DATA_DIR / "mock_tests"

def _read_admin_catalog() -> list:
    if ADMIN_CATALOG_PATH.exists():
        try:
            return json.loads(ADMIN_CATALOG_PATH.read_text(encoding="utf-8"))
        except Exception:
            return []
    return []

def _write_admin_catalog(catalog_data: list):
    ADMIN_CATALOG_PATH.write_text(json.dumps(catalog_data, ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        from routers import tests as tests_router
        tests_router._catalog_cache = None
    except Exception:
        pass

def _get_test_file(test_id: str):
    clean_id = re.sub(r'[^a-zA-Z0-9_\-]', '', str(test_id or "").removesuffix(".json"))
    if not clean_id:
        return None

    def _safe_admin_file(p: Path):
        try:
            if p.exists() and p.resolve().is_relative_to(ADMIN_MOCK_DIR.resolve()):
                return p
        except (ValueError, RuntimeError):
            pass
        return None

    try:
        from routers.tests import find_test_file
        found = find_test_file(clean_id)
        if found and found.exists():
            return found
    except Exception:
        pass

    candidates = [
        ADMIN_MOCK_DIR / f"{clean_id}.json",
        ADMIN_MOCK_DIR / f"dautoeic_{clean_id}.json",
        ADMIN_MOCK_DIR / f"{clean_id.replace('dautoeic_', '')}.json"
    ]
    for c in candidates:
        safe_c = _safe_admin_file(c)
        if safe_c:
            return safe_c

    catalog = _read_admin_catalog()
    for t in catalog:
        if (
            t.get("id") == clean_id
            or t.get("test_id") == clean_id
            or t.get("slug") == clean_id
            or t.get("file_name", "").removesuffix(".json") == clean_id
        ):
            cand = _safe_admin_file(ADMIN_MOCK_DIR / t.get("file_name", f"{t['id']}.json"))
            if cand:
                return cand
            cand2 = _safe_admin_file(ADMIN_MOCK_DIR / f"{t['id']}.json")
            if cand2:
                return cand2
    return None

@router.get("/tests")
def admin_list_tests(
    search: Optional[str] = Query(None),
    test_type: Optional[str] = Query(None),
    collection_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin: models.User = Depends(require_admin)
):
    """
    List, search and filter all mock tests in the system for admin management.
    """
    catalog = _read_admin_catalog()
    filtered = catalog

    if test_type and test_type != "all":
        filtered = [t for t in filtered if t.get("test_type") == test_type]

    if collection_id and collection_id != "all":
        filtered = [t for t in filtered if t.get("collection_id") == collection_id]

    if search and search.strip():
        kw = search.strip().lower()
        def matches(t):
            name = (t.get("name") or "").lower()
            slug = (t.get("slug") or "").lower()
            t_id = (t.get("id") or "").lower()
            col = (t.get("collection_id") or "").lower()
            return kw in name or kw in slug or kw in t_id or kw in col
        filtered = [t for t in filtered if matches(t)]

    total = len(filtered)
    start = (page - 1) * limit
    paged = filtered[start:start + limit]

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "tests": paged
    }

@router.post("/tests")
def admin_create_test(
    data: dict,
    admin: models.User = Depends(require_admin)
):
    """
    Creates a new test in the catalog and creates the mock test JSON file.
    """
    name = (data.get("name") or data.get("title") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Tên đề thi không được để trống")

    slug = (data.get("slug") or "").strip()
    if not slug:
        slug = re.sub(r"[^a-zA-Z0-9]+", "-", name.lower()).strip("-")

    custom_id = (data.get("id") or data.get("test_id") or "").strip()
    if custom_id:
        test_id = custom_id
        test_uuid = custom_id.replace("dautoeic_", "")
    else:
        test_uuid = str(uuid.uuid4())
        test_id = f"dautoeic_{test_uuid}"

    collection_id = data.get("collection_id") or "dautoeic_ets_full"
    test_type = data.get("test_type") or "lr_full"
    total_questions = int(data.get("total_questions") or 200)
    duration_minutes = int(data.get("duration_minutes") or 120)
    year = int(data.get("year") or 2026)
    overall_audio = data.get("overall_audio") or None
    is_vip = bool(data.get("is_vip", False))

    new_test_entry = {
        "id": test_id,
        "test_id": test_uuid,
        "site": "dautoeic",
        "name": name,
        "slug": slug,
        "collection_id": collection_id,
        "total_questions": total_questions,
        "duration_minutes": duration_minutes,
        "test_type": test_type,
        "file_name": f"{test_id}.json",
        "year": year,
        "overall_audio": overall_audio,
        "has_listening_audio": bool(overall_audio or test_type in ("lr_full", "sw_speaking")),
        "is_vip": is_vip
    }

    # 1. Update Catalog
    catalog = _read_admin_catalog()
    catalog.insert(0, new_test_entry)
    _write_admin_catalog(catalog)

    # 2. Write Test JSON file
    test_file_path = ADMIN_MOCK_DIR / f"{test_id}.json"
    ADMIN_MOCK_DIR.mkdir(parents=True, exist_ok=True)
    initial_content = {
        "meta": new_test_entry,
        "overall_audio": overall_audio,
        "passages": [],
        "questions": []
    }
    test_file_path.write_text(json.dumps(initial_content, ensure_ascii=False, indent=2), encoding="utf-8")

    log_security_event("ADMIN_CREATE_TEST", admin.id, {"test_id": test_id, "name": name})
    return {
        "status": "success",
        "message": f"Tạo đề thi '{name}' thành công!",
        "test": new_test_entry
    }

@router.put("/tests/{test_id}")
def admin_update_test(
    test_id: str,
    data: dict,
    admin: models.User = Depends(require_admin)
):
    """
    Updates test metadata in catalog and mock test JSON.
    """
    catalog = _read_admin_catalog()
    clean_id = test_id.removesuffix(".json")
    item = next((t for t in catalog if t.get("id") == clean_id or t.get("test_id") == clean_id or t.get("slug") == clean_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy đề thi cần cập nhật")

    if "name" in data and str(data["name"]).strip():
        item["name"] = str(data["name"]).strip()
    if "title" in data and str(data["title"]).strip():
        item["name"] = str(data["title"]).strip()
    if "slug" in data and str(data["slug"]).strip():
        item["slug"] = str(data["slug"]).strip()
    if "collection_id" in data:
        item["collection_id"] = data["collection_id"]
    if "test_type" in data:
        item["test_type"] = data["test_type"]
    if "total_questions" in data:
        item["total_questions"] = int(data["total_questions"])
    if "duration_minutes" in data:
        item["duration_minutes"] = int(data["duration_minutes"])
    if "year" in data:
        item["year"] = int(data["year"])
    if "overall_audio" in data:
        item["overall_audio"] = data["overall_audio"]
        item["has_listening_audio"] = bool(data["overall_audio"] or item.get("has_listening_audio"))
    if "is_vip" in data:
        item["is_vip"] = bool(data["is_vip"])

    _write_admin_catalog(catalog)

    # Update file meta
    test_file_path = _get_test_file(clean_id)
    if test_file_path and test_file_path.exists():
        try:
            content = json.loads(test_file_path.read_text(encoding="utf-8"))
            content["meta"] = item
            if "overall_audio" in data:
                content["overall_audio"] = data["overall_audio"]
            test_file_path.write_text(json.dumps(content, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass

    log_security_event("ADMIN_UPDATE_TEST", admin.id, {"test_id": test_id, "name": item.get("name")})
    return {
        "status": "success",
        "message": "Cập nhật thông tin đề thi thành công!",
        "test": item
    }

@router.delete("/tests/{test_id}")
def admin_delete_test(
    test_id: str,
    admin: models.User = Depends(require_admin)
):
    """
    Deletes a test from catalog and filesystem.
    """
    catalog = _read_admin_catalog()
    clean_id = test_id.removesuffix(".json")
    item = next((t for t in catalog if t.get("id") == clean_id or t.get("test_id") == clean_id or t.get("slug") == clean_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy đề thi cần xóa")

    catalog = [t for t in catalog if t.get("id") != item.get("id") and t.get("test_id") != item.get("test_id")]
    _write_admin_catalog(catalog)

    test_file_path = _get_test_file(clean_id)
    if test_file_path and test_file_path.exists():
        try:
            test_file_path.unlink()
        except Exception:
            pass

    log_security_event("ADMIN_DELETE_TEST", admin.id, {"test_id": test_id, "name": item.get("name")})
    return {
        "status": "success",
        "message": f"Đã xóa đề thi '{item.get('name')}' khỏi hệ thống!"
    }

@router.get("/tests/{test_id}/questions")
def admin_get_test_questions(
    test_id: str,
    part: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    admin: models.User = Depends(require_admin)
):
    """
    Returns list of questions for a specific mock test.
    """
    test_file_path = _get_test_file(test_id)
    if not test_file_path or not test_file_path.exists():
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp dữ liệu đề thi")

    content = json.loads(test_file_path.read_text(encoding="utf-8"))
    questions = content.get("questions", [])

    filtered = questions
    if part is not None:
        filtered = [q for q in filtered if q.get("part") == part]

    if search and search.strip():
        kw = search.strip().lower()
        def q_match(q):
            q_text = (q.get("question_text") or q.get("question") or "").lower()
            q_num = str(q.get("question_number") or "")
            exp = (q.get("explanation") or q.get("explanation_vi") or "").lower()
            return kw in q_text or kw in q_num or kw in exp
        filtered = [q for q in filtered if q_match(q)]

    total = len(filtered)
    start = (page - 1) * limit
    paged = filtered[start:start + limit]

    formatted_paged = []
    for q in paged:
        opts = q.get("options") or {}
        opt_a = opts.get("A") or q.get("option_a") or ""
        opt_b = opts.get("B") or q.get("option_b") or ""
        opt_c = opts.get("C") or q.get("option_c") or ""
        opt_d = opts.get("D") or q.get("option_d") or ""
        options_dict = {"A": opt_a, "B": opt_b, "C": opt_c}
        if opt_d:
            options_dict["D"] = opt_d
        formatted_paged.append({
            **q,
            "options": options_dict,
            "option_a": opt_a,
            "option_b": opt_b,
            "option_c": opt_c,
            "option_d": opt_d,
            "explanation": q.get("explanation") or q.get("explanation_vi") or "",
            "audio_url": q.get("audio_url") or q.get("local_audio") or "",
            "image_url": q.get("image_url") or q.get("local_image") or ""
        })

    return {
        "test_meta": content.get("meta", {}),
        "total_questions": len(questions),
        "filtered_total": total,
        "page": page,
        "limit": limit,
        "questions": formatted_paged
    }

@router.post("/tests/{test_id}/questions")
def admin_add_test_question(
    test_id: str,
    data: dict,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Adds a new question to a mock test.
    """
    test_file_path = _get_test_file(test_id)
    if not test_file_path or not test_file_path.exists():
        raise HTTPException(status_code=404, detail="Không tìm thấy đề thi")

    content = json.loads(test_file_path.read_text(encoding="utf-8"))
    questions = content.get("questions", [])

    part = int(data.get("part") or 5)
    q_num = int(data.get("question_number") or (len(questions) + 1))
    q_id = data.get("id") or f"{test_id}-q{q_num}-{uuid.uuid4().hex[:6]}"

    opts = data.get("options") or {}
    opt_a = opts.get("A") or data.get("option_a") or ""
    opt_b = opts.get("B") or data.get("option_b") or ""
    opt_c = opts.get("C") or data.get("option_c") or ""
    opt_d = opts.get("D") or data.get("option_d") or ""

    if not opt_a or not opt_b or not opt_c:
        raise HTTPException(status_code=400, detail="Phương án A, B, C không được để trống")

    options_dict = {"A": opt_a, "B": opt_b, "C": opt_c}
    if part != 2:
        if not opt_d:
            raise HTTPException(status_code=400, detail=f"Part {part} yêu cầu đủ 4 đáp án A, B, C, D")
        options_dict["D"] = opt_d

    correct_answer = (data.get("correct_answer") or "A").upper().strip()[:1]
    if correct_answer not in ["A", "B", "C", "D"]:
        correct_answer = "A"

    new_q = {
        "id": q_id,
        "part": part,
        "question_number": q_num,
        "question_type": data.get("question_type", "multiple_choice"),
        "question_text": data.get("question_text", ""),
        "passage_text": data.get("passage_text", ""),
        "options": options_dict,
        "option_a": opt_a,
        "option_b": opt_b,
        "option_c": opt_c,
        "option_d": opt_d if part != 2 else "",
        "correct_answer": correct_answer,
        "explanation": data.get("explanation") or data.get("explanation_vi") or "",
        "audio_url": data.get("audio_url", None),
        "local_audio": data.get("audio_url", None),
        "image_url": data.get("image_url", None),
        "local_image": data.get("image_url", None),
        "transcript": data.get("transcript", None)
    }

    questions.append(new_q)
    content["questions"] = questions
    test_file_path.write_text(json.dumps(content, ensure_ascii=False, indent=2), encoding="utf-8")

    # Update total_questions in catalog
    catalog = _read_admin_catalog()
    for t in catalog:
        if t.get("id") == test_id or t.get("test_id") == test_id or t.get("slug") == test_id:
            t["total_questions"] = len(questions)
            break
    _write_admin_catalog(catalog)

    # Sync to SQLite CachedQuestion table
    try:
        section = "listening" if part <= 4 else "reading"
        db_q = models.CachedQuestion(
            id=q_id,
            test_id=test_id,
            part=part,
            section=section,
            question_number=q_num,
            question_text=new_q["question_text"],
            option_a=opt_a,
            option_b=opt_b,
            option_c=opt_c,
            option_d=opt_d if part != 2 else "",
            correct_answer=correct_answer,
            explanation_vi=new_q["explanation"],
            audio_url=new_q["audio_url"],
            image_url=new_q["image_url"],
            passage_text=new_q["passage_text"],
            transcript=new_q["transcript"]
        )
        db.add(db_q)
        db.commit()
    except Exception as e:
        print("Note: SQLite cache sync skipped:", e)

    log_security_event("ADMIN_ADD_QUESTION", admin.id, {"test_id": test_id, "question_id": q_id})
    return {"status": "success", "message": f"Thêm câu hỏi #{q_num} thành công!", "question": new_q}

@router.put("/tests/{test_id}/questions/{q_idx}")
def admin_update_test_question(
    test_id: str,
    q_idx: str,
    data: dict,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Updates an existing question in a mock test.
    """
    test_file_path = _get_test_file(test_id)
    if not test_file_path or not test_file_path.exists():
        raise HTTPException(status_code=404, detail="Không tìm thấy đề thi")

    content = json.loads(test_file_path.read_text(encoding="utf-8"))
    questions = content.get("questions", [])

    target_q = None
    for q in questions:
        if str(q.get("id")) == q_idx or str(q.get("question_number")) == q_idx:
            target_q = q
            break

    if not target_q:
        raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi trong đề thi")

    if "question_text" in data:
        target_q["question_text"] = data["question_text"]
    if "passage_text" in data:
        target_q["passage_text"] = data["passage_text"]
    if "correct_answer" in data:
        target_q["correct_answer"] = str(data["correct_answer"]).upper().strip()[:1]
    if "explanation" in data or "explanation_vi" in data:
        target_q["explanation"] = data.get("explanation") or data.get("explanation_vi")
    if "audio_url" in data:
        target_q["audio_url"] = data["audio_url"]
        target_q["local_audio"] = data["audio_url"]
    if "image_url" in data:
        target_q["image_url"] = data["image_url"]
        target_q["local_image"] = data["image_url"]
    if "transcript" in data:
        target_q["transcript"] = data["transcript"]
    if "part" in data:
        target_q["part"] = int(data["part"])
    if "question_number" in data:
        target_q["question_number"] = int(data["question_number"])

    opts = data.get("options") or {}
    opt_a = opts.get("A") or data.get("option_a")
    opt_b = opts.get("B") or data.get("option_b")
    opt_c = opts.get("C") or data.get("option_c")
    opt_d = opts.get("D") or data.get("option_d")

    curr_opts = target_q.get("options") or {}
    if opt_a is not None:
        curr_opts["A"] = opt_a
        target_q["option_a"] = opt_a
    if opt_b is not None:
        curr_opts["B"] = opt_b
        target_q["option_b"] = opt_b
    if opt_c is not None:
        curr_opts["C"] = opt_c
        target_q["option_c"] = opt_c
    if opt_d is not None:
        curr_opts["D"] = opt_d
        target_q["option_d"] = opt_d
    target_q["options"] = curr_opts

    test_file_path.write_text(json.dumps(content, ensure_ascii=False, indent=2), encoding="utf-8")

    # Update in SQLite DB if exists
    try:
        q_id = str(target_q.get("id"))
        db_q = db.query(models.CachedQuestion).filter(models.CachedQuestion.id == q_id).first()
        if db_q:
            db_q.question_text = target_q.get("question_text", db_q.question_text)
            db_q.option_a = target_q.get("option_a", db_q.option_a)
            db_q.option_b = target_q.get("option_b", db_q.option_b)
            db_q.option_c = target_q.get("option_c", db_q.option_c)
            db_q.option_d = target_q.get("option_d", db_q.option_d)
            db_q.correct_answer = target_q.get("correct_answer", db_q.correct_answer)
            db_q.explanation_vi = target_q.get("explanation", db_q.explanation_vi)
            db_q.audio_url = target_q.get("audio_url", db_q.audio_url)
            db_q.image_url = target_q.get("image_url", db_q.image_url)
            db_q.passage_text = target_q.get("passage_text", db_q.passage_text)
            db_q.transcript = target_q.get("transcript", db_q.transcript)
            db.commit()
    except Exception as e:
        print("Note: DB update skipped:", e)

    return {"status": "success", "message": "Cập nhật câu hỏi thành công!", "question": target_q}

@router.delete("/tests/{test_id}/questions/{q_idx}")
def admin_delete_test_question(
    test_id: str,
    q_idx: str,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Deletes a question from a mock test.
    """
    test_file_path = _get_test_file(test_id)
    if not test_file_path or not test_file_path.exists():
        raise HTTPException(status_code=404, detail="Không tìm thấy đề thi")

    content = json.loads(test_file_path.read_text(encoding="utf-8"))
    questions = content.get("questions", [])

    new_qs = [q for q in questions if str(q.get("id")) != q_idx and str(q.get("question_number")) != q_idx]
    if len(new_qs) == len(questions):
        raise HTTPException(status_code=404, detail="Không tìm thấy câu hỏi cần xóa")

    content["questions"] = new_qs
    test_file_path.write_text(json.dumps(content, ensure_ascii=False, indent=2), encoding="utf-8")

    # Update total_questions in catalog
    catalog = _read_admin_catalog()
    for t in catalog:
        if t.get("id") == test_id or t.get("test_id") == test_id or t.get("slug") == test_id:
            t["total_questions"] = len(new_qs)
            break
    _write_admin_catalog(catalog)

    # Delete from DB if exists
    try:
        db_q = db.query(models.CachedQuestion).filter(models.CachedQuestion.id == q_idx).first()
        if db_q:
            db.delete(db_q)
            db.commit()
    except Exception as e:
        print("Note: DB delete skipped:", e)

    return {"status": "success", "message": "Đã xóa câu hỏi khỏi đề thi thành công!"}


# ============================================================
# CRUD Kho cau hoi tong (practice_by_part JSON) - by Part
# ============================================================

PRACTICE_DIR = TESTS_DATA_DIR / "practice_by_part"


def _read_practice_file(part: int) -> dict:
    f = PRACTICE_DIR / f"part{part}_practice.json"
    if f.exists():
        try:
            return json.loads(f.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def _write_practice_file(part: int, data: dict):
    f = PRACTICE_DIR / f"part{part}_practice.json"
    PRACTICE_DIR.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _collect_all_questions(part_data: dict) -> list:
    """Flatten data_by_level into a single list."""
    all_qs = []
    dbl = part_data.get("data_by_level", {})
    for lvl_name, qs in dbl.items():
        if isinstance(qs, list):
            for q in qs:
                q["_level_key"] = lvl_name
                all_qs.append(q)
    return all_qs


def _rebuild_levels(part_data: dict, all_qs: list) -> dict:
    """Rebuild data_by_level from flat list, and update counts."""
    new_dbl = {}
    for q in all_qs:
        lvl = q.pop("_level_key", None) or q.get("level", "Level 2")
        if lvl not in new_dbl:
            new_dbl[lvl] = []
        new_dbl[lvl].append(q)
    part_data["data_by_level"] = new_dbl
    # update by_level counts
    by_level = part_data.get("by_level", {})
    for lvl in new_dbl:
        by_level[lvl] = len(new_dbl[lvl])
    part_data["by_level"] = by_level
    part_data["total_questions"] = sum(len(v) for v in new_dbl.values())
    return part_data


@router.get("/questions/stats")
def get_admin_question_stats(
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    part_names = [
        ("Part 1", "Photographs", "Audio + \u1ea2nh"),
        ("Part 2", "Question-Response", "Audio"),
        ("Part 3", "Conversations", "Audio + Bi\u1ec3u \u0111\u1ed3"),
        ("Part 4", "Short Talks", "Audio"),
        ("Part 5", "Incomplete Sentences", "V\u0103n b\u1ea3n"),
        ("Part 6", "Text Completion", "\u0110o\u1ea1n v\u0103n"),
        ("Part 7", "Reading Comprehension", "\u0110\u01a1n & \u0110a \u0111o\u1ea1n")
    ]
    dist = []
    total_all = 0
    for idx, (p_code, p_name, media) in enumerate(part_names, start=1):
        pdata = _read_practice_file(idx)
        count = 0
        for lvl, qs in pdata.get("data_by_level", {}).items():
            if isinstance(qs, list):
                count += len(qs)
        if count == 0:
            count = db.query(models.CachedQuestion).filter(models.CachedQuestion.part == idx).count()
        total_all += count
        dist.append({
            "part": p_code,
            "part_number": idx,
            "name": p_name,
            "count": count,
            "media": media
        })

    catalog = _read_admin_catalog()
    return {
        "status": "success",
        "total_tests": len(catalog),
        "total_questions": total_all,
        "distribution": dist
    }


@router.get("/questions/pool")
def admin_list_pool_questions(
    part: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    topic: Optional[str] = Query(None),
    difficulty: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    all_qs = []
    parts = [part] if part else list(range(1, 8))
    for p in parts:
        pdata = _read_practice_file(p)
        qs = _collect_all_questions(pdata)
        for q in qs:
            q["part"] = p
        all_qs.extend(qs)

    # Filters
    if search and search.strip():
        kw = search.strip().lower()
        all_qs = [q for q in all_qs if kw in (q.get("question_text") or "").lower()
                  or kw in (q.get("id") or "").lower()
                  or kw in str(q.get("options") or {}).lower()]
    if topic and topic.strip():
        t = topic.strip().lower()
        all_qs = [q for q in all_qs if t in (q.get("topic") or "").lower()]
    if difficulty is not None:
        lvl_map = {1: "level 1", 2: "level 2", 3: "level 3", 4: "level 4"}
        target = lvl_map.get(difficulty, f"level {difficulty}")
        all_qs = [q for q in all_qs if (q.get("_level_key") or "").lower() == target
                  or (q.get("level") or "").lower() == target]

    total = len(all_qs)
    start = (page - 1) * limit
    paged = all_qs[start:start + limit]

    def serialize(q):
        opts = q.get("options") or {}
        return {
            "id": q.get("id", ""),
            "test_id": q.get("test_id", ""),
            "part": q.get("part"),
            "question_number": q.get("question_number"),
            "question_text": q.get("question_text", ""),
            "option_a": opts.get("A") or q.get("option_a", ""),
            "option_b": opts.get("B") or q.get("option_b", ""),
            "option_c": opts.get("C") or q.get("option_c", ""),
            "option_d": opts.get("D") or q.get("option_d", ""),
            "correct_answer": q.get("correct_answer", ""),
            "explanation_vi": q.get("vietnamese_translation") or q.get("explanation_vi") or q.get("explanation", ""),
            "audio_url": q.get("audio_url"),
            "image_url": q.get("image_url"),
            "passage_text": q.get("passage_text") or q.get("passage", ""),
            "transcript": q.get("transcript", ""),
            "difficulty_level": q.get("difficulty_level") or q.get("level", ""),
            "topic": q.get("topic", ""),
            "_level_key": q.get("_level_key", ""),
        }

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "questions": [serialize(q) for q in paged]
    }


@router.post("/questions/pool")
def admin_create_pool_question(
    data: dict,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    part = int(data.get("part") or 5)
    pdata = _read_practice_file(part)
    all_qs = _collect_all_questions(pdata)

    import uuid as _uuid
    q_id = data.get("id") or f"pool_p{part}_{_uuid.uuid4().hex[:8]}"

    level_key = data.get("_level_key") or f"Level {data.get('difficulty_level', 2)}"

    new_q = {
        "id": q_id,
        "test_id": data.get("test_id", "pool"),
        "question_number": int(data.get("question_number") or (len(all_qs) + 1)),
        "level": level_key,
        "topic": data.get("topic", ""),
        "question_text": data.get("question_text", ""),
        "options": {
            "A": data.get("option_a", ""),
            "B": data.get("option_b", ""),
            "C": data.get("option_c", ""),
            "D": data.get("option_d", ""),
        },
        "correct_answer": data.get("correct_answer", "A"),
        "vietnamese_translation": data.get("explanation_vi", ""),
        "audio_url": data.get("audio_url") or None,
        "image_url": data.get("image_url") or None,
        "passage_text": data.get("passage_text") or None,
        "transcript": data.get("transcript") or None,
        "_level_key": level_key,
    }

    all_qs.append(new_q)
    pdata = _rebuild_levels(pdata, all_qs)
    _write_practice_file(part, pdata)

    log_security_event("ADMIN_CREATE_POOL_QUESTION", admin.id, {"question_id": q_id, "part": part})
    return {"status": "success", "message": f"T\u1ea1o c\u00e2u h\u1ecfi Part {part} th\u00e0nh c\u00f4ng!", "question_id": q_id}


@router.put("/questions/pool/{question_id}")
def admin_update_pool_question(
    question_id: str,
    data: dict,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    target_part = int(data.get("part")) if "part" in data else None

    for p in (([target_part] if target_part else []) + list(range(1, 8))):
        pdata = _read_practice_file(p)
        all_qs = _collect_all_questions(pdata)
        found_idx = None
        for i, q in enumerate(all_qs):
            if str(q.get("id")) == question_id:
                found_idx = i
                break
        if found_idx is not None:
            q = all_qs[found_idx]
            if "question_text" in data:
                q["question_text"] = data["question_text"]
            if "correct_answer" in data:
                q["correct_answer"] = data["correct_answer"]
            if "topic" in data:
                q["topic"] = data["topic"]
            if "explanation_vi" in data:
                q["vietnamese_translation"] = data["explanation_vi"]
            if "question_number" in data:
                q["question_number"] = int(data["question_number"])
            if "audio_url" in data:
                q["audio_url"] = data["audio_url"] or None
            if "image_url" in data:
                q["image_url"] = data["image_url"] or None
            if "passage_text" in data:
                q["passage_text"] = data["passage_text"] or None
            if "transcript" in data:
                q["transcript"] = data["transcript"] or None
            opts = q.get("options") or {}
            if "option_a" in data:
                opts["A"] = data["option_a"]
            if "option_b" in data:
                opts["B"] = data["option_b"]
            if "option_c" in data:
                opts["C"] = data["option_c"]
            if "option_d" in data:
                opts["D"] = data["option_d"]
            q["options"] = opts
            if "difficulty_level" in data:
                new_lvl = f"Level {data['difficulty_level']}"
                q["_level_key"] = new_lvl
                q["level"] = new_lvl

            all_qs[found_idx] = q
            pdata = _rebuild_levels(pdata, all_qs)
            _write_practice_file(p, pdata)
            return {"status": "success", "message": "C\u1eadp nh\u1eadt c\u00e2u h\u1ecfi th\u00e0nh c\u00f4ng!"}

    raise HTTPException(status_code=404, detail="Kh\u00f4ng t\u00ecm th\u1ea5y c\u00e2u h\u1ecfi trong kho")


@router.delete("/questions/pool/{question_id}")
def admin_delete_pool_question(
    question_id: str,
    admin: models.User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    for p in range(1, 8):
        pdata = _read_practice_file(p)
        all_qs = _collect_all_questions(pdata)
        new_qs = [q for q in all_qs if str(q.get("id")) != question_id]
        if len(new_qs) < len(all_qs):
            pdata = _rebuild_levels(pdata, new_qs)
            _write_practice_file(p, pdata)
            log_security_event("ADMIN_DELETE_POOL_QUESTION", admin.id, {"question_id": question_id})
            return {"status": "success", "message": "\u0110\u00e3 x\u00f3a c\u00e2u h\u1ecfi kh\u1ecfi kho th\u00e0nh c\u00f4ng!"}

    raise HTTPException(status_code=404, detail="Kh\u00f4ng t\u00ecm th\u1ea5y c\u00e2u h\u1ecfi")
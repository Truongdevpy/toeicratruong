from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
import json
import re
from database import get_db
import models
import schemas
from auth import hash_password, verify_password, create_access_token, get_current_user
from security import check_login_rate_limit, record_login_failure, clear_login_failures, log_security_event
from personalization_engine import generate_default_roadmap
from streak_service import calculate_user_streak, calculate_study_hours

router = APIRouter(prefix="/api/auth", tags=["auth"])

def validate_email_format(email: str) -> None:
    pattern = r"^[\w\.-]+@[\w\.-]+\.\w+$"
    if not re.match(pattern, email.strip()):
        raise HTTPException(status_code=400, detail="Định dạng email không hợp lệ")

@router.post("/register", response_model=schemas.TokenResponse)
def register(data: schemas.UserRegister, db: Session = Depends(get_db)):
    email_clean = data.email.strip().lower()
    validate_email_format(email_clean)

    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Mật khẩu phải có độ dài tối thiểu 6 ký tự")

    existing = db.query(models.User).filter(models.User.email == email_clean).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email này đã tồn tại trên hệ thống")

    user = models.User(
        email=email_clean,
        password_hash=hash_password(data.password),
        full_name=data.full_name.strip(),
        role="student",
        is_active=True,
        token_version=1
    )
    db.add(user)
    db.flush()

    # Create initial blank profile requiring onboarding
    profile = models.UserProfile(
        user_id=user.id,
        current_score=400,
        target_score=650,
        onboarding_completed=False,
        placement_completed=False
    )
    db.add(profile)

    # Create initial learning path
    path = models.LearningPath(
        user_id=user.id,
        title="Lộ trình TOEIC Cá nhân hóa",
        current_score=400,
        target_score=650
    )
    db.add(path)
    db.flush()

    nodes = generate_default_roadmap(400, 650)
    for nd in nodes:
        db.add(models.LearningNode(
            path_id=path.id,
            order_index=nd["order_index"],
            title=nd["title"],
            description=nd["description"],
            skill=nd["skill"],
            status=nd["status"],
            progress_pct=nd["progress_pct"],
            estimated_hours=nd["estimated_hours"],
            target_score_checkpoint=nd["target_score_checkpoint"],
            lessons_count=nd["lessons_count"],
            completed_lessons=nd["completed_lessons"]
        ))

    db.add(models.Notification(
        user_id=user.id,
        title="Chào mừng bạn đến với TOEIC AI!",
        message="Hãy hoàn thành Thiết lập mục tiêu và Bài đánh giá trình độ để nhận lộ trình riêng biệt.",
        type="reminder"
    ))

    db.commit()
    log_security_event("USER_REGISTERED", user.id, {"email": user.email})

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "token_version": user.token_version
    })
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "avatar_url": user.avatar_url,
            "onboarding_completed": False,
            "placement_completed": False
        }
    }

@router.post("/login", response_model=schemas.TokenResponse)
def login(data: schemas.UserLogin, request: Request, db: Session = Depends(get_db)):
    email_clean = data.email.strip().lower()
    
    # Brute-force rate limiting by email and client IP
    client_ip = request.client.host if request.client else "unknown"
    rate_limit_key = f"{client_ip}:{email_clean}"
    check_login_rate_limit(rate_limit_key)

    user = db.query(models.User).filter(models.User.email == email_clean).first()
    if not user or not verify_password(data.password, user.password_hash):
        record_login_failure(rate_limit_key)
        log_security_event("LOGIN_FAILED", None, {"email": email_clean, "ip": client_ip})
        raise HTTPException(status_code=400, detail="Email hoặc mật khẩu không chính xác")

    if not getattr(user, "is_active", True):
        raise HTTPException(status_code=403, detail="Tài khoản này đã bị tạm khóa hoặc vô hiệu hóa")

    # Clear rate limit counter on successful authentication
    clear_login_failures(rate_limit_key)
    log_security_event("LOGIN_SUCCESS", user.id, {"email": user.email, "ip": client_ip})

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "token_version": getattr(user, "token_version", 1)
    })
    profile = user.profile
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "avatar_url": user.avatar_url,
            "onboarding_completed": profile.onboarding_completed if profile else False,
            "placement_completed": profile.placement_completed if profile else False,
            "current_score": profile.current_score if profile else 425,
            "target_score": profile.target_score if profile else 650
        }
    }

@router.post("/logout")
def logout(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Immediate token revocation (Section 24).
    Increments token_version so any previously issued JWT tokens are instantly invalidated.
    """
    user.token_version = (user.token_version or 1) + 1
    db.commit()
    log_security_event("TOKEN_REVOKED_LOGOUT", user.id)
    return {"status": "success", "message": "Đã đăng xuất và thu hồi phiên làm việc"}

@router.get("/me")
def get_me(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = user.profile
    unread_notifs = db.query(models.Notification).filter(
        models.Notification.user_id == user.id,
        models.Notification.is_read == False
    ).count()

    streak_info = calculate_user_streak(user.id, db)
    study_info = calculate_study_hours(user.id, db)

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "avatar_url": user.avatar_url,
        "profile": {
            "current_score": profile.current_score if profile else 425,
            "target_score": profile.target_score if profile else 650,
            "daily_minutes": profile.daily_minutes if profile else 45,
            "today_minutes_completed": study_info.get("today_minutes", 0),
            "streak_days": streak_info.get("streak_days", 0),
            "onboarding_completed": profile.onboarding_completed if profile else False,
            "placement_completed": profile.placement_completed if profile else False,
            "cefr_level": profile.cefr_level if profile else "B1",
            "focus_skills": json.loads(profile.focus_skills) if profile and profile.focus_skills else [],
            "weak_areas": json.loads(profile.weak_areas) if profile and profile.weak_areas else [],
            "strengths": json.loads(profile.strengths) if profile and profile.strengths else []
        },
        "unread_notifications": unread_notifs
    }

@router.post("/update-profile")
def update_profile(data: dict, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Mass Assignment Protection (Section 9).
    Only whitelisted fields (target_score, daily_minutes, full_name) are accepted.
    Any attempt to elevate role or change credentials is strictly ignored.
    """
    profile = user.profile
    if not profile:
        profile = models.UserProfile(user_id=user.id)
        db.add(profile)

    if "target_score" in data:
        try:
            score = int(data["target_score"])
            if 10 <= score <= 990:
                profile.target_score = score
        except (ValueError, TypeError):
            pass

    if "daily_minutes" in data:
        try:
            mins = int(data["daily_minutes"])
            if 5 <= mins <= 360:
                profile.daily_minutes = mins
        except (ValueError, TypeError):
            pass

    if "full_name" in data and isinstance(data["full_name"], str):
        cleaned = data["full_name"].strip()
        if 1 <= len(cleaned) <= 100:
            user.full_name = cleaned

    db.commit()
    return {"status": "success", "message": "Hồ sơ đã được cập nhật thành công"}

@router.post("/google", response_model=schemas.TokenResponse)
def google_auth(payload: dict, db: Session = Depends(get_db)):
    """
    Google OAuth 2.0 Sign-in and Sign-up (Group E).
    Accepts credential (JWT) or direct Google profile attributes.
    """
    from datetime import datetime
    import base64

    credential = payload.get("credential") or ""
    email = payload.get("email")
    full_name = payload.get("full_name") or payload.get("name")
    avatar_url = payload.get("avatar_url") or payload.get("picture")

    if credential and not email:
        try:
            parts = credential.split(".")
            if len(parts) >= 2:
                padded = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
                decoded_str = base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8")
                token_data = json.loads(decoded_str)
                email = token_data.get("email")
                full_name = token_data.get("name") or full_name
                avatar_url = token_data.get("picture") or avatar_url
        except Exception:
            pass

    if not email:
        ts = int(datetime.utcnow().timestamp())
        email = f"google_learner_{ts}@gmail.com"
        full_name = full_name or "Học viên Google"

    email_clean = email.strip().lower()
    user = db.query(models.User).filter(models.User.email == email_clean).first()

    if not user:
        # Auto-register new student
        user = models.User(
            email=email_clean,
            password_hash=hash_password(f"google_oauth_{email_clean}_secret"),
            full_name=full_name or "Học viên Google",
            avatar_url=avatar_url or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
            role="student",
            is_active=True,
            token_version=1
        )
        db.add(user)
        db.flush()

        profile = models.UserProfile(
            user_id=user.id,
            current_score=450,
            target_score=700,
            onboarding_completed=True,
            placement_completed=False
        )
        db.add(profile)

        path = models.LearningPath(
            user_id=user.id,
            title="Lộ trình TOEIC Google Learner",
            current_score=450,
            target_score=700
        )
        db.add(path)
        db.flush()

        nodes = generate_default_roadmap(450, 700)
        for nd in nodes:
            db.add(models.LearningNode(
                path_id=path.id,
                order_index=nd["order_index"],
                title=nd["title"],
                description=nd["description"],
                skill=nd["skill"],
                status=nd["status"],
                progress_pct=nd["progress_pct"],
                estimated_hours=nd["estimated_hours"],
                target_score_checkpoint=nd["target_score_checkpoint"],
                lessons_count=nd["lessons_count"],
                completed_lessons=nd.get("completed_lessons", 0)
            ))
        db.commit()
    else:
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Tài khoản này đã bị tạm khóa")
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
            db.commit()

    token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role})
    log_security_event("GOOGLE_AUTH_SUCCESS", user.id, {"email": user.email})

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "avatar_url": user.avatar_url
        }
    }


@router.post("/demo", response_model=schemas.TokenResponse)
def login_demo(data: schemas.DemoLoginRequest, response: Response, db: Session = Depends(get_db)):
    """
    One-click demo login for Khach, Hoc vien thuong, VIP Pro, Admin.
    """
    role = (data.role or "student").lower()
    if role not in ["student", "vip", "admin"]:
        role = "student"

    email_map = {
        "admin": "admin@toeicai.vn",
        "vip": "vip@toeicai.vn",
        "student": "student@toeicai.vn"
    }
    name_map = {
        "admin": "Quản trị viên Hệ thống",
        "vip": "Học viên VIP Pro (Nguyễn Hoàng Nam)",
        "student": "Học viên Thường (Trần Quang Trường)"
    }
    avatar_map = {
        "admin": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
        "vip": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        "student": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
    }

    email = email_map[role]
    user = db.query(models.User).filter(models.User.email == email).first()

    if not user:
        pwd = "admin123" if role == "admin" else ("vip123" if role == "vip" else "password123")
        user = models.User(
            email=email,
            password_hash=hash_password(pwd),
            full_name=name_map[role],
            role=role,
            avatar_url=avatar_map[role],
            is_active=True,
            token_version=1
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        profile = models.UserProfile(
            user_id=user.id,
            onboarding_completed=True,
            placement_completed=True,
            current_score=785 if role in ["vip", "admin"] else 425,
            target_score=850 if role in ["vip", "admin"] else 650,
            streak_days=14 if role in ["vip", "admin"] else 3,
            today_minutes_completed=35,
            daily_minutes=45
        )
        db.add(profile)
        db.commit()
        db.refresh(user)
    else:
        if user.role != role:
            user.role = role
            db.commit()
            db.refresh(user)

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "token_version": getattr(user, "token_version", 1)
    })

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=60 * 60 * 24 * 7
    )

    profile = user.profile
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "avatar_url": user.avatar_url,
            "onboarding_completed": profile.onboarding_completed if profile else True,
            "placement_completed": profile.placement_completed if profile else True,
            "current_score": profile.current_score if profile else 500,
            "target_score": profile.target_score if profile else 750
        }
    }

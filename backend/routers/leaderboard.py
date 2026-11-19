from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
import models
from auth import get_current_user_optional, get_current_user
from streak_service import calculate_user_streak

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])

SEED_PROFILES = []

def seed_leaderboard_if_empty(db: Session):
    all_users = db.query(models.User).all()
    for u in all_users:
        sync_user_to_leaderboard(u, db)


def sync_user_to_leaderboard(user: models.User, db: Session) -> models.LeaderboardProfile:
    profile = db.query(models.LeaderboardProfile).filter(models.LeaderboardProfile.user_id == user.id).first()

    up = user.profile
    streak_info = calculate_user_streak(user.id, db)
    streak = streak_info.get("streak_days", 0)

    # Real score from latest test attempt or placement or user profile
    latest_test = db.query(models.TestAttempt).filter(models.TestAttempt.user_id == user.id).order_by(models.TestAttempt.created_at.desc()).first()
    latest_placement = db.query(models.PlacementAttempt).filter(models.PlacementAttempt.user_id == user.id).order_by(models.PlacementAttempt.created_at.desc()).first()

    if latest_test and latest_test.total_score:
        score = latest_test.total_score
    elif latest_placement and latest_placement.estimated_score:
        score = latest_placement.estimated_score
    elif up and up.current_score:
        score = up.current_score
    else:
        score = 0

    target = up.target_score if up and up.target_score else 650

    # Count real attempts
    attempts_count = db.query(models.QuestionAttempt).filter(models.QuestionAttempt.user_id == user.id).count()
    correct_count = db.query(models.QuestionAttempt).filter(
        models.QuestionAttempt.user_id == user.id,
        models.QuestionAttempt.is_correct == True
    ).count()

    questions = attempts_count
    accuracy = round((correct_count / attempts_count * 100), 1) if attempts_count > 0 else 0.0
    
    # Calculate real EXP Points based on actual activity
    exp = int(score * 2 + streak * 30 + questions * 10 + correct_count * 5)

    # Determine Badge
    if score >= 900:
        badge = "Huyền Thoại 900+ 👑"
    elif score >= 800:
        badge = "Master 800+ ⚡"
    elif score >= 650:
        badge = "Chiến Thần 650+ 🚀"
    elif streak >= 7:
        badge = "Chiến Binh 7 Ngày 🔥"
    else:
        badge = "Học Viên Tích Cực 🌱"

    if not profile:
        profile = models.LeaderboardProfile(
            user_id=user.id,
            full_name=user.full_name or "Học viên TOEIC",
            avatar_url=user.avatar_url or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
            school_or_org="TOEIC AI Platform",
            target_score=target,
            current_score=score,
            weekly_score=score,
            monthly_score=score,
            streak_days=streak,
            questions_count=questions,
            exp_points=exp,
            score_growth=45,
            accuracy_pct=accuracy,
            badge=badge,
            cheer_count=18,
            rank_change=2,
            is_seed=False,
            updated_at=datetime.utcnow()
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    else:
        profile.full_name = user.full_name or profile.full_name
        profile.avatar_url = user.avatar_url or profile.avatar_url
        profile.current_score = score
        profile.weekly_score = score
        profile.monthly_score = score
        profile.target_score = target
        profile.streak_days = streak
        profile.questions_count = questions
        profile.exp_points = exp
        profile.accuracy_pct = accuracy
        profile.badge = badge
        profile.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(profile)

    return profile


@router.get("")
@router.get("/")
def get_leaderboard(
    category: str = Query("score", description="score | streak | practice | growth"),
    period: str = Query("weekly", description="weekly | monthly | all_time"),
    league: str = Query("all", description="all | master | advanced | starter"),
    search: Optional[str] = Query(None, description="Search by name or school"),
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    seed_leaderboard_if_empty(db)

    # Sync current logged in user if present
    my_profile = None
    if current_user:
        my_profile = sync_user_to_leaderboard(current_user, db)

    query = db.query(models.LeaderboardProfile)

    # League filtering
    if league == "master":
        query = query.filter(models.LeaderboardProfile.current_score >= 800)
    elif league == "advanced":
        query = query.filter(models.LeaderboardProfile.current_score >= 650, models.LeaderboardProfile.current_score < 800)
    elif league == "starter":
        query = query.filter(models.LeaderboardProfile.current_score < 650)

    # Search filter
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (models.LeaderboardProfile.full_name.ilike(term)) |
            (models.LeaderboardProfile.school_or_org.ilike(term))
        )

    # Sorting
    if category == "streak":
        query = query.order_by(models.LeaderboardProfile.streak_days.desc(), models.LeaderboardProfile.exp_points.desc())
    elif category == "practice":
        query = query.order_by(models.LeaderboardProfile.questions_count.desc(), models.LeaderboardProfile.exp_points.desc())
    elif category == "growth":
        query = query.order_by(models.LeaderboardProfile.score_growth.desc(), models.LeaderboardProfile.current_score.desc())
    else:  # score
        query = query.order_by(models.LeaderboardProfile.current_score.desc(), models.LeaderboardProfile.exp_points.desc())

    all_items = query.all()
    total_participants = len(all_items)

    # Period labels and countdown calculation
    period_labels = {
        "weekly": "Tuần thi đua 39 (21/09 - 27/09/2026)",
        "monthly": "Tháng 09/2026 (Chặng Đua Khai Trường)",
        "all_time": "Bảng Vinh Danh Toàn Thời Gian"
    }
    period_label = period_labels.get(period, "Tuần này")
    reset_countdown = "1 ngày 14 giờ" if period == "weekly" else ("3 ngày" if period == "monthly" else "Liên tục cập nhật")

    # Serialize ranked items
    ranked_list = []
    my_rank_data = None

    for idx, p in enumerate(all_items):
        rank_num = idx + 1
        is_me = (my_profile is not None and p.id == my_profile.id)

        # Primary metric value based on active category
        if category == "streak":
            primary_value = f"{p.streak_days} ngày"
            primary_num = p.streak_days
        elif category == "practice":
            primary_value = f"{p.questions_count} câu"
            primary_num = p.questions_count
        elif category == "growth":
            primary_value = f"+{p.score_growth} điểm"
            primary_num = p.score_growth
        else:
            primary_value = f"{p.current_score} điểm"
            primary_num = p.current_score

        entry = {
            "rank": rank_num,
            "id": p.id,
            "user_id": p.user_id,
            "full_name": p.full_name,
            "avatar_url": p.avatar_url or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
            "school_or_org": p.school_or_org or "Thành viên TOEIC AI",
            "current_score": p.current_score,
            "target_score": p.target_score,
            "streak_days": p.streak_days,
            "questions_count": p.questions_count,
            "exp_points": p.exp_points,
            "score_growth": p.score_growth,
            "accuracy_pct": p.accuracy_pct,
            "badge": p.badge,
            "cheer_count": p.cheer_count or 0,
            "rank_change": p.rank_change or 0,
            "primary_value": primary_value,
            "primary_num": primary_num,
            "is_me": is_me
        }

        ranked_list.append(entry)

        if is_me:
            # Distance to next rank
            pts_to_next = 0
            next_user_name = None
            if idx > 0:
                prev_item = all_items[idx - 1]
                if category == "streak":
                    pts_to_next = max(1, prev_item.streak_days - p.streak_days + 1)
                elif category == "practice":
                    pts_to_next = max(5, prev_item.questions_count - p.questions_count + 1)
                elif category == "growth":
                    pts_to_next = max(5, prev_item.score_growth - p.score_growth + 1)
                else:
                    pts_to_next = max(5, prev_item.current_score - p.current_score + 5)
                next_user_name = prev_item.full_name

            percentile_pct = max(1, min(99, round((rank_num / max(1, total_participants)) * 100)))
            my_rank_data = {
                **entry,
                "percentile_label": f"Top {percentile_pct}% học viên toàn quốc",
                "points_to_next": pts_to_next,
                "next_user_name": next_user_name
            }

    # Podium (Top 3) & List (Rank 4+)
    podium = ranked_list[:3]
    rankings = ranked_list[3:]

    # Summary metrics
    avg_score = round(sum(p.current_score for p in all_items) / max(1, total_participants))
    highest_streak = max((p.streak_days for p in all_items), default=0)
    total_q = sum(p.questions_count for p in all_items)

    return {
        "category": category,
        "period": period,
        "period_label": period_label,
        "reset_countdown": reset_countdown,
        "league": league,
        "total_participants": total_participants,
        "podium": podium,
        "rankings": rankings,
        "my_rank": my_rank_data,
        "summary": {
            "total_participants": total_participants,
            "average_score": avg_score,
            "highest_streak": highest_streak,
            "total_questions_completed": total_q,
            "reward_headline": "Quán Quân Tuần 39 nhận Kỷ Niệm Chương Vàng & 1 Năm Trợ Lý AI Pro"
        },
        "leagues": [
            {"id": "all", "label": "Tất cả học viên", "desc": "Bảng tổng hợp toàn diện"},
            {"id": "master", "label": "CLB Master 800+", "desc": "Các cao thủ đạt điểm xuất sắc"},
            {"id": "advanced", "label": "CLB Bứt Phá 650-795", "desc": "Nhóm chuẩn bị thi thật ETS"},
            {"id": "starter", "label": "CLB Khởi Động <650", "desc": "Học viên xây dựng nền tảng vững chắc"}
        ]
    }


@router.post("/cheer/{profile_id}")
def cheer_learner(
    profile_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    profile = db.query(models.LeaderboardProfile).filter(models.LeaderboardProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Không tìm thấy học viên này trên Bảng Xếp Hạng")

    # Increment cheer count
    profile.cheer_count = (profile.cheer_count or 0) + 1
    
    # Save cheer record
    cheer_record = models.LeaderboardCheer(
        sender_id=current_user.id if current_user else None,
        target_profile_id=profile.id,
        created_at=datetime.utcnow()
    )
    db.add(cheer_record)
    db.commit()

    return {
        "status": "success",
        "profile_id": profile.id,
        "cheer_count": profile.cheer_count,
        "message": f"Bạn đã gửi tràng pháo tay cổ vũ đến {profile.full_name}!"
    }


@router.get("/rules")
def get_leaderboard_rules():
    return {
        "title": "Quy chế Bảng Xếp Hạng & Hệ Thống Điểm Rèn Luyện (EXP)",
        "description": "Bảng Xếp Hạng TOEIC AI vinh danh những nỗ lực học tập kiên trì và thành tích xuất sắc của học viên trên toàn quốc.",
        "scoring_system": [
            {"activity": "Làm đúng 1 câu hỏi luyện tập (Part 1 - Part 7)", "exp": "+5 EXP", "desc": "Tích lũy qua từng bài luyện nhanh hoặc theo dạng bài."},
            {"activity": "Hoàn thành 1 bài Mini-Test (30 câu)", "exp": "+50 EXP", "desc": "Đánh giá tốc độ và độ chuẩn xác phản xạ."},
            {"activity": "Hoàn thành đề thi chuẩn Full Mock Test (200 câu)", "exp": "+200 EXP", "desc": "Thử thách sức bền và kiểm tra năng lực sát đề ETS."},
            {"activity": "Duy trì chuỗi học tập (Streak hàng ngày)", "exp": "+30 EXP/ngày", "desc": "Thưởng kỷ luật học tập không ngắt quãng."},
            {"activity": "Chép chính tả (Dictation) đạt chính xác >90%", "exp": "+40 EXP", "desc": "Rèn luyện tai nghe bắt trọn từ khóa và âm gió."},
            {"activity": "Nhận lượt cổ vũ từ bạn bè & cộng đồng", "exp": "+2 EXP/lượt", "desc": "Khích lệ tinh thần đồng đội cùng tiến bộ."}
        ],
        "leagues_info": [
            {"league": "CLB Master (800 - 990)", "criteria": "Học viên sở hữu điểm thi từ 800 trở lên", "perk": "Huy hiệu Vương Miện Vàng & Đặc quyền phòng luyện câu hỏi khó."},
            {"league": "CLB Bứt Phá (650 - 795)", "criteria": "Học viên đạt mốc chuẩn ra trường các trường ĐH", "perk": "Huy hiệu Tia Chớp & Gợi ý bộ đề bẫy thường gặp."},
            {"league": "CLB Khởi Động (< 650)", "criteria": "Học viên củng cố nền tảng ngữ pháp & từ vựng", "perk": "Huy hiệu Mầm Xanh & Lộ trình thích ứng bổ trợ lỗ hổng."}
        ],
        "rewards": [
            {"rank": "Top 1 Tuần (Quán Quân)", "reward": "Kỷ niệm chương vàng Vinh Danh + 1 Năm Trợ lý AI Pro + Voucher 500k."},
            {"rank": "Top 2 - Top 3 (Á Quân)", "reward": "Huy hiệu Bạc/Đồng độc quyền trên hồ sơ + 6 Tháng Trợ lý AI Pro."},
            {"rank": "Top 10 Tuần", "reward": "Huy hiệu 'Chiến Thần Tuần' + 1 Tháng Trợ lý AI Pro."},
            {"rank": "Chuỗi Streak 30 Ngày", "reward": "Huy hiệu Kỷ Luật Thép + Tặng 100 Bộ Flashcard từ vựng độc quyền."}
        ],
        "reset_cycle": "Bảng Xếp Hạng Tuần được làm mới vào 23:59 Chủ Nhật hàng tuần. Thành tích tuần cũ được lưu vĩnh viễn trong Bảng Vinh Danh Toàn Thời Gian."
    }

@router.get("/user/{profile_or_user_id}/profile")
def get_user_public_profile(
    profile_or_user_id: int,
    is_user_id: bool = Query(False),
    db: Session = Depends(get_db)
):
    import json
    profile = None
    user = None

    if is_user_id:
        user = db.query(models.User).filter(models.User.id == profile_or_user_id).first()
        if user:
            profile = db.query(models.LeaderboardProfile).filter(models.LeaderboardProfile.user_id == user.id).first()
        else:
            profile = db.query(models.LeaderboardProfile).filter(models.LeaderboardProfile.id == profile_or_user_id).first()
    else:
        profile = db.query(models.LeaderboardProfile).filter(models.LeaderboardProfile.id == profile_or_user_id).first()
        if profile and profile.user_id:
            user = db.query(models.User).filter(models.User.id == profile.user_id).first()
        elif not profile:
            user = db.query(models.User).filter(models.User.id == profile_or_user_id).first()

    if not profile and not user:
        from routers.chat import ONLINE_COMMUNITY_MEMBERS
        m = next((mem for mem in ONLINE_COMMUNITY_MEMBERS if mem["id"] == profile_or_user_id), None)
        if m:
            return {
                "id": m["id"],
                "user_id": m["id"],
                "full_name": m["full_name"],
                "avatar_url": m["avatar_url"],
                "school_or_org": "Cộng đồng TOEIC AI",
                "current_score": m.get("current_score", 720),
                "target_score": m.get("target_score", 850),
                "streak_days": 14,
                "questions_count": 350,
                "accuracy_pct": 82.5,
                "badge": m.get("role", "Chiến Binh Chăm Chỉ"),
                "cheer_count": 28,
                "rank": 5,
                "strengths": ["Listening Part 1 & Part 2", "Reading Part 5 Ngữ pháp"],
                "weak_areas": ["Reading Part 7 Đoạn văn kép"],
                "member_since": "09/2026"
            }
        chat_msg = db.query(models.CommunityChatMessage).filter(models.CommunityChatMessage.sender_id == profile_or_user_id).first()
        if chat_msg:
            return {
                "id": profile_or_user_id,
                "user_id": profile_or_user_id,
                "full_name": chat_msg.sender_name,
                "avatar_url": chat_msg.sender_avatar or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                "school_or_org": "Cộng đồng TOEIC AI",
                "current_score": 750,
                "target_score": 850,
                "streak_days": 18,
                "questions_count": 420,
                "accuracy_pct": 84.0,
                "badge": "Thành viên Tích cực",
                "cheer_count": 32,
                "rank": 8,
                "strengths": ["Listening Part 1 & Part 2", "Reading Part 5 Ngữ pháp"],
                "weak_areas": ["Reading Part 7 Đoạn văn kép"],
                "member_since": "08/2026"
            }
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ người dùng")

    full_name = (profile.full_name if profile else None) or (user.full_name if user else "Học viên TOEIC")
    avatar_url = (profile.avatar_url if profile else None) or (user.avatar_url if user else "")
    current_score = (profile.current_score if profile else None) or (user.profile.current_score if user and user.profile else 650)
    target_score = (profile.target_score if profile else None) or (user.profile.target_score if user and user.profile else 750)
    streak_days = (profile.streak_days if profile else None) or (user.profile.streak_days if user and user.profile else 5)
    questions_count = (profile.questions_count if profile else None) or (db.query(models.QuestionAttempt).filter(models.QuestionAttempt.user_id == user.id).count() if user else 120)
    badge = (profile.badge if profile else None) or "Chiến Binh Chăm Chỉ"
    school = (profile.school_or_org if profile else None) or "Học viên TOEIC AI"
    cheer_count = profile.cheer_count if profile else 15
    accuracy_pct = profile.accuracy_pct if profile else 76.5

    all_profiles = db.query(models.LeaderboardProfile).order_by(models.LeaderboardProfile.current_score.desc()).all()
    rank = 15
    if profile:
        for idx, p in enumerate(all_profiles):
            if p.id == profile.id:
                rank = idx + 1
                break

    strengths = ["Listening Part 1 & Part 2", "Reading Part 5 Ngữ pháp cơ bản"]
    weak_areas = ["Listening Part 3 Hội thoại", "Reading Part 7 Đoạn văn kép"]

    if user and user.profile:
        if user.profile.strengths:
            try:
                strengths = json.loads(user.profile.strengths)
            except Exception:
                pass
        if user.profile.weak_areas:
            try:
                weak_areas = json.loads(user.profile.weak_areas)
            except Exception:
                pass

    return {
        "id": profile.id if profile else profile_or_user_id,
        "user_id": user.id if user else (profile.user_id if profile else None),
        "full_name": full_name,
        "avatar_url": avatar_url,
        "school_or_org": school,
        "current_score": current_score,
        "target_score": target_score,
        "streak_days": streak_days,
        "questions_count": questions_count,
        "accuracy_pct": accuracy_pct,
        "badge": badge,
        "cheer_count": cheer_count,
        "rank": rank,
        "strengths": strengths,
        "weak_areas": weak_areas,
        "member_since": user.created_at.strftime("%m/%Y") if user and user.created_at else "2026"
    }

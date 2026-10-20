# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
import models
import schemas
from auth import get_current_user, get_current_user_optional
from timezone_utils import format_vn_time, format_vn_datetime, to_iso_utc

router = APIRouter(prefix="/api/community", tags=["community"])

DEFAULT_GROUPS_SEED = [
    {
        "name": "Target 500–650+ (Cơ bản - Xây gốc)",
        "description": "Nhóm ôn luyện ngữ pháp nền tảng Part 5 và từ vựng thông dụng Part 1, 2.",
        "target_score": "500-650+",
        "members_count": 2,
        "active_online": 1,
        "schedule_info": "Thứ 2, 4, 6 lúc 19:30"
    },
    {
        "name": "Target 700–850+ (Bứt phá điểm cao)",
        "description": "Chiến thuật bẫy Part 3, 4 và xử lý đoạn văn kép Part 7 tốc độ cao.",
        "target_score": "700-850+",
        "members_count": 3,
        "active_online": 1,
        "schedule_info": "Mỗi tối 20:00"
    },
    {
        "name": "Target 900+ (Master TOEIC)",
        "description": "Chinh phục điểm tuyệt đối với các bộ đề thi thử ETS khó nhất.",
        "target_score": "900+",
        "members_count": 1,
        "active_online": 1,
        "schedule_info": "Thứ 3, 5, 7 lúc 21:00"
    },
    {
        "name": "Luyện giải đề ETS mỗi tối 20h",
        "description": "Phòng luyện giải đề bấm giờ thực tế, thảo luận câu sai và giải thích chi tiết.",
        "target_score": "All levels",
        "members_count": 3,
        "active_online": 1,
        "schedule_info": "Mỗi ngày 20:00 - 22:00"
    }
]

DEFAULT_POSTS_SEED = [
    {
        "user_id": 1,
        "author_name": "Trần Quang Trường",
        "author_avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        "title": "Kinh nghiệm tự luyện Part 3 & 4 tăng 120 điểm trong 1 tháng",
        "category": "Luyện nghe",
        "content": "Mình từng rất sợ phần hội thoại dài ở Part 3 và bài nói ngắn Part 4 vì người đọc nói nhanh. Sau khi áp dụng phương pháp Dictation hàng ngày kết hợp đọc trước 3 câu hỏi và các lựa chọn trước khi audio phát, điểm nghe của mình đã tăng từ 310 lên 430 chỉ sau 4 tuần. Mọi người chú ý tuyệt đối không dừng lại suy nghĩ câu cũ khi audio đã chuyển sang câu tiếp theo nhé!",
        "likes_count": 24,
        "comments": [
            {
                "user_id": 9,
                "author_name": "Nguyễn Hoàng Nam (VIP 👑)",
                "author_avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
                "content": "Chuẩn luôn bạn ơi! Thêm nữa là nếu câu nào lỡ không nghe được thì chọn đáp án khả quan nhất rồi chuyển sang đọc câu tiếp theo ngay, giữ nhịp là yếu tố sống còn ở Part 3-4."
            },
            {
                "user_id": 2,
                "author_name": "Quản trị viên Hệ thống",
                "author_avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
                "content": "Rất hoan nghênh chia sẻ thực chiến của bạn Trường! Các bạn có thể kết hợp làm bài nghe trong mục Luyện nghe & Dictation của hệ thống để luyện kỹ năng này."
            }
        ]
    },
    {
        "user_id": 2,
        "author_name": "Quản trị viên Hệ thống",
        "author_avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
        "title": "Tổng hợp chiến thuật và Mẹo giải Part 5 tránh bẫy từ loại và thì",
        "category": "Ngữ pháp & Từ vựng",
        "content": "Chào các bạn! Trong đề ETS 2024-2026, Part 5 có khoảng 14-16 câu hỏi về ngữ pháp căn bản và từ loại. Để đạt tốc độ 30 giây/câu: 1) Xác định ngay vị trí chỗ trống đứng sau giới từ hay mạo từ; 2) Để ý đuôi từ loại danh từ (-tion, -ment, -ance), tính từ (-ive, -able, -al); 3) Chú ý các cặp liên từ đối lập như although + clause vs. despite + noun phrase. Hệ thống đã cập nhật đầy đủ 38 chuyên đề ngữ pháp trong mục Luyện tập để các bạn ôn lại!",
        "likes_count": 46,
        "comments": [
            {
                "user_id": 1,
                "author_name": "Trần Quang Trường",
                "author_avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                "content": "Phần bẫy đại từ phản thân em hay bị sai, bài viết phân tích rất rõ ạ!"
            },
            {
                "user_id": 5,
                "author_name": "Nguyen Van Test",
                "author_avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                "content": "Mẹo nhìn trước nhìn sau chỗ trống tiết kiệm được rất nhiều thời gian làm bài, cảm ơn admin!"
            }
        ]
    },
    {
        "user_id": 9,
        "author_name": "Nguyễn Hoàng Nam (VIP 👑)",
        "author_avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        "title": "Lộ trình bứt phá Target 800+ và chiến thuật xử lý bài đọc Part 7 Reading",
        "category": "Kinh nghiệm thi",
        "content": "Kinh nghiệm thực chiến đạt 895 TOEIC của mình: Part 7 chiếm tới 54 câu hỏi và là nguyên nhân chính khiến hầu hết thí sinh bị thiếu giờ. Chiến thuật của mình là: chia Part 7 thành 2 chặng. Chặng 1 xử lý nhanh các bài đơn (Single Passages) trong 25 phút. Chặng 2 dành 30 phút cho bài kép và bài ba (Double & Triple Passages). Luôn đọc câu hỏi tìm từ khóa đặc biệt (tên riêng, số tiền, ngày tháng, chức danh) rồi mới quét bài đọc (Scanning). Đừng cố dịch từng câu!",
        "likes_count": 38,
        "comments": [
            {
                "user_id": 5,
                "author_name": "Nguyen Van Test",
                "author_avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                "content": "Mình đang kẹt ở mốc 720 vì toàn hết giờ ở 15 câu cuối Part 7. Cảm ơn Nam đã chia sẻ mốc phân bổ thời gian rất chi tiết!"
            },
            {
                "user_id": 1,
                "author_name": "Trần Quang Trường",
                "author_avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                "content": "Bài đọc ba nhiều thông tin chéo quá, áp dụng cách quét từ khóa ngày tháng của anh Nam đỡ rối hơn hẳn."
            }
        ]
    },
    {
        "user_id": 5,
        "author_name": "Nguyen Van Test",
        "author_avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        "title": "50+ Collocations hay gặp nhất trong đề ETS 2024-2026",
        "category": "Ngữ pháp & Từ vựng",
        "content": "Hôm nay mình tổng hợp lại các cụm từ Collocations hay xuất hiện nhất trong các đề thi ETS gần đây: 'meet the deadline' (kịp hạn), 'conduct a survey' (tiến hành khảo sát), 'express concern' (bày tỏ quan ngại), 'highly recommended' (được đánh giá cao), 'substantially increase' (tăng đáng kể). Học theo cụm giúp chúng ta phản xạ câu hỏi Part 5 chỉ trong 5 giây mà không cần dịch nghĩa từng từ!",
        "likes_count": 31,
        "comments": [
            {
                "user_id": 2,
                "author_name": "Quản trị viên Hệ thống",
                "author_avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
                "content": "Rất hữu ích! Bạn có thể lưu các từ này vào Giỏ từ vựng cá nhân trên web để ôn lại theo thuật toán Spaced Repetition nhé."
            }
        ]
    },
    {
        "user_id": 1,
        "author_name": "Trần Quang Trường",
        "author_avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        "title": "Phương pháp Dictation hàng ngày giúp tai nhạy âm sau 2 tuần",
        "category": "Luyện nghe",
        "content": "Nhiều bạn thắc mắc vì sao đọc transcript thì hiểu mà khi làm bài thi lại không bắt kịp âm. Lý do là hiện tượng nối âm (linking) và nuốt âm (reduction) của người bản xứ. Phương pháp nghe chép chính tả Dictation hàng ngày buộc não bộ phải tập trung từng âm tiết. Mỗi ngày mình chỉ cần chép 5-10 câu ngắn trong mục Dictation của web, sau 2 tuần điểm Part 2 của mình đã tăng rõ rệt từ 18/25 lên 23/25.",
        "likes_count": 29,
        "comments": [
            {
                "user_id": 9,
                "author_name": "Nguyễn Hoàng Nam (VIP 👑)",
                "author_avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
                "content": "Đồng ý 100%! Nghe chép chính tả là cách trị dứt điểm thói quen 'đoán mò' khi nghe."
            }
        ]
    },
    {
        "user_id": 2,
        "author_name": "Quản trị viên Hệ thống",
        "author_avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
        "title": "Tìm bạn học cùng giải đề ETS 2024-2026 mỗi tối 20h qua Zoom",
        "category": "Tìm bạn học",
        "content": "Nhóm học tập đang mở thêm phòng luyện giải đề thi thử ETS 2024-2026 bấm giờ nghiêm túc 120 phút mỗi tối từ 20:00 đến 22:00. Mục tiêu nhóm từ 650 đến 850+. Sau khi làm đề sẽ cùng nhau chữa câu sai, giải thích ngữ pháp và chia sẻ transcript nghe. Các bạn bấm 'Tham gia' nhóm 'Luyện giải đề ETS mỗi tối 20h' ở cột bên phải để nhận thông báo nhé!",
        "likes_count": 52,
        "comments": [
            {
                "user_id": 1,
                "author_name": "Trần Quang Trường",
                "author_avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                "content": "Em vừa tham gia nhóm rồi ạ, tối nay hẹn mọi người 20h nhé!"
            },
            {
                "user_id": 5,
                "author_name": "Nguyen Van Test",
                "author_avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
                "content": "Cho mình đăng ký 1 slot với nhé!"
            }
        ]
    }
]

def ensure_initial_posts(db: Session):
    # Remove any placeholder 'test' post
    test_posts = db.query(models.CommunityPost).filter(
        (models.CommunityPost.title == 'test') | (models.CommunityPost.content == 'test')
    ).all()
    for tp in test_posts:
        db.query(models.PostComment).filter(models.PostComment.post_id == tp.id).delete()
        db.delete(tp)
    if test_posts:
        db.commit()

    # Seed real posts if they do not exist
    for p_data in DEFAULT_POSTS_SEED:
        existing = db.query(models.CommunityPost).filter(
            models.CommunityPost.title == p_data["title"]
        ).first()
        if not existing:
            user = db.query(models.User).filter(models.User.id == p_data["user_id"]).first()
            author_name = user.full_name if user else p_data["author_name"]
            author_avatar = user.avatar_url if user and user.avatar_url else p_data["author_avatar"]
            new_p = models.CommunityPost(
                user_id=p_data["user_id"],
                author_name=author_name,
                author_avatar=author_avatar,
                title=p_data["title"],
                content=p_data["content"],
                category=p_data["category"],
                likes_count=p_data.get("likes_count", 0)
            )
            db.add(new_p)
            db.commit()
            db.refresh(new_p)

            # Add comments
            for c_data in p_data.get("comments", []):
                c_user = db.query(models.User).filter(models.User.id == c_data["user_id"]).first()
                c_name = c_user.full_name if c_user else c_data["author_name"]
                c_avatar = c_user.avatar_url if c_user and c_user.avatar_url else c_data["author_avatar"]
                comm = models.PostComment(
                    post_id=new_p.id,
                    user_id=c_data["user_id"],
                    author_name=c_name,
                    author_avatar=c_avatar,
                    content=c_data["content"]
                )
                db.add(comm)
            new_p.comments_count = len(p_data.get("comments", []))
            db.commit()
        else:
            if existing.category != p_data["category"]:
                existing.category = p_data["category"]
                db.commit()

def ensure_initial_groups(db: Session):
    count = db.query(models.StudyGroup).count()
    if count == 0:
        for g_data in DEFAULT_GROUPS_SEED:
            grp = models.StudyGroup(
                name=g_data["name"],
                description=g_data["description"],
                target_score=g_data["target_score"],
                members_count=g_data["members_count"],
                active_online=g_data["active_online"],
                schedule_info=g_data["schedule_info"],
                is_active=True
            )
            db.add(grp)
        try:
            db.commit()
        except Exception:
            db.rollback()

        seed_memberships = {
            1: [(2, "admin")],
            2: [(2, "admin"), (5, "member")],
            3: [(2, "admin"), (9, "member")],
            4: [(2, "admin"), (5, "member")]
        }
        for gid, mems in seed_memberships.items():
            for uid, role in mems:
                m_exist = db.query(models.StudyGroupMember).filter(
                    models.StudyGroupMember.group_id == gid,
                    models.StudyGroupMember.user_id == uid
                ).first()
                if not m_exist:
                    db.add(models.StudyGroupMember(group_id=gid, user_id=uid, role=role))
        try:
            db.commit()
        except Exception:
            db.rollback()

@router.get("/groups")
def get_study_groups(
    user = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    ensure_initial_groups(db)
    groups = db.query(models.StudyGroup).filter(
        models.StudyGroup.is_active == True
    ).order_by(models.StudyGroup.members_count.desc(), models.StudyGroup.id.asc()).all()

    user_joined_group_ids = set()
    if user:
        joined_records = db.query(models.StudyGroupMember.group_id).filter(
            models.StudyGroupMember.user_id == user.id
        ).all()
        user_joined_group_ids = {r[0] for r in joined_records}

    result = []
    for g in groups:
        actual_members = db.query(models.StudyGroupMember).filter(
            models.StudyGroupMember.group_id == g.id
        ).count()
        effective_count = max(actual_members, g.members_count or 1)
        is_joined = (g.id in user_joined_group_ids)

        result.append({
            "id": g.id,
            "name": g.name,
            "description": g.description,
            "target_score": g.target_score,
            "members": f"{effective_count:,}",
            "members_count": effective_count,
            "active": f"{g.active_online or 1} online",
            "active_online": g.active_online or 1,
            "schedule_info": g.schedule_info,
            "creator_id": g.creator_id,
            "is_joined": is_joined,
            "created_at": format_vn_time(g.created_at, "%d/%m/%Y") if g.created_at else ""
        })

    return {
        "total": len(result),
        "groups": result
    }

@router.post("/groups/{group_id}/join")
def join_study_group(
    group_id: int,
    user = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    grp = db.query(models.StudyGroup).filter(models.StudyGroup.id == group_id).first()
    if not grp:
        raise HTTPException(status_code=404, detail="Nhóm học không tồn tại")

    if user:
        existing = db.query(models.StudyGroupMember).filter(
            models.StudyGroupMember.group_id == group_id,
            models.StudyGroupMember.user_id == user.id
        ).first()
        if not existing:
            new_m = models.StudyGroupMember(group_id=group_id, user_id=user.id, role="member")
            db.add(new_m)
            db.commit()

    real_count = db.query(models.StudyGroupMember).filter(
        models.StudyGroupMember.group_id == group_id
    ).count()
    grp.members_count = max(real_count, (grp.members_count or 0) + 1)
    db.commit()

    return {
        "status": "success",
        "message": f"Bạn đã tham gia nhóm '{grp.name}' thành công!",
        "new_members_count": grp.members_count,
        "is_joined": True
    }

@router.post("/groups/{group_id}/leave")
def leave_study_group(
    group_id: int,
    user = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    grp = db.query(models.StudyGroup).filter(models.StudyGroup.id == group_id).first()
    if not grp:
        raise HTTPException(status_code=404, detail="Nhóm học không tồn tại")

    if user:
        existing = db.query(models.StudyGroupMember).filter(
            models.StudyGroupMember.group_id == group_id,
            models.StudyGroupMember.user_id == user.id
        ).first()
        if existing:
            db.delete(existing)
            db.commit()

    real_count = db.query(models.StudyGroupMember).filter(
        models.StudyGroupMember.group_id == group_id
    ).count()
    grp.members_count = max(0, max(real_count, (grp.members_count or 1) - 1))
    db.commit()

    return {
        "status": "success",
        "message": f"Bạn đã rời khỏi nhóm '{grp.name}'.",
        "new_members_count": grp.members_count,
        "is_joined": False
    }

@router.get("/posts")
def get_posts(db: Session = Depends(get_db)):
    ensure_initial_posts(db)
    posts = db.query(models.CommunityPost).order_by(models.CommunityPost.created_at.desc()).all()
    post_ids = [p.id for p in posts]
    comments_by_post = {pid: [] for pid in post_ids}
    if post_ids:
        all_comments = db.query(models.PostComment).filter(
            models.PostComment.post_id.in_(post_ids)
        ).order_by(models.PostComment.created_at.asc()).all()
        for c in all_comments:
            if c.post_id in comments_by_post:
                comments_by_post[c.post_id].append(c)
    result = []
    for p in posts:
        comments = comments_by_post.get(p.id, [])
        result.append({
            "id": p.id,
            "author_id": p.user_id,
            "author_name": p.author_name,
            "author_avatar": p.author_avatar,
            "title": p.title,
            "content": p.content,
            "category": p.category,
            "likes_count": p.likes_count,
            "comments_count": len(comments),
            "created_at": format_vn_time(p.created_at, "%d/%m/%Y") if p.created_at else "",
            "created_at_raw": to_iso_utc(p.created_at),
            "comments": [
                {
                    "id": c.id,
                    "author_id": c.user_id,
                    "author_name": c.author_name,
                    "author_avatar": c.author_avatar,
                    "content": c.content,
                    "created_at": format_vn_datetime(c.created_at) if c.created_at else "",
                    "created_at_raw": to_iso_utc(c.created_at)
                }
                for c in comments
            ]
        })
    total_learners = db.query(models.User).count()
    return {
        "posts": result,
        "total_posts": len(result),
        "total_learners": total_learners
    }

@router.post("/posts")
def create_post(
    data: schemas.CommunityPostCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = models.CommunityPost(
        user_id=user.id,
        author_name=user.full_name,
        author_avatar=user.avatar_url,
        title=data.title,
        content=data.content,
        category=data.category
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return {
        "status": "success",
        "message": "Bài viết đã được đăng tải thành công",
        "post": {
            "id": post.id,
            "author_id": post.user_id,
            "author_name": post.author_name,
            "author_avatar": post.author_avatar,
            "title": post.title,
            "content": post.content,
            "category": post.category,
            "likes_count": post.likes_count or 0,
            "comments_count": 0,
            "created_at": format_vn_time(post.created_at, "%d/%m/%Y") if post.created_at else "Hôm nay",
            "created_at_raw": to_iso_utc(post.created_at),
            "comments": []
        }
    }

@router.post("/posts/{post_id}/comments")
def add_comment(
    post_id: int,
    data: schemas.CommunityCommentCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(models.CommunityPost).filter(models.CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Bài viết không tồn tại")

    comment = models.PostComment(
        post_id=post.id,
        user_id=user.id,
        author_name=user.full_name,
        author_avatar=user.avatar_url,
        content=data.content
    )
    db.add(comment)
    post.comments_count = (post.comments_count or 0) + 1
    db.commit()
    db.refresh(comment)
    return {
        "status": "success",
        "message": "Bình luận đã được gửi",
        "comment": {
            "id": comment.id,
            "author_id": comment.user_id,
            "author_name": comment.author_name,
            "author_avatar": comment.author_avatar,
            "content": comment.content,
            "created_at": format_vn_datetime(comment.created_at) if comment.created_at else "Vừa xong",
            "created_at_raw": to_iso_utc(comment.created_at)
        }
    }

@router.post("/posts/{post_id}/like")
def like_post(
    post_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = db.query(models.CommunityPost).filter(models.CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Bài viết không tồn tại")
    post.likes_count = (post.likes_count or 0) + 1
    db.commit()
    return {"likes_count": post.likes_count}

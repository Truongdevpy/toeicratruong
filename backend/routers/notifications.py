from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models
from auth import get_current_user
from timezone_utils import format_vn_datetime, to_iso_utc

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

@router.get("")
def get_notifications(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifs = db.query(models.Notification).filter(
        models.Notification.user_id == user.id
    ).order_by(models.Notification.created_at.desc()).all()

    return {
        "unread_count": sum(1 for n in notifs if not n.is_read),
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "type": n.type,
                "is_read": n.is_read,
                "link": n.link,
                "created_at": format_vn_datetime(n.created_at) if n.created_at else "",
                "created_at_raw": to_iso_utc(n.created_at)
            }
            for n in notifs
        ]
    }

@router.post("/mark-all-read")
def mark_all_read(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(models.Notification).filter(
        models.Notification.user_id == user.id
    ).update({"is_read": True})
    db.commit()
    return {"status": "success", "message": "Đã đánh dấu đọc tất cả"}
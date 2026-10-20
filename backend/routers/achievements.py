from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models
from auth import get_current_user
router = APIRouter(prefix="/api/achievements", tags=["achievements"])

@router.get("")
def get_achievements(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = db.query(models.Achievement).filter(
        models.Achievement.user_id == user.id
    ).all()

    return {
        "total_unlocked": sum(1 for a in items if a.unlocked),
        "total_badges": len(items),
        "achievements": [
            {
                "id": a.id,
                "code": a.code,
                "title": a.title,
                "description": a.description,
                "icon": a.icon,
                "unlocked": a.unlocked,
                "progress": a.progress,
                "max_progress": a.max_progress,
                "unlocked_at": a.unlocked_at.strftime("%d/%m/%Y") if a.unlocked_at else None
            }
            for a in items
        ]
    }

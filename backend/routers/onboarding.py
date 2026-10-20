from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import json
from database import get_db
import models
import schemas
from auth import get_current_user
from personalization_engine import generate_default_roadmap

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

@router.post("/submit")
def submit_onboarding(
    data: schemas.OnboardingRequest,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = user.profile
    if not profile:
        profile = models.UserProfile(user_id=user.id)
        db.add(profile)

    profile.study_purpose = data.study_purpose
    profile.target_score = data.target_score
    profile.daily_minutes = data.daily_minutes
    profile.focus_skills = json.dumps(data.focus_skills)
    profile.onboarding_completed = True

    # Update or recreate learning path
    path = user.learning_path
    if not path:
        path = models.LearningPath(user_id=user.id)
        db.add(path)
        db.flush()

    path.target_score = data.target_score
    path.title = f"Lộ trình TOEIC {data.target_score} cá nhân hóa"

    # Update nodes
    db.query(models.LearningNode).filter(models.LearningNode.path_id == path.id).delete()
    nodes_data = generate_default_roadmap(profile.current_score or 425, data.target_score)
    for nd in nodes_data:
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

    db.commit()

    return {
        "status": "success",
        "message": "Mục tiêu học tập đã được thiết lập thành công",
        "next_step": "/placement-test"
    }

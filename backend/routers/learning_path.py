from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json
from database import get_db
import models
import schemas
from auth import get_current_user
from personalization_engine import generate_default_roadmap, recalculate_adaptive_weights

router = APIRouter(prefix="/api/learning-path", tags=["learning-path"])

@router.get("")
def get_learning_path(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    path = user.learning_path
    if not path:
        path = models.LearningPath(
            user_id=user.id,
            title="Lộ trình TOEIC cá nhân hóa",
            current_score=user.profile.current_score if user.profile else 425,
            target_score=user.profile.target_score if user.profile else 650
        )
        db.add(path)
        db.flush()
        for nd in generate_default_roadmap(path.current_score, path.target_score):
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

    nodes = db.query(models.LearningNode).filter(
        models.LearningNode.path_id == path.id
    ).order_by(models.LearningNode.order_index.asc()).all()

    weights = json.loads(path.adaptive_weights) if path.adaptive_weights else {
        "grammar": 35, "listening": 30, "reading": 20, "vocabulary": 15
    }

    # Calculate overall roadmap completion
    total_progress = sum(n.progress_pct for n in nodes) / max(1, len(nodes))

    return {
        "id": path.id,
        "title": path.title,
        "current_score": path.current_score,
        "target_score": path.target_score,
        "estimated_weeks": path.estimated_weeks,
        "overall_progress_pct": round(total_progress, 1),
        "adaptive_weights": weights,
        "adaptation_reason": path.last_adaptation_reason,
        "nodes": [
            {
                "id": n.id,
                "order_index": n.order_index,
                "title": n.title,
                "description": n.description,
                "skill": n.skill,
                "status": n.status,
                "progress_pct": n.progress_pct,
                "estimated_hours": n.estimated_hours,
                "target_score_checkpoint": n.target_score_checkpoint,
                "lessons_count": n.lessons_count,
                "completed_lessons": n.completed_lessons
            }
            for n in nodes
        ]
    }

@router.patch("/node/{node_id}/update")
def update_node(
    node_id: int,
    data: schemas.LearningNodeUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    node = db.query(models.LearningNode).join(models.LearningPath).filter(
        models.LearningNode.id == node_id,
        models.LearningPath.user_id == user.id
    ).first()
    if not node:
        raise HTTPException(status_code=404, detail="Không tìm thấy node học hoặc bạn không có quyền truy cập")

    if data.status:
        node.status = data.status
    if data.progress_pct is not None:
        node.progress_pct = max(0, min(100, data.progress_pct))
    if data.completed_lessons is not None:
        node.completed_lessons = min(node.lessons_count, max(0, data.completed_lessons))
        node.progress_pct = int((node.completed_lessons / node.lessons_count) * 100)

    # If completed, unlock next node
    if node.status == "completed" or node.progress_pct >= 100:
        node.status = "completed"
        node.progress_pct = 100
        next_node = db.query(models.LearningNode).filter(
            models.LearningNode.path_id == node.path_id,
            models.LearningNode.order_index == node.order_index + 1
        ).first()
        if next_node and next_node.status == "locked":
            next_node.status = "in_progress"

    db.commit()
    return {"status": "success", "message": "Tiến độ bài học đã được cập nhật"}

@router.post("/recalculate")
def recalculate_path(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recent_attempts = db.query(models.QuestionAttempt).filter(
        models.QuestionAttempt.user_id == user.id
    ).order_by(models.QuestionAttempt.created_at.desc()).limit(30).all()

    adaptation = recalculate_adaptive_weights(recent_attempts)
    path = user.learning_path
    if path:
        path.adaptive_weights = json.dumps(adaptation["weights"])
        path.last_adaptation_reason = adaptation["reason"]
        db.commit()

    return {
        "status": "success",
        "adaptive_weights": adaptation["weights"],
        "reason": adaptation["reason"]
    }

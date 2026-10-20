from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class OnboardingRequest(BaseModel):
    study_purpose: str
    target_score: int
    daily_minutes: int
    focus_skills: List[str]

class PlacementSubmitRequest(BaseModel):
    test_type: str  # 'full' or 'custom'
    answers: Dict[str, str]  # question_id -> selected_option
    time_spent_seconds: int = 1200

class LearningNodeUpdate(BaseModel):
    status: Optional[str] = None
    progress_pct: Optional[int] = None
    completed_lessons: Optional[int] = None

class PracticeAnswerSubmit(BaseModel):
    question_id: str
    selected_option: str
    time_spent_sec: int = 20

class DictationCheckRequest(BaseModel):
    question_id: str
    user_text: str
    mode: str = "full"  # full, blanks, keywords

class FlashcardReviewRequest(BaseModel):
    word_id: str
    rating: str  # 'again', 'hard', 'good', 'easy'

class AITutorChatRequest(BaseModel):
    conversation_id: Optional[int] = None
    message: str
    action: Optional[str] = None  # explain_simpler, give_examples, quiz, mistake_analysis

class AIQuestionGenRequest(BaseModel):
    skill: str = "Grammar"
    topic: str = "Word Form"
    difficulty: str = "Medium"
    count: int = 1

class CommunityPostCreate(BaseModel):
    title: str
    content: str
    category: str = "Thảo luận"

class CommunityCommentCreate(BaseModel):
    content: str


class FlashcardAddRequest(BaseModel):
    word_id: str
    word: str
    ipa: Optional[str] = None
    meaning: str
    part_of_speech: Optional[str] = None
    example: Optional[str] = None
    audio_url: Optional[str] = None

class DemoLoginRequest(BaseModel):
    role: str = 'student'  # 'student', 'vip', 'admin'

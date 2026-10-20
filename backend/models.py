from datetime import datetime
import json
from sqlalchemy import Column, Integer, String, Text, Boolean, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    avatar_url = Column(String(512), default="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150")
    role = Column(String(50), default="student")  # 'student', 'admin'
    is_active = Column(Boolean, default=True, nullable=False)
    token_version = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    learning_path = relationship("LearningPath", back_populates="user", uselist=False, cascade="all, delete-orphan")
    placement_attempts = relationship("PlacementAttempt", back_populates="user", cascade="all, delete-orphan")
    question_attempts = relationship("QuestionAttempt", back_populates="user", cascade="all, delete-orphan")
    test_attempts = relationship("TestAttempt", back_populates="user", cascade="all, delete-orphan")
    flashcards = relationship("UserFlashcard", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship("AIConversation", back_populates="user", cascade="all, delete-orphan")
    posts = relationship("CommunityPost", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    achievements = relationship("Achievement", back_populates="user", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    current_score = Column(Integer, default=425)
    target_score = Column(Integer, default=650)
    study_purpose = Column(String(100), default="TOEIC")
    daily_minutes = Column(Integer, default=45)
    today_minutes_completed = Column(Integer, default=25)
    streak_days = Column(Integer, default=5)
    last_study_date = Column(String(50), default="")
    focus_skills = Column(Text, default='["Listening", "Reading", "Grammar", "Vocabulary"]')
    weak_areas = Column(Text, default='["Listening Part 3", "Word Form", "Reading Part 7 Single Passage"]')
    strengths = Column(Text, default='["Listening Part 1", "Reading Part 5 Basic Grammar", "Everyday Vocabulary"]')
    cefr_level = Column(String(10), default="B1")
    onboarding_completed = Column(Boolean, default=False)
    placement_completed = Column(Boolean, default=False)
    ai_memory_notes = Column(Text, default="")

    user = relationship("User", back_populates="profile")

class LearningPath(Base):
    __tablename__ = "learning_paths"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    title = Column(String(255), default="Lộ trình TOEIC Cá nhân hóa")
    current_score = Column(Integer, default=425)
    target_score = Column(Integer, default=650)
    estimated_weeks = Column(Integer, default=12)
    adaptive_weights = Column(Text, default='{"grammar": 35, "listening": 30, "reading": 20, "vocabulary": 15}')
    last_adaptation_reason = Column(String(512), default="Tăng trọng số Word Form do tỷ lệ đúng dưới 45%")
    updated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="learning_path")
    nodes = relationship("LearningNode", back_populates="path", cascade="all, delete-orphan", order_by="LearningNode.order_index")

class LearningNode(Base):
    __tablename__ = "learning_nodes"

    id = Column(Integer, primary_key=True, index=True)
    path_id = Column(Integer, ForeignKey("learning_paths.id"), nullable=False)
    order_index = Column(Integer, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, default="")
    skill = Column(String(50), default="General")
    status = Column(String(50), default="locked")  # 'completed', 'in_progress', 'locked'
    progress_pct = Column(Integer, default=0)
    estimated_hours = Column(Float, default=4.0)
    target_score_checkpoint = Column(Integer, nullable=True)
    lessons_count = Column(Integer, default=5)
    completed_lessons = Column(Integer, default=0)

    path = relationship("LearningPath", back_populates="nodes")

class PlacementAttempt(Base):
    __tablename__ = "placement_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    test_type = Column(String(50), default="full")  # 'full', 'custom'
    estimated_score = Column(Integer, default=575)
    listening_score = Column(Integer, default=280)
    reading_score = Column(Integer, default=295)
    listening_pct = Column(Float, default=42.0)
    reading_pct = Column(Float, default=76.0)
    grammar_pct = Column(Float, default=48.0)
    vocabulary_pct = Column(Float, default=62.0)
    speaking_pct = Column(Float, default=55.0)
    writing_pct = Column(Float, default=60.0)
    strengths_json = Column(Text, default="[]")
    weak_areas_json = Column(Text, default="[]")
    detailed_analysis_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="placement_attempts")

class QuestionAttempt(Base):
    __tablename__ = "question_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    question_id = Column(String(100), nullable=False)
    test_id = Column(String(100), default="")
    question_number = Column(Integer, nullable=True)
    part = Column(Integer, default=1)
    section = Column(String(50), default="listening")
    topic = Column(String(100), default="")
    question_text = Column(Text, default="")
    selected_option = Column(String(10), default="")
    correct_option = Column(String(10), default="")
    is_correct = Column(Boolean, default=False)
    time_spent_sec = Column(Integer, default=30)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="question_attempts")

class TestAttempt(Base):
    __tablename__ = "test_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    test_id = Column(String(100), nullable=False)
    test_title = Column(String(255), default="")
    test_type = Column(String(50), default="lr_full")
    mode = Column(String(50), default="full")  # 'full', 'listening', 'reading', 'part'
    target_part = Column(Integer, nullable=True)
    total_score = Column(Integer, default=0)
    listening_score = Column(Integer, nullable=True)
    reading_score = Column(Integer, nullable=True)
    listening_correct = Column(String(50), nullable=True)
    reading_correct = Column(String(50), nullable=True)
    total_correct = Column(Integer, default=0)
    total_questions = Column(Integer, default=200)
    accuracy = Column(Float, default=0.0)
    time_spent_seconds = Column(Integer, default=0)
    answers_json = Column(Text, default="{}")
    review_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="test_attempts")

class UserFlashcard(Base):
    __tablename__ = "user_flashcards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    word_id = Column(String(100), nullable=False)
    word = Column(String(100), nullable=False)
    ipa = Column(String(100), default="")
    meaning = Column(Text, default="")
    part_of_speech = Column(String(50), default="")
    example = Column(Text, default="")
    audio_url = Column(String(512), default="")
    srs_stage = Column(Integer, default=1)
    interval_days = Column(Integer, default=1)
    ease_factor = Column(Float, default=2.5)
    repetitions = Column(Integer, default=0)
    lapses = Column(Integer, default=0)
    is_favorite = Column(Boolean, default=False)
    last_reviewed_at = Column(DateTime, default=datetime.utcnow)
    next_review_at = Column(DateTime, default=datetime.utcnow)
    source_context = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="flashcards")

class SavedQuestion(Base):
    __tablename__ = "saved_questions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question_id = Column(String(100), nullable=False)
    note = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

class CommunityPost(Base):
    __tablename__ = "community_posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    author_name = Column(String(255), default="Thành viên TOEIC")
    author_avatar = Column(String(512), default="")
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(100), default="Thảo luận")
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="posts")
    comments = relationship("PostComment", back_populates="post", cascade="all, delete-orphan")

class PostComment(Base):
    __tablename__ = "post_comments"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("community_posts.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    author_name = Column(String(255), default="Thành viên TOEIC")
    author_avatar = Column(String(512), default="")
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("CommunityPost", back_populates="comments")

class AIConversation(Base):
    __tablename__ = "ai_conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), default="Cuộc trò chuyện mới")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="conversations")
    messages = relationship("AIMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="AIMessage.created_at")

class AIMessage(Base):
    __tablename__ = "ai_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("ai_conversations.id"), nullable=False)
    sender = Column(String(50), default="user")
    content = Column(Text, nullable=False)
    prompt_action = Column(String(100), nullable=True)
    quiz_data = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("AIConversation", back_populates="messages")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info")
    is_read = Column(Boolean, default=False)
    link = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")

class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    code = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    icon = Column(String(50), default="Award")
    unlocked = Column(Boolean, default=False)
    progress = Column(Integer, default=0)
    max_progress = Column(Integer, default=100)
    unlocked_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="achievements")

class AIReviewQuestion(Base):
    __tablename__ = "ai_review_questions"

    id = Column(Integer, primary_key=True, index=True)
    skill = Column(String(50), default="Grammar")
    topic = Column(String(100), default="Word Form")
    difficulty = Column(String(50), default="Medium")
    question_text = Column(Text, nullable=False)
    option_a = Column(String(255), nullable=False)
    option_b = Column(String(255), nullable=False)
    option_c = Column(String(255), nullable=False)
    option_d = Column(String(255), nullable=False)
    correct_answer = Column(String(10), nullable=False)
    explanation = Column(Text, nullable=False)
    status = Column(String(50), default="ai_generated")
    reviewer_note = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

class CachedQuestion(Base):
    __tablename__ = "cached_questions"

    id = Column(String(100), primary_key=True)
    test_id = Column(String(100), index=True)
    passage_id = Column(String(100), nullable=True)
    part = Column(Integer, index=True)
    section = Column(String(50), index=True)
    question_number = Column(Integer)
    question_text = Column(Text)
    option_a = Column(Text)
    option_b = Column(Text)
    option_c = Column(Text)
    option_d = Column(Text)
    correct_answer = Column(String(10))
    explanation_vi = Column(Text)
    explanation_en = Column(Text)
    audio_url = Column(String(512), nullable=True)
    image_url = Column(String(512), nullable=True)
    passage_text = Column(Text, nullable=True)
    transcript = Column(Text, nullable=True)
    difficulty_level = Column(Integer, default=2)
    topic = Column(String(100), nullable=True)

class CachedPassage(Base):
    __tablename__ = "cached_passages"

    id = Column(String(100), primary_key=True)
    test_id = Column(String(100), index=True)
    part = Column(Integer)
    passage_type = Column(String(100), nullable=True)
    passage_text = Column(Text, nullable=True)
    transcript = Column(Text, nullable=True)
    audio_url = Column(String(512), nullable=True)
    image_url = Column(String(512), nullable=True)

class CachedVocab(Base):
    __tablename__ = "cached_vocab"

    id = Column(String(100), primary_key=True)
    word = Column(String(100), index=True)
    ipa = Column(String(100), default="")
    meaning = Column(Text)
    part_of_speech = Column(String(50), default="")
    example = Column(Text)
    example_vi = Column(Text, default="")
    toeic_tip = Column(Text, default="")
    level = Column(String(50), default="TOEIC 500")
    category = Column(String(100), default="Office")
    audio_us = Column(String(512), default="")
    audio_uk = Column(String(512), default="")
    image_url = Column(String(512), default="")
    synonyms_json = Column(Text, default="[]")
    antonyms_json = Column(Text, default="[]")
    collocations_json = Column(Text, default="[]")

class CachedGrammarTopic(Base):
    __tablename__ = "cached_grammar_topics"

    id = Column(String(100), primary_key=True)
    title_en = Column(String(255))
    title_vi = Column(String(255))
    description_en = Column(Text, default="")
    description_vi = Column(Text, default="")
    category = Column(String(100), default="Grammar")
    theory_html = Column(Text, default="")
    formula = Column(Text, default="")
    examples_json = Column(Text, default="[]")
    tips_json = Column(Text, default="[]")


class LeaderboardProfile(Base):
    __tablename__ = "leaderboard_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    full_name = Column(String(255), nullable=False)
    avatar_url = Column(String(512), default="")
    school_or_org = Column(String(255), default="Thành viên TOEIC AI")
    target_score = Column(Integer, default=750)
    current_score = Column(Integer, default=650)
    weekly_score = Column(Integer, default=650)
    monthly_score = Column(Integer, default=650)
    streak_days = Column(Integer, default=7)
    questions_count = Column(Integer, default=150)
    exp_points = Column(Integer, default=1250)
    score_growth = Column(Integer, default=45)
    accuracy_pct = Column(Float, default=75.0)
    badge = Column(String(100), default="Học viên tích cực")
    cheer_count = Column(Integer, default=12)
    rank_change = Column(Integer, default=0)
    is_seed = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="leaderboard_profile", foreign_keys=[user_id])


class LeaderboardCheer(Base):
    __tablename__ = "leaderboard_cheers"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    target_profile_id = Column(Integer, ForeignKey("leaderboard_profiles.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class PrivateMessage(Base):
    __tablename__ = "private_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    sender = relationship("User", foreign_keys=[sender_id])
    recipient = relationship("User", foreign_keys=[recipient_id])

class StudyGroup(Base):
    __tablename__ = "study_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    target_score = Column(String(100), default="500-650+")
    members_count = Column(Integer, default=1)
    active_online = Column(Integer, default=1)
    schedule_info = Column(String(255), default="")
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    creator = relationship("User", foreign_keys=[creator_id])
    members = relationship("StudyGroupMember", back_populates="group", cascade="all, delete-orphan")


class StudyGroupMember(Base):
    __tablename__ = "study_group_members"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("study_groups.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String(50), default="member")  # admin | member
    joined_at = Column(DateTime, default=datetime.utcnow)

    group = relationship("StudyGroup", back_populates="members")
    user = relationship("User")


class CommunityChatMessage(Base):
    __tablename__ = "community_chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    sender_name = Column(String(255), nullable=False)
    sender_avatar = Column(String(512), default="")
    content = Column(Text, nullable=False)
    reply_to_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    sender = relationship("User", foreign_keys=[sender_id])


class Friendship(Base):
    __tablename__ = "friendships"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    friend_id = Column(Integer, nullable=False, index=True)
    status = Column(String(50), default="accepted", index=True)  # "pending", "accepted", "rejected"
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", foreign_keys=[user_id])


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    amount = Column(Float, nullable=False)
    plan_id = Column(String(50), default="vip_6m", nullable=False)
    plan_name = Column(String(100), default="VIP Pro 6 Tháng", nullable=False)
    payment_method = Column(String(50), default="VIETQR", nullable=False)
    transaction_code = Column(String(100), unique=True, index=True, nullable=False)
    gateway_reference = Column(String(150), unique=True, index=True, nullable=True)
    status = Column(String(30), default="PENDING", index=True, nullable=False)  # PENDING, COMPLETED, CANCELLED, FAILED
    raw_payload = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="payments")


class BankTransaction(Base):
    __tablename__ = "bank_transactions"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(50), default="MBBANK", nullable=False)
    bank_transaction_id = Column(String(150), unique=True, index=True, nullable=False)
    amount = Column(Float, nullable=False)
    content = Column(Text, nullable=False, default="")
    occurred_at = Column(DateTime, nullable=True)
    status = Column(String(30), default="PENDING", index=True, nullable=False)  # PENDING, PROCESSED, IGNORED, FAILED
    error_message = Column(Text, nullable=True)
    raw_payload = Column(Text, nullable=True)
    processed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

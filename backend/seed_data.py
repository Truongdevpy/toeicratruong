import os
import json
import httpx
from datetime import datetime, timedelta
from database import engine, SessionLocal, Base
import models
from auth import hash_password
from personalization_engine import generate_default_roadmap

SUPABASE_URL = "https://odlnhfaygiotcyehuysw.supabase.co/rest/v1"
SUPABASE_KEY = "sb_publishable_4Gim-4AGEqRCeNXSVp8Xzw_P3_Lz8CB"

def seed_all():
    print("Creating all tables in platform.db...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 1. Create or ensure Demo Student and Admin Users
    student = db.query(models.User).filter(models.User.email == "student@toeicai.vn").first()
    if not student:
        student = models.User(
            email="student@toeicai.vn",
            password_hash=hash_password("password123"),
            full_name="Trần Quang Trường",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
            role="student"
        )
        db.add(student)
        db.flush()

        profile = models.UserProfile(
            user_id=student.id,
            current_score=425,
            target_score=650,
            study_purpose="TOEIC",
            daily_minutes=45,
            today_minutes_completed=30,
            streak_days=7,
            focus_skills=json.dumps(["Listening", "Reading", "Grammar", "Vocabulary"]),
            weak_areas=json.dumps(["Listening Part 3", "Word Form", "Reading Part 7 Single Passage"]),
            strengths=json.dumps(["Listening Part 1", "Reading Part 5 Basic Tenses", "Office Vocabulary"]),
            cefr_level="B1",
            onboarding_completed=True,
            placement_completed=True
        )
        db.add(profile)

        # Create Learning Path & Nodes
        path = models.LearningPath(
            user_id=student.id,
            title="Lộ trình TOEIC 650 Cá nhân hóa",
            current_score=425,
            target_score=650,
            estimated_weeks=12,
            adaptive_weights=json.dumps({"grammar": 35, "listening": 30, "reading": 20, "vocabulary": 15}),
            last_adaptation_reason="Hệ thống ưu tiên Grammar và Word Form do tỷ lệ đúng bài tập gần đây dưới 45%."
        )
        db.add(path)
        db.flush()

        nodes_data = generate_default_roadmap(425, 650)
        for nd in nodes_data:
            node = models.LearningNode(
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
            )
            db.add(node)

        # Create Placement Attempt
        placement = models.PlacementAttempt(
            user_id=student.id,
            test_type="full",
            estimated_score=575,
            listening_score=280,
            reading_score=295,
            listening_pct=42.0,
            reading_pct=76.0,
            grammar_pct=48.0,
            vocabulary_pct=62.0,
            speaking_pct=55.0,
            writing_pct=60.0,
            strengths_json=json.dumps(["Listening Part 1 (85%)", "Reading Part 5 Basic Grammar (74%)", "Office Vocabulary"]),
            weak_areas_json=json.dumps(["Listening Part 3 (38%)", "Word Form (41%)", "Reading Part 7 Inference (58%)"]),
            detailed_analysis_json=json.dumps({
                "part_1": {"accuracy": 85.0, "status": "Tốt"},
                "part_2": {"accuracy": 62.0, "status": "Trung bình"},
                "part_3": {"accuracy": 38.0, "status": "Cần cải thiện"},
                "part_4": {"accuracy": 42.0, "status": "Cần cải thiện"},
                "part_5": {"accuracy": 74.0, "status": "Tốt"},
                "part_6": {"accuracy": 69.0, "status": "Trung bình"},
                "part_7": {"accuracy": 58.0, "status": "Trung bình"}
            })
        )
        db.add(placement)

        # Add Notifications
        db.add(models.Notification(
            user_id=student.id,
            title="Chào mừng bạn đến với Nền tảng TOEIC AI!",
            message="Lộ trình cá nhân hóa của bạn đã sẵn sàng. Hãy bắt đầu với bài học đầu tiên hôm nay.",
            type="path"
        ))
        db.add(models.Notification(
            user_id=student.id,
            title="Lộ trình đã được tối ưu hóa",
            message="AI đã tăng trọng số kỹ năng Word Form lên 35% dựa trên kết quả bài kiểm tra gần nhất.",
            type="path"
        ))
        db.add(models.Notification(
            user_id=student.id,
            title="Nhắc nhở ôn tập Flashcards",
            message="Bạn có 15 thẻ từ vựng đến hạn lặp lại ngắt quãng (SRS) hôm nay.",
            type="review"
        ))

        # Add Achievements
        achievements_init = [
            ("streak_7", "Chuỗi 7 ngày học", "Học liên tục 7 ngày không gián đoạn", "Flame", True, 7, 7),
            ("questions_100", "Chiến binh 100 câu", "Hoàn thành 100 câu hỏi trắc nghiệm", "CheckCircle2", True, 100, 100),
            ("first_test", "Vượt qua thử thách", "Hoàn thành bài thi thử full test đầu tiên", "Trophy", True, 1, 1),
            ("vocab_500", "Kho từ vựng 500+", "Ghi nhớ và nắm vững 500 từ vựng TOEIC", "BookOpen", False, 280, 500),
            ("toeic_650", "Chinh phục mốc 650", "Đạt điểm thi thử từ 650 trở lên", "Target", False, 575, 650)
        ]
        for code, title, desc, icon, unlocked, prog, max_p in achievements_init:
            db.add(models.Achievement(
                user_id=student.id,
                code=code,
                title=title,
                description=desc,
                icon=icon,
                unlocked=unlocked,
                progress=prog,
                max_progress=max_p,
                unlocked_at=datetime.utcnow() if unlocked else None
            ))

        # Add Community Posts
        post1 = models.CommunityPost(
            user_id=student.id,
            author_name="Trần Quang Trường",
            author_avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
            title="Kinh nghiệm tự luyện Part 3 & 4 tăng 120 điểm trong 1 tháng",
            content="Mọi người ơi, trước đây mình rất sợ Part 3 vì nghe không kịp. Bí quyết lớn nhất của mình là luôn đọc trước 3 câu hỏi và các từ khóa chính trước khi audio phát. Ai còn mẹo hay cùng chia sẻ nhé!",
            category="Mẹo thi",
            likes_count=24,
            comments_count=2
        )
        db.add(post1)
        db.flush()

        db.add(models.PostComment(
            post_id=post1.id,
            user_id=student.id,
            author_name="Linh Đan (TOEIC 850)",
            author_avatar="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
            content="Chuẩn luôn bạn ơi! Thêm nữa là nếu câu nào lỡ không nghe được thì bỏ qua ngay để đọc câu tiếp, đừng phân vân mất nhịp!"
        ))
        db.add(models.PostComment(
            post_id=post1.id,
            user_id=student.id,
            author_name="Hoàng Nam",
            author_avatar="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
            content="Cảm ơn bạn đã chia sẻ, mình áp dụng thấy cải thiện rõ rệt!"
        ))

        db.commit()
        print("Demo student created successfully.")

    admin = db.query(models.User).filter(models.User.email == "admin@toeicai.vn").first()
    if not admin:
        admin = models.User(
            email="admin@toeicai.vn",
            password_hash=hash_password("admin123"),
            full_name="Quản trị viên Hệ thống",
            avatar_url="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
            role="admin"
        )
        db.add(admin)
        db.commit()
        print("Admin user created successfully.")

    vip = db.query(models.User).filter(models.User.email == "vip@toeicai.vn").first()
    if not vip:
        vip = models.User(
            email="vip@toeicai.vn",
            password_hash=hash_password("vip123"),
            full_name="Nguyễn Hoàng Nam (VIP 👑)",
            avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
            role="vip"
        )
        db.add(vip)
        db.flush()
        vip_profile = models.UserProfile(
            user_id=vip.id,
            current_score=785,
            target_score=900,
            daily_minutes=60,
            today_minutes_completed=35,
            streak_days=18,
            onboarding_completed=True,
            placement_completed=True,
            cefr_level="C1"
        )
        db.add(vip_profile)
        db.commit()
        print("VIP user created successfully.")

    # 2. Pull & Cache Real Questions from Supabase if table is empty
    q_count = db.query(models.CachedQuestion).count()
    print(f"Current cached questions: {q_count}")
    if q_count < 50:
        print("Fetching authentic TOEIC questions from Supabase...")
        try:
            headers = {"apikey": SUPABASE_KEY}
            with httpx.Client(headers=headers, timeout=40) as client:
                r = client.get(f"{SUPABASE_URL}/mock_test_questions?limit=250&order=question_number.asc")
                if r.status_code in [200, 206]:
                    items = r.json()
                    print(f"Fetched {len(items)} questions from Supabase.")
                    for q in items:
                        transcript = None
                        mirror = q.get("mirror_profile") or {}
                        media = mirror.get("media") or {}
                        rendered_turns = media.get("rendered_turns") or []
                        if rendered_turns:
                            transcript = "\n".join([f"{t.get('speaker', '')}: {t.get('text', '')}" for t in rendered_turns])

                        cached_q = models.CachedQuestion(
                            id=q.get("id"),
                            test_id=q.get("test_id"),
                            passage_id=q.get("passage_id"),
                            part=q.get("part", 1),
                            section=q.get("section", "listening"),
                            question_number=q.get("question_number", 1),
                            question_text=q.get("question_text") or f"Question {q.get('question_number')}",
                            option_a=q.get("option_a") or "Option A",
                            option_b=q.get("option_b") or "Option B",
                            option_c=q.get("option_c") or "Option C",
                            option_d=q.get("option_d") or "Option D",
                            correct_answer=q.get("correct_answer") or "A",
                            explanation_vi=q.get("explanation_vi") or q.get("dich_nghia") or "Giải thích chi tiết từ chuyên gia TOEIC.",
                            explanation_en=q.get("explanation_en") or "",
                            audio_url=q.get("audio_url"),
                            image_url=q.get("image_url"),
                            passage_text=q.get("passage_text"),
                            transcript=transcript,
                            difficulty_level=q.get("difficulty_level", 2),
                            topic=mirror.get("topic") or "General Business"
                        )
                        db.merge(cached_q)
                    db.commit()
                    print("Questions cached successfully.")
        except Exception as e:
            print(f"Error fetching questions: {e}")

    # 3. Pull & Cache Passages
    p_count = db.query(models.CachedPassage).count()
    if p_count < 10:
        print("Fetching authentic passages from Supabase...")
        try:
            headers = {"apikey": SUPABASE_KEY}
            with httpx.Client(headers=headers, timeout=40) as client:
                r = client.get(f"{SUPABASE_URL}/mock_test_passages?limit=50")
                if r.status_code in [200, 206]:
                    items = r.json()
                    for p in items:
                        cached_p = models.CachedPassage(
                            id=p.get("id"),
                            test_id=p.get("test_id"),
                            part=p.get("part", 7),
                            passage_type=p.get("passage_type"),
                            passage_text=p.get("passage_text"),
                            transcript=p.get("transcript"),
                            audio_url=p.get("audio_url"),
                            image_url=p.get("image_url")
                        )
                        db.merge(cached_p)
                    db.commit()
                    print(f"Passages cached: {len(items)}")
        except Exception as e:
            print(f"Error fetching passages: {e}")

    # 4. Pull & Cache Vocabulary
    v_count = db.query(models.CachedVocab).count()
    print(f"Current cached vocabulary: {v_count}")
    if v_count < 50:
        print("Fetching authentic vocabulary from Supabase...")
        try:
            headers = {"apikey": SUPABASE_KEY}
            with httpx.Client(headers=headers, timeout=40) as client:
                r = client.get(f"{SUPABASE_URL}/vocabulary_words?limit=300")
                if r.status_code in [200, 206]:
                    items = r.json()
                    for v in items:
                        meanings = v.get("meanings") or [{}]
                        m0 = meanings[0] if meanings else {}
                        phrases = v.get("phrases") or []

                        cached_v = models.CachedVocab(
                            id=v.get("id"),
                            word=v.get("word"),
                            ipa=v.get("ipa") or "",
                            meaning=m0.get("meaning") or "Ý nghĩa từ vựng",
                            part_of_speech=m0.get("part_of_speech") or "noun",
                            example=m0.get("example") or "",
                            example_vi=m0.get("example_vi") or "",
                            toeic_tip=m0.get("toeic_tip") or "Lưu ý cấu trúc và ngữ cảnh trong đề thi TOEIC.",
                            level="TOEIC 650" if v.get("difficulty_level", 1) >= 2 else "TOEIC 500",
                            category="Office" if "office" in (m0.get("meaning") or "").lower() else "Business",
                            audio_us=v.get("audio_us") or "",
                            audio_uk=v.get("audio_uk") or "",
                            image_url=v.get("image_url") or "",
                            synonyms_json=json.dumps(v.get("synonyms") or []),
                            antonyms_json=json.dumps(m0.get("antonyms") or []),
                            collocations_json=json.dumps([p.get("phrase") for p in phrases if p.get("phrase")])
                        )
                        db.merge(cached_v)

                    db.commit()
                    print(f"Vocabulary cached: {len(items)}")

                    # Seed initial student flashcards
                    student = db.query(models.User).filter(models.User.email == "student@toeicai.vn").first()
                    first_words = db.query(models.CachedVocab).limit(15).all()
                    for idx, w in enumerate(first_words):
                        db.add(models.UserFlashcard(
                            user_id=student.id,
                            word_id=w.id,
                            word=w.word,
                            ipa=w.ipa,
                            meaning=w.meaning,
                            part_of_speech=w.part_of_speech,
                            example=w.example,
                            audio_url=w.audio_us or w.audio_uk,
                            srs_stage=2 if idx % 2 == 0 else 1,
                            repetitions=idx,
                            interval_days=idx + 1,
                            next_review_at=datetime.utcnow() - timedelta(hours=idx) if idx < 8 else datetime.utcnow() + timedelta(days=2)
                        ))
                    db.commit()
                    print("Initial flashcards created.")
        except Exception as e:
            print(f"Error fetching vocabulary: {e}")

    # 5. Pull & Cache Grammar Topics
    g_count = db.query(models.CachedGrammarTopic).count()
    print(f"Current cached grammar topics: {g_count}")
    if g_count < 10:
        print("Fetching authentic grammar topics from Supabase...")
        try:
            headers = {"apikey": SUPABASE_KEY}
            with httpx.Client(headers=headers, timeout=40) as client:
                r = client.get(f"{SUPABASE_URL}/grammar_topics?limit=50")
                if r.status_code in [200, 206]:
                    items = r.json()
                    for g in items:
                        theory = f"<h3>{g.get('title_vi')} ({g.get('title_en')})</h3><p>{g.get('description_vi') or g.get('description_en') or ''}</p>"
                        cached_g = models.CachedGrammarTopic(
                            id=g.get("id"),
                            title_en=g.get("title_en"),
                            title_vi=g.get("title_vi"),
                            description_en=g.get("description_en") or "",
                            description_vi=g.get("description_vi") or "",
                            category="Grammar",
                            theory_html=theory,
                            formula="S + V + O / Noun + Adj",
                            examples_json=json.dumps([
                                {"en": "The manager approved the financial budget.", "vi": "Người quản lý đã phê duyệt ngân sách tài chính."},
                                {"en": "Ms. Watson submitted the quarterly report promptly.", "vi": "Bà Watson đã nộp báo cáo quý một cách nhanh chóng."}
                            ]),
                            tips_json=json.dumps([
                                "Chú ý nhận diện các đuôi từ đặc biệt (-al, -ive) có thể là danh từ.",
                                "Sau giới từ luôn là Danh từ, Cụm danh từ hoặc V-ing."
                            ])
                        )
                        db.merge(cached_g)
                    db.commit()
                    print(f"Grammar topics cached: {len(items)}")
        except Exception as e:
            print(f"Error fetching grammar topics: {e}")

    # 6. Seed AI Review Questions
    ai_q_count = db.query(models.AIReviewQuestion).count()
    if ai_q_count < 3:
        sample_ai = [
            models.AIReviewQuestion(
                skill="Grammar",
                topic="Word Form",
                difficulty="Medium",
                question_text="Due to the unexpected storm, the flight has been _______ delayed until tomorrow morning.",
                option_a="temporary",
                option_b="temporarily",
                option_c="temporariness",
                option_d="temporal",
                correct_answer="B",
                explanation="Giữa trợ động từ 'has been' và phân từ quá khứ 'delayed' cần một trạng từ: 'temporarily delayed'.",
                status="ai_generated"
            ),
            models.AIReviewQuestion(
                skill="Listening",
                topic="Part 3 - Workplace Conversations",
                difficulty="Hard",
                question_text="What does the woman imply when she says, 'The printer on the fourth floor is out of paper again'?",
                option_a="She wants to buy new equipment.",
                option_b="The man should use another printer.",
                option_c="She is offering to restock the paper.",
                option_d="The maintenance staff is unavailable.",
                correct_answer="B",
                explanation="Câu nói ngụ ý máy in tầng 4 không dùng được, gợi ý đối phương nên chuyển sang máy khác ở tầng khác.",
                status="pending_review"
            ),
            models.AIReviewQuestion(
                skill="Reading",
                topic="Part 5 - Conjunctions & Prepositions",
                difficulty="Medium",
                question_text="_______ the high cost of raw materials, the manufacturer maintained reasonable prices for customers.",
                option_a="Despite",
                option_b="Although",
                option_c="Because",
                option_d="Even though",
                correct_answer="A",
                explanation="Trước cụm danh từ 'the high cost of raw materials' và mang nghĩa đối lập, cần dùng giới từ 'Despite'.",
                status="approved"
            )
        ]
        db.add_all(sample_ai)
        db.commit()
        print("Sample AI review items seeded.")

    db.close()
    print("Database initialized and seeded successfully!")

if __name__ == '__main__':
    seed_all()

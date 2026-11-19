# -*- coding: utf-8 -*-
import unittest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models
from database import Base
from ai_assessment_engine import buildStats

class TestAIAssessment(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
        SessionLocal = sessionmaker(bind=self.engine)
        self.db = SessionLocal()

        # Create test user
        self.user = models.User(
            email="test_student@toeic.vn",
            password_hash="fakehash",
            full_name="Nguyen Van Test"
        )
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

    def tearDown(self):
        self.db.close()

    def test_threshold_under_15_insufficient(self):
        """Dataset 1: Beginner with 9 questions (matching the user screenshot)"""
        for i in range(9):
            att = models.QuestionAttempt(
                user_id=self.user.id,
                question_id=f"q_{i}",
                part=5,
                topic="Từ loại",
                is_correct=(i < 3), # 3 correct, 6 wrong
                time_spent_sec=25,
                created_at=datetime.utcnow()
            )
            self.db.add(att)
        self.db.commit()

        stats = buildStats(self.user.id, "part5", "all", self.db)
        self.assertEqual(stats["total_count"], 9)
        self.assertEqual(stats["correct_count"], 3)
        self.assertEqual(stats["wrong_count"], 6)
        self.assertEqual(stats["data_confidence"], "insufficient")
        # Under 5 questions per other topics or under 15 overall cannot conclude weaknesses
        self.assertEqual(len(stats["verified_weaknesses"]), 0)

    def test_threshold_15_to_49_low_confidence(self):
        """Dataset 2: 25 questions -> Low confidence tier"""
        for i in range(25):
            att = models.QuestionAttempt(
                user_id=self.user.id,
                question_id=f"q_{i}",
                part=5,
                topic="Động từ" if i < 15 else "Từ loại",
                is_correct=(i % 2 == 0),
                time_spent_sec=30,
                created_at=datetime.utcnow()
            )
            self.db.add(att)
        self.db.commit()

        stats = buildStats(self.user.id, "part5", "all", self.db)
        self.assertEqual(stats["total_count"], 25)
        self.assertEqual(stats["data_confidence"], "low")

    def test_topic_under_5_questions_not_called_weakness(self):
        """Topic with < 5 questions must be moved to need_more_data_topics"""
        # 4 questions in "Câu bị động", all 4 wrong (0% accuracy)
        for i in range(4):
            att = models.QuestionAttempt(
                user_id=self.user.id,
                question_id=f"passive_{i}",
                part=5,
                topic="Câu bị động",
                is_correct=False,
                time_spent_sec=30,
                created_at=datetime.utcnow()
            )
            self.db.add(att)

        # 16 questions in "Từ loại", 12 correct
        for i in range(16):
            att = models.QuestionAttempt(
                user_id=self.user.id,
                question_id=f"wordtype_{i}",
                part=5,
                topic="Từ loại",
                is_correct=(i < 12),
                time_spent_sec=25,
                created_at=datetime.utcnow()
            )
            self.db.add(att)

        self.db.commit()

        stats = buildStats(self.user.id, "part5", "all", self.db)
        self.assertEqual(stats["total_count"], 20)
        # 'Câu bị động' has only 4 questions (< 5 min), so it CANNOT be in verified_weaknesses
        weak_topics = [w["topic"] for w in stats["verified_weaknesses"]]
        self.assertNotIn("Câu bị động", weak_topics)
        need_more = [n["topic"] for n in stats["need_more_data_topics"]]
        self.assertIn("Câu bị động", need_more)

    def test_rush_guess_detection(self):
        """Dataset 4: Learner answering too fast (< 8s)"""
        for i in range(20):
            att = models.QuestionAttempt(
                user_id=self.user.id,
                question_id=f"rush_{i}",
                part=5,
                topic="Từ vựng",
                is_correct=(i < 5),
                time_spent_sec=4, # 4s rush
                created_at=datetime.utcnow()
            )
            self.db.add(att)
        self.db.commit()

        stats = buildStats(self.user.id, "part5", "all", self.db)
        self.assertEqual(stats["too_fast_count"], 20)

if __name__ == "__main__":
    unittest.main()

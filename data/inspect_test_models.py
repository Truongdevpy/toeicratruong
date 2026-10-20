# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, '../backend')

from database import SessionLocal
import models

db = SessionLocal()

# Check models.Test
tests = db.query(models.Test).all()
print(f"Total tests in DB: {len(tests)}")
for t in tests[:5]:
    print(f"ID: {t.id} | Code: {getattr(t, 'code', 'N/A')} | Title: {t.title} | Category: {getattr(t, 'category', 'N/A')} | Total Qs: {getattr(t, 'total_questions', 'N/A')} | Duration: {getattr(t, 'duration_minutes', 'N/A')}")

# Check questions count
q_count = db.query(models.Question).count()
print(f"Total questions in DB: {q_count}")

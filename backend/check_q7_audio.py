# -*- coding: utf-8 -*-
import sys
sys.path.insert(0, "C:/Users/truon/Downloads/toeicratruong/backend")
from routers.tests import submit_test, get_test_detail

det = get_test_detail("study4_7059")
qs = det.get("questions", [])
for q in qs[:12]:
    print(f"Detail Q#{q['question_number']}: audio_url={q['audio_url']}")

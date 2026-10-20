import sys
sys.stdout.reconfigure(encoding="utf-8")
import json
from pathlib import Path
from collections import Counter

mock_dir = Path(r"C:\Users\truon\Downloads\toeicratruong\data\data\web_ready\mock_tests")

dau_files = list(mock_dir.glob("dautoeic_*.json"))
print(f"Total Dau TOEIC mock files: {len(dau_files)}")

issues = []
for f in dau_files:
    data = json.loads(f.read_text(encoding="utf-8"))
    meta = data.get("meta", {})
    qs = data.get("questions", [])
    
    if len(qs) != 200:
        issues.append((f.name, f"total qs = {len(qs)} != 200"))
        
    for q in qs:
        q_num = q.get("question_number")
        part = q.get("part")
        ans = q.get("correct_answer")
        opts = q.get("options") or {}
        
        # Check answer
        if not ans or ans not in ["A", "B", "C", "D"]:
            issues.append((f.name, q_num, f"invalid answer {ans}"))
            
        # Check options
        if part == 2:
            if not opts.get("A") or not opts.get("B") or not opts.get("C"):
                issues.append((f.name, q_num, "missing A/B/C in part 2"))
        else:
            if not opts.get("A") or not opts.get("B") or not opts.get("C") or not opts.get("D"):
                issues.append((f.name, q_num, f"missing options in part {part}"))
                
        # Check part vs question number
        expected_p = 1 if q_num <= 6 else (2 if q_num <= 31 else (3 if q_num <= 70 else (4 if q_num <= 100 else (5 if q_num <= 130 else (6 if q_num <= 146 else 7)))))
        if part != expected_p:
            issues.append((f.name, q_num, f"part {part} != expected {expected_p}"))

print(f"Total issues found across all 31 Dau TOEIC files (6,200 questions): {len(issues)}")
if issues:
    print("Sample issues:", issues[:10])


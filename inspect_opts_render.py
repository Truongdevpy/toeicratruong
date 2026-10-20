import sys
sys.stdout.reconfigure(encoding="utf-8")
with open(r"C:\Users\truon\Downloads\toeicratruong\frontend\src\components\FocusedPracticeRoom.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
for i in range(1625, min(1690, len(lines))):
    print(f"{i+1}: {lines[i]}", end="")

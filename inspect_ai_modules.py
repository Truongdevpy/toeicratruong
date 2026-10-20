import sys
sys.stdout.reconfigure(encoding="utf-8")

for fname in ['ai_grading.py', 'ai_placement.py', 'ai_security.py', 'ai_tutor.py', 'gemini_pool.py', 'personalization_engine.py', 'streak_service.py']:
    path = f"backend/{fname}"
    try:
        with open(path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        print(f"=== {fname} ({len(lines)} lines) ===")
        # print header docstrings and function/class definitions
        for l in lines:
            if l.startswith("def ") or l.startswith("class ") or l.startswith('"""'):
                print("  ", l.strip())
    except Exception as e:
        print(f"Error {fname}: {e}")

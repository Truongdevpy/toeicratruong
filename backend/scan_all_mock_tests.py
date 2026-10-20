import json
from pathlib import Path

mock_dir = Path("C:/Users/truon/Downloads/toeicratruong/data/data/web_ready/mock_tests")
files = sorted(mock_dir.glob("*.json"))

summary = {
    "total_files": len(files),
    "tests_with_q_audio": 0,
    "tests_with_full_tape_on_questions": 0,
    "tests_with_no_audio_at_all": 0,
    "tests_with_overall_audio_only": 0,
}

full_tape_examples = []

for f in files:
    try:
        data = json.loads(f.read_text(encoding="utf-8"))
        qs = data.get("questions", [])
        overall = data.get("overall_audio") or data.get("meta", {}).get("overall_audio")
        
        q_audios = set()
        for q in qs:
            aud = q.get("local_audio") or q.get("audio_url")
            if aud:
                q_audios.add(aud)
        
        if not q_audios and not overall:
            summary["tests_with_no_audio_at_all"] += 1
        elif not q_audios and overall:
            summary["tests_with_overall_audio_only"] += 1
        else:
            summary["tests_with_q_audio"] += 1
            # Check if any q_audio is full tape
            for aud in q_audios:
                aud_lower = str(aud).lower()
                if overall and aud == overall:
                    summary["tests_with_full_tape_on_questions"] += 1
                    full_tape_examples.append((f.name, aud))
                    break
                elif any(x in aud_lower for x in ["economy_toeic", "sample_toeic", "new_real_toeic"]) and not any(x in aud_lower for x in ["part_", "q0", "passage_"]):
                    summary["tests_with_full_tape_on_questions"] += 1
                    full_tape_examples.append((f.name, aud))
                    break
    except Exception as e:
        print(f"Error reading {f.name}: {e}")

print("Summary:", summary)
print("\nFirst 10 full tape examples:")
for ex in full_tape_examples[:10]:
    print(ex)

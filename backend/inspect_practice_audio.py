# -*- coding: utf-8 -*-
import json
from pathlib import Path

p_dir = Path("C:/Users/truon/Downloads/toeicratruong/data/data/web_ready/practice_by_part")

for part_num in [1, 2, 3, 4]:
    p_file = p_dir / f"part{part_num}_practice.json"
    if p_file.exists():
        data = json.loads(p_file.read_text(encoding="utf-8"))
        by_level = data.get("data_by_level", {})
        print(f"\n=== Part {part_num} Practice ===")
        sample_audios = set()
        total_qs = 0
        for lvl, qs in by_level.items():
            total_qs += len(qs)
            for q in qs:
                aud = q.get("local_audio") or q.get("audio_url")
                if aud:
                    sample_audios.add(aud)
        print(f"Total questions: {total_qs}")
        print(f"Unique audios: {len(sample_audios)}")
        for aud in list(sample_audios)[:5]:
            print(" -", aud)

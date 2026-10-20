import json

for p in [6, 7]:
    path = f'C:/Users/truon/Downloads/toeicratruong/data/data/web_ready/practice_by_part/part{p}_practice.json'
    data = json.load(open(path, 'r', encoding='utf-8'))
    total_qs = 0
    missing_passage = 0
    for lvl, qs in data.get('data_by_level', {}).items():
        total_qs += len(qs)
        for q in qs:
            pt = q.get('passage_text') or q.get('passage')
            if not pt or not pt.strip():
                missing_passage += 1
    print(f'Part {p}: total={total_qs}, missing_passage={missing_passage}')

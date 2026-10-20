import json
from pathlib import Path

p = Path("C:/Users/truon/Downloads/toeicratruong/data/data/web_ready/tests_catalog.json")
catalog = json.loads(p.read_text(encoding="utf-8"))
for t in catalog:
    if "collection 3" in t.get("name", "").lower() and "test 10" in t.get("name", "").lower():
        print("Found in catalog:", t)
        json_file = Path("C:/Users/truon/Downloads/toeicratruong/data/data/web_ready/mock_tests") / t.get("file_name", f"{t['id']}.json")
        print("File exists:", json_file.exists(), json_file)
        if json_file.exists():
            pkg = json.loads(json_file.read_text(encoding="utf-8"))
            print("Meta:", pkg.get("meta"))
            print("Overall audio:", pkg.get("overall_audio"))
            qs = pkg.get("questions", [])
            print("Total questions:", len(qs))
            for q in qs[:10]:
                print(f"Q#{q.get('question_number')}: local_audio={q.get('local_audio')} audio_url={q.get('audio_url')} local_image={q.get('local_image')} img={q.get('image_url')}")
            for q in qs[31:35]:
                print(f"Q#{q.get('question_number')}: local_audio={q.get('local_audio')} audio_url={q.get('audio_url')} local_image={q.get('local_image')} img={q.get('image_url')}")

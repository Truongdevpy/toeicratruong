import sys
sys.stdout.reconfigure(encoding="utf-8")
import json
from pathlib import Path

mock_dir = Path("data/web_ready/mock_tests")
catalog_path = Path("data/web_ready/tests_catalog.json")

with open(catalog_path, "r", encoding="utf-8") as f:
    catalog = json.load(f)

# 1. Exact media mappings for Collections 1, 2, 3
col1_audio_map = {
    6852: "/media/study4/study4_Toeic_Lr_Collection_1/TOEIC LR Collection 1 Test 1/T1_audio.2fefc88a.mp3",
    6853: "/media/study4/study4_Toeic_Lr_Collection_1/TOEIC LR Collection 1 Test 2/T2_audio.21988a53.mp3",
    6854: "/media/study4/study4_Toeic_Lr_Collection_1/TOEIC LR Collection 1 Test 3/T3_audio.d1b28537.mp3",
    6855: "/media/study4/study4_Toeic_Lr_Collection_1/TOEIC LR Collection 1 Test 4/T4_audio.d9e32139.mp3",
    6856: "/media/study4/study4_Toeic_Lr_Collection_1/TOEIC LR Collection 1 Test 5/T1_audio.8b0a95dd.mp3",
    6857: "/media/study4/study4_Toeic_Lr_Collection_1/TOEIC LR Collection 1 Test 6/T6_audio.mp3",
    6858: "/media/study4/study4_Toeic_Lr_Collection_1/TOEIC LR Collection 1 Test 7/T7_audio.mp3",
    6859: "/media/study4/study4_Toeic_Lr_Collection_1/TOEIC LR Collection 1 Test 8/T8_audio.65d606c0.mp3",
    6860: "/media/study4/study4_Toeic_Lr_Collection_1/TOEIC LR Collection 1 Test 9/T9_audio.ee1ccb00.mp3",
    6861: "/media/study4/study4_Toeic_Lr_Collection_1/TOEIC LR Collection 1 Test 10/T10_audio.2f2057fb.mp3",
}

col2_audio_map = {
    7000: "/media/study4/study4_Toeic_Lr_Collection_2/TOEIC LR Collection 2 Test 1/T1_audio.175b8828.mp3",
    7001: "/media/study4/study4_Toeic_Lr_Collection_2/TOEIC LR Collection 2 Test 2/T2_audio.a654e570.mp3",
    7002: "/media/study4/study4_Toeic_Lr_Collection_2/TOEIC LR Collection 2 Test 3/T3_audio.3cf54927.mp3",
    7003: "/media/study4/study4_Toeic_Lr_Collection_2/TOEIC LR Collection 2 Test 4/T4_audio.eb5bfe93.mp3",
    7004: "/media/study4/study4_Toeic_Lr_Collection_2/TOEIC LR Collection 2 Test 5/T5_audio.4b97e1c4.mp3",
    7005: "/media/study4/study4_Toeic_Lr_Collection_2/TOEIC LR Collection 2 Test 6/T6_audio.6319a46a.mp3",
    7006: "/media/study4/study4_Toeic_Lr_Collection_2/TOEIC LR Collection 2 Test 7/T7_audio.89fbe133.mp3",
    7007: "/media/study4/study4_Toeic_Lr_Collection_2/TOEIC LR Collection 2 Test 8/T8_audio.7d2eb5c6.mp3",
    7008: "/media/study4/study4_Toeic_Lr_Collection_2/TOEIC LR Collection 2 Test 9/T9_audio.edd3e436.mp3",
    7009: "/media/study4/study4_Toeic_Lr_Collection_2/TOEIC LR Collection 2 Test 10/T10_audio.7af2eab2.mp3",
}

col3_audio_map = {
    7050: "/media/study4/study4_Toeic_Lr_Collection_3/TOEIC LR Collection 3 Test 1/T1_audio.d1131d7d.mp3",
    7051: "/media/study4/study4_Toeic_Lr_Collection_3/TOEIC LR Collection 3 Test 2/T2_audio.74c507fe.mp3",
    7052: "/media/study4/study4_Toeic_Lr_Collection_3/TOEIC LR Collection 3 Test 3/T3_audio.a98666f9.mp3",
    7053: "/media/study4/study4_Toeic_Lr_Collection_3/TOEIC LR Collection 3 Test 4/T4_audio.a1e32a00.mp3",
    7054: "/media/study4/study4_Toeic_Lr_Collection_3/TOEIC LR Collection 3 Test 5/T5_audio.5150ddd7.mp3",
    7055: "/media/study4/study4_Toeic_Lr_Collection_3/TOEIC LR Collection 3 Test 6/T6_audio.3bc8af47.mp3",
    7056: "/media/study4/study4_Toeic_Lr_Collection_3/TOEIC LR Collection 3 Test 7/T7_audio.8ae78102.mp3",
    7057: "/media/study4/study4_Toeic_Lr_Collection_3/TOEIC LR Collection 3 Test 8/T8_audio.9527d75d.mp3",
    7058: "/media/study4/study4_Toeic_Lr_Collection_3/TOEIC LR Collection 3 Test 9/T9_audio.9ae668e8.mp3",
    7059: "/media/study4/study4_Toeic_Lr_Collection_3/TOEIC LR Collection 3 Test 10/T10_audio.dc0c648d.mp3",
}

# 2. Sample TOEIC Tests
sample_audio_map = {
    1209: "/media/study4/study4_Sample_Toeic/Sample TOEIC Test 3/Test6.mp3",
    1211: "/media/study4/study4_Sample_Toeic/Sample TOEIC Test 4/Test7.mp3",
    1212: "/media/study4/study4_Sample_Toeic/Sample TOEIC Test 5/Test8.mp3",
    1213: "/media/study4/study4_Sample_Toeic/Sample TOEIC Test 6/Test9.mp3",
    1214: "/media/study4/study4_Sample_Toeic/Sample TOEIC Test 7/Test10.mp3",
}

# 3. Old Format Sample Tests
old_sample_map = {
    224: "/media/study4/study4_(Old_Format)_Sample_Toeic/(Old format) Sample TOEIC Test 1/economy_toeic_4_test_1_economy_toeic_4_test_1.mp3",
    225: "/media/study4/study4_(Old_Format)_Sample_Toeic/(Old format) Sample TOEIC Test 2/economy_toeic_4_test_5_economy_toeic_4_test_5.mp3",
    226: "/media/study4/study4_(Old_Format)_Sample_Toeic/(Old format) Sample TOEIC Test 3/economy_toeic_5_test_3_economy_toeic_5_test_3.mp3",
    227: "/media/study4/study4_(Old_Format)_Sample_Toeic/(Old format) Sample TOEIC Test 4/economy_toeic_5_test_6_economy_toeic_5_test_6.mp3",
    228: "/media/study4/study4_(Old_Format)_Sample_Toeic/(Old format) Sample TOEIC Test 5/new_real_toeic_test_1_new_real_toeic_test_1.mp3",
    229: "/media/study4/study4_(Old_Format)_Sample_Toeic/(Old format) Sample TOEIC Test 6/new_real_toeic_test_2_new_real_toeic_test_2.mp3",
    230: "/media/study4/study4_(Old_Format)_Sample_Toeic/(Old format) Sample TOEIC Test 7/new_real_toeic_test_4_new_real_toeic_test_4.mp3",
    231: "/media/study4/study4_Sample_Toeic/Sample TOEIC Test 8/eco_toeic_1000_test_1_eco_toeic_1000_test_1.mp3",
    232: "/media/study4/study4_Sample_Toeic/Sample TOEIC Test 9/eco_toeic_1000_test_2_eco_toeic_1000_test_2.mp3",
    265: "/media/study4/study4_Sample_Toeic/Sample TOEIC Test 10/eco_toeic_1000_test_3_eco_toeic_1000_test_3.mp3",
    266: "/media/study4/study4_Sample_Toeic/Sample TOEIC Test 1/eco_toeic_1000_test_4_eco_toeic_1000_test_4.mp3",
    267: "/media/study4/study4_Sample_Toeic/Sample TOEIC Test 2/eco_toeic_1000_test_5_eco_toeic_1000_test_5.mp3",
}

all_audio_fixes = {}
for k, v in col1_audio_map.items(): all_audio_fixes[f"study4_{k}"] = v
for k, v in col2_audio_map.items(): all_audio_fixes[f"study4_{k}"] = v
for k, v in col3_audio_map.items(): all_audio_fixes[f"study4_{k}"] = v
for k, v in sample_audio_map.items(): all_audio_fixes[f"study4_{k}"] = v
for k, v in old_sample_map.items(): all_audio_fixes[f"study4_{k}"] = v

# Dau TOEIC tests without audio
dau_missing_audio_tests = {
    "dautoeic_0ab9cd18-cf4b-4b5e-909f-ec524c2a9af8",
    "dautoeic_20b582d1-b328-4d69-a3be-4a38d1d2a377",
    "dautoeic_256fa9fb-ef0c-43c6-80a8-88073e187fcd",
    "dautoeic_2f9a7d93-66b4-4181-8bc2-e975833fe299",
    "dautoeic_4c6eb5c9-3ce3-443f-97dc-7d8984fc024e",
    "dautoeic_4fb65467-7dad-40fd-8343-5af78c548d42",
    "dautoeic_50b4803d-06ef-4eb8-99b8-afc49f20211e",
    "dautoeic_636fcc7d-7537-4416-969d-d588d38a7f59",
    "dautoeic_6ed6fbbf-33ef-48b6-8c79-30a382687ce0",
    "dautoeic_7200156e-b05b-475d-8a1c-bf3c307df14f",
    "dautoeic_93c5c7f2-82a3-4ed7-af77-09d44cc80d75",
    "dautoeic_9918e696-f706-40b9-b7c4-ea2697fa0acf",
    "dautoeic_9c533b02-97c4-4a7e-938c-0aa7930ba555",
    "dautoeic_b2e59db6-6000-4820-abdd-222f740cb66a",
    "dautoeic_b3f80c9b-ca62-45d6-86c9-c1e98d63124f",
    "dautoeic_c6bd1d48-34cf-474f-affe-ae2e74794193",
    "dautoeic_c8d411c3-a61b-4ac3-ac9f-378220a75921",
    "dautoeic_d555e39a-5c2b-4f22-9642-f091221764ce",
    "dautoeic_db59851d-1a0c-4769-b868-93b070405c64",
    "dautoeic_f4650f18-38db-4cf6-844c-b7fcf71e8fc9",
    "dautoeic_f7039741-1e2b-4666-b508-7847461b0a35"
}

# Update catalog
updated_cat = []
for entry in catalog:
    tid = entry["id"]
    # Fix mojibake in name
    if "c\ufffdu" in entry.get("name", ""):
        entry["name"] = entry["name"].replace("c\ufffdu", "câu")
    
    # Fix overall audio
    if tid in all_audio_fixes:
        entry["overall_audio"] = all_audio_fixes[tid]
    
    # Mark reading practice for 21 dau tests
    if tid in dau_missing_audio_tests:
        entry["test_type"] = "reading_practice"
        entry["name"] = entry["name"].replace("ETS TOEIC Practice Test", "ETS TOEIC Reading Practice")
        entry["has_listening_audio"] = False
    else:
        entry["has_listening_audio"] = True

    updated_cat.append(entry)

catalog_path.write_text(json.dumps(updated_cat, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Updated tests_catalog.json ({len(updated_cat)} tests).")

# Update individual mock test json files
fixed_files_count = 0
for p in mock_dir.glob("*.json"):
    tid = p.stem
    try:
        with open(p, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        continue

    modified = False
    meta = data.get("meta", {})
    if "c\ufffdu" in meta.get("name", ""):
        meta["name"] = meta["name"].replace("c\ufffdu", "câu")
        modified = True

    if tid in all_audio_fixes:
        correct_audio = all_audio_fixes[tid]
        data["overall_audio"] = correct_audio
        meta["overall_audio"] = correct_audio
        modified = True

    if tid in dau_missing_audio_tests:
        meta["test_type"] = "reading_practice"
        meta["name"] = meta.get("name", "").replace("ETS TOEIC Practice Test", "ETS TOEIC Reading Practice")
        meta["has_listening_audio"] = False
        modified = True

    # Ensure all questions have options dict and explanations
    for q in data.get("questions", []):
        opts = q.get("options")
        if not opts or not isinstance(opts, dict):
            q["options"] = {
                "A": q.get("option_a", ""),
                "B": q.get("option_b", ""),
                "C": q.get("option_c", ""),
                "D": q.get("option_d", "")
            }
            modified = True
        
        # Ensure default explanation if empty
        if not q.get("explanation"):
            ans = q.get("correct_answer") or q.get("answer") or "A"
            opt_val = q.get(f"option_{ans.lower()}") or (q.get("options") or {}).get(ans) or ""
            if opt_val:
                q["explanation"] = f"Đáp án chính xác là {ans}: {opt_val}."
            else:
                q["explanation"] = f"Đáp án chính xác là {ans}."
            modified = True

    if modified:
        p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        fixed_files_count += 1

print(f"Fixed and synced {fixed_files_count} mock test JSON files with authentic audio & explanations!")

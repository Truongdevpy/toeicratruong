import json, sys, os, glob, re, sqlite3

def test_data():
    errors = []
    print("=== RUNNING DATA GUARD TESTS ===")

    # 1. Part 3 & 7 missing prompt check
    for pno in [3, 7]:
        p = f'data/data/web_ready/practice_by_part/part{pno}_practice.json'
        with open(p, 'r', encoding='utf-8') as f:
            d = json.load(f)
            qs = d.get('questions', [])
            missing = [q for q in qs if not q.get('question_text') or not str(q.get('question_text')).strip()]
            if missing:
                errors.append(f"Part {pno} has {len(missing)} questions with missing question_text")
            else:
                print(f"[PASS] Part {pno} prompt completeness ({len(qs)}/{len(qs)} questions valid)")

    # 2. Vocabulary completeness check
    with open('data/data/web_ready/vocabulary_bank.json', 'r', encoding='utf-8') as f:
        vb = json.load(f)
        valid_vi = 0
        for w in vb:
            meanings = w.get('meanings') or []
            if isinstance(meanings, list) and len(meanings) > 0:
                if meanings[0].get('meaning') or meanings[0].get('meaning_vi'):
                    valid_vi += 1
            elif w.get('vietnamese') or w.get('meaning_vi') or w.get('vi'):
                valid_vi += 1
        if valid_vi < len(vb):
            errors.append(f"Vocabulary bank has {len(vb) - valid_vi} words missing Vietnamese meaning")
        else:
            print(f"[PASS] Vocabulary bank Vietnamese translations ({valid_vi}/{len(vb)} words checked)")

    # 3. Audio Part 1 check (no file with space)
    p1_audio_files = glob.glob('data/data/dautoeic/**/*part1*.mp3', recursive=True) + glob.glob('data/data/media/**/*part1*.mp3', recursive=True)
    space_audio = [f for f in p1_audio_files if ' ' in os.path.basename(f)]
    if space_audio:
        errors.append(f"Found {len(space_audio)} Part 1 audio files with unescaped spaces")
    else:
        print(f"[PASS] Part 1 audio file paths formatting (0 space errors found)")

    # 4. Catalog test duplicates check
    with open('data/data/web_ready/tests_catalog.json', 'r', encoding='utf-8') as f:
        tc = json.load(f)
        ids = [t.get('id') for t in tc if t.get('id')]
        if len(ids) != len(set(ids)):
            errors.append(f"tests_catalog.json has {len(ids) - len(set(ids))} duplicate IDs")
        else:
            print(f"[PASS] Tests catalog unique IDs ({len(ids)} unique tests)")

    # 5. Mojibake detection
    mojibake_tokens = ['Ã¡', 'á»', 'Ä‘', 'Ãª', 'Ã´', 'Ã ', 'Ã¨']
    found_mb = 0
    for p in ['data/data/web_ready/tests_catalog.json', 'data/data/web_ready/vocabulary_bank.json']:
        with open(p, 'r', encoding='utf-8') as f:
            content = f.read()
            for tok in mojibake_tokens:
                if tok in content:
                    found_mb += 1
    if found_mb > 0:
        errors.append(f"Found {found_mb} mojibake encoding tokens in main JSON catalogs")
    else:
        print("[PASS] Clean UTF-8 encoding (No mojibake found in catalogs)")

    # 6. Database seed users check
    if os.path.exists('backend/platform.db'):
        conn = sqlite3.connect('backend/platform.db')
        cur = conn.cursor()
        try:
            cur.execute("SELECT count(*) FROM users WHERE email LIKE '%seed%' OR email LIKE '%example.com%'")
            cnt = cur.fetchone()[0]
            if cnt > 0:
                errors.append(f"Database contains {cnt} seed/mock users")
            else:
                print("[PASS] Clean users table in database (0 seed users)")
        except Exception:
            pass
        finally:
            conn.close()

    print("================================")
    if errors:
        print("FAILURES:")
        for err in errors:
            print(f"  - {err}")
        sys.exit(1)
    else:
        print("ALL DATA TESTS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    test_data()

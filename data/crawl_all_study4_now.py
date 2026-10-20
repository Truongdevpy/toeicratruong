import sys
sys.stdout.reconfigure(encoding="utf-8")
import os
import re
import json
import sqlite3
import httpx
from datetime import datetime, timezone
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from concurrent.futures import ThreadPoolExecutor, as_completed

cookies_file = Path("data/sessions/study4_cookies.json")
cookies = json.loads(cookies_file.read_text(encoding="utf-8"))

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://study4.com/tests/",
}

def sanitize_name(name):
    return re.sub(r'[\/:*?"<>|]', "_", str(name)).strip()

def download_file(client, url, dest_path):
    dest = Path(dest_path)
    if dest.is_file() and dest.stat().st_size > 0:
        return dest.stat().st_size, "skipped"
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        with client.stream("GET", url, timeout=30) as resp:
            if resp.status_code != 200:
                return 0, f"http_{resp.status_code}"
            with open(dest, "wb") as f:
                for chunk in resp.iter_bytes(chunk_size=16384):
                    f.write(chunk)
        return dest.stat().st_size, "downloaded"
    except Exception as e:
        return 0, f"error_{e}"

def process_single_test(test_row):
    test_db_id, site, col_id, t_id, name, slug, url = test_row
    start_url = f"https://study4.com/tests/{t_id}/start/"
    now_iso = datetime.now(timezone.utc).isoformat()
    media_dir = Path("data/media/study4") / sanitize_name(col_id or "General") / sanitize_name(name)
    media_dir.mkdir(parents=True, exist_ok=True)

    local_conn = sqlite3.connect("data/crawler.db", timeout=60)
    c = local_conn.cursor()

    try:
        with httpx.Client(headers=headers, cookies=cookies, follow_redirects=True, timeout=25) as client:
            r = client.get(start_url)
            if r.status_code != 200 or "/login/" in str(r.url):
                return False, t_id, f"auth_or_http_{r.status_code}", 0, 0

            soup = BeautifulSoup(r.text, "html.parser")
            q_items = soup.find_all(class_="question-item-wrapper")
            if not q_items:
                return False, t_id, "no_questions_found", 0, 0

            # 1. Download test audio if present
            audios = soup.find_all(["audio", "source"])
            audio_urls = []
            for aud in audios:
                src = aud.get("src") or aud.get("data-src")
                if src and any(ext in src.lower() for ext in [".mp3", ".wav", ".m4a", ".ogg"]):
                    full_audio = urljoin("https://study4.com", src)
                    if full_audio not in audio_urls:
                        audio_urls.append(full_audio)

            for a_idx, a_url in enumerate(audio_urls, 1):
                filename = Path(a_url.split("?")[0]).name or f"audio_{a_idx}.mp3"
                dest = media_dir / filename
                sz, st = download_file(client, a_url, dest)
                c.execute("""
                INSERT OR REPLACE INTO downloads (
                    url, site, test_id, status, http_status, local_path, file_size, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (a_url, "study4", t_id, "completed", 200, str(dest), sz, now_iso))

            # 2. Extract questions and images
            parsed_count = 0
            img_count = 0
            is_speaking = "speaking" in slug.lower()
            is_writing = "writing" in slug.lower()

            for idx, item in enumerate(q_items, 1):
                q_num_elem = item.find(class_="question-number")
                q_num = idx
                if q_num_elem:
                    try:
                        num_text = re.sub(r'\D', '', q_num_elem.text.strip())
                        if num_text:
                            q_num = int(num_text)
                    except Exception:
                        pass

                if is_speaking:
                    part_val = 1
                    q_type = "Speaking"
                elif is_writing:
                    part_val = 2
                    q_type = "Writing"
                elif len(q_items) > 50:
                    if q_num <= 6: part_val = 1
                    elif q_num <= 31: part_val = 2
                    elif q_num <= 70: part_val = 3
                    elif q_num <= 100: part_val = 4
                    elif q_num <= 130: part_val = 5
                    elif q_num <= 146: part_val = 6
                    else: part_val = 7
                    q_type = f"Part {part_val}"
                else:
                    part_val = 1
                    q_type = "Practice"

                context_elem = item.find(class_="context-content")
                passage_text = context_elem.get_text(separator="\n", strip=True) if context_elem else ""

                q_content_elem = item.find(class_="question-content")
                q_text = q_content_elem.get_text(separator=" ", strip=True) if q_content_elem else item.get_text(separator=" ", strip=True)

                options = {}
                for opt_lbl in item.find_all(class_="form-check-label"):
                    opt_txt = opt_lbl.get_text(strip=True)
                    if opt_txt.startswith("A.") or opt_txt.startswith("A"): options["A"] = opt_txt
                    elif opt_txt.startswith("B.") or opt_txt.startswith("B"): options["B"] = opt_txt
                    elif opt_txt.startswith("C.") or opt_txt.startswith("C"): options["C"] = opt_txt
                    elif opt_txt.startswith("D.") or opt_txt.startswith("D"): options["D"] = opt_txt

                img_urls = []
                for img in item.find_all("img"):
                    isrc = img.get("data-src") or img.get("src")
                    if isrc and not any(ig in isrc.lower() for ig in ["logo", "zalo", "messenger", "icon", "banner"]):
                        full_img = urljoin("https://study4.com", isrc)
                        img_urls.append(full_img)

                saved_img_path = ""
                for i_idx, i_url in enumerate(img_urls):
                    fname = f"q{q_num}_{Path(i_url.split('?')[0]).name}"
                    idest = media_dir / fname
                    sz, st = download_file(client, i_url, idest)
                    if st in ["downloaded", "skipped"]:
                        saved_img_path = str(idest)
                        img_count += 1
                    c.execute("""
                    INSERT OR REPLACE INTO downloads (
                        url, site, test_id, status, http_status, local_path, file_size, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (i_url, "study4", t_id, "completed", 200, str(idest), sz, now_iso))

                c.execute("""
                INSERT OR REPLACE INTO questions (
                    id, site, test_id, part, question_number, question_type,
                    instruction, passage_text, question_text,
                    option_a, option_b, option_c, option_d,
                    correct_answer, explanation, image_url, audio_url,
                    raw_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    f"study4_{t_id}_{q_num}",
                    "study4",
                    t_id,
                    part_val,
                    q_num,
                    q_type,
                    "",
                    passage_text,
                    q_text[:1000],
                    options.get("A", ""),
                    options.get("B", ""),
                    options.get("C", ""),
                    options.get("D", ""),
                    "",
                    "",
                    saved_img_path or (img_urls[0] if img_urls else ""),
                    audio_urls[0] if audio_urls else "",
                    json.dumps({"passage": passage_text, "text": q_text, "options": options, "images": img_urls}, ensure_ascii=False),
                    now_iso
                ))
                parsed_count += 1

            c.execute("UPDATE tests SET status = 'completed', updated_at = ? WHERE id = ?", (now_iso, test_db_id))
            local_conn.commit()
            return True, t_id, name, parsed_count, len(audio_urls)

    except Exception as e:
        return False, t_id, str(e), 0, 0
    finally:
        local_conn.close()

conn = sqlite3.connect("data/crawler.db")
c = conn.cursor()
c.execute("SELECT id, site, collection_id, test_id, name, slug, url FROM tests WHERE site='study4'")
all_tests = c.fetchall()
conn.close()

print(f"Starting crawl for {len(all_tests)} Study4 tests with 4 worker threads...")
completed = 0
failed = 0
total_q = 0
total_aud = 0

with ThreadPoolExecutor(max_workers=4) as executor:
    futures = {executor.submit(process_single_test, t): t for t in all_tests}
    for fut in as_completed(futures):
        ok, tid, name_or_err, q_cnt, aud_cnt = fut.result()
        if ok:
            completed += 1
            total_q += q_cnt
            total_aud += aud_cnt
            print(f"[OK] Test {tid:<5} | Qs: {q_cnt:<3} | Audios: {aud_cnt:<2} | {name_or_err[:35]}")
        else:
            failed += 1
            print(f"[FAIL] Test {tid:<5} | Error: {name_or_err}")

print(f"\n==========================================")
print(f"STUDY4 CRAWL COMPLETE!")
print(f"Tests finished: {completed}/{len(all_tests)} (Failed: {failed})")
print(f"Total questions scraped: {total_q}")
print(f"Total audio files linked: {total_aud}")
print(f"==========================================")

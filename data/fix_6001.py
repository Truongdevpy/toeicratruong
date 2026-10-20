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

cookies = json.load(open("data/sessions/study4_cookies.json", encoding="utf-8"))
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

t_id = "6001"
url = f"https://study4.com/tests/{t_id}/start/"
media_dir = Path("data/media/study4/study4_Toeic_Sw_Speaking/TOEIC SW Speaking Test 15")
media_dir.mkdir(parents=True, exist_ok=True)
now_iso = datetime.now(timezone.utc).isoformat()

conn = sqlite3.connect("data/crawler.db")
c = conn.cursor()

# Remove old questions for 6001
c.execute("DELETE FROM questions WHERE site='study4' AND test_id='6001'")

with httpx.Client(headers=headers, cookies=cookies, follow_redirects=True, timeout=25) as client:
    r = client.get(url)
    soup = BeautifulSoup(r.text, "html.parser")
    items = soup.find_all(class_="question-item-wrapper")
    print(f"Items found: {len(items)}")

    for idx, item in enumerate(items, 1):
        q_text_elem = item.find(class_="question-content")
        q_text = q_text_elem.get_text(separator=" ", strip=True) if q_text_elem else item.get_text(separator=" ", strip=True)

        img_urls = []
        for img in item.find_all("img"):
            isrc = img.get("data-src") or img.get("src")
            if isrc and not any(ig in isrc.lower() for ig in ["logo", "zalo", "messenger", "icon"]):
                img_urls.append(urljoin("https://study4.com", isrc))

        saved_img_path = ""
        for i_idx, i_url in enumerate(img_urls):
            fname = f"q{idx}_{Path(i_url.split('?')[0]).name}"
            idest = media_dir / fname
            if not idest.is_file() or idest.stat().st_size == 0:
                resp = client.get(i_url)
                if resp.status_code == 200:
                    idest.write_bytes(resp.content)
            saved_img_path = str(idest)
            c.execute("""
            INSERT OR REPLACE INTO downloads (url, site, test_id, status, http_status, local_path, file_size, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (i_url, "study4", t_id, "completed", 200, str(idest), idest.stat().st_size if idest.exists() else 0, now_iso))

        c.execute("""
        INSERT INTO questions (
            id, site, test_id, part, question_number, question_type,
            instruction, passage_text, question_text,
            option_a, option_b, option_c, option_d,
            correct_answer, explanation, image_url, audio_url,
            raw_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f"study4_{t_id}_{idx}",
            "study4",
            t_id,
            1,
            idx,
            "Speaking",
            "",
            "",
            q_text[:1000],
            "", "", "", "",
            "",
            "",
            saved_img_path or (img_urls[0] if img_urls else ""),
            "",
            json.dumps({"text": q_text, "images": img_urls}, ensure_ascii=False),
            now_iso
        ))

conn.commit()
c.execute("SELECT count(*) FROM questions WHERE site='study4' AND test_id='6001'")
print(f"Updated question count for test 6001: {c.fetchone()[0]}")

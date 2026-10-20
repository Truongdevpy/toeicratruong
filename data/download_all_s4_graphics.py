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

cookies = json.load(open("data/sessions/study4_cookies.json", encoding="utf-8"))
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

conn = sqlite3.connect("data/crawler.db", timeout=60)
c = conn.cursor()

# Get all LR tests
c.execute("""
SELECT id, site, collection_id, test_id, name, slug, url
FROM tests
WHERE site = 'study4' AND slug NOT LIKE '%speaking%' AND slug NOT LIKE '%writing%'
ORDER BY test_id
""")
lr_tests = c.fetchall()
print(f"Total Study4 LR tests to check for graphics: {len(lr_tests)}")

def process_test_graphics(test_row):
    _, _, col_id, t_id, name, slug, _ = test_row
    url = f"https://study4.com/tests/{t_id}/start/"
    media_dir = Path("data/media/study4") / re.sub(r'[\/:*?"<>|]', "_", col_id or "General") / re.sub(r'[\/:*?"<>|]', "_", name)
    media_dir.mkdir(parents=True, exist_ok=True)
    now_iso = datetime.now(timezone.utc).isoformat()
    
    local_conn = sqlite3.connect("data/crawler.db", timeout=60)
    local_c = local_conn.cursor()
    
    downloaded_count = 0
    total_found = 0
    
    try:
        with httpx.Client(headers=headers, cookies=cookies, follow_redirects=True, timeout=30) as client:
            r = client.get(url)
            if r.status_code != 200 or "/login/" in str(r.url):
                return t_id, name, 0, f"err_{r.status_code}"
            
            soup = BeautifulSoup(r.text, "html.parser")
            
            for ctx in soup.find_all(class_="context-content"):
                imgs = ctx.find_all("img")
                if not imgs:
                    continue
                
                # Determine associated question numbers
                parent_group = ctx.find_parent(class_=re.compile("group|passage|section|row"))
                qnums = []
                if parent_group:
                    for q in parent_group.find_all(class_="question-number"):
                        num_text = re.sub(r"\D", "", q.text.strip())
                        if num_text:
                            qnums.append(int(num_text))
                
                if not qnums:
                    sib = ctx.find_next_sibling()
                    if sib:
                        for q in sib.find_all(class_="question-number"):
                            num_text = re.sub(r"\D", "", q.text.strip())
                            if num_text:
                                qnums.append(int(num_text))

                for img in imgs:
                    src = img.get("data-src") or img.get("src")
                    if not src or any(x in src.lower() for x in ["logo", "zalo", "messenger", "icon"]):
                        continue
                    
                    full_url = urljoin("https://study4.com", src)
                    fname = Path(full_url.split("?")[0]).name
                    if qnums:
                        fname = f"q{min(qnums)}-{max(qnums)}_{fname}"
                    dest = media_dir / fname
                    
                    if not dest.is_file() or dest.stat().st_size == 0:
                        resp = client.get(full_url)
                        if resp.status_code == 200:
                            dest.write_bytes(resp.content)
                            downloaded_count += 1
                    
                    total_found += 1
                    local_path = str(dest)
                    
                    local_c.execute("""
                    INSERT OR REPLACE INTO downloads (url, site, test_id, status, http_status, local_path, file_size, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (full_url, "study4", t_id, "completed", 200, local_path, dest.stat().st_size if dest.exists() else 0, now_iso))
                    
                    for qn in qnums:
                        local_c.execute("""
                        UPDATE questions 
                        SET image_url=? 
                        WHERE site='study4' AND test_id=? AND question_number=? AND (image_url IS NULL OR image_url='')
                        """, (local_path, t_id, qn))

            local_conn.commit()
            return t_id, name, total_found, f"ok (new dl: {downloaded_count})"
    except Exception as e:
        return t_id, name, 0, f"exception_{e}"
    finally:
        local_conn.close()

results = []
with ThreadPoolExecutor(max_workers=4) as executor:
    futures = {executor.submit(process_test_graphics, test): test for test in lr_tests}
    for future in as_completed(futures):
        res = future.result()
        results.append(res)
        print(f"[{len(results)}/{len(lr_tests)}] Test {res[0]} ({res[1]}): found {res[2]} graphics -> {res[3]}")

print("Done scanning and downloading all Study4 LR graphics!")

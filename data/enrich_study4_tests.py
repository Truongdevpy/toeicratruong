import os
import sys
import json
import re
import sqlite3
from bs4 import BeautifulSoup

sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect('data/crawler.db')
cursor = conn.cursor()

base_dir = 'data/study4'
total_tests_updated = 0
total_parts_updated = 0

for col in os.listdir(base_dir):
    col_path = os.path.join(base_dir, col)
    if not os.path.isdir(col_path):
        continue
    for test_dir in os.listdir(col_path):
        test_path = os.path.join(col_path, test_dir)
        html_file = os.path.join(test_path, 'test_page.html')
        meta_file = os.path.join(test_path, 'metadata.json')
        if not os.path.exists(html_file) or not os.path.exists(meta_file):
            continue

        with open(meta_file, 'r', encoding='utf-8') as f:
            meta = json.load(f)

        test_id = str(meta.get('test_id'))

        with open(html_file, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')

        parts = []
        for idx, f_check in enumerate(soup.find_all('div', class_='form-check'), 1):
            inp = f_check.find('input', attrs={'name': 'part'})
            if not inp:
                continue
            val = inp.get('value')
            lbl = f_check.find('label')
            lbl_text = lbl.text.strip() if lbl else f'Part {idx}'
            tags = [t.text.strip() for t in f_check.find_all('span', class_='tag')]

            q_count = 0
            m = re.search(r'\((\d+)\s+câu\s+hỏi\)', lbl_text)
            if m:
                q_count = int(m.group(1))

            part_info = {
                'part_number': idx,
                'part_id': val,
                'name': lbl_text,
                'question_count': q_count,
                'tags': tags
            }
            parts.append(part_info)

            cursor.execute('''
                INSERT INTO parts (id, site, test_id, part_number, name, instruction, question_count, created_at)
                VALUES (?, 'study4', ?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    instruction = excluded.instruction,
                    question_count = excluded.question_count
            ''', (f'study4_{test_id}_{idx}', test_id, idx, lbl_text, ', '.join(tags), q_count))
            total_parts_updated += 1

        meta['parts'] = parts
        with open(meta_file, 'w', encoding='utf-8') as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)

        part_boxes = ''
        for p in parts:
            tags_span = ''.join(f'<span class="tag">{t}</span>' for t in p['tags'])
            part_boxes += f'''
        <div class="part-box">
            <div class="part-header">{p['name']} (ID: {p['part_id']})</div>
            <div class="tag-list">{tags_span}</div>
        </div>'''

        html_out = f'''<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>{meta.get('name', 'TOEIC Test')} - Study4</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 2rem; background: #f8fafc; color: #1e293b; line-height: 1.5; }}
        .card {{ background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 2rem; max-width: 900px; margin: 0 auto; }}
        h1 {{ color: #0284c7; margin-bottom: 0.5rem; }}
        .badge {{ display: inline-block; padding: 0.25rem 0.5rem; background: #e0f2fe; color: #0369a1; border-radius: 4px; font-size: 0.875rem; margin-right: 0.5rem; }}
        .part-box {{ border: 1px solid #e2e8f0; border-radius: 6px; padding: 1rem; margin-top: 1rem; background: #fafafa; }}
        .part-header {{ font-weight: 600; font-size: 1.1rem; color: #334155; }}
        .tag-list {{ margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.35rem; }}
        .tag {{ background: #e2e8f0; color: #475569; font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 9999px; }}
        .btn {{ display: inline-block; margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: #0284c7; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; }}
        .btn:hover {{ background: #0369a1; }}
    </style>
</head>
<body>
    <div class="card">
        <h1>{meta.get('name')}</h1>
        <p>
            <span class="badge">Collection: {meta.get('collection_name', 'TOEIC')}</span>
            <span class="badge">Questions: {meta.get('total_questions', 0)}</span>
            <span class="badge">Duration: {meta.get('duration_minutes', 0)} mins</span>
        </p>
        <p><strong>URL gốc:</strong> <a href="{meta.get('url')}" target="_blank">{meta.get('url')}</a></p>
        <h2>Cấu trúc phần thi ({len(parts)} phần):</h2>
        {part_boxes}
        <br>
        <a class="btn" href="{meta.get('url')}" target="_blank">Làm bài trên Study4 &rarr;</a>
    </div>
</body>
</html>'''

        with open(os.path.join(test_path, 'test.html'), 'w', encoding='utf-8') as f:
            f.write(html_out)

        total_tests_updated += 1

conn.commit()
conn.close()
print(f'Successfully updated {total_tests_updated} Study4 tests and {total_parts_updated} parts in database!')

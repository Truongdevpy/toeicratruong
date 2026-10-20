from sites.dautoeic_extra import crawl_vocabulary
from sites.dautoeic_extra2 import crawl_grammar, crawl_videos, crawl_listening, crawl_skills_overview
"""
Dau TOEIC crawler adapter for discovering tests, questions, and media via API and storage.
"""
import asyncio
import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx

from config import DATA_DIR, DAUTOEIC_CONFIG
from core.database import Database
from core.downloader import FileDownloader
from core.media import categorize_media_type
from core.parser import normalize_question_data, generate_test_html, save_raw_data, save_json_export
from core.utils import (
    compute_file_sha256,
    format_bytes,
    get_file_extension,
    logger,
    normalize_url,
    sanitize_filename,
    sanitize_path_segment,
)
from sites.base import BaseSite


class DauToeicCrawler(BaseSite):
    """Crawler adapter for Dau TOEIC (dauenglish.com / dautoeic.vn)."""

    def __init__(self, db: Optional[Database] = None, downloader: Optional[FileDownloader] = None):
        super().__init__(db=db, downloader=downloader)
        self.site_name = "dautoeic"
        self.base_url = DAUTOEIC_CONFIG["base_url"]
        self.api_url = f"{DAUTOEIC_CONFIG['supabase_url']}/rest/v1"
        self.api_key = DAUTOEIC_CONFIG["supabase_anon_key"]
        self.headers = {
            "apikey": self.api_key,
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Prefer": "count=exact"
        }
        self.db.upsert_site(self.site_name, "Dau TOEIC", self.base_url)

    def discover_categories(self) -> List[Dict[str, Any]]:
        """Discover categories in Dau TOEIC."""
        cats = [
            {"id": "toeic_mock", "site": self.site_name, "name": "Đề thi TOEIC Full", "slug": "mock-test", "url": f"{self.base_url}/mock-test"},
            {"id": "toeic_practice", "site": self.site_name, "name": "Luyện tập từng phần", "slug": "practice", "url": f"{self.base_url}/practice"}
        ]
        for c in cats:
            self.db.upsert_category(c["id"], self.site_name, c["name"], c["slug"], c["url"])
        return cats

    def discover_collections(self, category_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Query Supabase mock_test_sets for collections."""
        try:
            with httpx.Client(headers=self.headers, timeout=20.0) as client:
                resp = client.get(f"{self.api_url}/mock_test_sets?select=*&order=order_index.asc")
                resp.raise_for_status()
                sets = resp.json()
        except Exception as e:
            logger.error(f"[DAUTOEIC] Failed to fetch mock_test_sets: {e}")
            sets = []

        collections = []
        if not sets:
            default_col = {
                "id": "col_default_dautoeic",
                "site": self.site_name,
                "name": "Crack TOEIC",
                "slug": "crack-toeic",
                "url": f"{self.base_url}/mock-test",
                "category_id": "toeic_mock"
            }
            self.db.upsert_collection(**default_col)
            collections.append(default_col)
        else:
            for s in sets:
                col = {
                    "id": str(s.get("id")),
                    "site": self.site_name,
                    "name": s.get("name") or "Crack TOEIC",
                    "slug": sanitize_path_segment(s.get("name") or "crack-toeic"),
                    "url": f"{self.base_url}/mock-test",
                    "category_id": "toeic_mock",
                    "description": s.get("description") or ""
                }
                self.db.upsert_collection(**col)
                collections.append(col)
        return collections

    def discover_tests(self, category_id: Optional[str] = None, collection_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch all mock_tests from Dau TOEIC."""
        try:
            with httpx.Client(headers=self.headers, timeout=20.0) as client:
                query = f"{self.api_url}/mock_tests?select=*&order=order_index.asc"
                if collection_id:
                    query += f"&set_id=eq.{collection_id}"
                resp = client.get(query)
                resp.raise_for_status()
                test_rows = resp.json()
        except Exception as e:
            logger.error(f"[DAUTOEIC] Failed to fetch mock_tests: {e}")
            test_rows = []

        tests = []
        for t in test_rows:
            t_id = str(t.get("id"))
            name = t.get("name") or f"Test {t_id[:6]}"
            slug = sanitize_path_segment(name)
            test_info = {
                "id": f"dautoeic_{t_id}",
                "site": self.site_name,
                "collection_id": str(t.get("set_id") or ""),
                "test_id": t_id,
                "name": name,
                "slug": slug,
                "url": f"{self.base_url}/mock-test?testId={t_id}",
                "total_questions": t.get("total_questions") or 200,
                "duration_minutes": ((t.get("listening_duration_seconds") or 2700) + (t.get("reading_duration_seconds") or 4500)) // 60,
                "is_free": 1 if t.get("is_free", True) else 0,
                "raw": t
            }
            self.db.upsert_test(
                id_val=test_info["id"],
                site=self.site_name,
                collection_id=test_info["collection_id"],
                test_id=test_info["test_id"],
                name=test_info["name"],
                slug=test_info["slug"],
                url=test_info["url"],
                total_questions=test_info["total_questions"],
                duration_minutes=test_info["duration_minutes"],
                is_free=test_info["is_free"]
            )
            tests.append(test_info)
        return tests

    def discover_parts(self, test_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parts 1 through 7 for full TOEIC test."""
        part_specs = [
            (1, "Part 1: Photographs", "Listen and choose the statement that best describes the picture."),
            (2, "Part 2: Question-Response", "Listen to three responses to each question and choose the best response."),
            (3, "Part 3: Conversations", "Listen to conversations and answer the questions."),
            (4, "Part 4: Short Talks", "Listen to short talks and answer the questions."),
            (5, "Part 5: Incomplete Sentences", "Choose the word or phrase that best completes the sentence."),
            (6, "Part 6: Text Completion", "Choose the best word or phrase to complete the texts."),
            (7, "Part 7: Reading Comprehension", "Read passages and answer the comprehension questions.")
        ]
        parts = []
        for p_num, p_name, p_inst in part_specs:
            part_id = f"dautoeic_{test_info['test_id']}_{p_num}"
            self.db.upsert_part(
                part_id=part_id,
                site=self.site_name,
                test_id=test_info["test_id"],
                part_number=p_num,
                name=p_name,
                instruction=p_inst
            )
            parts.append({
                "id": part_id,
                "site": self.site_name,
                "test_id": test_info["test_id"],
                "part_number": p_num,
                "name": p_name,
                "instruction": p_inst
            })
        return parts

    def parse_test(self, test_info: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch all questions for a test from mock_test_questions with pagination."""
        test_id = str(test_info["test_id"])
        all_raw_questions = []
        limit = 100
        offset = 0

        with httpx.Client(headers=self.headers, timeout=25.0) as client:
            while True:
                url = f"{self.api_url}/mock_test_questions?test_id=eq.{test_id}&order=question_number.asc,order_index.asc&limit={limit}&offset={offset}"
                resp = client.get(url)
                resp.raise_for_status()
                rows = resp.json()
                if not rows:
                    break
                all_raw_questions.extend(rows)
                if len(rows) < limit:
                    break
                offset += limit

            resp_p = client.get(f"{self.api_url}/mock_test_passages?test_id=eq.{test_id}&order=order_index.asc&limit=200")
            raw_passages = resp_p.json() if resp_p.status_code == 200 else []

        logger.info(f"[DAUTOEIC] Retrieved {len(all_raw_questions)} questions and {len(raw_passages)} passages for {test_info.get('name')}")
        save_raw_data(self.site_name, f"{test_id}_passages", json.dumps(raw_passages, ensure_ascii=False, indent=2))
        for p in raw_passages:
            self.db.upsert_passage(
                id_val=p.get("id"), site=self.site_name, test_id=test_id, part=p.get("part") or 1,
                title=p.get("title") or "", passage_text=p.get("passage_text"),
                passage_text_2=p.get("passage_text_2"), passage_text_3=p.get("passage_text_3"),
                audio_url=p.get("audio_url"), image_url=p.get("image_url"), transcript=p.get("transcript"),
                order_index=p.get("order_index") or 0, raw_json=json.dumps(p, ensure_ascii=False)
            )

        save_raw_data(self.site_name, test_id, json.dumps(all_raw_questions, ensure_ascii=False, indent=2))

        normalized_questions = []
        collection_name = test_info.get("collection_name") or "Crack TOEIC Vol 2"
        for q in all_raw_questions:
            options = {
                "A": q.get("option_a") or "",
                "B": q.get("option_b") or "",
                "C": q.get("option_c") or "",
                "D": q.get("option_d") or "",
            }
            explanation = q.get("explanation_vi") or q.get("explanation_en") or ""
            norm_q = normalize_question_data(
                site=self.site_name,
                test_id=test_id,
                collection=collection_name,
                part=q.get("part", 1),
                question_number=q.get("question_number", 0),
                question_type=q.get("question_type", ""),
                passage_text=q.get("passage_text", ""),
                question_text=q.get("question_text", ""),
                options=options,
                answer=q.get("correct_answer", ""),
                explanation=explanation,
                image_url=q.get("image_url", ""),
                audio_url=q.get("audio_url", ""),
                extra={
                    "dich_nghia": q.get("dich_nghia"),
                    "tu_vung": q.get("tu_vung"),
                    "difficulty_level": q.get("difficulty_level")
                }
            )
            self.db.upsert_question(norm_q)
            normalized_questions.append(norm_q)

        save_json_export(self.site_name, test_id, {
            "test_info": test_info,
            "questions": normalized_questions,
            "passages": raw_passages
        })

        return {
            "test_info": test_info,
            "questions": normalized_questions,
            "passages": raw_passages,
            "raw": all_raw_questions
        }

    def extract_media(self, test_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract media items from questions and register in database."""
        test_info = test_data["test_info"]
        test_id = str(test_info["test_id"])
        questions = test_data.get("questions", [])

        media_items = []
        seen_urls = set()

        for q in questions:
            part = q.get("part", 1)
            q_num = q.get("question_number", 0)

            # Audio
            if audio_url := q.get("audio_url") or q.get("audio"):
                norm_audio = normalize_url(audio_url)
                if norm_audio and norm_audio not in seen_urls:
                    seen_urls.add(norm_audio)
                    ext = get_file_extension(norm_audio) or ".mp3"
                    media_item = {
                        "url": norm_audio,
                        "type": "audio",
                        "extension": ext,
                        "site": self.site_name,
                        "test_id": test_id,
                        "part": part,
                        "question": q_num
                    }
                    self.db.register_media(
                        site=self.site_name,
                        test_id=test_id,
                        url=norm_audio,
                        media_type="audio",
                        extension=ext,
                        part=part,
                        question_id=q_num
                    )
                    media_items.append(media_item)

            # Image
            if img_url := q.get("image_url") or q.get("image"):
                norm_img = normalize_url(img_url)
                if norm_img and norm_img not in seen_urls:
                    seen_urls.add(norm_img)
                    ext = get_file_extension(norm_img) or ".jpg"
                    media_item = {
                        "url": norm_img,
                        "type": "image",
                        "extension": ext,
                        "site": self.site_name,
                        "test_id": test_id,
                        "part": part,
                        "question": q_num
                    }
                    self.db.register_media(
                        site=self.site_name,
                        test_id=test_id,
                        url=norm_img,
                        media_type="image",
                        extension=ext,
                        part=part,
                        question_id=q_num
                    )
                    media_items.append(media_item)

        # Extract media from passages (audio, diagrams, charts)
        for p in test_data.get("passages", []):
            part = p.get("part") or 1
            idx = p.get("order_index") or 0
            if a_url := p.get("audio_url"):
                norm = normalize_url(a_url)
                if norm and norm not in seen_urls:
                    seen_urls.add(norm)
                    ext = get_file_extension(norm) or ".mp3"
                    media_items.append({
                        "url": norm, "type": "audio", "extension": ext,
                        "site": self.site_name, "test_id": test_id, "part": part, "question": idx
                    })
                    self.db.register_media(site=self.site_name, test_id=test_id, url=norm, media_type="audio", extension=ext, part=part, question_id=idx)
            if img_u := p.get("image_url"):
                norm = normalize_url(img_u)
                if norm and norm not in seen_urls:
                    seen_urls.add(norm)
                    ext = get_file_extension(norm) or ".jpg"
                    media_items.append({
                        "url": norm, "type": "image", "extension": ext,
                        "site": self.site_name, "test_id": test_id, "part": part, "question": idx
                    })
                    self.db.register_media(site=self.site_name, test_id=test_id, url=norm, media_type="image", extension=ext, part=part, question_id=idx)

        return media_items

    def download_media(self, test_data: Dict[str, Any], dry_run: bool = False, resume: bool = True) -> Dict[str, Any]:
        """Organize files into structured directories and download."""
        test_info = test_data["test_info"]
        questions = test_data.get("questions", [])
        media_items = self.extract_media(test_data)

        col_dir_name = sanitize_path_segment(test_info.get("collection_name") or "Crack_TOEIC_Vol_2")
        test_dir_name = sanitize_path_segment(test_info.get("name") or f"Test_{test_info['test_id'][:6]}")

        target_dir = DATA_DIR / self.site_name / col_dir_name / test_dir_name
        target_dir.mkdir(parents=True, exist_ok=True)

        audio_dir = target_dir / "audio"
        images_dir = target_dir / "images"
        docs_dir = target_dir / "documents"

        for p in range(1, 5):
            (audio_dir / f"part_{p}").mkdir(parents=True, exist_ok=True)
        images_dir.mkdir(parents=True, exist_ok=True)
        docs_dir.mkdir(parents=True, exist_ok=True)

        meta_file = target_dir / "metadata.json"
        meta_file.write_text(json.dumps(test_info, ensure_ascii=False, indent=2), encoding="utf-8")

        q_file = target_dir / "questions.json"
        q_file.write_text(json.dumps(questions, ensure_ascii=False, indent=2), encoding="utf-8")

        p_file = target_dir / "passages.json"
        p_file.write_text(json.dumps(test_data.get("passages", []), ensure_ascii=False, indent=2), encoding="utf-8")

        tasks = []
        relative_media_map = {}

        for item in media_items:
            url = item["url"]
            ext = item["extension"]
            q_num = item.get("question") or 0
            part = item.get("part") or 1
            m_type = item["type"]

            url_hash = compute_file_sha256(url.encode())[:8]

            if m_type == "audio":
                part_folder = f"part_{min(max(part, 1), 4)}"
                filename = f"{q_num:03d}_audio_{url_hash}{ext}" if q_num > 0 else f"audio_{url_hash}{ext}"
                dest = audio_dir / part_folder / filename
                rel_path = f"audio/{part_folder}/{filename}"
            elif m_type == "image":
                filename = f"{q_num:03d}_image_{url_hash}{ext}" if q_num > 0 else f"image_{url_hash}{ext}"
                dest = images_dir / filename
                rel_path = f"images/{filename}"
            else:
                filename = f"doc_{url_hash}{ext}"
                dest = docs_dir / filename
                rel_path = f"documents/{filename}"

            relative_media_map[url] = rel_path
            tasks.append({
                "item": item,
                "dest_path": dest
            })

        html_content = generate_test_html(test_info, questions, relative_media_map)
        (target_dir / "test.html").write_text(html_content, encoding="utf-8")

        if dry_run:
            logger.info(f"[DRY-RUN] Discovered {len(media_items)} media files for {test_info.get('name')}. Skipping download.")
            return {
                "total": len(media_items),
                "downloaded": 0,
                "skipped": len(media_items),
                "failed": 0
            }

        results = asyncio.run(self.downloader.download_batch(tasks, check_resume=resume))
        completed = sum(1 for r in results if r.get("status") == "completed")
        skipped = sum(1 for r in results if r.get("status") == "skipped")
        failed = sum(1 for r in results if r.get("status") == "failed")

        return {
            "total": len(media_items),
            "downloaded": completed,
            "skipped": skipped,
            "failed": failed
        }
# Bind extended crawler methods
DauToeicCrawler.crawl_vocabulary = crawl_vocabulary
DauToeicCrawler.crawl_grammar = crawl_grammar
DauToeicCrawler.crawl_videos = crawl_videos
DauToeicCrawler.crawl_listening = crawl_listening
DauToeicCrawler.crawl_skills_overview = crawl_skills_overview

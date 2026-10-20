"""
Study4 crawler adapter with pagination discovery, dynamic script inspection,
Playwright session support, embedded JSON parsing, and media downloading.
"""
import asyncio
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Set
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
import httpx

from config import DATA_DIR, STUDY4_CONFIG, DEFAULT_HEADERS
from core.browser import PlaywrightBrowserManager
from core.database import Database
from core.downloader import FileDownloader
from core.media import (
    extract_media_from_html,
    extract_media_from_json,
    extract_media_from_dom,
    categorize_media_type,
    ALL_MEDIA_EXTENSIONS
)
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


class Study4Crawler(BaseSite):
    """Crawler adapter for Study4 (study4.com)."""

    def __init__(
        self,
        db: Optional[Database] = None,
        downloader: Optional[FileDownloader] = None,
        browser_manager: Optional[PlaywrightBrowserManager] = None
    ):
        super().__init__(db=db, downloader=downloader)
        self.site_name = "study4"
        self.base_url = STUDY4_CONFIG["base_url"]
        self.library_url = STUDY4_CONFIG["library_toeic_url"]
        self.session_file = STUDY4_CONFIG["session_file"]
        self.browser_manager = browser_manager
        self.db.upsert_site(self.site_name, "Study4", self.base_url)

    def _get_client_cookies(self) -> Dict[str, str]:
        """Extract cookies from saved Playwright session if present."""
        cookies = {}
        cookies_json_path = STUDY4_CONFIG.get("cookies_file")
        if cookies_json_path and Path(cookies_json_path).is_file():
            try:
                cookies.update(json.loads(Path(cookies_json_path).read_text(encoding="utf-8")))
            except Exception as e:
                logger.debug(f"Could not load cookies from {cookies_json_path}: {e}")
        if self.session_file.is_file():
            try:
                state = json.loads(self.session_file.read_text(encoding="utf-8"))
                for c in state.get("cookies", []):
                    if "study4.com" in c.get("domain", ""):
                        cookies[c["name"]] = c["value"]
            except Exception as e:
                logger.debug(f"Could not load cookies from {self.session_file}: {e}")
        return cookies

    def discover_categories(self) -> List[Dict[str, Any]]:
        """Discover TOEIC and related test categories on Study4."""
        categories = [
            {"id": "study4_toeic", "site": self.site_name, "name": "TOEIC", "slug": "toeic", "url": self.library_url},
            {"id": "study4_toeic_sw", "site": self.site_name, "name": "TOEIC Speaking & Writing", "slug": "toeic-sw", "url": STUDY4_CONFIG["library_sw_url"]}
        ]
        for c in categories:
            self.db.upsert_category(c["id"], self.site_name, c["name"], c["slug"], c["url"])
        return categories

    def discover_collections(self, category_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Derive collections by parsing test titles across library pages."""
        tests = self.discover_tests(category_id=category_id)
        collection_names = set()
        for t in tests:
            col_name = t.get("collection_name") or "General TOEIC"
            collection_names.add(col_name)

        collections = []
        for name in sorted(collection_names):
            col_id = f"study4_{sanitize_path_segment(name)}"
            col = {
                "id": col_id,
                "site": self.site_name,
                "category_id": category_id or "study4_toeic",
                "name": name,
                "slug": sanitize_path_segment(name),
                "url": self.library_url
            }
            self.db.upsert_collection(**col)
            collections.append(col)
        return collections

    def discover_tests(self, category_id: Optional[str] = None, collection_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Traverse pagination on Study4 library across both LR and SW categories.
        """
        targets = []
        if not category_id or category_id in ["all", "study4"]:
            targets = [
                ("study4_toeic", STUDY4_CONFIG["library_toeic_url"], "TOEIC"),
                ("study4_toeic_sw", STUDY4_CONFIG["library_sw_url"], "TOEIC SW")
            ]
        elif "sw" in category_id:
            targets = [("study4_toeic_sw", STUDY4_CONFIG["library_sw_url"], "TOEIC SW")]
        else:
            targets = [("study4_toeic", STUDY4_CONFIG["library_toeic_url"], "TOEIC")]

        discovered_tests: Dict[str, Dict[str, Any]] = {}
        cookies = self._get_client_cookies()

        with httpx.Client(headers=DEFAULT_HEADERS, cookies=cookies, timeout=20.0) as client:
            for cat_id, target_url, cat_name in targets:
                page_num = 1
                max_pages = 50
                while page_num <= max_pages:
                    req_url = f"{target_url}?page={page_num}" if page_num > 1 else target_url
                    logger.info(f"[STUDY4] Scanning {cat_name} page {page_num}: {req_url}")
                    try:
                        resp = client.get(req_url)
                        resp.raise_for_status()
                    except Exception as e:
                        logger.error(f"[STUDY4] Failed to fetch library page {page_num}: {e}")
                        break

                    soup = BeautifulSoup(resp.text, "html.parser")
                    test_links = soup.find_all("a", href=re.compile(r"^/tests/\d+/"))
                    if not test_links:
                        break

                    found_on_page = 0
                    for a in test_links:
                        href = a.get("href")
                        m = re.match(r"^/tests/(\d+)/([^/]+)/?", href)
                        if m:
                            t_id, slug = m.group(1), m.group(2)
                            if t_id not in discovered_tests:
                                title_text = a.text.strip().split("\n")[0].strip() or slug.replace("-", " ").title()
                                col_name = self._extract_collection_name(title_text or slug)
                                is_sw = "sw" in cat_id or "speaking" in slug or "writing" in slug
                                discovered_tests[t_id] = {
                                    "id": f"study4_{t_id}",
                                    "site": self.site_name,
                                    "category_id": cat_id,
                                    "test_id": t_id,
                                    "slug": slug,
                                    "name": title_text,
                                    "url": urljoin(self.base_url, href),
                                    "collection_name": col_name,
                                    "total_questions": 11 if "speaking" in slug else (8 if "writing" in slug else 200),
                                    "duration_minutes": 20 if "speaking" in slug else (60 if "writing" in slug else 120)
                                }
                                found_on_page += 1

                    next_page = soup.find("a", href=re.compile(rf"[?&]page={page_num + 1}"))
                    if not next_page:
                        pages = [int(m.group(1)) for a_tag in soup.find_all("a", href=True) if (m := re.search(r"[?&]page=(\d+)", a_tag.get("href")))]
                        if not pages or page_num >= max(pages):
                            break

                    page_num += 1

        test_list = list(discovered_tests.values())
        logger.info(f"[STUDY4] Discovered {len(test_list)} tests.")

        for t in test_list:
            self.db.upsert_test(
                id_val=t["id"],
                site=self.site_name,
                collection_id=f"study4_{sanitize_path_segment(t['collection_name'])}",
                test_id=t["test_id"],
                name=t["name"],
                slug=t["slug"],
                url=t["url"],
                total_questions=t["total_questions"],
                duration_minutes=t["duration_minutes"]
            )

        return test_list

    def _extract_collection_name(self, title_or_slug: str) -> str:
        """Heuristically derive collection/series name."""
        cleaned = title_or_slug.replace("-", " ")
        m = re.search(r"(.*?(?:collection|ets|economy|hackers|new economy)\s*\d+)", cleaned, re.I)
        if m:
            return m.group(1).strip().title()
        stripped = re.sub(r"(test|đề)\s*\d+.*$", "", cleaned, flags=re.I).strip()
        return stripped.title() if len(stripped) > 3 else "TOEIC Collection"

    def discover_parts(self, test_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify available parts for this test."""
        parts = []
        for p in range(1, 8):
            part_id = f"study4_{test_info['test_id']}_{p}"
            self.db.upsert_part(
                part_id=part_id,
                site=self.site_name,
                test_id=test_info["test_id"],
                part_number=p,
                name=f"Part {p}"
            )
            parts.append({
                "id": part_id,
                "site": self.site_name,
                "test_id": test_info["test_id"],
                "part_number": p,
                "name": f"Part {p}"
            })
        return parts

    def parse_test(self, test_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse test details, embedded JSON, testDetailUrl, question items, and audio.
        Uses Playwright when interactive/JS-rendered content or cookies are configured.
        """
        test_id = str(test_info["test_id"])
        test_url = test_info["url"]
        cookies = self._get_client_cookies()

        html_content = ""
        embedded_json_data = []
        intercepted_network = []

        start_html = ""
        try:
            with httpx.Client(headers=DEFAULT_HEADERS, cookies=cookies, follow_redirects=True, timeout=25.0) as client:
                resp = client.get(test_url)
                if resp.status_code == 200:
                    html_content = resp.text

                # If session cookies exist, fetch live exam room
                if cookies and any(k in cookies for k in ["sessionid", "csrftoken"]):
                    start_url = f"https://study4.com/tests/{test_id}/start/"
                    r_start = client.get(start_url)
                    if r_start.status_code == 200 and "/login/" not in str(r_start.url):
                        start_html = r_start.text
                        logger.info(f"[STUDY4] Loaded authenticated exam room for {test_info.get('name')} ({len(start_html)} bytes)")
        except Exception as e:
            logger.warning(f"[STUDY4] HTTP request error for {test_url}: {e}")

        if start_html:
            html_content = html_content + "\n" + start_html

        soup = BeautifulSoup(html_content, "html.parser") if html_content else None
        has_embedded_test_data = False

        if soup:
            for s in soup.find_all("script"):
                stype = s.get("type", "")
                sid = s.get("id", "")
                if "application/json" in stype or "test" in sid or "toeic" in sid:
                    try:
                        parsed = json.loads(s.text.strip())
                        embedded_json_data.append(parsed)
                        has_embedded_test_data = True
                    except Exception:
                        pass

        if self.browser_manager and (not has_embedded_test_data or cookies):
            logger.info(f"[STUDY4] Inspecting {test_url} with Playwright...")
            try:
                result = self.browser_manager.fetch_page_with_interception(test_url)
                if result.get("html"):
                    html_content = result["html"]
                    soup = BeautifulSoup(html_content, "html.parser")
                intercepted_network = result.get("intercepted", [])
                for item in intercepted_network:
                    if item.get("json"):
                        embedded_json_data.append(item["json"])
            except Exception as e:
                logger.debug(f"[STUDY4] Playwright inspection note: {e}")

        if html_content:
            save_raw_data(self.site_name, test_id, html_content, "html")
        if embedded_json_data:
            save_raw_data(self.site_name, f"{test_id}_embedded", json.dumps(embedded_json_data, ensure_ascii=False, indent=2), "json")

        questions: List[Dict[str, Any]] = []
        collection_name = test_info.get("collection_name") or "TOEIC Collection"

        for data_obj in embedded_json_data:
            if isinstance(data_obj, dict):
                q_list = data_obj.get("questions") or data_obj.get("items") or data_obj.get("data")
                if isinstance(q_list, list):
                    for idx, q_item in enumerate(q_list, 1):
                        if isinstance(q_item, dict):
                            norm_q = normalize_question_data(
                                site=self.site_name,
                                test_id=test_id,
                                collection=collection_name,
                                part=q_item.get("part", 1),
                                question_number=q_item.get("number") or idx,
                                question_type=q_item.get("type", ""),
                                passage_text=q_item.get("passage", ""),
                                question_text=q_item.get("text") or q_item.get("question", ""),
                                options=q_item.get("options"),
                                answer=q_item.get("answer"),
                                explanation=q_item.get("explanation"),
                                image_url=q_item.get("image") or q_item.get("image_url"),
                                audio_url=q_item.get("audio") or q_item.get("audio_url")
                            )
                            self.db.upsert_question(norm_q)
                            questions.append(norm_q)

        # Extract questions directly from HTML DOM if not in embedded JSON
        if not questions and soup:
            q_nodes = soup.find_all(class_="question-item-wrapper") or soup.find_all(class_=re.compile(r"question-wrapper", re.I))
            for idx, node in enumerate(q_nodes, 1):
                q_text = node.get_text(separator=" ", strip=True)
                if not q_text or len(q_text) < 5:
                    continue
                # Find audio and image
                aud = node.find(["audio", "source"])
                aud_src = aud.get("src") if aud else None
                img = node.find("img")
                img_src = img.get("src") if img else None
                
                # Part determination
                part_val = 1
                if idx <= 6:
                    part_val = 1
                elif idx <= 31:
                    part_val = 2
                elif idx <= 70:
                    part_val = 3
                elif idx <= 100:
                    part_val = 4
                elif idx <= 130:
                    part_val = 5
                elif idx <= 146:
                    part_val = 6
                else:
                    part_val = 7

                norm_q = normalize_question_data(
                    site=self.site_name,
                    test_id=test_id,
                    collection=collection_name,
                    part=part_val,
                    question_number=idx,
                    question_type="",
                    passage_text="",
                    question_text=q_text[:300],
                    options={},
                    answer="",
                    explanation="",
                    image_url=img_src,
                    audio_url=aud_src
                )
                self.db.upsert_question(norm_q)
                questions.append(norm_q)

        parts_list = []
        if soup:
            part_inputs = soup.find_all("input", attrs={"name": "part"}) or soup.find_all("input", id=re.compile(r"part", re.I))
            for idx, inp in enumerate(part_inputs, 1):
                part_val = inp.get("value")
                label_elem = inp.find_parent("label") or inp.find_next_sibling("label")
                part_label = label_elem.text.strip() if label_elem else f"Part {idx}"
                part_record = {
                    "part_number": idx,
                    "part_id": part_val,
                    "name": part_label
                }
                parts_list.append(part_record)
                self.db.upsert_part(
                    part_id=f"study4_{test_id}_{idx}",
                    site=self.site_name,
                    test_id=test_id,
                    part_number=idx,
                    name=f"{part_label} (ID {part_val})"
                )

        save_json_export(self.site_name, test_id, {
            "test_info": test_info,
            "questions": questions,
            "html_length": len(html_content)
        })

        return {
            "test_info": test_info,
            "html": html_content,
            "embedded_json": embedded_json_data,
            "intercepted": intercepted_network,
            "questions": questions
        }

    def extract_media(self, test_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract media from HTML, embedded JSON, and network captures."""
        test_info = test_data["test_info"]
        test_id = str(test_info["test_id"])
        html_content = test_data.get("html", "")
        embedded_json = test_data.get("embedded_json", [])
        intercepted = test_data.get("intercepted", [])
        questions = test_data.get("questions", [])

        media_items: List[Dict[str, Any]] = []
        seen_urls: Set[str] = set()

        def add_item(item: Dict[str, Any]):
            url = item.get("url")
            if url and url not in seen_urls:
                seen_urls.add(url)
                self.db.register_media(
                    site=self.site_name,
                    test_id=test_id,
                    url=url,
                    media_type=item["type"],
                    extension=item["extension"],
                    part=item.get("part"),
                    question_id=item.get("question")
                )
                media_items.append(item)

        if html_content:
            soup = BeautifulSoup(html_content, "html.parser")
            # Extract question-specific images (e.g. Part 1 photos)
            for q_item in soup.find_all(class_="question-item-wrapper"):
                q_num_elem = q_item.find(class_="question-number")
                q_num = None
                if q_num_elem:
                    try:
                        q_num = int(re.sub(r'\D', '', q_num_elem.text.strip()))
                    except Exception:
                        pass
                
                part_val = 1
                if q_num:
                    if q_num <= 6:
                        part_val = 1
                    elif q_num <= 31:
                        part_val = 2
                    elif q_num <= 70:
                        part_val = 3
                    elif q_num <= 100:
                        part_val = 4
                    elif q_num <= 130:
                        part_val = 5
                    elif q_num <= 146:
                        part_val = 6
                    else:
                        part_val = 7

                for img in q_item.find_all("img"):
                    src = img.get("data-src") or img.get("src")
                    if src and not any(ig in src.lower() for ig in ["zalo", "messenger", "logo", "facebook", "static"]):
                        norm_u = normalize_url(src, base_url=self.base_url)
                        add_item({
                            "url": norm_u,
                            "type": "image",
                            "extension": get_file_extension(norm_u) or ".jpg",
                            "source": self.site_name,
                            "test_id": test_id,
                            "part": part_val,
                            "question": q_num
                        })

            # Extract test audio files
            for aud in soup.find_all(["audio", "source"]):
                src = aud.get("src") or aud.get("data-src")
                if src and any(ext in src.lower() for ext in [".mp3", ".wav", ".ogg", ".m4a"]):
                    norm_u = normalize_url(src, base_url=self.base_url)
                    add_item({
                        "url": norm_u,
                        "type": "audio",
                        "extension": get_file_extension(norm_u) or ".mp3",
                        "source": self.site_name,
                        "test_id": test_id,
                        "part": 1,
                        "question": 0
                    })

            for m in extract_media_from_html(html_content, base_url=self.base_url, source=self.site_name, test_id=test_id):
                add_item(m)

        for obj in embedded_json:
            for m in extract_media_from_json(obj, base_url=self.base_url, source=self.site_name, test_id=test_id):
                add_item(m)

        for net in intercepted:
            req_url = normalize_url(net.get("url", ""), base_url=self.base_url)
            ext = get_file_extension(req_url)
            if ext in ALL_MEDIA_EXTENSIONS:
                add_item({
                    "url": req_url,
                    "type": categorize_media_type(ext),
                    "extension": ext,
                    "source": self.site_name,
                    "test_id": test_id
                })

        for q in questions:
            for media_field, m_type in [("audio_url", "audio"), ("image_url", "image")]:
                raw_u = q.get(media_field)
                if raw_u:
                    norm_u = normalize_url(raw_u, base_url=self.base_url)
                    ext = get_file_extension(norm_u)
                    add_item({
                        "url": norm_u,
                        "type": m_type,
                        "extension": ext,
                        "source": self.site_name,
                        "test_id": test_id,
                        "part": q.get("part"),
                        "question": q.get("question_number")
                    })

        return media_items

    def download_media(self, test_data: Dict[str, Any], dry_run: bool = False, resume: bool = True) -> Dict[str, Any]:
        """Organize files into structured directories and download."""
        test_info = test_data["test_info"]
        questions = test_data.get("questions", [])
        media_items = self.extract_media(test_data)

        col_dir_name = sanitize_path_segment(test_info.get("collection_name") or "TOEIC_Collection")
        test_dir_name = sanitize_path_segment(test_info.get("name") or f"Test_{test_info['test_id']}")

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

        if html_data := test_data.get("html"):
            (target_dir / "test_page.html").write_text(html_data, encoding="utf-8")

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

        self.downloader.set_cookies(self._get_client_cookies())
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
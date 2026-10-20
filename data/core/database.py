"""
SQLite database layer for storing crawler state, entities, media metadata, and downloads.
"""
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from config import DB_PATH
from core.utils import logger


class Database:
    """Thread-safe SQLite database manager for the crawler."""

    _instance = None
    _lock = threading.RLock()

    def __new__(cls, db_path: Optional[Path] = None):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(Database, cls).__new__(cls)
                cls._instance.db_path = db_path or DB_PATH
                cls._instance._init_db()
            return cls._instance

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), timeout=30.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        return conn

    def _init_db(self):
        """Create tables if they do not exist."""
        with self._lock, self._get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS sites (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                base_url TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                site TEXT NOT NULL,
                name TEXT NOT NULL,
                slug TEXT NOT NULL,
                url TEXT NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(site, slug)
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS collections (
                id TEXT PRIMARY KEY,
                site TEXT NOT NULL,
                category_id TEXT,
                name TEXT NOT NULL,
                slug TEXT,
                url TEXT,
                description TEXT,
                created_at TEXT NOT NULL,
                UNIQUE(site, name)
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS tests (
                id TEXT PRIMARY KEY,
                site TEXT NOT NULL,
                collection_id TEXT,
                test_id TEXT NOT NULL,
                name TEXT NOT NULL,
                slug TEXT,
                url TEXT NOT NULL,
                total_questions INTEGER DEFAULT 0,
                duration_minutes INTEGER,
                is_free INTEGER DEFAULT 1,
                status TEXT DEFAULT 'discovered',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(site, test_id)
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS parts (
                id TEXT PRIMARY KEY,
                site TEXT NOT NULL,
                test_id TEXT NOT NULL,
                part_number INTEGER NOT NULL,
                name TEXT,
                instruction TEXT,
                question_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                UNIQUE(site, test_id, part_number)
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS questions (
                id TEXT PRIMARY KEY,
                site TEXT NOT NULL,
                test_id TEXT NOT NULL,
                part INTEGER NOT NULL,
                question_number INTEGER NOT NULL,
                question_type TEXT,
                instruction TEXT,
                passage_text TEXT,
                question_text TEXT,
                option_a TEXT,
                option_b TEXT,
                option_c TEXT,
                option_d TEXT,
                correct_answer TEXT,
                explanation TEXT,
                image_url TEXT,
                audio_url TEXT,
                raw_json TEXT,
                created_at TEXT NOT NULL,
                UNIQUE(site, test_id, question_number)
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS media (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                site TEXT NOT NULL,
                test_id TEXT NOT NULL,
                part INTEGER,
                question_id INTEGER,
                url TEXT NOT NULL UNIQUE,
                media_type TEXT NOT NULL,
                extension TEXT NOT NULL,
                local_path TEXT,
                sha256 TEXT,
                status TEXT DEFAULT 'pending',
                created_at TEXT NOT NULL
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS downloads (
                url TEXT PRIMARY KEY,
                site TEXT,
                test_id TEXT,
                status TEXT NOT NULL,
                http_status INTEGER,
                local_path TEXT,
                sha256 TEXT,
                file_size INTEGER DEFAULT 0,
                retry_count INTEGER DEFAULT 0,
                error TEXT,
                updated_at TEXT NOT NULL
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS errors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                site TEXT,
                test_id TEXT,
                url TEXT,
                status INTEGER,
                error TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS passages (
                id TEXT PRIMARY KEY,
                site TEXT NOT NULL,
                test_id TEXT NOT NULL,
                part INTEGER NOT NULL,
                title TEXT,
                passage_text TEXT,
                passage_text_2 TEXT,
                passage_text_3 TEXT,
                audio_url TEXT,
                image_url TEXT,
                transcript TEXT,
                order_index INTEGER,
                raw_json TEXT,
                created_at TEXT NOT NULL
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS vocabulary_words (
                id TEXT PRIMARY KEY,
                site TEXT NOT NULL,
                set_id TEXT,
                set_name TEXT,
                test_id TEXT,
                test_name TEXT,
                part_id TEXT,
                part_name TEXT,
                word TEXT NOT NULL,
                ipa TEXT,
                audio_url TEXT,
                meanings_json TEXT,
                order_index INTEGER,
                created_at TEXT NOT NULL
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS grammar_topics (
                id TEXT PRIMARY KEY,
                title_en TEXT,
                title_vi TEXT,
                description_en TEXT,
                description_vi TEXT,
                order_index INTEGER,
                created_at TEXT NOT NULL
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS grammar_subtopics (
                id TEXT PRIMARY KEY,
                topic_id TEXT,
                title_en TEXT,
                title_vi TEXT,
                description_en TEXT,
                description_vi TEXT,
                order_index INTEGER,
                created_at TEXT NOT NULL
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS lessons (
                id TEXT PRIMARY KEY,
                subtopic_id TEXT,
                title_en TEXT,
                title_vi TEXT,
                video_url TEXT,
                theory_content_en TEXT,
                theory_content_vi TEXT,
                created_at TEXT NOT NULL
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS grammar_questions (
                id TEXT PRIMARY KEY,
                lesson_id TEXT,
                topic_id TEXT,
                subtopic_id TEXT,
                question_text TEXT,
                option_a TEXT,
                option_b TEXT,
                option_c TEXT,
                option_d TEXT,
                correct_answer TEXT,
                explanation TEXT,
                raw_json TEXT,
                created_at TEXT NOT NULL
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS video_lessons (
                id TEXT PRIMARY KEY,
                chapter_id TEXT,
                chapter_name TEXT,
                title TEXT,
                video_url TEXT,
                thumbnail_url TEXT,
                duration_seconds INTEGER,
                linked_content_id TEXT,
                created_at TEXT NOT NULL
            );
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS listening_sets (
                id TEXT PRIMARY KEY,
                name TEXT,
                folder_path TEXT,
                toeic_part TEXT,
                collection_name TEXT,
                chapter_name TEXT,
                created_at TEXT NOT NULL
            );
            """)

            conn.commit()

    def now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def upsert_site(self, id: str = "", site_id: str = "", name: str = "", base_url: str = ""):
        real_id = id or site_id
        with self._lock, self._get_connection() as conn:
            conn.execute("""
            INSERT OR REPLACE INTO sites (id, name, base_url, created_at)
            VALUES (?, ?, ?, ?)
            """, (real_id, name, base_url, self.now_iso()))
            conn.commit()

    def upsert_category(self, id: str = "", cat_id: str = "", site: str = "", name: str = "", slug: str = "", url: str = ""):
        real_id = id or cat_id
        with self._lock, self._get_connection() as conn:
            conn.execute("""
            INSERT OR REPLACE INTO categories (id, site, name, slug, url, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (real_id, site, name, slug, url, self.now_iso()))
            conn.commit()

    def upsert_collection(self, id: str = "", col_id: str = "", site: str = "", name: str = "", slug: str = "", url: str = "", category_id: str = "", description: str = ""):
        real_id = id or col_id
        with self._lock, self._get_connection() as conn:
            conn.execute("""
            INSERT OR REPLACE INTO collections (id, site, category_id, name, slug, url, description, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (real_id, site, category_id, name, slug, url, description, self.now_iso()))
            conn.commit()

    def upsert_test(self, id: str = "", id_val: str = "", site: str = "", collection_id: str = "", test_id: str = "", name: str = "", slug: str = "", url: str = "", total_questions: int = 0, duration_minutes: int = 0, is_free: int = 1, status: str = "discovered"):
        real_id = id or id_val
        now = self.now_iso()
        with self._lock, self._get_connection() as conn:
            conn.execute("""
            INSERT OR REPLACE INTO tests (id, site, collection_id, test_id, name, slug, url, total_questions, duration_minutes, is_free, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (real_id, site, collection_id, str(test_id), name, slug, url, total_questions, duration_minutes, is_free, status, now, now))
            conn.commit()

    def upsert_part(self, id: str = "", part_id: str = "", site: str = "", test_id: str = "", part_number: int = 1, name: str = "", instruction: str = "", question_count: int = 0):
        real_id = id or part_id
        with self._lock, self._get_connection() as conn:
            conn.execute("""
            INSERT OR REPLACE INTO parts (id, site, test_id, part_number, name, instruction, question_count, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (real_id, site, str(test_id), part_number, name, instruction, question_count, self.now_iso()))
            conn.commit()

    def upsert_question(self, q_data: Dict[str, Any]):
        now = self.now_iso()
        with self._lock, self._get_connection() as conn:
            conn.execute("""
            INSERT OR REPLACE INTO questions (
                id, site, test_id, part, question_number, question_type,
                instruction, passage_text, question_text,
                option_a, option_b, option_c, option_d,
                correct_answer, explanation, image_url, audio_url,
                raw_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                q_data.get("id"),
                q_data.get("site"),
                str(q_data.get("test_id")),
                q_data.get("part", 1),
                q_data.get("question_number", 0),
                q_data.get("question_type", ""),
                q_data.get("instruction", ""),
                q_data.get("passage_text", ""),
                q_data.get("question_text", ""),
                q_data.get("option_a", ""),
                q_data.get("option_b", ""),
                q_data.get("option_c", ""),
                q_data.get("option_d", ""),
                q_data.get("correct_answer", ""),
                q_data.get("explanation", ""),
                q_data.get("image_url", ""),
                q_data.get("audio_url", ""),
                q_data.get("raw_json", ""),
                now
            ))
            conn.commit()

    def register_media(self, site: str, test_id: str, url: str, media_type: str, extension: str, part: Optional[int] = None, question_id: Optional[int] = None, local_path: Optional[str] = None) -> bool:
        """Register a media URL. Returns True if newly inserted, False if already existed."""
        now = self.now_iso()
        with self._lock, self._get_connection() as conn:
            try:
                conn.execute("""
                INSERT INTO media (site, test_id, part, question_id, url, media_type, extension, local_path, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
                ON CONFLICT(url) DO UPDATE SET
                    test_id=excluded.test_id,
                    part=COALESCE(excluded.part, media.part),
                    question_id=COALESCE(excluded.question_id, media.question_id)
                """, (site, str(test_id), part, question_id, url, media_type, extension, local_path, now))

                conn.execute("""
                INSERT INTO downloads (url, site, test_id, status, local_path, retry_count, updated_at)
                VALUES (?, ?, ?, 'pending', ?, 0, ?)
                ON CONFLICT(url) DO NOTHING
                """, (url, site, str(test_id), local_path, now))

                conn.commit()
                return True
            except Exception as e:
                logger.debug(f"Media registration error for {url}: {e}")
                return False

    def find_file_by_sha256(self, sha256_hash: str) -> Optional[str]:
        """Find an existing downloaded file with the given SHA-256 hash."""
        if not sha256_hash:
            return None
        with self._lock, self._get_connection() as conn:
            row = conn.execute("""
            SELECT local_path FROM downloads
            WHERE sha256 = ? AND status = 'completed' AND local_path IS NOT NULL
            LIMIT 1
            """, (sha256_hash,)).fetchone()
            if row and row["local_path"] and Path(row["local_path"]).is_file():
                return row["local_path"]
        return None

    def update_download_completed(self, url: str, local_path: str, sha256_hash: str, file_size: int, http_status: int = 200):
        now = self.now_iso()
        with self._lock, self._get_connection() as conn:
            conn.execute("""
            UPDATE downloads
            SET status = 'completed',
                http_status = ?,
                local_path = ?,
                sha256 = ?,
                file_size = ?,
                error = NULL,
                updated_at = ?
            WHERE url = ?
            """, (http_status, str(local_path), sha256_hash, file_size, now, url))

            conn.execute("""
            UPDATE media
            SET status = 'completed',
                local_path = ?,
                sha256 = ?
            WHERE url = ?
            """, (str(local_path), sha256_hash, url))
            conn.commit()

    def update_download_skipped(self, url: str, local_path: str, sha256_hash: str = ""):
        now = self.now_iso()
        with self._lock, self._get_connection() as conn:
            conn.execute("""
            UPDATE downloads
            SET status = 'skipped',
                local_path = ?,
                sha256 = COALESCE(NULLIF(?, ''), sha256),
                updated_at = ?
            WHERE url = ?
            """, (str(local_path), sha256_hash, now, url))

            conn.execute("""
            UPDATE media
            SET status = 'skipped',
                local_path = ?,
                sha256 = COALESCE(NULLIF(?, ''), sha256)
            WHERE url = ?
            """, (str(local_path), sha256_hash, url))
            conn.commit()

    def update_download_failed(self, url: str, error_msg: str, http_status: Optional[int] = None):
        now = self.now_iso()
        with self._lock, self._get_connection() as conn:
            conn.execute("""
            UPDATE downloads
            SET status = 'failed',
                http_status = ?,
                error = ?,
                retry_count = retry_count + 1,
                updated_at = ?
            WHERE url = ?
            """, (http_status, error_msg, now, url))

            conn.execute("""
            UPDATE media
            SET status = 'failed'
            WHERE url = ?
            """, (url,))
            conn.commit()

    def record_error(self, site: str, url: str, error_msg: str, status: Optional[int] = None, test_id: Optional[str] = None):
        now = self.now_iso()
        with self._lock, self._get_connection() as conn:
            conn.execute("""
            INSERT INTO errors (site, test_id, url, status, error, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (site, str(test_id) if test_id else None, url, status, error_msg, now))
            conn.commit()

    def get_pending_downloads(self, site: Optional[str] = None, retry_failed: bool = False) -> List[Dict[str, Any]]:
        statuses = "('pending')" if not retry_failed else "('pending', 'failed')"
        query = f"""
        SELECT d.url, d.site, d.test_id, d.local_path, d.retry_count, m.media_type, m.extension, m.part, m.question_id
        FROM downloads d
        LEFT JOIN media m ON d.url = m.url
        WHERE d.status IN {statuses}
        """
        params = []
        if site and site.lower() != "all":
            query += " AND (d.site = ? OR d.site IS NULL)"
            params.append(site.lower())

        with self._lock, self._get_connection() as conn:
            rows = conn.execute(query, tuple(params)).fetchall()
            return [dict(r) for r in rows]

    def get_summary_stats(self, site_name: Optional[str] = None) -> Dict[str, Any]:
        with self._lock, self._get_connection() as conn:
            def filter_clause(col="site"):
                if site_name and site_name.lower() != "all":
                    return f"WHERE {col} = ?", (site_name.lower(),)
                return "", ()

            c_where, c_params = filter_clause()
            collections_count = conn.execute(f"SELECT COUNT(*) FROM collections {c_where}", c_params).fetchone()[0]
            tests_count = conn.execute(f"SELECT COUNT(*) FROM tests {c_where}", c_params).fetchone()[0]
            parts_count = conn.execute(f"SELECT COUNT(*) FROM parts {c_where}", c_params).fetchone()[0]
            questions_count = conn.execute(f"SELECT COUNT(*) FROM questions {c_where}", c_params).fetchone()[0]

            audio_count = conn.execute(f"SELECT COUNT(*) FROM media {c_where} {'AND' if c_where else 'WHERE'} media_type = 'audio'", c_params).fetchone()[0]
            images_count = conn.execute(f"SELECT COUNT(*) FROM media {c_where} {'AND' if c_where else 'WHERE'} media_type = 'image'", c_params).fetchone()[0]
            documents_count = conn.execute(f"SELECT COUNT(*) FROM media {c_where} {'AND' if c_where else 'WHERE'} media_type = 'document'", c_params).fetchone()[0]

            downloaded = conn.execute(f"SELECT COUNT(*) FROM downloads {c_where} {'AND' if c_where else 'WHERE'} status = 'completed'", c_params).fetchone()[0]
            skipped = conn.execute(f"SELECT COUNT(*) FROM downloads {c_where} {'AND' if c_where else 'WHERE'} status = 'skipped'", c_params).fetchone()[0]
            failed = conn.execute(f"SELECT COUNT(*) FROM downloads {c_where} {'AND' if c_where else 'WHERE'} status = 'failed'", c_params).fetchone()[0]
            errors = conn.execute(f"SELECT COUNT(*) FROM errors {c_where}", c_params).fetchone()[0]

            return {
                "collections": collections_count,
                "tests": tests_count,
                "parts": parts_count,
                "questions": questions_count,
                "audio": audio_count,
                "images": images_count,
                "documents": documents_count,
                "downloaded": downloaded,
                "skipped": skipped,
                "failed": failed,
                "errors": errors,
            }
    def upsert_passage(self, id_val: str, site: str, test_id: str, part: int, title: str,
                       passage_text: Optional[str] = None, passage_text_2: Optional[str] = None,
                       passage_text_3: Optional[str] = None, audio_url: Optional[str] = None,
                       image_url: Optional[str] = None, transcript: Optional[str] = None,
                       order_index: int = 0, raw_json: Optional[str] = None):
        now = self.now_iso()
        with self._lock, self._get_connection() as conn:
            conn.execute("""
            INSERT INTO passages (id, site, test_id, part, title, passage_text, passage_text_2, passage_text_3, audio_url, image_url, transcript, order_index, raw_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                passage_text = excluded.passage_text,
                audio_url = excluded.audio_url,
                image_url = excluded.image_url,
                transcript = excluded.transcript,
                order_index = excluded.order_index,
                raw_json = excluded.raw_json
            """, (id_val, site, str(test_id), part, title, passage_text, passage_text_2, passage_text_3, audio_url, image_url, transcript, order_index, raw_json, now))
            conn.commit()

    def upsert_vocab_word(self, id_val: str, site: str, set_id: str, set_name: str,
                          test_id: str, test_name: str, part_id: str, part_name: str,
                          word: str, ipa: Optional[str], audio_url: Optional[str],
                          meanings_json: str, order_index: int = 0):
        now = self.now_iso()
        with self._lock, self._get_connection() as conn:
            conn.execute("""
            INSERT INTO vocabulary_words (id, site, set_id, set_name, test_id, test_name, part_id, part_name, word, ipa, audio_url, meanings_json, order_index, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                word = excluded.word,
                ipa = excluded.ipa,
                audio_url = excluded.audio_url,
                meanings_json = excluded.meanings_json,
                order_index = excluded.order_index
            """, (id_val, site, set_id, set_name, test_id, test_name, part_id, part_name, word, ipa, audio_url, meanings_json, order_index, now))
            conn.commit()

    def upsert_grammar_topic(self, id_val: str, title_en: str, title_vi: str, description_en: Optional[str], description_vi: Optional[str], order_index: int = 0):
        now = self.now_iso()
        with self._lock, self._get_connection() as conn:
            conn.execute("""
            INSERT INTO grammar_topics (id, title_en, title_vi, description_en, description_vi, order_index, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title_en = excluded.title_en,
                title_vi = excluded.title_vi,
                description_en = excluded.description_en,
                description_vi = excluded.description_vi,
                order_index = excluded.order_index
            """, (id_val, title_en, title_vi, description_en, description_vi, order_index, now))
            conn.commit()

    def upsert_grammar_subtopic(self, id_val: str, topic_id: str, title_en: str, title_vi: str, description_en: Optional[str], description_vi: Optional[str], order_index: int = 0):
        now = self.now_iso()
        with self._lock, self._get_connection() as conn:
            conn.execute("""
            INSERT INTO grammar_subtopics (id, topic_id, title_en, title_vi, description_en, description_vi, order_index, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title_en = excluded.title_en,
                title_vi = excluded.title_vi,
                description_en = excluded.description_en,
                description_vi = excluded.description_vi,
                order_index = excluded.order_index
            """, (id_val, topic_id, title_en, title_vi, description_en, description_vi, order_index, now))
            conn.commit()

    def upsert_lesson(self, id_val: str, subtopic_id: str, title_en: str, title_vi: str, video_url: Optional[str], theory_content_en: Optional[str], theory_content_vi: Optional[str]):
        now = self.now_iso()
        with self._lock, self._get_connection() as conn:
            conn.execute("""
            INSERT INTO lessons (id, subtopic_id, title_en, title_vi, video_url, theory_content_en, theory_content_vi, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title_en = excluded.title_en,
                title_vi = excluded.title_vi,
                video_url = excluded.video_url,
                theory_content_en = excluded.theory_content_en,
                theory_content_vi = excluded.theory_content_vi
            """, (id_val, subtopic_id, title_en, title_vi, video_url, theory_content_en, theory_content_vi, now))
            conn.commit()

    def upsert_grammar_question(self, id_val: str, lesson_id: Optional[str], topic_id: Optional[str], subtopic_id: Optional[str],
                                question_text: str, option_a: Optional[str], option_b: Optional[str], option_c: Optional[str], option_d: Optional[str],
                                correct_answer: Optional[str], explanation: Optional[str], raw_json: Optional[str] = None):
        now = self.now_iso()
        with self._lock, self._get_connection() as conn:
            conn.execute("""
            INSERT INTO grammar_questions (id, lesson_id, topic_id, subtopic_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, raw_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                question_text = excluded.question_text,
                option_a = excluded.option_a,
                option_b = excluded.option_b,
                option_c = excluded.option_c,
                option_d = excluded.option_d,
                correct_answer = excluded.correct_answer,
                explanation = excluded.explanation,
                raw_json = excluded.raw_json
            """, (id_val, lesson_id, topic_id, subtopic_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, raw_json, now))
            conn.commit()

    def upsert_video_lesson(self, id_val: str, chapter_id: Optional[str], chapter_name: Optional[str], title: str, video_url: Optional[str], thumbnail_url: Optional[str], duration_seconds: int = 0, linked_content_id: Optional[str] = None):
        now = self.now_iso()
        with self._lock, self._get_connection() as conn:
            conn.execute("""
            INSERT INTO video_lessons (id, chapter_id, chapter_name, title, video_url, thumbnail_url, duration_seconds, linked_content_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                chapter_id = excluded.chapter_id,
                chapter_name = excluded.chapter_name,
                title = excluded.title,
                video_url = excluded.video_url,
                thumbnail_url = excluded.thumbnail_url,
                duration_seconds = excluded.duration_seconds,
                linked_content_id = excluded.linked_content_id
            """, (id_val, chapter_id, chapter_name, title, video_url, thumbnail_url, duration_seconds, linked_content_id, now))
            conn.commit()

    def upsert_listening_set(self, id_val: str, name: str, folder_path: Optional[str], toeic_part: Optional[str], collection_name: Optional[str], chapter_name: Optional[str]):
        now = self.now_iso()
        with self._lock, self._get_connection() as conn:
            conn.execute("""
            INSERT INTO listening_sets (id, name, folder_path, toeic_part, collection_name, chapter_name, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                folder_path = excluded.folder_path,
                toeic_part = excluded.toeic_part,
                collection_name = excluded.collection_name,
                chapter_name = excluded.chapter_name
            """, (id_val, name, folder_path, toeic_part, collection_name, chapter_name, now))
            conn.commit()

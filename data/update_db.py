with open("core/database.py", "r", encoding="utf-8") as f:
    content = f.read()

err_target = """            cursor.execute(\"\"\"
            CREATE TABLE IF NOT EXISTS errors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                site TEXT,
                test_id TEXT,
                url TEXT,
                status INTEGER,
                error TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            \"\"\")"""

extra_tables = """
            cursor.execute(\"\"\"
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
            \"\"\")

            cursor.execute(\"\"\"
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
            \"\"\")

            cursor.execute(\"\"\"
            CREATE TABLE IF NOT EXISTS grammar_topics (
                id TEXT PRIMARY KEY,
                title_en TEXT,
                title_vi TEXT,
                description_en TEXT,
                description_vi TEXT,
                order_index INTEGER,
                created_at TEXT NOT NULL
            );
            \"\"\")

            cursor.execute(\"\"\"
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
            \"\"\")

            cursor.execute(\"\"\"
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
            \"\"\")

            cursor.execute(\"\"\"
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
            \"\"\")

            cursor.execute(\"\"\"
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
            \"\"\")

            cursor.execute(\"\"\"
            CREATE TABLE IF NOT EXISTS listening_sets (
                id TEXT PRIMARY KEY,
                name TEXT,
                folder_path TEXT,
                toeic_part TEXT,
                collection_name TEXT,
                chapter_name TEXT,
                created_at TEXT NOT NULL
            );
            \"\"\")"""

extra_methods = """
    def upsert_passage(self, id_val: str, site: str, test_id: str, part: int, title: str,
                       passage_text: Optional[str] = None, passage_text_2: Optional[str] = None,
                       passage_text_3: Optional[str] = None, audio_url: Optional[str] = None,
                       image_url: Optional[str] = None, transcript: Optional[str] = None,
                       order_index: int = 0, raw_json: Optional[str] = None):
        now = self.now_iso()
        with self._lock, self._get_connection() as conn:
            conn.execute(\"\"\"
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
            \"\"\", (id_val, site, str(test_id), part, title, passage_text, passage_text_2, passage_text_3, audio_url, image_url, transcript, order_index, raw_json, now))
            conn.commit()

    def upsert_vocab_word(self, id_val: str, site: str, set_id: str, set_name: str,
                          test_id: str, test_name: str, part_id: str, part_name: str,
                          word: str, ipa: Optional[str], audio_url: Optional[str],
                          meanings_json: str, order_index: int = 0):
        now = self.now_iso()
        with self._lock, self._get_connection() as conn:
            conn.execute(\"\"\"
            INSERT INTO vocabulary_words (id, site, set_id, set_name, test_id, test_name, part_id, part_name, word, ipa, audio_url, meanings_json, order_index, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                word = excluded.word,
                ipa = excluded.ipa,
                audio_url = excluded.audio_url,
                meanings_json = excluded.meanings_json,
                order_index = excluded.order_index
            \"\"\", (id_val, site, set_id, set_name, test_id, test_name, part_id, part_name, word, ipa, audio_url, meanings_json, order_index, now))
            conn.commit()

    def upsert_grammar_topic(self, id_val: str, title_en: str, title_vi: str, description_en: Optional[str], description_vi: Optional[str], order_index: int = 0):
        now = self.now_iso()
        with self._lock, self._get_connection() as conn:
            conn.execute(\"\"\"
            INSERT INTO grammar_topics (id, title_en, title_vi, description_en, description_vi, order_index, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title_en = excluded.title_en,
                title_vi = excluded.title_vi,
                description_en = excluded.description_en,
                description_vi = excluded.description_vi,
                order_index = excluded.order_index
            \"\"\", (id_val, title_en, title_vi, description_en, description_vi, order_index, now))
            conn.commit()

    def upsert_grammar_subtopic(self, id_val: str, topic_id: str, title_en: str, title_vi: str, description_en: Optional[str], description_vi: Optional[str], order_index: int = 0):
        now = self.now_iso()
        with self._lock, self._get_connection() as conn:
            conn.execute(\"\"\"
            INSERT INTO grammar_subtopics (id, topic_id, title_en, title_vi, description_en, description_vi, order_index, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title_en = excluded.title_en,
                title_vi = excluded.title_vi,
                description_en = excluded.description_en,
                description_vi = excluded.description_vi,
                order_index = excluded.order_index
            \"\"\", (id_val, topic_id, title_en, title_vi, description_en, description_vi, order_index, now))
            conn.commit()

    def upsert_lesson(self, id_val: str, subtopic_id: str, title_en: str, title_vi: str, video_url: Optional[str], theory_content_en: Optional[str], theory_content_vi: Optional[str]):
        now = self.now_iso()
        with self._lock, self._get_connection() as conn:
            conn.execute(\"\"\"
            INSERT INTO lessons (id, subtopic_id, title_en, title_vi, video_url, theory_content_en, theory_content_vi, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                title_en = excluded.title_en,
                title_vi = excluded.title_vi,
                video_url = excluded.video_url,
                theory_content_en = excluded.theory_content_en,
                theory_content_vi = excluded.theory_content_vi
            \"\"\", (id_val, subtopic_id, title_en, title_vi, video_url, theory_content_en, theory_content_vi, now))
            conn.commit()

    def upsert_grammar_question(self, id_val: str, lesson_id: Optional[str], topic_id: Optional[str], subtopic_id: Optional[str],
                                question_text: str, option_a: Optional[str], option_b: Optional[str], option_c: Optional[str], option_d: Optional[str],
                                correct_answer: Optional[str], explanation: Optional[str], raw_json: Optional[str] = None):
        now = self.now_iso()
        with self._lock, self._get_connection() as conn:
            conn.execute(\"\"\"
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
            \"\"\", (id_val, lesson_id, topic_id, subtopic_id, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, raw_json, now))
            conn.commit()

    def upsert_video_lesson(self, id_val: str, chapter_id: Optional[str], chapter_name: Optional[str], title: str, video_url: Optional[str], thumbnail_url: Optional[str], duration_seconds: int = 0, linked_content_id: Optional[str] = None):
        now = self.now_iso()
        with self._lock, self._get_connection() as conn:
            conn.execute(\"\"\"
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
            \"\"\", (id_val, chapter_id, chapter_name, title, video_url, thumbnail_url, duration_seconds, linked_content_id, now))
            conn.commit()

    def upsert_listening_set(self, id_val: str, name: str, folder_path: Optional[str], toeic_part: Optional[str], collection_name: Optional[str], chapter_name: Optional[str]):
        now = self.now_iso()
        with self._lock, self._get_connection() as conn:
            conn.execute(\"\"\"
            INSERT INTO listening_sets (id, name, folder_path, toeic_part, collection_name, chapter_name, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                folder_path = excluded.folder_path,
                toeic_part = excluded.toeic_part,
                collection_name = excluded.collection_name,
                chapter_name = excluded.chapter_name
            \"\"\", (id_val, name, folder_path, toeic_part, collection_name, chapter_name, now))
            conn.commit()
"""

if err_target in content:
    content = content.replace(err_target, err_target + extra_tables)
    content += extra_methods
    with open("core/database.py", "w", encoding="utf-8") as f:
        f.write(content)
    print("SUCCESS: Updated core/database.py successfully!")
else:
    print("ERROR: Target not found in core/database.py")

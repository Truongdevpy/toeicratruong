"""
TOEIC Crawler & Downloader CLI.
Automates test discovery, structured media downloading, deduplication, and export.
"""
import argparse
import csv
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure UTF-8 output on Windows consoles
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from config import (
    BASE_DIR,
    DATA_DIR,
    DB_PATH,
    DEFAULT_CONCURRENCY,
    DEFAULT_DELAY_MIN,
    DEFAULT_DELAY_MAX,
    EXPORT_DIR,
    STUDY4_CONFIG,
    DAUTOEIC_CONFIG,
)
from core.browser import PlaywrightBrowserManager
from core.database import Database
from core.downloader import FileDownloader
from core.utils import logger, sanitize_filename
from sites.dautoeic import DauToeicCrawler
from sites.study4 import Study4Crawler


def export_data(db: Database):
    """Generate catalog.json, questions.json, media.json, and tests.csv in export/."""
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    logger.info("Generating export data files in export/...")

    with db._get_connection() as conn:
        sites = [dict(r) for r in conn.execute("SELECT * FROM sites").fetchall()]
        collections = [dict(r) for r in conn.execute("SELECT * FROM collections").fetchall()]
        tests = [dict(r) for r in conn.execute("SELECT * FROM tests").fetchall()]
        parts = [dict(r) for r in conn.execute("SELECT * FROM parts").fetchall()]
        media_count = conn.execute("SELECT COUNT(*) FROM media").fetchone()[0]

        catalog = {
            "sites": sites,
            "collections": collections,
            "tests": tests,
            "parts": parts,
            "media_count": media_count
        }
        (EXPORT_DIR / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")

        questions = [dict(r) for r in conn.execute("SELECT * FROM questions ORDER BY site, test_id, part, question_number").fetchall()]
        (EXPORT_DIR / "questions.json").write_text(json.dumps(questions, ensure_ascii=False, indent=2), encoding="utf-8")

        passages = [dict(r) for r in conn.execute("SELECT * FROM passages ORDER BY site, test_id, part, order_index").fetchall()]
        (EXPORT_DIR / "passages.json").write_text(json.dumps(passages, ensure_ascii=False, indent=2), encoding="utf-8")

        vocab = [dict(r) for r in conn.execute("SELECT * FROM vocabulary_words ORDER BY set_id, test_id, part_id, order_index").fetchall()]
        (EXPORT_DIR / "vocabulary.json").write_text(json.dumps(vocab, ensure_ascii=False, indent=2), encoding="utf-8")

        grammar_topics = [dict(r) for r in conn.execute("SELECT * FROM grammar_topics ORDER BY order_index").fetchall()]
        grammar_subs = [dict(r) for r in conn.execute("SELECT * FROM grammar_subtopics ORDER BY order_index").fetchall()]
        grammar_lessons = [dict(r) for r in conn.execute("SELECT * FROM lessons").fetchall()]
        grammar_qs = [dict(r) for r in conn.execute("SELECT * FROM grammar_questions").fetchall()]
        (EXPORT_DIR / "grammar.json").write_text(json.dumps({
            "topics": grammar_topics,
            "subtopics": grammar_subs,
            "lessons": grammar_lessons,
            "questions": grammar_qs
        }, ensure_ascii=False, indent=2), encoding="utf-8")

        videos = [dict(r) for r in conn.execute("SELECT * FROM video_lessons").fetchall()]
        (EXPORT_DIR / "videos.json").write_text(json.dumps(videos, ensure_ascii=False, indent=2), encoding="utf-8")

        listening_sets = [dict(r) for r in conn.execute("SELECT * FROM listening_sets").fetchall()]
        (EXPORT_DIR / "listening.json").write_text(json.dumps(listening_sets, ensure_ascii=False, indent=2), encoding="utf-8")

        media_items = [dict(r) for r in conn.execute("SELECT * FROM media ORDER BY site, test_id, part, question_id").fetchall()]
        (EXPORT_DIR / "media.json").write_text(json.dumps(media_items, ensure_ascii=False, indent=2), encoding="utf-8")

        csv_path = EXPORT_DIR / "tests.csv"
        with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow(["site", "collection_id", "test_id", "name", "slug", "total_questions", "duration_minutes", "is_free", "url"])
            for t in tests:
                writer.writerow([
                    t.get("site"),
                    t.get("collection_id"),
                    t.get("test_id"),
                    t.get("name"),
                    t.get("slug"),
                    t.get("total_questions"),
                    t.get("duration_minutes"),
                    t.get("is_free"),
                    t.get("url")
                ])

    print(f"[OK] Export completed: {EXPORT_DIR}")


def print_final_summary(db: Database, study4_stats: Dict[str, Any], dautoeic_stats: Dict[str, Any]):
    """Print the final completion summary in the requested format."""
    total_downloaded = study4_stats.get("downloaded", 0) + dautoeic_stats.get("downloaded", 0)
    total_skipped = study4_stats.get("skipped", 0) + dautoeic_stats.get("skipped", 0)
    total_failed = study4_stats.get("failed", 0) + dautoeic_stats.get("failed", 0)

    print("\n" + "=" * 40)
    print("CRAWL COMPLETED")
    print("=" * 40 + "\n")

    print("Study4:")
    print(f"Collections: {study4_stats.get('collections', 0)}")
    print(f"Tests: {study4_stats.get('tests', 0)}")
    print(f"Parts: {study4_stats.get('parts', 0)}")
    print(f"Questions: {study4_stats.get('questions', 0)}")
    print(f"Audio: {study4_stats.get('audio', 0)}")
    print(f"Images: {study4_stats.get('images', 0)}")
    print(f"Documents: {study4_stats.get('documents', 0)}\n")

    print("DauToeic:")
    print(f"Collections: {dautoeic_stats.get('collections', 0)}")
    print(f"Tests: {dautoeic_stats.get('tests', 0)}")
    print(f"Parts: {dautoeic_stats.get('parts', 0)}")
    print(f"Questions: {dautoeic_stats.get('questions', 0)}")
    print(f"Audio: {dautoeic_stats.get('audio', 0)}")
    print(f"Images: {dautoeic_stats.get('images', 0)}")
    print(f"Documents: {dautoeic_stats.get('documents', 0)}\n")

    print(f"Total downloaded: {total_downloaded}")
    print(f"Total skipped: {total_skipped}")
    print(f"Total failed: {total_failed}\n")

    print(f"Database:\n{DB_PATH}\n")
    print(f"Export:\n{EXPORT_DIR}\n")
    print("=" * 40 + "\n")


def run_crawler():
    parser = argparse.ArgumentParser(description="TOEIC Crawler & Downloader")
    parser.add_argument("--site", choices=["study4", "dautoeic", "all"], default="all", help="Target site (default: all)")
    parser.add_argument("--category", default=None, help="Filter by category (e.g. toeic)")
    parser.add_argument("--test-id", default=None, help="Crawl a specific test ID")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of tests to crawl")
    parser.add_argument("--resume", action="store_true", help="Resume interrupted crawl and skip completed files")
    parser.add_argument("--retry-failed", action="store_true", help="Retry failed downloads from database")
    parser.add_argument("--export-json", action="store_true", help="Export catalog, questions, and media to JSON/CSV")
    parser.add_argument("--export-only", action="store_true", help="Export existing database directly to export/ without running crawler")
    parser.add_argument("--dry-run", action="store_true", help="Simulate crawling and estimate media without downloading")
    parser.add_argument("--login", action="store_true", help="Launch interactive browser to log in and save session")
    parser.add_argument("--headless", type=str, default="true", help="Run browser in headless mode (true/false)")
    parser.add_argument("--concurrency", type=int, default=DEFAULT_CONCURRENCY, help="Download concurrency (default: 3)")
    parser.add_argument("--delay", type=float, default=1.5, help="Delay in seconds between requests (default: 1.5)")

    args = parser.parse_args()

    # Interactive Login Flow
    if args.login:
        target_site = args.site if args.site in ["study4", "dautoeic"] else "study4"
        login_url = STUDY4_CONFIG["login_url"] if target_site == "study4" else f"{DAUTOEIC_CONFIG['base_url']}/auth"
        session_file = STUDY4_CONFIG["session_file"]
        browser_mgr = PlaywrightBrowserManager(headless=False, session_state_file=session_file)
        browser_mgr.interactive_login(login_url)
        return

    # Initialize Database & Downloader
    db = Database(DB_PATH)
    if args.export_only:
        export_data(db)
        return
    delay_min = max(0.5, args.delay * 0.8)
    delay_max = max(1.0, args.delay * 1.2)
    downloader = FileDownloader(
        concurrency=args.concurrency,
        delay_min=delay_min,
        delay_max=delay_max,
        db=db
    )

    # Initialize Browser Manager if needed
    is_headless = args.headless.lower() != "false"
    browser_manager = None
    if args.site in ["study4", "all"]:
        try:
            browser_manager = PlaywrightBrowserManager(headless=is_headless, session_state_file=STUDY4_CONFIG["session_file"])
        except Exception as e:
            logger.debug(f"Browser manager initialization note: {e}")

    # Retry Failed Only
    if args.retry_failed:
        logger.info("Retrying previously failed downloads from database...")
        pending = db.get_pending_downloads(site=args.site, retry_failed=True)
        tasks = []
        for p in pending:
            tasks.append({
                "item": p,
                "dest_path": Path(p["local_path"]) if p.get("local_path") else DATA_DIR / (p.get("site") or "misc") / "media" / sanitize_filename(p["url"])
            })
        if tasks:
            import asyncio
            results = asyncio.run(downloader.download_batch(tasks, check_resume=True))
            logger.info(f"Retried {len(tasks)} items: {sum(1 for r in results if r.get('status') == 'completed')} succeeded.")
        else:
            logger.info("No failed items to retry.")
        if args.export_json:
            export_data(db)
        return

    crawlers: List[Any] = []
    if args.site in ["dautoeic", "all"]:
        crawlers.append(DauToeicCrawler(db=db, downloader=downloader))
    if args.site in ["study4", "all"]:
        crawlers.append(Study4Crawler(db=db, downloader=downloader, browser_manager=browser_manager))

    # Dry-Run Mode
    if args.dry_run:
        print("\n" + "=" * 40)
        print("DRY-RUN MODE (Estimation Only)")
        print("=" * 40 + "\n")
        for crawler in crawlers:
            print(f"{crawler.site_name.capitalize()}:")
            categories = crawler.discover_categories()
            collections = crawler.discover_collections()
            tests = crawler.discover_tests(category_id=args.category)
            if args.test_id:
                tests = [t for t in tests if str(t.get("test_id")) == str(args.test_id)]
            if args.limit:
                tests = tests[:args.limit]

            total_audio = 0
            total_images = 0
            total_docs = 0
            total_parts = len(tests) * 7

            for t in tests:
                parsed = crawler.parse_test(t)
                media = crawler.extract_media(parsed)
                for m in media:
                    m_type = m.get("type")
                    if m_type == "audio":
                        total_audio += 1
                    elif m_type == "image":
                        total_images += 1
                    else:
                        total_docs += 1

            print(f"  collections: {len(collections)}")
            print(f"  tests: {len(tests)}")
            print(f"  parts: {total_parts}")
            print(f"  audio: {total_audio}")
            print(f"  images: {total_images}")
            print(f"  documents: {total_docs}\n")
        return

    # Execution Loop for selected sites
    for crawler in crawlers:
        site_name = crawler.site_name.upper()

        if crawler.site_name == "dautoeic":
            print("\n[DISCOVERY]")
            categories = crawler.discover_categories()
            print(f"Categories: {len(categories)}")
            for c in categories:
                print(f"  - {c.get('name')} ({c.get('slug')})")

            collections = crawler.discover_collections()
            print(f"Collections: {len(collections)}")
            for col in collections:
                print(f"  - {col.get('name')}")

            tests = crawler.discover_tests(category_id=args.category)
            print(f"Tests: {len(tests)}")
            for t in tests[:5]:
                print(f"  - {t.get('name')} (ID: {t.get('test_id')})")
            print(f"Pagination: 1 page (all {len(tests)} tests returned via API)")
            print(f"API endpoints: {DAUTOEIC_CONFIG['supabase_url']}/rest/v1/mock_tests")
            print(f"Media patterns: {DAUTOEIC_CONFIG['storage_url']}/...\n")
        else:
            categories = crawler.discover_categories()
            collections = crawler.discover_collections()
            tests = crawler.discover_tests(category_id=args.category)

        if args.test_id:
            tests = [t for t in tests if str(t.get("test_id")) == str(args.test_id)]
        if args.limit:
            tests = tests[:args.limit]

        total_tests = len(tests)
        total_collections = len(collections)

        logger.info(f"[{site_name}] Commencing processing of {total_tests} tests...")

        for t_idx, test_info in enumerate(tests, 1):
            col_name = test_info.get("collection_name") or "Collection"
            test_name = test_info.get("name")

            print("\n" + "-" * 40)
            print(f"SITE: {site_name}")
            print(f"Collection: {t_idx}/{total_collections} ({col_name})")
            print(f"Test: {t_idx}/{total_tests} ({test_name})")
            print("-" * 40)

            crawler.discover_parts(test_info)
            test_data = crawler.parse_test(test_info)
            questions_count = len(test_data.get("questions", []))
            print(f"Questions parsed: {questions_count}")

            result = crawler.download_media(test_data, dry_run=False, resume=args.resume)
            print(f"Media batch -> Total: {result.get('total', 0)}, Downloaded: {result.get('downloaded', 0)}, Skipped: {result.get('skipped', 0)}, Failed: {result.get('failed', 0)}")

        if isinstance(crawler, DauToeicCrawler):
            print("\n" + "=" * 40)
            print("CRAWLING DAU TOEIC SUPPLEMENTARY MODULES")
            print("=" * 40)
            v_res = crawler.crawl_vocabulary()
            print(f"[OK] Vocabulary: {v_res.get('words', 0)} words in {v_res.get('sets', 0)} sets.")
            g_res = crawler.crawl_grammar()
            print(f"[OK] Grammar: {g_res.get('topics', 0)} topics, {g_res.get('lessons', 0)} lessons, {g_res.get('questions', 0)} practice questions.")
            vid_res = crawler.crawl_videos()
            print(f"[OK] Videos: {vid_res.get('videos', 0)} video lessons in {vid_res.get('chapters', 0)} chapters.")
            lis_res = crawler.crawl_listening()
            print(f"[OK] Listening: {lis_res.get('listening_sets', 0)} listening sets.")
            crawler.crawl_skills_overview()
            print("[OK] Speaking & Writing module blueprints exported.")

    if browser_manager:
        browser_manager.stop()

    s4_stats = db.get_summary_stats("study4")
    dau_stats = db.get_summary_stats("dautoeic")

    print_final_summary(db, s4_stats, dau_stats)

    if args.export_json:
        export_data(db)


if __name__ == "__main__":
    run_crawler()
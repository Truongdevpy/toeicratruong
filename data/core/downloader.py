"""
Robust async file downloader supporting resume, HTTP Range, SHA-256 duplicate detection,
rate limiting, exponential backoff retries, and database synchronization.
"""
import asyncio
import os
import random
import shutil
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional
import httpx
from tenacity import AsyncRetrying, stop_after_attempt, wait_exponential, retry_if_exception_type

from config import (
    DEFAULT_CONCURRENCY,
    DEFAULT_DELAY_MIN,
    DEFAULT_DELAY_MAX,
    MAX_RETRIES,
    REQUEST_TIMEOUT,
    DEFAULT_HEADERS
)
from core.database import Database
from core.utils import (
    compute_file_sha256,
    format_bytes,
    log_error,
    logger,
    sanitize_filename
)


class FileDownloader:
    """Async downloader with resume, deduplication, and rate limiting."""

    def __init__(
        self,
        concurrency: int = DEFAULT_CONCURRENCY,
        delay_min: float = DEFAULT_DELAY_MIN,
        delay_max: float = DEFAULT_DELAY_MAX,
        db: Optional[Database] = None,
        progress_callback: Optional[Callable[[str, int, int], None]] = None
    ):
        self.concurrency = concurrency
        self.delay_min = delay_min
        self.delay_max = delay_max
        self.db = db or Database()
        self.semaphore = None
        self.progress_callback = progress_callback
        self.session_cookies: Dict[str, str] = {}

    def set_cookies(self, cookies: Dict[str, str]):
        self.session_cookies = cookies

    async def _download_single(
        self,
        client: httpx.AsyncClient,
        url: str,
        dest_path: Path,
        site: str = "",
        test_id: str = "",
        check_resume: bool = True
    ) -> Dict[str, Any]:
        """Download one file with resume check, Range header, and deduplication."""
        dest_path = Path(dest_path)
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        part_path = dest_path.with_suffix(dest_path.suffix + ".part")

        # 1. Resume check: If destination file already exists and has size > 0
        if check_resume and dest_path.is_file() and dest_path.stat().st_size > 0:
            existing_size = dest_path.stat().st_size
            sha256 = compute_file_sha256(dest_path)
            self.db.update_download_skipped(url, str(dest_path), sha256)
            logger.debug(f"[SKIP] Already exists: {dest_path.name} ({format_bytes(existing_size)})")
            return {"status": "skipped", "url": url, "path": dest_path, "size": existing_size, "sha256": sha256}

        # 2. Rate limiting jitter delay
        if self.delay_max > 0:
            delay = random.uniform(self.delay_min, self.delay_max)
            await asyncio.sleep(delay)

        # 3. Check for partial download resume
        existing_part_size = 0
        if part_path.is_file():
            existing_part_size = part_path.stat().st_size

        headers = dict(DEFAULT_HEADERS)
        if existing_part_size > 0:
            headers["Range"] = f"bytes={existing_part_size}-"

        # 4. Perform download with retries and exponential backoff
        async for attempt in AsyncRetrying(
            stop=stop_after_attempt(MAX_RETRIES),
            wait=wait_exponential(multiplier=1.5, min=2.0, max=10.0),
            retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError)),
            reraise=True
        ):
            with attempt:
                try:
                    async with client.stream("GET", url, headers=headers, follow_redirects=True, timeout=REQUEST_TIMEOUT) as resp:
                        # Handle 416 Range Not Satisfiable
                        if resp.status_code == 416:
                            headers.pop("Range", None)
                            if part_path.is_file():
                                part_path.unlink()
                            existing_part_size = 0
                            continue

                        # Check for authentication / authorization failures
                        if resp.status_code in (401, 403):
                            msg = f"HTTP {resp.status_code}: Access denied / Authentication required"
                            log_error(site, url, msg, status=resp.status_code, test_id=test_id)
                            self.db.update_download_failed(url, msg, resp.status_code)
                            return {"status": "failed", "url": url, "error": msg}

                        resp.raise_for_status()

                        # If 206 Partial Content, append; if 200, open write mode
                        mode = "ab" if resp.status_code == 206 else "wb"
                        if resp.status_code == 200 and existing_part_size > 0:
                            existing_part_size = 0

                        downloaded_bytes = existing_part_size
                        with open(part_path, mode) as f:
                            async for chunk in resp.aiter_bytes(chunk_size=32768):
                                if chunk:
                                    f.write(chunk)
                                    downloaded_bytes += len(chunk)

                        # Download finished: compute sha256 on temporary file
                        file_sha256 = compute_file_sha256(part_path)

                        # 5. Duplicate Detection: Check if hash already exists elsewhere
                        existing_file = self.db.find_file_by_sha256(file_sha256)
                        if existing_file and Path(existing_file).is_file() and str(existing_file) != str(dest_path):
                            # Remove temporary part and copy from existing duplicate
                            if part_path.is_file():
                                part_path.unlink()
                            try:
                                shutil.copy2(existing_file, dest_path)
                                logger.info(f"[DEDUP] Reused existing file for {dest_path.name} (SHA256: {file_sha256[:10]}...)")
                            except Exception:
                                shutil.copyfile(existing_file, dest_path)
                        else:
                            # Move part to final destination
                            if dest_path.is_file():
                                dest_path.unlink()
                            part_path.rename(dest_path)

                        final_size = dest_path.stat().st_size
                        self.db.update_download_completed(url, str(dest_path), file_sha256, final_size, resp.status_code)
                        logger.info(f"[OK] {dest_path.name} ({format_bytes(final_size)})")
                        return {"status": "completed", "url": url, "path": dest_path, "size": final_size, "sha256": file_sha256}

                except Exception as exc:
                    log_error(site, url, str(exc), test_id=test_id)
                    if attempt.retry_state.is_last_attempt:
                        self.db.update_download_failed(url, str(exc))
                        return {"status": "failed", "url": url, "error": str(exc)}
                    raise

    async def download_item(
        self,
        client: httpx.AsyncClient,
        item: Dict[str, Any],
        dest_path: Path,
        check_resume: bool = True
    ) -> Dict[str, Any]:
        """Wrap download with semaphore concurrency limit."""
        url = item["url"]
        site = item.get("site", "")
        test_id = str(item.get("test_id", ""))
        async with self.semaphore:
            return await self._download_single(
                client=client,
                url=url,
                dest_path=dest_path,
                site=site,
                test_id=test_id,
                check_resume=check_resume
            )

    async def download_batch(
        self,
        tasks: List[Dict[str, Any]],
        check_resume: bool = True
    ) -> List[Dict[str, Any]]:
        """Download a batch of tasks asynchronously with progress tracking."""
        self.semaphore = asyncio.Semaphore(self.concurrency)
        if not tasks:
            return []

        results = []
        limits = httpx.Limits(max_keepalive_connections=10, max_connections=self.concurrency * 2)
        async with httpx.AsyncClient(
            headers=DEFAULT_HEADERS,
            cookies=self.session_cookies,
            limits=limits,
            timeout=REQUEST_TIMEOUT
        ) as client:
            coros = [
                self.download_item(client, task["item"], task["dest_path"], check_resume=check_resume)
                for task in tasks
            ]
            results = await asyncio.gather(*coros, return_exceptions=False)

        return results

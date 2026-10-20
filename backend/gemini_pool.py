# -*- coding: utf-8 -*-
import os
import time
import json
import logging
import re
from typing import List, Dict, Any, Optional
import httpx

logger = logging.getLogger(__name__)

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

class GeminiKeyTracker:
    def __init__(self, key: str):
        self.key = key.strip()
        self.cooling_until: float = 0.0
        self.request_count: int = 0
        self.error_count: int = 0

    def mark_rate_limited(self, cooldown_seconds: float = 65.0):
        self.cooling_until = time.time() + cooldown_seconds
        self.error_count += 1
        masked = f"...{self.key[-6:]}" if len(self.key) > 6 else "***"
        logger.warning(f"[GeminiPool] Key {masked} rate-limited (429). Cooldown: {cooldown_seconds}s")

    @property
    def is_available(self) -> bool:
        return time.time() > self.cooling_until

class GeminiPoolService:
    def __init__(self):
        self._load_keys()
        self._current_index = 0
        self.models_priority = [
            "gemini-3-flash-preview",
            "gemini-3.8-flash",
            "gemini-flash-latest",
            "gemini-2.5-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro"
        ]

    def _load_keys(self):
        raw_keys = ""
        try:
            from pathlib import Path
            env_path = Path(__file__).resolve().parent / ".env"
            if env_path.exists():
                for line in env_path.read_text(encoding="utf-8-sig").splitlines():
                    if line.startswith("GEMINI_API_KEYS=") or line.startswith("GEMINI_API_KEY="):
                        raw_keys = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
        except Exception:
            pass

        if not raw_keys:
            raw_keys = os.getenv("GEMINI_API_KEYS", "") or os.getenv("GEMINI_API_KEY", "")

        keys = [k.strip() for k in raw_keys.split(",") if k.strip()]
        self.trackers = [GeminiKeyTracker(k) for k in keys]
        logger.info(f"[GeminiPool] Initialized with {len(self.trackers)} API key(s)")

    def add_key(self, key: str):
        clean = key.strip()
        if clean and not any(t.key == clean for t in self.trackers):
            self.trackers.append(GeminiKeyTracker(clean))

    def _get_next_tracker(self) -> Optional[GeminiKeyTracker]:
        if not self.trackers:
            return None
        total = len(self.trackers)
        for _ in range(total):
            tracker = self.trackers[self._current_index]
            self._current_index = (self._current_index + 1) % total
            if tracker.is_available:
                return tracker
        # If all keys cooling, return the one whose cooldown expires earliest
        return min(self.trackers, key=lambda t: t.cooling_until)

    def generate_content(
        self,
        system_instruction: str,
        user_prompt: str,
        max_tokens: int = 2048,
        temperature: float = 0.7
    ) -> Dict[str, Any]:
        """
        Calls Gemini API using the API Key pool with automatic failover and rate-limit recovery.
        """
        # Reload keys dynamically in case user updated environment or .env
        if not self.trackers:
            self._load_keys()

        if not self.trackers:
            return {
                "success": False,
                "text": "",
                "quiz": None,
                "error": "NO_KEYS_CONFIGURED",
                "key_used": None
            }

        max_attempts = min(len(self.trackers) * 2, 6)
        last_error = None

        payload = {
            "system_instruction": {
                "parts": [{"text": system_instruction}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_prompt}]
                }
            ],
            "generationConfig": {
                "temperature": temperature,
                "topP": 0.9,
                "maxOutputTokens": max_tokens
            }
        }

        for attempt in range(max_attempts):
            tracker = self._get_next_tracker()
            if not tracker:
                break

            for model_name in self.models_priority:
                url = f"{GEMINI_API_BASE}/{model_name}:generateContent?key={tracker.key}"
                try:
                    with httpx.Client(timeout=7.0) as client:
                        response = client.post(url, json=payload, headers={"Content-Type": "application/json"})
                    
                    if response.status_code == 200:
                        data = response.json()
                        candidates = data.get("candidates") or []
                        if candidates:
                            raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                            tracker.request_count += 1
                            parsed_quiz = self._extract_quiz_from_text(raw_text)
                            clean_text = self._strip_quiz_json_block(raw_text)

                            return {
                                "success": True,
                                "text": clean_text,
                                "quiz": parsed_quiz,
                                "key_used": f"...{tracker.key[-6:]}",
                                "model": model_name
                            }

                    # Handle 429 Too Many Requests / Resource Exhausted
                    if response.status_code == 429 or "RESOURCE_EXHAUSTED" in response.text:
                        tracker.mark_rate_limited(cooldown_seconds=65.0)
                        last_error = "Rate limit (429) hit, switching to next key."
                        break # Break model loop, switch to next key in tracker loop

                    # Handle 404 (Model not supported on this endpoint)
                    if response.status_code == 404:
                        continue # Try next fallback model

                    # Handle 400 Bad Request
                    if response.status_code == 400:
                        last_error = f"API Error 400: {response.text[:200]}"
                        tracker.error_count += 1
                        break

                    # Other server error (500, 503)
                    if response.status_code >= 500:
                        tracker.mark_rate_limited(cooldown_seconds=15.0)
                        last_error = f"Server Error {response.status_code}"
                        break

                except Exception as e:
                    last_error = str(e)
                    tracker.mark_rate_limited(cooldown_seconds=10.0)
                    break

        return {
            "success": False,
            "text": "",
            "quiz": None,
            "error": last_error or "All Gemini API keys exhausted or rate-limited"
        }

    def _extract_quiz_from_text(self, text: str) -> Optional[Dict[str, Any]]:
        """Parses embedded ```json ... ``` quiz blocks generated by the DeepTutor prompt."""
        if "```json" not in text:
            return None
        try:
            match = re.search(r"```json\s*(\{[\s\S]*?\})\s*```", text)
            if match:
                parsed = json.loads(match.group(1))
                if parsed.get("has_quiz") and parsed.get("quiz"):
                    raw_q = parsed["quiz"]
                    # Normalize options into list format ['A. ...', 'B. ...']
                    opts = raw_q.get("options", {})
                    opt_list = []
                    if isinstance(opts, dict):
                        for letter in ["A", "B", "C", "D"]:
                            if letter in opts:
                                opt_list.append(f"{letter}. {opts[letter]}")
                    elif isinstance(opts, list):
                        opt_list = opts

                    ans_letter = str(raw_q.get("correct_answer") or raw_q.get("correct") or "A").upper()[:1]
                    return {
                        "question": raw_q.get("question", ""),
                        "options": opt_list,
                        "correct": ans_letter,
                        "correct_answer": ans_letter,
                        "explanation": raw_q.get("explanation", "")
                    }
        except Exception as e:
            logger.debug(f"Failed to parse quiz json: {e}")
        return None

    def _strip_quiz_json_block(self, text: str) -> str:
        """Removes the raw json block from the visible text response."""
        return re.sub(r"```json\s*\{[\s\S]*?\}\s*```", "", text).strip()


    def get_keys_status(self) -> List[Dict[str, Any]]:
        self._load_keys()
        now = time.time()
        results = []
        for idx, t in enumerate(self.trackers):
            is_avail = t.is_available
            cooling_seconds = max(0, int(t.cooling_until - now)) if not is_avail else 0
            if len(t.key) >= 12:
                masked = f"{t.key[:6]}...{t.key[-4:]}"
            elif len(t.key) >= 4:
                masked = f"...{t.key[-4:]}"
            else:
                masked = "***"
            results.append({
                "id": idx + 1,
                "masked_key": masked,
                "is_available": is_avail,
                "cooling_seconds": cooling_seconds,
                "request_count": t.request_count,
                "error_count": t.error_count,
                "status": "ready" if is_avail else ("cooling" if cooling_seconds > 0 else "error")
            })
        return results

    def set_keys(self, new_keys_raw: str) -> int:
        keys = [k.strip() for k in re.split(r'[,;\n]+',  new_keys_raw) if k.strip()]
        self.trackers = [GeminiKeyTracker(k) for k in keys]
        self._current_index = 0
        os.environ["GEMINI_API_KEYS"] = ",".join(keys)

        # Persist to .env file
        try:
            from pathlib import Path
            env_path = Path(__file__).resolve().parent / ".env"
            lines = []
            updated = False
            if env_path.exists():
                lines = env_path.read_text(encoding="utf-8").splitlines()
                for i, line in enumerate(lines):
                    if line.startswith("GEMINI_API_KEYS=") or line.startswith("GEMINI_API_KEY="):
                        lines[i] = f'GEMINI_API_KEYS="{",".join(keys)}"'
                        updated = True
                        break
            if not updated:
                lines.append(f'GEMINI_API_KEYS="{",".join(keys)}"')
            env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        except Exception as e:
            logger.warning(f"Failed to write keys to .env: {e}")

        logger.info(f"[GeminiPool] Updated key pool with {len(self.trackers)} key(s)")
        return len(self.trackers)

    def delete_key(self, identifier: str) -> bool:
        target_clean = identifier.strip()
        idx_to_del = None
        for i, t in enumerate(self.trackers):
            masked = f"{t.key[:6]}...{t.key[-4:]}" if len(t.key) >= 12 else ("..." + t.key[-4:] if len(t.key) >= 4 else "***")
            if str(i + 1) == target_clean or t.key == target_clean or masked == target_clean or t.key.endswith(target_clean):
                idx_to_del = i
                break
        if idx_to_del is not None:
            self.trackers.pop(idx_to_del)
            remaining_keys = [t.key for t in self.trackers]
            self.set_keys(",".join(remaining_keys))
            return True
        return False

    def test_connection(self, test_key: Optional[str] = None) -> Dict[str, Any]:
        key_to_use = test_key.strip() if test_key and test_key.strip() else None
        if not key_to_use:
            tracker = self._get_next_tracker()
            if not tracker:
                return {
                    "success": False,
                    "error": "Chưa có Gemini API key nào được cấu hình trong hệ thống."
                }
            key_to_use = tracker.key

        start_time = time.time()
        masked = f"{key_to_use[:6]}...{key_to_use[-4:]}" if len(key_to_use) >= 12 else "***"

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": "Reply with only the word: OK"}]
                }
            ],
            "generationConfig": {
                "maxOutputTokens": 20,
                "temperature": 0.1
            }
        }

        last_error = None
        for model in self.models_priority:
            url = f"{GEMINI_API_BASE}/{model}:generateContent?key={key_to_use}"
            try:
                with httpx.Client(timeout=10.0) as client:
                    resp = client.post(url, json=payload, headers={"Content-Type": "application/json"})
                elapsed = round((time.time() - start_time) * 1000)
                if resp.status_code == 200:
                    data = resp.json()
                    txt = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    return {
                        "success": True,
                        "model": model,
                        "latency_ms": elapsed,
                        "reply": txt.strip(),
                        "masked_key": masked,
                        "message": f"Kết nối Gemini API thành công ({model}, phản hồi {elapsed}ms)!"
                    }
                elif resp.status_code == 429:
                    last_error = "Lỗi 429: Rate limit / Quota exceeded"
                elif resp.status_code == 400:
                    last_error = f"Lỗi 400: API key không hợp lệ hoặc bị vô hiệu hóa ({resp.text[:120]})"
                else:
                    last_error = f"Lỗi HTTP {resp.status_code}: {resp.text[:100]}"
            except Exception as e:
                last_error = str(e)

        return {
            "success": False,
            "masked_key": masked,
            "error": last_error or "Không thể kết nối đến máy chủ Google Gemini API"
        }

gemini_pool = GeminiPoolService()

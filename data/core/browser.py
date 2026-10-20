"""
Playwright browser integration with persistent session management, interactive login, and network interception.
"""
import json
import time
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional
from config import SESSIONS_DIR, DEFAULT_USER_AGENT
from core.utils import logger, normalize_url


class PlaywrightBrowserManager:
    """Manages Playwright browser instances, persistent storage states, and network interception."""

    def __init__(self, headless: bool = True, session_state_file: Optional[Path] = None):
        self.headless = headless
        self.session_state_file = session_state_file or (SESSIONS_DIR / "browser_state.json")
        self._playwright = None
        self._browser = None
        self._context = None
        self.intercepted_responses: List[Dict[str, Any]] = []

    def start(self):
        """Initialize playwright browser and persistent or state-loaded context."""
        try:
            from playwright.sync_api import sync_playwright
            self._playwright = sync_playwright().start()
            self._browser = self._playwright.chromium.launch(
                headless=self.headless,
                args=["--no-sandbox", "--disable-dev-shm-usage"]
            )

            # Create context with saved storage state if available
            context_kwargs: Dict[str, Any] = {
                "user_agent": DEFAULT_USER_AGENT,
                "viewport": {"width": 1280, "height": 800}
            }
            if self.session_state_file.is_file():
                try:
                    context_kwargs["storage_state"] = str(self.session_state_file)
                    logger.info(f"Loaded existing browser session from {self.session_state_file.name}")
                except Exception as e:
                    logger.warning(f"Could not load session state: {e}")

            self._context = self._browser.new_context(**context_kwargs)
        except Exception as e:
            logger.error(f"Failed to start Playwright browser: {e}")
            raise

    def stop(self):
        """Close browser and playwright runner cleanly."""
        try:
            if self._context:
                self._context.close()
            if self._browser:
                self._browser.close()
            if self._playwright:
                self._playwright.stop()
        except Exception as e:
            logger.debug(f"Error while stopping Playwright browser: {e}")

    def save_session(self, path: Optional[Path] = None):
        """Save current cookies and local storage state to file."""
        target_path = path or self.session_state_file
        target_path.parent.mkdir(parents=True, exist_ok=True)
        if self._context:
            self._context.storage_state(path=str(target_path))
            logger.info(f"Browser session state saved to {target_path}")

    def interactive_login(self, login_url: str, post_login_check_url: Optional[str] = None):
        """
        Launch visible browser for manual user login.
        Saves session cookies upon completion without capturing credentials.
        """
        from playwright.sync_api import sync_playwright
        logger.info(f"Launching visible browser for login at {login_url}")
        print("\n" + "=" * 60)
        print("INTERACTIVE BROWSER LOGIN")
        print(f"Please log in manually on the opened browser window: {login_url}")
        print("When you have successfully logged in, press ENTER in this terminal to save session...")
        print("=" * 60 + "\n")

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=False)
            context = browser.new_context(user_agent=DEFAULT_USER_AGENT)
            page = context.new_page()
            page.goto(login_url)

            # Wait for user input in console
            try:
                input("Press [ENTER] here after completing login in the browser window: ")
            except EOFError:
                time.sleep(10)

            # Check if navigated away from login
            current_url = page.url
            logger.info(f"Current page after login: {current_url}")

            # Save state
            context.storage_state(path=str(self.session_state_file))
            print(f"[OK] Session state successfully saved to {self.session_state_file}")
            browser.close()

    def fetch_page_with_interception(
        self,
        url: str,
        wait_selector: Optional[str] = None,
        timeout_ms: int = 25000
    ) -> Dict[str, Any]:
        """
        Navigate to a URL and intercept API calls, JSON responses, and DOM data.
        """
        if not self._context:
            self.start()

        intercepted: List[Dict[str, Any]] = []
        page = self._context.new_page()

        def on_response(response):
            try:
                req_url = response.url
                status = response.status
                content_type = response.headers.get("content-type", "").lower()
                method = response.request.method

                # Only collect relevant JSON/API/Media responses
                if "application/json" in content_type or "/api/" in req_url or "test" in req_url:
                    try:
                        body_json = response.json()
                        intercepted.append({
                            "url": req_url,
                            "method": method,
                            "status": status,
                            "content_type": content_type,
                            "json": body_json
                        })
                    except Exception:
                        pass
                elif any(ext in req_url.lower() for ext in [".mp3", ".wav", ".m4a", ".jpg", ".png", ".pdf"]):
                    intercepted.append({
                        "url": req_url,
                        "method": method,
                        "status": status,
                        "content_type": content_type,
                        "json": None
                    })
            except Exception:
                pass

        page.on("response", on_response)

        try:
            page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
            if wait_selector:
                try:
                    page.wait_for_selector(wait_selector, timeout=7000)
                except Exception:
                    pass
            # Short wait for pending network requests
            page.wait_for_timeout(2000)

            html_content = page.content()
            page_title = page.title()

            return {
                "url": page.url,
                "title": page_title,
                "html": html_content,
                "intercepted": intercepted,
                "page_ref": page
            }
        except Exception as e:
            logger.error(f"Playwright navigation failed for {url}: {e}")
            return {
                "url": url,
                "title": "",
                "html": "",
                "intercepted": intercepted,
                "error": str(e)
            }
        finally:
            try:
                page.close()
            except Exception:
                pass

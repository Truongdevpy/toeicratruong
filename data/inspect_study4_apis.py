import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx
import re

bundle_url = "https://study4.com/static/dist/1790412525/main.77f267dd922eccaeca54.js"
r = httpx.get(bundle_url, timeout=20)
js = r.text
print(f"Bundle size: {len(js)}")

# Search for /api/ endpoints or /tests/ endpoints
api_matches = re.findall(r"['\"](/api/[a-zA-Z0-9_\-/]+)['\"]", js)
print("API matches:", set(api_matches))

tests_matches = re.findall(r"['\"](/tests/[a-zA-Z0-9_\-/]+)['\"]", js)
print("Tests matches:", set(tests_matches))

# Look for ajax calls or fetch
ajax_matches = re.findall(r"\$\.(?:get|post|ajax)\(['\"]([^'\"]+)['\"]", js)
print("AJAX matches:", set(ajax_matches))

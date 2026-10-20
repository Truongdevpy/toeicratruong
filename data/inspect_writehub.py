import sys
sys.stdout.reconfigure(encoding="utf-8")
import httpx

r = httpx.get("https://dauenglish.com/assets/WriteHub-BV_mka8U.js", timeout=15)
print("=== WriteHub ===")
print(r.text[:2000])

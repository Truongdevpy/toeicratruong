import sys
sys.stdout.reconfigure(encoding="utf-8")
from concurrent.futures import ThreadPoolExecutor, as_completed
from sites.study4 import Study4Crawler
from core.database import Database

db = Database()
crawler = Study4Crawler(db=db)
tests = crawler.discover_tests()
print(f"Total Study4 tests to scrape: {len(tests)}")

def process_single_test(t):
    try:
        crawler.discover_parts(t)
        data = crawler.parse_test(t)
        crawler.download_media(data)
        return True, t["name"], len(data.get("html", ""))
    except Exception as e:
        return False, t["name"], str(e)

completed = 0
failed = 0
with ThreadPoolExecutor(max_workers=8) as executor:
    futures = {executor.submit(process_single_test, t): t for t in tests}
    for fut in as_completed(futures):
        ok, name, detail = fut.result()
        if ok:
            completed += 1
        else:
            failed += 1
        if (completed + failed) % 20 == 0 or (completed + failed) == len(tests):
            print(f"Progress: {completed + failed}/{len(tests)} tests processed (Completed: {completed}, Failed: {failed})")

print(f"\nAll Study4 tests processed! Total completed: {completed}, Failed: {failed}")

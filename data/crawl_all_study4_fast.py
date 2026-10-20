import sys
sys.stdout.reconfigure(encoding="utf-8")
import asyncio
from sites.study4 import Study4Crawler
from core.database import Database

db = Database()
crawler = Study4Crawler(db=db)
tests = crawler.discover_tests()
print(f"Total Study4 tests to process: {len(tests)}")

count = 0
for t in tests:
    try:
        crawler.discover_parts(t)
        data = crawler.parse_test(t)
        crawler.download_media(data)
        count += 1
        if count % 20 == 0 or count == len(tests):
            print(f"Processed {count}/{len(tests)} Study4 tests...")
    except Exception as e:
        print(f"Error on {t.get('name')}: {e}")

print("Study4 batch processing completed!")

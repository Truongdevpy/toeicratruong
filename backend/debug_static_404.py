import sys
sys.path.insert(0, "C:/Users/truon/Downloads/toeicratruong/backend")
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

url1 = "/media/study4/study4_Toeic_Lr_Collection_3/TOEIC%20LR%20Collection%203%20Test%2010/audio/part_1/q001.mp3"
url2 = "/media/study4/study4_Toeic_Lr_Collection_3/TOEIC LR Collection 3 Test 10/audio/part_1/q001.mp3"

r1 = client.get(url1)
print(f"URL1: {r1.status_code}")

r2 = client.get(url2)
print(f"URL2: {r2.status_code}")

# Test a simple file directly in media
from pathlib import Path
media_dir = Path("C:/Users/truon/Downloads/toeicratruong/data/data/media")
for f in media_dir.rglob("*.mp3"):
    rel = f.relative_to(media_dir).as_posix()
    resp = client.get(f"/media/{rel}")
    print(f"Sample {rel[:50]}... => status {resp.status_code}")
    break

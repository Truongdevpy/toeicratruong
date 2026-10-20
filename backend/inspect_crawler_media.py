import sqlite3

conn = sqlite3.connect("C:/Users/truon/Downloads/toeicratruong/data/data/crawler.db")
c = conn.cursor()

c.execute("SELECT media_type, COUNT(*) FROM media GROUP BY media_type")
print("Media by type:", c.fetchall())

c.execute("SELECT url, local_path FROM media WHERE media_type='audio' LIMIT 15")
print("\nSample audio in media:")
for r in c.fetchall():
    print(r)

c.execute("SELECT part, COUNT(*), COUNT(audio_url), COUNT(image_url) FROM questions GROUP BY part")
print("\nQuestions media by part:")
for r in c.fetchall():
    print(r)

c.execute("SELECT test_id, COUNT(*) FROM questions WHERE audio_url IS NOT NULL AND audio_url != '' GROUP BY test_id")
tests_with_aud = c.fetchall()
print(f"\nTests with question audio in crawler.db: {len(tests_with_aud)}")
for r in tests_with_aud[:15]:
    print(r)

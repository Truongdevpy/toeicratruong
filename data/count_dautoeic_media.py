import sqlite3

conn = sqlite3.connect("data/crawler.db")
c = conn.cursor()

c.execute("SELECT count(distinct audio_url) FROM questions WHERE site='dautoeic' AND audio_url != '' AND audio_url IS NOT NULL")
q_audio = c.fetchone()[0]
c.execute("SELECT count(distinct image_url) FROM questions WHERE site='dautoeic' AND image_url != '' AND image_url IS NOT NULL")
q_image = c.fetchone()[0]

c.execute("SELECT count(distinct audio_url) FROM passages WHERE site='dautoeic' AND audio_url != '' AND audio_url IS NOT NULL")
p_audio = c.fetchone()[0]
c.execute("SELECT count(distinct image_url) FROM passages WHERE site='dautoeic' AND image_url != '' AND image_url IS NOT NULL")
p_image = c.fetchone()[0]

print(f"Dau TOEIC Questions with Audio: {q_audio}")
print(f"Dau TOEIC Questions with Image: {q_image}")
print(f"Dau TOEIC Passages with Audio: {p_audio}")
print(f"Dau TOEIC Passages with Image: {p_image}")

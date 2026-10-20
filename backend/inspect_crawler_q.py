import sqlite3

conn = sqlite3.connect("C:/Users/truon/Downloads/toeicratruong/data/data/crawler.db")
c = conn.cursor()

c.execute("SELECT id, part, question_number, audio_url, image_url, question_text, option_a, option_b, option_c, option_d, correct_answer FROM questions WHERE test_id='224' AND question_number <= 10")
print("Test 224 questions in crawler.db:")
for r in c.fetchall():
    print(r)

c.execute("SELECT id, part, question_number, audio_url, image_url, question_text, option_a, option_b, option_c, option_d, correct_answer FROM questions WHERE test_id='7059' AND question_number <= 10")
print("\nTest 7059 questions in crawler.db:")
for r in c.fetchall():
    print(r)

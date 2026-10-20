import sys, json
sys.stdout.reconfigure(encoding='utf-8')

with open('data/web_ready/mock_tests/study4_6852.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for q in data.get('questions', [])[:3]:
    print("Q#:", q.get('question_number'))
    print("Audio:", q.get('audio_url') or q.get('local_audio'))
    print("Image:", q.get('image_url') or q.get('local_image'))
    print("Transcript:", repr(q.get('transcript'))[:60])

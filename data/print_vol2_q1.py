import sys
sys.stdout.reconfigure(encoding="utf-8")
import json

q = json.loads(open(r"C:\Users\truon\Downloads\toeicratruong\data\data\dautoeic\Crack_TOEIC_Vol_2\Test_1\questions.json", encoding="utf-8").read())
print("Keys:", list(q[0].keys()))
for k, v in q[0].items():
    print(f"  {k}: {str(v)[:100]}")

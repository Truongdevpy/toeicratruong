import httpx
import re

chunks = [
    'assets/SpeakHub-DRg4tVU7.js',
    'assets/WriteHub-BV_mka8U.js',
    'assets/ListeningHome-Bzm6u2AB.js',
    'assets/ReadingHome-DqtWThTN.js',
    'assets/ComingSoonSkill-B3LiWo_z.js'
]
for c in chunks:
    try:
        r = httpx.get('https://dauenglish.com/' + c, timeout=15)
        print('===', c, 'size:', len(r.text))
        tables = re.findall(r"\.from\(['\"]([a-zA-Z0-9_\-]+)['\"]", r.text)
        rpcs = re.findall(r"\.rpc\(['\"]([a-zA-Z0-9_\-]+)['\"]", r.text)
        print('Tables:', set(tables), 'RPCs:', set(rpcs))
        if 'ComingSoonSkill' in c or 'Speak' in c or 'Write' in c:
            # Let's find what text is in there
            texts = re.findall(r'"([^"]{10,60})"', r.text)
            print('Sample texts:', [t for t in texts if any(k in t.lower() for k in ['sắp', 'ra mắt', 'speak', 'write', 'nói', 'viết', 'luyện'])][:10])
    except Exception as e:
        print('Error:', e)

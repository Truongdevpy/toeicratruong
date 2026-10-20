import httpx
import re

r = httpx.get('https://dauenglish.com/assets/index-laDVicvl.js', timeout=20)
js = r.text
print('JS bundle size:', len(js))

from_matches = re.findall(r"\.from\(['\"]([a-zA-Z0-9_\-]+)['\"]", js)
print('Found .from tables:', sorted(set(from_matches)))

rpc_matches = re.findall(r"\.rpc\(['\"]([a-zA-Z0-9_\-]+)['\"]", js)
print('Found .rpc functions:', sorted(set(rpc_matches)))

storage_matches = re.findall(r"\.storage\.from\(['\"]([a-zA-Z0-9_\-]+)['\"]", js)
print('Found storage buckets:', sorted(set(storage_matches)))

auth_matches = re.findall(r"supabaseUrl:\s*['\"]([^'\"]+)['\"]", js)
print('Supabase URLs:', auth_matches)

anon_matches = re.findall(r"supabase(Anon|Key|PublishableKey):\s*['\"]([^'\"]+)['\"]", js, re.I)
print('Supabase keys:', anon_matches)

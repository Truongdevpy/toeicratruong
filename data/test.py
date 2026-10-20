import requests
from pathlib import Path
from urllib.parse import urlparse


def download(url: str, output_dir: str):
    filename = Path(urlparse(url).path).name

    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)

    filepath = output / filename

    r = requests.get(
        url,
        timeout=30,
        headers={
            "User-Agent": "Mozilla/5.0"
        }
    )

    r.raise_for_status()

    filepath.write_bytes(r.content)

    print(f"[OK] {filepath}")
    return filepath


download(
    "https://odlnhfaygiotcyehuysw.supabase.co/storage/v1/object/public/mock-test-media/test_2_2026/53-55.mp3",
    "data/media/test_2_2026/audio"
)
"""Restore checksum-pinned runtime assets without Git LFS or third-party packages."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import tempfile
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = 'Truongdevpy/toeicratruong'


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def target_path(root, relative):
    path = (root / relative).resolve()
    if not path.is_relative_to(root.resolve()) or path == root.resolve():
        raise ValueError(f'Unsafe asset path: {relative}')
    return path


def matches(path, spec):
    return path.is_file() and path.stat().st_size == spec['size'] and digest(path) == spec['sha256']


def download(url, destination, spec):
    if destination.exists():
        if matches(destination, spec):
            return
        raise ValueError(f'Cached archive checksum mismatch: {destination}')
    partial = destination.with_suffix(destination.suffix + '.partial')
    if partial.exists() and matches(partial, spec):
        os.replace(partial, destination)
        return
    offset = partial.stat().st_size if partial.exists() else 0
    headers = {'User-Agent': 'toeic-runtime-assets/1'}
    if offset:
        headers['Range'] = f'bytes={offset}-'
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=60) as response:
        append = offset and response.status == 206
        if append and not response.headers.get('Content-Range', '').startswith(f'bytes {offset}-'):
            raise ValueError('Unexpected range response; partial file retained')
        with partial.open('ab' if append else 'wb') as output:
            shutil.copyfileobj(response, output, length=1024 * 1024)
    if not matches(partial, spec):
        raise ValueError(f'Download checksum mismatch: {partial}')
    os.replace(partial, destination)


def restore(root, manifest, catalog, archive_dir, verify_only=False, offline=False):
    if manifest['schema_version'] != 1 or catalog['schema_version'] != 1:
        raise ValueError('Unsupported asset manifest version')
    if manifest['release'] != catalog['release']:
        raise ValueError('Manifest and catalog refer to different releases')
    pending = {}
    conflicts = []
    for relative, spec in manifest['files'].items():
        target = target_path(root, relative)
        if matches(target, spec):
            continue
        if target.exists():
            conflicts.append(relative)
            continue
        oid = spec['sha256']
        entry = catalog['objects'][oid]
        if entry['size'] != spec['size']:
            raise ValueError(f'Inconsistent asset size: {relative}')
        pending.setdefault(entry['archive'], []).append((target, spec))
    if conflicts:
        raise ValueError('Local files differ; preserved without overwriting: ' + ', '.join(conflicts[:5]))
    count = sum(len(items) for items in pending.values())
    if verify_only:
        if count:
            raise ValueError(f'{count} runtime files are missing; run restore_assets.py first')
        print(f'Verified {len(manifest["files"])} runtime files', flush=True)
        return
    archive_dir.mkdir(parents=True, exist_ok=True)
    for name, members in pending.items():
        if Path(name).name != name or not name.endswith('.zip'):
            raise ValueError('Invalid archive filename')
        archive_path = archive_dir / name
        archive_spec = catalog['archives'][name]
        if not offline:
            url = f'https://github.com/{REPOSITORY}/releases/download/{manifest["release"]}/{name}'
            print(f'Downloading/verifying {name}', flush=True)
            download(url, archive_path, archive_spec)
        if not matches(archive_path, archive_spec):
            raise ValueError(f'Missing or corrupt archive: {archive_path}')
        with zipfile.ZipFile(archive_path) as archive:
            for target, spec in members:
                oid = spec['sha256']
                if archive.getinfo(oid).file_size != spec['size']:
                    raise ValueError(f'Wrong uncompressed size: {target}')
                target.parent.mkdir(parents=True, exist_ok=True)
                temporary = None
                try:
                    with tempfile.NamedTemporaryFile(dir=target.parent, delete=False) as output:
                        temporary = Path(output.name)
                        with archive.open(oid) as source:
                            shutil.copyfileobj(source, output, length=1024 * 1024)
                    if not matches(temporary, spec):
                        raise ValueError(f'Asset checksum mismatch: {target}')
                    # Atomic, exclusive publication protects concurrent edits and avoids partial assets.
                    os.link(temporary, target)
                finally:
                    if temporary is not None:
                        temporary.unlink(missing_ok=True)
        print(f'Restored {len(members)} files from {name}', flush=True)
    print(f'Ready: {len(manifest["files"])} runtime files ({count} restored)', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive-dir', type=Path, help='Use pre-downloaded ZIPs; no network')
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'assets/manifest.json').read_text(encoding='utf-8'))
    catalog = json.loads((ROOT / 'assets/catalog.json').read_text(encoding='utf-8'))
    restore(ROOT, manifest, catalog, args.archive_dir or ROOT / '.asset-downloads',
            verify_only=args.verify_only, offline=args.archive_dir is not None)


if __name__ == '__main__':
    main()

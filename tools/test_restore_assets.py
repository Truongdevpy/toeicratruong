import hashlib
from pathlib import Path
import tempfile
import unittest
import zipfile

from restore_assets import digest, restore, target_path


class RestoreAssetsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.archives = self.root / 'archives'
        self.archives.mkdir()
        content = b'original audio bytes'
        oid = hashlib.sha256(content).hexdigest()
        self.spec = {'sha256': oid, 'size': len(content)}
        self.path = 'data/media/sample.wav'
        self.manifest = {'schema_version': 1, 'release': 'test', 'files': {self.path: self.spec}}
        archive = self.archives / 'assets-001.zip'
        with zipfile.ZipFile(archive, 'w') as output:
            output.writestr(oid, content)
        self.catalog = {'schema_version': 1, 'release': 'test',
                        'objects': {oid: {'archive': archive.name, 'size': len(content)}},
                        'archives': {archive.name: {'sha256': digest(archive), 'size': archive.stat().st_size}}}

    def run_restore(self, **options):
        restore(self.root, self.manifest, self.catalog, self.archives, offline=True, **options)

    def test_restore_and_repeat_and_verify(self):
        self.run_restore()
        self.assertEqual((self.root / self.path).read_bytes(), b'original audio bytes')
        self.run_restore()
        self.run_restore(verify_only=True)

    def test_existing_local_edit_is_preserved(self):
        path = self.root / self.path
        path.parent.mkdir(parents=True)
        path.write_bytes(b'user edit')
        with self.assertRaisesRegex(ValueError, 'preserved'):
            self.run_restore()
        self.assertEqual(path.read_bytes(), b'user edit')

    def test_corrupt_archive_does_not_write_assets(self):
        (self.archives / 'assets-001.zip').write_bytes(b'corrupt')
        with self.assertRaisesRegex(ValueError, 'corrupt archive'):
            self.run_restore()
        self.assertFalse((self.root / self.path).exists())

    def test_missing_file_fails_verification(self):
        with self.assertRaisesRegex(ValueError, 'missing'):
            self.run_restore(verify_only=True)

    def test_corrupt_member_is_rejected_even_with_valid_archive_hash(self):
        path = self.archives / 'assets-001.zip'
        with zipfile.ZipFile(path, 'w') as archive:
            archive.writestr(self.spec['sha256'], b'x' * self.spec['size'])
        self.catalog['archives'][path.name] = {'sha256': digest(path), 'size': path.stat().st_size}
        with self.assertRaisesRegex(ValueError, 'Asset checksum mismatch'):
            self.run_restore()
        self.assertFalse((self.root / self.path).exists())

    def test_path_traversal_rejected(self):
        with self.assertRaises(ValueError):
            target_path(self.root, '../outside.wav')


if __name__ == '__main__':
    unittest.main()

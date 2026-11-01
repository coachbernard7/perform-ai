"""Exercise the real PowerShell exporter using disposable synthetic source files."""
from pathlib import Path
import hashlib
import os
import subprocess
import tempfile
import zipfile

root = Path(__file__).resolve().parents[1]
pwsh = os.environ.get('PERFORM_PWSH', 'pwsh')
exporter = os.environ.get('PERFORM_EXPORTER', str(root / 'scripts/Create-PerformSourceBundle.ps1'))

with tempfile.TemporaryDirectory(prefix='perform-export-') as temporary:
    temporary = Path(temporary)
    source, output = temporary / 'ACTOR-MODE-DEV', temporary / 'exports'
    source.mkdir()
    output.mkdir()
    fixture_key = 'sk-proj-' + 'x' * 36
    files = {
        'package.json': '{"name":"synthetic-source"}',
        'pnpm-lock.yaml': 'lockfileVersion: 9',
        'app/actor & coach.tsx': 'export const title = "Practise";',
        'components/Macgyver.tsx': 'export const avatar = "animated";',
        'server/router.ts': 'export const route = "/coach";',
        'public/index.html': '<div id="root"></div>',
        'server/.env': 'SYNTHETIC_PRIVATE_VALUE=not-real',
        'hostgator/perform-ai-private/accounts.php': '<?php return [];',
        'hostgator/coaching.php': '<?php return [];',
        'server/credentials.json': '{"synthetic":true}',
        'lib/provider.ts': 'const example = "' + fixture_key + '";',
        'app/node_modules/dependency.js': 'not source',
        '.actor-local/script.json': '{"synthetic":"local script"}',
        'backups/old.ts': 'old copy',
        'server/memory/user.json': '{"synthetic":"memory"}',
        'assets/logo.png': 'synthetic image fixture',
        'assets/too-large.png': 'x' * (5 * 1024 * 1024 + 1),
    }
    for name, content in files.items():
        file = source / name
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(content)
    (source / 'app' / 'linked.ts').symlink_to(source / 'server' / '.env')
    before = {name: hashlib.sha256((source / name).read_bytes()).digest() for name in files}
    result = subprocess.run(
        [pwsh, '-NoProfile', '-NonInteractive', '-File', exporter,
         '-Source', str(source), '-OutputDirectory', str(output)],
        text=True, capture_output=True, timeout=60,
    )
    assert result.returncode == 0, result.stderr + result.stdout
    archives = list(output.glob('*.zip'))
    assert len(archives) == 1
    with zipfile.ZipFile(archives[0]) as archive:
        assert archive.testzip() is None
        expected = {'package.json', 'pnpm-lock.yaml', 'app/actor & coach.tsx', 'components/Macgyver.tsx',
                    'server/router.ts', 'public/index.html', 'assets/logo.png', 'SOURCE-EXPORT-OMISSIONS.txt'}
        assert set(archive.namelist()) == expected, archive.namelist()
        assert fixture_key not in result.stdout + result.stderr
        assert all(fixture_key.encode() not in archive.read(name) for name in archive.namelist())
        report = archive.read('SOURCE-EXPORT-OMISSIONS.txt').decode('utf-8-sig')
        assert 'lib/provider.ts' in report and 'server/.env' in report and 'app/linked.ts' in report
        assert 'assets/too-large.png' in report
    after = {name: hashlib.sha256((source / name).read_bytes()).digest() for name in files}
    assert before == after
    assert (source / 'app/linked.ts').is_symlink()
    print('Source exporter passed: real PowerShell execution, selected source inclusion, private/dependency exclusions,')
    print('known credential omission without disclosure, symlink rejection, large-file reporting, ZIP CRC and original preservation.')

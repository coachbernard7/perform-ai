"""Postprocess an Expo review export; never writes to hosting or private config."""
from pathlib import Path
import hashlib,json,os,shutil,subprocess,zipfile,stat
root=Path(__file__).resolve().parents[1]
base='/perform-macgyver-review/app'
site=root/'review-build/site/perform-macgyver-review';app=site/'app'
html=app/'index.html'
if not html.exists() or base+'/_expo/' not in html.read_text():raise SystemExit('Export Expo with EXPO_PUBLIC_PERFORM_BASE_PATH='+base+' first.')
for file in (root/'public').rglob('*'):
 if file.is_file():
  destination=app/file.relative_to(root/'public');destination.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(file,destination)
names=['account-auth.php','plan-storage.php','plan-catalog.php','profile-thumbnail.php','assistant-store.php','macgyver-provider.php','macgyver.php','transcription-provider.php','transcribe.php']
for name in names:shutil.copyfile(root/'hostgator'/name,app/name)
auth=(app/'account-auth.php').read_text().replace('declare(strict_types=1);',"declare(strict_types=1);\ndefine('PERFORM_AI_PREVIEW_MODE', true);",1)
(app/'account-auth.php').write_text(auth)
for name in ['submit-payment.php','payment-review.php']:
 (app/name).write_text("<?php http_response_code(403); header('Content-Type: application/json'); echo json_encode(['ok'=>false,'error'=>'Payments are disabled in this private coaching preview.']);")
shutil.copyfile(root/'hostgator/service-worker.js',app/'service-worker.js')
manifest=(root/'hostgator/manifest.webmanifest').read_text().replace('/app/',base+'/')
(app/'manifest.webmanifest').write_text(manifest)
shutil.copyfile(root/'assets/images/guardian.png',app/'macgyver-guardian.png')
if 'data-perform-ai-shell' not in html.read_text():
 subprocess.run(['node',str(root/'scripts/inject_perform_ai_web_shell.mjs'),str(html)],env={**os.environ,'EXPO_PUBLIC_PERFORM_BASE_PATH':base},check=True)
# Existing main-site rewrite rules preserve real directories but catch unknown
# paths before child rules. Route entry directories avoid modifying that site.
for route in ['login','register','files','train','scores','profile','script/new','rehearse','results','payments','practice-questions','audience-simulation','admin-subscriptions','dev/theme-lab','oauth/callback']:
 entry=app/route/'index.html';entry.parent.mkdir(parents=True,exist_ok=True);entry.write_bytes(html.read_bytes())
(app/'.htaccess').write_text('''Options -Indexes
DirectoryIndex index.html
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_URI} !\\.php$
RewriteRule ^ index.html [L]
</IfModule>
<IfModule mod_headers.c>
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Permissions-Policy "camera=(), geolocation=(), microphone=(self)"
Header set Cache-Control "no-store"
</IfModule>
<FilesMatch "^(payment-storage|plan-storage|assistant-store|macgyver-provider|transcription-provider)\\.php$">
Require all denied
</FilesMatch>
<FilesMatch "(^\\.|\\.(?:md|map|log|ndjson|jsonl|sql|ini|env)$)">
Require all denied
</FilesMatch>
''')
(site/'index.html').write_text('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="refresh" content="0;url=./app/"><title>Perform AI coaching preview</title></head><body><a href="./app/">Open Perform AI coaching preview</a></body></html>')
release=root.parent/'releases';release.mkdir(exist_ok=True)
output=release/'perform-ai-macgyver-preview-flat.zip'
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
 for file in sorted(site.rglob('*')):
  if file.is_symlink():raise RuntimeError('Unexpected symlink')
  name=file.relative_to(site).as_posix()+('/' if file.is_dir() else '');info=zipfile.ZipInfo(name);info.create_system=3;info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=((stat.S_IFDIR|0o755) if file.is_dir() else (stat.S_IFREG|0o644))<<16
  if file.is_dir():info.external_attr|=0x10
  archive.writestr(info,b'' if file.is_dir() else file.read_bytes())
with zipfile.ZipFile(output) as archive:
 assert archive.testzip() is None
 assert 'app/macgyver.php' in archive.namelist()
 assert not any(Path(n).name in ['accounts.php','coaching.php','coaching-users.php'] for n in archive.namelist())
 for item in archive.infolist():assert stat.S_IMODE(item.external_attr>>16)==(0o755 if item.is_dir() else 0o644)
(release/(output.name+'.sha256')).write_text(hashlib.sha256(output.read_bytes()).hexdigest()+'  '+output.name+'\n')
print('Public-only review ZIP prepared; no credentials, user memory or deployment:',output)

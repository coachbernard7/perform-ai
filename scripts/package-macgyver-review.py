"""Package tracked source and the verified public-only preview; never deploy."""
from pathlib import Path
import hashlib,json,shutil,stat,subprocess,zipfile

root=Path(__file__).resolve().parents[1];release=root/'releases';release.mkdir(exist_ok=True)
def put(archive,name,data):
 info=zipfile.ZipInfo(name);info.create_system=3;info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=(stat.S_IFREG|0o644)<<16;archive.writestr(info,data)
def checksum(path):
 value=hashlib.sha256(path.read_bytes()).hexdigest();(path.parent/(path.name+'.sha256')).write_text(value+'  '+path.name+'\n');return value
source=release/'perform-ai-macgyver-source-review.zip'
files=subprocess.check_output(['git','ls-files','-z'],cwd=root).decode().split('\0')
with zipfile.ZipFile(source,'w') as archive:
 for name in sorted(filter(None,files)):
  parts=Path(name).parts
  if parts and parts[0]=='downloads':continue # Published review snapshots are not source inputs.
  if any(part in ['node_modules','review-build','.expo','.manus','.git'] or part.startswith('.env') for part in parts):raise RuntimeError('Unexpected tracked local/private data: '+name)
  if Path(name).name in ['accounts.php','coaching.php','coaching-users.php']:raise RuntimeError('Private config must not be packaged.')
  path=root/name
  if path.is_symlink():raise RuntimeError('Unexpected source symlink.')
  put(archive,name,path.read_bytes())
source_hash=checksum(source)
public=release/'perform-ai-macgyver-preview-flat.zip'
with zipfile.ZipFile(public) as archive:
 assert archive.testzip() is None
 assert 'app/index.html' in archive.namelist() and 'app/macgyver.php' in archive.namelist()
 assert 'app/macgyver-widget.js' in archive.namelist()
 assert b"define('PERFORM_AI_PREVIEW_MODE', true)" in archive.read('app/account-auth.php')
public_hash=checksum(public)
for path,name in [('/tmp/perform-macgyver-built.png','perform-ai-macgyver-preview.png'),('/tmp/perform-macgyver-widget.png','perform-ai-macgyver-mobile.png')]:
 if Path(path).exists():shutil.copyfile(path,release/name)
bundle=release/'perform-ai-macgyver-review.zip'
manifest={'status':'LOCAL REVIEW ONLY; NOT DEPLOYED','source_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'source_sha256':source_hash,'public_sha256':public_hash,'provider':'OpenAI access unverified; all provider tests synthetic','physical_audio':'Not tested; not driving-ready'}
with zipfile.ZipFile(bundle,'w') as archive:
 put(archive,'READ-ME-FIRST.txt',b'REVIEW ONLY - NOT DEPLOYED\n\nDo not extract this entire bundle into public_html.\nStart with review/MACGYVER-UPDATE-REVIEW.md and the screenshots.\nsource/ contains the complete restored and updated project for backup/review.\npublic/ contains a FLAT archive intended only for public_html/perform-macgyver-review/ AFTER approval.\nExisting live sites and private config must remain untouched. Real provider/device checks are pending.\n')
 put(archive,'review/manifest.json',(json.dumps(manifest,indent=2)+'\n').encode())
 put(archive,'source/'+source.name,source.read_bytes());put(archive,'public/'+public.name,public.read_bytes())
 for name in ['MACGYVER-UPDATE-REVIEW.md','HOSTGATOR-RELEASE-REVIEW.md','SOURCE-CHANGE-LIST.json']:put(archive,'review/'+name,(root/'docs'/name).read_bytes())
 for name in ['perform-ai-macgyver-preview.png','perform-ai-macgyver-mobile.png']:
  if (release/name).exists():put(archive,'review/'+name,(release/name).read_bytes())
for path in [source,public,bundle]:
 with zipfile.ZipFile(path) as archive:assert archive.testzip() is None
checksum(bundle)
print('Review bundle and complete source backup verified:',bundle)
print('Bundle bytes:',bundle.stat().st_size)

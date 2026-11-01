"""Real PHP HTTP/session/memory tests; provider replaced only in a disposable fixture."""
from pathlib import Path
import http.cookiejar
import json
import os
import shutil
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

root = Path(__file__).resolve().parents[1]
php = os.environ.get('PERFORM_PHP_BIN', 'php')
with tempfile.TemporaryDirectory(prefix='perform-macgyver-') as temporary:
    home = Path(temporary); public = home / 'public_html'; app = public / 'perform-macgyver-review/app'
    app.mkdir(parents=True); private = home / 'perform-ai-private'; private.mkdir(mode=0o700)
    for name in ['account-auth.php','plan-storage.php','assistant-store.php','macgyver.php','transcribe.php']:
        shutil.copy(root / 'hostgator' / name, app / name)
    # This stub is never copied into a release or the real application source.
    (app / 'macgyver-provider.php').write_text("<?php function macgyver_provider($config,$memory,$message,$screen){return ['message'=>'Synthetic coaching: '.$message,'navigate'=>null];}")
    (app / 'transcription-provider.php').write_text("<?php function macgyver_transcribe($config,$path,$mime,$extension){return 'Synthetic recorded transcript';}")
    hashed = subprocess.check_output([php, '-n', '-r', "echo password_hash('synthetic-test-password', PASSWORD_DEFAULT);"], text=True)
    users = [{'id':name+'-id','username':name,'email':name+'@example.test','name':name.title(),'role':'user','password_hash':hashed,'membership':'permanent_free_trial'} for name in ['alice','bob']]
    # Build PHP data from JSON without embedding passwords in command arguments.
    encoded = json.dumps({'accounts':users}).replace('\\','\\\\').replace("'","\\'")
    (private / 'accounts.php').write_text("<?php return json_decode('"+encoded+"',true);")
    (private / 'coaching.php').write_text("<?php return ['api_key'=>'fixture-not-a-real-key','text_daily_global_limit'=>3,'text_daily_user_limit'=>2];")
    for file in private.iterdir(): file.chmod(0o600)
    command = [php,'-n','-d','session.save_path='+str(home)]
    if os.environ.get('PERFORM_PHP_CURL'):command += ['-d','extension='+os.environ['PERFORM_PHP_CURL']]
    if os.environ.get('PERFORM_PHP_FILEINFO'):command += ['-d','extension='+os.environ['PERFORM_PHP_FILEINFO']]
    command += ['-S','127.0.0.1:4196','-t',str(public)]
    server = subprocess.Popen(command,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    origin = 'http://127.0.0.1:4196'; base=origin+'/perform-macgyver-review/app/'
    jars=[]
    def client():
        jar=http.cookiejar.CookieJar();jars.append(jar)
        return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    def request(browser, endpoint='macgyver.php', data=None, token=None, origin_value=origin):
        headers={'Content-Type':'application/json','Origin':origin_value}
        if token:headers['X-Perform-AI-CSRF']=token
        req=urllib.request.Request(base+endpoint,headers=headers,data=json.dumps(data).encode() if data is not None else None)
        try:
            with browser.open(req) as response:return response.status,json.load(response)
        except urllib.error.HTTPError as error:return error.code,json.load(error)
    def login(browser,name):
        status,payload=request(browser,'account-auth.php?action=login',{'identifier':name,'password':'synthetic-test-password'})
        assert status==200,payload
        return payload['csrfToken']
    alice,bob,guest=client(),client(),client()
    try:
        for _ in range(50):
            try:request(guest);break
            except urllib.error.URLError:time.sleep(.1)
        assert request(guest)[0]==401
        a=login(alice,'alice');b=login(bob,'bob')
        assert list(jars[0])[0].path=='/perform-macgyver-review/app/'
        assert request(alice)[1]['memory']['revision']==0
        prefs={'personality':'Calm','speed':0.9,'voice':'synthetic-voice'}
        save={'action':'save','account':'alice-id','revision':0,'notes':'Alice synthetic notes','preferences':prefs}
        assert request(alice,data=save)[0]==403
        assert request(alice,data=save,token=a,origin_value='https://other.example')[0]==403
        assert request(alice,data=save,token=a)[0]==200
        assert request(bob)[1]['memory']['notes']==''
        assert request(bob,endpoint='macgyver.php?account=alice-id')[0]==409
        assert request(bob,data=save,token=b)[0]==409
        assert request(alice,data=save,token=a)[0]==409
        m=request(alice)[1]['memory'];assert m['preferences']==prefs and m['notes']==save['notes']
        turn={'action':'turn','account':'alice-id','revision':1,'message':'My synthetic answer','screen':'/train'}
        status,payload=request(alice,data=turn,token=a);assert status==200,payload
        assert payload['memory']['messages'][0]['text']=='My synthetic answer'
        assert payload['memory']['messages'][1]['role']=='assistant'
        assert 'fixture-not-a-real-key' not in json.dumps(payload)
        assert request(bob)[1]['memory']['messages']==[]
        # Exercise a real multipart upload, MIME sniffing and the shared provider quota.
        import io, wave
        audio=io.BytesIO()
        with wave.open(audio,'wb') as wav:
            wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(8000);wav.writeframes(b'\0\0'*800)
        boundary='SyntheticMacgyverFixture'
        multipart=(f'--{boundary}\r\nContent-Disposition: form-data; name="account"\r\n\r\nalice-id\r\n--{boundary}\r\nContent-Disposition: form-data; name="audio"; filename="practice.wav"\r\nContent-Type: audio/wav\r\n\r\n'.encode()+audio.getvalue()+f'\r\n--{boundary}--\r\n'.encode())
        req=urllib.request.Request(base+'transcribe.php',data=multipart,headers={'Origin':origin,'X-Perform-AI-CSRF':a,'Content-Type':'multipart/form-data; boundary='+boundary})
        with alice.open(req) as response:assert json.load(response)['text']=='Synthetic recorded transcript'
        turn['revision']=2;assert request(alice,data=turn,token=a)[0]==429
        turn.update(account='bob-id',revision=0);assert request(bob,data=turn,token=b)[0]==200
        turn['revision']=1;assert request(bob,data=turn,token=b)[0]==429
        usage=json.loads((private/'macgyver-v1/usage.json').read_text());assert len(usage['provider-global'])==3
        assert request(alice,'account-auth.php?action=logout',{},a)[0]==200
        assert request(alice)[0]==401
        a=login(alice,'alice');assert request(alice)[1]['memory']['notes']=='Alice synthetic notes'
        # Three successful logins count too; new cookie jars do not reset the IP limiter.
        for _ in range(5):assert request(client(),'account-auth.php?action=login',{'identifier':'alice','password':'wrong'})[0]==401
        assert request(client(),'account-auth.php?action=login',{'identifier':'alice','password':'wrong'})[0]==429
        for file in private.rglob('*.json'):assert file.stat().st_mode&0o777==0o600
        for file in private.rglob('*.lock'):assert file.stat().st_mode&0o777==0o600
        print('PHP passed: auth/CSRF/origin, isolated memory and voice preferences, stale-write rejection, synthetic conversation, persistent quotas/login limits, logout/recall, scoped cookies and private file permissions. No provider calls.')
    finally:
        server.terminate();server.wait(timeout=5)

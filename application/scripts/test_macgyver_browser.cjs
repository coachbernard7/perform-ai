/* Functional browser checks; speech/provider are synthetic, never real devices. */
const {chromium,expect}=require(process.env.PERFORM_PLAYWRIGHT_PATH||'@playwright/test');
const fs=require('node:fs');const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PERFORM_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.__utterances=[];window.__cancels=0;window.__aborts=0;
   window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
   Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{voiceURI:'voice-a',name:'Synthetic A',lang:'en-GB'},{voiceURI:'voice-b',name:'Synthetic B',lang:'en-US'}],speak:u=>window.__utterances.push(u),cancel:()=>window.__cancels++,addEventListener:()=>{},removeEventListener:()=>{}}});
   window.SpeechRecognition=class{start(){window.__recognizer=this;}abort(){window.__aborts++;this.onend?.();}};
  });
  const states={alice:{version:1,revision:0,notes:'',preferences:{personality:'Supportive',speed:1,voice:''},messages:[]},bob:{version:1,revision:0,notes:'',preferences:{personality:'Supportive',speed:1,voice:''},messages:[]}};
  let selected='alice',fail=false,delay=0,turns=0,navigations=[];
  await page.route('https://fixture.test/**',async route=>{
   const request=route.request();const url=new URL(request.url());
   if(url.pathname==='/app/')return route.fulfill({contentType:'text/html',body:'<html><body><button>App navigation</button></body></html>'});
   if(url.pathname.endsWith('macgyver.php')){
    if(request.method()==='GET')return route.fulfill({json:{ok:true,account:selected,providerConfigured:true,memory:states[selected]}});
    const input=request.postDataJSON();expect(input.account).toBe(selected);expect(request.headers()['x-perform-ai-csrf']).toBe('fixture-csrf');
    if(fail)return route.fulfill({status:503,json:{ok:false,error:'Synthetic provider unavailable'}});
    const memory=states[selected];expect(input.revision).toBe(memory.revision);memory.revision++;
    if(input.action==='save'){memory.notes=input.notes;memory.preferences=input.preferences;return route.fulfill({json:{ok:true,account:selected,memory}});}
    if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
    turns++;memory.messages.push({role:'user',text:input.message},{role:'assistant',text:'Make one clear point, then give an example.'});
    return route.fulfill({json:{ok:true,account:selected,memory,reply:{message:'Make one clear point, then give an example.',navigate:null}}});
   }
   return route.fulfill({status:204,body:''});
  });
  await page.goto('https://fixture.test/app/');await page.addScriptTag({content:fs.readFileSync(path.join(__dirname,'../public/macgyver-widget.js'),'utf8')});
  await page.exposeFunction('fixtureNavigate',target=>{navigations.push(target);return 'Opening '+target;});
  await page.evaluate(()=>{window.widget=AOMacgyver.mount({appId:'perform-ai',appName:'Perform AI',endpoint:'/app/macgyver.php',onNavigate:window.fixtureNavigate,onLogin:()=>{}});window.widget.setContext({account:'alice',displayName:'Alice',csrfToken:'fixture-csrf',screen:'/train'});});
  await page.getByRole('button',{name:'Open Macgyver',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('status')).toContainText('Ready');
  const bounds=await page.getByRole('dialog').boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(390);
  expect(await page.getByRole('button',{name:'Minimize Macgyver',exact:true}).last().evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
  await page.getByLabel('Your instruction',{exact:true}).fill('Open my scores');await page.getByRole('button',{name:'Send',exact:true}).click();expect(navigations).toEqual(['scores']);expect(turns).toBe(0);
  await page.getByText('Memory, personality and voice',{exact:true}).click();await page.getByLabel('Private coaching notes').fill('Alice synthetic notes');
  await page.getByLabel('Personality',{exact:true}).selectOption('Calm');await page.getByLabel('Voice available on this device').selectOption('voice-b');
  await page.getByRole('button',{name:'Save memory and voice'}).click();await expect(page.getByRole('status')).toContainText('saved');expect(states.alice.preferences.voice).toBe('voice-b');
  await page.getByLabel('Your instruction',{exact:true}).fill('My synthetic practice answer');fail=true;await page.getByRole('button',{name:'Send',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Synthetic provider unavailable');await expect(page.getByLabel('Your instruction',{exact:true})).toHaveValue('My synthetic practice answer');
  fail=false;await page.getByRole('button',{name:'Send',exact:true}).click();await expect(page.getByRole('status')).toContainText('Speaking').catch(async e=>{console.error('Widget alert:',await page.getByRole('alert').allTextContents());throw e;});expect(turns).toBe(1);
  await page.getByRole('button',{name:'Listen',exact:true}).click();expect(await page.evaluate(()=>window.__cancels)).toBeGreaterThan(0);
  await page.getByLabel('Continue listening').check();await page.evaluate(()=>{const row=[{transcript:'Macgyver pause'}];row.isFinal=true;window.__recognizer.onresult({resultIndex:0,results:[row]});window.__recognizer.onend();});await expect(page.getByLabel('Continue listening')).not.toBeChecked();expect(turns).toBe(1);
  await page.getByRole('button',{name:'Listen',exact:true}).click();await page.evaluate(()=>window.__recognizer.onerror({error:'not-allowed'}));await page.evaluate(()=>window.__recognizer.onend());await expect(page.getByRole('alert')).toContainText('denied');
  delay=250;const spokenBefore=await page.evaluate(()=>window.__utterances.length);await page.getByLabel('Your instruction',{exact:true}).fill('Keep this response silent after pause');await page.getByRole('button',{name:'Send',exact:true}).click();await page.getByRole('button',{name:'Pause',exact:true}).click();await expect(page.getByRole('button',{name:'Send',exact:true})).toBeEnabled();await expect(page.getByRole('status')).toContainText('voice paused');expect(await page.evaluate(()=>window.__utterances.length)).toBe(spokenBefore);delay=0;
  selected='bob';await page.evaluate(()=>window.widget.setContext({account:'bob',displayName:'Bob',csrfToken:'fixture-csrf',screen:'/train'}));await expect(page.getByRole('status')).toContainText('Bob');await expect(page.getByLabel('Private coaching notes')).toHaveValue('');await expect(page.getByRole('dialog')).not.toContainText('My synthetic practice answer');
  selected='alice';await page.evaluate(()=>window.widget.setContext({account:'alice',displayName:'Alice',csrfToken:'fixture-csrf',screen:'/train'}));await expect(page.getByLabel('Private coaching notes')).toHaveValue('Alice synthetic notes');await expect(page.getByLabel('Voice available on this device')).toHaveValue('voice-b');
  await page.getByRole('button',{name:'Listen',exact:true}).click();const aborted=await page.evaluate(()=>window.__aborts);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});expect(await page.evaluate(()=>window.__aborts)).toBeGreaterThan(aborted);await expect(page.getByRole('status')).toContainText('Paused');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});});await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button',{name:'Open Macgyver',exact:true}).click();await page.screenshot({path:process.env.PERFORM_MACGYVER_SCREENSHOT||'/tmp/perform-macgyver-widget.png',fullPage:true});
  await page.evaluate(()=>window.widget.destroy());await expect(page.getByRole('button',{name:'Open Macgyver',exact:true})).toHaveCount(0);expect(errors).toEqual([]);
  console.log('Browser passed: mobile/reduced-motion layout, instructions and navigation, save/recall, account switching, failed-turn retention, synthetic speech output/input, pause/permission errors, background cleanup, keyboard close and unmount. No provider or physical-microphone calls.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

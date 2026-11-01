/* AΩ Macgyver: reusable web widget. No provider key or conversation localStorage. */
(function (global) {
  'use strict';
  if (global.AOMacgyver) return;
  const defaultTargets = ['home', 'training', 'library', 'scores', 'profile', 'new-script'];
  const personalities = ['Supportive', 'Calm', 'Direct', 'Challenging', 'Sarcastic', 'Condescending', 'Loving'];
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function mount(options) {
    if (!options || typeof options.onNavigate !== 'function') throw new Error('An app navigation adapter is required.');
    if (typeof options.endpoint!=='string'||!options.endpoint)throw new Error('An application backend is required.');
    const targets=options.targets||defaultTargets;
    if(!Array.isArray(targets)||!targets.length||targets.length>30||targets.some(target=>typeof target!=='string'||!/^[a-z0-9_-]{1,40}$/.test(target)))throw new Error('Invalid application capabilities.');
    const endpoint = new URL(options.endpoint, location.href);
    if (endpoint.origin !== location.origin) throw new Error('Macgyver must use this application’s backend.');
    const host = document.createElement('div'); host.dataset.aoMacgyver = options.appId || 'app';
    document.body.append(host); const root = host.attachShadow({mode:'open'});
    let context = {}, epoch = 0, voiceEpoch = 0, memory = null, open = false, busy = false, ready = false, error = '', input = '', status = 'Ready';
    let notes = '', preferences = {personality:'Supportive',speed:1,voice:''}, recognition = null, recognitionEpoch = 0, speech = null, controller = null, handsFree = false, left = false, destroyed = false, loading = false;
    const synthesis = global.speechSynthesis;
    const reduced = global.matchMedia('(prefers-reduced-motion: reduce)');
    const css = `
      :host{all:initial;font-family:system-ui,-apple-system,sans-serif;color:#ecfff5;font-size:14px;position:fixed;right:16px;bottom:calc(88px + env(safe-area-inset-bottom,0px));z-index:2147483000;max-width:calc(100vw - 24px)}
      *{box-sizing:border-box}button,input,textarea,select{font:inherit}button{cursor:pointer}button:disabled{opacity:.5;cursor:default}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid #70ecc1;outline-offset:3px}
      .avatar{width:62px;height:62px;border:2px solid #79edbb;border-radius:50%;background:#0b2632;box-shadow:0 8px 30px #0006;display:grid;place-items:center;position:relative;color:#aaffdc}
      .avatar img{height:49px;width:49px;object-fit:contain;animation:float 4s ease-in-out infinite}.dot{position:absolute;right:0;bottom:0;background:#70ecc1;border:3px solid #0b2632;width:16px;height:16px;border-radius:50%}.avatar.active{animation:pulse 1s ease-in-out infinite}
      .panel{width:380px;max-width:calc(100vw - 24px);height:min(650px,calc(100dvh - 180px));min-height:240px;background:#102c39;border:1px solid #42716c;border-radius:20px;box-shadow:0 12px 48px #0006;display:flex;flex-direction:column;overflow:hidden;margin-bottom:12px}
      header{display:flex;align-items:center;gap:9px;padding:15px;background:#0a222d}header strong{flex:1}header button,.small{color:#c9f8e2;background:transparent;border:1px solid #41676a;border-radius:8px;padding:7px 9px}.status{font-size:12px;color:#9fc8bd;padding:8px 15px;margin:0}
      .body{overflow:auto;flex:1;min-height:0;padding:0 15px 12px}.welcome{color:#b5d0c8;line-height:1.55}.bubble{padding:11px 12px;border-radius:12px;background:#173e49;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5;margin:8px 0}.user{background:#234d45;margin-left:25px}.who{font-size:11px;display:block;color:#a6d8c4;margin-bottom:5px}.alert{color:#ffceaa;line-height:1.4;padding:8px 0}.suggestions{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0}
      details{border-top:1px solid #355764;margin-top:12px;padding-top:10px}summary{cursor:pointer;color:#b6e8d4}label{display:block;font-size:12px;color:#b8d2c8;margin:10px 0 4px}textarea,select,input[type=text]{width:100%;border:1px solid #4e777a;color:#ecfff5;background:#0d2532;border-radius:9px;padding:9px}textarea{resize:vertical;min-height:65px}option{background:#0d2532}.row{display:flex;gap:8px;align-items:center}.row>*{min-width:0}.row label{flex:1}.row input[type=checkbox]{margin-right:6px}.primary{background:#8ee9bb;color:#102c2c;border:0;border-radius:9px;padding:10px 14px;font-weight:650}.compose{padding:12px 15px;background:#0b2531;border-top:1px solid #355764}.compose textarea{resize:none;height:70px}.controls{display:flex;gap:7px;align-items:center;margin-top:8px;flex-wrap:wrap}.controls .primary{margin-left:auto}.note{font-size:11px;color:#9cbdb3;line-height:1.45}.chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}a{color:#b6f5d4}
      @keyframes float{50%{transform:translateY(-5px)}}@keyframes pulse{50%{box-shadow:0 0 0 7px #79edbb24}}@media(prefers-reduced-motion:reduce){.avatar,.avatar.active,.avatar img{animation:none}}@media(max-height:600px){:host{bottom:14px}.panel{height:calc(100dvh - 110px)}}
    `;
    function stopListening() {
      recognitionEpoch++; if (recognition) { const current=recognition; recognition=null; try{current.abort();}catch{/* Already stopped. */} }
    }
    function stopSpeaking(){const current=speech;speech=null;if(current&&synthesis)synthesis.cancel();}
    function pause() {
      voiceEpoch++;handsFree=false;stopListening();stopSpeaking();status='Paused';render();
    }
    async function api(action, data) {
      const generation=epoch; const account=context.account;
      const requestController=new AbortController();controller=requestController; const timeout=setTimeout(()=>requestController.abort(),45000);
      const requestUrl=new URL(endpoint.href);if(action==='memory')requestUrl.searchParams.set('account',account);
      try {
        const response=await fetch(requestUrl.href,{method:action==='memory'?'GET':'POST',credentials:'same-origin',cache:'no-store',signal:requestController.signal,
          headers:{Accept:'application/json',...(action==='memory'?{}:{'Content-Type':'application/json','X-Perform-AI-CSRF':context.csrfToken||''})},
          ...(action==='memory'?{}:{body:JSON.stringify({action,account,revision:memory?.revision,...data})})});
        const payload=await response.json();
        if(generation!==epoch||account!==context.account)throw new Error('Account changed.');
        if(!response.ok||!payload.ok)throw new Error(payload.error||'The coach is unavailable.');
        if(payload.account!==account)throw new Error('Account changed. Sign in again before loading memory.');
        return payload;
      } finally {clearTimeout(timeout);if(generation===epoch)controller=null;}
    }
    async function load() {
      if(!context.account||loading)return;const generation=epoch;loading=true;busy=true;error='';render();
      try {const result=await api('memory');if(generation!==epoch)return;memory=result.memory;notes=memory.notes;preferences={...memory.preferences};ready=true;status=result.providerConfigured?'Ready':'AI configuration still needs checking';}
      catch(e){if(generation===epoch)error=e.message;}
      finally{if(generation===epoch){busy=false;loading=false;render();}}
    }
    function speak(text) {
      if(document.hidden||context.suspended){status='Reply ready · voice paused';render();return;}
      if(!synthesis){error='Spoken replies are unavailable in this browser.';render();return;}
      stopListening();stopSpeaking();const generation=epoch;
      const utterance=new SpeechSynthesisUtterance(text);speech=utterance;speech.rate=Number(preferences.speed)||1;
      const voice=synthesis.getVoices().find(v=>v.voiceURI===preferences.voice);if(voice)speech.voice=voice;
      speech.onend=()=>{if(generation!==epoch||destroyed||speech!==utterance)return;speech=null;status='Ready';render();if(handsFree&&open&&!document.hidden)listen();};
      speech.onerror=()=>{if(generation!==epoch||speech!==utterance)return;speech=null;handsFree=false;status='Playback stopped';render();};
      status='Speaking';render();synthesis.speak(speech);
    }
    function localTarget(text) {
      const value=text.trim().toLowerCase().replace(/^macgyver[, ]+/,'').replace(/[.!?]+$/,'');
      if(options.commands){const target=Object.prototype.hasOwnProperty.call(options.commands,value)?options.commands[value]:null;return targets.includes(target)?target:null;}
      const match=value.match(/^(?:open|go to|show)(?: my| the)? (home|dashboard|training|practice|library|files|scores|results|progress|profile|settings|new script)$/);
      if(!match)return null;
      return ({dashboard:'home',practice:'training',files:'library',results:'scores',progress:'scores',settings:'profile','new script':'new-script'})[match[1]]||match[1];
    }
    async function navigate(target) {
      if(!targets.includes(target))return;const generation=epoch;
      try {const result=await options.onNavigate(target);if(generation===epoch){status=result||'Navigation requested';input='';render();}}
      catch(e){if(generation===epoch){error=e.message;render();}}
    }
    async function send() {
      const value=input.trim();if(!value||busy)return;
      if(!context.account){error='Sign in to use private coaching.';render();return;}
      const target=localTarget(value);if(target){await navigate(target);return;}
      if(!ready){error='Load private memory before sending.';render();return;}
      const continueListening=handsFree;pause();handsFree=continueListening;suggested=null;
      const generation=epoch, voiceIntent=voiceEpoch;busy=true;error='';status='Thinking';render();
      try {const result=await api('turn',{message:value,screen:context.screen||''});if(generation!==epoch)return;memory=result.memory;input='';status=voiceEpoch===voiceIntent?'Ready':'Reply ready · voice paused';busy=false;render(result.reply.navigate);if(spoken&&open&&voiceEpoch===voiceIntent){try{speak(result.reply.message);}catch{speech=null;handsFree=false;error='Reply saved. Audio playback is unavailable; you can read it above.';}}}
      catch(e){if(generation===epoch){error=e.message;handsFree=false;status='Instruction kept';}}
      finally{if(generation===epoch){busy=false;render();}}
    }
    function listen() {
      if(busy||!open||document.hidden||!context.account||context.suspended)return;
      const Recognition=global.SpeechRecognition||global.webkitSpeechRecognition;
      if(!Recognition){error='Voice input is unavailable. You can type your instruction.';handsFree=false;render();return;}
      stopSpeaking();stopListening();
      const token=recognitionEpoch;const generation=epoch;recognition=new Recognition();const current=recognition;
      current.lang='en-GB';current.continuous=false;current.interimResults=true;let finalText='',failed=false;
      current.onresult=event=>{if(generation!==epoch||token!==recognitionEpoch)return;let interim='';for(let i=event.resultIndex;i<event.results.length;i++){const part=event.results[i][0]?.transcript||'';if(event.results[i].isFinal)finalText+=' '+part;else interim+=' '+part;}input=(finalText+' '+interim).trim();const box=root.querySelector('#instruction');if(box)box.value=input;};
      current.onerror=event=>{if(generation!==epoch||token!==recognitionEpoch)return;failed=true;handsFree=false;error=event.error==='not-allowed'?'Microphone access was denied. Allow it in your browser or type instead.':'Microphone stopped. Tap Listen to try again, or type.';};
      current.onend=()=>{if(generation!==epoch||token!==recognitionEpoch)return;recognition=null;status='Ready';const text=finalText.trim();
        if(/^macgyver[, ]+(pause|stop|finish)$/i.test(text)){input='';pause();return;}
        if(/^macgyver[, ]+repeat$/i.test(text)){input='';const last=memory?.messages.filter(m=>m.role==='assistant').at(-1);if(last)speak(last.text);return;}
        if(/^macgyver[, ]+hint$/i.test(text))input='Give me a short hint for your last question.';
        render();if(!failed&&handsFree&&input.trim())void send();};
      try{current.start();status='Listening';error='';render();}catch{recognition=null;handsFree=false;error='Microphone could not start. Tap Listen again or type.';render();}
    }
    let spoken=true, suggested=null, detailsOpen=false;
    function render(suggestion) {
      if(destroyed)return;if(suggestion!==undefined)suggested=suggestion;
      const focused=root.activeElement?.id;const selection=root.activeElement?.selectionStart;const previousScroll=root.querySelector('.body')?.scrollTop||0;
      if(root.querySelector('details'))detailsOpen=root.querySelector('details').open;
      host.style.right=left?'auto':'16px';host.style.left=left?'16px':'auto';
      const voiceOptions=(synthesis?.getVoices()||[]).map(v=>`<option value="${escape(v.voiceURI)}" ${v.voiceURI===preferences.voice?'selected':''}>${escape(v.name)} · ${escape(v.lang)}</option>`).join('');
      const messages=(memory?.messages||[]).slice(-40).map(m=>`<div class="bubble ${m.role==='user'?'user':''}"><span class="who">${m.role==='user'?'You':'Macgyver'}</span>${escape(m.text)}</div>`).join('');
      root.innerHTML=`<style>${css}</style>${open?`<section class="panel" role="dialog" aria-label="Macgyver instruction assistant"><header><strong>Macgyver <small>· ${escape(options.appName||'Your app')}</small></strong><button id="side" aria-label="Move assistant to the other side">⇄</button><button id="close" aria-label="Minimize Macgyver">×</button></header><p class="status" role="status" aria-live="polite">${escape(context.account?(context.displayName||'Private account')+' · '+status:'Sign in for private coaching')}</p><div class="body"><p class="welcome">Give me an instruction or practise an answer. Try “Open my scores” or “Give me a five-minute impromptu challenge.”</p>${messages}${suggested&&targets.includes(suggested)?`<button class="small" id="suggestion">Open ${escape(suggested)}</button>`:''}${error?`<p class="alert" role="alert">${escape(error)}</p>`:''}${!context.account?'<button id="login" class="primary">Sign in</button>':`<details><summary>Memory, personality and voice</summary><label for="notes">Private coaching notes</label><textarea id="notes" maxlength="4000">${escape(notes)}</textarea><label for="personality">Personality</label><select id="personality">${personalities.map(p=>`<option ${preferences.personality===p?'selected':''}>${p}</option>`).join('')}</select><label for="voice">Voice available on this device</label><select id="voice"><option value="">System default</option>${voiceOptions}</select><label for="speed">Speaking speed · ${Number(preferences.speed).toFixed(1)}×</label><input id="speed" type="range" min="0.6" max="1.5" step="0.1" value="${Number(preferences.speed)}"><div class="chips"><button id="save" class="small" ${busy||!ready?'disabled':''}>Save memory and voice</button><button id="preview" class="small">Preview voice</button><button id="reload" class="small" ${busy?'disabled':''}>Reload memory</button><button id="export" class="small" ${!memory?'disabled':''}>Export conversation</button></div><p class="note">Device voices vary. Memory belongs to this signed-in account. Older browser history is not imported.</p></details>`}</div><div class="compose"><label for="instruction">Your instruction</label><textarea id="instruction" maxlength="6000" placeholder="Ask Macgyver…">${escape(input)}</textarea><div class="controls"><button id="listen" class="small" ${busy||!context.account?'disabled':''}>Listen</button><button id="pause" class="small">Pause</button><button id="send" class="primary" ${busy||!context.account?'disabled':''}>${busy?'Working…':'Send'}</button></div><div class="row"><label><input id="spoken" type="checkbox" ${spoken?'checked':''}>Spoken replies</label><label><input id="handsfree" type="checkbox" ${handsFree?'checked':''}>Continue listening</label></div><p class="note">Home practice. Keep this page open; backgrounding pauses voice. “Macgyver pause”, “repeat” and “hint” work while listening.</p></div></section>`:''}<button class="avatar ${recognition||speech||busy?'active':''}" id="avatar" aria-label="${open?'Minimize':'Open'} Macgyver" aria-expanded="${open}">${options.avatarUrl?`<img alt="" src="${escape(options.avatarUrl)}">`:'AΩ'}<span class="dot"></span></button>`;
      const on=(id,event,fn)=>root.getElementById(id)?.addEventListener(event,fn);
      on('avatar','click',()=>{open=!open;if(!open)pause();render();if(open){if(!ready&&!busy)void load();root.getElementById('instruction')?.focus();}});
      on('close','click',()=>{open=false;pause();root.getElementById('avatar')?.focus();});
      on('side','click',()=>{left=!left;render();});on('login','click',()=>options.onLogin?.());
      on('instruction','input',e=>{input=e.target.value;});on('instruction','keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send();}});
      on('send','click',()=>void send());on('listen','click',listen);on('pause','click',pause);
      on('spoken','change',e=>{spoken=e.target.checked;if(!spoken&&speech){stopSpeaking();status='Ready';}});
      on('handsfree','change',e=>{handsFree=e.target.checked;});on('notes','input',e=>{notes=e.target.value;});
      on('personality','change',e=>{preferences.personality=e.target.value;});on('voice','change',e=>{preferences.voice=e.target.value;});on('speed','input',e=>{preferences.speed=Number(e.target.value);});
      on('preview','click',()=>speak('A little practice. Lasting confidence. I am Macgyver.'));
      on('reload','click',()=>{ready=false;void load();});on('suggestion','click',()=>void navigate(suggested));
      on('save','click',async()=>{const generation=epoch;busy=true;error='';render();try{const result=await api('save',{notes,preferences});if(generation===epoch){memory=result.memory;status='Memory and voice saved';}}catch(e){if(generation===epoch)error=e.message;}finally{if(generation===epoch){busy=false;render();}}});
      on('export','click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(memory,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='macgyver-private-conversation.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
      if(root.querySelector('details'))root.querySelector('details').open=detailsOpen;
      root.querySelector('.body')?.scrollTo(0,detailsOpen?previousScroll:root.querySelector('.body').scrollHeight);
      root.getElementById('avatar').style.marginLeft=left?'0':'auto';
      if(focused&&root.getElementById(focused)){root.getElementById(focused).focus();if(typeof selection==='number'&&root.getElementById(focused).setSelectionRange)root.getElementById(focused).setSelectionRange(selection,selection);}
    }
    function setContext(next) {
      if(next.account!==context.account){epoch++;controller?.abort();controller=null;pause();memory=null;ready=false;busy=false;loading=false;error='';input='';notes='';suggested=null;preferences={personality:'Supportive',speed:1,voice:''};}
      if(next.suspended&&!context.suspended)pause();context={...next};render();if(open&&context.account&&!ready&&!loading)void load();
    }
    function visibility(){if(document.hidden)pause();}
    function keydown(event){if(event.key==='Escape'&&open){open=false;pause();root.getElementById('avatar')?.focus();}}
    function voices(){if(open)render();}
    document.addEventListener('visibilitychange',visibility);document.addEventListener('keydown',keydown);synthesis?.addEventListener('voiceschanged',voices);
    render();
    return {setContext, pause, destroy(){epoch++;destroyed=true;controller?.abort();stopListening();if(speech&&synthesis)synthesis.cancel();document.removeEventListener('visibilitychange',visibility);document.removeEventListener('keydown',keydown);synthesis?.removeEventListener('voiceschanged',voices);host.remove();}, get reducedMotion(){return reduced.matches;}};
  }
  global.AOMacgyver={mount,version:'1.0.0'};
})(window);

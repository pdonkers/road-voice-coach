const {chromium}=require(process.env.PLAYWRIGHT||'/opt/npm-tools/node_modules/playwright');
const speed=+process.argv[2]||3, secs=+process.argv[3]||150, seed=process.argv[4]==='seed', shot=process.argv[5]||'shot.png', throttle=process.argv[6]==='throttle';
(async()=>{
  const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+__dirname+'/audio/voice.wav','--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:412,height:900},permissions:['microphone']});
  const p=await ctx.newPage();
  const logs=[];let errs=0;
  p.on('console',m=>{const t=m.text();if(m.type()==='error'){errs++;console.log('CONSOLE ERROR',t)}else if(t.startsWith('@'))logs.push(t)});
  p.on('pageerror',e=>{errs++;console.log('PAGEERROR',e.message)});
  await p.addInitScript(({speed,seed,throttle})=>{
    window.__speed=speed;
    if(throttle){const si=window.setInterval.bind(window),st=window.setTimeout.bind(window);window.setInterval=(f,ms,...a)=>si(f,Math.max(1000,ms||0),...a);window.setTimeout=(f,ms,...a)=>st(f,Math.max(1000,ms||0),...a)}
    const ss={speak(u){if(u.text)console.log('@SAY '+u.text);Promise.resolve().then(()=>u.onend&&u.onend())},cancel(){},getVoices(){return[]},onvoiceschanged:null};
    Object.defineProperty(window,'speechSynthesis',{value:ss,configurable:true});
    if(seed&&!localStorage.getItem('rvc_history')){
      localStorage.setItem('rvc_history',JSON.stringify([{d:'2026-10-01',err:48,min:22,low:45,high:62,hiss:11,hold:9,nasal:40},{d:'2026-10-02',err:41,min:25,low:45,high:63,hiss:13,hold:10,nasal:52},{d:'2026-10-03',err:36,min:30,low:44,high:64,hiss:12.5,hold:12,nasal:61}]));
      localStorage.setItem('rvc_data',JSON.stringify({lv:{pm:2,sc:2,iv:1,lt:1},res:{},seen:{pm:1,sc:1,iv:1},vow:{ee:{n:8,sum:-240,abs:260},ah:{n:9,sum:60,abs:120},oo:{n:7,sum:170,abs:200}},vi:2,sk:1,rot:1,phr:1,dic:0,song:{s:0,ph:2},best:{hiss:13,hold:12}}));
    }
  },{speed,seed,throttle});
  await p.goto('http://localhost:8765/index.html');
  await p.evaluate(()=>{new MutationObserver(()=>console.log('@STAGE '+document.getElementById('stage').textContent)).observe(document.getElementById('stage'),{childList:true,characterData:true,subtree:true})});
  await p.click('#goBtn');
  const third=secs/3;
  await p.waitForTimeout(third*1000);
  await p.click('#replayBtn');await p.waitForTimeout(third*1000);
  await p.click('#skipBtn');await p.waitForTimeout(3000);
  await p.click('#pauseBtn');await p.waitForTimeout(2500);const st=await p.textContent('#stage');console.log('while paused stage =',st);
  await p.click('#pauseBtn');
  await p.waitForTimeout(third*1000);
  await p.screenshot({path:__dirname+'/out/run_'+shot});
  await p.click('#goBtn');await p.waitForTimeout(1500);
  console.log('final stage:',await p.textContent('#stage'),'|',await p.textContent('#say'));
  await p.click('#progBtn');await p.waitForTimeout(800);
  await p.screenshot({path:shot,fullPage:true});
  const info=await p.evaluate(async()=>({hist:JSON.parse(localStorage.getItem('rvc_history')||'[]').slice(-1),data:JSON.parse(localStorage.getItem('rvc_data')||'{}'),clips:(await idb.all('clips')).map(c=>c.label+' '+(c.pcm.length/c.sr).toFixed(1)+'s'),notes:[...S.bank.keys()],lat:S.lat,noise:S.noise}));
  const stages=[...new Set(logs.filter(l=>l.startsWith('@STAGE')).map(l=>l.slice(7).split(' · ')[0]))];
  console.log('STAGES:',stages.join(' > '));
  console.log('SAY count',logs.filter(l=>l.startsWith('@SAY')).length);
  require('fs').writeFileSync(__dirname+'/out/log_'+shot+'.txt',logs.join('\n'));
  console.log(JSON.stringify(info));
  console.log('errors:',errs);
  await b.close();
})();

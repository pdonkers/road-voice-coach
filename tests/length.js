// Session length and focus: the technique rotation follows the settings, and a timed session ends by itself near its length with a cool-down.
// node tests/length.js [minutes] [speed]   (speech is stubbed to last about as long as real speech)
const {chromium}=require(process.env.PLAYWRIGHT||'/opt/npm-tools/node_modules/playwright');
const mins=+(process.argv[2]||5),speed=+(process.argv[3]||8);
(async()=>{
  const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+__dirname+'/audio/voice.wav','--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:412,height:900},permissions:['microphone']});
  const p=await ctx.newPage();let errs=0;const said=[];
  p.on('pageerror',e=>{errs++;console.log('PAGEERROR',e.message)});
  p.on('console',m=>{const t=m.text();if(t.startsWith('@SAY '))said.push(t.slice(5))});
  await p.addInitScript(sp=>{window.__speed=sp;
    const ss={speak(u){if(u.text)console.log('@SAY '+u.text);setTimeout(()=>u.onend&&u.onend(),(300+(u.text||"").length*70)/sp)},cancel(){},getVoices(){return[]},onvoiceschanged:null};
    Object.defineProperty(window,'speechSynthesis',{value:ss,configurable:true})},speed);
  await p.goto('http://localhost:8765/index.html');
  // rotation for each setting
  const rots=await p.evaluate(()=>{
    const names=()=>techRotation().map(t=>t[1].split(" ")[0]).join(",");const out={};
    for(const n of ["normal","more","less","off"]){store.set("nasal",n);out[n]=names()}
    store.set("nasal","normal");store.set("topics",["onset","vowels"]);out["normal, onsets+vowels only"]=names();
    store.set("nasal","off");store.set("topics",[]);out["nothing chosen"]=names();
    store.set("nasal","normal");store.set("topics",null);return out;
  });
  for(const [k,v] of Object.entries(rots))console.log(('rotation '+k).padEnd(36),v);
  // settings page shows the choices
  await p.click('#setBtn');
  console.log('settings: topics',await p.locator('#topicBox input').count(),'| length options',await p.locator('#lenSel option').count());
  await p.selectOption('#lenSel',String(mins));
  console.log('home hint:',await p.textContent('#lenHint'));
  await p.screenshot({path:__dirname+'/out/settings.png',fullPage:true});
  await p.click('#homeBtn');await p.click('#goBtn');
  const t0=Date.now();
  await p.waitForFunction(()=>!S.running,null,{timeout:(mins+8)*60000/speed*1.6+60000,polling:1000}).catch(()=>console.log('TIMEOUT: still running'));
  const appMin=(Date.now()-t0)*speed/60000;
  const r=await p.evaluate(()=>{const l=JSON.parse(localStorage.getItem('rvc_diag'));const s=l[l.length-1];return {stage:ui.stage.textContent,say:ui.say.textContent,ev:s.ev.map(e=>e[1]).filter(e=>/plan|took|left out/.test(e)),bmin:D.bmin}});
  console.log(`length ${mins} min: ended "${r.stage}" after about ${appMin.toFixed(1)} app minutes`);
  r.ev.forEach(e=>console.log('  '+e));
  console.log('last lines:',said.slice(-2).join(' | '));
  console.log('learned:',JSON.stringify(r.bmin));
  console.log('page errors:',errs);
  await b.close();
})();

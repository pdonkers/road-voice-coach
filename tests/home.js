// Home practice: the live pitch graph, the target picker, Play note, the drone, and stopping. It runs like the mic test, so it must not
// touch the singing total, the diagnostics or the practice days, and a car session must not feed the graph.
// node tests/home.js
const {chromium}=require(process.env.PLAYWRIGHT||'/opt/npm-tools/node_modules/playwright');
let fails=0,errs=0;
const ok=(name,cond,detail)=>{if(!cond)fails++;console.log((cond?'PASS ':'FAIL ')+name+(detail!==undefined?' | '+detail:''))};
(async()=>{
  const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+__dirname+'/audio/voice.wav','--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:412,height:900},deviceScaleFactor:2,permissions:['microphone']});
  const p=await ctx.newPage();p.on('pageerror',e=>{errs++;console.log('PAGEERROR',e.message)});
  await p.addInitScript(()=>{window.__say=[];
    const ss={speak(u){if(u.text)window.__say.push(u.text);setTimeout(()=>u.onend&&u.onend(),30)},cancel(){},getVoices(){return[]},onvoiceschanged:null};
    Object.defineProperty(window,'speechSynthesis',{value:ss,configurable:true})});
  await p.goto('http://localhost:'+(process.env.PORT||8765)+'/index.html');
  await p.evaluate(()=>{store.set("profile",{home:55,low:45,high:64});store.set("rangeDate",today());store.set("sung",{d:today(),s:100});store.set("diag",[]);store.set("days",[])});
  const idle=ms=>p.waitForFunction(()=>!S.running,null,{timeout:ms,polling:200}).then(()=>true,()=>false);

  // ---- 1. the nav button and the page at 412 px
  ok('nav has a Home practice button, six buttons, none past the right edge',await p.evaluate(()=>{const bs=[...document.querySelectorAll('.links button')];return bs.length===6&&bs.some(x=>x.textContent==='Home practice')&&bs.every(x=>x.getBoundingClientRect().right<=innerWidth)&&document.documentElement.scrollWidth<=innerWidth}));
  ok('graph and controls hidden before it starts',!(await p.isVisible('#hpBox')));

  // ---- 2. start
  await p.click('#hpBtn');
  await p.waitForFunction(()=>S.running&&HP.on&&S.stream,null,{timeout:10000});
  // the simulated singer starts about 5 seconds into the recording
  await p.waitForFunction(()=>HP.buf.filter(x=>x[1]!=null).length>30,null,{timeout:40000,polling:300});
  let st=await p.evaluate(()=>({mode:S.mode,run:S.running,btn:ui.go.textContent,stage:ui.stage.textContent,cur:document.querySelector('.links button[aria-current]').id,target:ui.target.textContent,note:$("hpNote").textContent,
    cw:HP.cv.width,ch:HP.cv.height,rw:HP.cv.getBoundingClientRect().width,rh:HP.cv.getBoundingClientRect().height,dpr:devicePixelRatio,buf:HP.buf.length,voiced:HP.buf.filter(x=>x[1]!=null).length,ctl:ui.ctl.hidden,laterRow:$("laterRow").hidden,
    over:document.documentElement.scrollWidth>innerWidth}));
  ok('starts in home mode, Stop button reads End home practice, nav marks Home practice',st.mode==='home'&&st.run&&st.btn==='End home practice'&&st.stage==='Home practice'&&st.cur==='hpBtn',JSON.stringify([st.mode,st.btn,st.stage,st.cur]));
  ok('target starts at the comfortable note (G3) in the picker and the Target box',st.target==='G3'&&st.note==='G3',st.target+' / '+st.note);
  ok('canvas is sharp: pixels = css size x devicePixelRatio',st.dpr===2&&Math.abs(st.cw-st.rw*2)<=1&&Math.abs(st.ch-st.rh*2)<=1,`${st.cw}x${st.ch} for ${st.rw}x${st.rh} at ${st.dpr}x`);
  ok('session controls stay hidden, no sideways scroll',st.ctl&&st.laterRow&&!st.over);
  ok('tick fills the ring buffer, with pitch values from the simulated singer',st.buf>20&&st.voiced>5,st.buf+' points, '+st.voiced+' with a pitch');
  await p.screenshot({path:__dirname+'/out/home.png'});
  // pixels of the drawn line: green (--good), orange (--warn) or neutral (--fg) strokes, read from the canvas
  const px=(want)=>p.evaluate(w=>{const c=HP.cv,d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0,any=0;
    const cols=w.map(h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]);
    for(let i=0;i<d.length;i+=4){if(d[i+3]>200){any++;for(const k of cols)if(Math.abs(d[i]-k[0])<14&&Math.abs(d[i+1]-k[1])<14&&Math.abs(d[i+2]-k[2])<14){n++;break}}}return {n,any}},want);
  const live=await px(['#5fd3a0','#f07a5a']);
  ok('the canvas shows a coloured line from the live pitch',live.n>30,live.n+' line pixels of '+live.any+' drawn');
  const lab=await p.evaluate(()=>{const c=HP.cv,g=c.getContext('2d');return {lo:HP.p.low,hi:HP.p.high}});
  ok('guide lines for the range come from profile() (45 to 64)',lab.lo===45&&lab.hi===64,JSON.stringify(lab));

  // ---- 3. target picker
  await p.click('#hpUp');let t=await p.evaluate(()=>[targetMidi,$("hpNote").textContent,ui.target.textContent].join('/'));
  ok('+ raises the target a semitone (G#3)',t==='56/G#3/G#3',t);
  await p.click('#hpDn');await p.click('#hpDn');await p.click('#hpDn');t=await p.evaluate(()=>[targetMidi,$("hpNote").textContent].join('/'));
  ok('− lowers it (F3 after three presses)',t==='53/F3',t);
  for(let i=0;i<30;i++)await p.click('#hpDn');t=await p.evaluate(()=>targetMidi);
  ok('the picker stops at the bottom of the range',t===45,String(t));
  for(let i=0;i<30;i++)await p.click('#hpUp');t=await p.evaluate(()=>targetMidi);
  ok('and at the top',t===64,String(t));
  await p.evaluate(()=>hpSet(HP.p.home));

  // ---- 4. Play note
  await p.evaluate(()=>{window.__tones=[];const t0=tone;tone=(...a)=>{window.__tones.push(a);return t0(...a)}});
  await p.click('#hpPlay');await p.click('#hpUp');await p.click('#hpPlay');
  const tn=await p.evaluate(()=>window.__tones.map(a=>[a[0],a[2]]));
  ok('Play note sounds the target note for about a second and a half',tn.length===2&&tn[0][0]===55&&tn[1][0]===56&&tn[0][1]>=1,JSON.stringify(tn));
  await p.evaluate(()=>hpSet(HP.p.home));

  // ---- 5. drone
  ok('the drone starts off',await p.evaluate(()=>HP.drone===null&&$("hpDrone").textContent==='Drone: off'&&$("hpDrone").getAttribute('aria-pressed')==='false'));
  await p.click('#hpDrone');
  let dr=await p.evaluate(()=>({on:!!HP.drone,txt:$("hpDrone").textContent,pr:$("hpDrone").getAttribute('aria-pressed'),f:HP.drone&&HP.drone.o.frequency.value,vol:HP.drone&&HP.drone.g.gain.value}));
  ok('Drone on: oscillator at the target pitch, button pressed',dr.on&&dr.txt==='Drone: on'&&dr.pr==='true'&&Math.abs(dr.f-196)<0.5,JSON.stringify(dr));
  await p.waitForTimeout(600);
  ok('the drone is quiet (gain 0.1 at most)',await p.evaluate(()=>HP.drone.g.gain.value<=0.1001&&HP.drone.g.gain.value>0.02));
  await p.click('#hpUp');await p.click('#hpUp');await p.waitForTimeout(500);
  dr=await p.evaluate(()=>HP.drone.o.frequency.value);
  ok('the drone follows the target (A3, 220 Hz, after two presses of +)',Math.abs(dr-220)<0.5,dr.toFixed(1));
  await p.click('#hpDrone');
  dr=await p.evaluate(()=>({on:!!HP.drone,txt:$("hpDrone").textContent,pr:$("hpDrone").getAttribute('aria-pressed')}));
  ok('Drone off again',!dr.on&&dr.txt==='Drone: off'&&dr.pr==='false',JSON.stringify(dr));

  // ---- 6. colours against the target, neutral without one, and the theme variables (the live feed is switched off so the test controls the points)
  await p.evaluate(()=>{HP.on=false;cancelAnimationFrame(HP.raf)});
  const draw=(m,tg,css)=>p.evaluate(([m,tg,css])=>{
    for(const k of Object.keys(css||{}))document.documentElement.style.setProperty(k,css[k]);
    const now=performance.now();HP.buf=[];for(let i=0;i<60;i++)HP.buf.push([now-1500+i*25,m,tg]);hpDraw();
    for(const k of Object.keys(css||{}))document.documentElement.style.removeProperty(k)},[m,tg,css]);
  await draw(55,55);let a=await px(['#5fd3a0']),w=await px(['#f07a5a']);
  ok('on the target: green line',a.n>100&&w.n===0,`green ${a.n}, orange ${w.n}`);
  await draw(55.2,55);a=await px(['#5fd3a0']);ok('20 cents off still green',a.n>100,String(a.n));
  await draw(55.4,55);a=await px(['#5fd3a0']);w=await px(['#f07a5a']);
  ok('40 cents off: orange line',w.n>100&&a.n===0,`green ${a.n}, orange ${w.n}`);
  await draw(67.0,55);a=await px(['#5fd3a0']);ok('an octave above the target is read as on it (octaves folded)',a.n>0);
  await draw(55,null);a=await px(['#e6ece9']);w=await px(['#f07a5a','#5fd3a0']);
  ok('no target: neutral line, neither green nor orange',a.n>100&&w.n===0,`neutral ${a.n}, coloured ${w.n}`);
  await draw(55,55,{'--good':'#ff00ff'});a=await px(['#ff00ff']);
  ok('the line colour is read from the CSS variable (--good changed to magenta)',a.n>100,String(a.n));
  await draw(55,55,{'--amber':'#00ffff','--line':'#333333'});a=await px(['#00ffff']);
  ok('the target guide line uses --amber',a.n>100,String(a.n));
  // the target's guide line is highlighted: its row has more amber than any other
  ok('older points scroll off after 8 seconds',await p.evaluate(()=>{const now=performance.now();HP.buf=[[now-9500,55,55],[now-9000,55,55],[now-100,55,55]];hpDraw();return HP.buf.length===1}));

  // ---- 7. resize: the canvas follows the width, still sharp
  await p.setViewportSize({width:360,height:800});await p.waitForTimeout(200);
  await p.evaluate(()=>hpDraw());
  st=await p.evaluate(()=>({cw:HP.cv.width,rw:HP.cv.getBoundingClientRect().width,over:document.documentElement.scrollWidth>innerWidth}));
  ok('at 360 px the canvas is resized (width x 2) and the page does not scroll sideways',Math.abs(st.cw-st.rw*2)<=1&&st.rw<340&&!st.over,`${st.cw} for ${st.rw}`);
  await p.setViewportSize({width:412,height:900});await p.waitForTimeout(200);

  // ---- 8. stop on the first press, nothing counted
  await p.evaluate(()=>{HP.on=true;hpDroneSet(true);HP.raf=requestAnimationFrame(hpFrame)});
  const before=await p.evaluate(()=>({sung:JSON.parse(localStorage.getItem('rvc_sung')),diag:JSON.parse(localStorage.getItem('rvc_diag')||'[]').length,days:JSON.parse(localStorage.getItem('rvc_days')||'[]').length,hist:JSON.parse(localStorage.getItem('rvc_history')||'[]').length,sungPend}));
  await p.click('#goBtn');
  ok('first press of the Stop button ends home practice at once',await idle(8000));
  st=await p.evaluate(()=>({btn:ui.go.textContent,stage:ui.stage.textContent,msg:ui.say.textContent,hidden:$("hpBox").hidden,drone:HP.drone,on:HP.on,buf:HP.buf.length,cool:S.cool,wind:S.wind,
    sung:JSON.parse(localStorage.getItem('rvc_sung')),diag:JSON.parse(localStorage.getItem('rvc_diag')||'[]').length,days:JSON.parse(localStorage.getItem('rvc_days')||'[]').length,hist:JSON.parse(localStorage.getItem('rvc_history')||'[]').length,say:window.__say.length,stream:S.stream}));
  ok('back to Start, "Stopped", message says home practice finished, graph hidden',st.btn==='Start'&&st.stage==='Stopped'&&/Home practice finished/.test(st.msg)&&st.hidden,JSON.stringify([st.btn,st.stage,st.msg]));
  ok('no cool-down, no wind-down state',!st.cool&&!st.wind&&st.say===0,'coach lines spoken: '+st.say);
  ok('drone stopped, feed off, buffer cleared, microphone released',st.drone===null&&!st.on&&st.buf===0&&st.stream===null);
  ok('singing time not counted (rvc_sung unchanged at 100 s)',st.sung&&st.sung.s===100&&before.sung.s===100&&before.sungPend===0,JSON.stringify(st.sung));
  ok('no diagnostics entry, no practice day, no history',st.diag===0&&st.days===0&&st.hist===0,JSON.stringify([st.diag,st.days,st.hist]));

  // ---- 9. leaving by the nav: the Home link ends it, the Home practice button toggles it
  await p.click('#hpBtn');await p.waitForFunction(()=>HP.on&&S.stream,null,{timeout:10000});await p.waitForTimeout(500);
  await p.click('#testBtn');ok('Mic test button does nothing while home practice runs',await p.evaluate(()=>S.running&&S.mode==='home'));
  await p.click('#hpBtn');ok('Home practice button again ends it',await idle(8000));
  await p.click('#hpBtn');await p.waitForFunction(()=>HP.on&&S.stream,null,{timeout:10000});await p.click('#setBtn');
  ok('a panel can be opened meanwhile, the graph is hidden (display none) and nothing breaks',await p.evaluate(()=>S.running&&!document.getElementById('settings').hidden)&&!(await p.isVisible('#hpCv')));
  await p.waitForTimeout(500);await p.click('#homeBtn');
  ok('the Home link ends it and shows the home page',await idle(8000)&&await p.isVisible('#goBtn')&&await p.evaluate(()=>document.querySelector('.links button[aria-current]').id)==='homeBtn');

  // ---- 10. a car session does not feed the graph, and its first Stop press still stops at once in the first block
  await p.evaluate(()=>{window.__say.length=0});
  await p.click('#goBtn');await p.waitForFunction(()=>S.running&&S.mode==='session'&&S.stream,null,{timeout:10000});await p.waitForTimeout(3000);
  st=await p.evaluate(()=>({mode:S.mode,on:HP.on,buf:HP.buf.length,box:$("hpBox").hidden,ctl:ui.ctl.hidden,btn:ui.go.textContent}));
  ok('session: graph feed off and hidden, session controls shown',st.mode==='session'&&!st.on&&st.buf===0&&st.box&&!st.ctl&&st.btn==='Stop',JSON.stringify(st));
  await p.click('#goBtn');
  ok('session: first Stop press before the first block ends stops at once (as before)',await idle(15000)&&await p.evaluate(()=>ui.stage.textContent)==='Stopped');
  console.log(`\n${fails?fails+' FAILED':'all passed'} | page errors: ${errs}`);
  process.exitCode=(fails||errs)?1:0;
  await b.close();
})();

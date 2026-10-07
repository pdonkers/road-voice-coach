// Session focus and the nasality-score check: the focus rules (nasality low or falling, notes near the register break, topic practised longest ago,
// ties to nasality, the "None" setting), the spoken focus line and the order of technique blocks in untimed and timed sessions, `nas` kept with
// saved nasality takes, and the "Check the nasality measure" panel (random order, hidden score, Spearman result, verdicts, scatter, backup).
// node tests/focus.js [speed]   (speech is stubbed to last about as long as real speech; about 6 minutes)
const {chromium}=require(process.env.PLAYWRIGHT||'/opt/npm-tools/node_modules/playwright');
const SPEED=+(process.argv[2]||10);
let fails=0,errs=0;
const ok=(name,cond,detail)=>{if(!cond)fails++;console.log((cond?'PASS ':'FAIL ')+name+(detail!==undefined?' | '+detail:''))};
const launch=async(speed=SPEED)=>{
  const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+__dirname+'/audio/voice.wav','--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:412,height:900},permissions:['microphone']});
  const p=await ctx.newPage();p.on('pageerror',e=>{errs++;console.log('PAGEERROR',e.message)});
  await p.addInitScript(sp=>{window.__speed=sp;window.__say=[];
    const ss={speak(u){if(u.text)window.__say.push(u.text);setTimeout(()=>u.onend&&u.onend(),(300+(u.text||"").length*70)/sp)},cancel(){},getVoices(){return[]},onvoiceschanged:null};
    Object.defineProperty(window,'speechSynthesis',{value:ss,configurable:true})},speed);
  await p.goto('http://localhost:'+(process.env.PORT||8765)+'/index.html');
  await p.evaluate(()=>{store.set("profile",{home:55,low:45,high:64});store.set("rangeDate",today())});
  return {b,p};
};
const say=p=>p.evaluate(()=>window.__say.slice());
const idle=(p,ms=400000)=>p.waitForFunction(()=>!S.running,null,{timeout:ms,polling:500}).then(()=>true,()=>false);
const evs=p=>p.evaluate(()=>{const l=JSON.parse(localStorage.getItem('rvc_diag')||'[]'),s=l[l.length-1];return s?s.ev.map(e=>e[1]):[]});
const FOCUS=/^Today's focus: (.*?)\. (.*)$/;
// reference Spearman, written independently of the app
const refRho=(a,b)=>{const rk=v=>v.map(x=>v.filter(y=>y<x).length+(v.filter(y=>y===x).length+1)/2);const x=rk(a),y=rk(b),mx=x.reduce((s,v)=>s+v,0)/x.length,my=y.reduce((s,v)=>s+v,0)/y.length;
  let c=0,sx=0,sy=0;for(let i=0;i<x.length;i++){c+=(x[i]-mx)*(y[i]-my);sx+=(x[i]-mx)**2;sy+=(y[i]-my)**2}return c/Math.sqrt(sx*sy)};
(async()=>{
  // ---- 1. the focus rules, on seeded history and coach state
  let {b,p}=await launch();
  const pick=(seed)=>p.evaluate(s=>{
    localStorage.clear();store.set("profile",{home:55,low:45,high:64});D=D0();
    const T=["onset","registers","vowels","clear","legato","breath","release","sounds"];
    if(s.hist)store.set("history",s.hist.map((n,i)=>({d:"2026-09-"+String(10+i).padStart(2,"0"),err:30,min:20,nasal:n})));
    if(s.brk)D.brk=s.brk;if(s.notes)D.notes=s.notes;if(s.lastT)D.lastT=s.lastT;
    if(s.lastAll)for(const k of ["nasality",...T])D.lastT[k]=s.lastAll[k]||s.lastAll._||"";
    if(s.setting)for(const [k,v] of Object.entries(s.setting))store.set(k,v);
    const f=pickFocus(techRotation());return f?{k:f.t[0],why:f.why}:null},seed);
  const near=(a,b)=>{const o={};for(let m=a;m<=b;m++)o[m]={n:5,err:40};for(let m=45;m<=64;m++)if(!o[m])o[m]={n:5,err:10};return o};
  let r=await pick({});
  ok('nothing practised yet: nasality (wins the tie)',r&&r.k==='nasality'&&/not practised yet/.test(r.why),JSON.stringify(r));
  r=await pick({hist:[70,72,35]});
  ok('nasality score low (35): nasality',r&&r.k==='nasality'&&/low, 35/.test(r.why),JSON.stringify(r));
  r=await pick({hist:[80,80,78,64],lastAll:{_:"2026-10-06",vowels:"2026-01-01"}});
  ok('nasality score falling (80, 80, 78 then 64): nasality, though vowels is older',r&&r.k==='nasality'&&/falling/.test(r.why),JSON.stringify(r));
  r=await pick({hist:[80,80,78,74],lastAll:{_:"2026-10-06",vowels:"2026-01-01"}});
  ok('nasality steady and fine: not nasality, the oldest topic instead',r&&r.k==='vowels'&&/longest ago, last on 2026-01-01/.test(r.why),JSON.stringify(r));
  r=await pick({hist:[80,82,80],brk:[57,58,58],notes:near(56,60),lastAll:{_:"2026-10-06",vowels:"2026-01-01"}});
  ok('notes near the break 40 cents off, the rest 10: registers, before the oldest topic',r&&r.k==='registers'&&/near the register break, A#3.* 40 cents/.test(r.why),JSON.stringify(r));
  r=await pick({hist:[80,82,80],brk:[58,58,58],notes:near(56,60),lastAll:{_:"2026-10-06",vowels:"2026-01-01"},setting:{topics:["onset","vowels"],topicsOf:["onset","registers","vowels","clear","legato","breath","release","sounds"]}});
  ok('registers unticked in Settings: the break rule does not fire',r&&r.k==='vowels',JSON.stringify(r));
  r=await pick({hist:[80,82,80],brk:[58,58,58],notes:Object.fromEntries([...Array(20)].map((_,i)=>[45+i,{n:5,err:40}])),lastAll:{_:"2026-10-06",vowels:"2026-01-01"}});
  ok('every note equally off (not worse near the break): not registers',r&&r.k==='vowels',JSON.stringify(r));
  r=await pick({hist:[80,82,80],brk:[58],notes:near(56,60),lastAll:{_:"2026-10-06",vowels:"2026-01-01"}});
  ok('only one break recorded: not registers',r&&r.k==='vowels',JSON.stringify(r));
  r=await pick({hist:[80,82,80],brk:[58,58,58],notes:Object.fromEntries([57,58].map(m=>[m,{n:2,err:60}])),lastAll:{_:"2026-10-06",vowels:"2026-01-01"}});
  ok('notes near the break with under 3 takes do not count',r&&r.k==='vowels',JSON.stringify(r));
  r=await pick({hist:[80,82,80],lastAll:{_:"2026-10-06"}});
  ok('everything practised on the same day: nasality wins the tie',r&&r.k==='nasality',JSON.stringify(r));
  r=await pick({hist:[80,82,80],lastAll:{_:"2026-10-06",nasality:"2026-10-07",onset:"2026-09-20",legato:"2026-09-01"}});
  ok('oldest by date, never practised counts as oldest: legato is dated, onset later',r&&r.k==='legato'&&/2026-09-01/.test(r.why),JSON.stringify(r));
  r=await pick({hist:[10],setting:{nasal:"off"}});
  ok('nasality off in Settings: never the focus, even with a low score',r&&r.k!=='nasality',JSON.stringify(r));
  r=await pick({hist:[10],setting:{focus:"none"}});
  ok('setting "None, just rotate": no focus',r===null,JSON.stringify(r));
  r=await pick({hist:[10],setting:{nasal:"off",topics:["onset"],topicsOf:["onset","registers","vowels","clear","legato","breath","release","sounds"]}});
  ok('only one topic in the rotation: no focus to choose',r===null,JSON.stringify(r));
  // the setting on the Settings page
  await p.evaluate(()=>localStorage.clear());await p.reload();await p.click('#setBtn');
  ok('Settings: Session focus, default automatic',await p.evaluate(()=>[$("focSel").options.length,$("focSel").value,$("focSel").options[0].textContent,$("focSel").options[1].textContent].join(' | '))==='2 | auto | Automatic, from my results | None, just rotate');
  await p.selectOption('#focSel','none');
  ok('Settings: saved as rvc_focus',await p.evaluate(()=>localStorage.getItem('rvc_focus'))==='"none"');
  await b.close();

  // ---- 2. untimed session, nasality low: the line, two nasality blocks first, the rotation undisturbed
  ({b,p}=await launch());
  await p.evaluate(()=>{store.set("history",[{d:"2026-10-01",err:30,min:20,nasal:30}]);store.set("len",0)});
  const rot2=await p.evaluate(()=>techRotation().map(t=>t[1]));
  await p.click('#goBtn');
  await p.waitForFunction(n=>S.round===2&&stageName===n,rot2[1%rot2.length],{timeout:400000,polling:300}).catch(()=>console.log('TIMEOUT waiting for round 2'));
  const rot2State=await p.evaluate(()=>({t2:D.rotT2,last:D.lastT,stage:stageName}));
  await p.click('#goBtn');await p.waitForTimeout(100);await p.click('#goBtn');
  ok('untimed session ends after Stop twice',await idle(p,60000));
  let s=await say(p),e=await evs(p);
  const fl=s.findIndex(x=>FOCUS.test(x)),wu=s.findIndex(x=>/^Warm-up\./.test(x));
  ok('focus line: after the greeting, before the warm-up',fl>0&&/^Hi, I'm your singing coach/.test(s[0])&&fl<wu,'line '+fl+', warm-up '+wu);
  ok('focus line text',s[fl]==="Today's focus: nasality. You'll do it twice, and it comes first.",s[fl]);
  const took=e.map(x=>(x.match(/^(.*) took /)||[])[1]).filter(Boolean);
  const tech=took.filter(n=>rot2.includes(n));
  ok('round 1: the first two technique blocks are both the focus',tech[0]==='Nasality'&&tech[1]==='Nasality',took.join(', '));
  ok('round 1: the focus blocks come first and second in the round (warm-up, focus, pitch work, focus)',took[0]==='Warm-up'&&took[1]==='Nasality'&&took.indexOf('Nasality',2)>took.indexOf('Intervals'),took.join(', '));
  ok('diagnostics log the focus and the reason',e.some(x=>/^focus: Nasality \(nasality score is low, 30\)$/.test(x)),e.filter(x=>/^focus/.test(x)).join(' | '));
  ok('D.rotT2 not advanced by the focus blocks; round 2 starts the normal rotation',rot2State.t2===2&&rot2State.stage===rot2[1%rot2.length],`rotT2 ${rot2State.t2}, round 2 block ${rot2State.stage}, expected ${rot2[1%rot2.length]}`);
  ok('D.lastT dated for the practised topics',rot2State.last.nasality===(await p.evaluate(()=>today())),JSON.stringify(rot2State.last));
  await b.close();

  // ---- 3. timed sessions: 5 minutes (one focus block fits), 10 minutes (registers focus), and the setting off
  const timed=async(len,seed)=>{
    const {b,p}=await launch();
    await p.evaluate(([len,seed])=>{store.set("len",len);eval(seed)},[len,seed]);
    const rot=await p.evaluate(()=>techRotation().map(t=>t[1])),t2=await p.evaluate(()=>D.rotT2);
    await p.click('#goBtn');const done=await idle(p,300000);
    const o={done,say:await say(p),ev:await evs(p),rot,t2,t2end:await p.evaluate(()=>D.rotT2)};await b.close();return o};
  const seedOld=`store.set("history",[{d:"2026-10-01",err:30,min:20,nasal:80},{d:"2026-10-02",err:30,min:20,nasal:80}]);for(const k of ["nasality","onset","registers","clear","legato","breath","release","sounds"])D.lastT[k]="2026-10-05";D.lastT.vowels="2026-01-01"`;
  let o=await timed(5,seedOld);
  let fline=o.say.find(x=>FOCUS.test(x)),plan=o.ev.find(x=>/^round 1 plan/.test(x)),tookT=o.ev.map(x=>(x.match(/^(.*) took /)||[])[1]).filter(Boolean);
  ok('5 min, oldest topic (vowels): session ended',o.done);
  ok('5 min: one focus block fits, so the line says so',fline==="Today's focus: vowels. It comes first.",fline);
  ok('5 min: the plan has one Vowels block and it is the first technique block',(plan.match(/Vowels/g)||[]).length===1&&tookT.indexOf('Vowels')===1,plan+' / '+tookT.join(', '));
  ok('5 min: diagnostics give the reason',o.ev.some(x=>/^focus: Vowels \(practised longest ago, last on 2026-01-01\)$/.test(x)),o.ev.filter(x=>/^focus/.test(x)).join(''));
  ok('5 min: the focus line comes after "This is a five minute session." and before the warm-up',o.say.findIndex(x=>/^This is a five minute session/.test(x))<o.say.findIndex(x=>FOCUS.test(x))&&o.say.findIndex(x=>FOCUS.test(x))<o.say.findIndex(x=>/^Warm-up\./.test(x)));
  ok('5 min: D.rotT2 untouched',o.t2===o.t2end,o.t2+' -> '+o.t2end);
  const seedReg=`store.set("history",[{d:"2026-10-01",err:30,min:20,nasal:80},{d:"2026-10-02",err:30,min:20,nasal:80}]);D.brk=[57,58,58];D.notes={};for(let m=45;m<=64;m++)D.notes[m]={n:5,err:Math.abs(m-58)<=2?40:10}`;
  o=await timed(10,seedReg);
  fline=o.say.find(x=>FOCUS.test(x));plan=o.ev.find(x=>/^round 1 plan/.test(x));tookT=o.ev.map(x=>(x.match(/^(.*) took /)||[])[1]).filter(Boolean);
  const nPlan=(plan.match(/Registers/g)||[]).length;
  ok('10 min, break rule: session ended',o.done);
  ok('10 min: the line says "twice" exactly when the plan holds two Registers blocks',(nPlan===2&&fline==="Today's focus: registers. You'll do it twice, and it comes first.")||(nPlan===1&&fline==="Today's focus: registers. It comes first."),nPlan+' in plan: '+fline);
  ok('10 min: Registers is the first technique block, ahead of the rotation',tookT[1]==='Registers',tookT.join(', ')+' | '+plan);
  ok('10 min: diagnostics give the reason',o.ev.some(x=>/^focus: Registers \(notes near the register break, A#3, are 40 cents off\)$/.test(x)),o.ev.filter(x=>/^focus/.test(x)).join(''));
  o=await timed(5,`store.set("focus","none");store.set("history",[{d:"2026-10-01",err:30,min:20,nasal:10}])`);
  tookT=o.ev.map(x=>(x.match(/^(.*) took /)||[])[1]).filter(Boolean);
  ok('setting "None": no focus line, no focus in the log, as before',o.done&&!o.say.some(x=>/^Today's focus/.test(x))&&!o.ev.some(x=>/^focus/.test(x)),o.say.length+' lines');
  ok('setting "None": the rotation runs from D.rotT2 as before',tookT.includes(o.rot[o.t2%o.rot.length])&&o.t2end>o.t2,'first rotation topic '+o.rot[o.t2%o.rot.length]+', ran '+tookT.join(', ')+'; rotT2 '+o.t2+' -> '+o.t2end);

  // ---- 4. a nasality block keeps each scored take with its score (nas, 0 to 100)
  ({b,p}=await launch());
  const sc=await p.evaluate(async()=>{
    const out={};
    try{
      S.running=true;S.stop=false;S.mode="session";await openMic();
      Object.assign(S,{scores:[],biases:[],round:1,misses:0,tip:{},nasScores:[],sessionStart:performance.now(),loudAt:-1e9,repN:0,fbEvery:1,done:0,nasDone:false});
      await loadBank();await calibrate(800);S.lat=100;
      // the microphone part is replaced: contrast pair at 0 and 10, then lifted takes at 2, 6, 8, 12 and 4 (all further ones at 7)
      const nps=[0,10,2,6,8,12,4];let k=0;const sr=48000,pcm=new Float32Array(sr).map((_,i)=>0.3*Math.sin(2*Math.PI*220*i/sr));
      ahTake=async()=>{const np=k<nps.length?nps[k]:7;k++;return {take:{pcm:pcm.slice(),sr},np}};
      await idb.clear("clips");
      await block("Nasality",()=>nasality({home:55,low:45,high:64}),{sum:false});
      await new Promise(r=>setTimeout(r,800));
      const c=await idb.all("clips");
      out.pair=c.filter(x=>x.label==="Nasal ah"||x.label==="Lifted ah"&&x.nas==null).map(x=>x.label+':'+x.nas);
      out.scored=c.filter(x=>!x.first&&typeof x.nas==="number").sort((a,b)=>a.t-b.t).map(x=>x.label+':'+x.nas);
      out.nasScores=S.nasScores.map(x=>Math.round(x*100));out.k=k;
    }catch(e){out.err=String(e&&e.stack||e)}
    closeMic();S.running=false;return out;
  });
  ok('nasality block ran without error',!sc.err,sc.err||('stub calls '+sc.k));
  ok('every scored lifted take is saved with nas = its score as a whole number',sc.scored&&sc.scored.length>=2&&sc.scored.length===sc.nasScores.length&&sc.scored.every((x,i)=>x==='Lifted ah:'+sc.nasScores[i]),'saved '+sc.scored+' | spoken scores '+sc.nasScores);
  ok('scores are 0 to 100 and clamped (a take above the lifted reference scores 100)',sc.scored.every(x=>{const v=+x.split(':')[1];return v>=0&&v<=100}),sc.scored.join(' '));
  ok('the contrast pair (defined as 0 and 100 by the block) carries no score',sc.pair.length>=2&&sc.pair.every(x=>/:null$/.test(x)),sc.pair.join(' '));
  // backup keeps nas
  const bk=await p.evaluate(async()=>{
    const before=(await idb.all("clips")).filter(c=>c.nas!=null).map(c=>c.t+':'+c.nas).sort();
    const f=await makeBackup(true);await idb.clear("clips");await restoreBackup(JSON.parse(JSON.stringify(f)));
    const after=(await idb.all("clips")).filter(c=>c.nas!=null).map(c=>c.t+':'+c.nas).sort();
    return {before,after}});
  ok('a backup carries nas and restores it',bk.before.length>=2&&JSON.stringify(bk.before)===JSON.stringify(bk.after),bk.before.length+' scored takes');
  // pruning: scored takes have their own allowance of 20
  const pr=await p.evaluate(async()=>{
    await idb.clear("clips");const sr=48000,pcm=new Float32Array(sr);
    for(let i=0;i<24;i++)await addClip("Lifted ah",{pcm,sr},i*4);
    for(let i=0;i<22;i++)await addClip("Song "+i%3,{pcm,sr});
    const c=(await idb.all("clips")).filter(x=>!x.first);return {scored:c.filter(x=>x.nas!=null).length,plain:c.filter(x=>x.nas==null).length}});
  ok('clip pruning: 20 scored and 20 other takes kept separately',pr.scored===20&&pr.plain===20,JSON.stringify(pr));
  await b.close();

  // ---- 5. the check panel
  ({b,p}=await launch());
  await p.click('#progBtn');await p.waitForTimeout(300);
  ok('Progress has the button',await p.locator('#ncBtn').isVisible(),await p.textContent('#ncBtn'));
  await p.click('#ncBtn');await p.waitForTimeout(300);
  let txt=await p.textContent('#ncBody');
  ok('no scored takes: says so',/No scored takes yet/.test(txt),txt.slice(0,60));
  ok('panel is the open view, Progress stays marked in the nav',await p.evaluate(()=>!$("nasCheck").hidden&&$("progress").hidden&&$("progBtn").getAttribute("aria-current")==="page"));
  // ten takes with scores; keep the true scores in the page only
  const NAS=[10,20,30,40,50,60,70,80,90,100];
  const seed=()=>p.evaluate(async nas=>{await idb.clear("clips");localStorage.removeItem("rvc_nasRate");ncCur=null;const sr=48000,pcm=new Float32Array(sr/2);
    for(let i=0;i<nas.length;i++)await idb.put("clips",{t:1.7e12+i*1000,label:i%2?"Lifted ah":"Nasal ah",pcm,sr,nas:nas[i]});
    // an old take without a score and a first-copy of a scored take must not be offered
    await idb.put("clips",{t:1.6e12,label:"Song",pcm,sr});await idb.put("clips",{t:1.7e12,label:"Lifted ah",pcm,sr,nas:nas[0],first:true})},NAS);
  await seed();
  await p.evaluate(()=>{showView("progress")});await p.click('#ncBtn');await p.waitForTimeout(400);
  txt=await p.textContent('#ncBody');
  ok('shows "Rated 0 of 10 takes." (unscored takes and the first-copy are not counted twice)',/Rated 0 of 10 takes\./.test(txt),txt.slice(0,50));
  ok('before playing: the question and the 5 buttons are hidden',await p.evaluate(()=>{const q=[...document.querySelectorAll('#ncBody div')].find(d=>d.querySelector('.clips'));return q&&q.hidden}));
  await p.click('#ncBody >> text=Play a take');await p.waitForTimeout(300);
  const qa=await p.evaluate(()=>({q:[...document.querySelectorAll('#ncBody p')].map(x=>x.textContent).find(t=>/How nasal/.test(t)),b:[...document.querySelectorAll('#ncBody .clips button')].map(x=>x.textContent)}));
  ok('after playing: "How nasal did that sound?" with five buttons, very nasal to open',qa.q==='How nasal did that sound?'&&qa.b.join('|')==='Very nasal|Quite nasal|In between|Mostly open|Open, not nasal',qa.b.join('|'));
  txt=await p.evaluate(()=>document.querySelector('#nasCheck').innerText);
  ok('the app\'s score is not shown while rating',!/score \d|\b(10|20|30|40|50|60|70|80|90|100)\b/.test(txt.replace(/Rated 0 of 10/,'')),'')
  // rate seven takes through the buttons, always the middle-ish answer by position, and record which take each one was
  const order=[];
  for(let i=0;i<7;i++){
    const cur=await p.evaluate(()=>ncCur.t);order.push(cur);
    if(i>0)await p.click('#ncBody >> text=Play a take');
    await p.click(`#ncBody .clips button >> nth=${[0,1,2,3,4,3,1][i]}`);await p.waitForTimeout(250);
  }
  const rt=await p.evaluate(()=>JSON.parse(localStorage.getItem('rvc_nasRate')));
  ok('ratings saved in rvc_nasRate as {clip time: rating}',Object.keys(rt).length===7&&order.every((t,i)=>rt[t]===[1,2,3,4,5,4,2][i]),JSON.stringify(rt));
  ok('no take offered twice (random order, without repeats)',new Set(order).size===7,order.map(t=>(t-1.7e12)/1000).join(','));
  txt=await p.textContent('#ncBody');
  ok('after 7 ratings: no result yet, says how many to go',/Rated 7 of 10/.test(txt)&&/after 8 ratings \(1 to go\)/.test(txt)&&!/Spearman/.test(txt),'');
  await p.click('#ncBody >> text=Play a take');await p.click('#ncBody .clips button >> nth=2');await p.waitForTimeout(300);
  txt=await p.textContent('#ncBody');
  ok('at 8 ratings the result appears with the correlation and a verdict',/Rated 8 of 10/.test(txt)&&/Spearman correlation.*: -?\d\.\d\d, over 8 takes/.test(txt)&&/keep it|hint|dropped/.test(txt),txt.slice(txt.indexOf('Result'),txt.indexOf('Result')+160));
  ok('scatter: one dot per rated take, in the chart style',await p.locator('#ncBody figure.chart svg circle.pt').count()===8);
  await p.screenshot({path:__dirname+'/out/nascheck.png',fullPage:true});
  // verdicts, from fixed ratings of the ten takes; rho checked against a reference calculation
  const cases=[
    ['agrees',[1,1,2,2,3,3,4,4,5,5],/^The measure agrees with your ear; keep it\.$/],
    ['roughly',[2,1,4,2,3,5,2,4,5,3],/^It roughly agrees; treat it as a hint\.$/],
    ['disagrees',[5,1,4,2,3,3,1,5,2,4],/^It doesn't agree with your ear; it should be dropped\.$/],
    ['opposite',[5,5,4,4,3,3,2,2,1,1],/^It doesn't agree with your ear; it should be dropped\.$/]];
  for(const [name,ratings,verdict] of cases){
    await p.evaluate(([r])=>{const rt={};r.forEach((v,i)=>rt[1.7e12+i*1000]=v);store.set("nasRate",rt);ncCur=null},[ratings]);
    await p.evaluate(()=>{showView("progress")});await p.click('#ncBtn');await p.waitForTimeout(400);
    txt=await p.evaluate(()=>document.querySelector('#ncBody').innerText);
    const m=txt.match(/Spearman correlation[^:]*: (-?\d\.\d\d), over (\d+) takes\./),want=refRho(ratings,NAS),vt=await p.evaluate(()=>[...document.querySelectorAll('#ncBody p')].map(x=>x.textContent).find(t=>/keep it|hint|dropped/.test(t)));
    ok(`verdict "${name}": correlation matches the reference (${want.toFixed(2)}) over 10 takes`,m&&Math.abs(+m[1]-want)<0.006&&m[2]==='10','page '+(m&&m[1]));
    ok(`verdict "${name}": plain-language text`,verdict.test(vt||''),vt);
    ok(`verdict "${name}": "You have rated every take", nothing left to play, 10 dots`,/rated every take/.test(txt)&&!/Play a take/.test(txt)&&await p.locator('#ncBody figure.chart circle.pt').count()===10);
  }
  // all scores equal: nothing to compare
  await seed();await p.evaluate(async()=>{for(const c of await idb.all("clips"))if(c.nas!=null){c.nas=50;await idb.put("clips",c)}const rt={};for(let i=0;i<10;i++)rt[1.7e12+i*1000]=1+i%5;store.set("nasRate",rt);ncCur=null});
  await p.evaluate(()=>showView("progress"));await p.click('#ncBtn');await p.waitForTimeout(400);
  txt=await p.textContent('#ncBody');
  ok('all scores the same: says there is nothing to compare, no verdict',/nothing to compare yet/.test(txt)&&!/Spearman|keep it|dropped/.test(txt),'');
  // clear ratings
  p.once('dialog',d=>d.accept());await p.click('#ncBody >> text=Clear my ratings');await p.waitForTimeout(400);
  ok('Clear my ratings empties rvc_nasRate and starts over',await p.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('rvc_nasRate')||'{}')).length)===0&&/Rated 0 of 10/.test(await p.textContent('#ncBody')));
  // not while a session runs
  await p.evaluate(()=>{S.running=true});await p.evaluate(()=>showView("progress"));await p.click('#ncBtn');
  ok('not opened while a session is running (never while driving)',await p.evaluate(()=>$("nasCheck").hidden));
  await p.evaluate(()=>{S.running=false});
  // phone width: nothing overflows sideways
  await p.evaluate(()=>showView("progress"));await p.click('#ncBtn');await p.waitForTimeout(300);
  ok('phone width: no sideways scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),await p.evaluate(()=>document.documentElement.scrollWidth+' vs '+document.documentElement.clientWidth));
  await b.close();

  console.log(fails?`${fails} FAILED`:'ALL PASSED');
  console.log('page errors:',errs);
  process.exitCode=(fails||errs)?1:0;
})();

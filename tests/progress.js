// Practice days, streak and weekly goal; the Guide lessons; then-and-now takes. Seeds days, history and clips through page.evaluate.
const {chromium}=require(process.env.PLAYWRIGHT||'/opt/npm-tools/node_modules/playwright');
let fails=0,errs=0;
const ok=(name,cond,detail)=>{if(!cond)fails++;console.log((cond?'PASS ':'FAIL ')+name+(detail!==undefined?' | '+detail:''))};
// independent date maths, in UTC like the app's today()
const DAY=864e5,nOf=s=>Math.floor(Date.parse(s)/DAY),sOf=n=>new Date(n*DAY).toISOString().slice(0,10);
const todayN=nOf(new Date().toISOString().slice(0,10)),monN=todayN-((new Date(todayN*DAY).getUTCDay()+6)%7);
const weekCount=set=>[...set].filter(n=>n>=monN&&n<monN+7).length;
const mmdd=ms=>new Date(ms).toISOString().slice(5,10);
const launch=async(speed=6)=>{
  const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+__dirname+'/audio/voice.wav','--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:412,height:900},permissions:['microphone']});
  const p=await ctx.newPage();p.on('pageerror',e=>{errs++;console.log('PAGEERROR',e.message)});
  await p.addInitScript(sp=>{window.__speed=sp;window.__say=[];
    const ss={speak(u){window.__say.push(u.text);Promise.resolve().then(()=>u.onend&&u.onend())},cancel(){},getVoices(){return[]},onvoiceschanged:null};
    Object.defineProperty(window,'speechSynthesis',{value:ss,configurable:true})},speed);
  await p.goto('http://localhost:'+(process.env.PORT||8765)+'/index.html');
  return {b,p};
};
(async()=>{
  // ---- 1. streak, week text, week squares, goal setting
  let {b,p}=await launch();
  const offs=[0,1,2,5,9,16,40];                                   // today, yesterday, the day before: streak 3
  await p.evaluate(d=>{store.set("days",d);},offs.map(o=>sOf(todayN-o)));
  await p.click('#setBtn');await p.selectOption('#goalSel','5');
  ok('goal setting saved',await p.evaluate(()=>store.get("goal",0))===5);
  await p.evaluate(()=>localStorage.removeItem("rvc_goal"));await p.reload();await p.click('#setBtn');
  ok('goal defaults to 4',await p.evaluate(()=>goalDays()+'/'+document.getElementById('goalSel').value)==='4/4');
  await p.click('#progBtn');await p.waitForTimeout(300);
  const set=new Set(offs.map(o=>todayN-o)),wk=weekCount(set);
  const hint=await p.evaluate(()=>document.querySelector('#charts .hint').textContent);
  ok('week and streak text',hint===`This week: ${wk} of 4 days. Streak: 3 days.`,hint);
  const weeks=await p.evaluate(()=>[...document.querySelectorAll('#charts .weeks > div')].map(d=>({n:d.children.length,on:d.querySelectorAll('i.on').length,label:d.getAttribute('aria-label')})));
  const want=[];for(let w=7;w>=0;w--){const m=monN-7*w;want.push([...set].filter(n=>n>=m&&n<m+7).length)}
  ok('8 weeks of 7 squares',weeks.length===8&&weeks.every(w=>w.n===7),weeks.length+' weeks');
  ok('filled squares per week match, most recent last',JSON.stringify(weeks.map(w=>w.on))===JSON.stringify(want),weeks.map(w=>w.on).join(','));
  ok('each week has an aria-label with its count',weeks.every((w,i)=>new RegExp(`^Week of \\d\\d-\\d\\d: ${want[i]} of 7 days$`).test(w.label)),weeks[7].label);
  ok('progress page does not scroll sideways',await p.evaluate(()=>document.scrollingElement.scrollWidth<=innerWidth));
  await p.screenshot({path:__dirname+'/out/progress.png',fullPage:true});
  // streak up to yesterday when today has no session yet, and a broken streak
  const st=await p.evaluate(()=>({
    a:streakOf([dayS(dayN(today())-1),dayS(dayN(today())-2)]),b:streakOf([dayS(dayN(today())-2)]),c:streakOf([]),d:streakOf([today()])}));
  ok('streak: up to yesterday counts, a gap breaks it',st.a===2&&st.b===0&&st.c===0&&st.d===1,JSON.stringify(st));
  // guide lessons
  await p.click('#guideBtn');await p.waitForTimeout(200);
  const ls=await p.evaluate(()=>[...document.querySelectorAll('#lessons a')].map(a=>({h:a.href,t:a.target,r:a.rel,x:a.textContent,s:a.nextElementSibling.textContent})));
  ok('11 lesson links',ls.length===11,String(ls.length));
  ok('all link to youtube, in a new tab, noopener',ls.every(l=>l.h.startsWith('https://www.youtube.com/')&&l.t==='_blank'&&/noopener/.test(l.r)));
  ok('topic, then title and channel',ls[0].x==='Nasality'&&/Dr Dan/.test(ls[0].s)&&ls[10].x==='Vowels',ls[0].x+' | '+ls[0].s);
  ok('lessons come after the cues',await p.evaluate(()=>{const g=document.getElementById('guide');return g.querySelector('#cues').compareDocumentPosition(g.querySelector('#lessons'))&Node.DOCUMENT_POSITION_FOLLOWING}));
  ok('guide does not scroll sideways',await p.evaluate(()=>document.scrollingElement.scrollWidth<=innerWidth));

  // ---- 2. addClip: first clips survive pruning
  const pr=await p.evaluate(async()=>{
    await idb.clear("clips");const w=()=>new Promise(r=>setTimeout(r,4)),m=(v,len=8000)=>({pcm:new Float32Array(len).fill(v),sr:8000});
    await addClip("Free singing",m(0.11));await w();
    for(let i=0;i<25;i++){await addClip("Pitch: best take",m(0.2+i/1000));await w()}
    let a=await idb.all("clips");
    const r1={norm:a.filter(c=>!c.first).length,first:a.filter(c=>c.first).length,pf:a.filter(c=>c.first&&c.label==="Pitch: best take").map(c=>+c.pcm[0].toFixed(3)),ff:a.filter(c=>c.first&&c.label==="Free singing").length};
    for(let i=0;i<14;i++){await addClip("Song "+i,m(0.5));await w();await addClip("Free singing",m(0.12));await w()}
    a=await idb.all("clips");
    const f=a.filter(c=>c.first),ff=f.find(c=>c.label==="Free singing");
    return {r1,firsts:f.length,norm:a.filter(c=>!c.first).length,freeKept:!!ff&&Math.abs(ff.pcm[0]-0.11)<1e-4,labels:f.map(c=>c.label).sort().join(', ')};
  });
  ok('first take of a label is stored once',pr.r1.first===2&&pr.r1.ff===1&&pr.r1.pf.length===1&&pr.r1.pf[0]===0.2,JSON.stringify(pr.r1));
  ok('normal clips pruned to 20, first clips kept',pr.r1.norm===20);
  ok('at most 12 first clips; the original free singing take is still the first',pr.firsts===12&&pr.freeKept&&pr.norm<=20,`firsts ${pr.firsts}, normal ${pr.norm}`);

  // ---- 3. then and now on the progress page
  const now=Date.now();
  await p.evaluate(async n=>{
    await idb.clear("clips");const m=(v,len)=>new Float32Array(len).fill(v),put=(label,t,len,first)=>idb.put("clips",{t,label,pcm:m(0.3,len),sr:8000,...(first?{first:true}:{})});
    const d=864e5;
    await put("Free singing",n-20*d,8000,true);await put("Free singing",n-20*d,8000);await put("Free singing",n,16000);
    await put("Recent",n-2*d,8000,true);await put("Recent",n,8000);
    await put("<b>Odd</b>",n-30*d,8000,true);await put("<b>Odd</b>",n-1*d,12000);
    await put("Single",n-40*d,8000,true);
  },now);
  await p.evaluate(()=>{showView(null);document.getElementById('progBtn').click()});await p.waitForTimeout(400);
  const tn=await p.evaluate(()=>({shown:!document.getElementById('thenNow').hidden,head:document.querySelector('#thenNow h2').textContent,
    rows:[...document.querySelectorAll('#thenNowList .tn')].map(r=>({l:r.querySelector('b').textContent,b:[...r.querySelectorAll('button')].map(x=>x.textContent)})),
    saved:document.querySelectorAll('#clips button').length,sideways:document.scrollingElement.scrollWidth>innerWidth}));
  ok('"Then and now" shown with labels at least 7 days apart only',tn.shown&&tn.head==='Then and now'&&tn.rows.map(r=>r.l).join('|')==='<b>Odd</b>|Free singing',tn.rows.map(r=>r.l).join('|'));
  const fr=tn.rows.find(r=>r.l==='Free singing').b;
  ok('three buttons with dates',JSON.stringify(fr)===JSON.stringify([`▶ First (${mmdd(now-20*864e5)})`,`▶ Latest (${mmdd(now)})`,'▶ Both']),fr.join(' / '));
  ok('Saved takes list hides first clips',tn.saved===4,String(tn.saved));
  ok('then-and-now fits the phone width',!tn.sideways);
  await p.evaluate(()=>{window.__pb=[];const o=playBuf;playBuf=(t,w,r)=>{const d=o(t,w,r);window.__pb.push({len:t.pcm.length,when:w,dur:d});return d}});
  const btns=await p.$$('#thenNowList .tn:nth-child(2) button');
  await btns[2].click();await p.waitForTimeout(300);
  const pb=await p.evaluate(()=>window.__pb);
  ok('Both: first, 0.7 s gap, then latest',pb.length===2&&pb[0].len===8000&&pb[1].len===16000&&Math.abs(pb[1].when-pb[0].when-pb[0].dur-0.7)<1e-6,JSON.stringify(pb));
  await btns[0].click();await btns[1].click();await p.waitForTimeout(200);
  const pb2=await p.evaluate(()=>window.__pb.map(x=>x.len));
  ok('First and Latest play one clip each',JSON.stringify(pb2)===JSON.stringify([8000,16000,8000,16000]),pb2.join(','));
  await p.screenshot({path:__dirname+'/out/thennow.png',fullPage:true});
  // backup keeps first clips
  const bk=await p.evaluate(async()=>{const bu=await makeBackup(true);await idb.clear("clips");await restoreBackup(bu);const a=await idb.all("clips");return {n:bu.clips.length,first:a.filter(c=>c.first).length,all:a.length}});
  ok('backup and restore keep the first flag',bk.n===8&&bk.first===4&&bk.all===8,JSON.stringify(bk));

  // ---- 4. free singing in a session: first week against today
  await p.evaluate(async n=>{
    await ensureCtx();window.__pb=[];
    listen=async()=>{S.lastTake={pcm:new Float32Array(48000*8).fill(0.1),sr:48000,t0:0};S.misses=0;return []};
    freeAnalysis=()=>({spread:20});freeText=()=>"Free text.";
    await idb.clear("clips");const d=864e5;
    await idb.put("clips",{t:n-15*d,label:"Free singing",pcm:new Float32Array(48000*3).fill(0.2),sr:48000,first:true});
    delete D.thenNow;S.round=1;window.__say.length=0;
  },now);
  const run=async()=>{await p.evaluate(async()=>{window.__say.length=0;window.__pb=[];await freeSing()});return p.evaluate(()=>({say:window.__say.slice(),pb:window.__pb.map(x=>x.len),tn:D.thenNow}))};
  const MSG="Here's your free singing from your first week, and then today's.";
  let r=await run();
  ok('first week against today, first clip then today\'s',r.say.includes(MSG)&&r.pb.length===2&&r.pb[0]===48000*3&&r.pb[1]===48000*5&&r.tn===sOf(todayN),JSON.stringify(r));
  r=await run();
  ok('not again the same day (plain playback instead)',!r.say.includes(MSG)&&r.say.includes("Here are a few seconds of it."),JSON.stringify(r.say));
  await p.evaluate(()=>{D.thenNow=dayS(dayN(today())-14)});
  r=await run();
  ok('again after 14 days',r.say.includes(MSG),r.say.join(' / '));
  await p.evaluate(async()=>{await idb.clear("clips");await idb.put("clips",{t:Date.now()-5*864e5,label:"Free singing",pcm:new Float32Array(48000).fill(0.2),sr:48000,first:true});delete D.thenNow});
  r=await run();
  ok('not when the first clip is under 14 days old',!r.say.includes(MSG)&&r.tn===undefined,JSON.stringify(r.say));

  // ---- 5. spoken summary line
  const sm=async(goal,days)=>p.evaluate(async([goal,days])=>{store.set("goal",goal);store.set("days",days);window.__say.length=0;S.scores=[10,12,9,11];S.round=1;S.nasScores=[];S.tip={};await summary();return window.__say.join(' ')},[goal,days]);
  const dd=Array.from({length:3},(_,i)=>sOf(monN+i)).filter(s=>nOf(s)<todayN);        // earlier days of this week
  let said=await sm(4,dd);
  let n=Math.min(7,dd.length+1);
  ok('summary on round 1: days this week',said.includes(`That's ${n} of your 4 practice days this week.`),said.slice(-60));
  said=await sm(Math.max(1,n),dd);
  ok('summary on round 1: goal reached',said.includes(`That's your weekly goal of ${Math.max(1,n)} days reached.`),said.slice(-60));
  await p.evaluate(()=>{S.round=2});
  said=await p.evaluate(async()=>{window.__say.length=0;await summary();return window.__say.join(' ')});
  ok('no weekly line after round 1',!/practice days this week|weekly goal/.test(said));
  await b.close();

  // ---- 6. a session: streak line at the start, a day recorded after 3 minutes, none for a short one
  ({b,p}=await launch(10));
  await p.evaluate(()=>store.set("days",[dayS(dayN(today())-1),dayS(dayN(today())-2)]));
  await p.click('#goBtn');await p.waitForTimeout(26000);
  const greet=await p.evaluate(()=>window.__say.filter(x=>x).slice(0,3));
  ok('streak line right after the greeting',/^Hi, I'm your singing coach/.test(greet[0])&&greet[1]==='Day three in a row.',JSON.stringify(greet));
  await p.click('#goBtn');await p.waitForTimeout(1500);
  if(await p.evaluate(()=>S.running)){await p.click('#goBtn');await p.waitForTimeout(1500)} // past the first block the first Stop starts the cool-down; the second stops
  const d1=await p.evaluate(()=>store.get("days",[]));
  ok('session of 3 simulated minutes or more records today',d1.length===3&&d1[2]===sOf(todayN),JSON.stringify(d1));
  ok('sorted and unique',await p.evaluate(()=>{noteDay();noteDay();const d=store.get("days",[]);return d.length===3&&d.join()===[...d].sort().join()}));
  await b.close();
  ({b,p}=await launch(10));
  await p.click('#goBtn');await p.waitForTimeout(6000);
  const first=await p.evaluate(()=>window.__say.filter(x=>x).slice(0,3));
  await p.click('#goBtn');await p.waitForTimeout(1500);
  const d2=await p.evaluate(()=>store.get("days",[]));
  ok('a short session records nothing, and no streak line on day one',d2.length===0&&!first.some(x=>/in a row/.test(x)),JSON.stringify(d2)+' '+JSON.stringify(first.slice(1)));
  await b.close();
  console.log('checks failed:',fails);
  console.log('page errors:',errs);
  process.exitCode=(fails||errs)?1:0;
})();

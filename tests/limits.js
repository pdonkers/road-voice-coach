// Voice protection and weak notes: the daily singing limit (warning, limit line, cool-down, "Finished"), the two-step Stop button,
// the per-note map (D.notes), the Notes chart on the Progress page and practice aimed at weak notes.
// node tests/limits.js [speed]   (speech is stubbed to last about as long as real speech)
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
  await p.goto('http://localhost:8765/index.html');
  // a known range, already found today, so a session goes straight to the blocks
  await p.evaluate(()=>{store.set("profile",{home:55,low:45,high:64});store.set("rangeDate",today())});
  return {b,p};
};
const say=p=>p.evaluate(()=>window.__say.slice());
const idle=(p,ms=300000)=>p.waitForFunction(()=>!S.running,null,{timeout:ms,polling:500}).then(()=>true,()=>false);
const state=p=>p.evaluate(()=>({stage:ui.stage.textContent,msg:ui.say.textContent,btn:ui.go.textContent,run:S.running,stop:S.stop,cool:S.cool,nBlk:S.nBlk,sung:JSON.parse(localStorage.getItem('rvc_sung')||'null'),
  diag:(JSON.parse(localStorage.getItem('rvc_diag')||'[]').slice(-1)[0]||{})}));
const seedSung=(p,s,extra={})=>p.evaluate(([s,x])=>store.set("sung",Object.assign({d:today(),s},x)),[s,extra]);
(async()=>{
  let {b,p}=await launch();

  // ---- 1. setting and the Progress line
  await p.click('#setBtn');
  ok('limit setting: 5 choices, default 30 minutes',await p.evaluate(()=>[$("sungSel").options.length,$("sungSel").value].join('/'))==='5/30');
  await p.selectOption('#sungSel','20');
  ok('limit setting saved as rvc_sungMax',await p.evaluate(()=>localStorage.getItem('rvc_sungMax'))==='20');
  await p.selectOption('#sungSel','30');
  await seedSung(p,720);await p.click('#progBtn');await p.waitForTimeout(300);
  const line=()=>p.evaluate(()=>[...document.querySelectorAll('#charts .hint')].map(h=>h.textContent).find(t=>/^Singing today/.test(t)));
  ok('Progress: singing today with the limit',await line()==='Singing today: 12 of 30 minutes.',await line());
  await p.evaluate(()=>store.set("sungMax",0));await p.click('#progBtn');await p.click('#progBtn');await p.waitForTimeout(200);
  ok('Progress: singing today with the limit off',await line()==='Singing today: 12 minutes.',await line());
  await p.evaluate(()=>{store.set("sungMax",30);store.set("sung",{d:"2000-01-01",s:5000})});await p.click('#progBtn');await p.click('#progBtn');await p.waitForTimeout(200);
  ok('Progress: the total starts again on a new date',await line()==='Singing today: 0 of 30 minutes.',await line());
  await p.click('#homeBtn');

  // ---- 2. a session started at the limit runs no blocks
  await seedSung(p,1800);
  await p.click('#goBtn');
  ok('session at the limit ends by itself',await idle(p,120000));
  let st=await state(p),s=await say(p);
  ok('says the limit line, after the greeting',s.includes("You've reached today's singing limit. Rest your voice and come back tomorrow.")&&/^Hi, I'm your singing coach/.test(s[0]),s.length+' lines');
  ok('runs no block',st.nBlk===0&&!s.some(x=>/^(Warm-up|Cool-down|Nasality|Pitch matching)/.test(x)),'blocks run '+st.nBlk);
  ok('end screen says Finished, button back to Start',st.stage==='Finished'&&st.btn==='Start',st.stage+' / '+st.btn);

  // ---- 3. the limit is reached during an untimed session; the 80 percent warning comes once
  for(const len of [0,20]){
    await p.evaluate(()=>{window.__say.length=0});
    await p.evaluate(l=>store.set("len",l),len);await seedSung(p,1790);   // 10 s left: the warm-up passes it
    await p.click('#goBtn');
    ok(`${len?'timed':'untimed'} session ends at the limit`,await idle(p));
    st=await state(p);s=await say(p);
    const li=s.indexOf("That's enough singing for today. Your voice has done its work.");
    ok(`${len?'timed':'untimed'}: one warning, one limit line`,s.filter(x=>/^About .* of singing left for today\.$/.test(x)).length===1&&s.filter(x=>/^That's enough singing/.test(x)).length===1,s.filter(x=>/singing/.test(x)).join(' | '));
    ok(`${len?'timed':'untimed'}: warning at the first block, limit after the warm-up`,s.findIndex(x=>/^About one minute of singing left/.test(x))<s.findIndex(x=>/^Warm-up\./.test(x))&&li>s.findIndex(x=>/^Warm-up\./.test(x)),'warm-up at '+s.findIndex(x=>/^Warm-up\./.test(x))+', limit at '+li);
    const after=s.slice(li+1);
    ok(`${len?'timed':'untimed'}: only the summary and the cool-down follow`,after.length>=2&&!after.some(x=>/^(Warm-up|Nasality|Clean onsets|Registers|Vowel|Clear tone|Smooth line|Breath|Loose jaw|Sounds with|Pitch matching|Scales|Intervals|Mixed|Song|Free singing)/.test(x)),after.map(x=>x.slice(0,30)).join(' | '));
    ok(`${len?'timed':'untimed'}: ends with the cool-down line`,/^Cool-down\./.test(after[after.length-2]||'')&&after[after.length-1]==="That's the end of today's session. Well done.",after[after.length-1]);
    ok(`${len?'timed':'untimed'}: Finished`,st.stage==='Finished'&&!st.stop,st.stage);
    ok(`${len?'timed':'untimed'}: singing time kept and saved`,st.sung&&st.sung.s>=1800&&st.sung.d===(await p.evaluate(()=>today()))&&st.sung.w===1,JSON.stringify(st.sung));
    ok(`${len?'timed':'untimed'}: diagnostics log closed`,st.diag.min!=null,'min '+st.diag.min);
  }
  await p.evaluate(()=>store.set("len",0));

  // ---- 4. the Stop button: at once in the first block, then cool-down first and stop on the second press
  await p.evaluate(()=>store.set("sungMax",0));          // keep the limit out of it
  // 4a. before the warm-up is over
  await p.evaluate(()=>{window.__say.length=0});
  await p.click('#goBtn');
  await p.waitForFunction(()=>stageName==="Warm-up"&&S.running,null,{timeout:60000,polling:200});
  await p.click('#goBtn');
  ok('first block: one press stops at once',await idle(p,30000));
  st=await state(p);s=await say(p);
  ok('first block: "Stopped", no cool-down',st.stage==='Stopped'&&!s.some(x=>/^Cool-down/.test(x)),st.stage);
  // 4b. cool-down, then a second press
  await p.evaluate(()=>{window.__say.length=0});
  await p.click('#goBtn');
  await p.waitForFunction(()=>S.nBlk>=1&&S.running&&!S.stop,null,{timeout:120000,polling:200});
  await p.click('#goBtn');
  await p.waitForFunction(()=>stageName==="Cool-down"&&window.__say.some(x=>/^Cool-down./.test(x)),null,{timeout:60000,polling:100});
  st=await state(p);s=await say(p);
  ok('past the first block: first press starts the cool-down, no stop',st.run&&!st.stop&&st.cool&&st.stage==='Cool-down',JSON.stringify({run:st.run,stop:st.stop,cool:st.cool,stage:st.stage}));
  ok('button now reads "Stop now"',st.btn==='Stop now',st.btn);
  ok('coach says one line, then the cool-down',s.includes("Okay, let's finish with a cool-down.")&&s.findIndex(x=>/^Cool-down\./.test(x))>s.indexOf("Okay, let's finish with a cool-down."),s.slice(-3).map(x=>x.slice(0,36)).join(' | '));
  await p.click('#goBtn');
  ok('second press stops at once',await idle(p,30000));
  st=await state(p);s=await say(p);
  ok('"Stopped" after the second press, no closing line',st.stage==='Stopped'&&!s.includes("That's it for today. Well done."),st.stage);
  ok('diagnostics closed, button reads Start',st.diag.min!=null&&st.btn==='Start','min '+st.diag.min+' / '+st.btn);
  // 4c. one press, the cool-down runs to its end
  await p.evaluate(()=>{window.__say.length=0});
  await p.click('#goBtn');
  await p.waitForFunction(()=>S.nBlk>=1&&S.running&&!S.stop,null,{timeout:120000,polling:200});
  await p.click('#goBtn');
  ok('one press: the session finishes by itself',await idle(p,60000));
  st=await state(p);s=await say(p);
  ok('"Finished" after the cool-down, with the closing line last',st.stage==='Finished'&&s[s.length-1]==="That's it for today. Well done."&&/^Cool-down\./.test(s[s.length-2]),st.stage+' | '+s[s.length-1]);
  ok('diagnostics closed after the cool-down',st.diag.min!=null,'min '+st.diag.min);
  // 4d. pause, then Stop: the pause is released and the cool-down runs
  await p.evaluate(()=>{window.__say.length=0});
  await p.click('#goBtn');
  await p.waitForFunction(()=>S.nBlk>=1&&S.running&&!S.stop,null,{timeout:120000,polling:200});
  await p.evaluate(()=>doPause(true));await p.waitForTimeout(500);await p.click('#goBtn');
  ok('stop while paused still ends with the cool-down',await idle(p,60000));
  st=await state(p);s=await say(p);
  ok('paused stop: Finished with the closing line',st.stage==='Finished'&&s[s.length-1]==="That's it for today. Well done.",st.stage);
  await b.close();

  // ---- 5. the per-note map, the Notes chart and practice aimed at weak notes
  // real listening needs a slower app clock: the pitch frames of the simulated singer arrive in real time, and at speed 10 they are too far apart to join into notes
  ({b,p}=await launch(3));
  await p.evaluate(()=>store.set("sungMax",0));
  // 5a. the arithmetic: plain mean for four takes, then a running average; a missed note counts 100
  const ar=await p.evaluate(()=>{
    D.notes={};for(const e of [10,20,30,40])noteStat(50,e);const a=D.notes[50].err;
    noteStat(50,100);const b2=D.notes[50].err;
    noteMap({T:[52,54],errs:[null,-25]});
    return {a,n4:4,b2,n5:D.notes[50].n,miss:D.notes[52],neg:D.notes[54]};
  });
  ok('first four takes: plain mean',ar.a===25,String(ar.a));
  ok('fifth take: err*0.85 + e*0.15',Math.abs(ar.b2-(25*0.85+100*0.15))<0.06&&ar.n5===5,ar.b2+' n '+ar.n5);
  ok('a missed note counts 100 cents, an error is taken as its size',ar.miss.err===100&&ar.miss.n===1&&ar.neg.err===25,JSON.stringify([ar.miss,ar.neg]));
  // 5b. real takes against the simulated singer fill the map; technique takes stay out
  const real=await p.evaluate(async()=>{
    D.notes={};D.res={};
    S.running=true;S.stop=false;S.mode="session";await openMic();
    Object.assign(S,{scores:[],biases:[],round:1,misses:0,tip:{},nasScores:[],sessionStart:performance.now(),loudAt:-1e9,repN:0,fbEvery:1,done:0,weakSaid:false});
    await loadBank();await calibrate(800);S.lat=100;
    const pr={home:51,low:46,high:57},sum=()=>Object.values(D.notes).reduce((s,x)=>s+x.n,0);   // the simulated singer holds about D sharp 3
    for(let i=0;i<8&&sum()<3;i++)await block("Pitch matching",()=>pitchMatch(pr,4),{sum:false});
    const n1=sum();
    for(let i=0;i<8&&sum()<=n1;i++)await block("Intervals",()=>intervals(pr,3),{sum:false});
    const n2=sum();
    await rep([55],{dur:1.2,quiet:true,own:false});await rep([55,57,59],{dur:0.6,own:false,noScore:true,kind:"pm"});await rep([55],{dur:1.2,own:false,words:true,noRetry:true});
    const n3=sum();
    closeMic();S.running=false;
    return {n1,n2,n3,keys:Object.keys(D.notes).length,sung:sungS()};
  });
  ok('pitch matching fills D.notes',real.n1>=1&&real.keys>=1,`${real.n1} takes on ${real.keys} notes`);
  ok('intervals add to it',real.n2>real.n1,`${real.n1} -> ${real.n2}`);
  ok('quiet, noScore and words takes are left out',real.n3===real.n2,`${real.n2} -> ${real.n3}`);
  ok('singing time was counted in the session',real.sung>20,real.sung.toFixed(0)+' s');
  // 5c. weak notes: generator, one line per session, levels untouched
  const wk=await p.evaluate(async()=>{
    D.notes={50:{n:6,err:80},52:{n:7,err:70},55:{n:5,err:60},57:{n:9,err:40},58:{n:4,err:200},60:{n:8,err:8}};D.res={};D.lv.pm=3;D.seen.pm=1;window.__say.length=0;
    const pr={home:55,low:45,high:64},seen=new Set();let ok1=true,flag=true;
    for(let i=0;i<60;i++){const g=genPm(pr,true);seen.add(g.t[0]);if(!g.weak||!g.o.noLevel||g.o.kind!=="pm")flag=false;if(![50,52,55].includes(g.t[0]))ok1=false}
    const plain=genPm(pr,false);
    // a block with the real pitchMatch, rep replaced so nothing is sung; Math.random fixed so each target is a weak one
    const log=[],said=[],orig=rep,r0=Math.random;
    rep=async(t,o)=>{log.push({t,o});return {heard:true}};
    S.weakSaid=false;S.round=2;Math.random=()=>0.1;
    const sp=window.speechSynthesis.speak;
    await pitchMatch(pr,6);
    await mixed(pr);
    Math.random=r0;rep=orig;
    // and one in three on average with a plain random
    let w=0;rep=async(t,o)=>{if(o.noLevel)w++;return {heard:true}};
    for(let i=0;i<30;i++)await pitchMatch(pr,6);
    rep=orig;
    // a weak note outside the level's range is not used: level 1 only reaches home-3..home+4
    D.lv.pm=1;D.notes={45:{n:9,err:90}};let out=0;for(let i=0;i<30;i++)if(genPm(pr,true).t[0]===45)out++;
    return {seen:[...seen].sort(),flag,ok1,plainWeak:!!plain.weak,all:log.length,weak:log.filter(x=>x.o.noLevel).length,w,out,
      lines:window.__say.filter(x=>x==="This one is a note you find harder.").length,top:weakIn(45,64).map(x=>x.m)};
  });
  ok('weak targets are the top 3 notes with 5 takes or more (not the 4-take note, not the 8 cent one)',wk.ok1&&wk.seen.join()==='50,52,55',wk.seen.join()+' | top '+wk.top.join());
  ok('weak takes are marked to stay out of the levels',wk.flag&&!wk.plainWeak);
  ok('with random 0.1 every target of pitchMatch and mixed is weak',wk.weak===wk.all&&wk.all>=6+9,`${wk.weak} of ${wk.all}`);
  ok('"This one is a note you find harder." once in the session',wk.lines===1,String(wk.lines));
  ok('about one in three targets is weak (180 pitch-matching targets)',wk.w>=40&&wk.w<=80,String(wk.w));
  ok('a weak note outside the level range is not used',wk.out===0,String(wk.out));
  // 5d. the Notes chart
  await p.evaluate(()=>{D.notes={50:{n:6,err:80},52:{n:7,err:70},55:{n:5,err:60},57:{n:9,err:40},58:{n:4,err:20},60:{n:2,err:30},47:{n:1,err:12}};saveD()});
  await p.click('#progBtn');await p.waitForTimeout(400);
  const ch=await p.evaluate(()=>{const f=[...document.querySelectorAll('#charts figure')].find(x=>/^Notes/.test(x.querySelector('figcaption').textContent));if(!f)return null;
    const bars=[...f.querySelectorAll('rect.nb')],labs=[...f.querySelectorAll('svg text.tick')].map(t=>t.textContent).filter(t=>/^[A-G]#?\d$/.test(t));
    return {bars:bars.length,faint:f.querySelectorAll('rect.nb.f').length,amber:f.querySelectorAll('rect.nb.w').length,labs,hint:f.querySelector('.hint').textContent,
      h:Object.fromEntries(bars.map(r=>[r.querySelector('title').textContent.split(':')[0],+r.getAttribute('height')])),
      side:document.scrollingElement.scrollWidth>innerWidth,w:f.getBoundingClientRect().width}});
  ok('Notes chart is on the Progress page',!!ch);
  ok('one bar for each note with takes, 2 of them faint (fewer than 3 takes), the two weakest amber',ch&&ch.bars===7&&ch.faint===2&&ch.amber===2,ch&&`${ch.bars} bars, ${ch.faint} faint, ${ch.amber} amber`);
  ok('a note name under every other bar of the range (20 semitones: 10 names)',ch&&ch.labs.length===10&&ch.labs[0]==='A2'&&ch.labs[1]==='B2',ch&&ch.labs.join(' '));
  ok('caption names the two weakest notes with 5 takes or more',ch&&ch.hint==='Hardest for you: D3 (80¢) and E3 (70¢).',ch&&ch.hint);
  ok('bar height follows the error',ch&&ch.h['D3']>ch.h['E3']&&ch.h['E3']>ch.h['G3']&&ch.h['G3']>ch.h['A#3'],ch&&JSON.stringify(ch.h));
  ok('the Progress page does not scroll sideways at 412 px',ch&&!ch.side);
  await p.screenshot({path:__dirname+'/out/notes.png',fullPage:true});
  // empty and wide ranges
  await p.evaluate(()=>{D.notes={};store.set("profile",{home:55,low:38,high:70})});await p.click('#progBtn');await p.click('#progBtn');await p.waitForTimeout(300);
  ok('no data: a short message, no chart',await p.evaluate(()=>{const f=[...document.querySelectorAll('#charts figure')].find(x=>/^Notes/.test(x.querySelector('figcaption').textContent));return !!f&&!f.querySelector('svg')&&/No data yet/.test(f.textContent)}));
  await p.evaluate(()=>{D.notes={50:{n:6,err:80},60:{n:6,err:30}};saveD()});await p.click('#progBtn');await p.click('#progBtn');await p.waitForTimeout(300);
  const wide=await p.evaluate(()=>{const f=[...document.querySelectorAll('#charts figure')].find(x=>/^Notes/.test(x.querySelector('figcaption').textContent));
    return {labs:[...f.querySelectorAll('svg text.tick')].map(t=>t.textContent).filter(t=>/^[A-G]#?\d$/.test(t)).length,side:document.scrollingElement.scrollWidth>innerWidth}});
  ok('a 33-semitone range gets a name under every third bar and still fits',wide.labs===11&&!wide.side,JSON.stringify(wide));
  await b.close();

  console.log(fails?`${fails} check(s) FAILED`:'all checks passed');
  console.log('page errors:',errs);
})();

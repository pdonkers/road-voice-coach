// Technique content: the rotating nasality exercises, the "Sounds with a job" block with its half-step climb, the transfer step
// after technique blocks, and the topics setting for lists saved before the new topic existed.
// Real runs use the simulated singer; the climb rules are checked with a scripted rep so the outcome is known.
// node tests/technique.js
const {chromium}=require(process.env.PLAYWRIGHT||'/opt/npm-tools/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+__dirname+'/audio/voice.wav','--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:412,height:900},permissions:['microphone']});
  const p=await ctx.newPage();let errs=0,fails=0;const logs=[];
  p.on('console',m=>{const t=m.text();if(t.startsWith('@'))logs.push(t)});
  p.on('pageerror',e=>{errs++;console.log('PAGEERROR',e.message)});
  await p.addInitScript(()=>{window.__speed=4;
    const ss={speak(u){if(u.text)console.log('@SAY '+u.text);Promise.resolve().then(()=>u.onend&&u.onend())},cancel(){},getVoices(){return[]},onvoiceschanged:null};
    Object.defineProperty(window,'speechSynthesis',{value:ss,configurable:true})});
  await p.goto('http://localhost:8765/index.html');
  const ok=(name,cond,detail="")=>{if(!cond)fails++;console.log((cond?'PASS ':'FAIL ')+name+(detail?'  ('+detail+')':''))};
  // the lines logged between a marker and the next one, split into what was said and which reps ran
  const part=async m=>{await p.waitForTimeout(250);const i=logs.indexOf('@MARK '+m);let j=logs.findIndex((l,k)=>k>i&&l.startsWith('@MARK '));if(j<0)j=logs.length;
    const l=logs.slice(i+1,j);return {say:l.filter(x=>x.startsWith('@SAY ')).map(x=>x.slice(5)),reps:l.filter(x=>x.startsWith('@REP ')).map(x=>x.slice(5).split(',').map(Number))}};
  const has=(say,re)=>say.some(s=>re.test(s));

  await p.evaluate(async()=>{
    S.running=true;S.stop=false;S.mode="session";await openMic();
    Object.assign(S,{scores:[],biases:[],round:1,misses:0,tip:{},nasScores:[],sessionStart:performance.now(),loudAt:-1e9,repN:0,fbEvery:1,done:0});
    await loadBank();await calibrate(800);S.lat=100;
    // log every rep so the targets can be checked
    const r0=rep;window.__rep0=r0;window.rep=async(t,o)=>{console.log('@REP '+t.join(','));return r0(t,o)};
  });

  // ---- cues: the new nasality cues exist once each ----
  const cues=await p.evaluate(()=>({ids:Object.values(TIPS).flat().map(t=>t.id),nasal:TIPS.nasal.map(t=>t.id),job:TIPS.job.map(t=>t.syl)}));
  ok('cue ids are unique',new Set(cues.ids).size===cues.ids.length);
  ok('nasality has the five new cues',['n-hung','n-uhah','n-puff','n-kin','n-yogi'].every(i=>cues.nasal.includes(i)),cues.nasal.length+' cues');
  ok('four job sounds',cues.job.join(',')==='ng,gee,mum,no');

  // ---- nasality: five blocks, transfer off, on, off, on, off; the exercises rotate ----
  const EX=[["sing-ah",/^Sing-ah/],["hung",/^Hung\. Say/],["uh to ah",/^Uh to ah\./],["puffed cheeks",/^Puffed cheeks\./],["gasp",/^Slow-motion gasp\./],["yogi",/^Yogi Bear\./]];
  const seen={};
  for(let i=0;i<5;i++){
    await p.evaluate(i=>{S.tip={};S.nasDone=i>0;D.xf=i%2?1:0;console.log('@MARK nas'+i);return block("Nasality",()=>nasality({home:55,low:45,high:64}),{sum:false})},i);
    const r=await part('nas'+i);let n=0;
    for(const [k,re] of EX)if(has(r.say,re)){seen[k]=(seen[k]||0)+1;n++}
    ok(`nasality ${i}: contrast pair still there`,has(r.say,/as nasal as you can/)&&has(r.say,/^Now (lifted\.|the opposite\.)/));
    ok(`nasality ${i}: ${i?'two':'one'} new exercise${i?'s':''} (first block of a session: one)`,n===(i?2:1),n+' used');
    const x=has(r.say,/^Now take that into a song\./),ph=has(r.say,/^Last one\. Sing these words/);
    ok(`nasality ${i}: transfer ${i%2?'runs':'is skipped'}`,x===!!(i%2),'xferNow gave '+(x?'yes':'no'));
    ok(`nasality ${i}: the phrase step runs only when there is no transfer`,ph===!x);
    if(x){
      const t=r.say.find(s=>/^Now take that into a song\./.test(s));
      ok('transfer says the song, the syllable and the cue',/One line of .+, first on ah, keeping today's cue, .+\.$/.test(t),t);
      ok('transfer sings the line twice, the second time with the words',has(r.say,/^Now the same line with the words\. It starts: /)&&r.reps.length>=2&&JSON.stringify(r.reps[r.reps.length-1])===JSON.stringify(r.reps[r.reps.length-2]));
    }
  }
  ok('all six nasality exercises came up within five blocks',EX.every(([k])=>seen[k]),JSON.stringify(seen));

  // ---- the puffed-cheeks exercise is a feel exercise: no pitch score ----
  const pf=await p.evaluate(async()=>{S.scores=[];const n0=S.scores.length;console.log('@MARK puff');await NASX[3](55,false,()=>{});return {n:S.scores.length-n0}});
  const puff=await part('puff');
  ok('puffed cheeks gives no pitch score',pf.n===0,pf.n+' scores');
  ok('puffed cheeks plays the takes back',has(puff.say,/Listen back\. Puffed, then relaxed\./)||has(puff.say,/nothing to play back/));

  // ---- the transfer step: songs rotate, the key matches song() ----
  const tr=await p.evaluate(()=>{
    const names=new Set(),ph=new Set();let bad=0;
    const P0={home:55,low:45,high:64};store.set('songKnow',Object.fromEntries(SONGS.map(s=>[s.name,'know'])));const all=songList(P0).flatMap(s=>s.ph.map(x=>[s,x]));D.xp=0;
    for(let i=0;i<all.length+2;i++){const [s,x]=all[(D.xp||0)%all.length];names.add(s.name);ph.add(x);D.xp++}
    const old=(s,p)=>{const a=s.ph.flatMap(x=>x.n),mn=Math.min(...a),mx=Math.max(...a);return clamp(Math.round(p.home+2-(mn+mx)/2),p.low+1-mn,Math.max(p.low+1-mn,p.high-1-mx))};
    for(const s of SONGS)for(const pr of [{home:55,low:45,high:64},{home:48,low:40,high:58},{home:60,low:52,high:70}])if(songTon(s,pr)!==old(s,pr))bad++;
    const k=[];D.xf=0;for(let i=0;i<32;i++)k.push(xferNow()?1:0);
    store.set('songKnow',{});return {songs:names.size,phrases:ph.size,total:all.length,nsongs:songList(P0).length,bad,k};
  });
  ok('transfer rotates through every phrase of every song',tr.songs===tr.nsongs&&tr.songs>=10&&tr.phrases===tr.total,tr.songs+' songs, '+tr.phrases+' of '+tr.total+' phrases');
  ok('songTon matches the key song() used before',tr.bad===0);
  ok('about every second block gets a transfer step',tr.k.reduce((a,c)=>a+c,0)>=14&&tr.k.reduce((a,c)=>a+c,0)<=18,tr.k.join(''));

  // ---- sounds with a job: four runs, one sound each, in turn; the pattern changes after the fourth ----
  const jobs=[["ng",/^Ng, like the end of the word sing/],["gee",/^Gee, like the letter G/],["mum",/^Mum, with a slight yawn/],["no",/^A sad, droopy no/]];
    await p.evaluate(()=>{D.sj=0;D.climb=null;for(const t of TIPS.job)delete D.tips[t.id]});
  for(let i=0;i<4;i++){
    await p.evaluate(i=>{S.tip={};D.xf=0;console.log('@MARK job'+i);return block("Sounds with a job",()=>sounds({home:55,low:45,high:64}),{sum:false})},i);
    const r=await part('job'+i);
    const intro=r.say.find(s=>s.startsWith('Sounds with a job.'))||'';
    ok(`job ${i}: says the ${jobs[i][0]} sound and its job`,jobs[i][1].test(intro.replace(/^Sounds with a job\. (Each of these sounds[^]*?yourself\. )?(Today's sound: )?/,''))&&/Its job (is|to)/.test(intro),intro.slice(0,110));
    ok(`job ${i}: plays the model and starts the climb`,has(r.say,/^Now the climb\./)&&r.reps.length>=1);
    const t=r.reps.map(x=>x[0]);
    ok(`job ${i}: each step is one half step higher`,t.every((v,k)=>k===0||v===t[k-1]+1),t.join(' '));
    ok(`job ${i}: starts at p.low+2 and stays below p.high`,t[0]===47&&t.every(v=>v+7<=63),t.join(' '));
    ok(`job ${i}: says "Up a half step." between steps`,r.say.filter(s=>s==='Up a half step.').length===Math.max(0,t.length-1));
    ok(`job ${i}: reports the climb or says why not`,has(r.say,/^You climbed to /)||has(r.say,/no climb to report/),(r.say.find(s=>/climbed|no climb/.test(s))||''));
  }
  const pat=await p.evaluate(()=>({sj:D.sj,tips:TIPS.job.map(t=>D.tips[t.id]&&D.tips[t.id].n)}));
  ok('the four sounds were used once each, in turn',pat.tips.join(',')==='1,1,1,1',pat.tips.join(','));

  // ---- the climb rules with a scripted rep ----
  const climb=await p.evaluate(async()=>{
    const real=window.rep,out={};
    const run=async(label,prof,script,prev)=>{
      const targets=[];let i=0;
      window.rep=async(t,o)=>{targets.push(t);const r=script[Math.min(i++,script.length-1)];return r};
      D.sj=0;S.tip={};D.xf=0;D.climb=prev||null;
      for(const t of TIPS.job)delete D.tips[t.id];
      console.log('@MARK '+label);
      await block("Sounds with a job",()=>sounds(prof),{sum:false});
      out[label]={steps:targets.length,first:targets[0][0],lastTop:Math.max(...targets[targets.length-1]),climb:D.climb,hi:prof.high};
    };
    const C={heard:true,success:true,avg:10},M={heard:true,success:false,avg:75},H={heard:true,success:false,avg:50},U={heard:false,success:false,avg:0};
    const P={home:55,low:45,high:64};
    await run('all clean',P,[C]);
    await run('two misses in a row',P,[C,C,C,M,M,C]);
    await run('miss, clean, miss goes on',P,[C,M,C,M,C,C,C,C]);
    await run('not heard twice',P,[C,C,U,U]);
    await run('fair takes are not misses',P,[C,H,H,H,H,H,H,H]);
    await run('narrow range',{home:50,low:48,high:60},[C]);
    await run('tiny range',{home:53,low:50,high:56},[C]);
    await run('nothing clean',P,[M,M],{last:57,best:60});
    await run('higher than last time',P,[C,C,C,M,M],{last:50,best:60});
    await run('same as last time',P,[C,C,C,M,M],{last:56,best:60});
    await run('lower than last time',P,[C,C,C,M,M],{last:60,best:62});
    await run('new best',P,[C,C,C,C,C,M,M],{last:50,best:55});
    window.rep=real;
    return out;
  });
  for(const k of Object.keys(climb)){const r=await part(k);climb[k].say=r.say}
  const c=climb;
  ok('climb: all clean goes 8 steps from p.low+2 and ends',c['all clean'].steps===8&&c['all clean'].first===47&&has(c['all clean'].say,/as high as I'll take you/)&&c['all clean'].climb.last===61,JSON.stringify(c['all clean'].climb));
  ok('climb: stops after two bad misses in a row',c['two misses in a row'].steps===5&&has(c['two misses in a row'].say,/top for today/)&&c['two misses in a row'].climb.last===47+2+7,JSON.stringify(c['two misses in a row'].climb));
  ok('climb: a single miss does not stop it',c['miss, clean, miss goes on'].steps===8&&c['miss, clean, miss goes on'].climb.last===47+7+7);
  ok('climb: two takes that were not heard stop it',c['not heard twice'].steps===4&&c['not heard twice'].climb.last===47+1+7);
  ok('climb: fair takes (under 60 cents) go on to the end',c['fair takes are not misses'].steps===8&&!has(c['fair takes are not misses'].say,/top for today/));
  ok('climb: narrow range keeps the top of the pattern below p.high',c['narrow range'].lastTop<=59&&c['narrow range'].steps===4,JSON.stringify(c['narrow range']));
  ok('climb: a tiny range still does at least two steps without error',c['tiny range'].steps===2);
  ok('climb: nothing clean says so and keeps last time',has(c['nothing clean'].say,/no climb to report/)&&c['nothing clean'].climb.last===57&&c['nothing clean'].climb.best===60);
  ok('climb: progress, higher',has(c['higher than last time'].say,/You climbed to .* today\. That's (one|two|three|four|five|six|seven|eight|nine|ten|\d+) half steps? higher than last time\./),c['higher than last time'].say.find(s=>/climbed/.test(s)));
  ok('climb: progress, the same',has(c['same as last time'].say,/The same as last time\./));
  ok('climb: progress, lower',has(c['lower than last time'].say,/Last time you reached .*It varies/));
  ok('climb: new best is announced and remembered',has(c['new best'].say,/A new best\./)&&c['new best'].climb.best===c['new best'].climb.last&&c['new best'].climb.last>55,JSON.stringify(c['new best'].climb));

  // ---- the transfer step is part of the block: other topics too, and it adds to the learned time ----
  const tm=await p.evaluate(async()=>{
    D.bmin={};D.xf=1;S.tip={};console.log('@MARK tx');await block("Smooth line",()=>legato({home:55,low:45,high:64}),{sum:false});
    return {t:D.bmin["Smooth line"],cue:S.tip.legato.name};
  });
  const tx=await part('tx');
  ok('smooth line ends with a transfer step that names its cue',has(tx.say,new RegExp("^Now take that into a song\. One line of .+, first on ah, keeping today's cue, "+tm.cue+"\.$")),tm.cue);
  ok('a block with a transfer step still records its own time',tm.t>0,String(tm.t));

  // ---- topics setting: saved lists from before the new topic ----
  const tp=await p.evaluate(()=>{
    const has=()=>techRotation().some(t=>t[0]==="sounds"),o={};
    store.set("nasal","normal");
    store.set("topics",null);store.set("topicsOf",null);o.def=has();
    store.set("topics",["onset","vowels"]);localStorage.removeItem("rvc_topicsOf");o.oldList=has();
    store.set("topicsOf",TECH.slice(1).map(t=>t[0]));o.newListWithout=has();
    store.set("topics",["onset","sounds"]);o.newListWith=has();
    localStorage.removeItem("rvc_topicsOf");store.set("topics",["onset","vowels"]);
    return o;
  });
  ok('default (all topics) includes the new topic',tp.def);
  ok('a list saved before the new topic includes it',tp.oldList);
  ok('a list saved after it, without it, leaves it out',!tp.newListWithout);
  ok('a list saved after it, with it, keeps it',tp.newListWith);
  await p.evaluate(()=>{closeMic();S.running=false});
  await p.reload();  // the checkboxes are built once at load
  await p.click('#setBtn');
  const box=await p.evaluate(()=>[...document.querySelectorAll('#topicBox input')].map(x=>x.value+':'+x.checked).join(' '));
  ok('settings: an old saved list shows the new topic ticked',/sounds:true/.test(box)&&/vowels:true/.test(box)&&/breath:false/.test(box),box);
  await p.locator('#topicBox input[value=sounds]').uncheck();
  const st=await p.evaluate(()=>({t:store.get("topics",null),of:store.get("topicsOf",null),on:techRotation().some(t=>t[0]==="sounds")}));
  ok('unticking it is remembered, and the list records which topics it knew',st.t&&!st.t.includes('sounds')&&st.of&&st.of.includes('sounds')&&!st.on,JSON.stringify(st));
  ok('the settings page lists the new topic',(await p.locator('#topicBox input').count())===8);
  await p.screenshot({path:__dirname+'/out/technique.png',fullPage:true});

  console.log('failed checks:',fails);
  console.log('page errors:',errs);
  await b.close();
})();

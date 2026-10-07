// Ear training by voice: the three exercises (higher or lower, the missing note, interval by ear), their levels, the sung answer judged
// within 70 cents with octaves forgiven, the one-line verdicts and the retry, the "explained once" lines, the place in the practice rotation,
// and that these takes stay out of the cents-off score and the weak-note map.
// node tests/ear.js [speed]   (speech is stubbed to last about as long as real speech; the first blocks use the simulated microphone)
const {chromium}=require(process.env.PLAYWRIGHT||'/opt/npm-tools/node_modules/playwright');
const SPEED=+(process.argv[2]||10);
let fails=0,errs=0;
const ok=(name,cond,detail)=>{if(!cond)fails++;console.log((cond?'PASS ':'FAIL ')+name+(detail!==undefined?' | '+detail:''))};
(async()=>{
  const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+__dirname+'/audio/voice.wav','--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:412,height:900},permissions:['microphone']});
  const p=await ctx.newPage();p.on('pageerror',e=>{errs++;console.log('PAGEERROR',e.message)});
  await p.addInitScript(sp=>{window.__speed=sp;window.__say=[];
    const ss={speak(u){if(u.text)window.__say.push(u.text);setTimeout(()=>u.onend&&u.onend(),(300+(u.text||"").length*70)/sp)},cancel(){},getVoices(){return[]},onvoiceschanged:null};
    Object.defineProperty(window,'speechSynthesis',{value:ss,configurable:true})},SPEED);
  await p.goto('http://localhost:'+(process.env.PORT||8765)+'/index.html');
  await p.evaluate(()=>{store.set("profile",{home:55,low:45,high:64});store.set("rangeDate",today())});

  // ---- 1. the generators: what is played, what the answer is, and how the levels differ
  const gen=await p.evaluate(pr=>{
    const out={},sets=(name,f)=>{out[name]=f};
    const prs={wide:pr,narrow:{home:55,low:50,high:59}};
    for(const [pn,pf] of Object.entries(prs)){
      const {lo,hi}=band(pf);
      for(let L=1;L<=3;L++){
        D.lv.eh=D.lv.em=D.lv.ei=L;
        const eh=[],em=[],ei=[];
        for(let i=0;i<400;i++){eh.push(genEh(pf));em.push(genEm(pf));ei.push(genEi(pf))}
        const gaps=eh.map(g=>Math.abs(g.ns[0]-g.ns[1])),hiOk=eh.every(g=>g.ans===Math.max(...g.ns)&&g.other===Math.min(...g.ns)&&Math.min(...g.ns)>=lo&&Math.max(...g.ns)<=hi);
        const first=eh.filter(g=>g.ns[0]>g.ns[1]).length;
        const dif=g=>g.ns.slice(1).map((x,i)=>x-g.ns[i]);
        const mj=[2,2,1],asc=em.filter(g=>g.ns[3]>g.ns[0]);
        const emOk=em.every(g=>g.ns.length===4&&(g.k===1||g.k===2)&&g.ans===g.ns[g.k]&&Math.min(...g.ns)>=lo&&Math.max(...g.ns)<=hi);
        // every four-note group is four neighbouring degrees of a major scale (the steps are one of the windows of MAJ)
        const win=new Set([0,1,2,3].map(d=>JSON.stringify([1,2,3].map(i=>MAJ[d+i]-MAJ[d+i-1]))));
        const degOk=em.every(g=>win.has(JSON.stringify(g.ns[3]>g.ns[0]?dif(g):dif(g).map(x=>-x).reverse())));
        const ks=[...new Set(ei.map(g=>g.k))].sort((a,b)=>a-b),eiOk=ei.every(g=>g.ans===g.other+g.k&&g.other>=lo&&g.ans<=pf.high&&g.strict===(g.k===12));
        out[`${pn} L${L}`]={gapMin:Math.min(...gaps),gapMax:Math.max(...gaps),hiOk,orderMix:first>100&&first<300,emOk,degOk,emKs:[...new Set(em.map(g=>g.k))].sort().join(''),desc:em.filter(g=>g.ns[3]<g.ns[0]).length,
          startsOnDo:em.filter(g=>g.ns[1]-g.ns[0]===2&&g.ns[2]-g.ns[1]===2&&g.ns[3]-g.ns[2]===1).length,eiKs:ks.join(','),eiOk};
      }
    }
    D.lv.eh=D.lv.em=D.lv.ei=1;
    return out;
  },{home:55,low:45,high:64});
  for(let L=1;L<=3;L++){
    const g=gen['wide L'+L],want=[[4,7],[2,4],[1,2]][L-1];
    ok(`higher or lower, level ${L}: the answer is the higher note, the gap is ${want[0]} to ${want[1]} semitones, either order, inside the band`,g.hiOk&&g.gapMin===want[0]&&g.gapMax===want[1]&&g.orderMix,JSON.stringify([g.gapMin,g.gapMax,g.hiOk,g.orderMix]));
  }
  ok('missing note, level 1: always up, do re _ fa (steps 2 2 1), the gap is the third note',gen['wide L1'].emOk&&gen['wide L1'].emKs==='2'&&gen['wide L1'].desc===0&&gen['wide L1'].startsOnDo===400,JSON.stringify(gen['wide L1']));
  ok('missing note, level 2: the gap is the second or third note, starting on other scale degrees, still only upwards',gen['wide L2'].emOk&&gen['wide L2'].emKs==='12'&&gen['wide L2'].desc===0&&gen['wide L2'].startsOnDo<400&&gen['wide L2'].degOk,JSON.stringify(gen['wide L2']));
  ok('missing note, level 3: also downwards',gen['wide L3'].emOk&&gen['wide L3'].desc>100&&gen['wide L3'].degOk,'downwards '+gen['wide L3'].desc+' of 400');
  ok('interval by ear: fifths and octaves, then a fourth, then thirds',gen['wide L1'].eiKs==='7,12'&&gen['wide L2'].eiKs==='5,7,12'&&gen['wide L3'].eiKs==='3,4,5,7,12'&&['wide L1','wide L2','wide L3'].every(k=>gen[k].eiOk),[1,2,3].map(L=>gen['wide L'+L].eiKs).join(' | '));
  ok('on a narrow range (50 to 59) nothing falls outside it; the octave is left out when it does not fit',['narrow L1','narrow L2','narrow L3'].every(k=>gen[k].hiOk&&gen[k].emOk&&gen[k].eiOk)&&!gen['narrow L3'].eiKs.includes('12'),['narrow L1','narrow L2','narrow L3'].map(k=>gen[k].eiKs).join(' | '));

  // ---- 2. the verdicts, the retry and the levels, with the singer's answers scripted (listen and play are replaced; speech is the stub)
  await p.evaluate(async()=>{
    S.running=true;S.stop=false;S.mode="session";await openMic();await ensureCtx();
    window.__sung=[];window.__plays=[];window.__waited=0;window.__listens=0;window.__models=0;
    const frames=m=>{const f=[];for(let i=0;i<40;i++)f.push({t:i*40,m:m==null?null:m+(i%3-1)*0.05,r:0.05});return f};
    listen=async()=>{window.__listens++;await sleep(5);const m=window.__sung.shift();S.lastTake=null;return frames(m)};
    const pl=play;play=async(ms,...a)=>{window.__plays.push(ms.slice())};
    waitForSinger=async()=>{window.__waited++;S.misses=0};
    window.__item=(ans,o={})=>({ans,other:o.other,said:"That was the lower one.",reveal:"The higher one is this.",strict:o.strict,model:async()=>{window.__models++}});
    window.__reset=()=>{window.__say.length=0;window.__plays.length=0;window.__models=0;window.__listens=0;D.res={};D.lv.eh=1;S.misses=0};
  });
  const run=async(ans,sung,o={},kind="eh")=>{
    await p.evaluate(([s,k])=>{window.__reset();window.__sung=s.slice()},[sung,kind]);
    const r=await p.evaluate(([ans,o,k])=>earRep(k,window.__item(ans,o)).then(r=>({r,say:window.__say.slice(),plays:window.__plays.slice(),models:window.__models,listens:window.__listens,res:(D.res[k]||[]).slice(),lv:D.lv[k]})),[ans,o,kind]);
    return r;
  };
  let r=await run(60,[60]);
  ok('a right answer: one short line, no retry, counts for the level',/^(Right|Yes|Correct)\.$/.test(r.say.join('|'))&&r.r&&r.r.ok&&r.res+''==='1'&&r.plays.length===0&&r.listens===1,JSON.stringify([r.say,r.res]));
  r=await run(60,[55,60],{other:55});
  ok('wrong, then right: says what it was, plays the right note, tries again, "That\'s it."',r.say.join('|')==="Not quite. That was the lower one. The higher one is this.|That's it."&&r.plays.length===1&&r.plays[0][0]===60&&r.listens===2,JSON.stringify(r.say)+' plays '+JSON.stringify(r.plays));
  ok('...and the first answer is what counts for the level (a miss)',r.r&&!r.r.ok&&r.res+''==='0');
  r=await run(60,[58,58],{other:55});
  ok('wrong twice (a note that is neither): "Not quite" without naming the other note, then "Not this time. Next one."',r.say.join('|')==="Not quite. The higher one is this.|Not this time. Next one."&&r.plays.length===1&&r.listens===2,JSON.stringify(r.say));
  r=await run(60,[null,60]);
  ok('nothing heard: "Once more", the model plays again, no reveal, counts as the first answer',r.say.join('|').startsWith("I didn't catch that. Once more.")&&r.models===2&&r.plays.length===0&&r.r&&r.r.ok&&r.res+''==='1',JSON.stringify(r.say)+' models '+r.models);
  r=await run(60,[null,null]);
  ok('nothing heard twice: "I didn\'t hear that one.", no result, no level change',r.say.join('|')==="I didn't catch that. Once more.|I didn't hear that one."&&r.r===null&&r.res.length===0,JSON.stringify(r.say));
  r=await run(60,[72]);ok('an octave above the answer counts as right (octaves forgiven)',r.r&&r.r.ok);
  r=await run(60,[48.2]);ok('and two octaves below',r.r&&r.r.ok);
  r=await run(60,[60.65]);ok('65 cents sharp is still right',r.r&&r.r.ok);
  r=await run(60,[60.8,60.8]);ok('80 cents sharp is wrong',r.r&&!r.r.ok);
  r=await run(60,[59.4]);ok('60 cents flat is right',r.r&&r.r.ok);r=await run(60,[59.2,59.2]);ok('and 80 cents flat is wrong',r.r&&!r.r.ok);
  r=await run(72,[60,72],{other:60,strict:true});
  ok('an octave above, judged strictly: the starting note is wrong, then the octave is right',r.r&&!r.r.ok&&r.say[r.say.length-1]==="That's it."&&r.plays[0][0]===72,JSON.stringify(r.say));
  r=await run(72,[84],{other:60,strict:true});ok('...and a second octave up is wrong too (no folding)',r.r&&!r.r.ok);
  r=await run(72,[72.2],{other:60,strict:true});ok('...but the right note is right',r.r&&r.r.ok);
  await p.evaluate(()=>{window.__reset();window.__sung=[60,60];S.misses=3;});
  r=await p.evaluate(()=>earRep("eh",window.__item(60)).then(r=>({r,waited:window.__waited,models:window.__models,say:window.__say.slice()})));
  ok('three misses in a row: the coach waits for the singer, then asks the item again',r.waited===1&&r.models===2&&r.r&&r.r.ok,JSON.stringify(r));

  // levels: 6 right answers step up, then wrong ones step down
  await p.evaluate(()=>{window.__reset();window.__sung=[60,60,60,60,60,60]});
  r=await p.evaluate(async()=>{for(let i=0;i<6;i++)await earRep("eh",window.__item(60));return {lv:D.lv.eh,res:D.res.eh,say:window.__say.filter(x=>/level|easier/.test(x))}});
  ok('six right answers: "Stepping up a level." and the level goes from 1 to 2',r.lv===2&&r.say.join('|')==="Stepping up a level."&&r.res.length===0,JSON.stringify(r));
  await p.evaluate(()=>{window.__say.length=0;window.__sung=[55,55,55,55,55,55,55,55,55,55,55,55]});
  r=await p.evaluate(async()=>{for(let i=0;i<6;i++)await earRep("eh",window.__item(60,{other:55}));return {lv:D.lv.eh,say:window.__say.filter(x=>/level|easier/.test(x))}});
  ok('six wrong answers: "I\'ll make this one a bit easier." and back to level 1',r.lv===1&&r.say.join('|')==="I'll make this one a bit easier.",JSON.stringify(r));
  await p.evaluate(()=>{window.__reset();D.lv.em=3;D.res.em=[1,1,1,1,1];window.__sung=[60]});
  r=await p.evaluate(async()=>{await earRep("em",window.__item(60));return D.lv.em});
  ok('the level never goes past 3',r===3,String(r));

  // ---- 3. the whole block, with the real (simulated) microphone: what is said, how many items, what stays untouched
  await b.close();
  await part3();
  async function part3(){
    const b2=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+__dirname+'/audio/voice.wav','--autoplay-policy=no-user-gesture-required']});
    const c2=await b2.newContext({viewport:{width:412,height:900},permissions:['microphone']});
    const q=await c2.newPage();q.on('pageerror',e=>{errs++;console.log('PAGEERROR',e.message)});
    await q.addInitScript(sp=>{window.__speed=sp;window.__say=[];
      const ss={speak(u){if(u.text)window.__say.push(u.text);setTimeout(()=>u.onend&&u.onend(),(300+(u.text||"").length*70)/sp)},cancel(){},getVoices(){return[]},onvoiceschanged:null};
      Object.defineProperty(window,'speechSynthesis',{value:ss,configurable:true})},SPEED);
    await q.goto('http://localhost:'+(process.env.PORT||8765)+'/index.html');
    await q.evaluate(()=>{store.set("profile",{home:55,low:45,high:64});store.set("rangeDate",today())});
    const blk=async(L,seen)=>q.evaluate(async([L,seen])=>{
      if(!S.running){S.running=true;S.stop=false;S.mode="session";await openMic();await loadBank();await calibrate(800);S.lat=100}
      D.lv.eh=D.lv.em=D.lv.ei=L;D.seen=seen?{eh:1,em:1,ei:1,ear:1}:{};D.res={};D.notes={};S.scores=[];window.__say.length=0;
      const cnt={eh:0,em:0,ei:0},g0=[genEh,genEm,genEi],plays=[];
      genEh=p=>{cnt.eh++;return g0[0](p)};genEm=p=>{cnt.em++;return g0[1](p)};genEi=p=>{cnt.ei++;return g0[2](p)};
      const lst=listen;let heard=0;listen=async(...a)=>{heard++;return lst(...a)};
      const pl=play;play=async(ms,...a)=>{plays.push(ms.length);return pl(ms,...a)};
      const t0=performance.now(),stage=[];
      // a block runs two of the three exercises in rotation (D.earK), so two blocks cover all three
      try{for(const k of [0,2]){D.earK=k;await block("Ear training",()=>earTrain({home:55,low:45,high:64}),{sum:false})}}catch(e){window.__err=String(e&&e.stack||e)}
      genEh=g0[0];genEm=g0[1];genEi=g0[2];listen=lst;play=pl;
      return {cnt,heard,say:window.__say.slice(),notes:Object.keys(D.notes).length,scores:S.scores.length,seen:{...D.seen},err:window.__err||null,blk:S.blk,nBlk:S.nBlk,plays:plays.length,ms:Math.round(performance.now()-t0)};
    },[L,seen]);
    let verd=0;
    for(const L of [1,2,3]){
      const r=await blk(L,false),n=L===3?5:4;verd+=r.say.filter(x=>/^(Right|Yes|Correct)\.$|^Not quite\./.test(x)).length;
      ok(`level ${L}, first time: ${n} items of each of the three exercises, no error`,r.cnt.eh>=n&&r.cnt.em>=n&&r.cnt.ei>=n&&!r.err,JSON.stringify([r.cnt,r.err]));
      ok(`level ${L}: the first-time explanations are spoken`,r.say.includes("Ear training. I play notes, and you answer by singing, never by speaking.")&&r.say.some(x=>/^Higher or lower\. I play two notes\. Sing back the higher one\.$/.test(x))&&r.say.some(x=>/^Missing note\. I play three notes of a scale, with a gap in the middle, like do, re, fa\./.test(x))&&r.say.some(x=>/^Interval by ear\. I play one note and name an interval\./.test(x)),r.say.slice(0,3).join(' | '));
      ok(`level ${L}: nothing entered the weak-note map or the cents-off score`,r.notes===0&&r.scores===0,'D.notes keys '+r.notes+', scores '+r.scores);
      ok(`level ${L}: the block ran to the end and the coach listened for every item`,r.nBlk>=1&&r.heard>=3*n,r.heard+' listens, '+r.ms+' ms');
      if(L===1){
        const ei=r.say.filter(x=>/^Sing the note (a|an) .* above\.$/.test(x));
        ok('interval items name the interval the first time: "Sing the note a fifth above."',ei.length>=3&&ei.every(x=>/(fifth|octave)/.test(x)),ei.slice(0,3).join(' | '));
      }
    }
    const r2=await blk(1,true);
    ok('later blocks: only the short lines "Higher one." "Missing note." "Interval by ear."',r2.say.includes("Ear training. Sing your answers.")&&r2.say.includes("Higher one.")&&r2.say.includes("Missing note.")&&r2.say.includes("Interval by ear.")&&!r2.say.some(x=>/I play (two|three|one) note/.test(x)),r2.say.slice(0,4).join(' | '));
    ok('...and the interval prompt is just "A fifth above."',r2.say.some(x=>/^(A fifth|An octave) above\.$/.test(x))&&!r2.say.some(x=>/^Sing the note/.test(x)),r2.say.filter(x=>/above\./.test(x)).slice(0,3).join(' | '));
    verd+=r2.say.filter(x=>/^(Right|Yes|Correct)\.$|^Not quite\./.test(x)).length;
    ok('the simulated singer was heard and answered: verdict lines were spoken in the real-microphone runs',verd>=1,verd+' verdict lines in four blocks');
    await q.evaluate(()=>{closeMic();S.running=false});

    // ---- 4. the rotation: swell, clean starts, ear training
    const rot=await q.evaluate(async()=>{
      const names=[];swell=async()=>{names.push("swell")};starts=async()=>{names.push("starts")};earTrain=async()=>{names.push("ear")};
      D.sk=0;for(let i=0;i<7;i++)await skills({});return {names:names.join(','),sk:D.sk};
    });
    ok('skills rotate swell, starts, ear training, swell, ...',rot.names==="swell,starts,ear,swell,starts,ear,swell"&&rot.sk===7,rot.names);
    await b2.close();
  }
  await part5();
  async function part5(){
    // ---- 5. in a timed session the ear training block is planned and named "Ear training"; the stage shows it
    const b3=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+__dirname+'/audio/voice.wav','--autoplay-policy=no-user-gesture-required']});
    const c3=await b3.newContext({viewport:{width:412,height:900},permissions:['microphone']});
    const q=await c3.newPage();q.on('pageerror',e=>{errs++;console.log('PAGEERROR',e.message)});
    await q.addInitScript(sp=>{window.__speed=sp;window.__say=[];
      const ss={speak(u){if(u.text)window.__say.push(u.text);setTimeout(()=>u.onend&&u.onend(),(300+(u.text||"").length*70)/sp)},cancel(){},getVoices(){return[]},onvoiceschanged:null};
      Object.defineProperty(window,'speechSynthesis',{value:ss,configurable:true})},SPEED);
    await q.goto('http://localhost:'+(process.env.PORT||8765)+'/index.html');
    await q.evaluate(()=>{store.set("profile",{home:55,low:45,high:64});store.set("rangeDate",today());store.set("len",20);store.set("focus","none");store.set("sungMax",0);
      D.sk=2;D.rotP=1;saveD();earTrain=async()=>{window.__ear={stage:ui.stage.textContent,sk:D.sk};await sleep(500)}});
    await q.click('#goBtn');
    const done=await q.waitForFunction(()=>window.__ear,null,{timeout:240000,polling:500}).then(()=>true,()=>false);
    const info=await q.evaluate(()=>{const l=JSON.parse(localStorage.getItem('rvc_diag')||'[]'),s=l[l.length-1]||{ev:[]};return {ear:window.__ear,plan:s.ev.map(e=>e[1]).filter(e=>/round 1 plan/.test(e))[0],est:estMin("Ear training")}});
    ok('timed session: the practice slot ran ear training, the stage read "Ear training"',done&&info.ear&&info.ear.stage==='Ear training'&&info.ear.sk===3,JSON.stringify(info.ear));
    ok('...and the round plan listed it under that name',/Ear training/.test(info.plan||''),info.plan);
    await q.click('#goBtn');await q.waitForTimeout(300);await q.click('#goBtn').catch(()=>{});
    await q.waitForFunction(()=>!S.running,null,{timeout:60000,polling:500}).catch(()=>{});
    await b3.close();
  }
  console.log(`\n${fails?fails+' FAILED':'all passed'} | page errors: ${errs}`);
  process.exitCode=(fails||errs)?1:0;
})();

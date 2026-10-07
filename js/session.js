"use strict";
/* ---------- listening diagnostics ---------- */
/* One entry per take and per phone event, kept on the phone for the last 8 sessions, so a listening problem on the road can be found from data. */
const dB=x=>x>0?Math.round(20*Math.log10(x)):-99;
let DL=null,DLS=null;
const diagAll=()=>DLS||(DLS=store.get("diag",[]));
const diagT=()=>DL?Math.round((Date.now()-DL.at)/1000):0;
function diagSave(){
  if(!DL)return;const all=diagAll();if(!all.includes(DL))all.push(DL);
  while(all.length>8)all.shift();store.set("diag",all);
}
function diagBegin(){
  const tr=S.stream&&S.stream.getAudioTracks()[0];
  DL={at:Date.now(),ver:$("ver").textContent.replace("Version ",""),mic:tr&&tr.label||"",ns:store.get("ns","0")==="1",sr:S.ctx?S.ctx.sampleRate:0,takes:[],ev:[]};
  diagSave();
}
function diagEnd(){
  if(!DL)return;
  Object.assign(DL,{min:Math.round((Date.now()-DL.at)/60000),mute:Math.round(S.diag.zero/1000),stall:Math.round(S.diag.stall/1000),tts:S.diag.tts});
  diagSave();DL=null;
}
function diagEv(e){if(!DL)return;DL.ev.push([diagT(),e]);if(DL.ev.length>300)DL.ev.shift();diagSave()}
function diagTake(f,t0,first,last,end,dur,wall){
  try{
    if(!DL||!f)return;
    /* the share of readable pitch is counted over the time the singer was heard, or over the whole take if they never were */
    const span=first?f.filter(x=>x.t-t0>=first-120&&x.t-t0<=last):f,vo=f.filter(x=>x.m!=null);
    DL.takes.push({t:diagT(),b:stageName,heard:+(dur/1000).toFixed(1),sang:first?+((last-first)/1000).toFixed(1):0,
      pitch:span.length?Math.round(span.filter(x=>x.m!=null).length/span.length*100):0,end,
      noise:dB(S.noise),voice:vo.length?dB(median(vo.map(x=>x.r))):null,lag:Math.max(0,Math.round(wall-dur)),say:ui.say.textContent.slice(0,60)});
    if(DL.takes.length>400)DL.takes.shift();
    diagSave();
  }catch(e){}
}
const p2=n=>String(n).padStart(2,"0");
const mmss=t=>`${Math.floor(t/60)}:${p2(t%60)}`;
const diagDate=s=>{const d=new Date(s.at);return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`};
function diagSummary(s){
  const n=s.takes.length,c=k=>s.takes.filter(x=>x.end===k).length,sung=s.takes.filter(x=>x.sang>0);
  const out=[diagDate(s),s.min!=null?`${s.min} min`:"not finished",`${n} takes`];
  if(n){out.push(`pitch read ${sung.length?Math.round(median(sung.map(x=>x.pitch))):0}%`);
    for(const [k,w] of [["none","never heard"],["limit","at time limit"],["safety","safety stop"]])if(c(k))out.push(`${c(k)} ${w}`)}
  return out.join(" · ");
}
function diagLines(s){
  const L=[`Session ${diagDate(s)}, version ${s.ver}, `+(s.min!=null?`${s.min} min`:"not finished (closed or crashed)"),
    `Mic: ${s.mic||"unknown"} · noise filter ${s.ns?"on":"off"} · ${s.sr} Hz`+(s.lat!=null?` · speaker delay ${s.lat} ms · car noise at start ${s.noise0} dB`:"")];
  if(s.min!=null)L.push(`Mic gave silence ${s.mute} s · audio stalled ${s.stall} s · coach voice failures ${s.tts}`);
  L.push("","  time block                heard  sang pitch ended  noise voice  lag  last line spoken");
  const rows=s.takes.map(x=>[x.t,x]).concat(s.ev.map(e=>[e[0],e[1]])).sort((a,b)=>a[0]-b[0]);
  for(const [t,x] of rows){
    if(typeof x==="string"){L.push(`${mmss(t).padStart(6)} -- ${x}`);continue}
    L.push(`${mmss(t).padStart(6)} ${x.b.slice(0,20).padEnd(20)} ${x.heard.toFixed(1).padStart(5)} ${x.sang.toFixed(1).padStart(5)} ${(x.pitch+"%").padStart(5)} ${x.end.padEnd(6)} ${String(x.noise).padStart(5)} ${String(x.voice==null?"":x.voice).padStart(5)} ${String(x.lag).padStart(4)}  ${x.say}`);
  }
  return L;
}
const diagExport=()=>"Road Voice Coach listening diagnostics\n\n"+diagAll().slice().reverse().map(s=>diagLines(s).join("\n")).join("\n\n")+"\n";
function diagMsg(t){const m=$("diagMsg");m.textContent=t;m.hidden=!t}
function renderDiag(){
  const box=$("diagList"),all=diagAll().slice().reverse();box.innerHTML="";diagMsg("");
  if(!all.length){box.innerHTML=`<p class="hint">Nothing logged yet. Every session you run is logged here.</p>`;return}
  all.forEach((s,i)=>{
    const d=document.createElement("details");d.open=i===0;
    const sm=document.createElement("summary");sm.textContent=diagSummary(s);
    const pre=document.createElement("pre");pre.textContent=diagLines(s).join("\n");
    d.append(sm,pre);box.append(d);
  });
}
$("diagCopy").onclick=async()=>{
  const t=diagExport();
  try{await navigator.clipboard.writeText(t);diagMsg("Copied. Paste it into a chat with Claude.")}
  catch(e){const a=document.createElement("textarea");a.value=t;document.body.append(a);a.select();
    try{document.execCommand("copy");diagMsg("Copied. Paste it into a chat with Claude.")}catch(e2){diagMsg("Copying failed. Use Save as file instead.")}a.remove()}
};
$("diagFile").onclick=()=>{
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([diagExport()],{type:"text/plain"}));
  a.download=`road-voice-coach-diagnostics-${today()}.txt`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
};
$("diagClear").onclick=()=>{if(S.running||!confirm("Clear the diagnostics log?"))return;DLS=[];store.set("diag",[]);renderDiag()};

/* ---------- session plan: length and focus ---------- */
const TECH=[["nasality","Nasality",nasality],["onset","Clean onsets",onset],["registers","Registers",registers],["vowels","Vowels",vowels],["clear","Clear tone",clearTone],
  ["legato","Smooth line",legato],["breath","Breath and long notes",breath],["release","Loose jaw and tongue",release],["sounds","Sounds with a job",sounds]];
/* The technique rotation from the settings. Nasality copies are spread evenly between the other topics;
   with the default settings this is the original nine-slot rotation, so D.rotT2 carries on where it was. */
/* A saved list of topics only speaks for the topics that existed when it was saved (topicsOf; lists saved before
   "sounds" was added knew the first seven), so a newer topic joins the rotation until it is unticked in Settings. */
const OLD_TOPICS=["onset","registers","vowels","clear","legato","breath","release"];
const topicOn=k=>{const on=store.get("topics",null);return !on||on.includes(k)||!store.get("topicsOf",OLD_TOPICS).includes(k)};
function techRotation(){
  const nas=TECH[0],others=TECH.slice(1).filter(t=>topicOn(t[0])),n=others.length;
  const c={off:0,less:1,normal:2,more:Math.max(1,n)}[store.get("nasal","normal")];
  const k=c==null?2:c;
  if(!n)return k?[nas]:TECH.slice(1);
  const rot=[];
  others.forEach((t,i)=>{for(let j=0;j<k;j++)if(Math.min(n-1,Math.floor(j*n/k+0.5))===i)rot.push(nas);rot.push(t)});
  return rot;
}
/* The session's one focus, chosen from the enabled technique topics (the ones in the rotation). Nasality first, being Paul's main goal:
   its latest score is low (under 50) or has fallen 8 points below the sessions before; then the registers, when the notes around the usual
   break (D.brk) are 25 cents or more off (and clearly worse than the rest of the map); otherwise the topic practised longest ago (D.lastT, never = oldest). */
function pickFocus(rot){
  if(store.get("focus","auto")==="none")return null;
  const ts=TECH.filter(t=>rot.some(r=>r[0]===t[0]));if(ts.length<2)return null;
  const has=k=>ts.find(t=>t[0]===k);
  const nv=store.get("history",[]).map(h=>h.nasal).filter(x=>x!=null),last=nv[nv.length-1],prev=nv.slice(-4,-1);
  if(has("nasality")&&last!=null){
    if(last<50)return {t:has("nasality"),why:`nasality score is low, ${last}`};
    if(prev.length&&last<=mean(prev)-8)return {t:has("nasality"),why:`nasality score is falling, ${last} after ${Math.round(mean(prev))}`};
  }
  const brk=D.brk||[];
  if(has("registers")&&brk.length>=2){
    const b=median(brk),all=Object.entries(D.notes||{}).filter(([,v])=>v.n>=3).map(([m,v])=>[+m,v.err]),near=all.filter(([m])=>Math.abs(m-b)<=2),far=all.filter(([m])=>Math.abs(m-b)>2);
    if(near.length>=2){const e=mean(near.map(x=>x[1]));
      if(e>=25&&(far.length<2||e>=mean(far.map(x=>x[1]))*1.25))return {t:has("registers"),why:`notes near the register break, ${nname(b)}, are ${Math.round(e)} cents off`}}
  }
  const lt=D.lastT||(D.lastT={});let o=ts[0];for(const t of ts)if((lt[t[0]]||"")<(lt[o[0]]||""))o=t;
  return {t:o,why:lt[o[0]]?`practised longest ago, last on ${lt[o[0]]}`:"not practised yet"};
}
/* typical minutes per block, measured with tests/timing.js (technique blocks include half of the 0.8 min transfer step); replaced by this phone's own averages as sessions run */
const BLOCK_MIN={"Finding your voice":0.9,"Warm-up":2.4,"Short warm-up":1.4,"Nasality":2.5,"Clean onsets":2.2,"Registers":1.7,"Vowels":2.8,"Clear tone":2.1,
  "Smooth line":1.7,"Breath and long notes":2.7,"Loose jaw and tongue":1.8,"Sounds with a job":2.3,"Pitch matching":1.8,"Scales":1.8,"Intervals":1.9,"Mixed practice":5.5,
  "Song":2.9,"Skills":1.2,"Ear training":3.2,"Free singing":1.2,"Reset":0.4,"Cool-down":0.7};
const estMin=k=>(D.bmin&&D.bmin[k])||BLOCK_MIN[k]||2;
function learnMin(k,m){
  diagEv(`${k} took ${m.toFixed(1)} min`);
  if(!(m>0.15)||m>estMin(k)*3)return;
  D.bmin=D.bmin||{};const o=D.bmin[k];D.bmin[k]=+(o?o*0.7+m*0.3:m).toFixed(2);
}
const WRAP=1.2;  /* minutes kept for the summary and cool-down at the end of a timed session */
/* Which of a round's blocks fit the time left: highest priority first. In the first round the warm-up and the
   first technique block always run, so even a five-minute session warms up and works on technique. */
function fitRound(items,left,first){
  const keep=new Set();let b=left;
  for(const it of [...items].sort((x,y)=>x.pri-y.pri)){const e=estMin(it.key);if((first&&it.pri<=2)||e<=b+0.3){keep.add(it);b-=e}}
  return items.filter(x=>keep.has(x));
}
async function coolDown(last="That's the end of today's session. Well done."){
  await speak("Cool-down. Hum gently and slide down from a comfortable middle note to a low one. Three or four times, with no effort.");
  await sleep(25000);
  await speak(last);
}
const NUMW={5:"five",10:"ten",20:"twenty",30:"thirty"};
function showLen(){const m=+store.get("len",0);$("lenHint").textContent=m?`Session length: about ${m} minutes, ending with a cool-down. Change it in Settings.`:"Session length: until you press Stop. Change it in Settings."}

/* ---------- session ---------- */
async function session(){
  Object.assign(S,{scores:[],biases:[],round:0,misses:0,sessionStart:performance.now(),base:0,loud:0,loudAt:-1e9,repN:0,nas:null,nasScores:[],
    hiss:0,hold:0,free:null,nasDone:false,c0:clock(),pauseTot:0,cueSaid:false,tip:{},diag:{zero:0,stall:0,tts:0},alertAt:0,ownSaid:false,judgeSaid:false,octSaid:false,breathSaid:false,prevTake:null,lastTake:null,nBlk:0,cool:false,wind:false,weakSaid:false});
  const done=store.get("history",[]).length;
  S.fbEvery=store.get("fb","auto")==="all"?1:done<2?1:done<5?2:3;
  await loadBank();preloadClips();
  setStage("Starting");
  await speak("Hi, I'm your singing coach. Keep your eyes on the road; everything happens by voice. Stay quiet for a moment while I listen to the car. You'll hear one beep.");
  {const k=streakOf(daysNow(true));if(k>=2)await speak(`Day ${numWord(k)} in a row.`)}
  await calibrate(2500);
  await latencyCheck();
  if(DL){DL.noise0=dB(S.noise);DL.lat=S.lat;diagSave()}
  if(sungLimit()){await speak("You've reached today's singing limit. Rest your voice and come back tomorrow.");S.finished=true;return}
  let p=profile();
  if(!p||store.get("rangeDate","")!==today())p=await findRange();
  store.set("rangeDate",today());
  const rot=techRotation();
  const foc=pickFocus(rot);
  if(foc)diagEv(`focus: ${foc.t[1]} (${foc.why})`);
  const techRun=t=>{(D.lastT=D.lastT||{})[t[0]]=today();return block(t[1],()=>t[2](p),{sum:t[1]==="Vowels"})};
  /* the focus blocks (both technique blocks of round 1) leave D.rotT2 alone, so the rotation carries on as if they had not happened */
  const nextTech=async f=>{if(f&&foc)return techRun(foc.t);const t=rot[D.rotT2%rot.length];D.rotT2++;await techRun(t)};
  const sayFocus=n=>speak(`Today's focus: ${foc.t[1].toLowerCase()}. `+(n>1?"You'll do it twice, and it comes first.":"It comes first."));
  const prac=[song,skills],pracN=["Song","Skills"],pracK=i=>i===1&&D.sk%3===2?"Ear training":pracN[i];S.done=done;
  const lim=+store.get("len",0);
  /* The loops run until the time is up (timed) or forever (untimed); a Wind from the Stop button or the singing limit ends them early. Both then wind down the same way. */
  let why="end";
  try{
    if(lim){
      /* a timed session: each round keeps the blocks that fit, then a summary and a cool-down end it */
      const used=()=>(clock()-S.c0)/60000;
      await speak(`This is a ${NUMW[lim]||lim} minute session.`);
      while(true){
        S.round++;
        const r=D.rotT2,fr=!!foc&&S.round===1,tk=i=>fr?foc.t[1]:rot[(r+i)%rot.length][1],short=lim<=10,items=[];
        if(S.round===1)items.push({key:short?"Short warm-up":"Warm-up",pri:2,run:()=>block("Warm-up",()=>warmup(p,short),{sum:false,key:short?"Short warm-up":"Warm-up"})});
        items.push({key:tk(0),pri:1,foc:fr,run:()=>nextTech(fr)});
        if(done>=3&&S.round>=2)items.push({key:"Mixed practice",pri:3,run:()=>block("Mixed practice",()=>mixed(p))});
        else items.push({key:"Pitch matching",pri:3,run:()=>block("Pitch matching",()=>pitchMatch(p,4))},
          {key:"Scales",pri:6,run:()=>block("Scales",()=>scales(p,3))},{key:"Intervals",pri:7,run:()=>block("Intervals",()=>intervals(p,4))});
        items.push({key:tk(1),pri:4,foc:fr,run:()=>nextTech(fr)});
        const pi=D.rotP%prac.length;
        items.push({key:pracK(pi),pri:5,run:async()=>{D.rotP++;await block(pracK(pi),()=>prac[pi](p),{sum:pi===0})}});
        items.push({key:"Free singing",pri:8,run:()=>block("Free singing",()=>freeSing(),{sum:false})});
        const plan=fitRound(items,lim-used()-WRAP,S.round===1);
        if(!plan.length)break;
        diagEv(`round ${S.round} plan: ${plan.map(x=>x.key).join(", ")}`);
        if(fr)await sayFocus(plan.filter(x=>x.foc).length);
        for(const it of plan){
          if(!(S.round===1&&it.pri<=2)&&used()+estMin(it.key)>lim-WRAP+0.5){diagEv(`left out ${it.key}: out of time`);continue}
          await it.run();
        }
        if(lim-used()-WRAP<3)break;
        await speak("Next round.");
      }
    }else{
      if(foc)await sayFocus(2);
      while(true){
      S.round++;
      if(S.round===1)await block("Warm-up",()=>warmup(p),{sum:false});
      await nextTech(S.round===1);
      if(done>=3&&S.round>=2)await block("Mixed practice",()=>mixed(p));
      else{
        await block("Pitch matching",()=>pitchMatch(p,4));
        await block("Scales",()=>scales(p,3));
        await block("Intervals",()=>intervals(p,4));
      }
      await nextTech(S.round===1);
      {const i=D.rotP%prac.length;D.rotP++;await block(pracK(i),()=>prac[i](p),{sum:i===0})}
      await block("Free singing",()=>freeSing(),{sum:false});
      await summary();
      await block("Reset",()=>resetVoice(),{sum:false});
      await speak("Next round.");
    }}
  }catch(e){
    if(!(e instanceof Wind))throw e;
    why=e.why;S.frames=null;S.rec=null;S.specMode=null;S.canSkip=false;setSub("");setTarget(null);
  }
  /* from here a Stop press stops at once */
  S.cool=true;S.wind=false;
  if(why==="stop")await speak("Okay, let's finish with a cool-down.");
  else{if(why==="limit")await speak("That's enough singing for today. Your voice has done its work.");await summary()}
  await block("Cool-down",()=>coolDown(why==="stop"?"That's it for today. Well done.":undefined),{sum:false,end:true});
  S.finished=true;
}
function showCtl(on){ui.ctl.hidden=!on;$("pauseBtn").textContent=S.paused?"Resume":"Pause"}
/* delayed start: the microphone opens at the press (a page may not open it later from the background), the session begins after the wait */
async function countdown(min){
  const end=performance.now()+min*60000/SPEED;S.skip=false;S.canSkip=true;
  ui.say.textContent=`The session starts by itself in ${min} minutes. You can switch to navigation or lock the phone now. Press Skip to start straight away.`;
  try{
    while(performance.now()<end){
      const left=Math.ceil((end-performance.now())*SPEED/1000);
      setStage(`Starting in ${Math.floor(left/60)}:${String(left%60).padStart(2,"0")}`);
      await sleep(500*SPEED);
    }
  }catch(e){if(!(e instanceof Skip))throw e}
  finally{S.canSkip=false;S.skip=false}
  await blip();
}

/* ---------- start and stop ---------- */
async function start(mode,delayMin=0){
  if(S.running)return;
  S.running=true;S.stop=false;S.skip=false;S.paused=false;S.replayReq=false;S.mode=mode;S.finished=false;S.sessionStart=0;S.cool=false;S.wind=false;S.nBlk=0;
  ui.go.textContent=mode==="test"?"End mic test":mode==="home"?"End home practice":"Stop";ui.go.classList.add("stop");showView(null);$("laterRow").hidden=true;
  ui.hint.textContent=mode==="test"?"Sing or speak. The target box shows the nearest note.":mode==="home"?"Sing along with the target note and watch the line.":"Running. You can switch to navigation now. Press Stop when you arrive for a short cool-down, or twice to end at once.";
  try{
    if("speechSynthesis" in window){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(""))}
    try{S.wake=await navigator.wakeLock.request("screen")}catch(e){}
    await openMic();
    if(mode==="session")diagBegin();
    if(mode==="test"){setStage("Mic test");ui.say.textContent="Sing a note. The You box and the needle should follow your voice. If the level bar jumps while you're silent, turn on the road-noise filter in Settings.";await calibrate(1500);
      while(true){await sleep(200*SPEED)}}
    if(mode==="home"){setStage("Home practice");ui.say.textContent="Sing, and watch the line. Green means within 25 cents of the target.";hpStart();await calibrate(1500);
      while(true){await sleep(200*SPEED)}}
    mediaOn();showCtl(true);
    if(delayMin)await countdown(delayMin);
    await session();
  }catch(e){
    if(!(e instanceof Stopped)){setStage("Something went wrong");ui.say.textContent=e&&e.name==="NotAllowedError"?"The microphone was blocked. Allow microphone access for this page in Chrome, then press Start again.":"Could not start: "+(e&&e.message||e);console.error(e)}
  }finally{
    if(mode==="session"){sungSave();saveSession();diagEnd();if(S.sessionStart&&(performance.now()-S.sessionStart)*SPEED>=180000)noteDay()}
    hpStop();closeMic();mediaOff();showCtl(false);try{S.wake&&S.wake.release()}catch(e){}S.wake=null;
    S.running=false;S.paused=false;$("laterRow").hidden=false;markNav();ui.go.textContent="Start";ui.go.classList.remove("stop");setTarget(null);ui.you.textContent="–";ui.lvl.style.width="0";ui.needle.style.left="50%";ui.needle.style.opacity=.25;ui.needle.style.background="var(--fg)";
    if(S.finished&&!S.stop){setStage("Finished");ui.say.textContent="Session finished and saved. Progress has your charts and takes."+diagText()}
    if(S.stop){setStage("Stopped");ui.say.textContent=S.mode==="test"?"Mic test finished.":S.mode==="home"?"Home practice finished.":"Session saved. Progress has your charts and takes; Guide has the cues you heard."+diagText();}
    ui.hint.textContent="After pressing Start you can switch to navigation or lock the phone; the coach is built to keep running. Keep the phone where its mic can hear you.";
  }
}
function diagText(){
  const d=S.diag,out=[];
  if(d.zero>5000)out.push(`the phone muted the microphone for about ${Math.round(d.zero/1000)} seconds`);
  if(d.stall>5000)out.push(`the phone suspended the app for about ${Math.round(d.stall/1000)} seconds`);
  if(d.tts>=3)out.push(`the coach voice failed to speak ${d.tts} times`);
  return out.length?" Note: "+out.join(", and ")+".":"";
}
/* In a session, past the first block, the first press starts a cool-down; the second, or any press before that, stops at once. */
function stop(){
  if(S.running&&S.mode==="session"&&!S.cool&&!S.stop&&S.nBlk>0){
    S.cool=true;S.wind=true;diagEv("stop pressed: cool-down first");ui.go.textContent="Stop now";
    if(S.paused){S.paused=false;S.pauseTot=(S.pauseTot||0)+clock()-(S.pause0||clock());showCtl(true)}
    try{speechSynthesis.cancel()}catch(e){}
    return;
  }
  S.stop=true;try{speechSynthesis.cancel()}catch(e){}
}
ui.go.onclick=()=>S.running?stop():start("session");
const delaySel=$("delaySel"),laterBtn=$("laterBtn");
delaySel.value=String(store.get("delay",10));
const setLater=()=>{laterBtn.textContent=`Start in ${delaySel.value} min`};setLater();
delaySel.onchange=()=>{store.set("delay",+delaySel.value);setLater()};
laterBtn.onclick=()=>{if(!S.running)start("session",+delaySel.value)};
$("testBtn").onclick=()=>{if(S.running){if(S.mode==="test")stop();return}showView(null);start("test")};
$("hpBtn").onclick=()=>{if(S.running){if(S.mode==="home")stop();return}showView(null);start("home")};
document.addEventListener("visibilitychange",async()=>{if(S.running)diagEv(document.visibilityState==="visible"?"app back on screen":"app went to the background");if(S.running&&document.visibilityState==="visible"){try{S.wake=await navigator.wakeLock.request("screen")}catch(e){}}});

/* ---------- hands-free controls: steering-wheel media buttons ---------- */
function doSkip(){if(S.running&&S.mode==="session"&&S.canSkip){S.skip=true;diagEv("skip pressed")}}
function doReplay(){if(S.running&&S.mode==="session"){S.replayReq=true;diagEv("replay pressed")}}
function doPause(on){
  if(!S.running||S.mode!=="session"||S.paused===on)return;
  S.paused=on;showCtl(true);diagEv(on?"paused":"resumed");
  if(on)S.pause0=clock();else S.pauseTot=(S.pauseTot||0)+clock()-(S.pause0||clock());
  try{navigator.mediaSession.playbackState=on?"paused":"playing"}catch(e){}
  try{speechSynthesis.cancel();speechSynthesis.speak(utter(on?"Paused. Press play to carry on.":"Carrying on."))}catch(e){}
  setSub(on?"paused":"");
}
function mediaOn(){
  try{
    if(!S.silent){
      const sr=8000,n=sr*10,b=new ArrayBuffer(44+n*2),v=new DataView(b),w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
      w(0,"RIFF");v.setUint32(4,36+n*2,true);w(8,"WAVEfmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
      v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,"data");v.setUint32(40,n*2,true);
      for(let i=0;i<n;i++)v.setInt16(44+i*2,i%2?1:-1,true);
      S.silent=new Audio(URL.createObjectURL(new Blob([b],{type:"audio/wav"})));S.silent.loop=true;
    }
    S.silent.play().catch(()=>{});
    if(!("mediaSession" in navigator))return;
    const ms=navigator.mediaSession,set=(a,h)=>{try{ms.setActionHandler(a,h)}catch(e){}};
    try{ms.metadata=new MediaMetadata({title:"Singing session",artist:"Road Voice Coach"})}catch(e){}
    const on=store.get("keys","1")==="1";
    set("nexttrack",on?doSkip:null);set("previoustrack",on?doReplay:null);set("pause",on?()=>doPause(true):()=>{});set("play",on?()=>doPause(false):()=>{});
    ms.playbackState="playing";
  }catch(e){}
}
function mediaOff(){try{S.silent&&S.silent.pause();navigator.mediaSession.playbackState="none"}catch(e){}}
$("skipBtn").onclick=doSkip;$("replayBtn").onclick=doReplay;$("pauseBtn").onclick=()=>doPause(!S.paused);

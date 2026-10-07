"use strict";
const SPEED=window.__speed||1;
const clock=()=>performance.now()*SPEED;
/* ---------- helpers ---------- */
const NAMES=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const mtof=m=>440*Math.pow(2,(m-69)/12);
const ftom=f=>69+12*Math.log2(f/440);
const nname=m=>{const r=Math.round(m);return NAMES[(r%12+12)%12]+(Math.floor(r/12)-1)};
const spoken=m=>nname(m).replace("#"," sharp ");
const median=a=>{if(!a.length)return NaN;const s=[...a].sort((x,y)=>x-y);const k=s.length>>1;return s.length%2?s[k]:(s[k-1]+s[k])/2};
const mean=a=>a.reduce((x,y)=>x+y,0)/(a.length||1);
const sdev=a=>{const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)))};
const pct=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.max(0,Math.round(p*(s.length-1))))]};
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const collapse=t=>t.filter((x,i)=>i===0||x!==t[i-1]);
const today=()=>new Date().toISOString().slice(0,10);
/* practice days: all date maths works on the same YYYY-MM-DD strings as today(), counted in whole days */
const dayN=s=>Math.floor(Date.parse(s)/864e5),dayS=n=>new Date(n*864e5).toISOString().slice(0,10);
const weekStart=n=>n-(n+3)%7; // Monday of the week holding day n (day 0, 1 Jan 1970, was a Thursday)

/* ---------- YIN pitch detection ---------- */
function yin(buf,sr){
  const W=buf.length>>1, minLag=Math.floor(sr/1100), maxLag=Math.min(W-1,Math.floor(sr/65));
  const d=new Float32Array(maxLag+2);
  for(let t=1;t<=maxLag+1;t++){let s=0;for(let i=0;i<W;i++){const x=buf[i]-buf[i+t];s+=x*x}d[t]=s}
  const raw=d.slice();
  let run=0;d[0]=1;
  for(let t=1;t<=maxLag+1;t++){run+=d[t];d[t]=run?d[t]*t/run:1}
  let tau=-1;
  for(let t=minLag;t<=maxLag;t++){if(d[t]<0.15){while(t+1<=maxLag&&d[t+1]<d[t])t++;tau=t;break}}
  if(tau<0){let best=minLag;for(let t=minLag;t<=maxLag;t++)if(d[t]<d[best])best=t;if(d[best]<0.25)tau=best;else return null}
  const conf=1-d[tau];
  {const w=Math.max(2,Math.round(tau*0.08));let best=tau;
   for(let t=Math.max(minLag,tau-w);t<=Math.min(maxLag,tau+w);t++)if(raw[t]<raw[best])best=t;tau=best}
  const a=raw[tau-1],b=raw[tau],c=raw[tau+1];const den=a+c-2*b;
  const bt=den>0?tau+(a-c)/(2*den):tau;
  return {f:sr/bt,c:conf};
}

/* ---------- analysis ---------- */
function segments(frames,minFrames=5){
  const segs=[];let cur=null;
  const close=()=>{if(cur&&cur.ms.length>=minFrames)segs.push(cur);cur=null};
  for(const f of frames){
    if(f.m==null){if(cur&&f.t-cur.end>260)close();continue}
    if(cur&&Math.abs(f.m-cur.last)<0.6&&f.t-cur.end<=260){cur.ms.push(f.m);cur.rs.push(f.r);cur.end=f.t;cur.last=f.m}
    else{close();cur={start:f.t,end:f.t,ms:[f.m],rs:[f.r],last:f.m}}
  }
  close();
  const out=[];
  for(const s of segs){
    const n=s.ms.length,a=Math.floor(n*0.2),core=s.ms.slice(a,Math.max(a+1,Math.ceil(n*0.9)));
    const p=median(core), sd=Math.sqrt(mean(core.map(x=>(x-p)**2)))*100;
    const prev=out[out.length-1];
    if(prev&&Math.abs(prev.p-p)<0.4&&s.start-prev.end<400){prev.ms.push(...s.ms);prev.rs.push(...s.rs);prev.end=s.end;prev.p=median(prev.ms);continue}
    const k=Math.max(2,Math.floor(n*0.3));
    out.push({start:s.start,end:s.end,ms:s.ms,rs:s.rs,p,sd,on:median(s.ms.slice(0,3)),first:median(s.ms.slice(0,k)),last:median(s.ms.slice(-k))});
  }
  return out;
}
/* align sung segments to target notes; per-target error in cents (null = missed) and octave shift */
function scoreSeq(frames,targets){
  const segs=segments(frames);
  const none=targets.map(()=>null);
  if(!segs.length)return {errs:none,sds:none.slice(),map:none.slice(),oct:0,segs};
  const offs=segs.map(s=>{let best=1e9;for(const t of targets){const d=s.p-t;if(Math.abs(d)<Math.abs(best))best=d}return Math.round(best/12)*12});
  const cnt={};offs.forEach(o=>cnt[o]=(cnt[o]||0)+1);
  const oct=+Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0];
  const P=segs.map(s=>s.p-oct), T=targets.length, N=P.length;
  const INF=1e9, dp=Array.from({length:T+1},()=>new Array(N+1).fill(INF)), bk=Array.from({length:T+1},()=>new Array(N+1).fill(0));
  dp[0][0]=0;
  for(let i=0;i<=T;i++)for(let j=0;j<=N;j++){
    if(i===0&&j===0)continue;
    let v=INF,b=0;
    if(i>0&&j>0){const c=dp[i-1][j-1]+Math.min(Math.abs(P[j-1]-targets[i-1]),2.5);if(c<v){v=c;b=1}}
    if(j>0){const c=dp[i][j-1]+1.0;if(c<v){v=c;b=2}}
    if(i>0){const c=dp[i-1][j]+3.0;if(c<v){v=c;b=3}}
    dp[i][j]=v;bk[i][j]=b;
  }
  const errs=new Array(T).fill(null), sds=new Array(T).fill(null), map=new Array(T).fill(null);
  let i=T,j=N;
  while(i>0||j>0){const b=bk[i][j];if(b===1){const e=(P[j-1]-targets[i-1])*100;if(Math.abs(e)<250){errs[i-1]=e;sds[i-1]=segs[j-1].sd;map[i-1]=segs[j-1]}i--;j--}else if(b===2)j--;else i--}
  return {errs,sds,map,oct,segs};
}
const levelOf=frames=>{const v=frames.filter(f=>f.m!=null).map(f=>f.r);return v.length?median(v):0};
/* vibrato on a held note: pitch samples every dt seconds */
function vibrato(ms,dt=0.04){
  if(ms.length<25)return null;
  const k=4,d=[];
  for(let i=k;i<ms.length-k;i++){let s=0;for(let j=-k;j<=k;j++)s+=ms[i+j];d.push(ms[i]-s/(2*k+1))}
  const amp=Math.sqrt(mean(d.map(x=>x*x)))*Math.SQRT2*100;
  let zc=0;for(let i=1;i<d.length;i++)if((d[i-1]<0)!==(d[i]<0))zc++;
  const rate=zc/2/((d.length-1)*dt);
  const per=Math.round(1/(rate*dt));
  if(!(per>=3&&per<=7))return null;
  let num=0,den=0;for(let i=per;i<d.length;i++){num+=d[i]*d[i-per];den+=d[i]*d[i]}
  const reg=den?num/den:0;
  return (rate>=4&&rate<=7.5&&amp>=18&&amp<=150&&reg>0.4)?{rate,extent:amp}:null;
}
function swellOf(s){
  const n=s.rs.length;if(n<18)return null;
  const k=Math.floor(n/3),a=mean(s.rs.slice(0,k)),b=mean(s.rs.slice(k,2*k)),c=mean(s.rs.slice(2*k));
  return {up:b/(a||1e-9),down:b/(c||1e-9),pm:(median(s.ms.slice(k,2*k))-median(s.ms.slice(0,k)))*100};
}
/* note onsets (seconds) from raw audio, for rhythm */
function onsetsFromPcm(pcm,sr){
  const hop=Math.round(sr*0.01),env=[];
  for(let i=0;i+hop<=pcm.length;i+=hop){let s=0;for(let j=0;j<hop;j++)s+=pcm[i+j]*pcm[i+j];env.push(Math.sqrt(s/hop))}
  for(let i=env.length-1;i>=2;i--)env[i]=(env[i]+env[i-1]+env[i-2])/3;
  if(env.length<20)return [];
  const floor=pct(env,0.15),peak=pct(env,0.95);
  if(peak<floor*2.5)return [];
  const hi=floor+(peak-floor)*0.4,lo=floor+(peak-floor)*0.2,on=[];
  let armed=true;
  for(let i=1;i<env.length;i++){
    if(armed&&env[i]>=hi&&(!on.length||i*0.01-on[on.length-1]>0.16)){on.push(i*0.01);armed=false}
    else if(env[i]<lo)armed=true;
  }
  return on;
}
function rhythmText(on,beat){
  if(on.length<5)return {text:"I couldn't pick out the separate notes. Make them short and detached."};
  const io=[];for(let i=1;i<on.length;i++)io.push(on[i]-on[i-1]);
  const med=median(io),good=io.filter(x=>x>med*0.6&&x<med*1.5);
  const cv=sdev(good)/mean(good),tempo=mean(good)/beat,parts=[];
  parts.push(cv<0.06?"Very steady.":cv<0.12?"Fairly steady.":"The spacing was uneven.");
  if(tempo<0.94)parts.push(`You rushed, about ${Math.round((1/tempo-1)*100)} percent fast.`);
  else if(tempo>1.06)parts.push(`You dragged, about ${Math.round((1-1/tempo)*100)} percent slow.`);
  else parts.push("Right on the tempo.");
  return {text:parts.join(" "),cv,tempo};
}
function longestRun(frames,pred,gap){
  let best=0,st=null,last=null;
  for(const f of frames){
    if(pred(f)){if(st==null||f.t-last>gap)st=f.t;last=f.t;best=Math.max(best,last-st)}
  }
  return best;
}
/* register flips in a slide: a sudden jump of 2.5 semitones or more that is not an octave misreading */
function breaksOf(frames){
  const v=frames.filter(f=>f.m!=null);if(v.length<20)return null;
  const ms=v.map(f=>f.m),dts=[];for(let i=1;i<v.length;i++)dts.push(v[i].t-v[i-1].t);
  const step=median(dts)||40,br=[];let lastT=-1e12;
  for(let i=3;i<=v.length-3;i++){
    if(v[i+2].t-v[i-3].t>step*9)continue;
    const a=median(ms.slice(i-3,i)),b=median(ms.slice(i,i+3)),d=Math.abs(b-a);
    if(d>=2.5&&d<16&&Math.abs(d-12)>1.5&&v[i].t-lastT>step*10){br.push(Math.max(a,b)-d/2);lastT=v[i].t}
  }
  return {lo:pct(ms,0.03),hi:pct(ms,0.97),breaks:br};
}
/* legato: count breaks in the sound between the first and last sung frame */
function legatoOf(frames){
  const idx=[];frames.forEach((f,i)=>{if(f.m!=null)idx.push(i)});if(idx.length<12)return null;
  let gaps=0,run=0;for(let i=idx[0];i<=idx[idx.length-1];i++){if(frames[i].m==null)run++;else{if(run>=2)gaps++;run=0}}
  return {gaps};
}
function freeAnalysis(frames){
  const segs=segments(frames,6);
  const voicedSec=frames.filter(f=>f.m!=null).length*0.04;
  if(voicedSec<5||segs.length<4)return null;
  const off=ps=>{let sx=0,cx=0;for(const p of ps){const a=2*Math.PI*(p-Math.round(p));sx+=Math.sin(a);cx+=Math.cos(a)}return Math.atan2(sx,cx)/(2*Math.PI)};
  const ps=segs.map(s=>s.p), o=off(ps);
  const devs=ps.map(p=>{let d=p-Math.round(p)-o;d-=Math.round(d);return d*100});
  const spread=Math.sqrt(mean(devs.map(d=>d*d)));
  const held=segs.filter(s=>s.end-s.start>=500);
  const wobble=held.length?mean(held.map(s=>s.sd)):null;
  const h=Math.floor(ps.length/2);
  let drift=null;if(ps.length>=8)drift=(off(ps.slice(h))-off(ps.slice(0,h)))*100;
  return {spread,wobble,drift,lo:pct(ps,0.05),hi:pct(ps,0.95),voicedSec,n:segs.length};
}
function freeText(a){
  const parts=[];
  if(a.spread<20)parts.push("Your notes sat nicely in tune with each other.");
  else if(a.spread<35)parts.push("Mostly in tune, with a few notes slipping.");
  else parts.push("The pitch wandered quite a bit. Try a slower song and really listen to each note.");
  if(a.wobble!=null)parts.push(a.wobble<15?"Long notes were steady.":"Your long notes wobbled a little.");
  if(a.drift!=null&&Math.abs(a.drift)>25)parts.push(`You drifted ${a.drift<0?"flat":"sharp"} as you went on.`);
  parts.push(`You used ${Math.round(a.hi-a.lo)} semitones, from ${spoken(a.lo)} to ${spoken(a.hi)}.`);
  return parts.join(" ");
}
/* ---------- feedback wording ---------- */
const dir=e=>e>0?"sharp":"flat";
const amount=a=>a<15?"":a<35?"a little ":a<70?"":"quite ";
const POS=(i,n)=>i===0?"the first note":i===n-1?"the last note":`note ${i+1}`;
function analyseSeq(frames,targetsRaw,o={},S0={}){
  const T=collapse(targetsRaw),r=scoreSeq(frames,T),level=levelOf(frames);
  const ok=r.errs.map((e,i)=>({e,i})).filter(x=>x.e!=null);
  if(!ok.length||ok.length<Math.ceil(T.length/2))
    return {heard:false,success:false,retry:true,level,text:pick(["I couldn't follow that one.","I didn't catch enough of that."])};
  const abs=ok.map(x=>Math.abs(x.e)),avg=mean(abs),bias=mean(ok.map(x=>x.e));
  const scoops=r.map.filter(s=>s&&s.end-s.start>=200&&(s.on-s.p)*100<-60).length;
  const parts=[];
  if(r.oct&&!S0.octSaid){S0.octSaid=true;parts.push(r.oct<0?"You're singing an octave below me, which is fine.":"You're singing an octave above me, which is fine.")}
  if(o.scoopFocus){
    parts.push(scoops===0?"All clean starts.":`${scoops} of ${ok.length} notes slid up from below.`);
    if(avg>=40)parts.push(`Pitch was ${amount(Math.abs(bias))}${dir(bias)}.`);
  }else{
    if(avg<15)parts.push(pick(["Spot on.","Very accurate.","Right in tune."]));
    else if(avg<30)parts.push(pick(["Good.","Close.","Nicely done."]));
    else if(avg<60)parts.push(pick(["Getting there.","Not bad.","Okay."]));
    else parts.push(pick(["That one was quite far off.","That drifted."]));
    if(avg>=15&&Math.abs(bias)>=18)parts.push(`You were ${amount(Math.abs(bias))}${dir(bias)} overall.`);
    if(T.length>2){
      const w=ok.reduce((a,b)=>Math.abs(b.e)>Math.abs(a.e)?b:a);
      if(Math.abs(w.e)>40){const hi=T.indexOf(Math.max(...T));parts.push(`Watch ${w.i===hi?"the top note":POS(w.i,T.length)}, it was ${dir(w.e)}.`)}
    }
    if(scoops>=Math.max(2,Math.ceil(ok.length/2)))parts.push("You slid up into the notes. Try landing on them straight away.");
  }
  return {heard:true,avg,bias,scoops,level,success:avg<40&&ok.length>=Math.ceil(T.length*0.8),retry:avg>=70,
    text:parts.join(" "),single:T.length===1?r.map[0]:null,T,errs:r.errs};
}
/* a held note: every frame near the main pitch, from the first to the last, so gaps where the pitch couldn't be read don't shorten it */
function holdSeg(frames){
  const v=frames.filter(f=>f.m!=null);if(v.length<6)return null;
  const med=median(v.map(f=>f.m)),k=v.filter(f=>Math.abs(f.m-med)<1.2);
  if(k.length<6)return null;
  const ms=k.map(f=>f.m),rs=k.map(f=>f.r),n=ms.length,a=Math.floor(n*0.15),core=ms.slice(a,Math.max(a+1,Math.ceil(n*0.95)));
  const p=median(core),sd=Math.sqrt(mean(core.map(x=>(x-p)**2)))*100,q=Math.max(2,Math.floor(n*0.3));
  return {start:k[0].t,end:k[n-1].t,ms,rs,p,sd,on:median(ms.slice(0,3)),first:median(ms.slice(0,q)),last:median(ms.slice(-q))};
}
function analyseHold(frames,target,o={}){
  const s=holdSeg(frames),level=levelOf(frames);
  if(!s)return {heard:false,success:false,retry:true,level,text:"I didn't hear a note there."};
  let e=(s.p-target)*100;e-=Math.round(e/1200)*1200;
  const dur=(s.end-s.start)/1000,drift=(s.last-s.first)*100,n=s.ms.length;
  const vib=vibrato(s.ms.slice(Math.floor(n*0.15),Math.ceil(n*0.95)));
  const parts=[];
  if(o.swell){
    const w=swellOf(s);
    if(!w)parts.push("That was too short to judge. Give it about five seconds.");
    else{
      if(w.up>=1.35&&w.down>=1.35)parts.push("A clear swell: it grew and faded.");
      else if(w.up<1.15&&w.down<1.15)parts.push("The volume stayed about the same. Exaggerate it: really soft, then full, then soft.");
      else if(w.up>=1.35)parts.push("It grew, but didn't fade back at the end.");
      else parts.push("It faded at the end, but it didn't start soft enough to grow.");
      if(Math.abs(w.pm)>25)parts.push(`The pitch went ${w.pm>0?"sharp":"flat"} as you got louder.`);else parts.push("The pitch held.");
    }
  }else{
    parts.push(Math.abs(e)<15?pick(["Right on the note.","In tune."]):`${amount(Math.abs(e))}${dir(e)}`.replace(/^./,c=>c.toUpperCase())+".");
    if(vib)parts.push(`I hear a natural vibrato, about ${Math.round(vib.rate)} per second.`);
    else if(s.sd<12)parts.push("Very steady.");
    else if(s.sd>28)parts.push("It wobbled, so keep the air flowing evenly.");
    if(Math.abs(drift)>30)parts.push(drift<0?"It sagged towards the end, so keep the support going.":"It crept up towards the end.");
    if(!o.longest&&dur<(o.need||2.5)*0.8)parts.push("Try holding it longer.");
  }
  return {heard:true,avg:Math.abs(e),bias:e,sd:s.sd,dur,drift,vib,level,retry:false,
    success:Math.abs(e)<35&&(s.sd<30||!!vib)&&dur>=(o.need||2.5)*0.8,text:parts.join(" "),single:s,T:[target],errs:[e]};
}

/* ---------- storage ---------- */
const store={get(k,d){try{const v=localStorage.getItem("rvc_"+k);return v?JSON.parse(v):d}catch(e){return d}},
  set(k,v){try{localStorage.setItem("rvc_"+k,JSON.stringify(v))}catch(e){}}};
const D0=()=>({lv:{pm:1,sc:1,iv:1,lt:1,eh:1,em:1,ei:1},res:{},seen:{},vow:{},vi:0,sk:0,rot:0,rotT:2,rotT2:1,rotP:0,why:{},phr:0,dic:0,song:{s:0,ph:0},sungS:{},best:{},tips:{},brk:[],nx:0,xf:0,xp:0,sj:0,climb:null,notes:{},lastT:{}});
let D=Object.assign(D0(),store.get("data",{}));
const saveD=()=>store.set("data",D);
const idb={db:null,
  open(){return this.db?Promise.resolve(this.db):new Promise((res,rej)=>{try{const r=indexedDB.open("rvc",1);
    r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore("notes");d.createObjectStore("clips",{keyPath:"id",autoIncrement:true})};
    r.onsuccess=()=>{this.db=r.result;res(this.db)};r.onerror=()=>rej(r.error)}catch(e){rej(e)}})},
  async run(st,mode,fn){const d=await this.open();return new Promise((res,rej)=>{const t=d.transaction(st,mode);const q=fn(t.objectStore(st));t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error)})},
  put(st,v,k){return this.run(st,"readwrite",s=>k===undefined?s.put(v):s.put(v,k)).catch(()=>null)},
  all(st){return this.run(st,"readonly",s=>s.getAll()).catch(()=>[])},
  del(st,k){return this.run(st,"readwrite",s=>s.delete(k)).catch(()=>null)},
  clear(st){return this.run(st,"readwrite",s=>s.clear()).catch(()=>null)}};

/* ---------- state ---------- */
const NOISE_MIN=0.0003;
const S={tip:{},done:0,diag:{zero:0,stall:0,tts:0},running:false,stop:false,skip:false,canSkip:false,paused:false,replayReq:false,mode:null,ctx:null,out:null,an:null,spec:null,
  stream:null,buf:null,sbuf:null,timer:null,noise:0.001,frames:null,specMode:null,nAcc:null,nspec:null,hbNoise:0,rec:null,lat:250,
  wake:null,voice:null,misses:0,scores:[],biases:[],round:0,sessionStart:0,bank:new Map(),lastTake:null,prevTake:null,blk:null,
  base:0,loud:0,loudAt:-1e9,repN:0,fbEvery:1,nas:null,nasScores:[],ltI:0,silent:null,nBlk:0,cool:false,wind:false,weakSaid:false};
const $=id=>document.getElementById(id);
const ui={stage:$("stage"),say:$("say"),target:$("target"),you:$("you"),needle:$("needle"),lvl:$("lvl"),go:$("goBtn"),hint:$("hint"),ctl:$("ctl")};
let targetMidi=null,stageName="Ready";
function setTarget(m){targetMidi=m;ui.target.textContent=m==null?"–":nname(m)}
function setStage(n){stageName=n;ui.stage.textContent=n}
function setSub(s){if(S.paused)s="paused";ui.stage.textContent=s?`${stageName} · ${s}`:stageName}

class Stopped extends Error{}
class Skip extends Error{}
/* the first Stop press (or the daily singing limit) winds the session down with a cool-down; it is a Stopped so every wait and rethrow already lets it through */
class Wind extends Stopped{constructor(why){super();this.why=why}}
const chk=()=>{if(S.stop)throw new Stopped();if(S.wind){S.wind=false;throw new Wind("stop")}if(S.skip){S.skip=false;throw new Skip()}};
/* Browsers slow page timers to about once a second while the page is in the background.
   So every wait is also checked each time a block of microphone audio arrives (about 90 times a second). */
const waiters=new Set();
function pump(){if(!waiters.size)return;const n=performance.now();for(const w of [...waiters])w(n)}
function after(ms,fn){
  const t0=performance.now();let done=false;
  const off=()=>{done=true;waiters.delete(w);clearInterval(iv)};
  const w=n=>{if(!done&&n-t0>=ms){off();fn()}};
  const iv=setInterval(()=>w(performance.now()),Math.min(250,Math.max(4,ms/2)));
  waiters.add(w);return off;
}
const sleep=ms=>new Promise((res,rej)=>{const t0=performance.now(),w=ms/SPEED;let done=false;
  const off=()=>{done=true;waiters.delete(ck);clearInterval(iv)};
  const ck=n=>{if(done)return;
    if(S.stop||S.skip||S.wind){off();try{chk();res()}catch(e){rej(e)}}
    else if(n-t0>=w){off();res()}};
  const iv=setInterval(()=>ck(performance.now()),Math.min(40,Math.max(4,w/2)));
  waiters.add(ck)});
async function gate(){chk();while(S.paused){await sleep(120)}}

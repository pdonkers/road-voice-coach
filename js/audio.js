"use strict";
/* ---------- audio in ---------- */
async function pickDeviceId(){
  const chosen=store.get("mic","");
  if(chosen)return chosen;
  try{
    const ds=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==="audioinput");
    const phone=ds.find(d=>d.label&&!/bluetooth|headset|hands.?free|car|sco/i.test(d.label)&&d.deviceId!=="default"&&d.deviceId!=="communications");
    return phone?phone.deviceId:"";
  }catch(e){return ""}
}
async function ensureCtx(){
  if(!S.ctx){S.ctx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:"interactive"});S.out=S.ctx.createGain();S.out.connect(S.ctx.destination)}
  await S.ctx.resume();
}
const WORKLET="class R extends AudioWorkletProcessor{constructor(){super();this.a=new Float32Array(2048);this.b=new Float32Array(2048);this.n=0}process(i){const x=i[0];if(x&&x[0]){const c0=x[0],c1=x[1]||c0;if(this.n+c0.length>2048)this.n=0;this.a.set(c0,this.n);this.b.set(c1,this.n);this.n+=c0.length;if(this.n>=512){this.port.postMessage([this.a.slice(0,this.n),this.b.slice(0,this.n)]);this.n=0}}return true}}registerProcessor('rvc-in',R)";
async function openMic(){
  await ensureCtx();
  const ns=store.get("ns","0")==="1";
  const base={echoCancellation:false,autoGainControl:false,noiseSuppression:ns};
  let stream=await navigator.mediaDevices.getUserMedia({audio:base});
  const id=await pickDeviceId();
  const curId=stream.getAudioTracks()[0].getSettings().deviceId;
  if(id&&id!==curId){
    try{const s2=await navigator.mediaDevices.getUserMedia({audio:{...base,deviceId:{exact:id}}});stream.getTracks().forEach(t=>t.stop());stream=s2}catch(e){}
  }
  S.stream=stream;
  const c=S.ctx,src=c.createMediaStreamSource(stream);
  /* Road and engine noise is strongest below about 300 Hz and far louder there than a voice.
     A steep high-pass removes it; the pitch is still found from the remaining harmonics. */
  let hp=src;for(let i=0;i<4;i++){const b=c.createBiquadFilter();b.type="highpass";b.frequency.value=340;b.Q.value=0.707;hp.connect(b);hp=b}
  const lp=c.createBiquadFilter();lp.type="lowpass";lp.frequency.value=3200;hp.connect(lp);
  const merge=c.createChannelMerger(2);src.connect(merge,0,0);lp.connect(merge,0,1);
  S.buf=new Float32Array(4096);S.acc=0;S.samp=0;S.clock0=null;
  S.spec=c.createAnalyser();S.spec.fftSize=4096;S.spec.smoothingTimeConstant=0;src.connect(S.spec);
  S.sbuf=new Float32Array(S.spec.frequencyBinCount);
  const mute=c.createGain();mute.gain.value=0;mute.connect(c.destination);
  /* channel 0 = raw mic (recording), channel 1 = filtered (pitch). Analysis runs every 40 ms of audio received, not on a timer. */
  const hop=c.sampleRate*0.04;
  const onChunk=d=>{
    const raw=d[0],fl=d[1],n=raw.length;
    const now=performance.now();
    if(S.lastChunk&&now-S.lastChunk>1500){S.diag.stall+=now-S.lastChunk;diagEv(`no audio from the mic for ${((now-S.lastChunk)/1000).toFixed(1)} s`)}
    S.lastChunk=now;
    let silent=true;for(let i=0;i<n;i+=16){if(raw[i]!==0){silent=false;break}}
    if(silent){S.zeroRun=(S.zeroRun||0)+n/c.sampleRate*1000;S.diag.zero+=n/c.sampleRate*1000;if(S.zeroRun>4000)micAlert()}
    else{if(S.zeroRun>1000)diagEv(`mic gave pure silence for ${(S.zeroRun/1000).toFixed(1)} s`);S.zeroRun=0}
    if(S.rec)S.rec.push(raw);
    if(n>=4096)S.buf.set(fl.subarray(n-4096));else{S.buf.copyWithin(0,n);S.buf.set(fl,4096-n)}
    if(S.clock0==null)S.clock0=clock();
    S.samp+=n;S.acc+=n;
    if(S.acc>=hop){S.acc%=hop;tick()}
    pump();
  };
  try{
    if(!S.wk){await c.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET],{type:"application/javascript"})));S.wk=true}
    const node=new AudioWorkletNode(c,"rvc-in",{numberOfInputs:1,numberOfOutputs:1,channelCount:2,channelCountMode:"explicit",channelInterpretation:"discrete"});
    node.port.onmessage=e=>onChunk(e.data);merge.connect(node);node.connect(mute);S.recNode=node;
  }catch(e){
    const sp=c.createScriptProcessor(512,2,1);sp.onaudioprocess=e=>onChunk([new Float32Array(e.inputBuffer.getChannelData(0)),new Float32Array(e.inputBuffer.getChannelData(1))]);merge.connect(sp);sp.connect(mute);S.recNode=sp;
  }
  S.src=src;S.merge=merge;S.lastChunk=0;S.zeroRun=0;
  const tr=stream.getAudioTracks()[0];tr.onmute=micAlert;tr.onended=micAlert;
  S.dog=setInterval(()=>{if(S.running&&S.lastChunk&&performance.now()-S.lastChunk>3000){S.ctx.resume().catch(()=>{});micAlert()}},1000);
  fillMics();
}
/* Android can cut a web page's microphone when the phone is locked or the app is in the background. Say so instead of failing silently. */
function micAlert(){
  if(!S.running||S.mode!=="session")return;
  const now=performance.now();if(S.alertAt&&now-S.alertAt<60000)return;S.alertAt=now;diagEv("microphone cut off warning");
  ui.say.textContent="The phone cut off the microphone. Open this app on screen to carry on.";
  try{speechSynthesis.speak(utter("I can't hear the microphone any more. The phone may have cut it off. Open the app on screen to carry on."))}catch(e){}
}
function closeMic(){
  clearInterval(S.dog);S.frames=null;S.rec=null;S.specMode=null;S.nAcc=null;S.clock0=null;
  try{S.recNode&&(S.recNode.port?S.recNode.port.onmessage=null:S.recNode.onaudioprocess=null);S.src&&S.src.disconnect();S.merge&&S.merge.disconnect();S.recNode&&S.recNode.disconnect()}catch(e){}
  if(S.stream)S.stream.getTracks().forEach(t=>t.stop());S.stream=null;
}
const recStart=()=>{S.rec=[]};
function recStop(){
  const ch=S.rec||[];S.rec=null;let n=0;for(const c of ch)n+=c.length;
  const out=new Float32Array(n);let o=0;for(const c of ch){out.set(c,o);o+=c.length}
  return out;
}
function bandPower(db,f1,f2){
  const bw=S.ctx.sampleRate/S.spec.fftSize,a=Math.round(f1/bw),b=Math.min(db.length-1,Math.round(f2/bw));
  let s=0;for(let i=a;i<=b;i++)s+=Math.pow(10,db[i]/10);return s/Math.max(1,b-a+1);
}
/* A1-P0: level of the strongest harmonic near the first formant minus the low nasal peak. Lower = more nasal. */
function nasalIndex(db,f0){
  const bw=S.ctx.sampleRate/S.spec.fftSize;
  const H=k=>{const c=Math.round(k*f0/bw);let best=0;for(let i=c-2;i<=c+2;i++){if(i<1||i>=db.length)continue;let pw=Math.pow(10,db[i]/10);if(S.nspec)pw=Math.max(pw-S.nspec[i],pw*0.05);if(pw>best)best=pw}return best>0?10*Math.log10(best):-200};
  let p0=-999,a1=-999;
  for(let k=1;k*f0<1150&&k<12;k++){const f=k*f0,h=H(k);if(f<400||k===1)p0=Math.max(p0,h);if(f>=520)a1=Math.max(a1,h)}
  return (p0>-900&&a1>-900)?a1-p0:null;
}
function tick(){
  let r=0;for(let i=0;i<S.buf.length;i++)r+=S.buf[i]*S.buf[i];r=Math.sqrt(r/S.buf.length);
  let m=null;
  if(r>Math.max(0.0006,S.noise*1.5)){const p=yin(S.buf,S.ctx.sampleRate);if(p&&p.c>0.8&&p.f>65&&p.f<1100)m=ftom(p.f)}
  const f={t:S.clock0+S.samp/S.ctx.sampleRate*1000*SPEED,m,r};
  if(S.nAcc||S.specMode){
    S.spec.getFloatFrequencyData(S.sbuf);
    if(S.nAcc){const a=S.nAcc.sum;for(let i=0;i<a.length;i++)a[i]+=Math.pow(10,S.sbuf[i]/10);S.nAcc.n++}
    if(S.specMode==="nasal"&&m!=null)f.np=nasalIndex(S.sbuf,mtof(m));
    if(S.specMode==="hiss")f.hb=bandPower(S.sbuf,4000,9000);
  }
  if(S.frames)S.frames.push(f);
  if(HP.on){HP.buf.push([performance.now(),m,targetMidi]);if(HP.buf.length>600)HP.buf.splice(0,100)}
  ui.lvl.style.width=Math.min(100,r*2500)+"%";
  if(m!=null){
    ui.you.textContent=nname(m);
    const ref=targetMidi!=null?targetMidi:Math.round(m);
    let c=(m-ref)*100; if(targetMidi!=null)c-=Math.round(c/1200)*1200;
    ui.needle.style.left=(50+Math.max(-50,Math.min(50,c)))+"%";
    ui.needle.style.opacity=1;
    ui.needle.style.background=Math.abs(c)<=8?"var(--good)":Math.abs(c)<=25?"var(--fg)":"var(--warn)";
  }else{ui.needle.style.opacity=.25}
}
async function calibrate(ms){
  S.frames=[];S.nAcc={sum:new Float64Array(S.sbuf.length),n:0};
  await sleep(ms);
  const rs=S.frames.map(f=>f.r);S.frames=null;const acc=S.nAcc;S.nAcc=null;
  if(rs.length)S.noise=Math.max(NOISE_MIN,pct(rs,0.8));
  if(acc.n){S.nspec=acc.sum.map(x=>x/acc.n);const bw=S.ctx.sampleRate/S.spec.fftSize;let s=0,n=0;for(let i=Math.round(4000/bw);i<=Math.min(S.nspec.length-1,Math.round(9000/bw));i++){s+=S.nspec[i];n++}S.hbNoise=n?s/n:0}
}
/* measure how long the speakers take to reach the mic (Bluetooth adds delay), so the coach never hears itself */
async function latencyCheck(){
  S.lat=250;
  try{
    const c=S.ctx,t=c.currentTime+0.25;recStart();
    const o=c.createOscillator(),g=c.createGain();o.frequency.value=1500;g.gain.value=0;g.gain.setValueAtTime(0.5,t);g.gain.setValueAtTime(0,t+0.12);
    o.connect(g);g.connect(S.out);o.start(t);o.stop(t+0.2);
    await sleep(1800*SPEED);
    const pcm=recStop(),sr=c.sampleRate,hop=Math.round(sr*0.01),w=2*Math.cos(2*Math.PI*1500/sr),env=[];
    for(let i=0;i+hop<=pcm.length;i+=hop){let s1=0,s2=0;for(let j=0;j<hop;j++){const s0=pcm[i+j]+w*s1-s2;s2=s1;s1=s0}env.push(s1*s1+s2*s2-w*s1*s2)}
    if(env.length>30){const base=median(env),pk=Math.max(...env);
      if(pk>base*30){const L=env.findIndex(x=>x>pk*0.3)*0.01-0.25;if(L>0.02&&L<1.3)S.lat=Math.round(L*1000)+60}}
  }catch(e){if(e instanceof Stopped)throw e}
}
/* listen until the singer finishes; records the take */
async function listen({max=8000,wait=6000,endSil=1500,spec=null,active=null,count=true,minRun=3}={}){
  await gate();
  const act=active||(f=>f.m!=null);
  /* Once singing has started, sound clearly above the noise floor also counts as "still singing",
     so a moment where the pitch can't be read over road noise doesn't end the take. */
  const alive=active||(f=>f.m!=null||f.r>S.noise*2.2);
  /* Everything is timed on the audio clock the frames carry. Comparing frame times with the wall clock
     ended takes early whenever audio delivery had fallen behind (after any glitch or pause). */
  const at=()=>S.clock0==null?clock():S.clock0+S.samp/S.ctx.sampleRate*1000*SPEED;
  S.specMode=spec;S.frames=[];recStart();
  const t0=at(),w0=clock();let first=0,last=0,idx=0,run=0,end="stop";
  try{
    while(true){
      await sleep(50*SPEED);
      const fr=S.frames;
      for(;idx<fr.length;idx++){
        const f=fr[idx];
        if(act(f)){run++;if(run>=minRun){if(!first)first=f.t-t0;last=f.t-t0}}else run=0;
        if(first&&alive(f))last=Math.max(last,f.t-t0);
      }
      const now=at()-t0;
      if(now>max){end=first?"limit":"none";break}
      if(clock()-w0>max+8000){end="safety";break}
      if(!first&&now>wait){end="none";break}
      if(first&&now-last>endSil&&now-first>600){end="quiet";break}
    }
  }catch(e){if(e instanceof Skip)end="skip";throw e}
  finally{S.specMode=null;diagTake(S.frames,t0,first,last,end,at()-t0,clock()-w0);if(first&&!active&&S.mode==="session")sungAdd((last-first)/1000)}
  const f=S.frames;S.frames=null;
  const pcm=recStop();
  const on=f.filter(act);
  if(!spec||spec==="nasal"){const q=f.filter(x=>x.m==null&&(!first||x.t-t0<first-250)).map(x=>x.r);if(q.length>=8)S.noise=Math.max(NOISE_MIN,0.6*S.noise+0.4*pct(q,0.8))}
  S.lastTake=null;
  if(on.length>=6){
    const sr=S.ctx.sampleRate,a=Math.max(0,Math.floor(((on[0].t-t0)/SPEED/1000-0.25)*sr)),b=Math.min(pcm.length,Math.ceil(((on[on.length-1].t-t0)/SPEED/1000+0.3)*sr));
    if(b-a>sr*0.3){S.lastTake={pcm:pcm.slice(a,b),sr,t0:t0+(a/sr)*1000*SPEED};S.prevTake=S.lastTake}
  }
  if(count){if(on.length<8)S.misses++;else S.misses=0}
  return f;
}
function clipOf(take,from,len){
  const a=Math.min(Math.max(0,take.pcm.length-take.sr*3),Math.floor(from*take.sr)),b=Math.min(take.pcm.length,a+Math.floor(len*take.sr));
  return {pcm:take.pcm.slice(a,b),sr:take.sr,t0:take.t0};
}

/* ---------- audio out ---------- */
/* voice-like sound: a buzzy source through vowel formants, easier to match than a pure tone.
   path = [[seconds, midi], ...] glides between points; vz picks the vowel shape. */
const VOWF={ah:[[700,110,1],[1150,120,0.6],[2700,180,0.3]],oo:[[320,80,1],[800,100,0.4],[2300,160,0.1]],
  ee:[[290,70,1],[2250,150,0.5],[2950,200,0.3]],eh:[[550,90,1],[1800,140,0.5],[2550,180,0.25]],oh:[[450,90,1],[850,110,0.5],[2500,180,0.12]],
  uh:[[600,100,1],[1250,120,0.6],[2500,180,0.3]],hum:[[260,80,1],[1000,220,0.1],[2400,300,0.04]],ng:[[280,90,1],[1100,250,0.07],[2500,300,0.05]]};
function noiseSrc(t,d){
  const c=S.ctx;
  if(!S.nz||S.nz.sampleRate!==c.sampleRate){const b=c.createBuffer(1,c.sampleRate*2,c.sampleRate),x=b.getChannelData(0);for(let i=0;i<x.length;i++)x[i]=Math.random()*2-1;S.nz=b}
  const n=c.createBufferSource();n.buffer=S.nz;n.loop=true;n.start(t);n.stop(t+d+0.2);return n;
}
function synth(t,d,{path,vz="ah",vol=0.85,flutter=0,swell=false,breath=0,short=false}){
  const c=S.ctx,f0=mtof(path[0][1]),g=c.createGain();g.connect(S.out);
  if(swell){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol*0.15,t+0.1);g.gain.linearRampToValueAtTime(vol,t+d*0.5);g.gain.linearRampToValueAtTime(vol*0.12,t+d-0.1);g.gain.linearRampToValueAtTime(0,t+d)}
  else{const a=short?0.02:0.05;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+a);g.gain.setTargetAtTime(vol*0.85,t+a+0.03,0.25);g.gain.setTargetAtTime(0,t+d-0.07,short?0.02:0.035)}
  let dest=g;
  if(flutter){const fl=c.createGain();fl.gain.value=0.6;fl.connect(g);const l=c.createOscillator();l.type="square";l.frequency.value=flutter;
    const lg=c.createGain();lg.gain.value=0.4;l.connect(lg);lg.connect(fl.gain);l.start(t);l.stop(t+d+0.3);dest=fl}
  const o=c.createOscillator();o.type="sawtooth";const o2=c.createOscillator();o2.type="sine";
  for(const os of [o,o2]){os.frequency.setValueAtTime(f0,t);for(const [sec,m] of path.slice(1))os.frequency.exponentialRampToValueAtTime(mtof(m),t+sec)}
  const closed=vz==="hum"||vz==="ng";
  const tilt=c.createBiquadFilter();tilt.type="lowpass";tilt.frequency.value=closed?700:Math.max(1200,f0*5);tilt.Q.value=0.4;o.connect(tilt);
  (VOWF[vz]||VOWF.ah).forEach(([fc,bw,a],i)=>{
    const b=c.createBiquadFilter();b.type="bandpass";b.frequency.value=(i===0&&vz==="ah")?Math.max(fc,f0*1.05):fc;b.Q.value=fc/bw;
    const ga=c.createGain();ga.gain.value=a*2.2;tilt.connect(b);b.connect(ga);ga.connect(dest)});
  const g2=c.createGain();g2.gain.value=closed?0.5:0.3;o2.connect(g2);g2.connect(dest);
  if(breath){const n=noiseSrc(t,d),bp=c.createBiquadFilter();bp.type="bandpass";bp.frequency.value=1600;bp.Q.value=0.6;const ng=c.createGain();ng.gain.value=breath;n.connect(bp);bp.connect(ng);ng.connect(dest)}
  o.start(t);o2.start(t);o.stop(t+d+0.3);o2.stop(t+d+0.3);
}
function tone(m,t,d,vol=0.85,vz="ah"){synth(t,d,{path:[[0,m]],vol,vz,short:d<0.3})}
const durOf=(d,i)=>Array.isArray(d)?d[i]:d;
async function play(ms,durs=0.75,gap=0.06,vz="ah"){
  await gate();const t0=S.ctx.currentTime+0.06;let t=0;
  ms.forEach((m,i)=>{const d=durOf(durs,i);tone(m,t0+t,d,0.85,vz);const at=t;setTimeout(()=>{if(!S.stop)setTarget(m)},(0.06+at)*1000/SPEED);t+=d+gap});
  await sleep(t*1000+200+S.lat);
}
/* spoken instructions alone were unclear for some exercises, so these play what the exercise should sound like */
const DEMO={
  async run(d,fn){await gate();fn(S.ctx.currentTime+0.06);await sleep(d*1000+250+S.lat)},
  trill(p){return this.run(3.4,t=>synth(t,3.4,{path:[[0,p.home-4],[1.5,p.home+6],[3.2,p.home-4]],vz:"hum",flutter:24,vol:0.95}))},
  siren(p){return this.run(3.6,t=>synth(t,3.6,{path:[[0,p.home-5],[1.7,p.home+9],[3.4,p.home-5]],vz:"oo"}))},
  ngah(notes){return this.run(notes.length*1.5,t=>notes.forEach((m,i)=>{const a=t+i*1.5;synth(a,0.62,{path:[[0,m]],vz:"ng",vol:0.8});synth(a+0.52,0.8,{path:[[0,m]]});setTimeout(()=>{if(!S.stop)setTarget(m)},i*1500/SPEED)}))},
  /* "hung": a short uh, the N G held, then the jaw drops open to ah */
  hung(notes){return this.run(notes.length*1.9,t=>notes.forEach((m,i)=>{const a=t+i*1.9;synth(a,0.32,{path:[[0,m]],vz:"uh",vol:0.8});synth(a+0.27,0.7,{path:[[0,m]],vz:"ng",vol:0.8});synth(a+0.9,0.9,{path:[[0,m]]});setTimeout(()=>{if(!S.stop)setTarget(m)},i*1900/SPEED)}))},
  uhah(m){return this.run(2.4,t=>{synth(t,1.0,{path:[[0,m]],vz:"uh",vol:0.8});synth(t+0.9,1.3,{path:[[0,m]]});setTarget(m)})},
  /* the dopey cartoon-bear uh-ah, sagging a little in pitch */
  yogi(m){return this.run(2.2,t=>{synth(t,0.85,{path:[[0,m],[0.8,m-1]],vz:"uh",vol:0.85});synth(t+0.75,1.3,{path:[[0,m-1],[1.2,m-2]]});setTarget(m)})},
  staccato(m){return this.run(5*0.42,t=>{for(let i=0;i<5;i++)tone(m,t+i*0.42,0.22);setTarget(m)})},
  swell(m){return this.run(4,t=>{synth(t,4,{path:[[0,m]],swell:true});setTarget(m)})},
  breathy(m){return this.run(1.6,t=>{synth(t,1.6,{path:[[0,m]],vol:0.3,breath:0.55});setTarget(m)})},
  vowel(m,vz){return this.run(1.6,t=>{synth(t,1.6,{path:[[0,m]],vz});setTarget(m)})},
  choppy(ms){return this.run(ms.length*0.62,t=>ms.forEach((m,i)=>tone(m,t+i*0.62,0.3)))},
  smooth(ms){return this.run(ms.length*0.62+0.2,t=>synth(t,ms.length*0.62+0.2,{path:[[0,ms[0]]].concat(ms.slice(1).flatMap((m,i)=>[[(i+1)*0.62-0.07,ms[i]],[(i+1)*0.62+0.07,m]]))}))},
  /* a note that starts with an audible H: breath noise first, then the tone fades in */
  onsetH(m){return this.run(1.3,t=>{const c=S.ctx,n=noiseSrc(t,0.4),bp=c.createBiquadFilter();bp.type="bandpass";bp.frequency.value=1500;bp.Q.value=0.7;const g=c.createGain();
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.35,t+0.03);g.gain.setValueAtTime(0.35,t+0.2);g.gain.linearRampToValueAtTime(0,t+0.36);n.connect(bp);bp.connect(g);g.connect(S.out);
    synth(t+0.22,1.0,{path:[[0,m]],vol:0.8});setTarget(m)})},
  /* a note that starts with a click: a tiny burst, then the tone at full level at once */
  onsetHard(m){return this.run(1.2,t=>{const c=S.ctx,n=noiseSrc(t,0.05),g=c.createGain();g.gain.setValueAtTime(0.9,t);g.gain.setTargetAtTime(0,t+0.006,0.004);n.connect(g);g.connect(S.out);
    synth(t+0.005,1.1,{path:[[0,m]],vol:1,short:true});setTarget(m)})},
  hiss(){return this.run(2,t=>{const c=S.ctx,n=noiseSrc(t,2),hp=c.createBiquadFilter();hp.type="highpass";hp.frequency.value=4500;const g=c.createGain();
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.25,t+0.08);g.gain.setValueAtTime(0.25,t+1.8);g.gain.linearRampToValueAtTime(0,t+2);n.connect(hp);hp.connect(g);g.connect(S.out)})}
};
/* Real singers: short clips cut from VocalSet (CC BY 4.0, see audio/CREDITS.md). */
const CLIPS=["lip-trill","breathy","clear","swell","vibrato","smooth","separate","vowel-ah","vowel-eh","vowel-ee","vowel-oh","vowel-oo","soft","full","song-plain","song-vibrato"];
const clipBuf=new Map();
async function loadClip(name){
  if(clipBuf.has(name))return clipBuf.get(name);
  const pr=(async()=>{const r=await fetch(`audio/${name}.mp3`);if(!r.ok)throw new Error("clip "+r.status);return await S.ctx.decodeAudioData(await r.arrayBuffer())})();
  clipBuf.set(name,pr);pr.catch(()=>clipBuf.delete(name));return pr;
}
function preloadClips(){for(const n of CLIPS)loadClip(n).catch(()=>{})}
/* plays a real clip; if it is unavailable, plays the synthesized fallback instead */
async function real(name,fallback){
  try{
    await gate();
    const b=await Promise.race([loadClip(name),new Promise((_,rej)=>after(4000/SPEED,()=>rej(new Error("slow"))))]);
    const src=S.ctx.createBufferSource(),g=S.ctx.createGain();src.buffer=b;g.gain.value=1.2;src.connect(g);g.connect(S.out);src.start(S.ctx.currentTime+0.05);
    await sleep(b.duration*1000+250+S.lat);return true;
  }catch(e){if(e instanceof Stopped||e instanceof Skip)throw e;if(fallback)await fallback();return false}
}
function bufOf(take,norm=true){
  const b=S.ctx.createBuffer(1,take.pcm.length,take.sr);b.copyToChannel(take.pcm,0);
  let pk=0;if(norm)for(let i=0;i<take.pcm.length;i+=4){const v=Math.abs(take.pcm[i]);if(v>pk)pk=v}
  return {b,gain:norm?Math.min(14,0.85/(pk||1)):1};
}
function playBuf(take,when,rate=1){
  const {b,gain}=bufOf(take),src=S.ctx.createBufferSource(),g=S.ctx.createGain();
  src.buffer=b;src.playbackRate.value=rate;g.gain.value=gain;src.connect(g);g.connect(S.out);src.start(when);
  return b.duration/rate;
}
async function playTake(take){
  if(!take)return;await gate();
  const d=playBuf(take,S.ctx.currentTime+0.05);
  await sleep(d*1000+250+S.lat);
}
async function blip(){
  const c=S.ctx,t=c.currentTime+0.03,o=c.createOscillator(),g=c.createGain();
  o.type="sine";o.frequency.value=660;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.18,t+0.01);g.gain.setTargetAtTime(0,t+0.05,0.02);
  o.connect(g);g.connect(S.out);o.start(t);o.stop(t+0.25);
  await sleep(350+S.lat);
}
async function clicks(n,beat){
  await gate();const c=S.ctx,t0=c.currentTime+0.08;
  for(let i=0;i<n;i++){const t=t0+i*beat,o=c.createOscillator(),g=c.createGain();o.type="square";o.frequency.value=i===0?1400:1000;
    g.gain.setValueAtTime(0.35,t);g.gain.setTargetAtTime(0,t+0.015,0.012);o.connect(g);g.connect(S.out);o.start(t);o.stop(t+0.12)}
  await sleep((n*beat)*1000-120+S.lat);
}
function utter(text){
  const u=new SpeechSynthesisUtterance(text);u.lang="en-GB";if(S.voice)u.voice=S.voice;u.rate=1.0;return u;
}
async function speak(text,caption=true){
  await gate();
  if(caption)ui.say.textContent=text;
  return new Promise((res,rej)=>{
    let done=false;
    const fin=()=>{if(done)return;done=true;waiters.delete(poll);clearInterval(iv);offTo();try{chk()}catch(e){return rej(e)}after((150+S.lat)/SPEED,res)};
    const poll=()=>{if(S.stop||S.skip||S.wind){try{speechSynthesis.cancel()}catch(e){}fin()}};
    const iv=setInterval(poll,100);waiters.add(poll);
    let offTo=after((2500+text.length*95)/SPEED,()=>{S.diag.tts++;diagEv("coach voice did not finish speaking");fin()});
    if(!("speechSynthesis" in window)){offTo();offTo=after((1200+text.length*60)/SPEED,fin);return}
    const u=utter(text);u.onend=fin;u.onerror=fin;speechSynthesis.speak(u);
  });
}
function loadVoices(){
  const vs=(speechSynthesis.getVoices()||[]).filter(v=>/^en/i.test(v.lang));
  const want=store.get("voice","");
  S.voice=vs.find(v=>v.name===want)||vs.find(v=>/en-GB/i.test(v.lang))||vs[0]||null;
  const sel=$("voiceSel");const cur=sel.value||want;
  sel.innerHTML='<option value="">Default English voice</option>'+vs.map(v=>`<option value="${v.name.replace(/"/g,"&quot;")}">${v.name} (${v.lang})</option>`).join("");
  sel.value=cur;
}
if("speechSynthesis" in window){loadVoices();speechSynthesis.onvoiceschanged=loadVoices}

/* ---------- own-voice note bank and saved clips ---------- */
async function loadBank(){
  S.bank=new Map();
  try{const d=await idb.open();await new Promise(res=>{const t=d.transaction("notes","readonly"),s=t.objectStore("notes"),q=s.openCursor();
    q.onsuccess=()=>{const c=q.result;if(c){S.bank.set(c.key,c.value);c.continue()}};t.oncomplete=res;t.onerror=res})}catch(e){}
}
const ownFor=m=>S.bank.get(m)||S.bank.get(m-12)||S.bank.get(m+12);
function bankMaybe(a,take,o){
  const s=a.single;
  if(!s||!take||o.own===false||o.words||o.swell||a.avg>=15||s.sd>=16||a.vib||s.end-s.start<700)return;
  const key=Math.round(s.p),old=S.bank.get(key);
  if(old&&old.err<=a.avg)return;
  const sr=take.sr,i0=Math.max(0,Math.floor(((s.start-take.t0)/SPEED/1000+0.15)*sr)),i1=Math.min(take.pcm.length,Math.min(Math.floor(((s.end-take.t0)/SPEED/1000-0.06)*sr),i0+Math.floor(1.5*sr)));
  if(i1-i0<sr*0.45)return;
  const pcm=take.pcm.slice(i0,i1),fade=Math.floor(sr*0.03);let pk=0;
  for(let i=0;i<pcm.length;i++){if(i<fade)pcm[i]*=i/fade;if(i>=pcm.length-fade)pcm[i]*=(pcm.length-1-i)/fade;const v=Math.abs(pcm[i]);if(v>pk)pk=v}
  if(pk<0.003)return;
  const g=Math.min(14,0.8/pk);for(let i=0;i<pcm.length;i++)pcm[i]*=g;
  const v={pcm,sr,p:s.p,err:a.avg};S.bank.set(key,v);idb.put("notes",v,key);
}
async function playOwn(ms){
  await gate();let t=S.ctx.currentTime+0.06,tot=0.06;
  ms.forEach((m,i)=>{const e=ownFor(m),near=[m,m-12,m+12].reduce((a,b)=>Math.abs(b-e.p)<Math.abs(a-e.p)?b:a);
    const d=playBuf(e,t,Math.pow(2,(near-e.p)/12));setTimeout(()=>{if(!S.stop)setTarget(m)},tot*1000/SPEED);t+=d+0.12;tot+=d+0.12});
  await sleep(tot*1000+200+S.lat);
}
/* nas: the nasality measure's score for the take (0 to 100, 100 = open), kept so Paul can check it against his ear (Progress, "Check the nasality measure") */
async function addClip(label,take,nas=null){
  if(!take||!take.pcm||take.pcm.length<take.sr*0.3)return;
  const old=await idb.all("clips"),rec={t:Date.now(),label,pcm:take.pcm,sr:take.sr,nas};
  await idb.put("clips",rec);
  /* the first take of each label is kept for good, as a marked copy, for the then-and-now comparison; an older clip of the label (from before this existed) is the better first */
  if(!old.some(c=>c.label===label&&c.first)){const o=old.filter(c=>c.label===label).sort((a,b)=>a.t-b.t)[0]||rec;await idb.put("clips",{t:o.t,label,pcm:o.pcm,sr:o.sr,nas:o.nas==null?null:o.nas,first:true})}
  const all=await idb.all("clips"),norm=all.filter(c=>!c.first),use=l=>Math.max(0,...norm.filter(c=>c.label===l).map(c=>c.t));
  /* scored takes have their own allowance, so rating material does not push the best takes and free singing out */
  for(const c of norm.filter(c=>c.nas==null).sort((a,b)=>b.t-a.t).slice(20))idb.del("clips",c.id);
  for(const c of norm.filter(c=>c.nas!=null).sort((a,b)=>b.t-a.t).slice(20))idb.del("clips",c.id);
  /* past 12 labels the first clip of the label used longest ago goes, so free singing stays */
  for(const c of all.filter(c=>c.first).sort((a,b)=>use(b.label)-use(a.label)).slice(12))idb.del("clips",c.id);
}

"use strict";
/* ---------- home practice: a live pitch graph (never in the car: it needs the screen) ---------- */
/* Runs like the mic test (no session, no singing time, no diagnostics). tick() adds [time, pitch, target] to HP.buf while HP.on; a requestAnimationFrame loop draws
   the last 8 seconds, right to left, over a guide line for each semitone of the range. The line is green within 25 cents of the target (octaves folded), otherwise
   orange, and neutral when there is no target. Colours come from the CSS variables on every frame, so the theme and a resize are followed. */
const HP={on:false,buf:[],raf:0,drone:null,cv:$("hpCv"),p:{home:55,low:48,high:64},w:0,h:0};
const HP_SEC=8000;
function hpFit(){
  const c=HP.cv,r=c.getBoundingClientRect(),d=window.devicePixelRatio||1;if(!r.width)return false;
  const W=Math.round(r.width*d),H=Math.round(r.height*d);if(c.width!==W||c.height!==H){c.width=W;c.height=H}
  HP.w=r.width;HP.h=r.height;HP.d=d;return true;
}
function hpDraw(){
  if(!hpFit())return;
  const g=HP.cv.getContext("2d"),w=HP.w,h=HP.h,cs=getComputedStyle(document.documentElement),v=(k,d)=>cs.getPropertyValue(k).trim()||d,
    line=v("--line","#24302f"),dim=v("--dim","#8a9a96"),fg=v("--fg","#e6ece9"),good=v("--good","#5fd3a0"),warn=v("--warn","#f07a5a"),amber=v("--amber","#f2b33d"),mono=v("--mono","monospace");
  const L=30,R=8,T=8,B=8,lo=HP.p.low-1,hi=HP.p.high+1,Y=m=>T+(h-T-B)*(1-(m-lo)/(hi-lo)),now=performance.now(),X=t=>L+(w-L-R)*(1-(now-t)/HP_SEC),px=(h-T-B)/(hi-lo);
  g.setTransform(HP.d,0,0,HP.d,0,0);g.clearRect(0,0,w,h);
  g.textBaseline="middle";g.font=`10px ${mono}`;
  /* the target's label always shows; the others only when there is room (note names 11 px apart or more) */
  let ly=targetMidi!=null&&targetMidi>=HP.p.low&&targetMidi<=HP.p.high?[Y(targetMidi)]:[];
  const room=y=>ly.every(q=>Math.abs(q-y)>=11);
  for(let m=HP.p.low;m<=HP.p.high;m++){
    const t=m===targetMidi,nat=!nname(m).includes("#"),y=Y(m);
    g.strokeStyle=t?amber:line;g.lineWidth=t?2:1;g.beginPath();g.moveTo(L,y);g.lineTo(w-R,y);g.stroke();
    if(t||((nat||px>=13)&&room(y))){if(!t)ly.push(y);g.fillStyle=t?amber:dim;g.font=`${t?"700 ":""}10px ${mono}`;g.textAlign="right";g.fillText(nname(m),L-5,y)}
  }
  g.save();g.beginPath();g.rect(L,0,w-L,h);g.clip();
  g.lineWidth=3;g.lineCap="round";g.lineJoin="round";
  const b=HP.buf;while(b.length&&now-b[0][0]>HP_SEC+500)b.shift();
  let prev=null;
  for(const q of b){
    if(q[1]==null){prev=null;continue}
    const y=Y(clamp(q[1],lo,hi)),x=X(q[0]);let col=fg;
    if(q[2]!=null){let c=(q[1]-q[2])*100;c-=Math.round(c/1200)*1200;col=Math.abs(c)<=25?good:warn}
    g.strokeStyle=col;g.fillStyle=col;
    if(prev&&q[0]-prev[0]<=250){g.beginPath();g.moveTo(X(prev[0]),prev[1]);g.lineTo(x,y);g.stroke();prev=[q[0],y]}
    else{g.beginPath();g.arc(x,y,1.5,0,7);g.fill();prev=[q[0],y]}
  }
  g.restore();
}
function hpFrame(){if(!HP.on)return;hpDraw();HP.raf=requestAnimationFrame(hpFrame)}
function hpSet(m){
  const p=HP.p;m=clamp(m,p.low,p.high);setTarget(m);$("hpNote").textContent=nname(m);
  if(HP.drone)HP.drone.o.frequency.setTargetAtTime(mtof(m),S.ctx.currentTime,0.03),HP.drone.o2.frequency.setTargetAtTime(mtof(m),S.ctx.currentTime,0.03);
}
/* a soft steady note at the target: a buzzy and a pure oscillator through a low-pass filter, kept quiet so the singer's own voice stays on top */
function hpDroneSet(on){
  const b=$("hpDrone");b.setAttribute("aria-pressed",on?"true":"false");b.textContent=on?"Drone: on":"Drone: off";
  if(on&&!HP.drone&&S.ctx){
    const c=S.ctx,t=c.currentTime,g=c.createGain(),lp=c.createBiquadFilter(),o=c.createOscillator(),o2=c.createOscillator(),g2=c.createGain(),f=mtof(targetMidi);
    o.type="sawtooth";o2.type="sine";o.frequency.value=f;o2.frequency.value=f;lp.type="lowpass";lp.frequency.value=900;g2.gain.value=0.6;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(0.1,t+0.3);
    o.connect(lp);lp.connect(g);o2.connect(g2);g2.connect(g);g.connect(S.out);o.start(t);o2.start(t);HP.drone={o,o2,g};
  }else if(!on&&HP.drone){
    const d=HP.drone,t=S.ctx.currentTime;HP.drone=null;d.g.gain.cancelScheduledValues(t);d.g.gain.setValueAtTime(d.g.gain.value,t);d.g.gain.linearRampToValueAtTime(0,t+0.15);
    d.o.stop(t+0.2);d.o2.stop(t+0.2);setTimeout(()=>{try{d.g.disconnect()}catch(e){}},400);
  }
}
function hpStart(){
  const p=profile()||{home:55,low:48,high:64};HP.p=p;HP.buf=[];HP.on=true;$("hpBox").hidden=false;document.querySelector(".wrap").classList.add("hpmode");
  hpSet(p.home);hpDroneSet(false);hpFit();cancelAnimationFrame(HP.raf);HP.raf=requestAnimationFrame(hpFrame);
}
function hpStop(){
  if(!HP.on&&!HP.drone)return;
  hpDroneSet(false);HP.on=false;cancelAnimationFrame(HP.raf);HP.buf=[];$("hpBox").hidden=true;document.querySelector(".wrap").classList.remove("hpmode");
}
$("hpDn").onclick=()=>{if(HP.on)hpSet(targetMidi-1)};
$("hpUp").onclick=()=>{if(HP.on)hpSet(targetMidi+1)};
$("hpPlay").onclick=()=>{if(HP.on&&S.ctx)tone(targetMidi,S.ctx.currentTime+0.05,1.4)};
$("hpDrone").onclick=()=>{if(HP.on)hpDroneSet(!HP.drone)};
window.addEventListener("resize",()=>{if(HP.on)hpDraw()});

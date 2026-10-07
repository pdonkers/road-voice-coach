"use strict";
/* ---------- progress page ---------- */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function niceStep(x){const p=Math.pow(10,Math.floor(Math.log10(x||1))),n=x/p;return (n<=1?1:n<=2?2:n<=5?5:10)*p}
function lineChart(title,note,unit,pts){
  const fig=document.createElement("figure");fig.className="chart";
  const cap=`<figcaption>${esc(title)} <small>${esc(note)}</small></figcaption>`;
  if(!pts.length){fig.innerHTML=cap+`<p class="hint">No data yet.</p>`;return fig}
  const W=320,H=130,L=30,R=46,T=10,B=22,ys=pts.map(p=>p.y);
  let lo=Math.min(...ys),hi=Math.max(...ys);if(hi-lo<1e-9){lo-=1;hi+=1}
  const step=niceStep((hi-lo)/3);lo=Math.floor(lo/step)*step;hi=Math.ceil(hi/step)*step;
  const X=i=>pts.length===1?L+(W-L-R)/2:L+(W-L-R)*i/(pts.length-1),Y=v=>T+(H-T-B)*(1-(v-lo)/(hi-lo));
  const fmt=v=>Math.abs(v)>=10||Number.isInteger(v)?String(Math.round(v)):v.toFixed(1);
  let g="";for(let v=lo;v<=hi+step/2;v+=step)g+=`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${L-6}" y="${Y(v)+3.5}" text-anchor="end" class="tick">${fmt(v)}</text>`;
  const d=pts.map((p,i)=>`${i?"L":"M"}${X(i).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(" ");
  const last=pts[pts.length-1],lx=X(pts.length-1),ly=Y(last.y);
  fig.innerHTML=cap+`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">${g}
    <line class="cross" y1="${T}" y2="${H-B}" hidden/><path d="${d}" class="ln"/>
    <circle cx="${lx}" cy="${ly}" r="5" class="dot"/><text x="${lx+9}" y="${ly+4}" class="val">${fmt(last.y)}${esc(unit)}</text>
    <text x="${pts.length>1?L:X(0)}" y="${H-5}" ${pts.length>1?"":'text-anchor="middle"'} class="tick">${esc(pts[0].x)}</text>${pts.length>1?`<text x="${W-R}" y="${H-5}" text-anchor="end" class="tick">${esc(last.x)}</text>`:""}
    <circle class="hov" r="5" hidden/></svg><div class="tip" hidden></div>
    <details><summary>Table</summary><table><tr><th>Session</th><th>${esc(title)}</th></tr>${pts.map(p=>`<tr><td>${esc(p.x)}</td><td>${esc(p.tip||fmt(p.y)+unit)}</td></tr>`).join("")}</table></details>`;
  const svg=fig.querySelector("svg"),cross=fig.querySelector(".cross"),hov=fig.querySelector(".hov"),tip=fig.querySelector(".tip");
  const move=e=>{const r=svg.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*W;let bi=0;pts.forEach((_,i)=>{if(Math.abs(X(i)-x)<Math.abs(X(bi)-x))bi=i});
    cross.setAttribute("x1",X(bi));cross.setAttribute("x2",X(bi));hov.setAttribute("cx",X(bi));hov.setAttribute("cy",Y(pts[bi].y));
    cross.removeAttribute("hidden");hov.removeAttribute("hidden");tip.hidden=false;tip.textContent=`${pts[bi].x}: ${pts[bi].tip||fmt(pts[bi].y)+unit}`};
  const out=()=>{cross.setAttribute("hidden","");hov.setAttribute("hidden","");tip.hidden=true};
  svg.addEventListener("pointermove",move);svg.addEventListener("pointerdown",move);svg.addEventListener("pointerleave",out);
  return fig;
}
function vowelChart(){
  const fig=document.createElement("figure");fig.className="chart";
  const rows=VOW.map(v=>({v,st:D.vow[v.k]})).filter(x=>x.st&&x.st.n>=2);
  const cap=`<figcaption>Pitch by vowel <small>average cents flat or sharp</small></figcaption>`;
  if(!rows.length){fig.innerHTML=cap+`<p class="hint">No data yet.</p>`;return fig}
  const vals=rows.map(x=>x.st.sum/x.st.n),mx=Math.max(40,...vals.map(Math.abs));
  fig.innerHTML=cap+`<div class="vbars">`+rows.map((x,i)=>{const b=vals[i],w=Math.abs(b)/mx*24,lab=`${Math.round(Math.abs(b))}¢ ${b<0?"flat":"sharp"}`;
    return `<span>${esc(x.v.k)}</span><div class="track" title="${esc(x.v.k)}: ${lab} over ${x.st.n} takes"><div class="bar ${b<0?"f":"s"}" style="width:${w.toFixed(1)}%"></div><span class="num" style="${b<0?`right:${(52+w).toFixed(1)}%`:`left:${(52+w).toFixed(1)}%`}">${lab}</span></div>`}).join("")+
    `</div><div class="legend"><span><i style="background:var(--flat)"></i>flat</span><span><i style="background:var(--sharp)"></i>sharp</span></div>`;
  return fig;
}
/* the weak-note map: one bar per semitone of the range, height = average cents off; notes with under 3 takes are faint, the two weakest (5 takes or more) amber */
function noteChart(){
  const fig=document.createElement("figure");fig.className="chart";
  const cap=`<figcaption>Notes <small>average cents off on each note of your range, lower is better</small></figcaption>`;
  const p=profile(),nt=D.notes||{};
  if(!p||!Object.keys(nt).length){fig.innerHTML=cap+`<p class="hint">No data yet. It fills as you practise notes, scales and intervals.</p>`;return fig}
  const ms=[];for(let m=p.low;m<=p.high;m++)ms.push(m);
  const W=320,H=130,L=30,R=8,T=10,B=22,bw=(W-L-R)/ms.length,vals=ms.map(m=>nt[m]?nt[m].err:0);
  const step=niceStep(Math.max(50,...vals)/3),hi=Math.ceil(Math.max(50,...vals)/step)*step,Y=v=>T+(H-T-B)*(1-v/hi);
  const w2=weakIn(p.low,p.high,2),weak=w2.map(x=>x.m),every=ms.length<=24?2:3;
  let g="";for(let v=0;v<=hi+step/2;v+=step)g+=`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${L-6}" y="${Y(v)+3.5}" text-anchor="end" class="tick">${Math.round(v)}</text>`;
  const bars=ms.map((m,i)=>{const k=nt[m],x=L+i*bw,lab=i%every===0?`<text x="${(x+bw/2).toFixed(1)}" y="${H-5}" text-anchor="middle" class="tick">${nname(m)}</text>`:"";
    if(!k)return lab;const y=Y(Math.min(k.err,hi));
    return `<rect x="${(x+1).toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(1,bw-2).toFixed(1)}" height="${(Y(0)-y).toFixed(1)}" class="nb${weak.includes(m)?" w":""}${k.n<3?" f":""}"><title>${nname(m)}: ${Math.round(k.err)}¢ off over ${k.n} take${k.n===1?"":"s"}</title></rect>`+lab}).join("");
  const name=x=>`${nname(x.m)} (${Math.round(x.err)}¢)`;
  const line=w2.length?`Hardest for you: ${w2.map(name).join(" and ")}.`:"Once a note has five takes, the hardest ones show here.";
  fig.innerHTML=cap+`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Average cents off for each note from ${nname(p.low)} to ${nname(p.high)}">${g}${bars}</svg><p class="hint" style="margin-top:6px">${esc(line)}</p>`;
  return fig;
}
async function renderProgress(){
  const h=store.get("history",[]),box=$("charts");box.innerHTML="";
  const lab=(x,i)=>x.d.slice(5)+(h.filter((y,j)=>j<i&&y.d===x.d).length?"·"+(h.filter((y,j)=>j<i&&y.d===x.d).length+1):"");
  const series=(f,tip)=>h.map((x,i)=>({x:lab(x,i),y:f(x),tip:tip?tip(x):null})).filter(p=>p.y!=null&&isFinite(p.y));
  {const days=daysNow(false),t=dayN(today()),mon=weekStart(t),k=streakOf(days),pr=document.createElement("p"),wk=document.createElement("div");
    pr.className="hint";pr.textContent=`This week: ${weekDays(days,mon)} of ${goalDays()} days. Streak: ${k} day${k===1?"":"s"}.`;
    wk.className="weeks";wk.setAttribute("role","group");wk.setAttribute("aria-label","Practice days in the last 8 weeks, oldest first");
    const set=new Set(days.map(dayN));
    for(let w=7;w>=0;w--){const m=mon-7*w,col=document.createElement("div");let c=0;
      for(let i=0;i<7;i++){const q=document.createElement("i");if(set.has(m+i)){q.className="on";c++}else if(m+i>t)q.className="fut";col.append(q)}
      col.setAttribute("role","img");col.setAttribute("aria-label",`Week of ${dayS(m).slice(5)}: ${c} of 7 days`);wk.append(col)}
    box.append(pr,wk)}
  {const m=sungMax(),k=Math.round(sungS()/60),sp=document.createElement("p");sp.className="hint";sp.textContent=m?`Singing today: ${k} of ${m} minutes.`:`Singing today: ${k} minute${k===1?"":"s"}.`;box.append(sp)}
  const p=profile();
  if(p){const d=document.createElement("p");d.className="hint";d.textContent=`Range ${nname(p.low)} to ${nname(p.high)}, comfortable note ${nname(p.home)}. Levels: notes ${lvl("pm")}, scales ${lvl("sc")}, intervals ${lvl("iv")}, long notes ${lvl("lt")}.`+(D.brk&&D.brk.length?` Your voice tends to flip around ${nname(median(D.brk))}.`:"");box.append(d)}
  box.append(lineChart("Pitch error","average cents off per session, lower is better","¢",series(x=>x.err)));
  box.append(lineChart("Nasality measure","experimental, 100 = your open sound","",series(x=>x.nasal)));
  box.append(vowelChart());
  box.append(noteChart());
  box.append(lineChart("Range","semitones from lowest to highest note"," st",series(x=>x.low!=null?x.high-x.low:null,x=>`${nname(x.low)} to ${nname(x.high)}`)));
  box.append(lineChart("Breath","longest steady S, seconds"," s",series(x=>x.hiss)));
  box.append(lineChart("Longest note","seconds held"," s",series(x=>x.hold)));
  const all=(await idb.all("clips")).sort((a,b)=>b.t-a.t),clips=all.filter(c=>!c.first),cb=$("clips");cb.innerHTML="";
  /* then and now: the first take of a label against its newest one, once they are a week apart */
  const tn=$("thenNowList");tn.innerHTML="";
  for(const f of all.filter(c=>c.first).sort((a,b)=>a.label<b.label?-1:1)){
    const n=clips.find(c=>c.label===f.label);if(!n||n.t-f.t<7*864e5)continue;
    const row=document.createElement("div"),r=document.createElement("div"),dt=c=>new Date(c.t).toISOString().slice(5,10);row.className="tn";r.className="row";
    const nm=document.createElement("b");nm.textContent=f.label;nm.style.fontWeight="500";
    for(const [txt,list] of [[`▶ First (${dt(f)})`,[f]],[`▶ Latest (${dt(n)})`,[n]],["▶ Both",[f,n]]]){
      const b=document.createElement("button");b.type="button";b.className="btn";b.textContent=txt;
      b.onclick=async()=>{if(S.running)return;await ensureCtx();let at=S.ctx.currentTime+0.05;for(const c of list)at+=playBuf(c,at)+0.7};r.append(b)}
    row.append(nm,r);tn.append(row)}
  $("thenNow").hidden=!tn.children.length;
  if(!clips.length){cb.innerHTML=`<p class="hint">Takes from your sessions appear here: best takes, nasal and lifted pairs, and free singing.</p>`;return}
  for(const c of clips){const b=document.createElement("button");b.type="button";b.className="btn";
    const dt=new Date(c.t);b.innerHTML=`<span>▶ ${esc(c.label)}</span><small>${dt.toISOString().slice(5,10)} · ${(c.pcm.length/c.sr).toFixed(0)} s</small>`;
    b.onclick=async()=>{if(S.running)return;await ensureCtx();playBuf(c,S.ctx.currentTime+0.05)};cb.append(b)}
}
/* Check the nasality measure against the ear: takes saved with a score (clip.nas) are played back in random order and rated 1 to 5 (rvc_nasRate = {clip time: rating}); from 8 ratings on, a Spearman correlation says whether the score follows the ear. */
function ranks(a){const o=a.map((v,i)=>[v,i]).sort((x,y)=>x[0]-y[0]),r=[];for(let i=0;i<o.length;){let j=i;while(j+1<o.length&&o[j+1][0]===o[i][0])j++;for(let k=i;k<=j;k++)r[o[k][1]]=(i+j)/2+1;i=j+1}return r}
function spearman(a,b){
  if(a.length<3)return null;const x=ranks(a),y=ranks(b),mx=mean(x),my=mean(y);let sxy=0,sxx=0,syy=0;
  for(let i=0;i<x.length;i++){sxy+=(x[i]-mx)*(y[i]-my);sxx+=(x[i]-mx)**2;syy+=(y[i]-my)**2}
  return sxx&&syy?sxy/Math.sqrt(sxx*syy):null;
}
const nasVerdict=r=>r>0.6?"The measure agrees with your ear; keep it.":r>=0.3?"It roughly agrees; treat it as a hint.":"It doesn't agree with your ear; it should be dropped.";
const NASQ=["Very nasal","Quite nasal","In between","Mostly open","Open, not nasal"];
function nasScatter(pts){
  const fig=document.createElement("figure");fig.className="chart";
  const W=320,H=130,L=30,R=12,T=10,B=22,X=v=>L+(W-L-R)*v/100,Y=v=>T+(H-T-B)*(1-(v-1)/4);
  let g="";for(let v=1;v<=5;v++)g+=`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${L-6}" y="${Y(v)+3.5}" text-anchor="end" class="tick">${v}</text>`;
  for(const v of [0,50,100])g+=`<text x="${X(v)}" y="${H-5}" text-anchor="${v===0?"start":v===100?"end":"middle"}" class="tick">${v}</text>`;
  const dots=pts.map(p=>`<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="5" class="pt"><title>Score ${p.x}, your rating ${p.y}</title></circle>`).join("");
  fig.innerHTML=`<figcaption>Your rating against the score <small>one dot per take; dots rising to the right mean agreement</small></figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Your rating from 1 to 5 against the coach's score from 0 to 100, one dot per take">${g}${dots}</svg><p class="hint" style="margin-top:6px">Across: the coach's score, 100 = open. Up: your rating, 5 = open.</p>`;
  return fig;
}
let ncCur=null;
async function renderNasCheck(){
  const body=$("ncBody");body.innerHTML="";
  const seen=new Set(),clips=(await idb.all("clips")).filter(c=>typeof c.nas==="number"&&c.pcm&&!seen.has(c.t)&&seen.add(c.t)),rt=store.get("nasRate",{});
  const rated=clips.filter(c=>rt[c.t]!=null),left=clips.filter(c=>rt[c.t]==null),el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x)e.textContent=x;return e};
  if(!clips.length){body.append(el("p","hint","No scored takes yet. A take is saved with its score when the coach scores one of your lifted ah sounds in a nasality block. Come back after a few sessions."));return}
  if(!ncCur||rt[ncCur.t]!=null||!left.some(c=>c.t===ncCur.t))ncCur=left.length?pick(left):null;
  body.append(el("p","hint",`Rated ${rated.length} of ${clips.length} takes.`));
  if(ncCur){
    const play=el("button","btn","▶ Play a take"),q=el("div"),qs=el("p","",""),opts=el("div","clips");
    play.type="button";q.hidden=true;qs.textContent="How nasal did that sound?";
    NASQ.forEach((n,i)=>{const b=el("button","btn",n);b.type="button";b.onclick=()=>{rt[ncCur.t]=i+1;store.set("nasRate",rt);ncCur=null;renderNasCheck()};opts.append(b)});
    q.append(qs,opts);
    play.onclick=async()=>{if(S.running)return;await ensureCtx();playBuf(ncCur,S.ctx.currentTime+0.05);play.textContent="▶ Play it again";q.hidden=false};
    body.append(play,q);
  }else body.append(el("p","hint","You have rated every take there is. More appear as nasality blocks save new ones."));
  if(rated.length>=8){
    const r=spearman(rated.map(c=>rt[c.t]),rated.map(c=>c.nas)),box=el("div");box.style.cssText="display:flex;flex-direction:column;gap:10px";
    box.append(el("h2","","Result"));
    if(r==null)box.append(el("p","hint","Your ratings, or the scores, are all the same, so there is nothing to compare yet. Rate a few more takes that sound different."));
    else{box.append(el("p","",`Spearman correlation between your ratings and the score: ${r.toFixed(2)}, over ${rated.length} takes.`),el("p","",nasVerdict(r)))}
    box.append(nasScatter(rated.map(c=>({x:c.nas,y:rt[c.t]}))));body.append(box);
  }else body.append(el("p","hint",`The result appears after 8 ratings (${Math.max(0,8-rated.length)} to go).`));
  if(rated.length){const c=el("button","btn","Clear my ratings");c.type="button";c.onclick=()=>{if(!confirm("Clear all your ratings?"))return;store.set("nasRate",{});ncCur=null;renderNasCheck()};body.append(c)}
}
$("ncBtn").onclick=()=>{if(S.running)return;showView("nasCheck");renderNasCheck()};
const panels=["progress","nasCheck","guide","settings","diag"];
const navOf={progress:"progBtn",nasCheck:"progBtn",guide:"guideBtn",settings:"setBtn",diag:"setBtn"};
function markNav(){const open=panels.find(x=>!$(x).hidden),cur=open?navOf[open]:(S.running&&S.mode==="test"?"testBtn":S.running&&S.mode==="home"?"hpBtn":"homeBtn");
  document.querySelectorAll(".links button").forEach(b=>b.id===cur?b.setAttribute("aria-current","page"):b.removeAttribute("aria-current"))}
function showView(id){panels.forEach(x=>$(x).hidden=x!==id);document.querySelector(".wrap").classList.toggle("panel-open",!!id);markNav();window.scrollTo(0,0)}
function togglePanel(id){const show=$(id).hidden;showView(show?id:null);return show}
function goHome(){if(S.running&&(S.mode==="test"||S.mode==="home"))stop();showView(null)}
$("homeBtn").onclick=goHome;$("title").onclick=goHome;document.querySelectorAll(".back").forEach(b=>b.onclick=goHome);
$("progBtn").onclick=()=>{if(togglePanel("progress"))renderProgress()};

/* ---------- guide: examples and cues ---------- */
const REAL=[["Lip trill","lip-trill"],["Breathy tone","breathy"],["Clear tone","clear"],["Swell: soft, full, soft","swell"],["Separate notes","separate"],["Smooth line","smooth"],["Vibrato","vibrato"],
  ["Vowel ah","vowel-ah"],["Vowel eh","vowel-eh"],["Vowel ee","vowel-ee"],["Vowel oh","vowel-oh"],["Vowel oo","vowel-oo"],["Soft note","soft"],["Full note","full"],["Song line, plain","song-plain"],["Song line, with vibrato","song-vibrato"]];
const LESSONS=[["Nasality","STOP sounding NASAL when SINGING - Try this Vocal Exercise","Dr Dan's Voice Essentials","https://www.youtube.com/watch?v=TquLC7Gb-Qk"],
  ["Lip trills","Beginner Lip Trills (Vocal Exercises Series)","The Charismatic Voice","https://www.youtube.com/watch?v=_9OK-jhmffQ"],
  ["Pitch","I've taught 1,000's of vocal lessons, here's the TRUTH on singing in tune","30 Day Singer","https://www.youtube.com/watch?v=TGwg3R64Jak"],
  ["Breath","easy way to develop great breath support","Madeleine Harvey","https://www.youtube.com/watch?v=G1zgE1SZ7-4"],
  ["Clean onsets","4 Types of Vocal Onset","30 Day Singer","https://www.youtube.com/watch?v=HTNJt-EQyBA"],
  ["Registers","Never Have a Vocal Break Again!","Ramsey Voice Studio","https://www.youtube.com/watch?v=Xeiihs6wWdM"],
  ["Clear tone","How to STOP singing BREATHY: close the phonatory gap","Dr Dan's Voice Essentials","https://www.youtube.com/watch?v=FFkhKFCSvg8"],
  ["Smooth line","Secret to SMOOTH & SILKY Singing: 4 LEGATO Exercises","Healthy Vocal Technique","https://www.youtube.com/watch?v=S6pXe7aqnxo"],
  ["Loose jaw and tongue","Fix Your Jaw & Tongue TENSION While Singing","30 Day Singer","https://www.youtube.com/watch?v=xJhJ0FcrDm8"],
  ["Posture","Posture & Body Alignment for Singing - Sing Better Right Now!","Healthy Vocal Technique","https://www.youtube.com/watch?v=GwFdntVDQn0"],
  ["Vowels","Clear, Beautiful VOWELS!! Exactly how to sing ee, eh, ah, oh and oo without tension","The Weekly Warmup - Vocal Exercises for Singers","https://www.youtube.com/watch?v=2LYHtfF2JMA"]];
const EXAMPLES=[
  ["Lip trill","Close your lips loosely and blow so they flap, like a horse or a motorboat, then add your voice and slide up and down. If they won't flap, press a fingertip into each cheek beside your mouth (only when parked), or hum instead.",p=>DEMO.trill(p)],
  ["Siren","Slide on oo or woo from your lowest note to your highest and back, in one smooth glide.",p=>DEMO.siren(p)],
  ["Sing-ah","Sing the word sing, hold the N G with your tongue against the roof of your mouth, then drop the tongue and open to ah. The N G is nasal; the ah should not be.",p=>DEMO.ngah([p.home,p.home+2,p.home+4])],
  ["Five short notes","Five short, separate ahs on one note. Each starts cleanly, without an H and without a click.",p=>DEMO.staccato(p.home)],
  ["Swell","One note that starts soft, grows to full in the middle, and fades back to soft, with the pitch held still.",p=>DEMO.swell(p.home)],
  ["Breathy tone","A half-whispered note with air leaking through it. Used only as the contrast for a clear tone.",p=>DEMO.breathy(p.home)],
  ["Onset with an H","The fault: breath escapes before the note starts.",p=>DEMO.onsetH(p.home)],
  ["Onset with a click","The fault: the note starts with a small hard click.",p=>DEMO.onsetHard(p.home)],
  ["Choppy line","The fault: each note stops before the next begins.",p=>DEMO.choppy([0,2,4,2,0].map(x=>p.home-2+x))],
  ["Smooth line","The sound carries on while the pitch changes.",p=>DEMO.smooth([0,2,4,2,0].map(x=>p.home-2+x))],
  ["Steady S","Breathe in low, then let the air out on an even S for as long as is comfortable.",()=>DEMO.hiss()]];
function renderGuide(){
  const rl=$("realClips");rl.innerHTML="";
  for(const [name,id] of REAL){
    const b=document.createElement("button");b.type="button";b.className="btn";b.innerHTML=`<span>▶ ${esc(name)}</span>`;
    b.onclick=async()=>{if(S.running)return;S.stop=false;S.skip=false;S.paused=false;S.lat=0;await ensureCtx();try{await real(id)}catch(e){}};
    rl.append(b);
  }
  const ex=$("examples");ex.innerHTML="";
  for(const [name,text,fn] of EXAMPLES){
    const d=document.createElement("div");d.className="ex";
    const b=document.createElement("button");b.type="button";b.className="btn";b.innerHTML=`<span>▶ ${esc(name)}</span>`;
    b.onclick=async()=>{if(S.running)return;S.stop=false;S.skip=false;S.paused=false;S.lat=0;await ensureCtx();try{await fn(profile()||{home:55,low:48,high:64})}catch(e){}setTarget(null)};
    const t=document.createElement("p");t.textContent=text;d.append(b,t);ex.append(d);
  }
  const box=$("cues");box.innerHTML="";
  for(const k of Object.keys(TOPICS)){
    const sec=document.createElement("div");sec.className="topic";sec.innerHTML=`<h3>${esc(TOPICS[k])}</h3>`;
    for(const t of TIPS[k]){
      const st=D.tips[t.id]||{n:0},row=document.createElement("div");row.className="cue"+(st.n?"":" new");
      const b=document.createElement("button");b.type="button";b.textContent=st.star?"★":"☆";b.setAttribute("aria-pressed",st.star?"true":"false");b.setAttribute("aria-label",(st.star?"Unstar ":"Star ")+t.name);
      b.onclick=()=>{const x=tipStat(t.id);x.star=!x.star;saveD();renderGuide()};
      const meta=st.n?`heard in ${st.n} session${st.n>1?"s":""}, last ${st.last?st.last.slice(5):""}`+(st.scn?` · nasality measure ${Math.round(st.sc/st.scn*100)}`:""):"not heard yet";
      const nm=document.createElement("b");nm.textContent=t.name;const tx=document.createElement("p");tx.textContent=t.say;const sm=document.createElement("small");sm.textContent=meta;
      row.append(b,nm,tx,sm);sec.append(row);
    }
    box.append(sec);
  }
  renderSongs();
  $("lessons").innerHTML=LESSONS.map(([t,v,c,u])=>`<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a><small>${esc(v)} · ${esc(c)}</small></li>`).join("");
}
/* the Songs section of the Guide: a choice per song (rvc_songKnow), span and fit, and a Delete for own songs */
const KNOW=[["know","I know it"],["teach","Teach me"],["skip","Skip"]];
function renderSongs(){
  const box=$("songList"),p=profile(),all=allSongs();box.innerHTML="";
  for(const s of all){
    const row=document.createElement("div");row.className="srow";
    const tx=document.createElement("span"),nm=document.createElement("b"),sm=document.createElement("small");tx.className="sn";
    nm.textContent=s.name;nm.style.fontWeight="500";
    sm.textContent=`${songSpan(s)} semitones · ${p?(songFits(s,p)?"fits your range":"a stretch for your range"):"range not measured yet"}`+(s.own?" · yours":"");
    tx.append(nm,sm);row.append(tx);
    const c=document.createElement("span");c.className="sc";
    const sel=document.createElement("select");sel.setAttribute("aria-label","Do you know "+s.name);
    for(const [v,t] of KNOW){const o=document.createElement("option");o.value=v;o.textContent=t;sel.append(o)}
    sel.value=songMode(s);sel.onchange=()=>{setSongMode(s,sel.value);renderSongs()};c.append(sel);
    if(s.own){const b=document.createElement("button");b.type="button";b.className="btn";b.textContent="Delete";b.setAttribute("aria-label","Delete "+s.name);
      b.onclick=()=>{store.set("mySongs",mySongs().filter(x=>x.name!==s.name));const k=store.get("songKnow",{});delete k[s.name];store.set("songKnow",k);
        delete D.sungS[s.name];if(D.song.n===s.name)D.song={s:D.song.s,ph:0};saveD();renderSongs()};c.append(b)}
    row.append(c);box.append(row);
  }
  const n=$("songNote"),none=all.every(s=>songMode(s)==="skip");
  n.hidden=!none;n.textContent=none?"Every song is set to Skip, so the coach will use all of them.":"";
}
const soMsg=t=>{const m=$("soMsg");m.textContent=t;m.hidden=!t};
const soRead=()=>parseOwn($("soName").value,TEMPO[$("soTempo").value]||0.55,[1,2,3,4].map(i=>$("soP"+i).value));
$("soPrev").onclick=async()=>{
  if(S.running)return;const r=soRead();if(r.err)return soMsg(r.err);
  const s=r.song,p=profile()||{home:55,low:48,high:64},ton=songTon(s,p),ph=s.ph[0];
  soMsg("Playing the first phrase you typed.");S.stop=false;S.skip=false;S.paused=false;S.lat=0;await ensureCtx();
  try{await play(ph.n.map(x=>ton+x),ph.d.map(x=>x*s.beat))}catch(e){}setTarget(null);soMsg("");
};
$("soSave").onclick=()=>{
  const r=soRead();if(r.err)return soMsg(r.err);
  const s=r.song;
  if(!s.name)return soMsg("Give the song a name.");
  if(allSongs().some(x=>x.name.toLowerCase()===s.name.toLowerCase()))return soMsg(`There is already a song called ${s.name}.`);
  if(mySongs().length>=20)return soMsg("That is 20 songs of your own. Delete one first.");
  store.set("mySongs",mySongs().concat([s]));
  ["soName","soP1","soP2","soP3","soP4"].forEach(i=>$(i).value="");
  soMsg(`Saved ${s.name}. It joins the song practice from the next session.`);renderSongs();
};
$("guideBtn").onclick=()=>{if(togglePanel("guide"))renderGuide()};

/* ---------- backup: everything the app keeps, in one file ---------- */
const b64=u8=>{let t="";for(let i=0;i<u8.length;i+=0x8000)t+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(t)};
const unb64=t=>{const x=atob(t),u=new Uint8Array(x.length);for(let i=0;i<x.length;i++)u[i]=x.charCodeAt(i);return u};
/* takes are stored as 16-bit samples, half the size of the phone's own copy and still lossless to the ear */
const pcmOut=f=>{const a=new Int16Array(f.length);for(let i=0;i<f.length;i++)a[i]=Math.max(-32768,Math.min(32767,Math.round(f[i]*32767)));return b64(new Uint8Array(a.buffer))};
const pcmIn=t=>{const a=new Int16Array(unb64(t).buffer),f=new Float32Array(a.length);for(let i=0;i<a.length;i++)f[i]=a[i]/32767;return f};
async function idbEntries(st){
  try{const d=await idb.open();return await new Promise(res=>{const out=[],t=d.transaction(st,"readonly"),q=t.objectStore(st).openCursor();
    q.onsuccess=()=>{const c=q.result;if(c){out.push([c.key,c.value]);c.continue()}};t.oncomplete=()=>res(out);t.onerror=()=>res(out)})}catch(e){return []}
}
async function makeBackup(takes){
  const ls={};for(const k of Object.keys(localStorage))if(k.startsWith("rvc_"))ls[k]=localStorage.getItem(k);
  const b={app:"road-voice-coach",kind:"backup",v:1,ver:$("ver").textContent.replace("Version ",""),at:new Date().toISOString(),takes,ls,notes:[],clips:[]};
  if(takes){
    for(const [k,v] of await idbEntries("notes"))b.notes.push({key:k,sr:v.sr,p:v.p,err:v.err,pcm:pcmOut(v.pcm)});
    for(const [,v] of await idbEntries("clips"))b.clips.push({t:v.t,label:v.label,sr:v.sr,pcm:pcmOut(v.pcm),...(v.nas!=null?{nas:v.nas}:{}),...(v.first?{first:true}:{})});
  }
  return b;
}
/* replaces what is on the phone; takes are only replaced when the backup includes them */
async function restoreBackup(b){
  for(const k of Object.keys(localStorage))if(k.startsWith("rvc_"))localStorage.removeItem(k);
  for(const [k,v] of Object.entries(b.ls||{}))if(k.startsWith("rvc_"))localStorage.setItem(k,v);
  if(b.takes){
    await idb.clear("notes");await idb.clear("clips");
    for(const n of b.notes||[])await idb.put("notes",{pcm:pcmIn(n.pcm),sr:n.sr,p:n.p,err:n.err},n.key);
    for(const c of b.clips||[])await idb.put("clips",{t:c.t,label:c.label,sr:c.sr,pcm:pcmIn(c.pcm),...(c.nas!=null?{nas:c.nas}:{}),...(c.first?{first:true}:{})});
  }
}
function bkMsg(t){const m=$("bkMsg");m.textContent=t;m.hidden=!t}
function showBkLast(){const d=store.get("bkDate","");$("bkLast").textContent=d?`Last backup: ${d}.`:"No backup saved yet."}
$("bkSave").onclick=async()=>{
  if(S.running)return;bkMsg("Preparing the file…");
  try{
    const b=await makeBackup($("bkTakes").checked);
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(b)],{type:"application/json"}));
    a.download=`road-voice-coach-backup-${today()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),10000);
    store.set("bkDate",today());showBkLast();
    bkMsg(`Saved ${b.clips.filter(c=>!c.first).length} takes and ${b.notes.length} model notes with your progress and settings. The file is in Downloads.`);
  }catch(e){bkMsg("Could not make the backup: "+(e&&e.message||e))}
};
$("bkLoad").onclick=()=>{if(!S.running)$("bkFile").click()};
$("bkFile").onchange=async e=>{
  const f=e.target.files[0];e.target.value="";if(!f)return;
  try{
    const b=JSON.parse(await f.text());
    if(!b||b.app!=="road-voice-coach"||b.kind!=="backup")throw new Error("this is not a Road Voice Coach backup file");
    if(!confirm(`Replace everything on this phone with the backup from ${String(b.at).slice(0,10)}?`+(b.takes?"":" Your takes stay as they are; this backup has none.")))return;
    bkMsg("Restoring…");await restoreBackup(b);bkMsg("Restored. Reloading…");setTimeout(()=>location.reload(),600);
  }catch(err){bkMsg("Could not restore: "+(err&&err.message||err))}
};
showBkLast();

/* ---------- settings ---------- */
$("setBtn").onclick=()=>{if(togglePanel("settings"))fillMics()};
$("diagBtn").onclick=()=>{showView("diag");renderDiag()};
async function fillMics(){
  try{
    const ds=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==="audioinput");
    const sel=$("micSel"),cur=store.get("mic","");
    sel.innerHTML='<option value="">Automatic: prefer phone mic</option>'+ds.filter(d=>d.deviceId).map((d,i)=>`<option value="${d.deviceId}">${d.label||"Microphone "+(i+1)+" (start once to see names)"}</option>`).join("");
    sel.value=cur;
  }catch(e){}
}
$("micSel").onchange=e=>store.set("mic",e.target.value);
$("lenSel").value=String(store.get("len",0));$("lenSel").onchange=e=>{store.set("len",+e.target.value);showLen()};showLen();
$("sungSel").value=String(sungMax());$("sungSel").onchange=e=>store.set("sungMax",+e.target.value);
$("goalSel").value=String(goalDays());$("goalSel").onchange=e=>store.set("goal",+e.target.value);
$("focSel").value=store.get("focus","auto");$("focSel").onchange=e=>store.set("focus",e.target.value);
$("nasAmt").value=store.get("nasal","normal");$("nasAmt").onchange=e=>store.set("nasal",e.target.value);
{const box=$("topicBox");
  for(const [k,name] of TECH.slice(1)){const l=document.createElement("label"),c=document.createElement("input");c.type="checkbox";c.value=k;c.checked=topicOn(k);
    c.onchange=()=>{const v=[...box.querySelectorAll("input:checked")].map(x=>x.value);store.set("topics",v.length===TECH.length-1?null:v);store.set("topicsOf",TECH.slice(1).map(t=>t[0]))};l.append(c,name);box.append(l)}}
$("voiceSel").onchange=e=>{store.set("voice",e.target.value);loadVoices()};
$("nsSel").value=store.get("ns","0");$("nsSel").onchange=e=>store.set("ns",e.target.value);
$("fbSel").value=store.get("fb","auto");$("fbSel").onchange=e=>store.set("fb",e.target.value);
$("keySel").value=store.get("keys","1");$("keySel").onchange=e=>store.set("keys",e.target.value);
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
$("resetBtn").onclick=async()=>{store.set("profile",null);store.set("history",[]);store.set("days",[]);store.set("rangeDate","");D=D0();saveD();
  await idb.clear("notes");await idb.clear("clips");S.bank=new Map();$("resetMsg").hidden=false};

"use strict";
/* ---------- blocks ---------- */
async function block(name,fn,{sum=true,key=name,end=false}={}){
  if(!end&&await limitCheck())throw new Wind("limit");
  setStage(name);S.blk={reps:[]};S.skip=false;S.canSkip=true;
  const t0=clock(),p0=S.pauseTot||0;
  try{
    await fn();
    learnMin(key,(clock()-t0-((S.pauseTot||0)-p0))/60000);
    const r=S.blk.reps;
    if(sum&&r.length>=3){
      const avg=mean(r.map(x=>x.avg)),bias=mean(r.map(x=>x.bias));
      await speak(`That block: about ${Math.round(avg)} cents off on average`+(Math.abs(bias)>=15?`, mostly ${dir(bias)}.`:"."));
      const best=r.filter(x=>x.take).reduce((a,b)=>!a||b.avg<a.avg?b:a,null);
      if(best){addClip(`${name}: best take`,best.take);await speak("Your best take.");await playTake(best.take)}
    }
  }catch(e){
    if(!(e instanceof Skip))throw e;
    S.frames=null;S.rec=null;S.specMode=null;setSub("");
    S.canSkip=false;await speak("Skipping.");
  }finally{S.canSkip=false;S.skip=false;S.blk=null;S.nBlk++;saveD()}
}
async function warmup(p,short=false){
  await speak(`Warm-up. ${tipFor("posture").say}`);
  await speak("Lip trills. Close your lips loosely and blow so they flap, like a horse or a motorboat, and add your voice. A singer does it like this.");
  await real("lip-trill",()=>DEMO.trill(p));
  await speak(`Slide up and down like that, gently, for ${short?"fifteen":"thirty"} seconds. If your lips won't flap, hum instead.`);
  await sleep(short?15000:30000);
  await speak("Now hum these five notes.");
  for(const r of short?[p.home]:[p.home-2,p.home])await rep([0,2,4,2,0].map(x=>r+x),{dur:0.6,quiet:true,noRetry:true,own:false,vz:"hum"});
  const a=await rep([p.home],{dur:2.2,hold:true,intro:"Now sing ah on this note and hold it, at an easy speaking volume.",maxListen:12000,always:true,need:2.5});
  if(a&&a.heard)S.base=a.level;
}
async function ahTake(m){
  await play([m],1.2);setSub("your turn");
  const f=await listen({max:10000,wait:6000,spec:"nasal",count:false});setSub("");
  const v=f.filter(x=>x.m!=null&&x.np!=null).map(x=>x.np),c=v.slice(Math.floor(v.length*0.2),Math.ceil(v.length*0.9));
  return {take:S.lastTake,np:c.length>=8?median(c):null};
}
const PHR=[
  {w:"Happy birthday to you",n:[0,0,2,0,5,4],d:[0.4,0.4,0.8,0.8,0.8,1.4]},
  {w:"Blue sky, bright day",n:[2,6,9,6],d:[0.8,0.8,0.8,1.2]},
  {w:"Take the high road",n:[2,4,6,2],d:[0.7,0.7,0.9,1.2]},
  {w:"Wide water, quiet sea",n:[2,4,6,7,6,2],d:[0.7,0.5,0.5,0.5,0.5,1.2]}];
/* Extra nasality exercises from teachers. A block uses one or two, taking the next ones in turn (D.nx), so the
   contrast pair stays and the block does not get longer. lift(m,credit) sings a lifted ah and scores it. */
const NASX=[
  async(n,first)=>{
    await speak(first?"Sing-ah. On each note sing the word sing, hold the N G for a moment, then open to ah. The N G goes through the nose. The ah should not. It sounds like this, three times.":"Sing-ah on each note: hold the N G, then open to ah.");
    await rep([n,n+2,n+4],{dur:1.4,gap:0.1,quiet:true,replay:"always",replayTarget:false,noRetry:true,own:false,modelFn:()=>DEMO.ngah([n,n+2,n+4])});
  },
  async n=>{
    await speak("Hung. Say the word hung and hold the N G, with your tongue against the roof of your mouth. Then drop your jaw and open to ah. The N G goes through the nose, the ah must not. It sounds like this.");
    await rep([n,n+2],{dur:1.4,gap:0.1,quiet:true,replay:"always",replayTarget:false,noRetry:true,own:false,modelFn:()=>DEMO.hung([n,n+2])});
  },
  async n=>{
    await speak("Uh to ah. Start on a dark, relaxed uh, like a sleepy answer. Then drop your jaw into ah without letting the sound go into your nose. Like this.");
    await rep([n],{dur:2.2,hold:true,quiet:true,replay:"always",replayTarget:false,noRetry:true,own:false,need:2,maxListen:9000,modelFn:()=>DEMO.uhah(n)});
  },
  async n=>{
    await speak("Puffed cheeks. Puff your cheeks out and sing one short ah on this note. If the back of your mouth hangs low, you feel the air leak into your nose. This one is for feel, so I won't score it.");
    const P=await plainTake(n,1.0);
    await speak("Now the same note with your cheeks relaxed. Keep the back of your mouth lifted.");
    const R=await plainTake(n,1.0);
    if(P&&R){await speak("Listen back. Puffed, then relaxed.");await playTake(P);await sleep(300);await playTake(R)}
    else await speak("I didn't hear both of those, so there's nothing to play back.");
  },
  async(n,first,lift)=>{
    await speak("Slow-motion gasp. Breathe in silently, as if you were surprised, or on a silent K. Feel the back of your mouth lift. Now sing ah on this note and keep that space.");
    await lift(n,false);
  },
  async(n,first,lift)=>{
    await speak("Yogi Bear. Make a dark, dopey, oversized uh-ah, like the cartoon bear. Feel the back of your mouth open wide. Like this.");
    await DEMO.yogi(n);
    await speak("Now you, as dopey as you dare.");
    await feel();
    await speak("Now the same open space, sung normally on ah.");
    await lift(n,false);
  }];
async function nasality(p){
  const n=p.home,first=!S.nasDone,tip=tipFor("nasal"),xf=xferNow();S.nasDone=true;
  await speak(first?`Nasality work. ${why("nasal")}First the contrast. Sing this note on ah, as nasal as you can, like a whiny cartoon voice.`:"Nasality. The nasal version first: ah, as nasal as you can.");
  const N=await ahTake(n);
  await speak(first?`Now the opposite. Today's cue: ${tip.say}`:`Now lifted. ${tip.short}`);
  const L=await ahTake(n);
  if(N.take&&L.take){
    await speak("Listen back. Nasal, then lifted.");await playTake(N.take);await sleep(300);await playTake(L.take);
    if(first){addClip("Nasal ah",N.take);addClip("Lifted ah",L.take)}
  }
  if(N.np!=null&&L.np!=null&&L.np-N.np>=3){S.nas={n:N.np,l:L.np};if(first)await speak("My rough measure hears the difference too, so I'll use it on the next ones.")}
  else{S.nas=null;if(first)await speak("My measure can't separate those two over the road noise, so go by your ears on the replays.")}
  /* a lifted ah; only the day's own cue earns credit in its statistics */
  const lift=async(m,credit=true)=>{
    const T=await ahTake(m);
    if(!T.take){await speak("I didn't hear that one.");return}
    let msg="";
    if(S.nas&&T.np!=null){const sc=clamp((T.np-S.nas.n)/(S.nas.l-S.nas.n),0,1);S.nasScores.push(sc);if(credit){const st=tipStat(tip.id);st.sc=(st.sc||0)+sc;st.scn=(st.scn||0)+1}
      addClip("Lifted ah",T.take,Math.round(sc*100));
      msg=sc>=0.65?"By my rough measure that was on the open side. ":sc<=0.35?"By my rough measure that drifted towards the nasal sound. ":"By my rough measure that was in between. "}
    await speak(msg+"Listen.");await playTake(T.take);
  };
  for(const m of first?[n,n+2]:[n+2]){await speak(tip.short);await lift(m)}
  const nx=first?1:2,k=D.nx;D.nx=k+nx;
  for(let i=0;i<nx;i++)await NASX[(k+i)%NASX.length](n,first,lift);
  if(xf)await transfer(p,"nasal");
  else{
    const ph=PHR[D.phr%PHR.length];D.phr++;
    await speak(`Last one. Sing these words on this tune: ${ph.w}.`+(first?" There is no M, N or N G in them, so nothing should come through the nose.":""));
    await rep(ph.n.map(x=>n-2+x),{durs:ph.d,quiet:true,replay:"always",replayTarget:false,noRetry:true,own:false,words:true});
  }
}
async function pitchMatch(p,n){
  if(!D.seen.pm)await speak("Pitch matching. I give you a note, you sing it back on ah.");
  if(S.round===1)await speak(`Today's pitch cue: ${tipFor("pitch").say}`);
  for(let i=0;i<n;i++)await repWeak(genPm(p,Math.random()<1/3));
}
async function scales(p,n){
  if(!D.seen.sc)await speak("Scales. Listen to the pattern, then sing it back on ah or on numbers.");
  for(let i=0;i<n;i++){const g=genSc(p);await rep(g.t,g.o)}
}
async function intervals(p,n){
  if(!D.seen.iv)await speak("Intervals. Two notes, then you sing both.");
  for(let i=0;i<n;i++){const g=genIv(p);await rep(g.t,g.o)}
}
async function mixed(p){
  await speak("Mixed practice. Single notes, scales and intervals, in random order.");
  for(let i=0;i<9;i++){let g=Math.random()<1/3?genPm(p,true):null;if(!g||!g.weak)g=pick([genPm,genSc,genIv])(p);await repWeak(g)}
}
const VOW=[
  {k:"ee",say:"E, as in see",tip:"Keep the tip of your tongue behind your lower teeth. As the notes go up, let your jaw drop a little."},
  {k:"eh",say:"E, as in bed",tip:"Loose jaw, and don't spread your lips into a smile."},
  {k:"ah",say:"ah, as in father",tip:"Tall mouth, like the start of a yawn. As the notes go up, lean it slightly towards uh."},
  {k:"oh",say:"O, as in go",tip:"Round your lips into a circle and keep them there. Don't let it close to oo at the end."},
  {k:"oo",say:"oo, as in moon",tip:"Lips rounded but relaxed, jaw not pushed forward. Keep it clear, not hooty."}];
const DIC=[
  ["day","Hold the first vowel, deh, and add the E only at the very end."],
  ["night","Hold nah, and add the E T only at the very end."],
  ["now","Hold nah, and close to oo only at the very end."],
  ["last","Hold the ah, and put the S T right at the end."],
  ["boy","Hold boh, and add the E only at the very end."]];
async function vowels(p){
  const v=VOW[D.vi%VOW.length];D.vi++;
  await speak(`Vowel work, on ${v.say}. ${why("vowel")}${v.tip} A singer holds it like this.`);
  await real("vowel-"+v.k);
  await speak("First one held note, then three notes up, then three notes down.");
  await rep([p.home],{dur:1.5,hold:true,vowel:v.k,own:false,need:2.5,maxListen:11000,vz:v.k});
  await rep([0,2,4].map(x=>p.home-2+x),{dur:0.8,vowel:v.k,own:false,vz:v.k});
  await rep([4,2,0].map(x=>p.home-2+x),{dur:0.8,vowel:v.k,own:false,vz:v.k});
  const st=D.vow[v.k];
  if(st&&st.n>=6){const b=st.sum/st.n;if(Math.abs(b)>=15)await speak(`Over time, on this vowel you tend to sing about ${Math.round(Math.abs(b))} cents ${dir(b)}.`)}
  const d=DIC[D.dic%DIC.length];D.dic++;
  await speak(`Diction. Sing the word ${d[0]} on this note, for about three seconds. ${d[1]}`);
  await rep([p.home],{dur:1.5,hold:true,quiet:true,replay:"always",replayTarget:false,noRetry:true,maxListen:11000,own:false,words:true});
  if(xferNow())await transfer(p,null,"ah","the vowel shape you just practised");
}
async function breath(p){
  const first=!S.breathSaid;S.breathSaid=true;
  await speak((first?"If you ever feel light-headed, stop and breathe normally. ":"")+`Breath. ${why("breath")}Today's cue: ${tipFor("breath").say} Breathe in, then let the air out on a steady S, like a slow puncture, for as long as is comfortable.`+(first?" It sounds like this.":""));
  if(first)await DEMO.hiss();
  const thr=Math.max((S.hbNoise||0)*5,3e-10);
  setSub("your turn");
  const f=await listen({max:45000,wait:9000,endSil:1000,spec:"hiss",active:x=>x.hb>thr,count:false});setSub("");
  const sec=longestRun(f,x=>x.hb>thr,250)/1000;
  if(sec>=2){const prev=D.best.hiss||0;S.hiss=Math.max(S.hiss||0,sec);
    await speak(`${Math.round(sec)} seconds.`+(prev?(sec>prev+0.5?` A new record; your best was ${Math.round(prev)}.`:` Your best is ${Math.round(prev)}.`):""));
    if(sec>prev)D.best.hiss=sec}
  else await speak("I couldn't pick out the hiss over the road noise.");
  await speak("Now one long note on ah. Hold it steady for as long as is comfortable.");
  await rep([p.home],{dur:1.5,hold:true,maxListen:35000,endSil:1400,always:true,noRetry:true,need:4,longest:true,own:false});
  for(let i=0;i<2;i++){const g=genLt(p,S.ltI++);await rep(g.t,g.o)}
  if(xferNow())await transfer(p,"breath");
}
async function rhythm(){
  await speak("Rhythm. I'll give you four clicks. Then sing eight short, separate ta's at the same speed, on any note.");
  for(let k=0;k<2;k++){
    const beat=60/pick([76,88,100]);
    await clicks(4,beat);setSub("your turn");
    await listen({max:(8*beat+3)*1000,wait:5000,endSil:Math.max(1400,beat*2200),count:false,minRun:1,active:x=>x.r>Math.max(0.0012,S.noise*2.5)});setSub("");
    const tk=S.lastTake;
    await speak(rhythmText(tk?onsetsFromPcm(tk.pcm,tk.sr):[],beat).text);
  }
}
async function swell(p){
  await speak("Dynamics. On this note, start soft, grow to full by the middle, then fade back to soft. Keep the pitch still. A singer does it like this.");
  await real("swell");
  await speak("Now you, on this note.");
  for(const m of [p.home,p.home+2])await rep([m],{dur:4,hold:true,swell:true,always:true,noRetry:true,maxListen:14000,noGuard:true,need:3,own:false,modelFn:()=>DEMO.swell(m)});
}
async function starts(p){
  await speak("Clean starts. Sing each note short and separate, right on pitch from the first instant. No sliding up.");
  const {lo}=band(p);
  for(const r of [lo,lo+2,lo+3])await rep([0,4,7,4,0].map(x=>r+x),{dur:0.45,gap:0.25,scoopFocus:true,always:true,noRetry:true,own:false});
}
const skills=p=>[swell,starts,earTrain][D.sk++%3](p);
/* ---------- ear training: the answer is sung ---------- */
/* Three exercises, each with its own level (kinds eh, em, ei in D.lv) and its own "explained once" flag in D.seen. They do not go through rep(): the sung
   note is judged against the answer note (within 70 cents, octaves forgiven as elsewhere), not against what was played, so these takes stay out of the
   session's cents-off score and out of the weak-note map D.notes. A wrong first answer is followed by the right note and one more try. */
const MAJ=[0,2,4,5,7,9,11,12];
const IVN={3:"a minor third",4:"a major third",5:"a fourth",7:"a fifth",12:"an octave"};
const EIV={1:[7,12],2:[5,7,12],3:[3,4,5,7,12]};
/* higher or lower: the gap shrinks with the level */
function genEh(p){
  const {lo,hi}=band(p),g=[rnd(4,7),rnd(2,4),rnd(1,2)][lvl("eh")-1],a=rnd(lo,hi-g),h=a+g,ord=Math.random()<0.5?[a,h]:[h,a];
  return {ans:h,other:a,ns:ord,said:"That was the lower one.",reveal:"The higher one is this.",model:()=>play(ord,0.8,0.3)};
}
/* the missing note: four neighbouring notes of a major scale with one of the middle two left out, so three are played with a gap; later also downwards */
function genEm(p){
  const {lo,hi}=band(p),L=lvl("em"),d=rnd(0,[0,2,3][L-1]),k=L===1?2:rnd(1,2),sp=MAJ[d+3]-MAJ[d],a=rnd(lo,hi-sp);
  let ns=[0,1,2,3].map(i=>a+MAJ[d+i]-MAJ[d]);if(L===3&&Math.random()<0.5)ns=ns.reverse();
  const ans=ns[k],pre=ns.slice(0,k),post=ns.slice(k+1);
  return {ans,ns,k,reveal:"The missing note is this.",model:async()=>{await play(pre,0.6,0.06);await sleep(300);await play(post,0.6,0.06)}};
}
/* interval by ear: one note, then the name of the interval to sing above it. An octave is judged without folding, or the same note would pass. */
function genEi(p){
  const {lo,hi}=band(p),ks=EIV[lvl("ei")].filter(k=>Math.min(hi,p.high-k)>=lo),k=pick(ks.length?ks:[7]),r=rnd(lo,Math.max(lo,Math.min(hi,p.high-k)));
  const nm=IVN[k];
  return {ans:r+k,other:r,k,said:"That was the starting note.",strict:k===12,reveal:`${nm[0].toUpperCase()+nm.slice(1)} above is this.`,
    model:async()=>{await play([r],1.0);await speak(D.seen.ei?`${nm[0].toUpperCase()+nm.slice(1)} above.`:`Sing the note ${nm} above.`)}};
}
/* one item: the model, the singer's answer, a one-line verdict; a wrong answer gets the right note and a second try. Only the first answer that was heard counts for the level. */
async function earRep(kind,g){
  let reveal=false,counted=false,res=null,lv="";
  for(let k=0;k<2;k++){
    await replayIfAsked();
    if(k===0||!reveal)await g.model();else await play([g.ans],1.0);
    setTarget(null);setSub("your turn");
    const f=await listen({max:8000,wait:6000,endSil:1200});setSub("");
    if(S.misses>=3){await waitForSinger();if(k===0){k--;continue}break}
    const a=analyseHold(f,g.ans,{longest:true});
    if(!a.heard){if(k===0){await speak("I didn't catch that. Once more.");continue}await speak("I didn't hear that one.");break}
    const ok=Math.abs(g.strict?(a.single.p-g.ans)*100:a.bias)<=70;
    if(!counted){counted=true;res={ok};const ch=result(kind,ok);lv=ch==="up"?"Stepping up a level.":ch==="down"?"I'll make this one a bit easier.":""}
    if(ok){await speak(reveal?"That's it.":pick(["Right.","Yes.","Correct."]));break}
    if(k===0){
      let d=(a.single.p-g.other)*100;d-=Math.round(d/1200)*1200;
      await speak(`Not quite. ${g.other!=null&&Math.abs(d)<=70?g.said+" ":""}${g.reveal}`);reveal=true;
    }else await speak("Not this time. Next one.");
  }
  if(lv)await speak(lv);
  return res;
}
async function earSet(p,kind,intro,short,gen){
  await speak(D.seen[kind]?short:intro);
  const n=lvl(kind)>=3?5:4;let any=false;
  for(let i=0;i<n;i++)if(await earRep(kind,gen(p)))any=true;
  if(any)D.seen[kind]=1;
}
async function earTrain(p){
  await speak(D.seen.ear?"Ear training. Sing your answers.":"Ear training. I play notes, and you answer by singing, never by speaking.");D.seen.ear=1;
  /* two of the three exercises per block, rotating, so the block stays about as long as the others */
  const sets=[["eh","Higher or lower. I play two notes. Sing back the higher one.","Higher one.",genEh],
    ["em","Missing note. I play three notes of a scale, with a gap in the middle, like do, re, fa. Sing the note that fits the gap.","Missing note.",genEm],
    ["ei","Interval by ear. I play one note and name an interval. Sing the note that far above it.","Interval by ear.",genEi]];
  const k=D.earK||0;D.earK=k+1;
  for(const i of [k%3,(k+1)%3])await earSet(p,...sets[i]);
}
async function feel(){setSub("your turn");await listen({max:10000,wait:6000,count:false});setSub("");return S.lastTake}
async function plainTake(m,dur=1.2){await play([m],dur);return feel()}
async function onset(p){
  const tip=tipFor("onset"),m=p.home;
  await speak(`Clean onsets. ${why("onset")}A breathy start has an H in front of it, like this.`);
  await DEMO.onsetH(m);
  await speak("A hard start has a little click, like this.");
  await DEMO.onsetHard(m);
  await speak("A clean start has neither, like this.");
  await play([m],1.0);
  await speak(`Today's cue: ${tip.say} Sing five short ahs on this note, like this.`);
  for(const n of [m,m+2]){
    await DEMO.staccato(n);setSub("your turn");
    await listen({max:8000,wait:5000,endSil:1400,count:false});setSub("");
    if(S.lastTake){await speak("Listen for an H or a click at the start of each note.");await playTake(S.lastTake)}
    else await speak("I didn't hear that one.");
  }
  await rep([m],{dur:1.5,hold:true,intro:"Now one long note, with that same clean start.",always:true,own:false,need:2.5});
  if(xferNow())await transfer(p,"onset");
}
async function registers(p){
  const tip=tipFor("reg");
  await speak(`Registers. ${why("reg")}Today's cue: ${tip.say} Slide on woo from low to high and back, like this.`);
  for(let k=0;k<3;k++){
    if(k===0)await DEMO.siren(p);
    else await speak(k===2?"Once more, on N G this time, like the end of the word sing.":"Again, slower through the middle.");
    setTarget(null);setSub("your turn");
    const f=await listen({max:11000,wait:6000,endSil:1500,count:false});setSub("");
    const b=breaksOf(f);
    if(!b){await speak("I didn't hear enough of that slide.");continue}
    if(b.breaks.length){D.brk=(D.brk||[]).concat(Math.round(b.breaks[0])).slice(-8);
      await speak(`Your voice flipped around ${spoken(b.breaks[0])}.`+(k<2?" Go softer and slower through that spot.":""))}
    else await speak(`Smooth from ${spoken(b.lo)} to ${spoken(b.hi)}, no flip.`);
    if(k===0&&S.lastTake){await speak("Listen.");await playTake(S.lastTake)}
  }
  if(xferNow())await transfer(p,"reg");
}
async function clearTone(p){
  const tip=tipFor("tone"),m=p.home;
  await speak(`Clear tone. ${why("tone")}First the contrast. A singer sings a scale very breathy, half whisper, like this.`);
  await real("breathy",()=>DEMO.breathy(m));
  await speak("Now you, breathy, on this note.");
  await play([m],1.0);setSub("your turn");
  await listen({max:10000,wait:6000,count:false});setSub("");
  const B=S.lastTake;
  await speak("Now clear, with no air leaking. The same singer, like this.");
  await real("clear");
  await speak(`Today's cue: ${tip.say} Your note.`);
  const C=await plainTake(m);
  if(B&&C){await speak("Listen back. Breathy, then clear.");await playTake(B);await sleep(300);await playTake(C)}
  for(const n of [m+2,m+4]){
    await speak(tip.short);
    const T=await plainTake(n);
    if(T){await speak("Listen.");await playTake(T)}else await speak("I didn't hear that one.");
  }
  if(xferNow())await transfer(p,"tone");
}
async function legato(p){
  const tip=tipFor("legato"),r=p.home-2;
  await speak(`Smooth line. ${why("legato")}Separate notes sound like this.`);
  await real("separate",()=>DEMO.choppy([0,2,4,2,0].map(x=>r+x)));
  await speak("A smooth line sounds like this.");
  await real("smooth",()=>DEMO.smooth([0,2,4,2,0].map(x=>r+x)));
  await speak(`Sing these notes on one breath, as one unbroken sound. Today's cue: ${tip.say}`);
  for(const [k,syl] of [[0,"On ah."],[2,"On ah again."],[0,"Now on la, with quick L's."]]){
    await speak(syl);
    const t=[0,2,4,2,0].map(x=>r+k+x);
    await play(t,0.7);setSub("your turn");
    const f=await listen({max:t.length*900+4500,wait:5000});setSub("");
    if(S.misses>=3){await waitForSinger();continue}
    const lg=legatoOf(f);
    if(!lg){await speak("I didn't hear enough of that.");continue}
    await speak(lg.gaps===0?"One unbroken line.":lg.gaps<=2?`Nearly. I heard ${lg.gaps===1?"one small break":"two small breaks"} between the notes.`:"It came out in separate pieces. Keep the sound going while the pitch changes.");
    if(lg.gaps>2&&S.lastTake){await speak("Listen.");await playTake(S.lastTake)}
  }
  if(xferNow())await transfer(p,"legato");
}
async function release(p){
  const tip=tipFor("release"),t=[0,2,4,2,0].map(x=>p.home-2+x);
  await speak(`Loose jaw and tongue. ${why("release")}Today's cue: ${tip.say}`);
  await speak("First with your tongue resting out on your lower lip. It sounds silly, and it stops the tongue from pulling back. Three notes up and back down, on ah.");
  await rep(t,{dur:0.7,own:false,noRetry:true,quiet:true,replay:"always",replayTarget:false});
  await speak("Now normally, with a loose jaw. Same notes.");
  await rep(t,{dur:0.7,own:false});
  await speak("Notice whether the second one felt easier. That is the feeling to keep.");
  if(xferNow())await transfer(p,"release");
}
/* Songs are melodies only. n = semitones from the tonic, one per sung note; d = beats per note (quarter note = 1), same length;
   w = a cue of 2 to 4 words, the start of the phrase, never the lyrics (the coach says "It starts: <cue>"); beat = seconds per beat.
   Four phrases per song. A held note longer than 4 beats is cut to 4. Rests are left out; tied notes are one note.
   Sources, ABC transcriptions fetched from abcnotation.com and checked against a second one (except where said):
   Saints: abc.musicaviva.com/tunes/usa/when-the-saints.abc and trillian.mit.edu/~jc/music/abc/demo/Tunes/WhenTheSaintsGoMarchingIn
   Michael: abc.musicaviva.com/tunes/usa/michael-row-d.abc and sniff.numachi.com/~rickheit/dtrad (MICHAELR)
   Silent night: colinhume.com/ABC.txt (Silent Night) and sniff.numachi.com/~rickheit/dtrad (SLNTNITE)
   Down in the valley: abc.musicaviva.com/tunes/usa/down-in-the-valley.abc (one source only; the melody agrees with what is generally sung)
   My Bonnie: colinhume.com/ABC.txt (My Bonnie Lies Over the Ocean), sniff.numachi.com/~rickheit/dtrad (MYBONNIE), trillian.mit.edu/~jc/music/abc/demo/Tunes/MyBonnieLiesOverTheOcean
   Home on the range: abc.musicaviva.com/tunes/usa/home-on-the-range.abc and trillian.mit.edu/~jc/music/abc/mirror/gulfweb.net:34043/~rlwalker/abc/home
   Clementine: trillian.mit.edu/~jc/music/abc/mirror/gulfweb.net:34043/~rlwalker/abc/clementine and sniff.numachi.com/~rickheit/dtrad (CLEMENTI)
   Left out because the sources disagreed or the range was too wide: Red River Valley, Shenandoah, Scarborough Fair, Swing Low, Auld Lang Syne. */
const SONGS=[
  {name:"Twinkle, twinkle, little star",beat:0.5,ph:[
    {n:[0,0,7,7,9,9,7],d:[1,1,1,1,1,1,2],w:"Twinkle, twinkle"},
    {n:[5,5,4,4,2,2,0],d:[1,1,1,1,1,1,2],w:"How I wonder"},
    {n:[7,7,5,5,4,4,2],d:[1,1,1,1,1,1,2],w:"Up above the world"},
    {n:[7,7,5,5,4,4,2],d:[1,1,1,1,1,1,2],w:"Like a diamond"}]},
  {name:"Are you sleeping",beat:0.6,ph:[
    {n:[0,2,4,0,0,2,4,0],d:[1,1,1,1,1,1,1,1],w:"Are you sleeping"},
    {n:[4,5,7,4,5,7],d:[1,1,2,1,1,2],w:"Brother John"},
    {n:[7,9,7,5,4,0,7,9,7,5,4,0],d:[0.5,0.5,0.5,0.5,1,1,0.5,0.5,0.5,0.5,1,1],w:"Morning bells are ringing"},
    {n:[0,-5,0,0,-5,0],d:[1,1,2,1,1,2],w:"Ding, dang, dong"}]},
  {name:"Amazing Grace",beat:0.55,ph:[
    {n:[-5,0,4,0,4,2,0,-3,-5],d:[1,2,0.5,0.5,2,1,2,1,2],w:"Amazing grace"},
    {n:[-5,0,4,0,4,2,7],d:[1,2,0.5,0.5,2,1,3],w:"That saved a wretch"},
    {n:[4,7,4,0,-5,-3,0,-5],d:[1,2,1,2,1,2,1,2],w:"I once was lost"},
    {n:[-5,0,4,0,4,2,0],d:[1,2,0.5,0.5,2,1,3],w:"Was blind, but now"}]},
  {name:"When the saints go marching in",beat:0.5,ph:[
    {n:[0,4,5,7,0,4,5,7],d:[1,1,1,4,1,1,1,4],w:"Oh when the saints"},
    {n:[0,4,5,7,4,0,4,2],d:[1,1,1,2,2,2,2,4],w:"Oh when the saints"},
    {n:[4,4,2,0,4,7,7,5],d:[1,1,1,4,2,2,1,3],w:"I want to be"},
    {n:[4,5,7,4,0,2,0],d:[1,1,2,2,2,2,4],w:"When the saints go"}]},
  {name:"Michael, row the boat ashore",beat:0.6,ph:[
    {n:[0,4,7,4,7,9,7],d:[1,1,1.5,0.5,0.5,1.5,2],w:"Michael row the boat"},
    {n:[4,7,9,7],d:[1,1,4,1],w:"Hallelujah"},
    {n:[4,7,7,4,5,4,2],d:[1,1,1.5,0.5,0.5,1.5,2],w:"Michael row the boat"},
    {n:[0,2,4,2,0],d:[1,1,2,2,2],w:"Hallelujah"}]},
  {name:"Silent night",beat:0.65,ph:[
    {n:[7,9,7,4,7,9,7,4],d:[1.5,0.5,1,3,1.5,0.5,1,3],w:"Silent night, holy night"},
    {n:[14,14,11,12,12,7],d:[2,1,3,2,1,3],w:"All is calm"},
    {n:[9,9,12,11,9,7,9,7,4],d:[2,1,1.5,0.5,1,1.5,0.5,1,3],w:"Round yon virgin"},
    {n:[9,9,12,11,9,7,9,7,4],d:[2,1,1.5,0.5,1,1.5,0.5,1,3],w:"Holy infant, so tender"}]},
  {name:"Down in the valley",beat:0.6,ph:[
    {n:[-5,0,2,4,0],d:[1,1,1,3,4],w:"Down in the valley"},
    {n:[4,2,0,2],d:[1,1,1,4],w:"Valley so low"},
    {n:[-5,-1,2,5,2],d:[1,1,1,3,4],w:"Hang your head over"},
    {n:[-1,0,2,0],d:[1,1,1,4],w:"Hear the wind blow"}]},
  {name:"My Bonnie lies over the ocean",beat:0.55,ph:[
    {n:[-5,4,2,0,2,0,-3,-5,-8],d:[1,1,1,1,1,1.5,0.5,1,3],w:"My Bonnie lies over"},
    {n:[-5,4,2,0,0,-1,0,2],d:[1,1,1,1,1,1,1,4],w:"My Bonnie lies over"},
    {n:[-5,-3,2,0,-1,-3,-1,0],d:[1,1,1,1,1,1,1,4],w:"Oh bring back my"},
    {n:[-1,-1,-1,-1,-3,-1,0,2,4],d:[1,1,1,1,1,1,2,1,3],w:"Bring back my Bonnie"}]},
  {name:"Home on the range",beat:0.55,ph:[
    {n:[-5,-5,-5,0,2,4,0,-1,-3,5,5,5],d:[0.5,0.5,1,1,1,2,0.5,0.5,1,1,1,2],w:"Oh give me a home"},
    {n:[4,5,7,0,0,0,-1,0,2],d:[0.5,0.5,1.5,0.5,1,1,1,1,4],w:"Where the deer"},
    {n:[5,5,4,2,0,-1,0,2,0],d:[0.5,0.5,1.5,0.5,1,1,1,1,4],w:"And the skies are"},
    {n:[7,5,4,2,4],d:[3,1,1.5,0.5,4],w:"Home, home on"}]},
  {name:"Clementine",beat:0.5,ph:[
    {n:[0,0,0,-5,4,4,4,0],d:[0.75,0.25,1,1,0.75,0.25,1,1],w:"In a cavern"},
    {n:[0,4,7,7,5,4,2],d:[0.5,0.5,1.5,0.5,0.5,0.5,2],w:"Excavating for a mine"},
    {n:[2,4,5,5,4,2,4,0],d:[0.5,0.5,1,1,0.5,0.5,1,1],w:"Dwelt a miner"},
    {n:[0,4,2,-5,-1,2,0],d:[0.5,0.5,1,1,0.5,0.5,2],w:"And his daughter"}]}];
/* The song list is the built-in songs plus the ones typed in at home (rvc_mySongs, same format with own:true). rvc_songKnow = {name: "know" |
   "teach" | "skip"}, set in the Guide: know = practised as it is, teach = the song block plays each line twice first, skip = never used.
   Unmarked: teach, except the nursery tunes (DEFKNOW) and own songs, which are know. songList is who may be used for this range: not skipped
   and fitting (span in semitones within the measured range), falling back to the not-skipped ones, then to all, so there is always a song.
   songPool puts the least-sung first, and at the same count the songs Paul knows before the ones to teach, so every song comes once (known ones
   first) before any repeats; sorting by know first would never reach the songs to teach. */
const DEFKNOW={"Twinkle, twinkle, little star":"know","Are you sleeping":"know"};
const songMode=s=>store.get("songKnow",{})[s.name]||(s.own?"know":DEFKNOW[s.name]||"teach");
const setSongMode=(s,m)=>{const k=store.get("songKnow",{});k[s.name]=m;store.set("songKnow",k)};
const mySongs=()=>store.get("mySongs",[]),allSongs=()=>SONGS.concat(mySongs());
const songSpan=s=>{const a=s.ph.flatMap(x=>x.n);return Math.max(...a)-Math.min(...a)};
const songFits=(s,p)=>!p||songSpan(s)<=p.high-p.low-1;
function songList(p){
  const all=allSongs(),on=all.filter(s=>songMode(s)!=="skip"),use=on.length?on:all,fit=use.filter(s=>songFits(s,p));
  return fit.length?fit:use;
}
function songPool(p){
  const c=D.sungS||{},r=s=>songMode(s)==="know"?0:1;
  return songList(p).map((s,i)=>[s,i]).sort((a,b)=>(c[a[0].name]||0)-(c[b[0].name]||0)||r(a[0])-r(b[0])||a[1]-b[1]).map(x=>x[0]);
}
/* Typing in a song: "C4 C4 G4/2 | Twinkle twinkle" per phrase. Note names with octave (C#4, Bb3), /length in beats (default 1), then | and a cue of
   at most 5 words. Returns the song in SONGS format, relative to the first note of the first phrase, or {err} naming the phrase and the token. */
const TEMPO={slow:0.65,medium:0.55,fast:0.45};
function parseOwn(name,beat,lines){
  const PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11},ph=[];let base=null;
  for(let i=0;i<lines.length;i++){
    const line=(lines[i]||"").trim();if(!line)continue;
    const k=i+1,[nt,...rest]=line.split("|"),cue=rest.join("|").trim().replace(/\s+/g," "),toks=nt.trim().split(/\s+/).filter(Boolean),m=[],d=[];
    if(toks.length<2)return {err:`Phrase ${k}: write at least two notes, like C4 D4.`};
    if(toks.length>40)return {err:`Phrase ${k}: that is more than 40 notes. Split it into two phrases.`};
    for(const t of toks){
      const x=/^([A-Ga-g])([#b]?)(\d)(?:\/(\d*\.?\d+))?$/.exec(t);
      if(!x)return {err:`Phrase ${k}, "${t}": not a note. Write a letter A to G, then # or b if needed, then the octave, then / and the length in beats if it is not 1. For example C#4 or G4/2.`};
      const mi=12*(+x[3]+1)+PC[x[1].toUpperCase()]+(x[2]==="#"?1:x[2]==="b"?-1:0),dur=x[4]==null?1:+x[4];
      if(mi<36||mi>84)return {err:`Phrase ${k}, "${t}": too low or too high. Use octaves 2 to 6.`};
      if(!(dur>=0.25&&dur<=8))return {err:`Phrase ${k}, "${t}": the length must be between 0.25 and 8 beats.`};
      m.push(mi);d.push(dur);
    }
    if(cue.split(" ").filter(Boolean).length>5||cue.length>40)return {err:`Phrase ${k}: after the | write only the first few words, 5 at most.`};
    if(base==null)base=m[0];
    ph.push({n:m.map(v=>v-base),d,w:cue});
  }
  if(!ph.length)return {err:"Type at least one phrase, like C4 D4 E4 | First words."};
  return {song:{name:(name||"").trim().replace(/\s+/g," "),beat,ph,own:true}};
}
/* Sounds with a job: a syllable whose consonant sets one thing (tongue, tone, larynx, the break), sung on a short pattern,
   then the half-step climb. The synth has no consonants, so the model uses the closest vowel shape and the coach names the sound.
   tipFor("job") rotates the four sounds; the pattern changes every fourth block. The climb starts near the bottom of the range
   and stops after two bad misses in a row, near the top of the range, or after 8 steps. */
const JOBPATS=[[0,2,4,5,7,5,4,2,0],[0,4,7,4,0]];
async function sounds(p){
  const tip=tipFor("job"),pat=JOBPATS[(D.sj++>>2)%2],top=Math.max(...pat),what=pat.length>5?"the five-note scale up and back down":"one, three, five, three, one";
  const s0=Math.max(p.low,Math.min(p.low+2,p.high-1-top-3)),steps=clamp(p.high-1-top-s0+1,2,8),notes=r=>pat.map(x=>r+x),o={dur:0.4,gap:0.05,own:false,noRetry:true,noScore:true,vz:tip.vz};
  await speak(`Sounds with a job. ${why("job")}Today's sound: ${tip.say} A singer sings it on ${what}. It sounds like this, without the consonants.`);
  await play(notes(s0+3),o.dur,o.gap,tip.vz);
  await speak("Now the climb. The same sound on the same notes, starting low. After each one I go up a half step. We stop when it gets hard.");
  let best=null,bad=0,n=0;
  for(;n<steps;n++){
    if(n)await speak("Up a half step.");
    const a=await rep(notes(s0+n),o);
    if(a&&a.heard&&a.success)best=s0+n+top;
    bad=!a||!a.heard||a.avg>=60?bad+1:0;
    if(bad>=2){await speak("That's the top for today.");break}
  }
  if(n>=steps)await speak("That's as high as I'll take you today.");
  if(best==null)await speak("I didn't hear a clean step this time, so there's no climb to report.");
  else{
    const c=D.climb,d=c?best-c.last:0;
    await speak(`You climbed to ${spoken(best)} today.`+(!c?" I'll compare it with this next time.":d>0?` That's ${numWord(d)} half step${d>1?"s":""} higher than last time.`:d===0?" The same as last time.":` Last time you reached ${spoken(c.last)}. It varies with the day.`)+(c&&best>c.best?" A new best.":""));
    D.climb={last:best,best:Math.max(best,c?c.best:0)};
  }
  if(xferNow())await transfer(p,"job","mum",`the job of today's sound: ${tip.job}`);
}
/* the key a song is sung in: centred just above the comfortable note, kept inside the range */
function songTon(s,p){
  const all=s.ph.flatMap(x=>x.n),mn=Math.min(...all),mx=Math.max(...all);
  return clamp(Math.round(p.home+2-(mn+mx)/2),p.low+1-mn,Math.max(p.low+1-mn,p.high-1-mx));
}
/* Carry-over to music: about every second technique block ends with one line of a song, first on a plain syllable
   with the block's cue, then with the words. The second term shifts the pattern every 8 blocks, so a topic that
   always lands on the same beat (nasality when set to "more") still gets it about half the time. */
const xferNow=()=>{const k=D.xf=(D.xf||0)+1;return (k+(k>>3))%2===0};
async function transfer(p,topic,syl="ah",say=""){
  const kn=songList(p).filter(s=>songMode(s)==='know'),all=(kn.length?kn:[SONGS[0]]).flatMap(s=>s.ph.map(ph=>[s,ph])),[s,ph]=all[(D.xp||0)%all.length];D.xp=(D.xp||0)+1;
  const ton=songTon(s,p),t=ph.n.map(x=>ton+x),durs=ph.d.map(x=>x*s.beat),tip=S.tip[topic],cue=say||(tip?`today's cue, ${tip.name}`:"the same feeling");
  await speak(`Now take that into a song. One line of ${s.name}, first on ${syl}, keeping ${cue}.`);
  await rep(t,{durs,own:false,noRetry:true});
  await speak(`Now the same line with the words.${cueSay(ph)}`);
  await rep(t,{durs,own:false,noRetry:true,words:true});
}
/* a phrase's cue, said after "with the words": the start of the line, never the whole line */
const cueSay=ph=>ph.w?` It starts: ${ph.w}.`:"";
/* D.song = {n: name of the song in progress, ph: next phrase, s: songs finished}; D.sungS counts finished songs by name.
   A song in progress carries on; a new one is the first of songPool (fitting; least sung; known before teach).
   A song marked "teach" gets each line played twice before Paul sings it. Singing it whole from memory within 50 cents on average makes it
   "know". Next pressed in the first phrase of a known song marks it "teach", for hands-free marking. */
async function song(p){
  const g=D.song;
  if(!g.n){const o=SONGS.slice(0,3);g.n=o[g.s%3].name;for(let i=0;i<g.s;i++){const n=o[i%3].name;D.sungS[n]=(D.sungS[n]||0)+1}} // saved before songs had names: s counted through the first three
  const pool=songPool(p);let s=g.ph>0?pool.find(x=>x.name===g.n):null;
  if(!s){s=pool[0];g.n=s.name;g.ph=0}
  const ton=songTon(s,p),teach=songMode(s)==="teach";let k=0;
  try{
    await speak(g.ph===0?`Song practice: ${s.name}. `+(teach?"This one is new to you, so I'll play each line first. Then you sing it.":"Phrase by phrase, first on la, then with the words."):`Back to ${s.name}.`);
    for(;k<2&&g.ph<s.ph.length;k++){
      const ph=s.ph[g.ph],t=ph.n.map(x=>ton+x),durs=ph.d.map(x=>x*s.beat);
      if(teach){await speak("Listen to this line.");await play(t,durs);await speak("Once more. Hum along quietly.");await play(t,durs)}
      await speak(`Phrase ${g.ph+1}, on la.`);await rep(t,{durs,own:false});
      await speak(`Now with the words.${cueSay(ph)}`);await rep(t,{durs,own:false,words:true});
      g.ph++;saveD();
    }
    if(g.ph>=s.ph.length){
      await speak("Now the whole song from memory, with the words. Here is your first note.");
      await play([ton+s.ph[0].n[0]],1.2);setSub("listening");
      const f=await listen({max:45000,wait:8000,endSil:3500});setSub("");
      const a=freeAnalysis(f);
      await speak(a?freeText(a):"I didn't hear enough of that.");
      if(a&&S.lastTake){const c=clipOf(S.lastTake,0,12);addClip(s.name,c);await speak("Here is the start of it.");await playTake(c)}
      let learned=false;
      if(a&&teach){let r=null;try{r=analyseSeq(f,s.ph.flatMap(x=>x.n.map(v=>ton+v)),{},S)}catch(e){}learned=!!(r&&r.heard&&r.avg<50)}
      D.sungS[s.name]=(D.sungS[s.name]||0)+1;
      D.song={s:g.s+1,n:s.name,ph:0};saveD();
      if(learned){setSongMode(s,"know");await speak("You know this one now.")}
    }
  }catch(e){
    if(e instanceof Skip&&k===0&&songMode(s)==="know"){setSongMode(s,"teach");D.song={s:g.s,n:s.name,ph:0};saveD();await speak("Okay, I'll teach you that one next time.")}
    throw e;
  }
}
async function freeSing(){
  await speak(S.round===1?"Free singing. Sing any song you like, without the radio. I'll listen for a minute.":"Free singing. One minute, any song.");
  setTarget(null);setSub("listening");
  const f=await listen({max:60000,wait:12000,endSil:9000});setSub("");
  if(S.misses>=3){await waitForSinger();return}
  const a=freeAnalysis(f);
  if(!a){await speak("I didn't hear enough singing there.");return}
  S.free=a.spread;
  await speak(freeText(a));
  if(S.lastTake){const c=clipOf(S.lastTake,3,12);await addClip("Free singing",c);
    const first=(await idb.all("clips")).find(x=>x.label==="Free singing"&&x.first);
    if(first&&Date.now()-first.t>=14*864e5&&(!D.thenNow||dayN(today())-dayN(D.thenNow)>=14)){
      D.thenNow=today();saveD();
      await speak("Here's your free singing from your first week, and then today's.");
      await playTake(clipOf(first,0,12));await playTake(c);
    }else if(S.round===1||a.spread>=35){await speak("Here are a few seconds of it.");await playTake(c)}}
}
async function resetVoice(){
  await speak("Short reset. Three relaxed sighs on a hum, sliding downwards. Then a sip of water if you have some.");
  await sleep(15000);
}
async function summary(){
  if(!S.scores.length)return;
  const avg=Math.round(mean(S.scores)),hist=store.get("history",[]),prev=hist.length?hist[hist.length-1]:null;
  let t=`So far today you're about ${avg} cents off on average.`+(S.round===1?" A hundred cents is one semitone.":"");
  if(prev&&S.round===1){const d=prev.err-avg;t+=Math.abs(d)<3?" That's about the same as last time.":d>0?` That's ${Math.round(d)} cents better than last time.`:` Last time was ${Math.round(-d)} cents better. It varies with the day.`}
  if(S.nasScores.length)t+=` On my rough nasality measure you scored ${Math.round(mean(S.nasScores)*100)} out of a hundred towards your open sound.`;
  if(S.tip.nasal&&!S.cueSaid&&S.done<8&&(S.cueSaid=true))t+=` Today's nasality cue was: ${S.tip.nasal.name}. If it worked for you, star it on the Guide page, and I'll use it more often.`;
  if(S.round===1){const g=goalDays(),n=weekDays(daysNow(true),weekStart(dayN(today())));t+=n>=g?` That's your weekly goal of ${g} days reached.`:` That's ${n} of your ${g} practice days this week.`}
  await speak(t);
}
function saveSession(){
  if(S.scores.length<4)return;
  const hist=store.get("history",[]),p=profile()||{};
  hist.push({d:today(),err:Math.round(mean(S.scores)),min:Math.round((performance.now()-S.sessionStart)/60000),low:p.low,high:p.high,
    cues:Object.values(S.tip).map(t=>t.id),diag:[Math.round(S.diag.zero/1000),Math.round(S.diag.stall/1000),S.diag.tts],hiss:S.hiss?+S.hiss.toFixed(1):null,hold:S.hold?+S.hold.toFixed(1):null,nasal:S.nasScores.length?Math.round(mean(S.nasScores)*100):null});
  store.set("history",hist.slice(-80));saveD();
}

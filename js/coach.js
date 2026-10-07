"use strict";
/* ---------- practice days, streak and weekly goal ---------- */
/* regularity beats length: a day counts when a session ran 3 minutes or more, kept apart from the session history (which needs 4 scores) */
const goalDays=()=>+store.get("goal",4);
function noteDay(){const d=store.get("days",[]);if(!d.includes(today())){d.push(today());d.sort();store.set("days",d.slice(-120))}}
const daysNow=inclToday=>{const d=store.get("days",[]);return inclToday&&!d.includes(today())?[...d,today()]:d};
function streakOf(days){const s=new Set(days.map(dayN));let n=dayN(today()),k=0;if(!s.has(n))n--;while(s.has(n)){k++;n--}return k}
const weekDays=(days,mon)=>days.filter(d=>{const n=dayN(d);return n>=mon&&n<mon+7}).length;
const numWord=n=>n<=10?["zero","one","two","three","four","five","six","seven","eight","nine","ten"][n]:String(n);

/* ---------- singing time and the daily limit ---------- */
/* rvc_sung = {d: date, s: seconds of actual singing that day, w: 1 once the 80 percent warning was said}, written about every 10 s of new singing and when a session ends */
const sungRec=()=>{const v=store.get("sung",null);return v&&v.d===today()?v:{d:today(),s:0}};
let sungPend=0;
const sungS=()=>sungRec().s+sungPend;
function sungSave(extra){const v=sungRec();v.s=+(v.s+sungPend).toFixed(1);sungPend=0;store.set("sung",Object.assign(v,extra))}
const sungAdd=sec=>{if(sec>0&&isFinite(sec))sungPend+=sec;if(sungPend>=10)sungSave()};
const sungMax=()=>+store.get("sungMax",30);
const sungLimit=()=>{const m=sungMax();return m&&sungS()>=m*60};
/* checked where every block starts: the 80 percent warning once a day, and true when the limit is reached */
async function limitCheck(){
  const m=sungMax();if(!m||S.mode!=="session")return false;
  const lim=m*60,sec=sungS();
  if(sec>=lim)return true;
  if(sec>=lim*0.8&&!sungRec().w){sungSave({w:1});const k=Math.max(1,Math.round((lim-sec)/60));await speak(`About ${numWord(k)} minute${k===1?"":"s"} of singing left for today.`)}
  return false;
}

/* ---------- range and difficulty ---------- */
function profile(){return store.get("profile",null)}
function band(p){
  let lo=Math.max(p.low+1,p.home-5),hi=Math.min(p.high-1,p.home+9);
  if(hi-lo<8){lo=p.home-4;hi=p.home+5}
  return {lo,hi};
}
const LMAX={pm:4,sc:5,iv:5,lt:3,eh:3,em:3,ei:3};
const lvl=k=>clamp(D.lv[k]||1,1,LMAX[k]);
/* keep each exercise near 70 percent success: step up at 80, down at 50 */
function result(k,ok){
  const a=D.res[k]=(D.res[k]||[]);a.push(ok?1:0);if(a.length>10)a.shift();
  if(a.length>=6){const r=mean(a);
    if(r>=0.8&&lvl(k)<LMAX[k]){D.lv[k]=lvl(k)+1;D.res[k]=[];return "up"}
    if(r<=0.5&&lvl(k)>1){D.lv[k]=lvl(k)-1;D.res[k]=[];return "down"}}
  return null;
}
/* Per-note map, D.notes[midi]={n,err}: takes and average cents off for each target note. Only the pitch exercises count (the ones with a kind:
   notes, scales, intervals, long notes); technique blocks, where pitch is not the point, and the half-step climb stay out. A note that was not
   found in a take that was heard counts as 100 cents. A plain mean for the first four takes, then a running average that follows the latest. */
function noteStat(m,e){const k=D.notes[m]=D.notes[m]||{n:0,err:0};k.n++;k.err=+(k.n<5?k.err+(e-k.err)/k.n:k.err*0.85+e*0.15).toFixed(1)}
function noteMap(a){D.notes=D.notes||{};a.T.forEach((m,i)=>noteStat(m,a.errs[i]==null?100:Math.abs(a.errs[i])))}
/* the hardest notes with five takes or more between a and b: 15 cents or more off, worst first */
const weakIn=(a,b,k=3)=>Object.entries(D.notes||{}).map(([m,v])=>({m:+m,n:v.n,err:v.err})).filter(x=>x.n>=5&&x.err>=15&&x.m>=a&&x.m<=b).sort((x,y)=>y.err-x.err).slice(0,k);
const rnd=(a,b)=>a+Math.floor(Math.random()*Math.max(1,b-a+1));
/* weak: aim at one of the weak notes inside this level's range (if there is one), and keep that take out of the level, so the levels still follow the ordinary notes */
function genPm(p,weak=false){
  const {lo,hi}=band(p),L=lvl("pm");let a=lo,b=hi;
  if(L===1){a=Math.max(lo,p.home-3);b=Math.min(hi,p.home+4)}
  if(L>=3){a=p.low+1;b=p.high-1}
  const w=weak?pick(weakIn(a,b)):undefined;
  return w?{t:[w.m],o:{dur:L>=4?0.6:1.2,kind:"pm",noLevel:true},weak:true}:{t:[rnd(a,b)],o:{dur:L>=4?0.6:1.2,kind:"pm"}};
}
async function repWeak(g){
  if(g.weak&&!S.weakSaid){S.weakSaid=true;await speak("This one is a note you find harder.")}
  return rep(g.t,g.o);
}
const SCALES={1:[0,2,4,2,0],2:[0,2,4,5,7,5,4,2,0],3:[0,2,4,5,7,5,4,2,0],4:[0,4,7,12,7,4,0],5:[0,2,4,5,7,9,11,12,11,9,7,5,4,2,0]};
function genSc(p){
  const L=lvl("sc");let {lo,hi}=band(p),pat=SCALES[L];
  if(Math.max(...pat)>hi-lo){lo=p.low+1;hi=p.high-1}
  if(Math.max(...pat)>hi-lo)pat=SCALES[2];
  if(Math.max(...pat)>hi-lo)pat=SCALES[1];
  const root=rnd(lo,hi-Math.max(...pat));
  return {t:pat.map(x=>root+x),o:{dur:L===1?0.7:L===2?0.6:0.48,kind:"sc"}};
}
const IVS={1:[2,3,4],2:[2,3,4,5,7],3:[3,4,5,7,8,9,12],4:[3,4,5,7,8,9,12],5:[1,2,3,4,5,6,7,8,9,10,11,12]};
function genIv(p){
  const {lo,hi}=band(p),L=lvl("iv"),iv=IVS[L].filter(x=>x<=hi-lo),k=pick(iv.length?iv:[2]),r=rnd(lo,hi-k);
  return {t:(L>=4&&Math.random()<0.5)?[r+k,r]:[r,r+k],o:{dur:0.9,kind:"iv"}};
}
function genLt(p,i){
  const L=lvl("lt");
  return {t:[p.home+[0,2,4,-2,5][i%5]],o:{dur:2.2,hold:true,kind:"lt",need:[3,5,7][L-1],maxListen:[12000,14000,16000][L-1]}};
}
async function findRange(){
  setStage("Finding your voice");
  let home=null;
  for(let a=0;a<2&&home==null;a++){
    await speak(a?"Let's try again. Hum or sing ah on any easy note, and hold it.":"First, hum or sing ah on any comfortable note, and hold it for a few seconds.");
    const f=await listen({max:7000,wait:7000,endSil:1000});
    const ms=f.filter(x=>x.m!=null).map(x=>x.m);
    if(ms.length>15)home=Math.round(median(ms));
  }
  const old=profile();
  if(home==null)home=old?old.home:55;
  await speak("Now slide from your lowest note up to your highest and back down, like a siren, on oo. Like this, but all the way to your own lowest and highest notes.");
  await DEMO.siren({home});
  const f=await listen({max:10000,wait:6000,endSil:1600});
  const ms=f.filter(x=>x.m!=null).map(x=>x.m);
  let low=home-6,high=home+8;
  if(ms.length>20){const l=Math.round(pct(ms,0.05)),h=Math.round(pct(ms,0.95));if(h-l>=7){low=Math.min(l,home-2);high=Math.max(h,home+3)}}
  if(old){low=Math.round((low+old.low)/2);high=Math.round((high+old.high)/2);home=Math.round((home+old.home)/2)}
  const p={home,low,high};store.set("profile",p);
  await speak(`Got it. Your comfortable note is around ${spoken(home)}, and your range today goes from ${spoken(low)} to ${spoken(high)}.`);
  return p;
}

/* ---------- one exercise repetition ---------- */
async function replayIfAsked(){
  if(!S.replayReq)return;S.replayReq=false;
  if(S.prevTake){await speak("Your last take.");await playTake(S.prevTake)}else await speak("There's no take to replay yet.");
}
async function model(targets,o){
  if(o.own!==false&&!o.durs&&targets.length<=2&&targets.every(ownFor)&&Math.random()<0.5){
    if(!S.ownSaid){S.ownSaid=true;await speak("This one is in your own voice, from a take you sang in tune.")}
    await playOwn(targets);
  }else await play(targets,o.durs||o.dur||0.75,o.gap,o.vz);
}
async function guard(a,o){
  if(o.noGuard||!a.heard||!S.base||!a.level)return;
  if(a.level>S.base*2.2)S.loud++;else S.loud=0;
  if(S.loud>=2&&clock()-S.loudAt>240000){S.loud=0;S.loudAt=clock();await speak("You're getting louder. I can hear you fine, so ease back to an easy speaking volume.")}
}
async function waitForSinger(){
  setSub("paused");
  await speak("I'll wait. Sing any note whenever you're ready to carry on.");
  setTarget(null);
  while(true){
    S.frames=[];await sleep(1500*SPEED);
    const v=S.frames.filter(x=>x.m!=null).length;S.frames=null;
    if(v>=15)break;
  }
  S.misses=0;setSub("");
  await speak("Welcome back.");
}
async function rep(targets,o={}){
  let a=null;
  for(let attempt=0;attempt<2;attempt++){
    await replayIfAsked();
    if(o.intro&&attempt===0)await speak(o.intro);
    if(o.modelFn)await o.modelFn();else await model(targets,o);
    setSub("your turn");
    const total=targets.reduce((s,_,i)=>s+durOf(o.durs||o.dur||0.75,i)+(o.gap||0.06),0);
    const f=await listen({max:o.maxListen||(total*1800+6000),wait:6000,endSil:o.endSil||1500});
    setSub("");
    const take=S.lastTake;
    if(S.misses>=3){await waitForSinger();if(attempt===0)continue;return null}
    a=o.hold?analyseHold(f,targets[0],o):analyseSeq(f,targets,o,S);
    let lvMsg="";
    if(a.heard){
      if(!o.quiet&&!o.swell&&!o.noScore){S.scores.push(a.avg);S.biases.push(a.bias);if(S.blk)S.blk.reps.push({avg:a.avg,bias:a.bias,take})}
      if(o.kind&&!o.quiet&&!o.noScore)noteMap(a);
      if(o.kind&&!o.noLevel){const ch=result(o.kind,a.success);if(ch==="up")lvMsg="Stepping up a level.";if(ch==="down")lvMsg="I'll make this one a bit easier."}
      if(o.vowel){const v=D.vow[o.vowel]=D.vow[o.vowel]||{n:0,sum:0,abs:0};v.n++;v.sum+=a.bias;v.abs+=a.avg}
      if(o.longest){S.hold=Math.max(S.hold||0,a.dur);const prev=D.best.hold||0;
        a.text=`${Math.round(a.dur)} seconds. `+(prev?(a.dur>prev+0.5?`A new record; your best was ${Math.round(prev)}. `:`Your best is ${Math.round(prev)}. `):"")+a.text;
        if(a.dur>prev)D.best.hold=a.dur}
      if(!S.base&&a.level&&!o.swell)S.base=a.level;
      bankMaybe(a,take,o);
    }
    S.repN++;
    const big=!a.heard||a.avg>=60;
    const due=!o.quiet&&(o.always||big||S.fbEvery===1||S.repN%S.fbEvery===0);
    if(due){
      if(a.heard&&!o.swell&&!o.longest&&!o.scoopFocus){
        await speak(S.judgeSaid?"Flat, sharp, or on?":"Before I tell you: was that flat, sharp, or on? Decide for yourself.");S.judgeSaid=true;
        await sleep(1000);
      }
      await speak(lvMsg?`${a.text} ${lvMsg}`:a.text);
    }else if(a.heard&&lvMsg)await speak(lvMsg);
    else if(!o.quiet||!a.heard)await (a.heard?blip():speak(a.text));
    const firstSeen=o.kind&&!D.seen[o.kind];if(o.kind&&a.heard)D.seen[o.kind]=1;
    if(take&&a.heard&&(o.replay==="always"||firstSeen||(!o.quiet&&a.avg>=60))){
      if(o.replayTarget===false){await speak("Listen.");await playTake(take)}
      else{await speak("Listen: the target, then you.");await play(targets,o.durs||o.dur||0.75,o.gap);await playTake(take)}
    }
    await guard(a,o);
    if(!a.retry||attempt===1||o.noRetry)break;
    await speak("Once more.");
  }
  return a;
}

/* ---------- cues: several per topic, rotated across sessions so the singer can find which ones stick ---------- */
const TOPICS={nasal:"Nasality",job:"Sounds with a job",pitch:"Pitch",breath:"Breath",onset:"Clean onsets",reg:"Registers",tone:"Clear tone",legato:"Smooth line",release:"Loose jaw and tongue",posture:"Posture"};
const TIPS={
  nasal:[
    {id:"n-gasp",name:"Silent gasp",say:"Take a small silent gasp, as if pleasantly surprised. Feel the back of your mouth lift. Keep that lift and sing ah.",short:"Small gasp, keep the lift, sing ah."},
    {id:"n-yawn",name:"Start of a yawn",say:"Begin a yawn, only the very start of it. Feel the roof of your mouth rise at the back. Keep that space and sing ah.",short:"Start of a yawn, keep the space, sing ah."},
    {id:"n-smile",name:"Inner smile",say:"Smile on the inside of your mouth, like the Mona Lisa, with your face relaxed. The back of the roof of your mouth lifts. Keep that and sing ah.",short:"Inner smile, then sing ah."},
    {id:"n-ball",name:"Ping-pong ball",say:"Imagine a ping-pong ball resting on the back of your tongue. Make room for it, and sing ah around it.",short:"Room for the ping-pong ball, then sing ah."},
    {id:"n-gpop",name:"G pop",say:"Say guh, guh, guh. Each G shuts the passage to your nose. Then sing gah on this note and hold the ah, keeping it shut.",short:"Guh, guh, guh, then sing gah and hold it."},
    {id:"n-bah",name:"B instead of M",say:"Say bah, bah, bah. You cannot make a B while air leaks through your nose. Then sing bah on this note and hold the ah.",short:"Bah, bah, bah, then sing bah and hold it."},
    {id:"n-laugh",name:"Silent laugh",say:"Think of a silent laugh, the lift at the back of your throat just before you laugh out loud. Keep it and sing ah.",short:"Silent laugh, keep the lift, sing ah."},
    {id:"n-sneeze",name:"Before a sneeze",say:"Imitate the moment just before a sneeze. Feel the lift behind your nose. Keep it and sing ah.",short:"The moment before a sneeze, then sing ah."},
    {id:"n-aim",name:"Aim at the windscreen",say:"Send the whole sound forward out of your mouth, at the windscreen. Nothing goes up into your nose. Sing ah.",short:"All the sound out of your mouth, at the windscreen. Sing ah."},
    {id:"n-brows",name:"Eyebrows and nostrils",say:"Raise the outer ends of your eyebrows a little and flare your nostrils. That lifts the soft palate with them. Keep it and sing ah.",short:"Eyebrows up, nostrils wide, sing ah."},
    {id:"n-hung",name:"Hung, then open",say:"Say hung and hold the N G for a moment. Then drop your jaw and open it to ah, and keep the ah out of your nose.",short:"Hold the N G, drop the jaw, open to ah."},
    {id:"n-uhah",name:"Dark uh to ah",say:"Start on a dark, relaxed uh. Then drop your jaw into ah without letting the sound move into your nose.",short:"Dark uh, drop the jaw, open to ah."},
    {id:"n-puff",name:"Puffed cheeks",say:"Puff your cheeks out a little and feel any air trying to leak into your nose. Stop it with a lift at the back of your mouth, then sing ah.",short:"Feel the air, lift the back, sing ah."},
    {id:"n-kin",name:"In-breath on a K",say:"Breathe in on a silent K, as if starting the word cat. Feel the back of your mouth lift. Keep that space and sing ah.",short:"Silent K in-breath, keep the space, sing ah."},
    {id:"n-yogi",name:"Dopey Yogi Bear",say:"Make a dark, dopey, Yogi Bear uh-ah and feel the back of your mouth open wide. Keep that open space and sing ah normally.",short:"Dopey Yogi Bear space, then sing ah."}],
  job:[
    {id:"j-ng",name:"Ng for the tongue",syl:"ng",vz:"ng",job:"a relaxed tongue and a forward sound",say:"Ng, like the end of the word sing. Its job is a relaxed tongue and a forward sound. Keep the tongue loose and feel the buzz at the front of your face.",short:"Ng: loose tongue, sound at the front."},
    {id:"j-gee",name:"Gee for brightness",syl:"gee",vz:"ee",job:"a loose tongue and a bright, easy tone",say:"Gee, like the letter G. Its job is a loose tongue and a bright, easy tone. Keep the tip of the tongue resting behind your lower front teeth.",short:"Gee: tongue down, bright and easy."},
    {id:"j-mum",name:"Mum with a yawn",syl:"mum",vz:"hum",job:"a low, relaxed larynx",say:"Mum, with a slight yawn, as if you were about to yawn. Its job is a low, relaxed larynx. Let the sound be easy and a little dark.",short:"Mum with a slight yawn: low and relaxed."},
    {id:"j-no",name:"A sad no",syl:"no",vz:"oh",job:"a voice that does not flip at the break",say:"A sad, droopy no, as if you were disappointed. Its job is to stop the voice flipping at the break: the sad sound keeps it steady and a little heavy.",short:"A sad no: steady through the break."}],
  pitch:[
    {id:"p-hear",name:"Hear it first",say:"Hear the note in your head before you sing it."},
    {id:"p-hum",name:"Hum, then open",say:"Hum the note quietly first, then open it to ah."},
    {id:"p-soft",name:"Moderate volume",say:"Sing at a moderate volume. Pitch is easier to steer when you are not pushing."}],
  breath:[
    {id:"b-low",name:"Low breath",say:"Breathe in low. Let your belly and lower ribs widen while your shoulders stay down."},
    {id:"b-small",name:"Only what you need",say:"Don't fill up to the brim. Take only the air this phrase needs."},
    {id:"b-flow",name:"Let it flow",say:"Let the air flow out by itself. Don't push it out with your stomach."},
    {id:"b-ribs",name:"Ribs stay wide",say:"While you sing, keep your ribs wide for as long as you can, as if you were still breathing in."},
    {id:"b-silent",name:"Silent in-breath",say:"Breathe in silently. A noisy breath means a tight throat."}],
  onset:[
    {id:"o-uhoh",name:"Gentle uh-oh",say:"Start each note like a very gentle uh-oh, without a click and without an H."},
    {id:"o-join",name:"Join the note",say:"Imagine the note is already sounding, and you simply join it."},
    {id:"o-pause",name:"Open pause",say:"Breathe in, pause for a split second with your throat open, then let the sound start by itself."},
    {id:"o-you",name:"Like the word you",say:"Think of the start of the word you: smooth and immediate."}],
  reg:[
    {id:"r-soft",name:"Quieter as you go up",say:"Get quieter as you go higher. Loudness is what makes the voice flip."},
    {id:"r-thin",name:"Lighter on the way up",say:"Let the sound get thinner and lighter on the way up. Don't carry the heavy low sound upward."},
    {id:"r-lift",name:"A lift, not stairs",say:"Slide slowly through the spot where it flips, like a lift, not like stairs."},
    {id:"r-air",name:"Same easy air",say:"Keep the same easy airflow all the way. Don't push at the top."}],
  tone:[
    {id:"t-aha",name:"Firm ah-ha",say:"Say a firm, friendly ah-ha, and sing with that same clean edge.",short:"Firm ah-ha, then sing ah."},
    {id:"t-less",name:"Less air",say:"Use less air, not more. A clear note needs only a little, steady air.",short:"Less air, steady. Sing ah."},
    {id:"t-vah",name:"Start with a V",say:"Start the note with a V: vah. It brings the sound forward and closes the leak.",short:"Sing vah and hold it."},
    {id:"t-sigh",name:"Easy sigh",say:"If it feels squeezed, think of an easy sigh and let the sound out, instead of holding it back.",short:"Easy, like a sigh, but clear. Sing ah."}],
  legato:[
    {id:"l-vowel",name:"One long vowel",say:"Sing it as one long vowel that happens to change pitch."},
    {id:"l-stream",name:"Steady stream",say:"Keep the air flowing like a slow, steady stream. The notes ride on it."},
    {id:"l-late",name:"Late consonants",say:"Make the consonants quick and late. The vowel gets all the time."},
    {id:"l-fade",name:"No fading",say:"Don't let a note fade before the next one starts."}],
  release:[
    {id:"x-tip",name:"Tongue tip forward",say:"Rest the tip of your tongue behind your lower front teeth, with the middle of the tongue low and soft."},
    {id:"x-hang",name:"Jaw hangs",say:"Let your jaw hang, as if you were dozing off. It drops down and slightly back, not forward."},
    {id:"x-yawn",name:"Yawn it loose",say:"Yawn once, then keep that loose feeling in your jaw and throat."},
    {id:"x-wag",name:"Tongue stretch",say:"Move your tongue slowly side to side and up and down a few times, with a relaxed jaw."}],
  posture:[
    {id:"s-thread",name:"Golden thread",say:"Sit tall, as if a thread pulled the top of your head gently upward."},
    {id:"s-chin",name:"Chin level",say:"Keep your chin level. Don't push your head forward towards the windscreen."},
    {id:"s-shoulders",name:"Shoulders down",say:"Let your shoulders drop and hang loose."},
    {id:"s-chest",name:"Open chest",say:"Keep your chest open and your back long against the seat, without slumping."}]};
const WHY={
  nasal:"The soft palate is the soft back part of the roof of your mouth. When it hangs low, part of the sound goes out through your nose, and the tone turns thin and whiny. Lifting it sends the sound out through your mouth.",
  vowel:"The vowels carry your tone; the consonants only interrupt it. A well-shaped vowel sounds fuller and is easier to keep in tune.",
  breath:"Steady air is what keeps a note steady and in tune. The aim is an even flow, not a big breath.",
  onset:"The onset is the first instant of a note. A clean one makes the whole note clearer and puts less strain on your voice.",
  reg:"Your voice has a lower, heavier gear and a higher, lighter one. Where they meet it can flip or crack, like a small yodel. That is normal. Sliding through the join, gently, is how you smooth it.",
  tone:"A breathy tone leaks air, so it is quiet and tires you quickly. A clear tone turns the same air into more sound.",
  legato:"A smooth line is what makes singing sound like singing, and not like separate notes. The sound never stops while the pitch changes.",
  release:"A tight jaw or tongue muffles your vowels and makes higher notes harder. Loose is better than precise here.",
  job:"Each of these sounds has one job. The consonant sets your tongue, jaw and larynx for you, so you don't have to think about them. I can only play the vowel part, so sing the whole sound yourself."};
const why=k=>{D.why=D.why||{};const n=D.why[k]||0;D.why[k]=n+1;return n<3?WHY[k]+" ":""};
const tipStat=id=>D.tips[id]||(D.tips[id]={n:0});
function tipFor(topic){
  if(S.tip[topic])return S.tip[topic];
  const list=TIPS[topic],star=list.filter(t=>tipStat(t.id).star);
  let t;
  if(star.length&&Math.random()<0.4)t=pick(star);
  else{const mn=Math.min(...list.map(x=>tipStat(x.id).n));t=list.find(x=>tipStat(x.id).n===mn)}
  const st=tipStat(t.id);st.n++;st.last=today();S.tip[topic]=t;saveD();return t;
}

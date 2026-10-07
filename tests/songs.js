// Songs: the built-in list, the range fit, know / teach me / skip per song, the rotation, teaching a song, typing in your own song, and the backup.
// Part 1 needs no microphone (the Guide page and pure functions). Part 2 runs song() in a session with the simulated singer.
// node tests/songs.js
const {chromium}=require(process.env.PLAYWRIGHT||'/opt/npm-tools/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+__dirname+'/audio/voice.wav','--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:412,height:900},permissions:['microphone']});
  let errs=0,fails=0;const logs=[];
  const ok=(name,cond,detail="")=>{if(!cond)fails++;console.log((cond?'PASS ':'FAIL ')+name+(detail?'  ('+detail+')':''))};
  const newPage=async()=>{
    const p=await ctx.newPage();
    p.on('console',m=>{const t=m.text();if(t.startsWith('@'))logs.push(t)});
    p.on('pageerror',e=>{errs++;console.log('PAGEERROR',e.message)});
    await p.addInitScript(()=>{window.__speed=6;
      const ss={speak(u){if(u.text)console.log('@SAY '+u.text);Promise.resolve().then(()=>u.onend&&u.onend())},cancel(){},getVoices(){return[]},onvoiceschanged:null};
      Object.defineProperty(window,'speechSynthesis',{value:ss,configurable:true})});
    await p.goto('http://localhost:8765/index.html');return p;
  };
  const sayFrom=i=>logs.slice(i).filter(x=>x.startsWith('@SAY ')).map(x=>x.slice(5));

  // ================= part 1: data, fit, parsing, the Guide page =================
  let p=await newPage();
  const data=await p.evaluate(()=>{
    const bad=[],names=new Set();let spanMax=0;
    SONGS.forEach((s,i)=>{
      names.add(s.name);
      if(s.ph.length!==4)bad.push(s.name+': '+s.ph.length+' phrases');
      if(!(s.beat>=0.4&&s.beat<=0.7))bad.push(s.name+': beat '+s.beat);
      s.ph.forEach((x,k)=>{
        if(x.n.length!==x.d.length)bad.push(`${s.name} ${k+1}: n and d differ`);
        if(x.n.length<4)bad.push(`${s.name} ${k+1}: fewer than 4 notes`);
        if(x.n.some(v=>!Number.isInteger(v))||x.d.some(v=>!(v>=0.25&&v<=(i<3?3:4))))bad.push(`${s.name} ${k+1}: odd note or length`);
        const w=(x.w||"").trim().split(/\s+/).filter(Boolean).length;
        if(w<1||w>5||x.w.length>40)bad.push(`${s.name} ${k+1}: cue "${x.w}" is ${w} words`);
        if(x.d.reduce((a,c)=>a+c,0)*s.beat>10)bad.push(`${s.name} ${k+1}: longer than 10 s`);
      });
      const sp=songSpan(s);if(i>=3&&sp>12)bad.push(s.name+': span '+sp);if(sp>14)bad.push(s.name+': span '+sp);
      if(i>=3)spanMax=Math.max(spanMax,sp);
    });
    return {n:SONGS.length,unique:names.size,bad,spanMax,spans:SONGS.map(s=>songSpan(s))};
  });
  ok('every built-in song: 4 phrases, n and d of equal length, cues of 1 to 5 words, spans within limits',data.bad.length===0,data.bad.join('; '));
  ok('10 built-in songs with different names (3 old, 7 new)',data.n===10&&data.unique===10,data.n+' songs, spans '+data.spans.join(','));
  ok('no cue is a whole lyric line: the longest cue is 5 words, the cues together are short',await p.evaluate(()=>SONGS.flatMap(s=>s.ph).every(x=>x.w.split(/\s+/).length<=5)));

  // range fit, know / teach / skip, and the pool
  const fit=await p.evaluate(()=>{
    localStorage.clear();
    const names=a=>a.map(s=>s.name),P={low:50,high:60,home:55},W={low:40,high:70,home:55},byName=n=>SONGS.find(s=>s.name===n);
    const r={};
    r.noProfile=songFits(byName("Clementine"),null);
    r.fitNarrow=songList(P).every(s=>songSpan(s)<=9)&&songList(P).length>=1;
    r.excludedFit=names(songList(P));
    r.wide=songList(W).length;
    r.defaults=SONGS.map(s=>songMode(s)[0]).join("");
    r.ownDefault=songMode({name:"Mine",own:true,ph:[]});
    setSongMode(byName("Twinkle, twinkle, little star"),"skip");r.off1=names(songList(W)).includes("Twinkle, twinkle, little star");r.off1n=songList(W).length;
    store.set("songKnow",Object.fromEntries(SONGS.map(s=>[s.name,"skip"])));r.allOff=songList(W).length;
    store.set("songKnow",{});
    r.noneFit=songList({low:50,high:54,home:52}).length;
    r.exactEdge=songFits({ph:[{n:[0,9],d:[1,1]}]},{low:50,high:60,home:55})&&!songFits({ph:[{n:[0,10],d:[1,1]}]},{low:50,high:60,home:55});
    D.sungS={"Twinkle, twinkle, little star":2,"Are you sleeping":1};
    r.order=names(songPool(W));
    D.sungS={};setSongMode(byName("Clementine"),"know");
    r.order2=names(songPool(W)).slice(0,4);
    r.narrowOrder=names(songPool(P));
    store.set("songKnow",{});
    return r;
  });
  ok('a song fits when its span is at most high - low - 1 (9 fits 10 semitones of margin, 10 does not)',fit.exactEdge);
  ok('without a measured range every song counts as fitting',fit.noProfile);
  ok('with a narrow range only fitting songs are in the list',fit.fitNarrow,fit.excludedFit.length+' of 10: '+fit.excludedFit.join(', '));
  ok('defaults: Twinkle and Are you sleeping are "know", the other eight "teach"; an own song is "know"',fit.defaults==='kktttttttt'&&fit.ownDefault==='know',fit.defaults);
  ok('a wide range lists all songs; "Skip" removes one',fit.wide===10&&!fit.off1&&fit.off1n===9);
  ok('every song on Skip: all songs are used',fit.allOff===10);
  ok('no song fits: the songs that are not skipped are used anyway',fit.noneFit===10);
  ok('songPool: least sung first, at the same count known songs before songs to teach, then list order (known songs do not starve the others)',fit.order[0]==="Amazing Grace"&&fit.order[7]==="Clementine"&&fit.order[8]==="Are you sleeping"&&fit.order[9]==="Twinkle, twinkle, little star",fit.order.join(' | '));
  ok('a song marked "know" goes before the songs to teach at the same count',fit.order2.slice(0,3).join('|')==="Twinkle, twinkle, little star|Are you sleeping|Clementine",fit.order2.join(' | '));
  ok('fitting songs only in a narrow range, known ones first',fit.narrowOrder[0]==="Twinkle, twinkle, little star"&&fit.narrowOrder.length===3,fit.narrowOrder.join(' | '));

  // parsing own songs
  const parse=await p.evaluate(()=>{
    const e=(l,name="X")=>{const r=parseOwn(name,0.55,l);return r.err||null};
    const r={};
    const v=parseOwn("Twinkle",0.55,["C4 C4 G4 G4 A4 A4 G4/2 | Twinkle twinkle","F4 F4 E4 E4 D4 D4 C4/2 | How I wonder","",""]);
    r.v=v.song;
    const f=parseOwn("Flats",0.65,["Bb3 C#4 d4 eb4 | one two three"]);r.f=f.song;
    r.half=parseOwn("Half",0.45,["C4/0.5 D4/0.25 E4/8 F4/1.5"]).song;
    r.errs={
      badNote:e(["C4 D4 E4","C4 H4 E4"]),
      noOctave:e(["C4 D E4"]),
      high:e(["C4 C9"]),
      low:e(["C1 D4"]),
      len0:e(["C4 D4/0"]),
      len9:e(["C4 D4/9"]),
      lenX:e(["C4 D4/x"]),
      one:e(["","C4"]),
      empty:e(["","  ","",""]),
      cue:e(["C4 D4 | one two three four five six"]),
      many:e([Array(41).fill("C4").join(" ")]),
      third:e(["C4 D4","","C4 Q4"])
    };
    r.cueOptional=parseOwn("N",0.55,["C4 D4 E4"]).song.ph[0].w==="";
    r.noMutation=SONGS.length;
    return r;
  });
  ok('own song: notes become semitones from the first note of phrase 1',JSON.stringify(parse.v.ph.map(x=>x.n))==='[[0,0,7,7,9,9,7],[5,5,4,4,2,2,0]]',JSON.stringify(parse.v.ph.map(x=>x.n)));
  ok('own song: lengths after / are beats, default 1; cue kept; flagged own; tempo kept',JSON.stringify(parse.v.ph[0].d)==='[1,1,1,1,1,1,2]'&&parse.v.ph[0].w==="Twinkle twinkle"&&parse.v.own===true&&parse.v.beat===0.55&&parse.v.ph.length===2);
  ok('own song: sharps, flats and lower case letters',JSON.stringify(parse.f.ph[0].n)==='[0,3,4,5]'&&parse.f.beat===0.65,JSON.stringify(parse.f.ph[0].n));
  ok('own song: decimal lengths',JSON.stringify(parse.half.ph[0].d)==='[0.5,0.25,8,1.5]');
  ok('own song: a cue is optional',parse.cueOptional);
  const E=parse.errs;
  ok('error names the phrase and the token: not a note',/^Phrase 2, "H4": not a note/.test(E.badNote),E.badNote);
  ok('error: a note without an octave',/^Phrase 1, "D": not a note/.test(E.noOctave),E.noOctave);
  ok('error: too high and too low',/"C9": too low or too high/.test(E.high)&&/"C1": too low or too high/.test(E.low),E.high+' | '+E.low);
  ok('error: a length of 0, over 8 or not a number',/"D4\/0": the length must be between/.test(E.len0)&&/"D4\/9": the length must be between/.test(E.len9)&&/"D4\/x": not a note/.test(E.lenX));
  ok('error: one note, nothing typed, too many words in the cue, too many notes',/^Phrase 2: write at least two notes/.test(E.one)&&/^Type at least one phrase/.test(E.empty)&&/^Phrase 1: after the \|/.test(E.cue)&&/^Phrase 1: that is more than 40 notes/.test(E.many),[E.one,E.empty,E.cue,E.many].join(' | '));
  ok('error: blank phrases are skipped but the numbers stay (third line is Phrase 3)',/^Phrase 3, "Q4"/.test(E.third),E.third);

  // the Guide page: list, fit text, ticks, add, preview, delete
  await p.evaluate(()=>{localStorage.clear();store.set("profile",{low:43,high:55,home:49})});
  await p.reload();
  await p.click('#guideBtn');await p.waitForTimeout(200);
  const ui1=await p.evaluate(()=>({rows:document.querySelectorAll('#songList .srow').length,selects:document.querySelectorAll('#songList .srow select').length,
    boxes:document.querySelectorAll('#songList input[type=checkbox]').length,vals:[...document.querySelectorAll('#songList select')].map(x=>x.value[0]).join(""),
    opts:[...document.querySelector('#songList select').options].map(o=>o.textContent).join(' / '),
    first:document.querySelector('#songList .srow').textContent.trim(),
    stretch:[...document.querySelectorAll('#songList .srow')].filter(r=>/a stretch/.test(r.textContent)).map(r=>r.querySelector('b').textContent),
    fits:[...document.querySelectorAll('#songList .srow')].filter(r=>/fits your range/.test(r.textContent)).length}));
  const exp=await p.evaluate(()=>({stretch:SONGS.filter(s=>!songFits(s,profile())).map(s=>s.name),fits:SONGS.filter(s=>songFits(s,profile())).length}));
  ok('Guide: one row per song with a three-way choice (no tick boxes), defaults shown',ui1.rows===10&&ui1.selects===10&&ui1.boxes===0&&ui1.vals==='kktttttttt'&&ui1.opts==='I know it / Teach me / Skip',ui1.rows+' rows, '+ui1.vals+', '+ui1.opts);
  ok('Guide: each row shows its span and whether it fits the measured range (span <= high - low - 1)',JSON.stringify(ui1.stretch)===JSON.stringify(exp.stretch)&&ui1.fits===exp.fits&&/semitones/.test(ui1.first),ui1.first+' | stretch: '+ui1.stretch.join(', ')+' | fits '+ui1.fits);
  await p.locator('#songList .srow select').nth(1).selectOption('skip');
  const k1=await p.evaluate(()=>store.get("songKnow",{}));
  ok('choosing Skip stores the name in rvc_songKnow',JSON.stringify(k1)==='{"Are you sleeping":"skip"}',JSON.stringify(k1));
  await p.locator('#songList .srow select').nth(2).selectOption('know');
  await p.locator('#songList .srow select').nth(0).selectOption('teach');
  const k2=await p.evaluate(()=>store.get("songKnow",{}));
  ok('the choices are kept per song and the list shows them again',k2["Amazing Grace"]==="know"&&k2["Twinkle, twinkle, little star"]==="teach"&&(await p.evaluate(()=>[...document.querySelectorAll('#songList select')].slice(0,3).map(x=>x.value).join()))==="teach,skip,know");
  for(let i=0;i<10;i++)await p.locator('#songList .srow select').nth(i).selectOption('skip');
  ok('every song on Skip: the Guide says all songs will be used',/use all of them/.test(await p.textContent('#songNote'))&&await p.isVisible('#songNote'));
  await p.evaluate(()=>{store.set("songKnow",{});renderSongs()});

  // add an own song
  await p.fill('#soP1','C4 C4 G4 G4 A4 A4 G4/2 | Twinkle twinkle');await p.click('#soSave');
  ok('saving without a name is refused',/Give the song a name/.test(await p.textContent('#soMsg')));
  await p.fill('#soName','My practice tune');await p.selectOption('#soTempo','slow');
  await p.fill('#soP1','C4 C4 G4 G4 A4 A4 H4/2 | Twinkle twinkle');await p.click('#soSave');
  ok('an invalid phrase shows the error and saves nothing',/Phrase 1, "H4\/2"/.test(await p.textContent('#soMsg'))&&(await p.evaluate(()=>mySongs().length))===0,await p.textContent('#soMsg'));
  await p.fill('#soP1','C4 C4 G4 G4 A4 A4 G4/2 | Twinkle twinkle');await p.fill('#soP2','F4 F4 E4 E4 D4 D4 C4/2 | How I wonder');
  await p.click('#soPrev');await p.waitForTimeout(300);
  const pv=await p.evaluate(()=>({msg:document.getElementById('soMsg').textContent,hidden:document.getElementById('soMsg').hidden}));
  ok('Play phrase 1 runs without an error (the message clears when it ends)',pv.hidden||pv.msg==="Playing the first phrase you typed.",pv.msg);
  await p.waitForFunction(()=>document.getElementById('soMsg').hidden,null,{timeout:20000}).catch(()=>{});
  await p.click('#soSave');await p.waitForTimeout(200);
  const saved=await p.evaluate(()=>({my:store.get("mySongs",[]),name:document.getElementById('soName').value,p1:document.getElementById('soP1').value,rows:document.querySelectorAll('#songList .srow').length,
    last:document.querySelector('#songList .srow:last-child').textContent.trim(),ownVal:document.querySelector('#songList .srow:last-child select').value,del:document.querySelectorAll('#songList .srow button').length}));
  ok('own song saved in rvc_mySongs in SONGS format with own:true and the chosen tempo',saved.my.length===1&&saved.my[0].own===true&&saved.my[0].beat===0.65&&saved.my[0].name==="My practice tune"&&saved.my[0].ph.length===2&&saved.my[0].ph[1].w==="How I wonder",JSON.stringify(saved.my[0]).slice(0,120));
  ok('the form is cleared and the list shows the song with a Delete button',saved.name===""&&saved.p1===""&&saved.rows===11&&saved.del===1&&saved.ownVal==="know"&&/My practice tune/.test(saved.last)&&/yours/.test(saved.last),saved.last);
  await p.fill('#soName','my PRACTICE tune');await p.fill('#soP1','C4 D4 E4');await p.click('#soSave');
  ok('a name that already exists is refused (case ignored)',/already a song called/.test(await p.textContent('#soMsg'))&&(await p.evaluate(()=>mySongs().length))===1);
  const own=await p.evaluate(()=>{const s=mySongs()[0];return {all:allSongs().length,inList:songList(profile()).some(x=>x.name===s.name),ton:songTon(s,profile()),span:songSpan(s)}});
  ok('the own song joins the list and the rotation',own.all===11&&own.inList,JSON.stringify(own));

  // backup keeps the own songs and the unticked names
  await p.evaluate(()=>store.set("songKnow",{"Clementine":"skip"}));
  const bk=await p.evaluate(async()=>{const b=await makeBackup(false);const had=Object.keys(b.ls);
    localStorage.clear();await restoreBackup(b);return {had:had.filter(k=>/mySongs|songKnow/.test(k)),my:store.get("mySongs",[]).length,off:store.get("songKnow",{})}});
  ok('the backup saves and restores rvc_mySongs and rvc_songKnow',bk.had.length===2&&bk.my===1&&JSON.stringify(bk.off)==='{"Clementine":"skip"}',JSON.stringify(bk));

  // delete
  await p.reload();await p.click('#guideBtn');await p.waitForTimeout(200);
  await p.evaluate(()=>{store.set("songKnow",{"My practice tune":"teach"});D.sungS["My practice tune"]=2;D.song={s:0,n:"My practice tune",ph:2};saveD()});
  await p.reload();await p.click('#guideBtn');await p.waitForTimeout(200);
  await p.click('#songList .srow button');await p.waitForTimeout(100);
  const del=await p.evaluate(()=>({my:mySongs().length,off:store.get("songKnow",{}),rows:document.querySelectorAll('#songList .srow').length,sung:D.sungS["My practice tune"],song:D.song}));
  ok('Delete removes the song, its choice and its count, and restarts a song in progress',del.my===0&&Object.keys(del.off).length===0&&del.rows===10&&del.sung===undefined&&del.song.ph===0,JSON.stringify(del));
  const side=await p.evaluate(()=>({sw:document.scrollingElement.scrollWidth,iw:innerWidth}));
  ok('the Guide does not scroll sideways at 412 px',side.sw<=side.iw,side.sw+' vs '+side.iw);
  await p.fill('#soName','Layout test');await p.fill('#soP1','C4 C4 G4 G4 A4 A4 G4/2 | Twinkle twinkle');await p.click('#soSave');
  await p.locator('#songList').scrollIntoViewIfNeeded();await p.screenshot({path:__dirname+'/out/songs.png',fullPage:true});
  const side2=await p.evaluate(()=>document.scrollingElement.scrollWidth<=innerWidth);
  ok('still no sideways scroll with an own song in the list (screenshot tests/out/songs.png)',side2);
  await p.close();

  // ================= part 2: song() in a session =================
  p=await newPage();
  await p.evaluate(async()=>{
    localStorage.clear();store.set("profile",{low:40,high:70,home:55});
    S.running=true;S.stop=false;S.mode="session";await openMic();
    Object.assign(S,{scores:[],biases:[],round:1,misses:0,tip:{},nasScores:[],sessionStart:performance.now(),loudAt:-1e9,repN:0,fbEvery:1,done:0});
    await loadBank();await calibrate(800);S.lat=100;
    window.__o={rep,play,listen,freeAnalysis};
    window.rep=async(t,o)=>{console.log('@REP '+t.length+(o.words?' words':''));return null};window.play=async()=>{};window.listen=async()=>null;window.freeAnalysis=()=>null;
  });
  // quick stubbed runs: which songs come, in which order
  await p.evaluate(()=>{window.play=async t=>{console.log('@PLAY '+t.length)}});
  const seq=await p.evaluate(async()=>{
    const P=profile(),order=[];D.song={s:0,ph:0};D.sungS={};store.set("songKnow",{});
    for(let i=0;i<22;i++){await song(P);order.push(D.song.ph===0?D.song.n:"(mid)")}
    return {order,sung:D.sungS,s:D.song.s};
  });
  const songNames=await p.evaluate(()=>SONGS.map(s=>s.name));
  const finished=seq.order.filter(x=>x!=="(mid)");
  ok('song() finishes a song every second call: each of the 10 once before one repeats, the two known songs first',finished.length===11&&new Set(finished.slice(0,10)).size===10&&finished[0]==="Twinkle, twinkle, little star"&&finished[1]==="Are you sleeping"&&finished[2]==="Amazing Grace",finished.join(' | '));
  ok('each song counted once in D.sungS after the first ten; one song counted twice after 22 calls',songNames.filter(n=>seq.sung[n]===2).length===1&&songNames.filter(n=>seq.sung[n]===1).length===9&&seq.s===11,JSON.stringify(seq.sung));
  const say1=sayFrom(0);
  ok('the spoken lines name the song and use the cue: "Now with the words. It starts: ..."',say1.some(s=>/^Song practice: Twinkle, twinkle, little star\./.test(s))&&say1.some(s=>/^Now with the words\. It starts: Twinkle, twinkle\.$/.test(s)),say1.filter(s=>/^Song practice|^Back to/.test(s)).slice(0,4).join(' | '));
  ok('the old wording with a colon and the full line is gone',!say1.some(s=>/^Now with the words:/.test(s)));
  ok('the cue is said for each phrase and nothing longer than 5 words follows "It starts:"',say1.filter(s=>/^Now with the words\. It starts: /.test(s)).length>=40&&say1.filter(s=>/^Now with the words\. It starts: /.test(s)).every(s=>s.replace(/^Now with the words\. It starts: /,"").replace(/\.$/,"").split(/\s+/).length<=5));
  // teaching: a song marked "teach" is played twice per phrase first, a known one is not
  const tl=logs.length;
  await p.evaluate(async()=>{store.set("songKnow",Object.fromEntries(SONGS.filter(s=>s.name!=="Clementine").map(s=>[s.name,"skip"])));D.song={s:0,ph:0};D.sungS={};await song(profile())});
  const ts=sayFrom(tl),tp=logs.slice(tl).filter(x=>x.startsWith('@PLAY ')).length;
  ok('a song to teach: says it is new, then for each phrase "Listen to this line." and "Once more. Hum along quietly." before the usual steps',/This one is new to you/.test(ts[0])&&ts.filter(x=>x==="Listen to this line.").length===2&&ts.filter(x=>x==="Once more. Hum along quietly.").length===2&&ts.indexOf("Listen to this line.")<ts.indexOf("Phrase 1, on la.")&&ts.indexOf("Once more. Hum along quietly.")<ts.indexOf("Phrase 1, on la.")&&ts.includes("Phrase 2, on la."),ts.join(' | '));
  ok('the line is played twice per phrase (4 plays for 2 phrases) and at the song tempo',tp===4,tp+' plays');
  const kl=logs.length;
  await p.evaluate(async()=>{store.set("songKnow",{});D.song={s:0,ph:0};D.sungS={};await song(profile())});
  const ks=sayFrom(kl);
  ok('a known song has no teaching lines',!ks.includes("Listen to this line.")&&/^Song practice: Twinkle, twinkle, little star\. Phrase by phrase/.test(ks[0])&&logs.slice(kl).filter(x=>x.startsWith('@PLAY ')).length===0,ks[0]);
  // a teach song becomes "know" after the whole song is sung from memory under 50 cents; not otherwise
  const learn=await p.evaluate(async()=>{
    const out={},P=profile(),good={spread:10,wobble:5,drift:0,lo:50,hi:60,voicedSec:20,n:20};
    window.__as=analyseSeq;window.listen=async()=>[{}];window.freeAnalysis=()=>good;S.lastTake=null;
    const run=async(avg,heard=true,fa=good)=>{store.set("songKnow",{});D.song={s:0,n:"Clementine",ph:2};window.freeAnalysis=()=>fa;window.analyseSeq=()=>({heard,avg});
      S.lastTake=null;await song(P);return songMode(SONGS.find(s=>s.name==="Clementine"))};
    out.good=await run(30);
    out.bad=await run(80);
    out.notheard=await run(30,false);
    out.nothing=await run(30,true,null);
    return out;
  });
  ok('teach becomes know when the whole song is sung under 50 cents off on average, and stays teach at 80 cents, when nothing was heard or when there was no singing',learn.good==="know"&&learn.bad==="teach"&&learn.notheard==="teach"&&learn.nothing==="teach",JSON.stringify(learn));
  ok('"You know this one now." is said once, only when it switched',sayFrom(0).filter(x=>x==="You know this one now.").length===1);
  await p.evaluate(()=>{window.listen=async()=>null;window.freeAnalysis=()=>null;window.analyseSeq=window.__as});
  // next pressed early marks a known song "teach"
  const skp=await p.evaluate(async()=>{
    const P=profile(),out={},C=SONGS.find(s=>s.name==="Clementine"),T=SONGS[0];
    const okSkip=async(name,mode,throwAt,ph=0)=>{store.set("songKnow",{[name]:mode});D.sungS={};D.song={s:3,n:name,ph};let n=0;
      window.rep=async()=>{if(++n===throwAt)throw new Skip();return null};
      let sk=false;try{await song(P)}catch(e){sk=e instanceof Skip}
      return {sk,mode:songMode(SONGS.find(s=>s.name===name)),song:D.song}};
    out.know=await okSkip(T.name,"know",1);
    out.teach=await okSkip(C.name,"teach",1,1);
    out.late=await okSkip(T.name,"know",3);
    out.mid=await okSkip(T.name,"know",1,2);
    return out;
  });
  const sk=sayFrom(0).filter(x=>/^Okay, I'll teach you that one next time\.$/.test(x)).length;
  ok('next pressed in the first phrase of a known song marks it "teach" and restarts the song; the Skip still goes on to the block',skp.know.sk&&skp.know.mode==="teach"&&skp.know.song.ph===0,JSON.stringify(skp.know));
  ok('next pressed in a song to teach changes nothing',skp.teach.sk&&skp.teach.mode==="teach");
  ok('next pressed after the first phrase (second phrase on la) changes nothing',skp.late.sk&&skp.late.mode==="know",JSON.stringify(skp.late));
  ok('next pressed early in the second half of a song in progress marks it "teach" and starts it again',skp.mid.sk&&skp.mid.mode==="teach"&&skp.mid.song.ph===0&&skp.mid.song.s===3,JSON.stringify(skp.mid));
  ok('"Okay, I\'ll teach you that one next time." is said twice (the two early skips of a known song)',sk===2,sk+' times');
  await p.evaluate(()=>{window.rep=async(t,o)=>{console.log('@REP '+t.length+(o.words?' words':''));return null}});
  // exclusion, range and mid-song changes
  const sel=await p.evaluate(async()=>{
    const r={},skipAll=except=>store.set("songKnow",Object.fromEntries(SONGS.filter(s=>!except.includes(s.name)).map(s=>[s.name,"skip"])));
    D.sungS={};D.song={s:0,ph:0};skipAll(["Clementine","Silent night"]);
    const names=[];for(let i=0;i<6;i++){await song(profile());if(D.song.ph===0)names.push(D.song.n)}
    r.onlyTicked=names;
    // a song in progress carries on; one that was set to Skip meanwhile is dropped
    store.set("songKnow",{});D.song={s:0,n:"Clementine",ph:2};D.sungS={};await song(profile());r.cont=D.song;
    D.song={s:0,n:"Clementine",ph:2};store.set("songKnow",{"Clementine":"skip"});await song(profile());r.dropped=D.song;
    // a stretch song is skipped for a narrow range
    store.set("songKnow",{});store.set("profile",{low:50,high:60,home:55});D.song={s:0,ph:0};D.sungS={};
    const nn=[];for(let i=0;i<8;i++){await song(profile());if(D.song.ph===0)nn.push(D.song.n)}
    r.narrow=nn;r.narrowOk=nn.every(n=>songFits(allSongs().find(s=>s.name===n),profile()));
    // an old saved state without a name (from before this change) carries on in the same song
    store.set("profile",{low:40,high:70,home:55});store.set("songKnow",{});D.song={s:4,ph:2};D.sungS={};await song(profile());r.migrated=D.song;r.migratedCount=Object.assign({},D.sungS);
    return r;
  });
  ok('songs set to Skip are never used',sel.onlyTicked.every(n=>n==="Clementine"||n==="Silent night")&&new Set(sel.onlyTicked).size===2,sel.onlyTicked.join(' | '));
  ok('a song in progress carries on from its phrase',sel.cont.n==="Clementine"&&sel.cont.s===1&&sel.cont.ph===0,JSON.stringify(sel.cont));
  ok('a song in progress that was set to Skip is dropped for another one',sel.dropped.n!=="Clementine"||sel.dropped.ph>0,JSON.stringify(sel.dropped));
  ok('with a narrow range only songs that fit are chosen',sel.narrowOk&&sel.narrow.length>=3,sel.narrow.join(' | '));
  ok('a state saved before this change (no name) carries on with the song the old index meant',sel.migrated.n==="Are you sleeping"&&sel.migrated.s===5&&sel.migratedCount["Twinkle, twinkle, little star"]===2,JSON.stringify(sel.migrated)+' '+JSON.stringify(sel.migratedCount));
  // transfer uses the cue, and only songs marked "know"
  const i0=logs.length;
  await p.evaluate(async()=>{store.set("songKnow",{});store.set("profile",{low:40,high:70,home:55});S.tip={};D.xp=0;await transfer({home:55,low:40,high:70},"nasal")});
  const tsay=sayFrom(i0);
  ok('the transfer step says the song and then the cue of the line',tsay.some(s=>/^Now take that into a song\. One line of Twinkle/.test(s))&&tsay.some(s=>/^Now the same line with the words\. It starts: Twinkle, twinkle\.$/.test(s)),tsay.join(' | '));
  const tr=await p.evaluate(()=>{store.set("songKnow",{});return {kn:songList({home:55,low:40,high:70}).filter(s=>songMode(s)==="know").map(s=>s.name)}});
  ok('by default only the two known songs are in the transfer step',JSON.stringify(tr.kn)==='["Twinkle, twinkle, little star","Are you sleeping"]',JSON.stringify(tr.kn));
  const t2=logs.length;
  await p.evaluate(async()=>{store.set("songKnow",{});setSongMode(SONGS[3],"know");D.xp=0;const P={home:55,low:40,high:70};for(let i=0;i<20;i++)await transfer(P,"nasal")});
  const tn=new Set(sayFrom(t2).filter(x=>/^Now take that into a song/.test(x)).map(x=>x.replace(/^Now take that into a song\. One line of /,"").replace(/, first on .*/,"")));
  ok('transfer rotates through the known songs only (Twinkle, Are you sleeping and the one just marked)',[...tn].sort().join('|')==="Are you sleeping|Twinkle, twinkle, little star|When the saints go marching in",[...tn].join(' | '));
  const t3=logs.length;
  await p.evaluate(async()=>{store.set("songKnow",{"Twinkle, twinkle, little star":"skip","Are you sleeping":"skip"});D.xp=0;const P={home:55,low:40,high:70};for(let i=0;i<3;i++)await transfer(P,"nasal")});
  const t3s=sayFrom(t3).filter(x=>/^Now take that into a song/.test(x));
  ok('no known song: the transfer step falls back to Twinkle',t3s.length===3&&t3s.every(x=>/One line of Twinkle/.test(x)),t3s[0]);

  // a whole own song with the simulated singer
  await p.evaluate(()=>{window.rep=__o.rep;window.play=__o.play;window.listen=__o.listen;window.freeAnalysis=__o.freeAnalysis;
    store.set("profile",{low:40,high:70,home:55});
    store.set("mySongs",[{name:"Own test song",beat:0.45,own:true,ph:[{n:[0,0,7,7,9,9,7],d:[1,1,1,1,1,1,2],w:"Twinkle twinkle"},{n:[5,5,4,4,2,2,0],d:[1,1,1,1,1,1,2],w:""},{n:[7,7,5,5,4,4,2],d:[1,1,1,1,1,1,2],w:"Up above"},{n:[7,7,5,5,4,4,2],d:[1,1,1,1,1,1,2],w:"Like a diamond"}]}]);
    store.set("songKnow",Object.assign(Object.fromEntries(SONGS.map(s=>[s.name,"skip"])),{"Own test song":"teach"}));D.song={s:0,ph:0};D.sungS={};D.xp=0;saveD()});
  const j0=logs.length;
  await p.evaluate(async()=>{await song(profile());await song(profile())});
  const say2=sayFrom(j0);
  const d2=await p.evaluate(()=>({song:D.song,sung:D.sungS}));
  ok('a whole own song (set to "Teach me") runs through song() in two calls, the second saying "Back to"',say2.some(s=>/^Song practice: Own test song\./.test(s))&&say2.some(s=>/^Back to Own test song\./.test(s))&&say2.some(s=>/Now the whole song from memory/.test(s))&&say2.includes("Listen to this line.")&&say2.filter(s=>s==="Once more. Hum along quietly.").length===4,say2.slice(0,4).join(' | '));
  ok('the own song is counted as sung and the next song starts again at phrase 1',d2.sung["Own test song"]===1&&d2.song.ph===0&&d2.song.s===1,JSON.stringify(d2));
  ok('an own phrase without a cue only says "Now with the words."',say2.some(s=>s==="Now with the words.")&&say2.some(s=>s==="Now with the words. It starts: Twinkle twinkle."),say2.filter(s=>/^Now with/.test(s)).join(' | '));
  await p.evaluate(()=>{S.running=false});

  console.log(fails?`FAILED: ${fails}`:'ALL PASS');
  console.log('page errors:',errs);
  await b.close();
})();

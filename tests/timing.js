// How long each block takes in real minutes, with speech stubbed to last about as long as real speech (70 ms a character).
// Used to set the block estimates that session-length planning starts from (BLOCK_MIN in index.html).
const {chromium}=require(process.env.PLAYWRIGHT||'/opt/npm-tools/node_modules/playwright');
const speed=+(process.argv[2]||6);
(async()=>{
  const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+__dirname+'/audio/voice.wav','--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({permissions:['microphone']});
  const p=await ctx.newPage();let errs=0;
  p.on('pageerror',e=>{errs++;console.log('PAGEERROR',e.message)});
  await p.addInitScript(sp=>{window.__speed=sp;
    const ss={speak(u){setTimeout(()=>u.onend&&u.onend(),(300+(u.text||"").length*70)/sp)},cancel(){},getVoices(){return[]},onvoiceschanged:null};
    Object.defineProperty(window,'speechSynthesis',{value:ss,configurable:true})},speed);
  await p.goto('http://localhost:8765/index.html');
  const res=await p.evaluate(async()=>{
    const out=[];
    S.running=true;S.stop=false;S.mode="session";await openMic();
    Object.assign(S,{scores:[],biases:[],round:1,misses:0,tip:{},nasScores:[],sessionStart:performance.now(),loudAt:-1e9,repN:0,fbEvery:1,done:0});
    await loadBank();await calibrate(800);S.lat=150;
    const pr={home:55,low:45,high:64};
    const run=async(n,fn,o)=>{const t0=clock();await block(n,fn,o);out.push([n,+((clock()-t0)/60000).toFixed(2)])};
    {const t0=clock();await findRange();out.push(["Finding your voice",+((clock()-t0)/60000).toFixed(2)])}
    await run("Warm-up",()=>warmup(pr),{sum:false});
    // technique blocks without the transfer step (D.xf=0 makes the next block's count odd, so it is skipped); the transfer step is timed on its own below
    for(const [n,f] of [["Nasality",nasality],["Clean onsets",onset],["Registers",registers],["Vowels",vowels],["Clear tone",clearTone],["Smooth line",legato],["Breath and long notes",breath],["Loose jaw and tongue",release],["Sounds with a job",sounds]])
      {D.xf=0;await run(n,()=>f(pr),{sum:n==="Vowels"})}
    // the same blocks later in a session (nasality's first-time text is gone) and with the transfer step (D.xf=1 makes the count even)
    D.xf=0;await run("Nasality (not first)",()=>nasality(pr),{sum:false,key:"x1"});
    D.xf=1;await run("Nasality + transfer",()=>nasality(pr),{sum:false,key:"x2"});
    D.xf=1;await run("Sounds + transfer",()=>sounds(pr),{sum:false,key:"x3"});
    S.tip.onset=S.tip.onset||tipFor("onset");await run("Transfer step alone",()=>transfer(pr,"onset"),{sum:false,key:"x4"});
    await run("Pitch matching",()=>pitchMatch(pr,4));
    await run("Scales",()=>scales(pr,3));
    await run("Intervals",()=>intervals(pr,4));
    S.done=3;S.round=2;await run("Mixed practice",()=>mixed(pr));
    await run("Song",()=>song(pr),{sum:true});
    // skills() rotates swell, clean starts, ear training (D.sk); each one timed on its own, the first two make "Skills"
    D.sk=0;await run("Skills (swell)",()=>skills(pr),{sum:false,key:"x5"});
    await run("Skills (clean starts)",()=>skills(pr),{sum:false,key:"x6"});
    await run("Ear training",()=>skills(pr),{sum:false});
    await run("Free singing",()=>freeSing(),{sum:false});
    {const t0=clock();await summary();out.push(["Summary",+((clock()-t0)/60000).toFixed(2)])}
    await run("Reset",()=>resetVoice(),{sum:false});
    closeMic();S.running=false;return out;
  });
  for(const [n,m] of res)console.log(n.padEnd(24),m.toFixed(2),'min');
  console.log('page errors:',errs);
  await b.close();
})();

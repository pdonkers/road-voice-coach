const {chromium}=require(process.env.PLAYWRIGHT||'/opt/npm-tools/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+__dirname+'/audio/voice.wav','--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:412,height:900},permissions:['microphone']});
  const p=await ctx.newPage();const logs=[];let errs=0;
  p.on('console',m=>{const t=m.text();if(t.startsWith('@'))logs.push(t)});
  p.on('pageerror',e=>{errs++;console.log('PAGEERROR',e.message)});
  await p.addInitScript(()=>{window.__speed=3;
    const ss={speak(u){if(u.text)console.log('@SAY '+u.text);Promise.resolve().then(()=>u.onend&&u.onend())},cancel(){},getVoices(){return[]},onvoiceschanged:null};
    Object.defineProperty(window,'speechSynthesis',{value:ss,configurable:true})});
  await p.goto('http://localhost:'+(process.env.PORT||8765)+'/index.html');
  const res=await p.evaluate(async()=>{
    const out=[];
    try{
      S.running=true;S.stop=false;S.mode="session";await openMic();
      Object.assign(S,{scores:[],biases:[],round:1,misses:0,tip:{},nasScores:[],sessionStart:performance.now(),loudAt:-1e9,repN:0,fbEvery:1,done:0});
      await loadBank();await calibrate(800);S.lat=100;
      const pr={home:55,low:45,high:64};
      for(const [n,f] of [["Warm-up",warmup],["Nasality",nasality],["Vowels",vowels],["Breath",breath],["Onsets",onset],["Registers",registers],["Clear tone",clearTone],["Smooth line",legato],["Release",release],["Sounds with a job",sounds],["Swell",swell],["Starts",starts],["Ear training",earTrain],["Pitch",q=>pitchMatch(q,2)]]){
        console.log('@BLOCK '+n);const t0=performance.now();await block(n,()=>f(pr),{sum:false});out.push(n+' '+Math.round((performance.now()-t0)/100)/10+'s');
      }
      S.round=2;S.tip={};console.log('@BLOCK Nasality round2 new session');await block("Nasality",()=>nasality(pr),{sum:false});
    }catch(e){out.push('ERR '+(e&&e.stack||e))}
    closeMic();S.running=false;
    return {out,tips:Object.entries(D.tips).filter(([k,v])=>v.n).map(([k,v])=>k+':'+v.n),brk:D.brk};
  });
  console.log(res.out.join(' | '));console.log('tips used:',res.tips.join(' '),'brk',JSON.stringify(res.brk));
  await p.click('#guideBtn');await p.waitForTimeout(300);
  await p.click('#cues .cue button');await p.waitForTimeout(200);
  await p.click('#examples button');await p.waitForTimeout(4200);
  await p.screenshot({path:__dirname+'/out/guide.png',fullPage:true});
  require('fs').writeFileSync(__dirname+'/out/log_blocks.txt',logs.join('\n'));
  console.log('page errors:',errs,'| say lines:',logs.filter(l=>l.startsWith('@SAY')).length);
  if(errs||res.out.some(x=>x.startsWith('ERR'))){console.log('FAIL a block threw');process.exitCode=1}
  await b.close();
})();

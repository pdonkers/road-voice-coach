const {chromium}=require(process.env.PLAYWRIGHT||'/opt/npm-tools/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
  const p=await b.newPage();let errs=0;
  p.on('pageerror',e=>{errs++;console.log('PAGEERROR',e.message)});
  await p.goto('http://localhost:8765/index.html');
  const r=await p.evaluate(async()=>{
    await ensureCtx();const sr=S.ctx.sampleRate;
    const pcm=new Float32Array(sr*2);for(let i=0;i<pcm.length;i++)pcm[i]=0.05*Math.sin(2*Math.PI*mtof(57.05)*i/sr);
    const take={pcm,sr,t0:1000};
    const seg={start:1100,end:2900,p:57.05,sd:5};
    bankMaybe({single:seg,avg:5},take,{});
    const e=S.bank.get(57);
    await loadBank();
    const got=S.bank.get(57);
    const t0=performance.now();await playOwn([57,45]);const dt=performance.now()-t0;
    S.lat=0;await playTake(take);await blip();await clicks(4,0.2);await play([60,64],[0.2,0.3],0.05);
    return {saved:!!e,len:e&&e.pcm.length/sr,reloaded:!!got&&got.pcm.length,own57:!!ownFor(57),own69:!!ownFor(69),own62:!!ownFor(62),dt:Math.round(dt)};
  });
  console.log(JSON.stringify(r),'errors',errs);
  await b.close();
})();

const {chromium}=require(process.env.PLAYWRIGHT||'/opt/npm-tools/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:412,height:900}});const p=await ctx.newPage();let errs=0;
  p.on('pageerror',e=>{errs++;console.log('PAGEERROR',e.message)});
  await p.goto('http://localhost:8765/index.html');
  const r=await p.evaluate(async()=>{await ensureCtx();S.lat=0;const out={};
    for(const n of CLIPS){try{const bf=await loadClip(n);out[n]=+bf.duration.toFixed(1)}catch(e){out[n]='ERR '+e.message}}
    const t=performance.now();const ok=await real("separate");out.playedOk=ok;out.playMs=Math.round(performance.now()-t);
    const fb=await real("does-not-exist",async()=>{out.fallbackRan=true});out.missingReturns=fb;
    return out});
  console.log(JSON.stringify(r));
  await p.waitForTimeout(1500);
  const sw=await p.evaluate(async()=>{const ks=await caches.keys();const c=ks.length?await (await caches.open(ks[0])).keys():[];return {cache:ks,entries:c.length,audio:c.filter(x=>x.url.includes('/audio/')).length}});
  console.log('service worker cache:',JSON.stringify(sw));
  await p.click('#guideBtn');await p.waitForTimeout(300);
  console.log('guide real buttons:',await p.locator('#realClips button').count(),'| synth buttons:',await p.locator('#examples button').count());
  await p.click('#realClips button');await p.waitForTimeout(500);
  await p.screenshot({path:__dirname+'/out/guide2.png'});
  console.log('page errors',errs);await b.close();
})();

const {chromium}=require(process.env.PLAYWRIGHT||'/opt/npm-tools/node_modules/playwright');
(async()=>{
  const b=await chromium.launch();const ctx=await b.newContext();const p=await ctx.newPage();let errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.waitForTimeout(1500);
  const r=await p.evaluate(async()=>{
    const reg=await navigator.serviceWorker.getRegistration();
    const m=await (await fetch(document.querySelector('link[rel=manifest]').href)).json();
    const keys=await caches.keys();const c=keys.length?await (await caches.open(keys[0])).keys():[];
    return {sw:!!reg,active:!!(reg&&(reg.active||reg.waiting||reg.installing)),name:m.name,icons:m.icons.length,cached:c.map(x=>new URL(x.url).pathname)};
  });
  const cdp=await ctx.newCDPSession(p);
  const man=await cdp.send('Page.getAppManifest');
  let inst=null;try{inst=await cdp.send('Page.getInstallabilityErrors')}catch(e){inst=e.message}
  console.log(JSON.stringify(r));console.log('manifest errors:',JSON.stringify(man.errors),'installability errors:',JSON.stringify(inst.installabilityErrors||inst));
  // offline reload
  await ctx.setOffline(true);await p.reload();console.log('offline title:',await p.title(),'| page errors',errs.length);
  await b.close();
})();

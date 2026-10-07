const {chromium}=require(process.env.PLAYWRIGHT||'/opt/npm-tools/node_modules/playwright');
const fs=require('fs');
(async()=>{
  const b=await chromium.launch();const ctx=await b.newContext();const p=await ctx.newPage();let errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  // the installed app starts at the root, which is the page the service worker saves on first load (index.html is not)
  await p.goto('http://localhost:'+(process.env.PORT||8765)+'/');
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
  await ctx.setOffline(true);await p.reload();const off=await p.title();console.log('offline title:',off,'| page errors',errs.length);
  // the scripts and styles must have come from the saved copy: the app has to be running, not just the title
  const boot=await p.evaluate(()=>({app:typeof S==='object'&&typeof block==='function',css:getComputedStyle(document.body).backgroundColor,ver:(document.getElementById('ver')||{}).textContent}));
  const need=['/css/app.css',...fs.readdirSync(__dirname+'/../js').map(f=>'/js/'+f)],missing=need.filter(f=>!r.cached.includes(f));
  console.log('offline app running:',boot.app,'| body background:',boot.css,'| cached code files:',need.length-missing.length+'/'+need.length,missing.length?'missing '+missing.join(' '):'');
  if(!boot.app||missing.length||boot.css==='rgba(0, 0, 0, 0)'){console.log('FAIL pwa code files');process.exitCode=1}
  if(errs.length||!r.sw||!off||man.errors.length){console.log('FAIL pwa');process.exitCode=1}
  await b.close();
})();

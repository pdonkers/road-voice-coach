// Listening diagnostics: a session started with the Start button logs every take and phone event, and the Diagnostics page shows and exports them.
const {chromium}=require(process.env.PLAYWRIGHT||'/opt/npm-tools/node_modules/playwright');
const secs=+(process.argv[2]||60);
(async()=>{
  const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+__dirname+'/audio/voice.wav','--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:412,height:900},permissions:['microphone','clipboard-read','clipboard-write']});
  const p=await ctx.newPage();let errs=0;
  p.on('pageerror',e=>{errs++;console.log('PAGEERROR',e.message)});
  await p.addInitScript(()=>{window.__speed=6;
    const ss={speak(u){Promise.resolve().then(()=>u.onend&&u.onend())},cancel(){},getVoices(){return[]},onvoiceschanged:null};
    Object.defineProperty(window,'speechSynthesis',{value:ss,configurable:true})});
  await p.goto('http://localhost:8765/index.html');
  await p.click('#goBtn');
  await p.waitForTimeout(secs*500);
  await p.evaluate(()=>{doPause(true)});await p.waitForTimeout(1500);await p.evaluate(()=>{doPause(false)});
  await p.waitForFunction(()=>S.canSkip&&stageName!=="Starting",null,{timeout:60000}).catch(()=>{});
  await p.evaluate(()=>doSkip());
  await p.waitForTimeout(secs*500);
  await p.click('#goBtn');await p.waitForTimeout(300);await p.click('#goBtn');await p.waitForTimeout(1500); // the first Stop starts the cool-down, the second stops at once
  const log=await p.evaluate(()=>JSON.parse(localStorage.getItem('rvc_diag')));
  const s=log[log.length-1];
  const ends={};s.takes.forEach(x=>ends[x.end]=(ends[x.end]||0)+1);
  console.log('sessions',log.length,'| finished',s.min!=null,'| version',s.ver,'| speaker delay',s.lat,'| noise',s.noise0,'| takes',s.takes.length,'| ended',JSON.stringify(ends),'| events',JSON.stringify(s.ev.map(e=>e[1])));
  console.log('blocks',[...new Set(s.takes.map(x=>x.b))].join(', '));
  console.log('stored characters',await p.evaluate(()=>localStorage.getItem('rvc_diag').length));
  await p.click('#setBtn');await p.click('#diagBtn');await p.waitForTimeout(300);
  const ui=await p.evaluate(()=>({shown:!$("diag").hidden,home:getComputedStyle(document.querySelector(".main.home")).display,
    summary:document.querySelector("#diagList summary").textContent,rows:document.querySelector("#diagList pre").textContent.split("\n").length,
    nav:document.querySelector(".links [aria-current]").id,pageScrollsSideways:document.scrollingElement.scrollWidth>innerWidth}));
  console.log(JSON.stringify(ui));
  await p.click('#diagCopy');await p.waitForTimeout(300);
  const clip=await p.evaluate(()=>navigator.clipboard.readText());
  console.log('message:',await p.textContent('#diagMsg'),'| copied lines',clip.split('\n').length);
  console.log(clip.split('\n').slice(0,14).join('\n'));
  const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#diagFile')]);
  console.log('file:',dl.suggestedFilename());
  await p.screenshot({path:__dirname+'/out/diag.png',fullPage:true});
  p.once('dialog',d=>d.accept());await p.click('#diagClear');await p.waitForTimeout(200);
  console.log('after clear:',await p.evaluate(()=>localStorage.getItem('rvc_diag')),'|',await p.textContent('#diagList'));
  console.log('page errors:',errs);
  await b.close();
})();

const {chromium}=require(process.env.PLAYWRIGHT||'/opt/npm-tools/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+__dirname+'/audio/voice.wav','--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:412,height:900},permissions:['microphone']});
  const p=await ctx.newPage();let errs=0;const says=[];
  p.on('console',m=>{if(m.text().startsWith('@SAY'))says.push(m.text())});
  p.on('pageerror',e=>{errs++;console.log('PAGEERROR',e.message)});
  await p.addInitScript(()=>{window.__speed=60;
    const si=window.setInterval.bind(window);window.setInterval=(f,ms,...a)=>si(f,Math.max(1000,ms||0),...a);
    const ss={speak(u){if(u.text)console.log('@SAY '+u.text);Promise.resolve().then(()=>u.onend&&u.onend())},cancel(){},getVoices(){return[]},onvoiceschanged:null};
    Object.defineProperty(window,'speechSynthesis',{value:ss,configurable:true})});
  await p.goto('http://localhost:'+(process.env.PORT||8765)+'/index.html');
  await p.screenshot({path:__dirname+'/out/home.png'});
  console.log('button label:',await p.textContent('#laterBtn'));
  await p.selectOption('#delaySel','5');console.log('after select:',await p.textContent('#laterBtn'));
  await p.click('#laterBtn');
  await p.waitForTimeout(1500);console.log('t+1.5s stage:',await p.textContent('#stage'),'| laterRow hidden:',await p.isHidden('#laterRow'),'| says so far:',says.length);
  await p.waitForTimeout(2500);console.log('t+4s stage:',await p.textContent('#stage'));
  await p.waitForTimeout(3000);console.log('t+7s stage:',await p.textContent('#stage'),'| first say:',(says[0]||'').slice(0,60));
  await p.click('#goBtn');await p.waitForTimeout(800);
  console.log('after stop:',await p.textContent('#stage'),'| laterRow hidden:',await p.isHidden('#laterRow'),'| errors',errs);
  // skip during countdown
  await p.click('#laterBtn');await p.waitForTimeout(1200);await p.click('#skipBtn');await p.waitForTimeout(1500);
  console.log('after skip stage:',await p.textContent('#stage'));
  await p.click('#goBtn');await p.waitForTimeout(500);
  if(errs){console.log('FAIL page errors:',errs);process.exitCode=1}
  await b.close();
})();

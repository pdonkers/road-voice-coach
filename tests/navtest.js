const {chromium}=require(process.env.PLAYWRIGHT||'/opt/npm-tools/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({viewport:{width:412,height:900},permissions:['microphone']});
  const p=await ctx.newPage();let errs=0;p.on('pageerror',e=>{errs++;console.log('PAGEERROR',e.message)});
  await p.goto('http://localhost:8765/index.html');
  const st=async l=>console.log(l,'| start visible:',await p.isVisible('#goBtn'),'| current:',await p.getAttribute('.links button[aria-current]','id'),'| open:',await p.evaluate(()=>panels.filter(x=>!document.getElementById(x).hidden).join(',')||'none'));
  await st('home');
  await p.click('#progBtn');await st('progress');await p.screenshot({path:__dirname+'/out/nav_prog.png'});
  await p.click('#progress .back');await st('back');
  await p.click('#guideBtn');await st('guide');await p.click('#setBtn');await st('settings');await p.click('#homeBtn');await st('home link');
  await p.click('#setBtn');await p.click('#title');await st('title tap');
  await p.click('#testBtn');await p.waitForTimeout(1200);await st('mic test');console.log('big button:',await p.textContent('#goBtn'),'| stage:',await p.textContent('#stage'));
  await p.click('#homeBtn');await p.waitForTimeout(600);await st('home from test');console.log('big button:',await p.textContent('#goBtn'),'| stage:',await p.textContent('#stage'),'| errors',errs);
  await b.close();
})();

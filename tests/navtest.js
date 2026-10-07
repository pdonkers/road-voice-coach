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
  // home practice (like the mic test: the Home link ends it; the nav fits at 412 px)
  await p.click('#hpBtn');await p.waitForTimeout(1200);await st('home practice');console.log('big button:',await p.textContent('#goBtn'),'| stage:',await p.textContent('#stage'),'| graph visible:',await p.isVisible('#hpCv'));
  await p.click('#testBtn');console.log('mic test button ignored while home practice runs:',await p.evaluate(()=>S.running&&S.mode==='home'));
  await p.click('#homeBtn');await p.waitForTimeout(600);await st('home from home practice');console.log('big button:',await p.textContent('#goBtn'),'| stage:',await p.textContent('#stage'),'| graph hidden:',!(await p.isVisible('#hpCv')));
  console.log('nav fits at 412 px:',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('.links button')].every(x=>x.getBoundingClientRect().right<=innerWidth)),'| errors',errs);
  await p.screenshot({path:__dirname+'/out/nav_home.png'});
  await b.close();
})();

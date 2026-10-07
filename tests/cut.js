const {chromium}=require(process.env.PLAYWRIGHT||'/opt/npm-tools/node_modules/playwright');
const [port,wav,lag]=[process.argv[2]||process.env.PORT||8765,process.argv[3],+process.argv[4]];
(async()=>{
  const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-audio-capture='+__dirname+'/audio/'+wav,'--autoplay-policy=no-user-gesture-required']});
  const ctx=await b.newContext({permissions:['microphone']});const p=await ctx.newPage();
  p.on('pageerror',e=>console.log('PAGEERROR',e.message));
  await p.goto('http://localhost:'+port+'/index.html');
  const r=await p.evaluate(async(lag)=>{
    S.running=true;S.stop=false;S.mode="session";await openMic();await calibrate(2500);
    S.clock0-=lag;                       // audio delivery has fallen this many ms behind the wall clock
    const t=performance.now();const f=await listen({max:20000,wait:8000});const d=(performance.now()-t)/1000;
    const v=f.filter(x=>x.m!=null);const h=analyseHold(f,50,{need:5});
    closeMic();S.running=false;
    return {listenSec:+d.toFixed(1),takeSec:S.lastTake?+(S.lastTake.pcm.length/S.lastTake.sr).toFixed(1):0,voicedFrames:v.length,noteHeard:v.length?nname(median(v.map(x=>x.m))):null,holdDur:h.dur?+h.dur.toFixed(1):0,holdText:h.text,noise:+S.noise.toFixed(4)};
  },lag);
  console.log(JSON.stringify(r));await b.close();
})();

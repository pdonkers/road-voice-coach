// Runs every test script in turn and prints a summary table. Exit code 0 only if all pass.
//   node tests/run-all.js            all scripts (about 35 minutes)
//   node tests/run-all.js --quick    skips blocks.js and the 20-minute length run (about 20 minutes)
//   node tests/run-all.js songs home only the named scripts
// Serves the repo on port 8765 (or the PORT environment variable, which every script reads) unless something there already serves index.html; if the port is taken by something else, a free port is used.
// Needs: npm install, npx playwright install chromium, and ffmpeg once (to decode tests/audio/*.opus).
const fs=require('fs'),path=require('path'),http=require('http'),cp=require('child_process');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(__dirname,'out'),AUDIO=path.join(__dirname,'audio'),PORT0=+process.env.PORT||8765;let PORT=PORT0;
const MIN=60000;
// timing.js and filt*.js are measurements and reference simulations, not checks, so they are not listed. clipcheck.js and cut.js only print numbers; here they must just run without error.
const CLEAN=/page errors: 0/;
const SCRIPTS=[
  {name:'pwa',file:'pwa.js',expect:[/offline title: \S/,/offline app running: true/]},
  {name:'navtest',file:'navtest.js',expect:[/nav fits at 412 px: true/]},
  {name:'own',file:'own.js',expect:[/"saved":true/]},
  {name:'realtest',file:'realtest.js',expect:[/"playedOk":true/]},
  {name:'backup',file:'backup.js',expect:[/RESTORE OK/,CLEAN]},
  {name:'later',file:'later.js',expect:[/after skip stage:/]},
  {name:'clipcheck',file:'clipcheck.js',expect:[/\.mp3/]},
  {name:'cut road11',file:'cut.js',args:['$PORT','road11.wav','0'],expect:[/"listenSec"/]},
  {name:'cut quiet',file:'cut.js',args:['$PORT','quiet.wav','0'],expect:[/"listenSec"/]},
  {name:'smoke',file:'smoke.js',args:['6','45'],expect:[/^errors: 0/m],max:5*MIN},
  {name:'smoke seed throttle',file:'smoke.js',args:['6','45','seed','shot_seed.png','throttle'],expect:[/^errors: 0/m],max:5*MIN},
  {name:'diag',file:'diag.js',args:['30'],expect:[CLEAN],max:5*MIN},
  {name:'home',file:'home.js',expect:[/all passed \| page errors: 0/],max:10*MIN},
  {name:'progress',file:'progress.js',expect:[/checks failed: 0/,CLEAN],max:10*MIN},
  {name:'songs',file:'songs.js',expect:[/ALL PASS/,CLEAN],max:10*MIN},
  {name:'ear',file:'ear.js',args:['10'],expect:[/all passed \| page errors: 0/],max:10*MIN},
  {name:'technique',file:'technique.js',expect:[/failed checks: 0/,CLEAN],max:15*MIN},
  {name:'limits',file:'limits.js',args:['10'],expect:[/all checks passed/,CLEAN],max:15*MIN},
  {name:'focus',file:'focus.js',args:['10'],expect:[/ALL PASSED/,CLEAN],max:20*MIN},
  {name:'blocks',file:'blocks.js',expect:[/page errors: 0 \|/],slow:true,max:15*MIN},
  {name:'length 20 min',file:'length.js',args:['20','10'],expect:[/^length 20 min: ended /m,CLEAN],slow:true,max:20*MIN},
];

const args=process.argv.slice(2),quick=args.includes('--quick'),only=args.filter(a=>!a.startsWith('--'));
const log=(...a)=>console.log(...a);

const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.mp3':'audio/mpeg','.wav':'audio/wav','.opus':'audio/ogg','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8','.txt':'text/plain; charset=utf-8'};
function serve(port){
  return new Promise((resolve,reject)=>{
    const srv=http.createServer((req,res)=>{
      let p;try{p=decodeURIComponent(new URL(req.url,'http://x').pathname)}catch(e){res.writeHead(400);return res.end()}
      if(p.endsWith('/'))p+='index.html';
      const f=path.join(ROOT,p);
      if(f!==ROOT&&!f.startsWith(ROOT+path.sep)||/[\\/](node_modules|\.git)[\\/]/.test(f)){res.writeHead(403);return res.end()}
      fs.readFile(f,(err,buf)=>{
        if(err){res.writeHead(404);return res.end('not found')}
        res.writeHead(200,{'Content-Type':MIME[path.extname(f).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});res.end(buf);
      });
    });
    srv.once('error',reject);srv.listen(port,'127.0.0.1',()=>{PORT=srv.address().port;resolve(srv)});
  });
}
const answers=()=>new Promise(r=>{
  const q=http.get({host:'127.0.0.1',port:PORT,path:'/index.html',timeout:3000},res=>{res.resume();r(res.statusCode===200)});
  q.on('error',()=>r(false));q.on('timeout',()=>{q.destroy();r(false)});
});

function prepare(){
  fs.mkdirSync(OUT,{recursive:true});
  const todo=fs.readdirSync(AUDIO).filter(f=>f.endsWith('.opus')&&!fs.existsSync(path.join(AUDIO,f.replace(/\.opus$/,'.wav'))));
  if(!todo.length)return;
  log('Decoding simulated microphone recordings: '+todo.join(', '));
  for(const f of todo){
    const r=cp.spawnSync('ffmpeg',['-y','-loglevel','error','-i',path.join(AUDIO,f),'-ar','48000','-ac','1','-c:a','pcm_s16le',path.join(AUDIO,f.replace(/\.opus$/,'.wav'))],{encoding:'utf8'});
    if(r.error&&r.error.code==='ENOENT'){console.error('ffmpeg was not found. Install it (for example "winget install ffmpeg", "brew install ffmpeg" or "sudo apt-get install -y ffmpeg") and run again: it decodes tests/audio/*.opus, and clipcheck.js uses it too.');process.exit(2)}
    if(r.status!==0){console.error('ffmpeg failed on '+f+': '+(r.stderr||r.error));process.exit(2)}
  }
}

// Reasons a script's output says it failed, beyond its exit code.
function judge(s,out,code,timedOut){
  const why=[];
  if(timedOut)why.push('timed out');
  else if(code!==0)why.push('exit code '+code);
  let m;
  const num=(re,label)=>{re.lastIndex=0;while((m=re.exec(out)))if(+m[1]>0)why.push(label+' '+m[1])};
  num(/page errors:?\s+(\d+)/gi,'page errors');
  num(/^errors:?\s+(\d+)/gim,'errors');
  num(/[|,]\s*errors\s+(\d+)/gi,'errors');
  num(/(\d+)\s+(?:check\(s\)\s+)?FAILED/g,'failed');
  num(/FAILED:\s*(\d+)/g,'failed');
  num(/checks failed:\s*(\d+)/gi,'checks failed');
  num(/failed checks:\s*(\d+)/gi,'failed checks');
  if(/^FAIL\b/m.test(out))why.push((out.match(/^FAIL\b/gm)||[]).length+' FAIL line(s)');
  if(/RESTORE MISMATCH/.test(out))why.push('RESTORE MISMATCH');
  if(/TIMEOUT/.test(out))why.push('TIMEOUT in output');
  if(/^PAGEERROR|^CONSOLE ERROR/m.test(out))why.push('PAGEERROR in output');
  if(!why.length)for(const re of s.expect||[])if(!re.test(out))why.push('missing expected line '+re);
  return [...new Set(why)];
}

function run(s){
  return new Promise(resolve=>{
    const t0=Date.now();let out='',timedOut=false;
    const env={...process.env,PORT:String(PORT),PLAYWRIGHT:process.env.PLAYWRIGHT||'playwright'};
    const c=cp.spawn(process.execPath,[path.join(__dirname,s.file),...(s.args||[]).map(a=>a==='$PORT'?String(PORT):a)],{cwd:OUT,env});
    const add=d=>{out+=d};c.stdout.on('data',add);c.stderr.on('data',add);
    const timer=setTimeout(()=>{timedOut=true;c.kill()},s.max||5*MIN);
    c.on('error',e=>{out+='\n'+e.message;clearTimeout(timer);resolve({s,secs:(Date.now()-t0)/1000,why:['could not start: '+e.message],out})});
    c.on('close',code=>{
      clearTimeout(timer);
      const text=out.replace(/\r/g,'');
      try{fs.writeFileSync(path.join(OUT,s.name.replace(/\W+/g,'_')+'.log'),text)}catch(e){}
      resolve({s,secs:(Date.now()-t0)/1000,why:judge(s,text,code,timedOut),out:text});
    });
  });
}

(async()=>{
  if(!fs.existsSync(path.join(ROOT,'node_modules','playwright'))&&!process.env.PLAYWRIGHT){console.error('Playwright is not installed. Run "npm install" and "npx playwright install chromium" first.');process.exit(2)}
  prepare();
  let srv=null;
  if(await answers())log('Using the server already answering on port '+PORT);
  else{try{srv=await serve(PORT0)}catch(e){if(e.code!=='EADDRINUSE'){console.error(e.message);process.exit(2)}srv=await serve(0)}log('Serving the repo on port '+PORT)}
  let list=SCRIPTS.filter(s=>!(quick&&s.slow));
  if(only.length){list=SCRIPTS.filter(s=>only.some(o=>s.name===o||s.file===o||s.file===o+'.js'||s.name.startsWith(o+' ')));if(!list.length){console.error('No script matches: '+only.join(' '));process.exit(2)}}
  const results=[],T0=Date.now();
  for(const s of list){
    process.stdout.write(('['+(results.length+1)+'/'+list.length+'] '+s.name+' ... '));
    const r=await run(s);results.push(r);
    log((r.why.length?'FAIL':'ok')+' ('+r.secs.toFixed(0)+' s)');
    if(r.why.length){log('  '+r.why.join('; '));log(r.out.trim().split('\n').slice(-25).map(l=>'  | '+l.slice(0,240)).join('\n'))}
  }
  log('\nSummary'+(quick?' (quick)':'')+':');
  const w=Math.max(...results.map(r=>r.s.name.length));
  for(const r of results)log('  '+r.s.name.padEnd(w)+'  '+(r.why.length?'FAIL':'pass')+'  '+String(r.secs.toFixed(0)).padStart(4)+' s'+(r.why.length?'  '+r.why.join('; '):''));
  const bad=results.filter(r=>r.why.length);
  log('\n'+(bad.length?bad.length+' of '+results.length+' failed: '+bad.map(r=>r.s.name).join(', '):'All '+results.length+' passed')+' in '+((Date.now()-T0)/MIN).toFixed(1)+' minutes. Output of each script is in tests/out/*.log.');
  if(srv)srv.close();
  process.exit(bad.length?1:0);
})();

const fs=require('fs');const js=fs.readFileSync(__dirname+'/../js/core.js','utf8');
eval(js.slice(js.indexOf('/* ---------- YIN'),js.indexOf('/* ---------- analysis')).replace('function yin','globalThis.yin=function'));
const sr=48000;
function biquad(type,fc,Q=0.7071){const w=2*Math.PI*fc/sr,c=Math.cos(w),al=Math.sin(w)/(2*Q);let b0,b1,b2;const a0=1+al,a1=-2*c,a2=1-al;
  if(type==='hp'){b0=(1+c)/2;b1=-(1+c);b2=(1+c)/2}else{b0=(1-c)/2;b1=1-c;b2=(1-c)/2}
  return x=>{const y=new Float32Array(x.length);let x1=0,x2=0,y1=0,y2=0;for(let i=0;i<x.length;i++){const v=(b0*x[i]+b1*x1+b2*x2-a1*y1-a2*y2)/a0;x2=x1;x1=x[i];y2=y1;y1=v;y[i]=v}return y}}
function sig(f0,voiceRms,rumbleRms,secs=4){const n=sr*secs,x=new Float32Array(n);
  // voice: harmonics with a formant-ish emphasis around 600 Hz
  let v=new Float32Array(n);for(let k=1;k<=14;k++){const a=(1/k)*(1+2*Math.exp(-Math.pow((k*f0-650)/250,2)));const ph=Math.random()*6.28;for(let i=0;i<n;i++)v[i]+=a*Math.sin(2*Math.PI*k*f0*i/sr+ph)}
  let rv=0;for(let i=0;i<n;i++)rv+=v[i]*v[i];rv=Math.sqrt(rv/n);
  // rumble: white noise through two lowpasses at 150 Hz, plus engine tone 83 Hz with harmonics
  let w=new Float32Array(n);for(let i=0;i<n;i++)w[i]=Math.random()*2-1;w=biquad('lp',150)(biquad('lp',150)(w));
  for(let i=0;i<n;i++)w[i]+=0.02*Math.sin(2*Math.PI*83*i/sr)+0.012*Math.sin(2*Math.PI*166*i/sr);
  let rw=0;for(let i=0;i<n;i++)rw+=w[i]*w[i];rw=Math.sqrt(rw/n);
  for(let i=0;i<n;i++)x[i]=v[i]/rv*voiceRms+w[i]/rw*rumbleRms+0.003*(Math.random()*2-1);
  return x}
const chains={'hp65 (now)':x=>biquad('lp',1800)(biquad('hp',65)(x)),'hp110 x2':x=>biquad('lp',2200)(biquad('hp',110)(biquad('hp',110)(x))),'hp150 x2':x=>biquad('lp',2200)(biquad('hp',150)(biquad('hp',150)(x))),'hp200 x2':x=>biquad('lp',2500)(biquad('hp',200)(biquad('hp',200)(x)))};
function rate(x,f0){let ok=0,n=0,oct=0;for(let s=8192;s+4096<x.length;s+=1920){const p=yin(x.subarray(s,s+4096),sr);n++;if(p&&p.c>0.8){const c=1200*Math.log2(p.f/f0);if(Math.abs(c)<50)ok++;else if(Math.abs(Math.abs(c)-1200)<60)oct++}}return [Math.round(ok/n*100),Math.round(oct/n*100)]}
function snr(x,clean){let a=0;for(let i=8192;i<x.length;i++)a+=x[i]*x[i];return Math.sqrt(a/(x.length-8192))}
console.log('voiced frames detected correctly (% ok / % octave error), voice rms 0.03');
for(const rum of [0.03,0.08,0.15]){console.log(' rumble rms',rum,'(voice is',(20*Math.log10(0.03/rum)).toFixed(0),'dB vs rumble)');
  for(const f0 of [98,131,196]){const x=sig(f0,0.03,rum);const noiseOnly=sig(f0,0,rum,2);
    console.log('   f0',f0,Object.entries(chains).map(([k,f])=>{const y=f(x),nz=f(noiseOnly);return k+': '+rate(y,f0).join('/')+' gate '+(snr(y)/snr(nz)).toFixed(1)+'x'}).join(' | '))}}

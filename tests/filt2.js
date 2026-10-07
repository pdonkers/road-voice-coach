const fs=require('fs');const js=fs.readFileSync(__dirname+'/../js/core.js','utf8');
eval(js.slice(js.indexOf('/* ---------- YIN'),js.indexOf('/* ---------- analysis')).replace('function yin','globalThis.yin=function'));
const sr=48000;
function biquad(type,fc,Q=0.7071){const w=2*Math.PI*fc/sr,c=Math.cos(w),al=Math.sin(w)/(2*Q);let b0,b1,b2;const a0=1+al,a1=-2*c,a2=1-al;
  if(type==='hp'){b0=(1+c)/2;b1=-(1+c);b2=(1+c)/2}else{b0=(1-c)/2;b1=1-c;b2=(1-c)/2}
  return x=>{const y=new Float32Array(x.length);let x1=0,x2=0,y1=0,y2=0;for(let i=0;i<x.length;i++){const v=(b0*x[i]+b1*x1+b2*x2-a1*y1-a2*y2)/a0;x2=x1;x1=x[i];y2=y1;y1=v;y[i]=v}return y}}
const rms=(x,a=8192)=>{let s=0;for(let i=a;i<x.length;i++)s+=x[i]*x[i];return Math.sqrt(s/(x.length-a))};
function road(n){ // interior road noise: power falls about 9 dB per octave (brown x pink), plus weak engine-order tones
  let w=new Float32Array(n),br=0,b0=0,b1=0,b2=0;
  for(let i=0;i<n;i++){const wh=Math.random()*2-1;b0=0.99765*b0+wh*0.0990460;b1=0.96300*b1+wh*0.2965164;b2=0.57000*b2+wh*1.0526913;const pink=b0+b1+b2+wh*0.1848;br=0.9975*br+pink;w[i]=br}
  w=biquad('hp',25)(w);const rw=rms(w,0);
  const x=new Float32Array(n);for(let i=0;i<n;i++)x[i]=w[i]/rw+0.05*Math.sin(2*Math.PI*83*i/sr)+0.03*Math.sin(2*Math.PI*166*i/sr)+0.02*Math.sin(2*Math.PI*249*i/sr);
  const r=rms(x,0);for(let i=0;i<n;i++)x[i]/=r;return x}
function voice(n,f0){let v=new Float32Array(n);for(let k=1;k<=16;k++){const a=(1/k)*(1+2*Math.exp(-Math.pow((k*f0-650)/250,2)));const ph=Math.random()*6.28;for(let i=0;i<n;i++)v[i]+=a*Math.sin(2*Math.PI*k*f0*i/sr+ph)}const r=rms(v,0);for(let i=0;i<n;i++)v[i]/=r;return v}
const mk=(hp,lp,stages=2)=>x=>{let y=x;for(let i=0;i<stages;i++)y=biquad('hp',hp)(y);return biquad('lp',lp)(y)};
const chains={'hp65x1 (now)':x=>biquad('lp',1800)(biquad('hp',65)(x)),'hp200x2':mk(200,2500),'hp250x2':mk(250,2500),'hp300x2':mk(300,3000),'hp250x4':mk(250,3000,4)};
function rate(x,f0,gate,noiseR){let ok=0,n=0,bad=0;for(let s=8192;s+4096<x.length;s+=1920){const fr=x.subarray(s,s+4096);n++;let r=0;for(let i=0;i<4096;i++)r+=fr[i]*fr[i];r=Math.sqrt(r/4096);if(r<noiseR*gate)continue;const p=yin(fr,sr);if(p&&p.c>0.8&&p.f>65&&p.f<1100){if(f0&&Math.abs(1200*Math.log2(p.f/f0))<50)ok++;else bad++}}return Math.round(ok/n*100)+'/'+Math.round(bad/n*100)}
const n=sr*5;
{const rd=road(n);const band=(lo,hi)=>20*Math.log10(rms(biquad('lp',hi)(biquad('lp',hi)(biquad('hp',lo)(biquad('hp',lo)(rd))))));console.log('noise band levels re total (dB): 25-100',band(25,100).toFixed(0),'| 100-200',band(100,200).toFixed(0),'| 200-400',band(200,400).toFixed(0),'| 400-800',band(400,800).toFixed(0),'| 800-1600',band(800,1600).toFixed(0))}
for(const db of [-8,-14,-20,-26]){const g=Math.pow(10,db/20);console.log('voice',db,'dB relative to total road noise   (% correct / % wrong pitch), gate 1.4x');
  for(const f0 of [98,147,220]){const rd=road(n),v=voice(n,f0),x=new Float32Array(n);for(let i=0;i<n;i++)x[i]=rd[i]*0.1+v[i]*0.1*g;
    console.log('   f0',f0,Object.entries(chains).map(([k,f])=>{const y=f(x),nz=f(rd.map(q=>q*0.1));return k+' '+rate(y,f0,1.4,rms(nz))}).join(' | '))}}
// false positives on noise alone, no gate and with engine rev 2x louder
{const rd=road(n).map(q=>q*0.1);console.log('noise only, no gate (% frames with a false pitch):',Object.entries(chains).map(([k,f])=>k+' '+rate(f(rd),0,0,1).split('/')[1]).join(' | '))}

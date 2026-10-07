const fs=require('fs'),cp=require('child_process');
const js=fs.readFileSync(__dirname+'/../js/core.js','utf8');
eval(js.slice(js.indexOf('/* ---------- YIN'),js.indexOf('/* ---------- analysis')).replace('function yin','globalThis.yin=function'));
const NAMES=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],nn=m=>NAMES[(Math.round(m)%12+12)%12]+(Math.floor(Math.round(m)/12)-1);
const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[s.length>>1]};
for(const f of fs.readdirSync(__dirname+'/../audio').filter(f=>f.endsWith('.mp3')).sort()){
  const raw=cp.execSync(`ffmpeg -v error -i ${__dirname}/../audio/${f} -f f32le -ac 1 -ar 48000 -`,{maxBuffer:1<<28});
  const x=new Float32Array(raw.buffer,raw.byteOffset,raw.length>>2);const fr=[];
  for(let s=0;s+4096<=x.length;s+=1920){const b=x.subarray(s,s+4096);let r=0;for(let i=0;i<4096;i++)r+=b[i]*b[i];r=Math.sqrt(r/4096);const p=yin(b,48000);fr.push({r,m:(p&&p.c>0.8&&p.f>60&&p.f<1100)?69+12*Math.log2(p.f/440):null,c:p?p.c:0})}
  const v=fr.filter(q=>q.m!=null),ms=v.map(q=>q.m);const rs=fr.map(q=>q.r);const k=Math.floor(fr.length/3);const mean=a=>a.reduce((p,q)=>p+q,0)/(a.length||1);
  let gaps=0,run=0;const pk=Math.max(...rs);for(const q of fr){if(q.r<pk*0.12)run++;else{if(run>=2)gaps++;run=0}}
  let jumps=0;for(let i=1;i<v.length;i++)if(Math.abs(v[i].m-v[i-1].m)>0.7)jumps++;
  console.log(f.padEnd(17),(x.length/48000).toFixed(1)+'s','voiced',Math.round(v.length/fr.length*100)+'%','pitch',ms.length?nn(Math.min(...ms))+'..'+nn(Math.max(...ms))+' med '+nn(med(ms)):'-','conf',mean(fr.map(q=>q.c)).toFixed(2),'level thirds',[mean(rs.slice(0,k)),mean(rs.slice(k,2*k)),mean(rs.slice(2*k))].map(z=>z.toFixed(3)).join('/'),'gaps',gaps,'steps',jumps);
}

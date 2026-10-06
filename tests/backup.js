// Backup and restore: a saved file holds settings, progress, takes and model notes, and restoring it on a cleared phone brings them back.
const {chromium}=require(process.env.PLAYWRIGHT||'/opt/npm-tools/node_modules/playwright');
const fs=require('fs');
(async()=>{
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:412,height:900},acceptDownloads:true});
  const p=await ctx.newPage();let errs=0;p.on('pageerror',e=>{errs++;console.log('PAGEERROR',e.message)});
  await p.goto('http://localhost:8765/index.html');
  const before=await p.evaluate(async()=>{
    store.set("history",[{d:"2026-10-01",err:31,min:20}]);store.set("profile",{low:43,high:62,home:52});store.set("nasal","more");D.tips["n-yawn"]={n:3,star:true};saveD();
    const sr=48000,pcm=new Float32Array(sr*2);for(let i=0;i<pcm.length;i++)pcm[i]=0.4*Math.sin(2*Math.PI*220*i/sr);
    await addClip("Test take",{pcm,sr});await idb.put("notes",{pcm:pcm.slice(0,sr),sr,p:57,err:4},"57-ah");
    return {clips:(await idb.all("clips")).length,notes:(await idbEntries("notes")).length,s:pcm[1000]};
  });
  await p.click('#setBtn');
  const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#bkSave')]);
  const file=__dirname+'/out/backup.json';await dl.saveAs(file);
  console.log('file',dl.suggestedFilename(),Math.round(fs.statSync(file).size/1024)+' KB |',await p.textContent('#bkMsg'),'|',await p.textContent('#bkLast'));
  // wipe the phone
  await p.evaluate(async()=>{localStorage.clear();await idb.clear("clips");await idb.clear("notes")});
  await p.reload();await p.click('#setBtn');
  p.once('dialog',d=>{console.log('confirm:',d.message());d.accept()});
  await p.setInputFiles('#bkFile',file);
  await p.waitForEvent('load',{timeout:10000});
  const after=await p.evaluate(async()=>{const c=await idb.all("clips"),n=await idbEntries("notes");
    return {hist:store.get("history",[]).length,profile:store.get("profile",null),nasal:store.get("nasal",""),star:!!(D.tips["n-yawn"]&&D.tips["n-yawn"].star),
      clips:c.length,label:c[0]&&c[0].label,notes:n.length,noteKey:n[0]&&n[0][0],s:c[0]&&c[0].pcm[1000]}});
  console.log('before',JSON.stringify(before));
  console.log('after ',JSON.stringify(after));
  console.log(after.hist===1&&after.nasal==="more"&&after.star&&after.clips===before.clips&&after.notes===1&&Math.abs(after.s-before.s)<1e-3?'RESTORE OK':'RESTORE MISMATCH');
  // a file that is not a backup is refused
  fs.writeFileSync(__dirname+'/out/not-backup.json','{"hello":1}');
  await p.click('#setBtn');await p.setInputFiles('#bkFile',__dirname+'/out/not-backup.json');await p.waitForTimeout(300);
  console.log('wrong file:',await p.textContent('#bkMsg'));
  console.log('page errors:',errs);await b.close();
})();

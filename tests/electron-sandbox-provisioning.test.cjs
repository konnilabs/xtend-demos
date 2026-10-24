'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {commands,destination,dist,version,zipSha}=require('../scripts/provision-electron-sandbox.cjs');
test('privileged plan grants setuid only to checksum-bound official helper',()=>{const rows=commands('/tmp/official.zip');const sudo=rows.filter(r=>r[0]==='sudo');assert.deepEqual(sudo.map(r=>r[1][0]),['install','install','unzip','chmod','chmod']);assert.deepEqual(sudo.at(-1),['sudo',['chmod','4755',dist+'/chrome-sandbox']]);assert.ok(rows.findIndex(r=>r[1][1]==='copied')<rows.findIndex(r=>r[1][0]==='unzip'));assert.ok(rows.findIndex(r=>r[1][1]==='installed-unarmed')<rows.findIndex(r=>r[1][0]==='chmod'&&r[1][1]==='4755'));for(const [_,args] of sudo)assert.ok(!args.includes(process.execPath)&&!args.some(x=>/sysctl|apparmor|no-sandbox|disable-setuid|chown/.test(x)));assert.equal(destination,'/usr/lib/xtend-electron/'+version+'/'+zipSha);});
test('single immutable module resolution and real sandbox probe remain mandatory',()=>{const src=fs.readFileSync(path.join(__dirname,'../scripts/provision-electron-sandbox.cjs'),'utf8');assert.ok(src.includes("fs.symlinkSync(dist,path.join(electronRoot,'dist'),'dir')"));assert.ok(src.includes('proof.sandboxed!==true'));assert.ok(src.includes('proof.rendererSeccomp!==2'));const probe=fs.readFileSync(path.join(__dirname,'../scripts/electron-sandbox-probe.cjs'),'utf8');assert.ok(probe.includes('sandbox:true,nodeIntegration:false,contextIsolation:true'));assert.ok(probe.includes("'/proc/'+pid+'/status'"));assert.ok(!src.includes("execute('sudo',[process.execPath"));});

test('missing or altered receipt, runtime proof and exact official identities reject',()=>{
 const {verifyReceipt}=require('../scripts/provision-electron-sandbox.cjs');
 const good={schema:'xtend.electron-sandbox-provisioning.v1',version,zipSha256:zipSha,dist,helperMode:'04755',rootOwned:true,sandboxEnabled:true,applicationUid:1000,memberCount:74,helperSha256:'2015304df43beff0b74409cdc4d858107efcde650d9bc8afb1288041d62cec4b',electronSha256:'0636c96f07de2c74a3eaf8692fc1743d81259c0bf66c8ebde7f7179211a8aff9',runtimeProof:{sandboxed:true,contextIsolated:true,rendererSeccomp:2,applicationUid:1000,executable:dist+'/electron',electronVersion:version}};
 assert.equal(verifyReceipt(good),true);assert.throws(()=>verifyReceipt(undefined));
 for(const key of Object.keys(good)){const bad=structuredClone(good);delete bad[key];assert.throws(()=>verifyReceipt(bad),key);}
 for(const key of Object.keys(good.runtimeProof)){const bad=structuredClone(good);bad.runtimeProof[key]=null;assert.throws(()=>verifyReceipt(bad),key);}
});

test('missing required CI mode fails before filesystem or privilege operations',()=>{const previous=process.env.REQUIRED_CI_ATTESTATION;delete process.env.REQUIRED_CI_ATTESTATION;try{assert.throws(()=>require('../scripts/provision-electron-sandbox.cjs').provision('/nonexistent',()=>{throw Error('No command may execute');}),/REQUIRED_CI_ATTESTATION=1/);}finally{if(previous===undefined)delete process.env.REQUIRED_CI_ATTESTATION;else process.env.REQUIRED_CI_ATTESTATION=previous;}});

test('destination-only plan never targets an existing system ancestor or old destination',()=>{
 for(const [command,args] of commands('/tmp/official.zip'))if(command==='sudo'){
  assert.ok(!args.includes('/opt')&&!args.includes('/usr')&&!args.includes('/usr/lib'));
  assert.ok(!args.some(a=>a.includes('/opt/xtend-electron')));
  const target=args.at(-1);assert.ok(target===destination||target.startsWith(destination+'/'));
 }
 const {verifyReceipt}=require('../scripts/provision-electron-sandbox.cjs');
 const good={schema:'xtend.electron-sandbox-provisioning.v1',version,zipSha256:zipSha,dist,helperMode:'04755',rootOwned:true,sandboxEnabled:true,applicationUid:1000,memberCount:74,helperSha256:'2015304df43beff0b74409cdc4d858107efcde650d9bc8afb1288041d62cec4b',electronSha256:'0636c96f07de2c74a3eaf8692fc1743d81259c0bf66c8ebde7f7179211a8aff9',runtimeProof:{sandboxed:true,contextIsolated:true,rendererSeccomp:2,applicationUid:1000,executable:dist+'/electron',electronVersion:version}};
 assert.equal(verifyReceipt(good),true);const bad=structuredClone(good);bad.dist=dist.replace('/usr/lib/xtend-electron','/opt/xtend-electron');bad.runtimeProof.executable=bad.dist+'/electron';assert.throws(()=>verifyReceipt(bad),/exact Electron runtime receipt/);
});

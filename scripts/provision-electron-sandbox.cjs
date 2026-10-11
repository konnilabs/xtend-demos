'use strict';
// UNAPPLIED reviewed-scope proposal. Only official bytes may become setuid.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
const version='42.10.0',zipSha='edcfae0a8cf2a75ceee8a9842a0117521283164708b193495f4cb60ab2d6aa0d';
const destination='/opt/xtend-electron/'+version+'/'+zipSha,dist=destination+'/dist';
const validator=path.join(__dirname,'electron-sandbox-integrity.py');
const {annotate}=require('./runtime-preparation-diagnostics.cjs');
const run=(cmd,args)=>execFileSync(cmd,args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:600000});
function commands(zip){return [
 ['sudo',['install','-d','-o','root','-g','root','-m','0755',destination]],
 ['sudo',['install','-o','root','-g','root','-m','0444',zip,destination+'/distribution.zip']],
 ['python3',[validator,'copied',destination+'/distribution.zip']],
 ['sudo',['unzip','-q',destination+'/distribution.zip','-d',dist]],
 ['sudo',['chmod','-R','a-w',dist]],
 ['python3',[validator,'installed-unarmed',destination+'/distribution.zip',dist]],
 ['sudo',['chmod','4755',dist+'/chrome-sandbox']],
 ['python3',[validator,'installed',destination+'/distribution.zip',dist]]
];}
function verifyReceipt(receipt){
 const proof=receipt?.runtimeProof;
 if(!receipt||receipt.schema!=='xtend.electron-sandbox-provisioning.v1'||receipt.version!==version||receipt.zipSha256!==zipSha||receipt.dist!==dist||receipt.helperMode!=='04755'||receipt.rootOwned!==true||receipt.sandboxEnabled!==true||!Number.isInteger(receipt.applicationUid)||receipt.applicationUid===0||receipt.memberCount!==74||receipt.helperSha256!=='2015304df43beff0b74409cdc4d858107efcde650d9bc8afb1288041d62cec4b'||receipt.electronSha256!=='0636c96f07de2c74a3eaf8692fc1743d81259c0bf66c8ebde7f7179211a8aff9'||!proof||proof.sandboxed!==true||proof.contextIsolated!==true||proof.rendererSeccomp!==2||proof.applicationUid!==receipt.applicationUid||proof.executable!==dist+'/electron'||proof.electronVersion!==version)throw Error('Missing/modified exact Electron runtime receipt');
 return true;
}
function provision(electronRoot,execute=run){
 let stage='identity';
 try {
 if(process.env.REQUIRED_CI_ATTESTATION!=='1')throw Error('Explicit REQUIRED_CI_ATTESTATION=1 is required before provisioning');
 const pkg=JSON.parse(fs.readFileSync(path.join(electronRoot,'package.json'))),checksums=JSON.parse(fs.readFileSync(path.join(electronRoot,'checksums.json'))),name='electron-v'+version+'-linux-x64.zip';
 if(pkg.version!==version||checksums[name]!==zipSha)throw Error('Locked official Electron identity changed');
 stage='live-policy';execute('python3',[validator,'live-policy',path.resolve(electronRoot,'../../src/main/electron-main.mjs')]);
 stage='identity';if(process.getuid()===0)throw Error('Application must remain unprivileged');
 if(fs.existsSync(path.join(electronRoot,'dist'))||fs.lstatSync(electronRoot).isSymbolicLink())throw Error('Fresh ignored-script Electron installation required; existing dist is not deleted');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'xtend-electron-verified-'));
 try{
  stage='download';const zip=path.join(temp,name);execute('curl',['--fail','--location','--silent','--show-error','https://github.com/electron/electron/releases/download/v'+version+'/'+name,'--output',zip]);
  stage='checksum-preflight';execute('python3',[validator,'preflight',destination,zip]);
  stage='validation';execute(process.execPath,['--test',path.join(__dirname,'../tests/electron-sandbox-provisioning.test.cjs')]);
  execute('env',['XTEND_OFFICIAL_ELECTRON_ZIP='+zip,'PYTHONDONTWRITEBYTECODE=1','python3',path.join(__dirname,'../tests/electron-sandbox-integrity.test.py')]);
  let receipt;let index=0;for(const [cmd,args] of commands(zip)){stage=['helper-install','helper-install','checksum-copied','extract','extract','checksum-unarmed','helper-install','checksum-armed'][index++];const output=execute(cmd,args);if(cmd==='python3'&&args[1]==='installed')receipt=JSON.parse(output);}
  // One immutable installation for require('electron'), CLI and canary children.
  stage='identity';fs.symlinkSync(dist,path.join(electronRoot,'dist'),'dir');fs.writeFileSync(path.join(electronRoot,'path.txt'),'electron');
  if(fs.realpathSync(path.join(electronRoot,'dist'))!==dist)throw Error('Electron module resolution differs from verified runtime');
  stage='probe';const probeOutput=execute('xvfb-run',['-a',dist+'/electron',path.join(__dirname,'electron-sandbox-probe.cjs')]);
  const proof=JSON.parse(probeOutput.trim().split('\n').at(-1));if(proof.sandboxed!==true||proof.rendererSeccomp!==2||proof.applicationUid===0||proof.executable!==dist+'/electron'||proof.electronVersion!==version)throw Error('Actual Electron sandbox capability proof failed');
  stage='receipt';receipt.runtimeProof=proof;verifyReceipt(receipt);
  const receiptFile=path.join(electronRoot,'xtend-sandbox-receipt.json');fs.writeFileSync(receiptFile,JSON.stringify({...receipt,electronRoot:fs.realpathSync(electronRoot)},null,2)+'\n');return receipt;
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
 }catch(error){annotate(stage,error);throw error;}
}
module.exports={provision,commands,destination,dist,version,zipSha,verifyReceipt};

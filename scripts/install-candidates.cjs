'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'..');
function installCandidates(directory,coreSha,demoSha,{lockOnly=false}={}) {
 const manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json')));
 // Bootstrap only immutable tarballs. The installed public API then verifies the full closure.
 if(!/^[a-f0-9]{40}$/.test(coreSha||'')||!/^([a-f0-9]{40})$/.test(demoSha||'')||manifest.coreSha!==coreSha||manifest.demoSha!==demoSha)throw Error('Candidate SHA identity mismatch');
 for(const item of manifest.packages) {
  if(path.basename(item.file)!==item.file||fs.lstatSync(path.join(directory,item.file)).isSymbolicLink())throw Error('Invalid candidate tarball');
  if(crypto.createHash('sha256').update(fs.readFileSync(path.join(directory,item.file))).digest('hex')!==item.sha256)throw Error(`Candidate digest mismatch: ${item.name}`);
 }
 // Bootstrap the verified public API from the offered Root tarball, never a sibling checkout.
 const bootstrap=fs.mkdtempSync(path.join(os.tmpdir(),'xtend-candidate-api-'));
 const bootstrapPackage=path.join(bootstrap,'node_modules/@ccslabs/xtend');fs.mkdirSync(bootstrapPackage,{recursive:true});
 let api;
 try {
  const item=manifest.packages.find(item=>item.name==='@ccslabs/xtend');if(!item)throw Error('Missing Root candidate');
  execFileSync('tar',['-xzf',path.join(directory,item.file),'--strip-components=1','-C',bootstrapPackage]);
  const request=createRequire(path.join(bootstrap,'package.json'));api=request('@ccslabs/xtend/candidate-integrity');
  api.verifyCandidates(manifest,{coreSha,demoSha,directory});
 }finally{fs.rmSync(bootstrap,{recursive:true,force:true});}
 const products=fs.readdirSync(path.join(root,'products')).filter(name=>fs.existsSync(path.join(root,'products',name,'package.json')));
 const results=[];
 for(const relative of ['.',...products.map(name=>'products/'+name)]) {
  const target=path.join(root,relative),candidateDir=path.join(target,'.candidate');fs.mkdirSync(candidateDir,{recursive:true});
  for(const item of manifest.packages)fs.copyFileSync(path.join(directory,item.file),path.join(candidateDir,item.file));
  fs.copyFileSync(path.join(directory,manifest.php.file),path.join(candidateDir,manifest.php.file));
  fs.writeFileSync(path.join(candidateDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  const filename=path.join(target,'package.json'),original=JSON.parse(fs.readFileSync(filename));
  const temporary=structuredClone(original);temporary.dependencies||={};
  for(const item of api.selectCandidateClosure(manifest,original)) {
   temporary.dependencies[item.name]='file:.candidate/'+item.file;
   for(const section of ['devDependencies','optionalDependencies','peerDependencies'])if(temporary[section])delete temporary[section][item.name];
  }
  fs.writeFileSync(filename,JSON.stringify(temporary,null,2)+'\n');
  // Previous monorepo locks cannot participate in candidate resolution.
  const oldLock=path.join(target,'package-lock.json');
  if(fs.existsSync(oldLock)) {
   const lock=JSON.parse(fs.readFileSync(oldLock));lock.packages['']={...lock.packages[''],dependencies:temporary.dependencies,devDependencies:temporary.devDependencies||{}};
   for(const [key,entry] of Object.entries(lock.packages))if(entry.link||entry.resolved?.startsWith('file:..'))delete lock.packages[key];
   fs.writeFileSync(oldLock,JSON.stringify(lock,null,2)+'\n');
  }
  try {
   execFileSync('npm',['install','--ignore-scripts','--no-audit','--no-fund',...(lockOnly?['--package-lock-only']:[])],{cwd:target,stdio:'pipe',timeout:600000,maxBuffer:32*1024*1024});
   const lock=JSON.parse(fs.readFileSync(path.join(target,'package-lock.json')));
   for(const section of ['dependencies','devDependencies','optionalDependencies','peerDependencies','peerDependenciesMeta']){if(original[section])lock.packages[''][section]=original[section];else delete lock.packages[''][section];}
   fs.writeFileSync(path.join(target,'package-lock.json'),JSON.stringify(lock,null,2)+'\n');
  }finally {fs.writeFileSync(filename,JSON.stringify(original,null,2)+'\n');}
  if(!lockOnly) {
   const req=createRequire(filename),api=req('@ccslabs/xtend/candidate-integrity');
   api.verifyCandidates(manifest,{coreSha,demoSha,directory:candidateDir});
   api.verifyInstalledClosure(JSON.parse(fs.readFileSync(path.join(target,'package-lock.json'))),manifest);
   api.verifyResolution(req,manifest,path.join(target,'node_modules'));
   // Reproduce installation against restored versioned manifests and the candidate lock.
   execFileSync('npm',['ci','--ignore-scripts','--no-audit','--no-fund'],{cwd:target,stdio:'pipe',timeout:600000,maxBuffer:32*1024*1024});
   api.verifyInstalledClosure(JSON.parse(fs.readFileSync(path.join(target,'package-lock.json'))),manifest);
   api.verifyResolution(req,manifest,path.join(target,'node_modules'));
   execFileSync('npm',['ci','--ignore-scripts','--no-audit','--no-fund','--offline'],{cwd:target,stdio:'pipe',timeout:600000,maxBuffer:32*1024*1024});
   api.verifyInstalledClosure(JSON.parse(fs.readFileSync(path.join(target,'package-lock.json'))),manifest);
   api.verifyResolution(req,manifest,path.join(target,'node_modules'));
  }
  const lockSha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(target,'package-lock.json'))).digest('hex');
  results.push({product:relative,status:'passed',lockSha256});
 }
 const phpTarget=path.join(root,'.candidate/xtend-laravel');fs.mkdirSync(phpTarget,{recursive:true});
 execFileSync('tar',['-xf',path.join(directory,manifest.php.file),'-C',phpTarget]);
 return {schema:'xtend.product-candidate-installation.v1',ok:true,coreSha,demoSha,results};
}
if(require.main===module)try{console.log(JSON.stringify(installCandidates(path.resolve(process.argv[2]),process.argv[3],process.argv[4])));}catch(error){console.error(error.message);if(error.stderr)console.error(String(error.stderr));process.exitCode=1;}
module.exports={installCandidates};

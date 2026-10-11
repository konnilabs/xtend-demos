'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const {verifyCandidates}=require('@ccslabs/xtend/candidate-integrity');
const root=path.resolve(__dirname,'..');
function preparePackages(candidateDirectory=path.join(root,'.candidate'),expected={coreSha:process.env.XTEND_CORE_SHA,demoSha:process.env.XTEND_DEMO_SHA}) {
 const manifest=JSON.parse(fs.readFileSync(path.join(candidateDirectory,'manifest.json')));
 verifyCandidates(manifest,{...expected,directory:candidateDirectory});
 const output=path.join(root,'.packages');fs.mkdirSync(output,{recursive:true});
 const packages=['@ccslabs/xtend','@xtend-material/core'].map(name=>{
  const item=manifest.packages.find(item=>item.name===name);if(!item)throw Error('Missing required Shop candidate: '+name);
  fs.copyFileSync(path.join(candidateDirectory,item.file),path.join(output,item.file));return item.file;
 });
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'xtend-shop-php-'));
 try {
  execFileSync('tar',['-xf',path.join(candidateDirectory,manifest.php.file),'-C',temporary]);
  for(const base of [root,path.join(root,'payment-provider')]) {
   const target=path.join(base,'.packages/xtend-laravel');fs.rmSync(target,{recursive:true,force:true});fs.mkdirSync(path.dirname(target),{recursive:true});fs.cpSync(temporary,target,{recursive:true});
  }
 } finally {fs.rmSync(temporary,{recursive:true,force:true});}
 return {ok:true,coreSha:manifest.coreSha,demoSha:manifest.demoSha,packages,phpFingerprint:manifest.php.sha256,phpSources:manifest.php.sources};
}
if(require.main===module)console.log(JSON.stringify(preparePackages(process.argv[2]),null,2));
module.exports={preparePackages};

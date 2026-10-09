'use strict';
const fs=require('node:fs'),path=require('node:path');
const {verifyCandidates,verifyInstalledClosure}=require('@ccslabs/xtend/candidate-integrity');
function refreshLocalLock(root=path.resolve(__dirname,'..'),expected={coreSha:process.env.XTEND_CORE_SHA,demoSha:process.env.XTEND_DEMO_SHA}) {
 const directory=path.join(root,'.candidate'),manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json')));
 verifyCandidates(manifest,{...expected,directory});
 verifyInstalledClosure(JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'))),manifest);
 return {ok:true,mode:'verified-candidate-lock',coreSha:manifest.coreSha,demoSha:manifest.demoSha};
}
if(require.main===module)console.log(JSON.stringify(refreshLocalLock()));
module.exports={refreshLocalLock};

'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {assertOfficialRuntimeIdentity}=require('../products/xtend-llm/scripts/electron-sandbox-policy.mjs');
const root=path.resolve(__dirname,'..'),product='products/xtend-llm/',sourcePaths=['src/main/electron-main.mjs','src/main/preload.cjs','src/renderer/app-controller.mjs','src/main/app-server.mjs','src/main/app-server-session.mjs','site/index.html','scripts/electron-sandbox-policy.mjs'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function requiredMode(environment=process.env){if(environment.REQUIRED_CI_ATTESTATION!=='1')throw Error('Explicit REQUIRED_CI_ATTESTATION=1 is required');return true;}
function validateActualReport(report,{coreSha,demoSha,sourceHashes,preloadPath,provisioning,startedAt,now=Date.now()}={}) {
 if(!/^[a-f0-9]{40}$/.test(coreSha||'')||!/^[a-f0-9]{40}$/.test(demoSha||''))throw Error('Independent non-null exact Core/Demo identities required');
 if(!report||report.format!==1||report.proofKind!=='actual-application-main-frame'||report.mainFrameAttestation!==true||report.coreSha!==coreSha||report.demoSha!==demoSha)throw Error('Missing/wrong actual application identity; synthetic capability cannot substitute');
 const generated=Date.parse(report.generatedAt),started=Date.parse(startedAt);if(!Number.isFinite(started)||!Number.isFinite(generated)||generated<started||generated>now+1000||now-generated>3600000)throw Error('Missing/stale actual application attestation');
 if(!Number.isInteger(report.applicationUid)||report.applicationUid<=0||!Number.isInteger(report.rendererPid)||report.rendererPid<=0||report.rendererSeccomp!=='2'||report.sandboxed!==true||report.contextIsolated!==true||report.nodeIntegration!==false||report.sandboxPreference!==true||report.preloadPath!==preloadPath||report.runtimeIdentity?.attestationMode!=='mandatory-ci')throw Error('Actual app sandbox/preload/mode proof failed');
 assertOfficialRuntimeIdentity(report.runtimeIdentity);
 if(!provisioning||provisioning.zipSha256!=='edcfae0a8cf2a75ceee8a9842a0117521283164708b193495f4cb60ab2d6aa0d'||provisioning.applicationUid!==report.applicationUid||provisioning.helperSha256!==report.runtimeIdentity.helperSha256||provisioning.electronSha256!==report.runtimeIdentity.executableSha256||provisioning.dist+'/electron'!==report.runtimeIdentity.executable)throw Error('Actual application/helper provisioning binding mismatch');
 if(!sourceHashes||!same(Object.keys(sourceHashes).sort(),sourcePaths.slice().sort())||!report.sources||!same(Object.keys(report.sources).sort(),sourcePaths.slice().sort()))throw Error('Complete exact source identity set required');
 for(const source of sourcePaths)if(!/^[a-f0-9]{64}$/.test(sourceHashes[source]||'')||report.sources[source]!==sourceHashes[source])throw Error('Actual application source hash mismatch: '+source);
 return true;
}
function consume({coreSha,demoSha,startedAt,reportFile=path.join(root,'.xtend-test-results/electron-sandbox-attestation.json'),environment=process.env}={}) {
 requiredMode(environment);
 if(!/^[a-f0-9]{40}$/.test(coreSha||'')||!/^[a-f0-9]{40}$/.test(demoSha||''))throw Error('Independent exact candidate pins required');
 const git=(...args)=>execFileSync('git',args,{cwd:root,maxBuffer:64*1024*1024});
 if(git('rev-parse','HEAD').toString().trim()!==demoSha)throw Error('Current Demo differs from independently expected SHA');
 const sourceHashes={};
 for(const source of [...sourcePaths,'scripts/run-layout-smoke.mjs','scripts/run-electron.mjs','scripts/actual-launch-diagnostics.cjs','../../scripts/verify-electron-app-attestation.cjs','../../scripts/provision-electron-sandbox.cjs']){
  const relative=path.posix.normalize(product+source),expected=git('show',demoSha+':'+relative),actual=fs.readFileSync(path.join(root,relative));if(sha(expected)!==sha(actual))throw Error('Dirty/substituted attestation source: '+relative);if(sourcePaths.includes(source))sourceHashes[source]=sha(expected);
 }
 const provisioningFile=path.join(root,product,'node_modules/electron/xtend-sandbox-receipt.json'),provisioning=JSON.parse(fs.readFileSync(provisioningFile));
 require('./provision-electron-sandbox.cjs').verifyReceipt(provisioning); // Synthetic capability is prerequisite ONLY.
 const bytes=fs.readFileSync(reportFile),report=JSON.parse(bytes);validateActualReport(report,{coreSha,demoSha,startedAt,sourceHashes,preloadPath:path.join(root,product,'src/main/preload.cjs'),provisioning});
 return {ok:true,proofKind:'consumed-actual-application-main-frame',coreSha,demoSha,reportSha256:sha(bytes),provisioningReceiptSha256:sha(fs.readFileSync(provisioningFile)),sourceHashes,generatedAt:report.generatedAt};
}
if(require.main===module){try{const args={};for(let i=2;i<process.argv.length;i+=2)args[process.argv[i].slice(2).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=process.argv[i+1];console.log(JSON.stringify(consume(args)));}catch(error){console.error(error.stack);process.exitCode=1;}}
module.exports={requiredMode,validateActualReport,consume,sourcePaths};

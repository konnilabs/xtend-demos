'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{spawnSync}=require('node:child_process');
const {requiredMode,validateActualReport,sourcePaths}=require('../scripts/verify-electron-app-attestation.cjs');
// Controlled report-validation fixtures ONLY; no synthetic fixture is actual application runtime proof.
function fixture(){const now=Date.now(),dist='/usr/lib/xtend-electron/42.10.0/edcfae0a8cf2a75ceee8a9842a0117521283164708b193495f4cb60ab2d6aa0d/dist',coreSha='a'.repeat(40),demoSha='b'.repeat(40),sourceHashes=Object.fromEntries(sourcePaths.map(x=>[x,'c'.repeat(64)])),runtimeIdentity={attestationMode:'mandatory-ci',electronVersion:'42.10.0',executable:dist+'/electron',executableSha256:'0636c96f07de2c74a3eaf8692fc1743d81259c0bf66c8ebde7f7179211a8aff9',helper:dist+'/chrome-sandbox',helperSha256:'2015304df43beff0b74409cdc4d858107efcde650d9bc8afb1288041d62cec4b',helperUid:0,helperGid:0,helperMode:0o4755};return {report:{format:1,proofKind:'actual-application-main-frame',mainFrameAttestation:true,coreSha,demoSha,generatedAt:new Date(now).toISOString(),applicationUid:1000,rendererPid:2000,rendererSeccomp:'2',sandboxed:true,contextIsolated:true,nodeIntegration:false,sandboxPreference:true,preloadPath:'/fixture/preload.cjs',runtimeIdentity,sources:sourceHashes},expected:{coreSha,demoSha,sourceHashes,preloadPath:'/fixture/preload.cjs',provisioning:{zipSha256:'edcfae0a8cf2a75ceee8a9842a0117521283164708b193495f4cb60ab2d6aa0d',applicationUid:1000,helperSha256:runtimeIdentity.helperSha256,electronSha256:runtimeIdentity.executableSha256,dist},startedAt:new Date(now-1000).toISOString(),now}};}
test('explicit REQUIRED_CI_ATTESTATION cannot be omitted or weakened',()=>{assert.equal(requiredMode({REQUIRED_CI_ATTESTATION:'1'}),true);for(const environment of [{},{GITHUB_ACTIONS:'true'},{REQUIRED_CI_ATTESTATION:'0'},{REQUIRED_CI_ATTESTATION:'true'}])assert.throws(()=>requiredMode(environment),/REQUIRED_CI_ATTESTATION=1/);});
test('complete controlled real-app-shaped fixture validates; it is NOT actual runtime evidence',()=>{const {report,expected}=fixture();assert.equal(validateActualReport(report,expected),true);});
test('missing, synthetic probe and untrusted main-frame reports cannot substitute',()=>{const {report,expected}=fixture();for(const altered of [null,{runtimeProof:{sandboxed:true}},{...report,proofKind:'synthetic-capability'},{...report,mainFrameAttestation:false}])assert.throws(()=>validateActualReport(altered,expected),/actual application identity/);for(const altered of [{applicationUid:0},{rendererPid:0},{sandboxed:false},{contextIsolated:false},{nodeIntegration:true},{rendererSeccomp:'0'},{preloadPath:'/wrong/preload.cjs'},{runtimeIdentity:{...report.runtimeIdentity,attestationMode:'local'}}])assert.throws(()=>validateActualReport({...report,...altered},expected),/sandbox\/preload\/mode/);});
test('non-null independently expected pins and exact report identities are mandatory',()=>{const {report,expected}=fixture();for(const altered of [{coreSha:null},{demoSha:undefined},{coreSha:'main'}])assert.throws(()=>validateActualReport(report,{...expected,...altered}),/non-null exact Core\/Demo/);for(const altered of [{coreSha:'d'.repeat(40)},{demoSha:null}])assert.throws(()=>validateActualReport({...report,...altered},expected),/actual application identity/);});
test('stale, pre-start, future and invalid timestamps reject specifically',()=>{const {report,expected}=fixture();for(const generatedAt of [new Date(expected.now-3600001).toISOString(),new Date(expected.now-2000).toISOString(),new Date(expected.now+1001).toISOString(),'invalid'])assert.throws(()=>validateActualReport({...report,generatedAt},expected),/stale actual application/);assert.throws(()=>validateActualReport(report,{...expected,startedAt:null}),/stale actual application/);});
test('wrong, missing, extra and unbound actual source hashes reject specifically',()=>{const {report,expected}=fixture();assert.throws(()=>validateActualReport({...report,sources:{...report.sources,[sourcePaths[0]]:'d'.repeat(64)}},expected),/source hash mismatch/);const missing={...report.sources};delete missing[sourcePaths[0]];for(const sources of [missing,{...report.sources,unrecognized:'e'.repeat(64)},null])assert.throws(()=>validateActualReport({...report,sources},expected),/exact source identity set/);assert.throws(()=>validateActualReport(report,{...expected,sourceHashes:{...expected.sourceHashes,[sourcePaths[0]]:'unbound'}}),/source hash mismatch/);});
test('exact helper runtime and prerequisite provisioning identity cannot be substituted',()=>{const {report,expected}=fixture();for(const alteration of [{helperSha256:'0'.repeat(64)},{executable:'/tmp/electron'},{helperMode:0o755}])assert.throws(()=>validateActualReport({...report,runtimeIdentity:{...report.runtimeIdentity,...alteration}},expected),/official sandbox helper\/runtime/);for(const alteration of [{applicationUid:2000},{helperSha256:'0'.repeat(64)},{zipSha256:'0'.repeat(64)}])assert.throws(()=>validateActualReport(report,{...expected,provisioning:{...expected.provisioning,...alteration}}),/provisioning binding/);});
test('both Demo workflows require mode and real gate consumes app proof; missing hosted mode exits before gates',()=>{const root=path.resolve(__dirname,'..');for(const name of ['xtend-default-gates.yml','xtend-nightly-build.yml'])assert.match(fs.readFileSync(path.join(root,'.github/workflows',name),'utf8'),/REQUIRED_CI_ATTESTATION: '1'/);const source=fs.readFileSync(path.join(root,'scripts/run-product-gates.cjs'),'utf8');assert.ok(source.includes("execute('electron-actual-app-attestation'"));assert.ok(source.includes('attestationStartedAt'));const environment={...process.env,GITHUB_ACTIONS:'true'};delete environment.REQUIRED_CI_ATTESTATION;const p=spawnSync(process.execPath,['scripts/run-product-gates.cjs'],{cwd:root,env:environment,encoding:'utf8'});assert.equal(p.status,1);assert.match(p.stderr,/explicit REQUIRED_CI_ATTESTATION=1/);});

test('actual consumer rejects obsolete runtime location despite consistent provisioning substitution',()=>{
 const f=fixture(),old=f.report.runtimeIdentity.executable.replace('/usr/lib/xtend-electron','/opt/xtend-electron');f.report.runtimeIdentity.executable=old;f.report.runtimeIdentity.helper=f.report.runtimeIdentity.helper.replace('/usr/lib/xtend-electron','/opt/xtend-electron');f.expected.provisioning.dist=f.expected.provisioning.dist.replace('/usr/lib/xtend-electron','/opt/xtend-electron');assert.throws(()=>validateActualReport(f.report,f.expected),/official sandbox helper\/runtime identity mismatch/);
});

const {emitActualAppOutcome}=require('../scripts/actual-app-outcome-annotation.cjs');
test('actual-app annotation fixed presence and verification grammar',()=>{
 for(const [reportPresent,verified,expected] of [[true,true,'::notice::electron-actual-app-attestation report=present verification=passed\n'],[true,false,'::error::electron-actual-app-attestation report=present verification=failed\n'],[false,false,'::error::electron-actual-app-attestation report=missing verification=failed\n']]){
  let output='';emitActualAppOutcome({reportPresent,verified},line=>{output+=line;});assert.equal(output,expected);
 }
});
test('actual-app annotation ignores malicious raw fields and rejects nonboolean injection without leakage',()=>{
 const malicious='SECRET\n::error::injected%0A::set-output name=token::SECRET';
 let output='';emitActualAppOutcome({reportPresent:false,verified:false,stderr:malicious,stdout:malicious,path:malicious,environment:{TOKEN:malicious}},line=>{output+=line;});
 assert.equal(output,'::error::electron-actual-app-attestation report=missing verification=failed\n');assert.doesNotMatch(output,/SECRET|injected|set-output|TOKEN/);
 for(const altered of [{reportPresent:malicious,verified:false},{reportPresent:true,verified:malicious},{reportPresent:false,verified:true}]){
  assert.throws(()=>emitActualAppOutcome(altered,line=>{output+=line;}),error=>error.message==='Invalid fixed actual-app outcome');
 }
 assert.equal(output,'::error::electron-actual-app-attestation report=missing verification=failed\n');
});
test('actual-app outcome annotation is after retained verification and does not replace failure reporting',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../scripts/run-product-gates.cjs'),'utf8');
 const annotation=source.indexOf("if(id==='electron-actual-app-attestation')emitActualAppOutcome");
 assert.ok(annotation>source.indexOf("catch(error){record.status='failed';record.failures.push(error.message);}"));
 assert.ok(annotation<source.indexOf("commands.push(record);return record.status==='passed';"));
 assert.ok(source.includes("for(const record of commands)saveReport(record);"));
});

test('throwing annotation writer leaves actual execute record and saveReport flow unchanged',()=>{
 const vm=require('node:vm'),source=fs.readFileSync(path.resolve(__dirname,'../scripts/run-product-gates.cjs'),'utf8');
 const save=source.slice(source.indexOf('function saveReport('),source.indexOf('function execute('));
 const execute=source.slice(source.indexOf('function execute('),source.indexOf(" execute('migration-runner-contracts'"));
 function flow(throwing,defaultWriter=false){
  const commands=[],writes=new Map(),environment={XTEND_CORE_SHA:'a'.repeat(40),XTEND_DEMO_SHA:'b'.repeat(40)};
  const sandbox={root:'/controlled',path,commands,process:{env:environment},Date,JSON,Buffer,
   spawnSync:()=>({status:1,stdout:'',stderr:'controlled retained error'}),
   evaluateResult:()=>({status:'failed',skips:[],failures:['retained failure'],sources:[]}),
   fs:{existsSync:()=>false,mkdirSync:()=>{},writeFileSync:(file,bytes)=>writes.set(file,bytes)},
   emitActualAppOutcome:input=>defaultWriter?emitActualAppOutcome(input):emitActualAppOutcome(input,()=>{if(throwing){const error=Error('EPIPE');error.code='EPIPE';throw error;}})};
  const api=vm.runInNewContext(save+execute+';({execute,saveReport});',sandbox);
  assert.equal(api.execute('electron-actual-app-attestation',['controlled-command']),false);
  for(const record of commands)api.saveReport(record);
  return {records:JSON.parse(JSON.stringify(commands)),writes:[...writes]};
 }
 const originalWriteSync=fs.writeSync,calls=[];
 try {
  fs.writeSync=(fd,line)=>{calls.push({fd,line});const error=Error('EPIPE');error.code='EPIPE';throw error;};
  assert.deepEqual(flow(false,true),flow(false));
  assert.deepEqual(calls,[{fd:2,line:'::error::electron-actual-app-attestation report=missing verification=failed\n'}]);
  assert.throws(()=>emitActualAppOutcome({reportPresent:'injected',verified:false}),/Invalid fixed actual-app outcome/);
  assert.equal(calls.length,1);
 } finally {fs.writeSync=originalWriteSync;}
 assert.deepEqual(flow(true),flow(false));
 const result=flow(true);assert.equal(result.records[0].status,'failed');assert.equal(result.records[0].exitCode,1);
 assert.ok(result.writes.some(([file,bytes])=>file.endsWith('/suites/electron-actual-app-attestation.json')&&JSON.parse(bytes).status==='failed'));
 let called=false;assert.throws(()=>emitActualAppOutcome({reportPresent:'injected',verified:false},()=>{called=true;throw Error('EPIPE');}),/Invalid fixed actual-app outcome/);assert.equal(called,false);
});


test('captured actual child launch annotations pass only exact owned grammar and preserve runner records/reports',()=>{
 const {relayLaunchStages,stages}=require('../products/xtend-llm/scripts/actual-launch-diagnostics.cjs');
 const {evaluateResult}=require('../scripts/product-result-evidence.cjs'),vm=require('node:vm'),os=require('node:os');
 const source=fs.readFileSync(path.resolve(__dirname,'../scripts/run-product-gates.cjs'),'utf8');
 const save=source.slice(source.indexOf(' function saveReport'),source.indexOf(' function execute'));
 const execute=source.slice(source.indexOf(' function execute'),source.indexOf("\n execute('migration-runner-contracts'"));
 assert.match(execute,/if\(id==='electron-runtime'\)relayLaunchStages\(result.stderr\);/);
 const valid=stages.flatMap(stage=>[0,1].map(code=>`::${code?'error':'notice'}::electron-actual-launch stage=${stage} code=${code}`));
 const malicious=['PRIVATE-STDERR','::error::electron-actual-launch stage=launch-extra code=1','::error::electron-actual-launch stage=foreign code=1',
  '::error::electron-actual-launch stage=launch code=1 suffix=PRIVATE','prefix::error::electron-actual-launch stage=launch code=1',
  '::notice::electron-actual-launch stage=launch code=1','::error::electron-actual-launch stage=launch code=0',
  '::error::electron-actual-launch stage=launch code=2','::error::electron-actual-launch stage=launch code=01',
  '::error::electron-actual-launch stage=launch code=1\r', '::error::electron-actual-launch stage=launch\n code=1',
  '::error::electron-actual-launch stage=launch code=1\r::error::PRIVATE'];
 const childSource='process.stdout.write('+JSON.stringify('::error::electron-actual-launch stage=server code=1\nPRIVATE-STDOUT\n')+');process.stderr.write('+JSON.stringify([...valid,...malicious].join('\n')+'\n')+');process.exit(7);';
 const child=[process.execPath,'-e',childSource];
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'xtend-launch-relay-')),commands=[],writes=new Map();
 try {
  function flow(relay,body=execute,id='electron-runtime') {
   commands.length=0;writes.clear();
   const localFs={...fs,writeFileSync:(file,bytes)=>{writes.set(file,bytes);}};
   const context={root,path,fs:localFs,commands,process:{env:{XTEND_CORE_SHA:'a'.repeat(40),XTEND_DEMO_SHA:'b'.repeat(40)}},Date,JSON,Buffer,spawnSync,evaluateResult,relayLaunchStages:relay,emitActualAppOutcome};
   const api=vm.runInNewContext(save+body+';({execute,saveReport})',context);
   assert.equal(api.execute(id,child),false);for(const record of commands)api.saveReport(record);
   return {commands:JSON.parse(JSON.stringify(commands)),writes:[...writes]};
  }
  const lines=[],actual=flow(stderr=>relayLaunchStages(stderr,line=>lines.push(line)));
  assert.deepEqual(lines,valid.map(line=>line+'\n'));
  const before=flow(()=>{},execute.replace("  if(id==='electron-runtime')relayLaunchStages(result.stderr);\n",''));
  assert.deepEqual(actual,before);
  assert.equal(actual.commands[0].exitCode,7);assert.equal(actual.commands[0].status,'failed');
  const retainedLog=actual.writes.find(([file])=>file.endsWith('/electron-runtime.log'))[1];
  assert.ok(retainedLog.includes('PRIVATE-STDERR'));assert.ok(retainedLog.includes('PRIVATE-STDOUT'));
  const retainedReport=JSON.parse(actual.writes.find(([file])=>file.endsWith('/suites/electron-runtime.json'))[1]);
  assert.equal(retainedReport.exitCode,7);assert.equal(retainedReport.status,'failed');
  const transportFailed=flow(stderr=>relayLaunchStages(stderr,()=>{throw Object.assign(Error('PRIVATE'),{code:'EPIPE'});}));
  assert.deepEqual(transportFailed,before);
  const unrelated=[];flow(stderr=>relayLaunchStages(stderr,line=>unrelated.push(line)),execute,'unrelated');assert.deepEqual(unrelated,[]);
 } finally {fs.rmSync(root,{recursive:true,force:true});}
});

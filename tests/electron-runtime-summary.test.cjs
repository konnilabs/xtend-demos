'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {buildRuntimeSummary,emitRuntimeSummary}=require('../scripts/electron-runtime-summary.cjs');
const {stages,relayLaunchStages}=require('../products/xtend-llm/scripts/actual-launch-diagnostics.cjs');
const {evaluateResult}=require('../scripts/product-result-evidence.cjs');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const source=fs.readFileSync(path.join(__dirname,'../scripts/run-product-gates.cjs'),'utf8');
const body=source.slice(source.indexOf(' function saveReport'),source.indexOf("\n execute('migration-runner-contracts'"));
const original=fs.readFileSync(path.join(__dirname,'fixtures/electron-summary-original-execute.txt'),'utf8');
const cap=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/github-runner-annotation-cap.json')));
function mask(...names){return stages.map(s=>names.includes(s)?'1':'0').join('');}
function sink(){
 // Controlled JS MODEL of pinned official nonembedded AddIssue, NOT hosted proof.
 const limit=Number(/_maxCountPerIssueType = (\d+)/.exec(cap.excerpt)[1]);
 const retained=[],logged=[],counts={notice:0,warning:0,error:0};
 return {retained,logged,write(line){const m=/^::(notice|warning|error)::([^\n]*)\n$/.exec(line);if(!m)return;const message=m[2].slice(0,4096);if(counts[m[1]]<limit){counts[m[1]]++;retained.push({type:m[1],message});}logged.push({type:m[1],message});}};
}
function flow(root,args,{proposal=true,broken=false,spawn=spawnSync,id='electron-runtime',reports=[],env=process.env}={}){
 const commands=[],lines=[],writes=[],results=[];
 const localFs={...fs,writeFileSync:(file,bytes)=>{writes.push([path.relative(root,file),String(bytes)]);},writeSync:(_fd,line)=>{if(broken)throw Error('CONTROLLED-EPIPE');lines.push(line);}};
 const capture=(...input)=>{const r=spawn(...input);results.push(r);return r;};
 const context={root,path,fs:localFs,commands,process:{env},Date,JSON,Buffer,spawnSync:capture,evaluateResult,
  emitActualAppOutcome:()=>{},relayLaunchStages:s=>relayLaunchStages(s,line=>localFs.writeSync(2,line)),
  emitRuntimeSummary:(r,t)=>emitRuntimeSummary(r,t,line=>localFs.writeSync(2,line))};
 const api=vm.runInNewContext((proposal?body:original)+';({execute,saveReport})',context);
 const ok=api.execute(id,args,root,reports,env);commands.forEach(api.saveReport);
 return {ok,commands:JSON.parse(JSON.stringify(commands)),writes,lines,results};
}
function stable(r){return {ok:r.ok,commands:r.commands,writes:r.writes,results:r.results.map(x=>({status:x.status,signal:x.signal,stdout:x.stdout,stderr:x.stderr,error:x.error?.message}))};}
function child(stdout,stderr,status=7){return [process.execPath,'-e',`process.stdout.write(${JSON.stringify(stdout)});process.stderr.write(${JSON.stringify(stderr)});process.exit(${status});`];}
test('baseline and runner cap model are exact source-bound fixtures; automatic wiring retained',()=>{
 assert.equal(sha(original),'e2004f993d269252e9e4507482a47e2bc88c71bfeddb6e311e1974df2e6f6d9f');
 assert.equal(cap.sourceCommit,'67f01c276e0a91d967ba499ce4cdc9a95efa0262');assert.equal(sha(cap.excerpt),'6ac38955a97b91da42373795af95caf71633eb194df713aacad031d9340d8033');
 for(const value of ['case IssueType.Error:','case IssueType.Warning:','case IssueType.Notice:','previousCountForIssueType < _maxCountPerIssueType','_record.Issues.Add(issue);'])assert.ok(cap.excerpt.includes(value));
 assert.equal(stages.length,15);assert.ok(source.includes("'tests/electron-runtime-summary.test.cjs'"));
 for(const name of ['electron-app-attestation','runtime-preparation-diagnostics','startup-error-classifier','migration/result-evidence','migration/runtime-probes','migration/fpm-runtime','migration/shop-host-workflow','migration/candidate-closure','migration/shop-generated-discovery','migration/material-product-runtime'])assert.ok(source.includes(`'tests/${name}.test.cjs'`));
 const model=sink();for(const type of ['notice','warning','error'])for(let i=0;i<17;i++)model.write(`::${type}::controlled ${i}\n`);
 assert.equal(model.retained.length,30);assert.equal(model.logged.length,51);
 console.log(JSON.stringify({proof:'controlled-JS-model-of-pinned-official-runner-NOT-hosted-proof',sourceCommit:cap.sourceCommit,sourceSha256:cap.sourceSha256,excerptSha256:cap.excerptSha256,input:51,retained:30,perType:10}));
});
test('real child over10 markers and repeats retain all observed masks in one bounded summary',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'xtend-summary-real-'));
 try{
  const entries=stages.map(s=>`::notice::electron-actual-launch stage=${s} code=0\n`).join('');
  const errors='::error::electron-actual-launch stage=preload-ipc code=1\n'.repeat(30);
  const args=child(entries.repeat(4),errors);
  const old=flow(root,args,{proposal:false}),now=flow(root,args);assert.deepEqual(stable(now),stable(old));assert.equal(now.lines.length,1);
  const s=buildRuntimeSummary(now.results[0]);assert.equal(s.stdout.entry,'1'.repeat(15));assert.equal(s.stderr.error,mask('preload-ipc'));assert.equal(s.markers,'both');assert.equal(s.command,'child-failed');assert.equal(s.exit,'7');
  const oldSink=sink(),newSink=sink();old.lines.forEach(x=>oldSink.write(x));now.lines.forEach(x=>newSink.write(x));
  assert.equal(oldSink.retained.filter(x=>x.type==='notice').length,10);assert.ok(oldSink.logged.length>10);assert.equal(newSink.retained.length,1);assert.ok(newSink.retained[0].message.includes('stdout_entry=111111111111111'));assert.ok(now.lines[0].length<1024);
  const broken=flow(root,args,{broken:true});assert.deepEqual(stable(broken),stable(old));assert.deepEqual(broken.lines,[]);
  console.log(JSON.stringify({proof:'real-nonprivileged-child-plus-controlled-runner-cap-MODEL',node:process.versions.node,childNoticeMarkers:60,childErrorMarkers:30,oldInput:old.lines.length,oldRetained:oldSink.retained.length,newInput:now.lines.length,newRetained:newSink.retained.length,summary:now.lines[0].trim(),stdoutSha256:sha(now.results[0].stdout),stderrSha256:sha(now.results[0].stderr),logsRecordsExitsEqual:true,hostedProof:false,appExecuted:false}));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('real nested npm/redirection invocation includes repeated, malicious and split-stream controls',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'xtend-summary-nested-'));
 try{
  const valid='::notice::electron-actual-launch stage=window code=0\n'.repeat(21)+'::error::electron-actual-launch stage=renderer-check code=1\n';
  const bad='PRIVATE\n::error::electron-actual-launch stage=foreign code=1\n::notice::electron-actual-launch stage=window code=1\n::error::electron-actual-launch stage=window code=01\n::error::electron-actual-launch stage=window code=1 suffix=SECRET\n';
  fs.writeFileSync(path.join(root,'emit.cjs'),`process.stdout.write('PRIVATE-OUT\\n');process.stderr.write(${JSON.stringify(valid+bad)});process.exit(7);`);
  fs.writeFileSync(path.join(root,'redirect.sh'),'#!/bin/sh\n"$@" 2>&1\n');
  fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({name:'controlled-summary-nested',scripts:{outer:'sh ./redirect.sh npm run inner',inner:'node emit.cjs'}}));
  const env={...process.env,PATH:path.dirname(process.execPath)+path.delimiter+process.env.PATH,npm_config_offline:'true',npm_config_update_notifier:'false',npm_config_audit:'false'};
  try{
   const args=['npm','run','outer'],old=flow(root,args,{proposal:false,env}),now=flow(root,args,{env});assert.deepEqual(stable(now),stable(old));assert.equal(now.lines.length,1);assert.equal(now.results[0].status,7);assert.equal(now.results[0].stderr,'');
   const summary=buildRuntimeSummary(now.results[0]);assert.equal(summary.markers,'stdout');assert.equal(summary.stdout.entry,mask('window'));assert.equal(summary.stdout.error,mask('renderer-check'));assert.ok(!now.lines[0].includes('PRIVATE'));assert.ok(!now.lines[0].includes('SECRET'));
   console.log(JSON.stringify({proof:'real-nested-npm-redirection-NOT-Electron',node:process.versions.node,summary:now.lines[0].trim(),stdoutSha256:sha(now.results[0].stdout),stderrSha256:sha(now.results[0].stderr),recordLogEquality:true,appExecuted:false}));
  }finally{/* No inherited environment mutation or registry access. */}
  const out='::notice::electron-actual-launch stage=load code=0\nPRIVATE-OUT\n::error::electron-actual-launch stage=';
  const err='window code=1\n::error::electron-actual-launch stage=window code=1 suffix=PRIVATE\n::notice::electron-actual-launch stage=server code=0\n';
  const now=flow(root,child(out,err));assert.equal(now.lines.length,1);const s=buildRuntimeSummary(now.results[0]);assert.equal(s.stdout.entry,mask('load'));assert.equal(s.stderr.entry,mask('server'));assert.equal(s.stdout.error,'0'.repeat(15));assert.equal(s.stderr.error,'0'.repeat(15));
  assert.deepEqual(stable(now),stable(flow(root,child(out,err),{proposal:false})));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('absent markers, explicit failures, success and process signal report outer result independently',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'xtend-summary-result-'));
 try{
  for(const status of [0,7]){
   const now=flow(root,child('PRIVATE\n','PRIVATE\n',status)),old=flow(root,child('PRIVATE\n','PRIVATE\n',status),{proposal:false});assert.deepEqual(stable(now),stable(old));assert.equal(now.lines.length,1);assert.match(now.lines[0],/markers=none/);assert.match(now.lines[0],new RegExp(`command=${status?'child-failed':'completed'} exit=${status}`));
  }
  const conflict=flow(root,child('', '::error::electron-actual-launch stage=server code=1\n',0));assert.match(conflict.lines[0],/command=completed exit=0/);assert.equal(buildRuntimeSummary(conflict.results[0]).stderr.error,mask('server'));assert.equal(conflict.commands[0].status,'passed'); // No acceptance change from diagnostic marker.
  const missing=flow(root,[path.join(root,'controlled-missing')]);assert.equal(missing.lines.length,1);assert.match(missing.lines[0],/command=spawn-error exit=none/);assert.equal(missing.commands[0].status,'failed');
  const signaled=flow(root,[process.execPath,'-e',"process.kill(process.pid,'SIGTERM')"]);assert.match(signaled.lines[0],/command=child-failed exit=none signal=SIGTERM markers=none/);
  const explicit=flow(root,child('', '::error::electron-actual-launch stage=window code=1\n',9));assert.equal(explicit.commands[0].exitCode,9);assert.equal(buildRuntimeSummary(explicit.results[0]).stderr.error,mask('window'));
  assert.equal(flow(root,child('',''),{id:'unrelated'}).lines.length,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('summary transport preserves exact thrown identities and error objects; no uncontrolled fields',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'xtend-summary-throw-'));
 try{
  for(const broken of [false,true]){
   const error=Object.assign(Error('PRIVATE-THROWN'),{code:'SECRET'});assert.throws(()=>flow(root,[],{broken,spawn:()=>{throw error;}}),e=>e===error);
  }
  const result={status:null,signal:'PRIVATE\n::error::INJECTION',error:Object.assign(Error('PRIVATE'),{code:'SECRET'}),stdout:'',stderr:'PRIVATE'};const before=JSON.stringify(result),lines=[];emitRuntimeSummary(result,false,line=>lines.push(line));assert.equal(JSON.stringify(result),before);assert.equal(lines.length,1);assert.match(lines[0],/signal=other markers=none/);assert.ok(!lines[0].includes('PRIVATE'));assert.ok(!lines[0].includes('SECRET'));
  assert.doesNotThrow(()=>emitRuntimeSummary(result,false,()=>{throw Error('EPIPE');}));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('source-order prefix fills modeled notice cap before window; summaries never replace required receipts',()=>{
 // Literal sequence preserves original documented producer order; not hosted chronology.
 const sequence=['build','prelaunch-guard','launch-resolve','prelaunch-guard','launch','prelaunch-guard','main-start','app-ready','server','window','load','preload-ipc','renderer-check','runtime-identity','source-identity','report-write'];
 const model=sink();model.write('::notice::electron-runtime-command phase=start code=0 reason=attempt\n');
 for(const stage of sequence)model.write(`::notice::electron-actual-launch stage=${stage} code=0\n`);
 assert.equal(model.logged.length,17);assert.equal(model.retained.length,10);assert.ok(model.retained.some(x=>x.message==='electron-actual-launch stage=server code=0'));assert.ok(!model.retained.some(x=>x.message.includes('stage=window ')));
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'xtend-summary-receipt-'));
 try{
  const reports=[path.join(root,'required-actual-report.json')],args=child('',sequence.map(s=>`::notice::electron-actual-launch stage=${s} code=0\n`).join(''),0);
  const now=flow(root,args,{reports}),old=flow(root,args,{reports,proposal:false});assert.deepEqual(stable(now),stable(old));assert.equal(now.lines.length,1);assert.match(now.lines[0],/command=completed exit=0/);assert.equal(now.commands[0].status,'failed');assert.ok(now.commands[0].failures[0].includes('Missing required runtime report'));
  console.log(JSON.stringify({proof:'source-order-prefix-plus-controlled-pinned-runner-MODEL',inputNoticeCount:17,retainedNoticeCount:10,lastRetainedNotice:model.retained.at(-1).message,missingWindowIsNotControlFlowProof:true,completedChildMissingReportStillFails:true,hostedProof:false}));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('format=1 freezes the exact ordered fifteen-name bit contract',()=>{
 const expected=['prelaunch-guard','build','launch-resolve','launch','module-load','main-start','app-ready','server','window','load','preload-ipc','renderer-check','runtime-identity','source-identity','report-write'];
 const {format1Stages}=require('../scripts/electron-runtime-summary.cjs');
 assert.ok(Object.isFrozen(format1Stages));assert.deepEqual(format1Stages,expected);
 expected.forEach((stage,index)=>{
  const bits='0'.repeat(index)+'1'+'0'.repeat(14-index);
  const s=buildRuntimeSummary({status:0,stdout:`::notice::electron-actual-launch stage=${stage} code=0\n`,stderr:`::error::electron-actual-launch stage=${stage} code=1\n`});
  assert.equal(s.stdout.entry,bits);assert.equal(s.stderr.error,bits);assert.equal(s.stdout.error,'0'.repeat(15));assert.equal(s.stderr.entry,'0'.repeat(15));
 });
});
test('format=1 rejects reordered, removed, added, duplicate and renamed producer stages before parsing',()=>{
 const helper=fs.readFileSync(path.join(__dirname,'../scripts/electron-runtime-summary.cjs'),'utf8');
 const variants=[[stages[1],stages[0],...stages.slice(2)],stages.slice(1),[...stages,'foreign'],[stages[1],...stages.slice(1)],['renamed',...stages.slice(1)]];
 for(const changed of variants){
  let parsed=0,written=0;const module={exports:{}};
  vm.runInNewContext(helper,{module,require:id=>id==='node:fs'?fs:{stages:changed,relayLaunchStages:()=>{parsed++;}}});
  const result={status:7,stdout:'private',stderr:'private',error:new Error('original')};
  assert.throws(()=>module.exports.buildRuntimeSummary(result),/Invalid format=1 producer stage mapping/);
  module.exports.emitRuntimeSummary(result,false,()=>{written++;});
  assert.equal(parsed,0);assert.equal(written,0);assert.equal(result.status,7);assert.equal(result.error.message,'original');
 }
});

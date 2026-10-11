'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const runnerSource=fs.readFileSync(path.join(__dirname,'../scripts/run-product-gates.cjs'),'utf8');
const definitions=runnerSource.slice(runnerSource.indexOf('  const labels='),runnerSource.indexOf('  function commandAnnotation'));
const {labels,classifyStartup,emitStartupFailure}=vm.runInNewContext(definitions+';({labels,classifyStartup,emitStartupFailure})',{fs});
test('actual child missing module is classified without emitting module or source',()=>{
 const r=spawnSync(process.execPath,['-e',"require('xtend-controlled-startup-module-missing')"],{encoding:'utf8'});assert.equal(r.status,1);assert.equal(classifyStartup(r,'node'),'module-resolution');
 const lines=[];emitStartupFailure(classifyStartup(r,'node'),line=>lines.push(line));assert.deepEqual(lines,['::error::electron-runtime-startup failure=module-resolution code=1\n']);assert.ok(!lines[0].includes('xtend-controlled'));
});
test('real missing executable stays an error and only exact known outer command matches',()=>{
 const r=spawnSync('/xtend-controlled-nonexistent-command',[],{encoding:'utf8'});assert.equal(r.error.code,'ENOENT');assert.equal(classifyStartup(r,'xvfb-run'),'unclassified');
 const original={status:null,error:{code:'ENOENT',path:'xvfb-run'},stderr:''};assert.equal(classifyStartup(original,'xvfb-run'),'display-command-missing');assert.equal(original.error.code,'ENOENT');
});
test('recognized module/command/preflight grammar and ambiguous errors use fixed labels',()=>{
 for(const [stderr,want] of [["Error [ERR_MODULE_NOT_FOUND]: PRIVATE\n  code: 'ERR_MODULE_NOT_FOUND'\n",'module-resolution'],['/bin/sh: 1: npm: not found','npm-command-missing'],['sh: 2: node: not found','node-command-missing'],['Error: XTend Electron requires unprivileged execution; root is rejected','sandbox-preflight-rejected'],["Error: Cannot find module 'PRIVATE'\n code: 'MODULE_NOT_FOUND',\n/bin/sh: 1: npm: not found",'ambiguous']])assert.equal(classifyStartup({status:1,stderr},'xvfb-run'),want);
});
test('foreign/suffixed codes and malicious newlines never become raw annotation output',()=>{
 for(const stderr of ["Error: Cannot find module 'SECRET'\n code: 'MODULE_NOT_FOUND-extra',",'Error: Invalid REQUIRED_CI_ATTESTATION mode SECRET','/bin/sh: 1: npm: not found SECRET','::error::SECRET\nPRIVATE',"Error [ERR_MODULE_NOT_FOUND-extra]: PRIVATE\n code: 'ERR_MODULE_NOT_FOUND',"]){const label=classifyStartup({status:1,stderr},'xvfb-run');assert.equal(label,'unclassified');const lines=[];emitStartupFailure(label,line=>lines.push(line));assert.deepEqual(lines,['::error::electron-runtime-startup failure=unclassified code=1\n']);}
 for(const label of ['module-resolution-extra','SECRET\n::error::SECRET',null,1])assert.throws(()=>emitStartupFailure(label,()=>assert.fail('invalid input reached writer')));
});
test('success is quiet; classification and broken transport preserve actual result bytes/status',()=>{
 const r={status:1,stdout:'ORIGINAL',stderr:'PRIVATE\n::error::INJECTION'},before=JSON.stringify(r);assert.equal(classifyStartup({status:0,stderr:r.stderr},'xvfb-run'),null);
 emitStartupFailure(classifyStartup(r,'xvfb-run'),()=>{throw Object.assign(Error('PRIVATE'),{code:'EPIPE'});});assert.equal(JSON.stringify(r),before);
 for(const label of labels)assert.doesNotThrow(()=>emitStartupFailure(label,()=>{throw Error('transport');}));
});

test('actual outer runner preserves child exit, log and saved report with startup classification',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),os=require('node:os');
 const {evaluateResult}=require('../scripts/product-result-evidence.cjs');
 const source=fs.readFileSync(path.join(__dirname,'../scripts/run-product-gates.cjs'),'utf8');
 const save=source.slice(source.indexOf(' function saveReport'),source.indexOf(' function execute'));
 const body=source.slice(source.indexOf(' function execute'),source.indexOf("\n execute('migration-runner-contracts'"));
 const before=body.replace("  if(id==='electron-runtime') { const label=classifyStartup(result,args[0]);if(label&&label!=='unclassified')emitStartupFailure(label); }\n",'');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'xtend-startup-classifier-'));
 try {
  const result=spawnSync(process.execPath,['-e',"require('xtend-controlled-startup-module-missing')"],{encoding:'utf8'});assert.equal(result.status,1);
  function flow(code){
   const commands=[],lines=[],localFs=Object.create(fs);localFs.writeSync=(_fd,line)=>{lines.push(line);return line.length;};
   const api=vm.runInNewContext(save+code+';({execute,saveReport})',{root,path,fs:localFs,commands,process:{env:{}},Date,JSON,Buffer,spawnSync:()=>result,evaluateResult,relayLaunchStages:()=>{},emitActualAppOutcome:()=>{},classifyStartup,emitStartupFailure:label=>emitStartupFailure(label,line=>lines.push(line))});
   assert.equal(api.execute('electron-runtime',['xvfb-run','-a','npm','run','test:electron:node24:product']),false);commands.forEach(api.saveReport);
   return {records:JSON.stringify(commands),log:fs.readFileSync(path.join(root,'.xtend-test-results/electron-runtime.log'),'utf8'),report:fs.readFileSync(path.join(root,'.xtend-test-results/suites/electron-runtime.json'),'utf8'),lines};
  }
  const a=flow(before),b=flow(body);for(const key of ['records','log','report'])assert.equal(b[key],a[key]);assert.deepEqual(b.lines,a.lines.concat('::error::electron-runtime-startup failure=module-resolution code=1\n'));assert.equal(result.status,1);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('classification reads complete patterns per stream, preserves ambiguity and rejects cross-stream assembly',()=>{
 const module="Error: Cannot find module 'PRIVATE'\n code: 'MODULE_NOT_FOUND',\n";
 assert.equal(classifyStartup({status:1,stdout:module,stderr:''},'xvfb-run'),'module-resolution');
 assert.equal(classifyStartup({status:1,stdout:module,stderr:'/bin/sh: 1: npm: not found'},'xvfb-run'),'ambiguous');
 assert.equal(classifyStartup({status:1,stdout:module,stderr:module},'xvfb-run'),'module-resolution');
 assert.equal(classifyStartup({status:1,stdout:"Error: Cannot find module 'PRIVATE'\n",stderr:" code: 'MODULE_NOT_FOUND',\n"},'xvfb-run'),'unclassified');
 assert.equal(classifyStartup({status:0,stdout:module,stderr:module},'xvfb-run'),null);
});

test('real redirected and nested npm children preserve streams/records/reports while closing captured stdout gap',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),os=require('node:os'),crypto=require('node:crypto');
 const {evaluateResult}=require('../scripts/product-result-evidence.cjs');
 const {relayLaunchStages}=require('../products/xtend-llm/scripts/actual-launch-diagnostics.cjs');
 const source=fs.readFileSync(path.join(__dirname,'../scripts/run-product-gates.cjs'),'utf8');
 const save=source.slice(source.indexOf(' function saveReport'),source.indexOf(' function execute'));
 const body=source.slice(source.indexOf(' function execute'),source.indexOf("\n execute('migration-runner-contracts'"));
 const before=body.replace("for(const captured of [result.stdout,result.stderr])relayLaunchStages(captured)","relayLaunchStages(result.stderr)")
  .replace("   for(const captured of [result.stdout,result.stderr]) {\n   const stderr=typeof captured==='string'?captured:'';","   const stderr=typeof result.stderr==='string'?result.stderr:'';")
  .replace("   }\n   return matches.size", "   return matches.size");
 assert.notEqual(before,body);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'xtend-dual-stream-'));
 const env={...process.env,PATH:path.dirname(process.execPath)+path.delimiter+process.env.PATH};
 const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
 try {
  const wrapper=path.join(root,'redirect.sh');fs.writeFileSync(wrapper,'#!/bin/sh\n"$@" 2>&1\n');
  const valid='::notice::electron-actual-launch stage=build code=0\n::error::electron-actual-launch stage=launch code=1\n';
  const malicious='PRIVATE\n::error::electron-actual-launch stage=foreign code=1\n::error::electron-actual-launch stage=launch code=1 suffix=SECRET\n::notice::electron-actual-launch stage=launch code=1\n::error::PRIVATE\n';
  fs.writeFileSync(path.join(root,'emit.cjs'),`process.stdout.write('PRIVATE-OUT\\n');process.stderr.write(${JSON.stringify(valid+malicious)});require('xtend-controlled-nested-startup-missing');`);
  fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({name:'controlled-stream-boundary',version:'1.0.0',scripts:{outer:'sh ./redirect.sh npm run inner',inner:'node emit.cjs'}}));
  const captured=[];
  function flow(execute,args,broken=false) {
   const commands=[],lines=[];let result;
   const localFs=Object.create(fs);localFs.writeSync=(_fd,line)=>{if(broken)throw Object.assign(Error('PRIVATE'),{code:'EPIPE'});lines.push(line);return line.length;};
   const api=vm.runInNewContext(save+execute+';({execute,saveReport})',{root,path,fs:localFs,commands,process:{env},Date,JSON,Buffer,
    spawnSync:(...input)=>{result=spawnSync(...input);captured.push({args:input[0],status:result.status,stdoutSha256:sha(result.stdout||''),stderrSha256:sha(result.stderr||'')});return result;},evaluateResult,
    relayLaunchStages:(output)=>relayLaunchStages(output,line=>localFs.writeSync(2,line)),emitActualAppOutcome:()=>{}});
   const ok=api.execute('electron-runtime',args,root,[],env);commands.forEach(api.saveReport);
   return {ok,records:JSON.stringify(commands),log:fs.readFileSync(path.join(root,'.xtend-test-results/electron-runtime.log'),'utf8'),report:fs.readFileSync(path.join(root,'.xtend-test-results/suites/electron-runtime.json'),'utf8'),lines,result};
  }
  for(const args of [['sh',wrapper,process.execPath,path.join(root,'emit.cjs')],['npm','run','outer']]) {
   const a=flow(before,args),b=flow(body,args);assert.equal(a.result.status,1);assert.equal(b.result.status,1);assert.equal(a.result.stderr,'');assert.equal(b.result.stderr,'');
   for(const key of ['ok','records','log','report'])assert.equal(b[key],a[key]);for(const key of ['stdout','stderr','status','signal'])assert.equal(b.result[key],a.result[key]);
   assert.ok(b.result.stdout.includes('PRIVATE'));assert.ok(b.result.stdout.includes("MODULE_NOT_FOUND"));
   assert.deepEqual(a.lines,['::notice::electron-runtime-command phase=start code=0 reason=attempt\n','::error::electron-runtime-command phase=exit code=1 reason=child-failed\n']);
   assert.deepEqual(b.lines,a.lines.concat(valid.split('\n').filter(Boolean).map(x=>x+'\n'),'::error::electron-runtime-startup failure=module-resolution code=1\n'));
   assert.ok(!b.lines.join('').includes('PRIVATE'));assert.ok(!b.lines.join('').includes('SECRET'));
   const broken=flow(body,args,true);for(const key of ['ok','records','log','report'])assert.equal(broken[key],a[key]);assert.deepEqual(broken.lines,[]);
  }
  for(const status of [0,7]) {
   const args=['sh',wrapper,process.execPath,'-e',`process.stderr.write(${JSON.stringify(malicious)});process.exit(${status});`];
   const a=flow(before,args),b=flow(body,args);assert.equal(b.result.status,status);for(const key of ['ok','records','log','report'])assert.equal(b[key],a[key]);assert.deepEqual(b.lines,a.lines);assert.ok(!b.lines.join('').includes('startup'));
  }
  console.log(JSON.stringify({proof:'nonprivileged-controlled-stream-redirection-only',node:process.versions.node,captured,hostedXvfbBytesVerified:false,appExecuted:false}));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('real split fragments never assemble across streams; malicious lines in either stream stay private',()=>{
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),os=require('node:os');
 const {evaluateResult}=require('../scripts/product-result-evidence.cjs');
 const {relayLaunchStages}=require('../products/xtend-llm/scripts/actual-launch-diagnostics.cjs');
 const source=fs.readFileSync(path.join(__dirname,'../scripts/run-product-gates.cjs'),'utf8');
 const save=source.slice(source.indexOf(' function saveReport'),source.indexOf(' function execute'));
 const body=source.slice(source.indexOf(' function execute'),source.indexOf("\n execute('migration-runner-contracts'"));
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'xtend-split-stream-'));
 try {
  const stdout="::notice::electron-actual-launch stage=build code=0\nPRIVATE-OUT\n::error::electron-actual-launch stage=foreign code=1\nError: Cannot find module 'PRIVATE'\n::error::electron-actual-launch stage=";
  const stderr="launch code=1\n code: 'MODULE_NOT_FOUND',\n::notice::electron-actual-launch stage=launch code=0\nPRIVATE-ERR\n::error::electron-actual-launch stage=launch code=1 suffix=SECRET\n";
  const args=[process.execPath,'-e',`const fs=require('node:fs');fs.writeSync(1,${JSON.stringify(stdout)});fs.writeSync(2,${JSON.stringify(stderr)});process.exit(7);`];
  const lines=[],commands=[],localFs=Object.create(fs);localFs.writeSync=(_fd,line)=>{lines.push(line);return line.length;};let result;
  const api=vm.runInNewContext(save+body+';({execute,saveReport})',{root,path,fs:localFs,commands,process:{env:process.env},Date,JSON,Buffer,spawnSync:(...input)=>{result=spawnSync(...input);return result;},evaluateResult,relayLaunchStages:stream=>relayLaunchStages(stream,line=>lines.push(line)),emitActualAppOutcome:()=>{}});
  assert.equal(api.execute('electron-runtime',args,root),false);commands.forEach(api.saveReport);assert.equal(result.status,7);assert.equal(result.stdout,stdout);assert.equal(result.stderr,stderr);
  assert.deepEqual(lines,['::notice::electron-runtime-command phase=start code=0 reason=attempt\n','::error::electron-runtime-command phase=exit code=1 reason=child-failed\n','::notice::electron-actual-launch stage=build code=0\n','::notice::electron-actual-launch stage=launch code=0\n']);
  const log=fs.readFileSync(path.join(root,'.xtend-test-results/electron-runtime.log'),'utf8');assert.equal(log,`${args.join(' ')}\n${stdout}\n${stderr}\n`);assert.ok(log.includes('PRIVATE-OUT'));assert.ok(log.includes('PRIVATE-ERR'));
  const report=JSON.parse(fs.readFileSync(path.join(root,'.xtend-test-results/suites/electron-runtime.json')));assert.equal(report.exitCode,7);assert.equal(report.status,'failed');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

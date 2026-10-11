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

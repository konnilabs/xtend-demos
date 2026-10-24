'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {evaluateResult}=require('../../scripts/product-result-evidence.cjs');
test('real Node TAP exit zero with a skipped test is required evidence failure',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'no-skip-contract-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'skip.cjs');fs.writeFileSync(file,"require('node:test')('missing browser',{skip:true},()=>{});");
 const env={...process.env};delete env.NODE_TEST_CONTEXT;const result=spawnSync(process.execPath,['--test','--test-reporter=tap',file],{encoding:'utf8',env});assert.equal(result.status,0);const checked=evaluateResult(result);assert.equal(checked.status,'failed');assert.ok(checked.skips.length);
});
test('required runtime JSON reports reject skips, missing files, failures and stale bytes',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'runtime-report-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'report.json'),startedAt=Date.now()-1000;
 assert.equal(evaluateResult({status:0,reports:[file],startedAt}).status,'failed');
 for(const result of [{ok:true,results:[{ok:true,skips:['Chrome unavailable']}]},{ok:false,failures:['runtime failed']},{ok:true,status:'deferred'}]){fs.writeFileSync(file,JSON.stringify(result));assert.equal(evaluateResult({status:0,reports:[file],startedAt}).status,'failed');}
 fs.writeFileSync(file,JSON.stringify({ok:true,results:[{ok:true,skips:[]}]}));assert.equal(evaluateResult({status:0,reports:[file],startedAt}).status,'passed');fs.utimesSync(file,new Date(0),new Date(0));assert.equal(evaluateResult({status:0,reports:[file],startedAt}).status,'failed');
});

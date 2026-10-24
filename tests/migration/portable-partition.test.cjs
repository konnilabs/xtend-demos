'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
async function model({portable=true,fail=false,mandatory='1'}={}) {
 const commands=[],suites=[],writes=new Map(),state={argv:['node','runner',...(portable?['--migration-portable']:[])],execPath:process.execPath,versions:process.versions,env:{GITHUB_ACTIONS:'true',REQUIRED_CI_ATTESTATION:mandatory,XTEND_CORE_SHA:'a'.repeat(40),XTEND_DEMO_SHA:'b'.repeat(40)}};
 const sandbox={__dirname:path.join(root,'scripts'),module:{exports:{}},process:state,console:{log(){}},Buffer,Date,JSON};
 sandbox.require=specifier=>{
  if(specifier==='node:fs')return {...fs,mkdirSync(){},writeFileSync(file,bytes){writes.set(file,bytes);}};
  if(specifier==='node:child_process')return {spawnSync(command,args){commands.push([command,...args]);return {status:0,stdout:'',stderr:''};}};
  if(specifier==='./product-result-evidence.cjs')return {evaluateResult:()=>({status:fail?'failed':'passed',skips:[],failures:fail?['controlled failure']:[],sources:[]})};
  if(specifier==='./actual-app-outcome-annotation.cjs')return {emitActualAppOutcome(){}};
  if(specifier==='./electron-runtime-summary.cjs')return {emitRuntimeSummary(){}};
  if(specifier==='../tests/security/product_xss_suite.cjs')return {runProductXss:async()=>({ok:true,failures:[]})};
  if(specifier.startsWith('../tests/products/'))return new Proxy({}, {get:(_,key)=>async()=>{suites.push(key);return {ok:true,passes:['model'],failures:[],skips:[]};}});
  return require(specifier);
 };
 vm.runInNewContext(fs.readFileSync(path.join(root,'scripts/run-product-gates.cjs'),'utf8'),sandbox);
 await sandbox.module.exports.run();
 return {commands,suites,state,report:JSON.parse(writes.get(path.join(root,'.xtend-test-results/products.json')))};
}
test('portable execution retains contracts/builds while making external evidence explicit',async()=>{
 const r=await model();assert.equal(r.report.scope,'migration-portable');assert.equal(r.report.kind,'migration-portable-result');assert.equal(r.report.schema,undefined);assert.equal(r.report.ok,true);assert.equal(r.report.handoffComplete,false);assert.equal(r.report.acceptedForMerge,false);assert.equal(r.report.acceptedForRelease,false);
 assert.equal(r.report.externalRequired.macosRuntime.status,'not-run');assert.equal(r.report.externalRequired.macosRuntime.requiredBeforeMerge,true);
 assert.deepEqual(r.report.externalRequired.browserGroups,['erp','material','appservices','shop-cli','shop-fpm']);
 for(const name of ['runXScalerTestbenchSuite','runProductNodeHost','runProductBoundarySuite','runXtendLlmAppServicesCatfoodSuite'])assert(r.suites.includes(name));
 for(const name of ['runErpResumabilityCatfoodingSuite','runMaracaAppServicesTestBenchSuite','runXtendMaterialCatfoodingSuite'])assert(!r.suites.includes(name));
 assert(!r.commands.some(row=>row.some(s=>/xvfb|run-electron|run-shop-host-gate/.test(s))));
 for(const id of ['migration-runner-contracts','http-security','product-xss','product-builds','shop-php','shop-contracts','llm-contracts','workbench-contracts','testbench-contracts'])assert(r.report.commands.some(c=>c.id===id));
});
test('portable failure remains a failure, not a partial success override',async()=>{const r=await model({fail:true});assert.equal(r.report.ok,false);assert.equal(r.state.exitCode,1);});
test('full runner still refuses hosted downgrade before any execution',async()=>{await assert.rejects(model({portable:false,mandatory:null}),/explicit REQUIRED_CI_ATTESTATION/);});
test('full runner preserves browser and Electron execution requirements',async()=>{const r=await model({portable:false});assert.equal(r.report.schema,'xtend.product-execution.v1');assert.equal(r.report.scope,undefined);for(const id of ['shop-browser','shop-browser-fpm','electron-shell-import-worker','electron-runtime','electron-actual-app-attestation'])assert(r.report.commands.some(c=>c.id===id));assert.equal(r.report.externalRequired,undefined);});
test('migration contract requires both exact lanes and external runtime, without release promotion',()=>{const c=require('../../migration-acceptance.json');assert.deepEqual(c.ci.nodes,['24.18.0','26.5.0']);assert.deepEqual(c.externalMacos.nodes,c.ci.nodes);assert.equal(c.externalMacos.requiredBeforeMerge,true);assert.equal(c.externalMacos.freshExactSourcePair,true);assert.equal(c.externalMacos.sandboxEnabled,true);assert.equal(c.ci.sandboxEnabled,false);assert.equal(c.ciAloneCompletesHandoff,false);assert.equal(c.acceptedForMerge,false);assert.equal(c.acceptedForRelease,false);});

test('actual AppServices coverage assertion follows the reusable Nightly path and rejects missing links',()=>{
 const suite=fs.readFileSync(path.join(root,'tests/products/maraca_app_services_test_bench_suite.js'),'utf8');
 const expression=suite.split('const scheduledProductCoverage = ')[1].split(';')[0];
 const nightly=fs.readFileSync(path.join(root,'.github/workflows/xtend-nightly-build.yml'),'utf8'),workflow=fs.readFileSync(path.join(root,'.github/workflows/xtend-default-gates.yml'),'utf8');
 const evaluate=(n,w,required=true)=>vm.runInNewContext(expression,{nightlyWorkflow:n,defaultWorkflow:w,require:()=>({ci:{requiredSuites:required?['maraca-app-services-test-bench']:[]}})});
 assert.equal(evaluate(nightly,workflow),true);
 assert.equal(evaluate(nightly.replace('schedule:','removed:'),workflow),false);
 assert.equal(evaluate(nightly.replace('uses: ./.github/workflows/xtend-default-gates.yml','uses: missing'),workflow),false);
 for(const command of ['scripts/prepare-ci-candidates.cjs','scripts/demo-functional-ci.cjs run'])assert.equal(evaluate(nightly,workflow.replaceAll(command,'removed')),false);
 assert.equal(evaluate(nightly,workflow,false),false);
});

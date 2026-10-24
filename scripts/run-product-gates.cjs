'use strict';
const fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {evaluateResult}=require('./product-result-evidence.cjs');
const {emitActualAppOutcome}=require('./actual-app-outcome-annotation.cjs');
const {emitRuntimeSummary}=require('./electron-runtime-summary.cjs');
const root=path.resolve(__dirname,'..');
async function run() {
 const portable=process.argv.includes('--migration-portable');
 const commands=[];
 if(!portable&&process.env.GITHUB_ACTIONS==='true'&&process.env.REQUIRED_CI_ATTESTATION!=='1')throw Error('Hosted product gates require explicit REQUIRED_CI_ATTESTATION=1');
 function saveReport(record){const target=path.join(root,'.xtend-test-results/suites',record.id+'.json');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify({schema:'xtend.product-suite-result.v1',coreSha:process.env.XTEND_CORE_SHA,demoSha:process.env.XTEND_DEMO_SHA,...record},null,2)+'\n');}
 function execute(id,args,cwd=root,reports=[],env=process.env) {
  const startedAt=Date.now();
  const labels=Object.freeze(['display-command-missing','npm-command-missing','node-command-missing','module-resolution','sandbox-preflight-rejected','ambiguous','unclassified']);
  function classifyStartup(result,command) {
   if(!result||result.status===0&&!result.error)return null;
   const matches=new Set();
   if(result.error?.code==='ENOENT'&&command==='xvfb-run'&&result.error.path===command)matches.add('display-command-missing');
   for(const captured of [result.stdout,result.stderr]) {
   const stderr=typeof captured==='string'?captured:'';
   if(/^Error: Cannot find module [^\r\n]+$/m.test(stderr)&&/^\s*code: 'MODULE_NOT_FOUND',?$/m.test(stderr)||/^Error \[ERR_MODULE_NOT_FOUND\]: [^\r\n]+$/m.test(stderr)&&/^\s*code: 'ERR_MODULE_NOT_FOUND',?$/m.test(stderr))matches.add('module-resolution');
   for(const executable of ['npm','node'])if(new RegExp('^(?:/bin/sh|sh): [0-9]+: '+executable+': not found$','m').test(stderr))matches.add(executable+'-command-missing');
   const preflights=['XTend Electron requires unprivileged execution; root is rejected','Sandbox-disabling Electron arguments are rejected','Invalid REQUIRED_CI_ATTESTATION mode','Hosted app requires explicit REQUIRED_CI_ATTESTATION=1','Reviewed mandatory CI helper attestation supports Linux only'];
   if(stderr.split('\n').some(line=>preflights.some(message=>line==='Error: '+message)))matches.add('sandbox-preflight-rejected');
   }
   return matches.size>1?'ambiguous':matches.size===1?[...matches][0]:'unclassified';
  }
  function emitStartupFailure(label,writer=line=>fs.writeSync(2,line)) {
   if(!labels.includes(label))throw Error('Invalid fixed runtime-startup diagnostic');
   try{writer(`::error::electron-runtime-startup failure=${label} code=1\n`);}catch{/* Diagnostic transport never alters authoritative result. */}
  }

  let result;
  try { result=spawnSync(args[0],args.slice(1),{cwd,env,encoding:'utf8',maxBuffer:32*1024*1024,timeout:300000}); }
  catch(error){if(id==='electron-runtime')emitRuntimeSummary(undefined,true);throw error;}
  if(id==='electron-runtime')emitRuntimeSummary(result);
  if(id==='electron-runtime') { const label=classifyStartup(result,args[0]);if(label&&label!=='unclassified')emitStartupFailure(label); }
  const outcome=evaluateResult({...result,reports,startedAt}),status=outcome.status;
  const log=path.join(root,'.xtend-test-results',id+'.log');fs.mkdirSync(path.dirname(log),{recursive:true});fs.writeFileSync(log,`${args.join(' ')}\n${result.stdout||''}\n${result.stderr||''}\n${result.error?.message||''}`);
  const record={id,command:args,cwd:path.relative(root,cwd)||'.',exitCode:result.status,status,skips:outcome.skips,failures:outcome.failures,sourceReports:outcome.sources,log:path.relative(root,log)};if(id==='electron-actual-app-attestation'&&status==='passed') {
   try {
    const consumer=JSON.parse(result.stdout),appFile=path.join(root,'.xtend-test-results/electron-sandbox-attestation.json'),consumerFile=path.join(root,'.xtend-test-results/electron-app-attestation-consumer.json');
    if(consumer.ok!==true||consumer.proofKind!=='consumed-actual-application-main-frame'||consumer.coreSha!==process.env.XTEND_CORE_SHA||consumer.demoSha!==process.env.XTEND_DEMO_SHA)throw Error('Actual application consumer identity mismatch');
    const digest=b=>require('node:crypto').createHash('sha256').update(b).digest('hex'),appBytes=fs.readFileSync(appFile),consumerBytes=Buffer.from(JSON.stringify(consumer,null,2)+'\n');
    if(digest(appBytes)!==consumer.reportSha256)throw Error('Actual application consumer/report digest mismatch');
    fs.writeFileSync(consumerFile,consumerBytes);
    record.attestation={coreSha:consumer.coreSha,demoSha:consumer.demoSha,sourceHashes:consumer.sourceHashes,provisioningReceiptSha256:consumer.provisioningReceiptSha256,app:{file:'electron-sandbox-attestation.json',sha256:digest(appBytes)},consumer:{file:'electron-app-attestation-consumer.json',sha256:digest(consumerBytes)}};
   }catch(error){record.status='failed';record.failures.push(error.message);}
  }
  if(id==='electron-actual-app-attestation')emitActualAppOutcome({reportPresent:fs.existsSync(path.join(root,'.xtend-test-results/electron-sandbox-attestation.json')),verified:record.status==='passed'});
  commands.push(record);return record.status==='passed';
 }
 execute('migration-runner-contracts',[process.execPath,'--test','--test-reporter=tap','tests/electron-app-attestation.test.cjs','tests/electron-runtime-summary.test.cjs','tests/smoke-failure-diagnostics.test.cjs','tests/r001-diagnostics.test.cjs','tests/entry-load-diagnostics.test.cjs','tests/boot-observation.test.cjs','tests/boot-reason.test.cjs','tests/boot-reason-stage.test.cjs','tests/runtime-preparation-diagnostics.test.cjs','tests/startup-error-classifier.test.cjs','tests/migration/portable-partition.test.cjs','tests/migration/result-evidence.test.cjs','tests/migration/runtime-probes.test.cjs','tests/migration/fpm-runtime.test.cjs','tests/migration/shop-host-workflow.test.cjs','tests/migration/candidate-closure.test.cjs','tests/migration/candidate-context.test.cjs','tests/migration/schema-audit-loader.test.cjs','tests/migration/shop-generated-discovery.test.cjs','tests/migration/material-product-runtime.test.cjs','tests/migration/kernel-generated-runtime.test.cjs']);
 execute('http-security',[process.execPath,'--test','--test-reporter=tap','tests/security/http.test.mjs']);
 const xss=await require('../tests/security/product_xss_suite.cjs').runProductXss({rootDir:root}).catch(error=>({ok:false,failures:[error.message]}));
 commands.push({id:'product-xss',command:['runProductXss'],exitCode:xss.ok?0:1,status:xss.ok?'passed':'failed',skips:xss.skips||[],failures:xss.failures||[]});
 const builds=[];
 for(const product of fs.readdirSync(path.join(root,'products'))) {
  const target=path.join(root,'products',product),p=JSON.parse(fs.readFileSync(path.join(target,'package.json')));
  if(p.scripts?.build)builds.push(execute('build-'+product,['npm','run','build'],target));
 }
 commands.push({id:'product-builds',command:['all product builds'],status:builds.every(Boolean)?'passed':'failed',exitCode:builds.every(Boolean)?0:1,skips:[]});
 const suites=[['xscaler-testbench','xscaler_testbench_suite.js','runXScalerTestbenchSuite'],['product-node-host','node_host_contract_suite.js','runProductNodeHost'],['product-business-ui-boundary','product_boundary_suite.js','runProductBoundarySuite'],['erp-resumability-catfood','erp_resumability_catfooding_suite.js','runErpResumabilityCatfoodingSuite'],['maraca-app-services-test-bench','maraca_app_services_test_bench_suite.js','runMaracaAppServicesTestBenchSuite'],['xtend-llm-app-services-catfood','xtend_llm_app_services_catfood_suite.js','runXtendLlmAppServicesCatfoodSuite'],['xtend-material-catfooding','xtend_material_catfooding_suite.js','runXtendMaterialCatfoodingSuite']];
 let all=true;
 for(const [id,file,fn] of suites.filter(row=>!portable||!['erp-resumability-catfood','maraca-app-services-test-bench','xtend-material-catfooding'].includes(row[0]))) {
  let result;try{result=await require('../tests/products/'+file)[fn]({rootDir:root});}catch(error){result={ok:false,failures:[error.message]};}
  const ok=result.ok===true&&!(result.skips?.length);all&&=ok;commands.push({id,command:[fn],exitCode:ok?0:1,status:ok?'passed':'failed',skips:result.skips||[],failures:result.failures||[]});
 }
 commands.push({id:portable?'portable-product-owned-suites':'product-owned-suites',command:['all transferred suite IDs'],exitCode:all?0:1,status:all?'passed':'failed',skips:[]});
 for(const [id,group] of [['shop-php','php'],['shop-browser','browser'],['shop-contracts','contracts']].filter(row=>!portable||row[1]!=='browser')) {const ok=execute(id,['npm','run','test:'+group],path.join(root,'products/xtend-shop'),[path.join(root,'products/xtend-shop/storage/reports/xtend-store-'+group+'.json')],{...process.env,XTEND_SHOP_FPM_BINARY:''});const original=commands.at(-1);commands.push({...original,id:'xtend-shop-'+group,aliasOf:id});}
 if(!portable) {
 execute('shop-browser-fpm',[process.execPath,'scripts/run-shop-host-gate.cjs','fpm'],root,[path.join(root,'products/xtend-shop/storage/reports/xtend-store-browser-fpm.json')]);
 execute('electron-shell-import-worker',['xvfb-run','-a',process.execPath,'scripts/run-electron.mjs','tests/llm-terminal-runner.mjs','--','--fake'],path.join(root,'products/xtend-llm'),[path.join(root,'products/xtend-llm/.xtend-llm-results/llm-terminal-fake.json')]);
 const lane=process.versions.node.startsWith('26.')?'node26':'node24';
 const llm=path.join(root,'products/xtend-llm'),laneName=lane==='node26'?'node-26-current':'node-24-lts';
 const attestationStartedAt=new Date().toISOString();
 execute('electron-runtime',['xvfb-run','-a','npm','run','test:electron:'+lane+':product'],llm,['app-services-catfood.json','layout-smoke.json','electron-runtime-'+laneName+'.json','native-runtime-'+laneName+'.json'].map(file=>path.join(llm,'.xtend-llm-results',file)));
 if(process.env.REQUIRED_CI_ATTESTATION==='1')execute('electron-actual-app-attestation',[process.execPath,'scripts/verify-electron-app-attestation.cjs','--core-sha',process.env.XTEND_CORE_SHA||'','--demo-sha',process.env.XTEND_DEMO_SHA||'','--started-at',attestationStartedAt]);
 }
 execute('llm-contracts',['npm','test'],path.join(root,'products/xtend-llm'));
 execute('workbench-contracts',['npm','test'],path.join(root,'products/xtend-material-workbench'));
 execute('testbench-contracts',['npm','test'],path.join(root,'products/maraca-app-services-test-bench'));
 for(const record of commands)saveReport(record);
 const ok=commands.every(c=>c.status==='passed'&&!c.skips.length);
 const report={schema:'xtend.product-execution.v1',coreSha:process.env.XTEND_CORE_SHA,demoSha:process.env.XTEND_DEMO_SHA,ok,status:ok?'passed':'failed',generatedAt:new Date().toISOString(),commands};
 const outputReport=portable?{kind:'migration-portable-result',scope:'migration-portable',coreSha:report.coreSha,demoSha:report.demoSha,ok:report.ok,status:report.status,generatedAt:report.generatedAt,commands,externalRequired:{browserGroups:['erp','material','appservices','shop-cli','shop-fpm'],macosRuntime:{nodes:['24.18.0','26.5.0'],status:'not-run',requiredBeforeMerge:true},linuxElectron:'not-run'},handoffComplete:false,acceptedForMerge:false,acceptedForRelease:false}:report;
 const index=process.argv.indexOf('--report'),output=index<0?path.join(root,'.xtend-test-results/products.json'):process.argv[index+1];fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(outputReport,null,2)+'\n');console.log(JSON.stringify(outputReport));if(!ok)process.exitCode=1;
}
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={run};

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {loadMaterialProductRuntime}=require('../../scripts/material-product-runtime.cjs');
function setup(t){const base=fs.mkdtempSync(path.join(os.tmpdir(),'xtend-material-resolution-')),product=path.join(base,'product');t.after(()=>fs.rmSync(base,{recursive:true,force:true}));fs.mkdirSync(product);fs.writeFileSync(path.join(product,'package.json'),JSON.stringify({dependencies:{'@ccslabs/xtend-maraca':'0.9.0','@xtend-material/maraca-tailwind':'0.9.0'}}));function pkg(root,name,code){const dir=path.join(root,'node_modules',...name.split('/'));fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({name,version:'0.9.0',main:'index.js'}));fs.writeFileSync(path.join(dir,'index.js'),code);return dir;}return {base,product,pkg};}
test('helper loads product-local Maraca and its directly declared local adapter',t=>{const {base,product,pkg}=setup(t);pkg(base,'@ccslabs/xtend-maraca',"throw Error('foreign fallback executed')");pkg(base,'@xtend-material/maraca-tailwind',"throw Error('foreign fallback executed')");pkg(product,'@xtend-material/maraca-tailwind',"module.exports={owner:'product'}");pkg(product,'@ccslabs/xtend-maraca',"module.exports={adapter:require('@xtend-material/maraca-tailwind')}");assert.equal(loadMaterialProductRuntime(product).adapter.owner,'product');});
test('missing product-local Maraca rejects ancestor fallback before executing it',t=>{const {base,product,pkg}=setup(t);pkg(base,'@ccslabs/xtend-maraca',"throw Error('foreign fallback executed')");pkg(product,'@xtend-material/maraca-tailwind','module.exports={}');assert.throws(()=>loadMaterialProductRuntime(product),/exact product-local installation/);});
test('missing product-local adapter rejects ancestor fallback before Maraca executes',t=>{const {base,product,pkg}=setup(t);pkg(base,'@xtend-material/maraca-tailwind',"throw Error('foreign fallback executed')");pkg(product,'@ccslabs/xtend-maraca',"throw Error('Maraca must not execute before validation')");assert.throws(()=>loadMaterialProductRuntime(product),/exact product-local installation/);});
test('completely missing adapter fails rather than falling back',t=>{const {product,pkg}=setup(t);pkg(product,'@ccslabs/xtend-maraca','module.exports={}');assert.throws(()=>loadMaterialProductRuntime(product),/Material dependency must resolve from exact product-local installation: @xtend-material\/maraca-tailwind/);});
test('undeclared adapter rejects even if installed locally',t=>{const {product,pkg}=setup(t);fs.writeFileSync(path.join(product,'package.json'),JSON.stringify({dependencies:{'@ccslabs/xtend-maraca':'0.9.0'}}));pkg(product,'@ccslabs/xtend-maraca','module.exports={}');pkg(product,'@xtend-material/maraca-tailwind','module.exports={}');assert.throws(()=>loadMaterialProductRuntime(product),/must directly declare/);});
test('symlinked foreign adapter installation rejects',t=>{const {base,product,pkg}=setup(t);pkg(product,'@ccslabs/xtend-maraca','module.exports={}');const foreign=pkg(base,'@xtend-material/maraca-tailwind','module.exports={}');const dir=path.join(product,'node_modules/@xtend-material');fs.mkdirSync(dir,{recursive:true});fs.symlinkSync(foreign,path.join(dir,'maraca-tailwind'),'dir');assert.throws(()=>loadMaterialProductRuntime(product),/exact product-local installation/);});

// Transferred unchanged assertions from Core browser_hypervisor_suite.js.
test('product-owned Material consumer delegates browser execution to the shared Hypervisor',()=>{
 const {createSuiteContext}=require('../utils/assertions');
 const context=createSuiteContext({id:'material-hypervisor-source',label:'Material Hypervisor source ownership'});
 const consumerPath='tests/products/xtend_material_catfooding_suite.js';
 const source=fs.readFileSync(path.resolve(__dirname,'../..',consumerPath),'utf8');
 context.assertIncludes(source,'browser-hypervisor',`${consumerPath} delegates browser execution to the shared Hypervisor`);
 ['/usr/bin/chromium','/Applications/','--dump-dom','--headless','DevTools','WebSocket'].forEach(token=>{
  context.assert(!source.includes(token),`${consumerPath} has no consumer-owned ${token} browser path`);
 });
 const result=context.result();assert.equal(result.ok,true,JSON.stringify(result.failures));
});
test('live LLM source retains the Observatory WASM backend symbol',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../../products/xtend-llm/src/llm/transformers-worker.mjs'),'utf8');
 assert.ok(source.includes('env.backends.onnx.wasm'),'live LLM source contains the original Observatory repoSymbol');
});

const vm=require('node:vm');
function visualHelpers(){return require('../products/xtend_material_catfooding_suite.js');}
function projectionState(dataset){return {document:{getElementById:()=>({dataset})}};}
test('Material capture waits for the scheduled navigation measurement rather than visual status alone',()=>{
 const {projectionReadyExpression}=visualHelpers();
 const dataset={xtmVisualReady:'true'},frames=[];
 const root={dataset,querySelectorAll:()=>[],querySelector:()=>({getBoundingClientRect:()=>({})})};
 const context=vm.createContext({document:{getElementById:()=>root},location:{hash:''},innerWidth:500,innerHeight:844,getComputedStyle:()=>({display:'none'}),requestAnimationFrame:fn=>frames.push(fn),addEventListener:()=>{}});
 const navigation=fs.readFileSync(path.resolve(__dirname,'../../products/xtend-material-workbench/src/workbench-navigation.mjs'),'utf8');
 vm.runInContext(navigation.replace(/^export /gm,''),context);
 // Reproduces the premature old capture before the real module's first frame.
 assert.equal(vm.runInContext("document.getElementById('xtend-material-workbench').dataset.xtmVisualReady === 'true'",context),true);
 assert.equal(vm.runInContext(projectionReadyExpression(),context),false);
 assert.equal(frames.length,1);frames.shift()();
 assert.equal(vm.runInContext(projectionReadyExpression(),context),true);
 assert.equal(vm.runInContext(projectionReadyExpression('evidence'),context),true);
 assert.equal(vm.runInContext(projectionReadyExpression('settings'),context),false);
});
test('Material capture reports completed failed measurements immediately, never waits until green',()=>{
 const {projectionReadyExpression,visualSnapshotContract}=visualHelpers();
 assert.equal(vm.runInNewContext(projectionReadyExpression(),projectionState({xtmVisualReady:'false',xtmNavigationVisible:'false'})),true);
 const checks=visualSnapshotContract('<main data-xtm-visual-ready="false" data-xtm-navigation-visible="false">Visual gate failed; viewport=500; overflow=12</main>',500);
 assert.equal(checks.visualReady,false);assert.equal(checks.navigationVisible,false);assert.equal(checks.statusPassed,false);assert.equal(checks.noOverflow,false);
});
test('Material capture rejects missing or malformed completion markers',()=>{
 const {projectionReadyExpression}=visualHelpers();
 for(const dataset of [{},{xtmVisualReady:'true'},{xtmNavigationVisible:'true'},{xtmVisualReady:'pending',xtmNavigationVisible:'true'},{xtmVisualReady:'true',xtmNavigationVisible:'unknown'}])assert.equal(vm.runInNewContext(projectionReadyExpression(),projectionState(dataset)),false);
 assert.equal(vm.runInNewContext(projectionReadyExpression(),{document:{getElementById:()=>null}}),false);
});
test('Material visual snapshot retains every blocking assertion and names each failure',()=>{
 const {visualSnapshotContract}=visualHelpers();
 const html='<main data-xtm-visual-ready="true" data-xtm-navigation-visible="true" data-xtm-dev-api-boundary="projection-uninstrumented">Visual gate passed; viewport=500; overflow=0</main><dialog></dialog>';
 assert.ok(Object.values(visualSnapshotContract(html,500)).every(Boolean));
 for(const [key,before,after] of [
  ['visualReady','data-xtm-visual-ready="true"','data-xtm-visual-ready="false"'],
  ['navigationVisible','data-xtm-navigation-visible="true"','data-xtm-navigation-visible="false"'],
  ['devApiBoundary','projection-uninstrumented','invalid-projection-api'],
  ['statusPassed','Visual gate passed','Visual gate failed'],
  ['viewportMatches','viewport=500','viewport=1280'],
  ['noOverflow','overflow=0','overflow=12'],
  ['dialogClosed','<dialog>','<dialog open>']
 ]){const checks=visualSnapshotContract(html.replace(before,after),500);assert.equal(checks[key],false,key);assert.equal(Object.values(checks).filter(v=>!v).length,1,key);}
});

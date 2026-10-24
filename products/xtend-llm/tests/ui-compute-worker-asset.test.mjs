import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createXtendLlmAppServer } from '../src/main/app-server.mjs';
import { APP_CAPABILITY_HEADER } from '../src/main/app-server-session.mjs';
const product=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const acorn=createRequire(import.meta.url)('acorn');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const originalClient='9880fce2c3fd21d8583c9c9e4b76b329f2db415dde4c1b3e1a5ce10b44347e5b';
const originalWorker='0ef8f2f1733cdb65f6ae7d96811eb701c1ad1df29d09802025da5465520dd079';
const originalServer='e4ba73be288ffdc4cc44f9c2ab5aa2bf7191c796b7b0997e87aaf7fc9b02a7e1';
let app,base,served;
test('source relocation is exactly one URL change; worker/server bytes unchanged',()=>{
 const source=fs.readFileSync(path.join(product,'src/renderer/ui-compute-client.mjs'),'utf8');
 const current="new URL('/src/renderer/ui-compute-worker.mjs', import.meta.url)";
 assert.equal(source.split(current).length-1,1);
 assert.equal(sha(source.replace(current,"new URL('./ui-compute-worker.mjs', import.meta.url)")),originalClient);
 assert.equal(sha(fs.readFileSync(path.join(product,'src/renderer/ui-compute-worker.mjs'))),originalWorker);
 assert.equal(sha(fs.readFileSync(path.join(product,'src/main/app-server.mjs'))),originalServer);
});
test('real production build succeeds without Electron execution',()=>{
 const child=spawnSync(process.execPath,['scripts/rmt-build.mjs','--profile','production','--quiet'],{cwd:product,encoding:'utf8'});
 assert.equal(child.status,0);assert.equal(child.signal,null);
 console.log('build-result '+JSON.stringify({exit:child.status,node:process.version}));
});
test('compiled Worker URL resolves to existing source route from actual entry',()=>{
 const source=fs.readFileSync(path.join(product,'site/build/xtend.maraca.mjs'),'utf8');
 const ast=acorn.parse(source,{ecmaVersion:'latest',sourceType:'module'});const urls=[];
 function walk(n){if(!n||typeof n!=='object')return;if(n.type==='NewExpression'&&n.callee?.name==='Worker'){const a=n.arguments[0];if(a?.type==='NewExpression'&&a.callee?.name==='URL'&&a.arguments[0]?.type==='Literal')urls.push(new URL(a.arguments[0].value,'http://localhost/build/xtend.maraca.mjs').pathname);}for(const v of Object.values(n))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}
 walk(ast);assert.deepEqual(urls,['/src/renderer/ui-compute-worker.mjs']);
});
test('actual server worker response is JS200, exact original bytes and unchanged CSP',async()=>{
 app=createXtendLlmAppServer({cacheRoot:path.join(product,'site/asset-test-cache')});base=await app.listen();
 const headers={[APP_CAPABILITY_HEADER]:app.capability};
 const response=await fetch(new URL('/src/renderer/ui-compute-worker.mjs',base),{headers});served=Buffer.from(await response.arrayBuffer());
 assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^text\/javascript/);assert.equal(sha(served),originalWorker);
 const html=await fetch(base,{headers});assert.equal(html.status,200);const htmlText=await html.text();const csp=(htmlText.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)||[])[1];assert.match(csp,/worker-src 'self'/);
 console.log('worker-response '+JSON.stringify({status:response.status,contentType:response.headers.get('content-type'),bytes:served.length,sha256:sha(served)}));
});
test('actual served worker executes health/prewarm/error protocol in NON-browser Node worker adapter',{timeout:5000},async()=>{
 // Real served source is imported unchanged. Adapter supplies only dedicated-worker message primitives.
 // This is Node worker protocol proof, not browser/CSP/Electron/sandbox acceptance or shell DOM.
 const dataUrl='data:text/javascript;base64,'+served.toString('base64');
 const bootstrap=`const {parentPort}=require('node:worker_threads');globalThis.self={addEventListener:(name,fn)=>{if(name==='message')parentPort.on('message',data=>fn({data}));},postMessage:data=>parentPort.postMessage(data)};import(${JSON.stringify(dataUrl)}).then(()=>parentPort.postMessage({ready:true}));`;
 const worker=new Worker(bootstrap,{eval:true});
 const next=()=>new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);});
 try{assert.deepEqual(await next(),{ready:true});
 let result=next();worker.postMessage({id:'health',action:'health'});let response=await result;assert.equal(response.ok,true);assert.equal(response.result.schema,'xtend-llm.ui-compute-health.v1');
 result=next();worker.postMessage({id:'prewarm',action:'run',job:{kind:'prewarm.surface',targets:['settings-dialog']}});response=await result;assert.equal(response.ok,true);assert.equal(response.result.targetCount,1);
 result=next();worker.postMessage({id:'unsupported',action:'run',job:{kind:'invalid'}});response=await result;assert.equal(response.id,'unsupported');assert.equal(response.ok,false);assert.equal(typeof response.error.message,'string');
 }finally{await worker.terminate();}
});
test('original asynchronous worker error records state and leaves pending promise behavior unchanged',async()=>{
 const original=fs.readFileSync(path.join(product,'src/renderer/ui-compute-client.mjs'),'utf8');
 // Whole-client byte reconstruction above is authoritative conservation; no pending-job redesign.
 assert.match(original,/this\.pending\.set\(id, \{ resolve, reject \}\)/);
 assert.match(original,/this\.worker\.addEventListener\('error'/);
});
test.after(async()=>{if(app)await app.close();});

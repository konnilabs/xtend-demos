'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {ids,emitSmokeFailure,observeSmokeFailures}=require('../products/xtend-llm/scripts/smoke-failure-diagnostics.cjs');
const {buildRuntimeSummary,emitRuntimeSummary}=require('../scripts/electron-runtime-summary.cjs');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const raw=fs.readFileSync(path.join(__dirname,'fixtures/smoke-failure-mapping.json'),'utf8'),map=JSON.parse(raw);
// Retain the original frozen mapping fixture. Undo only the reviewed R001 diagnostic
// additions with exact byte bindings; readiness and every original call remain checked.
const entryProposedSource=fs.readFileSync(path.join(__dirname,'..',map.source),'utf8');
const entryImport="import {installEntryObserver} from '../../scripts/entry-load-diagnostics.cjs';\n";
const entryCall="  installEntryObserver(ipcMain, mainWindow, event => isTrustedMainFrame(event, mainWindow.webContents));\n";
assert.ok(entryProposedSource.includes(entryImport));assert.ok(entryProposedSource.includes(entryCall));
const proposedSource=entryProposedSource.replace(entryImport,'').replace(entryCall,'').replace("import {installBootObserver} from '../../scripts/boot-observation.cjs';\n",'').replace("  installBootObserver(ipcMain, mainWindow, event => isTrustedMainFrame(event, mainWindow.webContents));\n",'');
const r001Marker="          try {\n            const transcript = document.querySelector('#chat-transcript') ? '1' : '0';\n            const sidepanel = customElements.get('x-side-panel') ? '1' : '0';\n            const ready = ['loading', 'interactive', 'complete'].includes(document.readyState) ? document.readyState : 'unknown';\n            console.debug('xtend-r001-timeout format=1 transcript=' + transcript + ' sidepanel=' + sidepanel + ' ready=' + ready);\n          } catch {}\n";
const r001Wrapper="const execute = () => mainWindow.webContents.executeJavaScript(source);\n    const result = await (id === 'R001' ? observeR001(mainWindow.webContents, execute) : execute());";
assert.ok(proposedSource.includes(r001Marker));assert.ok(proposedSource.includes(r001Wrapper));
const source=proposedSource.replace("import {observeR001} from '../../scripts/r001-diagnostics.cjs';\n",'').replace(r001Marker,'').replace(r001Wrapper,'const result = await mainWindow.webContents.executeJavaScript(source);');
const body=source.slice(source.indexOf('let smokeFailureId'),source.indexOf('async function runLayoutSmoke'));
function helpers(execute){return vm.runInNewContext(body+';({assertLayout,runSmokeScript,id:()=>smokeFailureId})',{mainWindow:{webContents:{executeJavaScript:execute}},Error});}
test('frozen exact source mapping: all 136 predicates and 15 renderer scripts unchanged and ordered',()=>{
 assert.equal(sha(raw),'964075148924c6d498d1cffec836efbcb8206405cce80404c518aa96bd4c15b2');assert.ok(Object.isFrozen(ids));assert.deepEqual(ids,map.order);assert.equal(map.calls.filter(x=>x.id[0]==='A').length,136);assert.equal(map.calls.filter(x=>x.id[0]==='R').length,15);
 for(const call of map.calls){const text=source.slice(call.start,call.end);assert.ok(text.endsWith(", '"+call.id+"')"));assert.equal(sha(text.replace(new RegExp(", '"+call.id+"'\\)$"),')')),call.sha256);}
 assert.deepEqual(map.calls.filter(x=>x.id[0]==='A').map(x=>x.id),ids.slice(0,136));assert.deepEqual(map.calls.filter(x=>x.id[0]==='R').map(x=>x.id),ids.slice(136,151));
 const gate=fs.readFileSync(path.join(__dirname,'../scripts/run-product-gates.cjs'),'utf8');assert.ok(gate.includes("'tests/smoke-failure-diagnostics.test.cjs'"));
});
test('actual original assertion Error and message; successful assertion retains undefined result',()=>{
 const api=helpers(()=>42);assert.equal(api.assertLayout(true,'original','A001'),undefined);
 assert.throws(()=>api.assertLayout(false,'PRIVATE original message','A002'),e=>e.constructor===Error&&e.message==='PRIVATE original message');assert.equal(api.id(),'A002');
});
test('renderer invokes exact source once; original wrapping and thrown prose conserved but not exported',async()=>{
 const error=Object.assign(Error('PRIVATE\n::error::INJECT'),{stack:'EXACT ORIGINAL STACK'}),calls=[];
 const api=helpers(async code=>{calls.push(code);throw error;});
 await assert.rejects(api.runSmokeScript('original label','exact source','R007'),e=>e.constructor===Error&&e.message==='Renderer smoke step "original label" failed:\nEXACT ORIGINAL STACK');assert.deepEqual(calls,['exact source']);assert.equal(api.id(),'R007');
 const success=helpers(async code=>code);assert.equal(await success.runSmokeScript('label','result','R001'),'result');assert.equal(success.id(),'P001');
});
test('closed IDs: each exact bit, repetitions, malicious text and split streams',()=>{
 ids.forEach((id,index)=>{const lines=[];emitSmokeFailure(id,x=>lines.push(x));assert.equal(lines[0],'xtend-smoke-failure format=1 id='+id+'\n');assert.equal(observeSmokeFailures(lines[0].repeat(23)),'0'.repeat(index)+'1'+'0'.repeat(ids.length-index-1));});
 const bad=['A000','A137','R016','P009','C005','A001\n::error::SECRET',null,{},'../../PRIVATE'];for(const id of bad){let writes=0;emitSmokeFailure(id,()=>writes++);assert.equal(writes,0);}
 const s=buildRuntimeSummary({status:1,stdout:'xtend-smoke-failure format=1 id=A',stderr:'001\nxtend-smoke-failure format=1 id=A001 suffix=SECRET\n::notice::PRIVATE\n'});assert.equal(s.diagnostic,'none');assert.equal(s.stdoutFailure,'0'.repeat(ids.length));assert.equal(s.stderrFailure,'0'.repeat(ids.length));
});
test('one final summary per command; absent markers, failures and writer failure do not mutate result',()=>{
 const result={status:7,signal:null,stdout:'xtend-smoke-failure format=1 id=A001\n'.repeat(50),stderr:'xtend-smoke-failure format=1 id=R015\n'.repeat(50),error:Error('PRIVATE')},before={...result},lines=[];
 emitRuntimeSummary(result,false,x=>lines.push(x));assert.equal(lines.length,1);assert.ok(lines[0].length<1024);assert.ok(!lines[0].includes('PRIVATE'));assert.match(lines[0],/diagnostic_format=1 diagnostic=observed/);assert.deepEqual(result,before);
 assert.doesNotThrow(()=>emitRuntimeSummary(result,false,()=>{throw Error('WRITER');}));assert.doesNotThrow(()=>emitSmokeFailure('A001',()=>{throw Error('WRITER');}));assert.deepEqual(result,before);
 assert.equal(buildRuntimeSummary({status:0,stdout:'',stderr:''}).diagnostic,'none');assert.equal(buildRuntimeSummary(undefined,true).command,'spawn-throw');
});
test('real nonprivileged child retains raw logs and actual exit despite fixed failures and malicious text',()=>{
 const out='xtend-smoke-failure format=1 id=A136\n'.repeat(25)+'PRIVATE\n',err='xtend-smoke-failure format=1 id=C004\n'.repeat(25);
 const result=spawnSync(process.execPath,['-e',"process.stdout.write("+JSON.stringify(out)+");process.stderr.write("+JSON.stringify(err)+");throw new Error('ORIGINAL_THROW');"],{encoding:'utf8'});
 assert.equal(result.status,1);assert.equal(result.stdout,out);assert.ok(result.stderr.startsWith(err));assert.ok(result.stderr.includes('ORIGINAL_THROW'));const before=result.stderr,s=buildRuntimeSummary(result);assert.equal(s.stdoutFailure[135],'1');assert.equal(s.stderrFailure[162],'1');assert.equal(result.stderr,before);
 console.log(JSON.stringify({control:'real-Node-child-not-Electron',node:process.version,status:result.status,stdoutSha256:sha(result.stdout),stderrSha256:sha(result.stderr),diagnostic:s.diagnostic,markersPerStream:25}));
});
test('existing screenshot/report catch and child exit conservation: no new catch replacement or chain',()=>{
 assert.ok(source.includes('emitSmokeFailure(smokeFailureId);\n      console.error(error && error.stack ? error.stack : error);\n      app.exit(1);'));
 for(const value of ["smokeFailureId = 'P002';\n  fs.mkdirSync", "smokeFailureId = 'P003';\n  const image = await mainWindow.webContents.capturePage();", "smokeFailureId = 'P004';\n  const screenshot = image.toPNG();", "smokeFailureId = 'P005';\n  fs.writeFileSync(screenshotPath, screenshot);", "smokeFailureId = 'P006';\n  fs.writeFileSync(reportPath", "smokeFailureId = 'P008';\n      app.quit();"])assert.ok(source.includes(value));
 const launcher=fs.readFileSync(path.join(__dirname,'../products/xtend-llm/scripts/run-electron.mjs'),'utf8');assert.ok(launcher.includes('    mirrorChildExit(result);'));assert.ok(launcher.includes('console.error(error && error.stack ? error.stack : String(error));\n    process.exitCode = 1;'));
});
test('complete original main source reconstructed exactly: no predicate, script, timeout, report or guard edits',()=>{
 let restored=source;
 for(const call of [...map.calls].sort((a,b)=>b.start-a.start)){
  const text=restored.slice(call.start,call.end),original=text.replace(new RegExp(", '"+call.id+"'\\)$"),')');
  restored=restored.slice(0,call.start)+original+restored.slice(call.end);
 }
 restored=restored.replace("import {emitSmokeFailure} from '../../scripts/smoke-failure-diagnostics.cjs';\n",'')
  .replace("let smokeFailureId = 'P001';\n",'')
  .replace('function assertLayout(condition, message, id) {','function assertLayout(condition, message) {')
  .replace('if (!condition) { smokeFailureId = id; throw new Error(message); }','if (!condition) throw new Error(message);')
  .replace('async function runSmokeScript(label, source, id) {\n  smokeFailureId = id;','async function runSmokeScript(label, source) {')
  .replace("const result = await mainWindow.webContents.executeJavaScript(source);\n    smokeFailureId = 'P001';\n    return result;",'return await mainWindow.webContents.executeJavaScript(source);')
  .replace(/^  smokeFailureId = 'P00[2-7]';\n/gm,'')
  .replace("      smokeFailureId = 'P001';\n",'').replace("      smokeFailureId = 'P008';\n",'').replace('      emitSmokeFailure(smokeFailureId);\n','');
 assert.equal(sha(restored),map.baseSourceSha256);
});
test('real screenshot/report writer throws retain thrown identity, existing catch/exit and original app evidence',async()=>{
 const tail=source.slice(source.indexOf("  const resultDir = path.join(productRoot, '.xtend-llm-results');"),source.indexOf('\n}\n\napp.whenReady().then(async'));
 const catchBody=source.slice(source.indexOf("      smokeFailureId = 'P001';\n      await runLayoutSmoke();"),source.indexOf('\n  }\n}).catch'));
 for(const failAt of ['mkdir','capture','png','screenshot','report','console','quit',null]){
  const thrown=Error('PRIVATE original writer failure'),events=[],lines=[],image={toPNG(){events.push('png');if(failAt==='png')throw thrown;return Buffer.from('image');}};
  const mockFs={mkdirSync(){events.push('mkdir');if(failAt==='mkdir')throw thrown;},writeFileSync(file,bytes){const event=file.endsWith('.png')?'screenshot':'report';events.push(event);if(failAt===event)throw thrown;}};
  const context={Buffer,path,crypto,fs:mockFs,productRoot:'/controlled',mainWindow:{webContents:{async capturePage(){events.push('capture');if(failAt==='capture')throw thrown;return image;}}},messageCounts:{total:2,user:1,assistant:1,appServices:{},actionChrome:{}},codeHydration:{},markdownFormatting:{},secondPromptState:{},deleteFlow:{},console:{log(){events.push('console');if(failAt==='console')throw thrown;},error(e){events.push('error');assert.equal(e,thrown.stack);}},app:{quit(){events.push('quit');if(failAt==='quit')throw thrown;},exit(code){events.push('exit:'+code);}},emitSmokeFailure:id=>emitSmokeFailure(id,line=>lines.push(line))};
  // Exact candidate tail and existing outer catch, with no Electron execution.
  await vm.runInNewContext("let smokeFailureId='P001'; async function runLayoutSmoke(){"+tail+'}\n(async()=>{try{'+catchBody+'})()',context);
  const expected={mkdir:'P002',capture:'P003',png:'P004',screenshot:'P005',report:'P006',console:'P007',quit:'P008'};
  if(failAt){assert.deepEqual(lines,['xtend-smoke-failure format=1 id='+expected[failAt]+'\n']);assert.deepEqual(events.slice(-2),['error','exit:1']);}
  else{assert.deepEqual(lines,[]);assert.deepEqual(events,['mkdir','capture','png','screenshot','report','console','console','quit']);}
  assert.ok(!events.includes('app-evidence-write')); // The earlier authoritative app receipt is outside this untouched tail.
 }
});

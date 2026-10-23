import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/renderer/app-controller.mjs',import.meta.url),'utf8');
const code=source.slice(source.indexOf('async function startGenerationServiceStream('),source.indexOf('\nfunction emitGenerationServiceFrame('));
function fixture(){
 const channels=new Map(),frames=[],wakes=[];let globalRead=false;
 const scope={generationFrameChannels:channels,activeGenerationStream:null,createGenerationFrameChannel:id=>({wake:()=>wakes.push(id)}),forwardGenerationServiceFrame:(...args)=>frames.push(args),window:new Proxy({},{get(){globalRead=true;throw Error('Global mutable registry is forbidden');}})};
 const ctx=vm.createContext(scope);const start=vm.runInContext(code+'\nstartGenerationServiceStream',ctx);
 return {start,channels,frames,wakes,ctx,globalRead:()=>globalRead};
}
test('injected asynchronous stream port preserves frames, identity, cancellation and terminal cleanup',async()=>{
 const f=fixture();let handlers,received;let cancelled=0;const handle={cancel(){cancelled++;}};const signal=new AbortController().signal;
 const port={async stream(...args){received=args;handlers=args[2];return handle;}};
 const result=await f.start('job',{hostServiceRegistry:port,signal,correlationId:'correlation'},'target');
 assert.equal(result,handle);assert.equal(received[0],'xtend.llm.generationStream');assert.equal(received[1].jobId,'job');assert.equal(received[3].signal,signal);assert.equal(received[3].correlationId,'correlation');assert.equal(f.channels.size,1);
 handlers.onFrame({type:'delta',delta:'fixture'});assert.equal(f.frames.at(-1)[1],'target');assert.equal(f.channels.size,1);
 handlers.onFrame({type:'complete'});await Promise.resolve();assert.equal(f.channels.size,0);assert.equal(f.ctx.activeGenerationStream,null);assert.equal(cancelled,0);assert.equal(f.globalRead(),false);
});
for(const type of ['error','cancelled'])test(type+' closes the owned channel without implying success',async()=>{
 const f=fixture();let handlers;await f.start('job',{hostServiceRegistry:{async stream(id,input,h){handlers=h;return {cancel(){}};}}});handlers.onFrame({type});await Promise.resolve();assert.equal(f.channels.size,0);assert.equal(f.frames.at(-1)[0].type,type);assert.equal(f.ctx.activeGenerationStream,null);
});
test('missing or rejected injected port fails and cannot fall back to global registry',async()=>{
 const f=fixture();await assert.rejects(f.start('job',{}),/injected/);assert.equal(f.channels.size,0);
 await assert.rejects(f.start('job',{hostServiceRegistry:{async stream(){throw Error('open failed');}}}),/open failed/);assert.equal(f.channels.size,0);assert.equal(f.globalRead(),false);
});
test('superseded stream cleanup cannot remove the replacement channel',async()=>{
 const f=fixture();const records=[];const port={async stream(id,input,h){const record={h,cancels:0};records.push(record);return {cancel(){record.cancels++;}};}};
 await f.start('same-job',{hostServiceRegistry:port});await f.start('same-job',{hostServiceRegistry:port});assert.equal(records[0].cancels,1);
 records[0].h.onFrame({type:'cancelled'});await Promise.resolve();assert.equal(f.channels.size,1);assert.ok(f.ctx.activeGenerationStream);
 records[1].h.onFrame({type:'complete'});await Promise.resolve();assert.equal(f.channels.size,0);
});
const main=fs.readFileSync(new URL('../src/main/electron-main.mjs',import.meta.url),'utf8');
const checkpoint=main.slice(main.indexOf('      const committed = new Promise('),main.indexOf("      prompt.value = 'Second turn';"));
test('follow-up waits for its actual Model commit; foreign events do not release the fixture',async()=>{
 let listener,timeout,unsubscribed=0,cleared=0;const committed=vm.runInNewContext(checkpoint+'\ncommitted',{correlationId:'expected',model:{subscribe(fn){listener=fn;return()=>unsubscribed++;}},setTimeout(fn){timeout=fn;return 1;},clearTimeout(){cleared++;}});let resolved=false;committed.then(()=>resolved=true);
 listener({metadata:{correlationId:'foreign'}});await Promise.resolve();assert.equal(resolved,false);assert.equal(unsubscribed,0);
 listener({metadata:{correlationId:'expected'}});await committed;assert.equal(resolved,true);assert.equal(unsubscribed,1);assert.equal(cleared,1);
});
test('missing matching Model commit remains a bounded failure and unsubscribes',async()=>{
 let timeout,unsubscribed=0;const committed=vm.runInNewContext(checkpoint+'\ncommitted',{correlationId:'expected',model:{subscribe(){return()=>unsubscribed++;}},setTimeout(fn){timeout=fn;return 1;},clearTimeout(){}});const rejected=assert.rejects(committed,/Model commit timed out/);timeout();await rejected;assert.equal(unsubscribed,1);
});

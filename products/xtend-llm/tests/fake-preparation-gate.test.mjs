import test from 'node:test';
import assert from 'node:assert/strict';
// Actual fake-worker control flow with deterministic message/timer doubles.
// These are fixture protocol tests, not Electron, model or sandbox evidence.
async function fixture(t) {
 const saved={self:globalThis.self,BroadcastChannel:globalThis.BroadcastChannel,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 const messages=[],channels=[];let receive,timeout;
 globalThis.self={location:{origin:'http://fixture.invalid'},addEventListener:(_,fn)=>{receive=fn;},postMessage:message=>messages.push(message)};
 globalThis.BroadcastChannel=class {constructor(name){this.name=name;this.closed=false;channels.push(this);}close(){this.closed=true;}};
 globalThis.setTimeout=fn=>{timeout=fn;return 1;};globalThis.clearTimeout=()=>{};
 t.after(()=>Object.assign(globalThis,saved));
 await import('../src/llm/transformers-worker.mjs?fixture='+t.name);
 const flush=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};
 return {messages,channels,flush,load:delay=>receive({data:{type:'load',payload:{fake:true,fakeLoadDelayMs:delay,model:'controlled-model'}}}),expire:()=>timeout()};
}
test('preparation stays busy until explicit release; checkpoint remains loading',async t=>{
 const f=await fixture(t);f.load(-1);await f.flush();assert.equal(f.channels.length,1);assert.equal(f.messages.at(-1).payload.phase,'loading');
 f.channels[0].onmessage({data:'checkpoint'});await f.flush();assert.equal(f.messages.at(-1).payload.status,'Fake preparation checkpoint.');assert.equal(f.messages.some(m=>m.payload.phase==='ready'),false);
 f.channels[0].onmessage({data:'release'});await f.flush();assert.equal(f.messages.at(-1).payload.phase,'ready');assert.equal(f.channels[0].closed,true);
});
test('unknown or malformed messages cannot release preparation',async t=>{
 const f=await fixture(t);f.load(-1);for(const data of [null,{},'ready','RELEASE',{type:'release'}])f.channels[0].onmessage({data});await f.flush();assert.equal(f.messages.some(m=>m.payload.phase==='ready'),false);f.channels[0].onmessage({data:'release'});await f.flush();assert.equal(f.messages.at(-1).payload.phase,'ready');
});
test('unreleased fixture fails within its deadline and never becomes ready',async t=>{
 const f=await fixture(t);f.load(-1);f.expire();await f.flush();assert.equal(f.channels[0].closed,true);assert.equal(f.messages.at(-1).payload.phase,'error');assert.match(f.messages.at(-1).payload.status,/not released/);assert.equal(f.messages.some(m=>m.payload.phase==='ready'),false);
});
test('ordinary fake model still completes without a preparation gate',async t=>{
 const f=await fixture(t);f.load(0);await f.flush();assert.equal(f.channels.length,0);assert.equal(f.messages.at(-1).payload.phase,'ready');
});

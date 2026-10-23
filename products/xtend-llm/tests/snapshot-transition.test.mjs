import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRmtSurfaceTransitionRuntime} from '@ccslabs/xtend-rmt/surface-transition-runtime';
const source=fs.readFileSync(new URL('../xtend-llm.rmt',import.meta.url),'utf8');
const block=source.match(/transition xtend\.llm\.snapshotToIdle\s*\{([^}]+)\}/)[1];
const plan={id:'xtend.llm.snapshotToIdle',trigger:{kind:'action',id:block.match(/trigger action (\S+)/)[1]},from:block.match(/from surfaces \[([^\]]+)\]/)[1].split(/\s+/),to:block.match(/to surfaces \[([^\]]+)\]/)[1].split(/\s+/),effect:block.match(/effect (\S+)/)[1],durationMs:Number(block.match(/durationMs (\d+)/)[1])};
function element(id,hidden){const attrs=new Map([['data-maraca-surface',id],...(hidden?[['hidden','']]:[])]);return {style:{},getAttribute:key=>attrs.get(key),hasAttribute:key=>attrs.has(key),setAttribute:(key,value)=>attrs.set(key,value),removeAttribute:key=>attrs.delete(key)};}
function runtime(effect=plan.effect){
 const spinner=element(plan.from[1],false),status=element(plan.to[1],true),commits=[];
 const api=createRmtSurfaceTransitionRuntime({strict:true,transitionPlan:{transitions:[{...plan,effect}]},domRenderer:{commit(request){assert.equal(request.ownership.mode,'strict');assert.equal(request.ownership.owner,'transition-runtime');commits.push(request);for(const [key,value] of Object.entries(request.descriptor.attributes)){if(key==='style')Object.assign(request.target.style,value);else if(value===null)request.target.removeAttribute(key);else request.target.setAttribute(key,value);}}},xUtils:{runUiTransition:async()=>({status:'complete'})},windowTarget:null});
 const patch=(node,id,previousHidden,nextHidden)=>api.applyVisibilityPatch({element:node,surface:id,action:plan.trigger.id,previousHidden,nextHidden});
 return {api,spinner,status,commits,patch};
}
test('original sequential fade blocks status entry while the preparation spinner remains visible',{timeout:2000},async t=>{
 const f=runtime('fade');t.after(()=>f.api.dispose());await f.patch(f.spinner,plan.from[1],false,false);
 await assert.rejects(f.patch(f.status,plan.to[1],true,false),/could not wait for exit surfaces/);assert.equal(f.spinner.hasAttribute('hidden'),false);
});
test('actual snapshot transition displays status concurrently with the busy spinner without fallback',async t=>{
 const f=runtime();t.after(()=>f.api.dispose());await f.patch(f.spinner,plan.from[1],false,false);const result=await f.patch(f.status,plan.to[1],true,false);
 assert.equal(result.status,'complete');assert.equal(f.status.hasAttribute('hidden'),false);assert.equal(f.spinner.hasAttribute('hidden'),false);assert.equal(f.api.snapshot().fallbackCount,0);assert.ok(f.commits.length>0);
});
test('spinner still exits on readiness and explicit previous visibility stays mandatory',async t=>{
 const f=runtime();t.after(()=>f.api.dispose());await f.patch(f.spinner,plan.from[1],false,false);await f.patch(f.status,plan.to[1],true,false);const result=await f.patch(f.spinner,plan.from[1],false,true);assert.equal(result.status,'complete');assert.equal(f.spinner.hasAttribute('hidden'),true);assert.equal(f.status.hasAttribute('hidden'),false);await assert.rejects(f.api.applyVisibilityPatch({element:f.status,surface:plan.to[1],action:plan.trigger.id,nextHidden:false}),/previousHidden/);
});

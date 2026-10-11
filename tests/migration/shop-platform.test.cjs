'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {verifyInstalledHosts}=require('../../scripts/verify-shop-platform.cjs');
const required=['illuminate/support','illuminate/http','illuminate/contracts','illuminate/view'];
function fixture(major){const root=fs.mkdtempSync(path.join(os.tmpdir(),'xtend-shop-platform-'));const provider=[{name:'ccslabs/xtend-laravel',version:'0.9.0',require:Object.fromEntries(required.map(name=>[name,'^12.0 || ^13.0']))},...[...required,'illuminate/collections'].map(name=>({name,version:'v'+major+'.1.0'}))];function write(packages,directory){const dir=path.join(root,directory,'vendor/composer');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'installed.json'),JSON.stringify({packages}));}write([{name:'laravel/framework',version:'v'+major+'.1.0'}],'');write(provider,'payment-provider');return {root,provider,write};}
test('Shop framework and component-only Payment Provider validate both preserved Laravel majors',()=>{
 for(const major of ['12','13']){const f=fixture(major);try{const hosts=verifyInstalledHosts(f.root,major);assert.equal(hosts[1].packages.length,5);assert.deepEqual(hosts[1].required,required);}finally{fs.rmSync(f.root,{recursive:true,force:true});}}
});
test('missing required component, wrong direct/transitive major and wrong Shop framework fail closed',()=>{
 for(const mutation of ['missing','direct','transitive','framework','adapter']){const f=fixture('13');try{
  if(mutation==='missing')f.provider.splice(1,1);
  if(mutation==='direct')f.provider[1].version='v12.1.0';
  if(mutation==='transitive')f.provider.at(-1).version='v12.1.0';
  if(mutation==='adapter')delete f.provider[0].require['illuminate/view'];
  f.write(f.provider,'payment-provider');if(mutation==='framework')f.write([{name:'laravel/framework',version:'v12.1.0'}],'');
  assert.throws(()=>verifyInstalledHosts(f.root,'13'),/missing|mismatch/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}}
});

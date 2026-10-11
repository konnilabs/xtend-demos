'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'../..');
for(const product of ['maraca-app-services-test-bench','xtend-material-workbench'])test(`${product} declares and resolves a minimal exact closure and no unrelated MCP/Fabric/Shard/RMT installation`,()=>{
 const cwd=path.join(root,'products',product),pkg=JSON.parse(fs.readFileSync(path.join(cwd,'package.json'))),req=createRequire(path.join(cwd,'package.json'));
 const api=req('@ccslabs/xtend/candidate-integrity'),manifest=JSON.parse(fs.readFileSync(path.join(cwd,'.candidate/manifest.json')));
 const closure=api.selectCandidateClosure(manifest,pkg).map(p=>p.name);
 assert.equal(manifest.packages.length,10);
 assert.deepEqual(closure,['@ccslabs/xtend','@ccslabs/xtend-cli','@ccslabs/xtend-compiler','@ccslabs/xtend-maraca','@xtend-material/core','@xtend-material/maraca-tailwind']);
 for(const name of ['xtend-mcp','xtend-fabric','xtend-xsurface-shard','xtend-rmt']){
  assert.equal(pkg.dependencies?.['@ccslabs/'+name],undefined);assert.equal(pkg.devDependencies?.['@ccslabs/'+name],undefined);
  assert.equal(fs.existsSync(path.join(cwd,'node_modules/@ccslabs',name)),false);
 }
 assert.equal(api.verifyInstalledClosure(JSON.parse(fs.readFileSync(path.join(cwd,'package-lock.json'))),manifest),true);
 assert.equal(api.verifyResolution(req,manifest,path.join(cwd,'node_modules')),true);
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),zlib=require('node:zlib');
const {execFileSync}=require('node:child_process'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'../..'),api=require('@ccslabs/xtend/schema-inventory'),scanner=api.createScanner({typescript:require('typescript')}),packageRoot=path.dirname(require.resolve('@ccslabs/xtend/package.json'));
const rules=fs.readFileSync(path.join(root,'.gitignore'),'utf8');
const expectedRules=['products/xtend-shop/**/public/build/','products/xtend-shop/**/bootstrap/cache/*','products/xtend-shop/**/bootstrap/xtend/','products/xtend-shop/**/storage/','products/xtend-shop/**/*.sqlite*'];
const mirrorPaths=['payment-provider/public/build/adapter.mjs','payment-provider/public/build/maraca/runtime/xtend-maraca-plan-runtime.mjs','payment-provider/public/build/maraca/xtend.maraca.mjs','public/build/maraca/chunks/x-button-C0cKlm2v.mjs','public/build/maraca/runtime/xtend-maraca-plan-runtime.mjs','public/build/maraca/xtend.maraca.mjs'].map(p=>'products/xtend-shop/'+p);
const overlay=JSON.parse(fs.readFileSync(path.join(packageRoot,'tools/schema-inventory/command-lexical-overlay.json'))),runtimeBytes=fs.readFileSync(path.join(root,overlay.sourcePath));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function fixture(t){const dir=fs.mkdtempSync(path.join(process.env.XTEND_SHOP_DISCOVERY_TMPDIR||os.tmpdir(),'shop-git-discovery-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));git(dir,['init','-q']);put(dir,'.gitignore',rules);return dir;}
function git(dir,args){return execFileSync('git',args,{cwd:dir,encoding:'utf8',maxBuffer:64*1024*1024});}
function put(dir,file,bytes){const target=path.join(dir,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);}
function list(dir){return git(dir,['ls-files','-z','--cached','--others','--exclude-standard']).split('\0').filter(Boolean);}
function occurrence(entry,file){return entry.usages.some(u=>u.sourcePaths.includes(file));}
function declaration(id,malicious=false){const value={payload:malicious?{unexpectedAuthority:true}:{legitimateNewContract:true}};value[['sche','ma'].join('')]=id;return 'export const productive = '+JSON.stringify(value)+';\n';}
function acceptedLedger(){return JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(packageRoot,'tools/schema-inventory/ownership-ledger.json.gz'))));}
function rejectedNew(scan,id,dir){const entry=scan.entries.find(e=>e.schemaId===id);assert.ok(entry,'actual productive declaration must be observed');assert.ok(entry.shapeFingerprints.length,'actual declaration must have extracted shape');const result=scanner.validateInventoryDocument(acceptedLedger(),scan,{rootDir:dir});assert.equal(result.valid,false);assert.ok(result.errors.some(e=>e.code==='coverage-missing-schema'&&e.schemaId===id),JSON.stringify(result.errors.filter(e=>e.schemaId===id)));return entry;}
function commit(dir){git(dir,['add','.']);execFileSync('git',['-c','user.name=Controlled test fixture','-c','user.email=fixture@localhost','commit','-qm','Controlled source boundary'],{cwd:dir,env:{...process.env,GIT_AUTHOR_DATE:'2026-01-01T00:00:00Z',GIT_COMMITTER_DATE:'2026-01-01T00:00:00Z'},stdio:'pipe'});return git(dir,['rev-parse','HEAD']).trim();}
test('exact original five rules omit untracked generated mirrors without altering bytes',t=>{
 for(const rule of expectedRules)assert.equal(rules.split('\n').filter(r=>r===rule).length,1);
 const dir=fixture(t),proof=[];
 for(const file of mirrorPaths){const original=process.env.XTEND_SHOP_PRESERVED_OUTPUT_ROOT?fs.readFileSync(path.join(process.env.XTEND_SHOP_PRESERVED_OUTPUT_ROOT,file)):runtimeBytes;put(dir,file,original);proof.push({path:file,sha256:sha(original),bytes:original.length});}
 const files=list(dir);assert.deepEqual(git(dir,['ls-files','--cached','--',...mirrorPaths]).trim(),'');
 for(const row of proof){assert.ok(!files.includes(row.path));assert.match(git(dir,['check-ignore','-v','--',row.path]),/products\/xtend-shop\/\*\*\/public\/build\//);assert.equal(sha(fs.readFileSync(path.join(dir,row.path))),row.sha256);}
 const scan=scanner.scanSchemaInventory({rootDir:dir});assert.equal(scan.entries.length,0);console.log('generated-mirror-proof '+JSON.stringify({inputs:process.env.XTEND_SHOP_PRESERVED_OUTPUT_ROOT?'preserved actual outputs':'source-derived current runtime mirrors',files:proof,observations:0}));
});
test('force-tracked declarations under all five original patterns remain observed and rejected',t=>{
 const dir=fixture(t),files=['public/build/forced.mjs','bootstrap/cache/forced.mjs','bootstrap/xtend/forced.mjs','storage/forced.mjs','data/forced.sqlite.mjs'].map(p=>'products/xtend-shop/'+p),ids=[];
 for(const [i,file] of files.entries()){const id=['xtend','rmt','shop-discovery-force-'+i,'v1'].join('.');ids.push(id);put(dir,file,declaration(id));git(dir,['add','-f','--',file]);}
 const scan=scanner.scanSchemaInventory({rootDir:dir});for(const [i,file] of files.entries()){assert.ok(list(dir).includes(file));assert.ok(occurrence(rejectedNew(scan,ids[i],dir),file));}
 console.log('force-tracked-proof '+JSON.stringify(files.map((file,i)=>({path:file,id:ids[i],observed:true,specificRejection:'coverage-missing-schema'}))));
});
test('genuine new and malicious current declarations outside patterns remain observed and rejected',t=>{
 const dir=fixture(t),proof=[];
 for(const malicious of [false,true]){const id=['xtend','rmt',malicious?'shop-discovery-malicious':'shop-discovery-new','v1'].join('.'),file='products/xtend-shop/src/'+(malicious?'malicious':'new-contract')+'.mjs';put(dir,file,declaration(id,malicious));assert.ok(list(dir).includes(file));const scan=scanner.scanSchemaInventory({rootDir:dir}),entry=rejectedNew(scan,id,dir);assert.ok(occurrence(entry,file));proof.push({path:file,id,hashes:entry.shapeFingerprints.map(f=>f.hash),specificRejection:'coverage-missing-schema'});}
 console.log('outside-live-proof '+JSON.stringify(proof));
});
test('actual installed owner guard rejects a tracked mutation even under restored patterns',t=>{
 const owner=fixture(t),core=fixture(t),file='products/xtend-shop/public/build/tracked-owner.mjs';
 put(core,'README.md','Controlled immutable Core fixture\n');const coreSha=commit(core);
 put(owner,overlay.sourcePath,runtimeBytes);put(owner,file,declaration(['xtend','rmt','shop-owner-control','v1'].join('.')));git(owner,['add','-f','--',file]);const demoSha=commit(owner);
 const target=path.join(owner,'node_modules/@ccslabs/xtend');fs.mkdirSync(path.dirname(target),{recursive:true});fs.cpSync(packageRoot,target,{recursive:true});
 const request=createRequire(path.join(owner,'package.json')),installed=request('@ccslabs/xtend/schema-inventory'),directory=path.join(root,'.candidate'),manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json')));
 // Controlled fixture SHAs only; all candidate archive/package bytes remain exact.
 manifest.coreSha=coreSha;manifest.demoSha=demoSha;put(owner,file,fs.readFileSync(path.join(owner,file),'utf8')+'// tracked mutation\n');
 assert.equal(git(owner,['diff','HEAD','--name-only']).trim(),file);let scans=0;
 assert.throws(()=>installed.verifyPair({scanner:{scanSchemaInventory(){scans++;throw Error('Must reject before scanning');}},coreRoot:core,ownerRoot:owner,manifest,directory,coreSha,demoSha}),/Owner source changed after exact checkout/);assert.equal(scans,0);
 console.log('actual-owner-guard-proof '+JSON.stringify({controlledCoreSha:coreSha,controlledDemoSha:demoSha,trackedPath:file,exception:'Owner source changed after exact checkout',productiveScanCalls:scans,candidatePackageSha256:manifest.packages.find(p=>p.name==='@ccslabs/xtend').sha256,fullInstallationOrOwnershipProof:false}));
});

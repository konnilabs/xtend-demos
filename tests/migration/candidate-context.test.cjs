'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { candidateOptions } = require('../../scripts/candidate-context.cjs');
const coreSha = '1'.repeat(40), demoSha = '2'.repeat(40), directory = '/fixture/candidates';
const options = { coreSha, demoSha, directory };
const legacy = { schema: 'xtend.product-candidates.v1', coreSha, demoSha };
const core = { schema: 'xtend.product-candidates.v2', profile: 'xtend.npm.core-only.v1', coreSha };

test('legacy candidates retain the exact paired Core and Demo identity', () => {
  assert.deepEqual(candidateOptions(legacy, options), options);
  assert.throws(() => candidateOptions(legacy, { ...options, demoSha: '3'.repeat(40) }), /paired identity/);
  assert.throws(() => candidateOptions({ ...legacy, profile: core.profile }, options), /paired identity/);
});
test('Core v2 validation receives no Demo fields while installation retains its own Demo SHA', () => {
  const original = structuredClone(options);
  assert.deepEqual(candidateOptions(core, options), { coreSha, directory, profile: core.profile });
  assert.deepEqual(options, original);
  assert.throws(() => candidateOptions(core, { ...options, demoSha: 'main' }), /SHA identity/);
});
test('wrong Core source, missing profile, mixed evidence and unknown versions fail before installation', () => {
  assert.throws(() => candidateOptions(core, { ...options, coreSha: '3'.repeat(40) }), /SHA identity/);
  for (const key of ['demoSha', 'demoRepository', 'productEvidence', 'unionEvidence'])
    assert.throws(() => candidateOptions({ ...core, [key]: null }, options), /mixed Demo fields/);
  for (const profile of [undefined, 'legacy', ''])
    assert.throws(() => candidateOptions({ ...core, profile }, options), /Exact Core candidate/);
  // Deliberate unsupported values are test inputs, not inventory declarations.
  for (const version of [0, 3, 999]) {
    const schema = ['xtend', 'product-candidates', 'v' + version].join('.');
    assert.throws(() => candidateOptions({ ...core, schema }, options), /Unsupported/);
  }
});

// Controlled producer wiring model; actual candidate bytes are checked separately
// by the installed Shop preparation command.
test('Shop PHP preparation uses the same v1/v2 identity adapter before any write', () => {
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
 const filename=path.resolve(__dirname,'../../products/xtend-shop/scripts/prepare-packages.cjs');
 for (const manifest of [legacy,core]) {
  let calls=0;
  const stop=Error('verified-before-write');
  const context={module:{exports:{}},exports:{},__dirname:path.dirname(filename),process};
  const fakeFs={readFileSync:()=>JSON.stringify(manifest),mkdirSync:()=>assert.fail('unexpected write')};
  context.require=name=>name==='node:fs'?fakeFs:name==='@ccslabs/xtend/candidate-integrity'?{verifyCandidates:(actual,opts)=>{calls++;assert.deepEqual(JSON.parse(JSON.stringify(opts)),candidateOptions(manifest,options));throw stop;}}:name.endsWith('/candidate-context.cjs')?{candidateOptions}:require(name);
  vm.runInNewContext(fs.readFileSync(filename,'utf8'),context,{filename});
  assert.throws(()=>context.module.exports.preparePackages(directory,options),error=>error===stop);assert.equal(calls,1);
  for (const bad of [{...options,coreSha:'3'.repeat(40)},{...options,demoSha:'main'}]) {
   assert.throws(()=>context.module.exports.preparePackages(directory,bad),/SHA identity/);assert.equal(calls,1);
  }
 }
});
test('standalone Shop fixture verifies candidates with adapted identity and prepares its own output',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const source=fs.readFileSync(path.resolve(__dirname,'../../products/xtend-shop/scripts/prepare-fixture.cjs'),'utf8');
 assert.match(source,/api\.verifyCandidates\(manifest,candidateOptions\(manifest,\{\.\.\.expected,directory:candidateDirectory\}\)\)/);
 assert.match(source,/preparePackages\(candidateDirectory, expected, output\)/);
});

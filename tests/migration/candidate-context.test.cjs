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

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
test('all seven original Shop PHP/Laravel lanes and explicit required FPM host survive migration',()=>{
 const source=fs.readFileSync(path.join(root,'.github/workflows/xtend-shop-host-matrix.yml'),'utf8');
 const lanes=[...source.matchAll(/- \{laravel: '(12|13)', php: '(8\.[2-5])', host: (cli|fpm), browser: (true|false)\}/g)].map(match=>match.slice(1));
 assert.deepEqual(lanes,[['12','8.2','cli','false'],['12','8.3','fpm','true'],['12','8.4','cli','false'],['12','8.5','cli','false'],['13','8.3','cli','true'],['13','8.4','cli','false'],['13','8.5','cli','false']]);
 assert.ok(source.includes('php8.3-fpm'));
 assert.ok(source.includes('XTEND_SHOP_FPM_BINARY=/usr/sbin/php-fpm8.3'));
 assert.ok(source.includes('node scripts/run-shop-host-gate.cjs "${{ matrix.host }}"'));
 assert.ok(source.includes('composer check-platform-reqs'));
 assert.ok(!source.includes('continue-on-error: true'));
 assert.ok(source.includes('scripts/prepare-ci-candidates.cjs'));
 assert.ok(source.includes('pull_request:')&&source.includes('push:')&&source.includes('schedule:'));
 const catalog=require('../../scripts/test-runner/catalog.json');assert.ok(catalog.ci.requiredSuites.includes('shop-browser-fpm'));
 for(const file of ['xtend-default-gates.yml','xtend-nightly-build.yml']){
  const workflow=fs.readFileSync(path.join(root,'.github/workflows',file),'utf8');
  assert.ok(workflow.includes('php8.4-fpm'));assert.ok(workflow.includes('XTEND_SHOP_FPM_BINARY=/usr/sbin/php-fpm8.4'));
 }
});

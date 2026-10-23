'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
test('hosted product lanes provision packaged PHP/FPM and avoid affected Composer and premature npm caching',()=>{
 for(const file of fs.readdirSync(path.join(root,'.github/workflows')).filter(file=>file.endsWith('.yml'))) {
  const raw=fs.readFileSync(path.join(root,'.github/workflows',file),'utf8');
  const source=raw.includes('uses: ./.github/workflows/xtend-default-gates.yml')?fs.readFileSync(path.join(root,'.github/workflows/xtend-default-gates.yml'),'utf8'):raw;
  for(const step of source.split(/\n      - /).filter(step=>step.includes('uses: actions/setup-node@')))assert.match(step,/package-manager-cache: false/);
  for(const step of source.split(/\n      - /).filter(step=>step.includes('uses: shivammathur\/setup-php@'))) {
   assert.match(step,/update: true/);assert.match(step,/use_package_cache: false/);assert.match(step,/composer:2\.10\.3/);
  }
  if(file==='xtend-migration-handoff.yml') {
   assert.match(source,/name: XTend Demo migration handoff prerequisites/);
   assert.ok(!source.includes('prepare-product-runtime.cjs'));
   assert.ok(!source.includes('provision-electron-sandbox.cjs'));
   assert.ok(!source.includes('prepare-browser-toolchain.cjs'));
   assert.ok(source.includes('handoffComplete:false'));
  } else assert.match(source,/node scripts\/provision-product-fpm\.cjs 8\.[34]/);
 }
});
test('all seven original Shop PHP/Laravel lanes and explicit required FPM host survive migration',()=>{
 const source=fs.readFileSync(path.join(root,'.github/workflows/xtend-shop-host-matrix.yml'),'utf8');
 const lanes=[...source.matchAll(/- \{laravel: '(12|13)', php: '(8\.[2-5])', host: (cli|fpm), browser: (true|false)\}/g)].map(match=>match.slice(1));
 assert.deepEqual(lanes,[['12','8.2','cli','false'],['12','8.3','fpm','true'],['12','8.4','cli','false'],['12','8.5','cli','false'],['13','8.3','cli','true'],['13','8.4','cli','false'],['13','8.5','cli','false']]);
 assert.ok(source.includes('node scripts/provision-product-fpm.cjs 8.3')); 

 assert.ok(source.includes('node .migration-controller/scripts/demo-functional-ci.cjs shop')&&source.includes('"${{ matrix.host }}"'));
 assert.ok(source.includes('composer check-platform-reqs'));
 assert.ok(!source.includes('continue-on-error: true'));
 assert.ok(source.includes('scripts/prepare-ci-candidates.cjs'));
 assert.ok(source.includes('pull_request:')&&source.includes('push:')&&source.includes('schedule:'));
 const catalog=require('../../scripts/test-runner/catalog.json');assert.ok(catalog.ci.requiredSuites.includes('shop-browser-fpm'));
 for(const file of ['xtend-default-gates.yml','xtend-nightly-build.yml']){
  const raw=fs.readFileSync(path.join(root,'.github/workflows',file),'utf8');const workflow=raw.includes('uses: ./.github/workflows/xtend-default-gates.yml')?fs.readFileSync(path.join(root,'.github/workflows/xtend-default-gates.yml'),'utf8'):raw;
  assert.ok(workflow.includes('node scripts/provision-product-fpm.cjs 8.4'));assert.ok(!workflow.includes('unzip php8.4-fpm')); 
 }
});

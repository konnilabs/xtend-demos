'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {startFpmProxy}=require('@ccslabs/xtend/test-support/php-fpm');
const {probeFpmRuntime}=require('../../scripts/prepare-product-runtime.cjs');
test('required real FPM pool executes PHP over FastCGI and never falls back to CLI',{timeout:30000},async t=>{
 const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'xtend-demo-fpm-contract-'));t.after(()=>fs.rmSync(fixture,{recursive:true,force:true}));
 fs.writeFileSync(path.join(fixture,'browser.php'),'<?php header("Content-Type: application/json"); echo json_encode(["sapi" => PHP_SAPI, "runtime" => PHP_VERSION]);');
 assert.match(probeFpmRuntime(),/PHP/);
 const host=await startFpmProxy({binary:process.env.XTEND_SHOP_FPM_BINARY,fixture});
 try {const response=await fetch(host.url,{signal:AbortSignal.timeout(10000)});assert.equal(response.status,200);const body=await response.json();assert.equal(body.sapi,'fpm-fcgi');assert.match(body.runtime,/^8\./);assert.equal(host.requestCount,1);}finally{await host.dispose();}
 await assert.rejects(startFpmProxy({binary:'xtend-intentionally-missing-fpm',fixture}),/ENOENT/);
});

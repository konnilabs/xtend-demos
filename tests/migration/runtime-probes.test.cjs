'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {probeRuntimeTools,probeFpmRuntime}=require('../../scripts/prepare-product-runtime.cjs');
test('required runtime probes use the supported Info-ZIP flag',()=>{
 const commands=[];
 probeRuntimeTools((command,args)=>commands.push([command,args]));
 assert.deepEqual(commands,[['php',['--version']],['composer',['--version']],['xvfb-run',['--help']],['unzip',['-v']],['curl',['--version']]]);
 const result=execFileSync('unzip',['-v'],{encoding:'utf8'});
 assert.match(result,/UnZip|unzip/i);
 assert.throws(()=>execFileSync('unzip',['--version'],{stdio:'pipe'}));
});
test('required FPM executable cannot silently fall back to PHP CLI',()=>{
 assert.throws(()=>probeFpmRuntime(''),/PHP-FPM binary missing/);
 assert.throws(()=>probeFpmRuntime('xtend-intentionally-missing-fpm'),error=>error.code==='ENOENT');
 assert.throws(()=>probeFpmRuntime(process.execPath,()=>{throw Error('FPM exit 7');}),/FPM exit 7/);
 const calls=[];assert.equal(probeFpmRuntime('/fixture/php-fpm',(binary,args)=>{calls.push([binary,args]);return 'PHP 8.3 (fpm-fcgi)\n';}),'PHP 8.3 (fpm-fcgi)');
 assert.deepEqual(calls,[['/fixture/php-fpm',['-v']]]);
});
test('a missing required runtime tool fails closed before later probes',()=>{
 const commands=[];
 assert.throws(()=>probeRuntimeTools((command,args)=>{
  commands.push(command);
  if(command==='unzip')execFileSync('xtend-intentionally-missing-unzip',args,{stdio:'pipe'});
 }),error=>error.code==='ENOENT');
 assert.deepEqual(commands,['php','composer','xvfb-run','unzip']);
});
test('nonzero required tool exit propagates instead of being accepted',()=>{
 const commands=[];
 assert.throws(()=>probeRuntimeTools((command)=>{
  commands.push(command);
  if(command==='unzip')execFileSync(process.execPath,['-e','process.exit(7)'],{stdio:'pipe'});
 }),error=>error.status===7);
 assert.deepEqual(commands,['php','composer','xvfb-run','unzip']);
});

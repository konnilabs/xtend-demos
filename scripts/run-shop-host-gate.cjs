'use strict';
const fs=require('node:fs'),path=require('node:path');
const {probeFpmRuntime}=require('./prepare-product-runtime.cjs');
const root=path.resolve(__dirname,'..');
async function runShopHostGate({mode=process.argv[2],fixture=process.env.XTEND_SHOP_FIXTURE||path.join(root,'products/xtend-shop')}={}) {
 if(!['cli','fpm'].includes(mode))throw Error('Explicit Shop host mode cli or fpm required');
 if(mode==='fpm')probeFpmRuntime();
 else if(process.env.XTEND_SHOP_FPM_BINARY)throw Error('CLI Shop lane must not inherit an FPM binary');
 const report=await require(path.join(fixture,'scripts/test.cjs')).run('browser',{reportDirectory:path.join(fixture,'storage/reports/browser-'+mode)});
 const expected=mode==='fpm'?'php-fpm-proxy':'php';
 const ssr=report.results.find(result=>result.group==='browser')?.scenarios?.find(scenario=>scenario.name==='ssr');
 if(ssr?.runtime!==expected){report.ok=false;report.hostModeError='Required actual Shop SSR runtime evidence missing or mismatched: '+expected;}
 report.hostMode=mode;
 const output=path.join(fixture,'storage/reports/xtend-store-browser-'+mode+'.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));if(!report.ok)process.exitCode=1;return report;
}
if(require.main===module)runShopHostGate().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={runShopHostGate};

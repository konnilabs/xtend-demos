'use strict';
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
function verifyInstalledHosts(root,expectedMajor) {
 if(!['12','13'].includes(expectedMajor))throw Error('Expected explicit Laravel/Illuminate major');
 function load(directory){const installed=JSON.parse(fs.readFileSync(path.join(root,directory,'vendor/composer/installed.json')));return installed.packages||installed;}
 function check(name,version,host) {
  if(!version||version.replace(/^v/,'').split('.')[0]!==expectedMajor)throw Error('Actual Shop Laravel/Illuminate major mismatch: '+host+' '+name+' '+version);
  return {name,version};
 }
 const shop=load(''),framework=shop.find(item=>item.name==='laravel/framework');
 const hosts=[{host:'shop',packages:[check('laravel/framework',framework?.version,'shop')]}];
 const provider=load('payment-provider'),adapter=provider.find(item=>item.name==='ccslabs/xtend-laravel');
 const required=Object.keys(adapter?.require||{}).filter(name=>name.startsWith('illuminate/'));
 for(const name of ['illuminate/support','illuminate/http','illuminate/contracts','illuminate/view'])if(!required.includes(name))throw Error('Installed XTend Laravel adapter requirement missing: '+name);
 const components=provider.filter(item=>item.name.startsWith('illuminate/'));
 for(const name of required)if(!components.some(item=>item.name===name))throw Error('Required Payment Provider Illuminate component missing: '+name);
 hosts.push({host:'payment-provider',required,packages:components.map(item=>check(item.name,item.version,'payment-provider'))});
 return hosts;
}
if(require.main===module)try {
 const php=execFileSync(process.env.XTEND_PHP_BINARY||'php',['-r','echo PHP_MAJOR_VERSION . "." . PHP_MINOR_VERSION;'],{encoding:'utf8',timeout:30000});
 if(php!==process.env.XTEND_EXPECTED_PHP)throw Error('Actual Shop PHP platform mismatch: '+php);
 console.log(JSON.stringify({ok:true,php,hosts:verifyInstalledHosts(process.cwd(),process.env.XTEND_EXPECTED_LARAVEL_MAJOR)}));
}catch(error){console.error(error.message);process.exitCode=1;}
module.exports={verifyInstalledHosts};

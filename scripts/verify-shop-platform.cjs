'use strict';
const fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=process.cwd();
const php=execFileSync(process.env.XTEND_PHP_BINARY||'php',['-r','echo PHP_MAJOR_VERSION . "." . PHP_MINOR_VERSION;'],{encoding:'utf8',timeout:30000});
if(php!==process.env.XTEND_EXPECTED_PHP)throw Error('Actual Shop PHP platform mismatch: '+php);
const hosts=['','payment-provider'].map(directory=>{
 const installed=JSON.parse(fs.readFileSync(path.join(root,directory,'vendor/composer/installed.json')));
 const version=installed.packages.find(item=>item.name==='laravel/framework')?.version;
 if(!version||version.replace(/^v/,'').split('.')[0]!==process.env.XTEND_EXPECTED_LARAVEL_MAJOR)throw Error('Actual Shop Laravel major mismatch: '+directory+' '+version);
 return {host:directory||'shop',version};
});
console.log(JSON.stringify({ok:true,php,hosts}));

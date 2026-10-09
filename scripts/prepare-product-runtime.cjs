'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const {digest}=require('@ccslabs/xtend/candidate-integrity');
const root=path.resolve(__dirname,'..');
function run(command,args,cwd=root){execFileSync(command,args,{cwd,stdio:'inherit',timeout:600000});}
function probeRuntimeTools(execute=run) {
 // Info-ZIP uses -v; --version exits nonzero on the supported Linux runners.
 for(const [command,args] of [['php',['--version']],['composer',['--version']],['xvfb-run',['--help']],['unzip',['-v']],['curl',['--version']]])execute(command,args);
}
function probeFpmRuntime(binary=process.env.XTEND_SHOP_FPM_BINARY,execute=execFileSync) {
 if(!binary)throw Error('Required Shop PHP-FPM binary missing: set XTEND_SHOP_FPM_BINARY to the provisioned executable');
 return execute(binary,['-v'],{encoding:'utf8',timeout:30000}).split('\n')[0];
}
function prepareRuntime() {
 if(process.platform!=='linux'||process.arch!=='x64')throw Error('Required product runtime provisioning currently supports Linux x64');
 probeRuntimeTools();
 const fpm=probeFpmRuntime();
 const electronRoot=path.dirname(require.resolve('../products/xtend-llm/node_modules/electron/package.json'));
 const version=JSON.parse(fs.readFileSync(path.join(electronRoot,'package.json'))).version;
 const artifact='electron-v'+version+'-linux-x64.zip',expected=require(path.join(electronRoot,'checksums.json'))[artifact];
 if(!expected)throw Error('Missing official checksum for locked Electron runtime');
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'xtend-electron-'));
 try {
  const zip=path.join(temporary,artifact);run('curl',['--fail','--location','--silent','--show-error','https://github.com/electron/electron/releases/download/v'+version+'/'+artifact,'--output',zip]);
  if(digest(fs.readFileSync(zip))!==expected)throw Error('Official Electron checksum mismatch');
  run('unzip',['-q','-o',zip,'-d',path.join(electronRoot,'dist')]);fs.writeFileSync(path.join(electronRoot,'path.txt'),'electron');
 }finally{fs.rmSync(temporary,{recursive:true,force:true});}
 const shop=path.join(root,'products/xtend-shop');
 run(process.execPath,['scripts/prepare-packages.cjs'],shop);
 for(const directory of [shop,path.join(shop,'payment-provider')])run('composer',['install','--no-interaction','--no-progress','--prefer-dist'],directory);
 run('php',['scripts/setup.php'],shop);
 return {ok:true,electron:version,php:execFileSync('php',['--version'],{encoding:'utf8'}).split('\n')[0],fpm};
}
if(require.main===module)try{console.log(JSON.stringify(prepareRuntime()));}catch(error){console.error(error.message);process.exitCode=1;}
module.exports={prepareRuntime,probeRuntimeTools,probeFpmRuntime};

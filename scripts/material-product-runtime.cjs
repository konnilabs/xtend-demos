'use strict';
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
function loadMaterialProductRuntime(productRoot){
 const root=fs.realpathSync(productRoot),manifest=JSON.parse(fs.readFileSync(path.join(root,'package.json'))),request=createRequire(path.join(root,'package.json'));
 const maraca='@ccslabs/xtend-maraca',adapter='@xtend-material/maraca-tailwind';
 for(const name of [maraca,adapter])if(typeof manifest.dependencies?.[name]!=='string')throw Error('Material product must directly declare '+name);
 function local(resolve,name){
  const expected=path.join(root,'node_modules',...name.split('/'));
  if(!fs.existsSync(expected)||fs.realpathSync(expected)!==expected)throw Error('Material dependency must resolve from exact product-local installation: '+name);
  const file=resolve(name),real=fs.realpathSync(file);
  if(!real.startsWith(expected+path.sep))throw Error('Material dependency must resolve from exact product-local installation: '+name);
  return file;
 }
 const maracaFile=local(request.resolve,maraca);
 local(createRequire(maracaFile).resolve,adapter);
 return request(maraca);
}
module.exports={loadMaterialProductRuntime};

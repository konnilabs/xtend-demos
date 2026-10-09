const path=require('node:path');const {createSuiteContext}=require('../utils/assertions');const {readJson}=require('../utils/files');const PUBLIC_ENGINE='>=24';
function runProductNodeHost({rootDir=path.resolve(__dirname,'../..')}={}) {const context=createSuiteContext({id:'product-node-host'});
  const llmLock = readJson('products/xtend-llm/package-lock.json', rootDir);
  context.assert(
    llmLock.packages && llmLock.packages[''] && llmLock.packages[''].engines
      && llmLock.packages[''].engines.node === PUBLIC_ENGINE,
    'XTend LLM lock root mirrors its Node >=24 host contract'
  );
 for(const product of ['rmt-animation-testbench','xtend-material-workbench','xtend-llm']){const manifest=readJson('products/'+product+'/package.json',rootDir);context.assert(manifest.engines?.node===PUBLIC_ENGINE,product+' keeps Node >=24');}return context.result();}
module.exports={runProductNodeHost};

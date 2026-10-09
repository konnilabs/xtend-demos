'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),pin=require('../candidate-source.lock.json');
const expectedUrl='https://github.com/konnilabs/xtend.git';
if(pin.repository!==expectedUrl||!/^[a-f0-9]{40}$/.test(pin.coreSha))throw Error('Exact immutable Core source pin required');
const demoSha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
if(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:root,encoding:'utf8'}).trim())throw Error('Demo checkout must be clean');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'xtend-ci-core-')),source=path.join(temporary,'core'),output=path.join(root,'.candidate-source');
try {
 execFileSync('git',['init',source],{stdio:'pipe'});
 execFileSync('git',['remote','add','origin',expectedUrl],{cwd:source});
 execFileSync('git',['fetch','--depth=1','origin',pin.coreSha],{cwd:source,stdio:'pipe'});
 execFileSync('git',['checkout','--detach',pin.coreSha],{cwd:source,stdio:'pipe'});
 if(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim()!==pin.coreSha)throw Error('Pinned Core source SHA mismatch');
 if(!fs.existsSync(path.join(source,'scripts/product-candidate-canary.cjs')))throw Error('Pinned Core lacks required public Candidate API; initial Demo merge blocked');
 execFileSync('npm',['ci','--ignore-scripts','--no-audit','--no-fund'],{cwd:source,stdio:'inherit'});
 execFileSync(process.execPath,['scripts/product-candidate-canary.cjs','--pack-only','--demo-sha',demoSha,'--out',output],{cwd:source,stdio:'inherit'});
 execFileSync(process.execPath,['scripts/install-candidates.cjs',output,pin.coreSha,demoSha],{cwd:root,stdio:'inherit'});
 execFileSync(process.execPath,['scripts/verify-schema-ownership.cjs',source,output,pin.coreSha,demoSha],{cwd:root,stdio:'inherit'});
 if(process.env.GITHUB_ENV)fs.appendFileSync(process.env.GITHUB_ENV,`XTEND_CORE_SHA=${pin.coreSha}\nXTEND_DEMO_SHA=${demoSha}\n`);
} finally {fs.rmSync(temporary,{recursive:true,force:true});}

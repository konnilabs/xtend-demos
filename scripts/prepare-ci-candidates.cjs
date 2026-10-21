'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),pin=require('../candidate-source.lock.json');
const expectedUrl='https://github.com/konnilabs/xtend.git';
if(pin.repository!==expectedUrl||!/^[a-f0-9]{40}$/.test(pin.coreSha))throw Error('Exact immutable Core source pin required');
const demoSha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
if(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:root,encoding:'utf8'}).trim())throw Error('Demo checkout must be clean');
const temporary=path.join(root,'.schema-audit'),source=path.join(temporary,'core'),output=path.join(root,'.candidate-source');
if(fs.existsSync(temporary))throw Error('Fresh independent audit checkout required');
fs.mkdirSync(temporary);
let prepared=false;
try {
 execFileSync('git',['init',source],{stdio:'pipe'});
 execFileSync('git',['remote','add','origin',expectedUrl],{cwd:source});
 execFileSync('git',['fetch','--depth=1','origin',pin.coreSha],{cwd:source,stdio:'pipe'});
 execFileSync('git',['checkout','--detach',pin.coreSha],{cwd:source,stdio:'pipe'});
 if(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim()!==pin.coreSha)throw Error('Pinned Core source SHA mismatch');
 if(!fs.existsSync(path.join(source,'scripts/pack-candidates.cjs'))||!fs.existsSync(path.join(source,'tools/schema-inventory/source-audit.cjs')))throw Error('Pinned Core lacks required Candidate and independent audit APIs; initial Demo merge blocked');
 execFileSync('npm',['ci','--ignore-scripts','--no-audit','--no-fund'],{cwd:source,stdio:'inherit'});
 execFileSync(process.execPath,['-e',"require('./scripts/pack-candidates.cjs').packCandidates({profile:'xtend.npm.core-only.v1',output:process.argv[1]})",output],{cwd:source,stdio:'inherit'});
 execFileSync(process.execPath,['scripts/install-candidates.cjs',output,pin.coreSha,demoSha],{cwd:root,stdio:'inherit'});
 execFileSync(process.execPath,['scripts/verify-schema-ownership.cjs',source,output,pin.coreSha,demoSha],{cwd:root,stdio:'inherit'});
 prepared=true;
 if(process.env.GITHUB_ENV)fs.appendFileSync(process.env.GITHUB_ENV,`XTEND_CORE_SHA=${pin.coreSha}\nXTEND_DEMO_SHA=${demoSha}\n`);
} finally {if(!prepared)fs.rmSync(temporary,{recursive:true,force:true});}
// Retain the pinned private checkout for subsequent discovery tests. It is not a runtime dependency.

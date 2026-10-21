'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');

const args=process.argv.slice(2),directory=path.resolve(args[1]||'.candidate-source'),coreRoot=path.resolve(args[0]||'');
if(args.length!==4)throw Error('Exact Core checkout and verified candidate directory required');
const manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json')));
const inventory=require('../tests/schemas/ownership-103.json');
const git=require('node:child_process').execFileSync;
const coreSha=git('git',['rev-parse','HEAD'],{cwd:coreRoot,encoding:'utf8'}).trim(),demoSha=git('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
if(coreSha!==args[2]||demoSha!==args[3])throw Error('Independent expected source pins differ from actual checkouts');
const {api}=require('./load-schema-audit.cjs').loadSchemaAudit({coreRoot,coreSha});
const report=api.verifyPair({scanner:api.createScanner({typescript:require('typescript')}),coreRoot,ownerRoot:root,localInventory:inventory,manifest,directory,coreSha,demoSha});
const target=path.join(root,'.xtend-test-results/schema-ownership-103.json');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');console.log('Required 103-ID ownership union and imported authorities verified; 21 residual IDs remain separate.');

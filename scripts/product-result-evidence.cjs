'use strict';
const fs=require('node:fs');
function skippedOutcomes(value,location='report') {
 const found=[];if(!value||typeof value!=='object')return found;
 if(Array.isArray(value))return value.flatMap((item,index)=>skippedOutcomes(item,location+'['+index+']'));
 for(const [key,item] of Object.entries(value)) {
  if(['skips','skipped','deferred'].includes(key)&&((Array.isArray(item)&&item.length)||(typeof item==='number'&&item>0)||item===true))found.push(location+'.'+key+': '+JSON.stringify(item));
  else if(key==='status'&&['skipped','deferred','not-run','unavailable'].includes(item))found.push(location+': '+item);
  if(item&&typeof item==='object')found.push(...skippedOutcomes(item,location+'.'+key));
 }
 return found;
}
function evaluateResult({stdout='',stderr='',status,error,reports=[],startedAt}) {
 const text=stdout+'\n'+stderr,skips=[];for(const line of text.split('\n'))if(/#\s*SKIP\b|^\s*(?:#\s*)?skip\s*[-:]|^\s*(?:#\s*skipped|ℹ skipped)\s+[1-9]/i.test(line))skips.push(line.trim());
 const sources=[],failures=[];
 for(const file of reports) {
  if(!fs.existsSync(file)){failures.push('Missing required runtime report: '+file);continue;}
  if(fs.statSync(file).mtimeMs<startedAt){failures.push('Stale runtime report: '+file);continue;}
  const result=JSON.parse(fs.readFileSync(file));sources.push({file,result});skips.push(...skippedOutcomes(result,file));
  if(result.ok!==true||result.status==='failed'||result.failures?.length)failures.push('Failed runtime report: '+file);
 }
 return {status:status===0&&!error&&!skips.length&&!failures.length?'passed':'failed',skips,failures,sources};
}
module.exports={evaluateResult,skippedOutcomes};

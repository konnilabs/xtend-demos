'use strict';
// Annotations contain only fixed stage enums and numeric failure codes.
const stages=Object.freeze(['platform','tools','php','identity','live-policy','download','checksum','validation','extract','helper-install','probe','receipt']);
const reported=new WeakSet();
function annotate(stage,error,write=line=>console.error(line)) {
 try {
  if(process.env.GITHUB_ACTIONS!=='true')return;
  if(error&&(typeof error==='object'||typeof error==='function')){if(reported.has(error))return;reported.add(error);}
  const value=error&&(typeof error==='object'||typeof error==='function')?Object.getOwnPropertyDescriptor(error,'status')?.value:undefined;
  const code=Number.isInteger(value)&&value>0&&value<=255?value:1;
  write('::error::runtime-preparation stage='+ (stages.includes(stage)?stage:'validation')+' exit='+code);
 }catch{ /* Observability must never replace the original failure. */ }
}
function relay(stderr,write=line=>console.error(line)) {
 // Core captures the Demo subprocess output. Relay only this closed grammar.
 for(const line of typeof stderr==='string'?stderr.split(/\r?\n/):[]) {
  const match=/^::error::runtime-preparation stage=([a-z-]+) exit=([1-9][0-9]{0,2})$/.exec(line);
  if(match&&stages.includes(match[1])&&Number(match[2])<=255)try{write('::error::runtime-preparation stage='+match[1]+' exit='+Number(match[2]));}catch{}
 }
}
module.exports={annotate,relay,stages};

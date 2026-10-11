'use strict';
// Annotations contain only fixed stage enums and numeric failure codes.
const stages=Object.freeze(['platform','tools','php','identity','live-policy','download','checksum','checksum-preflight','checksum-copied','checksum-unarmed','checksum-armed','validation','extract','helper-install','probe','receipt']);
const preflightReasons=Object.freeze(["epf-runner-context","epf-app-context","epf-runtime-override","epf-sandbox-option","epf-ancestor-missing","epf-ancestor-type","epf-ancestor-owner-mode","epf-destination-identity","epf-destination-existing","epf-archive-digest","epf-archive-path","epf-archive-type","epf-archive-mode","epf-archive-duplicate","epf-archive-required"]);
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
  const match=/^::error::runtime-preparation stage=([a-z-]+)(?: reason=([a-z-]+))? exit=([1-9][0-9]{0,2})$/.exec(line);
  if(match&&stages.includes(match[1])&&Number(match[3])<=255&&(!match[2]||(match[1]==='checksum-preflight'&&preflightReasons.includes(match[2]))))try{write('::error::runtime-preparation stage='+match[1]+(match[2]?' reason='+match[2]:'')+' exit='+Number(match[3]));}catch{}
 }
}
module.exports={annotate,relay,stages,preflightReasons};

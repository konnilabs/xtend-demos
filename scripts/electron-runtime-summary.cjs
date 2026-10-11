'use strict';
const {observeEntryStream}=require('../products/xtend-llm/scripts/entry-load-diagnostics.cjs');
const {observeR001Stream}=require('../products/xtend-llm/scripts/r001-diagnostics.cjs');
const fs=require('node:fs');
const {observeSmokeFailures}=require('../products/xtend-llm/scripts/smoke-failure-diagnostics.cjs');
const {stages,relayLaunchStages}=require('../products/xtend-llm/scripts/actual-launch-diagnostics.cjs');
const format1Stages=Object.freeze(['prelaunch-guard','build','launch-resolve','launch','module-load','main-start','app-ready','server','window','load','preload-ipc','renderer-check','runtime-identity','source-identity','report-write']);
function assertFormat1Stages(){
 if(!Array.isArray(stages)||stages.length!==format1Stages.length||format1Stages.some((stage,index)=>stages[index]!==stage))throw new Error('Invalid format=1 producer stage mapping');
}
const signals=Object.freeze(['SIGTERM','SIGKILL','SIGINT','SIGABRT','SIGSEGV','SIGHUP','SIGPIPE','SIGBUS','SIGILL','SIGFPE','SIGQUIT']);
// Observed marker sets only: no chronology, source authenticity or pass claim.
function observeStream(captured){
 const entry=Array(format1Stages.length).fill('0'),error=Array(format1Stages.length).fill('0');
 relayLaunchStages(captured,line=>{
  const match=/stage=([a-z-]+) code=([01])\n$/.exec(line);
  (match[2]==='0'?entry:error)[format1Stages.indexOf(match[1])]='1';
 });
 return {entry:entry.join(''),error:error.join('')};
}
function buildRuntimeSummary(result,thrown=false){
 assertFormat1Stages();
 const stdout=observeStream(result?.stdout),stderr=observeStream(result?.stderr);
 const stdoutFailure=observeSmokeFailures(result?.stdout),stderrFailure=observeSmokeFailures(result?.stderr);
 const out=stdout.entry.includes('1')||stdout.error.includes('1'),err=stderr.entry.includes('1')||stderr.error.includes('1');
 return {command:thrown?'spawn-throw':result?.error?'spawn-error':result?.status===0?'completed':'child-failed',
  exit:Number.isInteger(result?.status)&&result.status>=-2147483648&&result.status<=2147483647?String(result.status):'none',
  signal:result?.signal==null?'none':signals.includes(result.signal)?result.signal:'other',
  entryStdout:observeEntryStream(result?.stdout),entryStderr:observeEntryStream(result?.stderr),
  r001Stdout:observeR001Stream(result?.stdout),r001Stderr:observeR001Stream(result?.stderr),
  stdoutFailure,stderrFailure,diagnostic:stdoutFailure.includes('1')||stderrFailure.includes('1')?'observed':'none',
  markers:out&&err?'both':out?'stdout':err?'stderr':'none',stdout,stderr};
}
function emitRuntimeSummary(result,thrown=false,writer=line=>fs.writeSync(2,line)){
 // Entire diagnostic path is best effort; thrown identities and results survive.
 try{
  const s=buildRuntimeSummary(result,thrown);
  writer(`::${s.command==='completed'?'notice':'error'}::electron-runtime-summary format=1 command=${s.command} exit=${s.exit} signal=${s.signal} markers=${s.markers} stdout_entry=${s.stdout.entry} stdout_error=${s.stdout.error} stderr_entry=${s.stderr.entry} stderr_error=${s.stderr.error} diagnostic_format=1 diagnostic=${s.diagnostic} stdout_failure=${s.stdoutFailure} stderr_failure=${s.stderrFailure} r001_format=1 r001_stdout=${s.r001Stdout} r001_stderr=${s.r001Stderr} entry_format=1 entry_stdout=${s.entryStdout} entry_stderr=${s.entryStderr}\n`);
 }catch{/* Diagnostic transport/reduction never alters authoritative execution. */}
}
module.exports={format1Stages,buildRuntimeSummary,emitRuntimeSummary};

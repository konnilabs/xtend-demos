'use strict';
const fs=require('node:fs');
const states=Object.freeze(['loading','interactive','complete','unknown']);
const timeout=/^xtend-r001-timeout format=1 transcript=([01]) sidepanel=([01]) ready=(loading|interactive|complete|unknown)$/;
function parseTimeout(message){
 if(typeof message!=='string')return null;
 const m=timeout.exec(message);
 return m&&m[0]===message?{transcript:m[1],sidepanel:m[2],ready:m[3]}:null;
}
function loadState(contents){try{return contents.isLoadingMainFrame()?'1':'0';}catch{return 'unknown';}}
async function observeR001(contents,operation,writer=line=>fs.writeSync(2,line)){
 let snapshot=null,attached=false;
 const listener=event=>{try{const value=parseTimeout(event.message);if(value&&!snapshot)snapshot=value;}catch{}};
 try{contents.on('console-message',listener);attached=true;}catch{}
 try{return await operation();}
 catch(error){
  try{
   const s=snapshot;
   writer('xtend-r001 format=1 code='+(s?'timeout-observed':'rejection-unclassified')+
    ' transcript='+(s?s.transcript:'unknown')+' sidepanel='+(s?s.sidepanel:'unknown')+
    ' ready='+(s?s.ready:'unknown')+' loading='+loadState(contents)+'\n');
  }catch{}
  throw error;
 }finally{try{if(attached)contents.removeListener('console-message',listener);}catch{}}
}
const tuples=Object.freeze([...['0','1'].flatMap(t=>['0','1'].flatMap(s=>states.flatMap(r=>['0','1','unknown'].map(l=>'timeout-observed:'+t+':'+s+':'+r+':'+l)))),...['0','1','unknown'].map(l=>'rejection-unclassified:unknown:unknown:unknown:'+l)]);
function observeR001Stream(captured){
 const observations=Array(tuples.length).fill('0');
 for(const line of typeof captured==='string'?captured.split('\n'):[]){
  const m=/^xtend-r001 format=1 code=(timeout-observed|rejection-unclassified) transcript=([01]|unknown) sidepanel=([01]|unknown) ready=(loading|interactive|complete|unknown) loading=([01]|unknown)$/.exec(line);
  if(!m||m[0]!==line)continue;
  if(m[1]==='rejection-unclassified'&&m.slice(2,5).some(x=>x!=='unknown'))continue;
  if(m[1]==='timeout-observed'&&(m[2]==='unknown'||m[3]==='unknown'))continue;
  const index=tuples.indexOf(m.slice(1).join(':'));
  if(index>=0)observations[index]='1';
 }
 // Frozen 51-bit tuple set; no chronology or authentication claim.
 return observations.includes('1')?observations.join(''):'none';
}
module.exports={tuples,states,parseTimeout,observeR001,observeR001Stream};

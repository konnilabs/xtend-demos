'use strict';
const fs=require('node:fs');
const ids=Object.freeze(['E001','E002']);
const channel='xtend-llm:entry-observation';
function installEntryObserver(ipc,window,trusted,writer=line=>fs.writeSync(2,line)){
 const seen=new Set();
 function receive(event,id){try{if(!ids.includes(id)||!trusted(event)||seen.has(id))return;seen.add(id);writer('xtend-entry format=1 id='+id+'\n');}catch{}}
 function dispose(){try{ipc.removeListener(channel,receive);}catch{}}
 try{ipc.on(channel,receive);window.once('closed',dispose);}catch{dispose();}
 return dispose;
}
function observeEntryStream(captured){const mask=['0','0'];for(const line of typeof captured==='string'?captured.split('\n'):[]){const m=/^xtend-entry format=1 id=(E001|E002)$/.exec(line);if(m&&m[0]===line)mask[ids.indexOf(m[1])]='1';}return mask.includes('1')?mask.join(''):'none';}
module.exports={ids,channel,installEntryObserver,observeEntryStream};

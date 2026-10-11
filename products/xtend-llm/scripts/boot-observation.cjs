'use strict';
const fs=require('node:fs');
const ids=Object.freeze(["B000", "B001", "B002", "B003", "B004", "B005", "B006", "B007", "B008", "B101", "B102", "B103", "B104", "B105", "B106", "B107", "B108"]);
const channel='xtend-llm:boot-observation';
function installBootObserver(ipc,window,trusted,writer=line=>fs.writeSync(2,line)){
 const seen=new Set();
 function receive(event,id){try{if(!ids.includes(id)||!trusted(event)||seen.has(id))return;seen.add(id);writer('xtend-boot format=1 id='+id+'\n');}catch{}}
 function dispose(){try{ipc.removeListener(channel,receive);}catch{}}
 try{ipc.on(channel,receive);window.once('closed',dispose);}catch{dispose();}
 return dispose;
}
function observeBootStream(captured){const mask=ids.map(()=> '0');for(const line of typeof captured==='string'?captured.split('\n'):[]){const m=/^xtend-boot format=1 id=(B000|B00[1-8]|B10[1-8])$/.exec(line);if(m&&m[0]===line)mask[ids.indexOf(m[1])]='1';}return mask.includes('1')?mask.join(''):'none';}
module.exports={ids,channel,installBootObserver,observeBootStream};

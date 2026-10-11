'use strict';
const fs=require('node:fs');
const ids=Object.freeze(["B000", "B001", "B002", "B003", "B004", "B005", "B006", "B007", "B008", "B101", "B102", "B103", "B104", "B105", "B106", "B107", "B108"]);
const reasonIds=Object.freeze(["L001", "L002", "L003", "L004", "L005", "L006", "L007", "L008", "L009", "L010", "L011", "L012", "L013", "L014", "L015", "L016", "L017", "L018", "L019", "L020", "L021", "L022", "L023", "V001", "V002", "V003", "V004", "V005", "V006", "V007", "V008", "V009", "V010", "V011", "V012", "V013", "V014", "V015", "V016", "V017", "V018", "U000"]);
const reasonIdsV2=Object.freeze(["L001", "L002", "L003", "L004", "L005", "L006", "L007", "L008", "L009", "L010", "L011", "L012", "L013", "L014", "L015", "L016", "L017", "L018", "L019", "L020", "L021", "L022", "L023", "V001", "V002", "V003", "V004", "V005", "V006", "V007", "V008", "V009", "V010", "V011", "V012", "V013", "V014", "V015", "V016", "V017", "V018", "J001", "J002", "Q001", "Q002", "Q003", "Q004", "Q005", "Q006", "Q007", "Q008"]);
const reasonChannelV2='xtend-llm:boot-reason-v2';
const reasonChannel='xtend-llm:boot-reason';
const channel='xtend-llm:boot-observation';
function installBootObserver(ipc,window,trusted,writer=line=>fs.writeSync(2,line)){
 const seen=new Set();
 function receive(event,id){try{if(!ids.includes(id)||!trusted(event)||seen.has(id))return;seen.add(id);writer('xtend-boot format=1 id='+id+'\n');}catch{}}
 function reason(event,id){try{if(!reasonIds.includes(id)||!trusted(event)||seen.has(id))return;seen.add(id);writer('xtend-reason format=1 id='+id+'\n');}catch{}}
 function reasonV2(event,id){try{if(!reasonIdsV2.includes(id)||!trusted(event)||seen.has('v2:'+id))return;seen.add('v2:'+id);writer('xtend-reason format=2 id='+id+'\n');}catch{}}
 function dispose(){try{ipc.removeListener(reasonChannelV2,reasonV2);}catch{}try{ipc.removeListener(reasonChannel,reason);}catch{}try{ipc.removeListener(channel,receive);}catch{}}
 try{ipc.on(channel,receive);ipc.on(reasonChannel,reason);ipc.on(reasonChannelV2,reasonV2);window.once('closed',dispose);}catch{dispose();}
 return dispose;
}
function observeBootStream(captured){const mask=ids.map(()=> '0');for(const line of typeof captured==='string'?captured.split('\n'):[]){const m=/^xtend-boot format=1 id=(B000|B00[1-8]|B10[1-8])$/.exec(line);if(m&&m[0]===line)mask[ids.indexOf(m[1])]='1';}return mask.includes('1')?mask.join(''):'none';}
function observeReasonStream(captured){const mask=reasonIds.map(()=> '0');for(const line of typeof captured==='string'?captured.split('\n'):[]){const m=/^xtend-reason format=1 id=(L00[1-9]|L01[0-9]|L02[0-3]|V00[1-9]|V01[0-8]|U000)$/.exec(line);if(m&&m[0]===line)mask[reasonIds.indexOf(m[1])]='1';}return mask.includes('1')?mask.join(''):'none';}
function observeReasonStreamV2(captured){const mask=reasonIdsV2.map(()=> '0');for(const line of typeof captured==='string'?captured.split('\n'):[]){const m=/^xtend-reason format=2 id=(L00[1-9]|L01[0-9]|L02[0-3]|V00[1-9]|V01[0-8]|J00[12]|Q00[1-8])$/.exec(line);if(m&&m[0]===line)mask[reasonIdsV2.indexOf(m[1])]='1';}return mask.includes('1')?mask.join(''):'none';}
module.exports={reasonIdsV2,reasonChannelV2,observeReasonStreamV2,reasonIds,reasonChannel,observeReasonStream,ids,channel,installBootObserver,observeBootStream};

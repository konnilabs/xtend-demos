'use strict';
const fs=require('node:fs');
const ids=Object.freeze(["A001","A002","A003","A004","A005","A006","A007","A008","A009","A010","A011","A012","A013","A014","A015","A016","A017","A018","A019","A020","A021","A022","A023","A024","A025","A026","A027","A028","A029","A030","A031","A032","A033","A034","A035","A036","A037","A038","A039","A040","A041","A042","A043","A044","A045","A046","A047","A048","A049","A050","A051","A052","A053","A054","A055","A056","A057","A058","A059","A060","A061","A062","A063","A064","A065","A066","A067","A068","A069","A070","A071","A072","A073","A074","A075","A076","A077","A078","A079","A080","A081","A082","A083","A084","A085","A086","A087","A088","A089","A090","A091","A092","A093","A094","A095","A096","A097","A098","A099","A100","A101","A102","A103","A104","A105","A106","A107","A108","A109","A110","A111","A112","A113","A114","A115","A116","A117","A118","A119","A120","A121","A122","A123","A124","A125","A126","A127","A128","A129","A130","A131","A132","A133","A134","A135","A136","R001","R002","R003","R004","R005","R006","R007","R008","R009","R010","R011","R012","R013","R014","R015","P001","P002","P003","P004","P005","P006","P007","P008","C001","C002","C003","C004"]);
function emitSmokeFailure(id,writer=line=>fs.writeSync(2,line)){
 // Closed source-bound IDs only; transport never replaces the original result/error.
 try{if(ids.includes(id))writer('xtend-smoke-failure format=1 id='+id+'\n');}catch{}
}
function observeSmokeFailures(captured){
 const mask=Array(ids.length).fill('0');
 for(const line of typeof captured==='string'?captured.split('\n'):[]){
  const match=/^xtend-smoke-failure format=1 id=([ARPC][0-9]{3})$/.exec(line);
  if(match&&match[0]===line&&ids.includes(match[1]))mask[ids.indexOf(match[1])]='1';
 }
 return mask.join('');
}
module.exports={ids,emitSmokeFailure,observeSmokeFailures};

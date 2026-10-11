'use strict';
const fs=require('node:fs');
function emitActualAppOutcome({reportPresent,verified}, write=line=>fs.writeSync(2,line)) {
 if(typeof reportPresent!=='boolean'||typeof verified!=='boolean'||(verified&&!reportPresent))throw Error('Invalid fixed actual-app outcome');
 try { write(`::${verified?'notice':'error'}::electron-actual-app-attestation report=${reportPresent?'present':'missing'} verification=${verified?'passed':'failed'}\n`); } catch { /* Annotations never block retained records or reports. */ }
}
module.exports={emitActualAppOutcome};

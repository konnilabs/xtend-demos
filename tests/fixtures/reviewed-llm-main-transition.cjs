'use strict';
// Test-only reconstruction of the frozen diagnostic baseline. Every current byte
// and each reviewed transition is bound; unrelated changes cannot be normalized.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const raw=fs.readFileSync(path.join(__dirname,'reviewed-llm-main-transition.json'),'utf8');
assert.equal(sha(raw),'071c40694c633178eaedc64f57be67e1437f93263cedc45fe24919e739f41687');
const transition=JSON.parse(raw);
function restoreHistoricalMain(source) {
 assert.equal(sha(source),transition.currentSha256,'Unreviewed current main bytes');
 let result=source;
 for(const hunk of transition.hunks) {
  assert.equal(result.split(hunk.after).length,2,'Missing/ambiguous reviewed transition');
  result=result.replace(hunk.after,hunk.before);
 }
 assert.equal(sha(result),transition.baselineSha256,'Historical main reconstruction mismatch');
 return result;
}
module.exports={restoreHistoricalMain};

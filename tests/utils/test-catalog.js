'use strict';
const catalog=require('../../scripts/test-runner/catalog.json');
module.exports={resolveManifestProfiles:manifest=>manifest,readRunnerCatalog:()=>({hasSuite:id=>catalog.suites.some(s=>s.id===id)}),workflowHasScript:(text,name)=>text.includes(name)};

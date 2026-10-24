'use strict';
const path=require('node:path');
const {createSuiteContext}=require('../utils/assertions');
const {createMaracaBuildPlan}=require('@ccslabs/xtend-maraca');
function runProductBoundarySuite({rootDir=path.resolve(__dirname,'../..')}={}) {
 const context=createSuiteContext({id:'product-business-ui-boundary'});
 const plan=createMaracaBuildPlan({config:'maraca.config.json'},{rootDir:path.join(rootDir,'products/xtend-material-workbench')});
 const summary=plan.orchestration?.summary||{};
 const migration={businessRecords:{stateCount:summary.stateCount||0,actionCount:summary.actionCount||0,surfaceCount:summary.surfaceCount||0}};
 context.assert(migration.businessRecords.stateCount >= 15 && migration.businessRecords.actionCount >= 3 && migration.businessRecords.surfaceCount >= 15, 'migration proof retains substantial state, action and surface records');
 return context.result();
}
module.exports={runProductBoundarySuite};

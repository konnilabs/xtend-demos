'use strict';
const path=require('node:path');
const {createSuiteContext}=require('../utils/assertions');
const {readText}=require('../utils/files');
const XSCALER_PREFLIGHT_RESPONSE_SCHEMA='xtend.xscaler.preflight-response.v1';
const XSCALER_ATC_HANDOFF_SCHEMA='xtend.xscaler.atc-handoff.v1';
const OLD_TESTBENCH_SCHEMAS=['xtend.xscaler.protocol-'+'lazy-preflight.v1','xtend.xscaler.atc-'+'lazy-surface.v1'];
const TESTBENCH_SHARED='products/rmt-animation-testbench/src/shared/testbench-data.mjs';
const TESTBENCH_SERVER='products/rmt-animation-testbench/server/index.mjs';
const TESTBENCH_CLIENT='products/rmt-animation-testbench/src/client/testbench-controller.mjs';
function validateTestbenchDriftGuards(context, rootDir) {
  const files = [
    'products/rmt-animation-testbench/src/shared/testbench-data.mjs',
    'products/rmt-animation-testbench/server/index.mjs',
    'products/rmt-animation-testbench/src/client/testbench-controller.mjs',
    'products/rmt-animation-testbench/scripts/verify.mjs',
    'products/rmt-animation-testbench/scripts/browser-smoke.mjs'
  ];
  const combined = files.map((file) => readText(file, rootDir)).join('\n');
  OLD_TESTBENCH_SCHEMAS.forEach((schema) => {
    context.assert(!combined.includes(schema), `Testbench no longer references old schema ${schema}`);
  });
  context.assert(combined.includes(XSCALER_PREFLIGHT_RESPONSE_SCHEMA), 'Testbench references canonical preflight response schema');
  context.assert(combined.includes(XSCALER_ATC_HANDOFF_SCHEMA), 'Testbench references canonical ATC handoff schema');
  context.assert(combined.includes('accepted: true'), 'Testbench emits accepted preflight alias');
  context.assert(combined.includes('ok: true'), 'Testbench keeps ok compatibility alias');
}

function validateTestbenchEvidence(context, rootDir) {
  const shared = readText(TESTBENCH_SHARED, rootDir);
  const server = readText(TESTBENCH_SERVER, rootDir);
  const client = readText(TESTBENCH_CLIENT, rootDir);

  context.assert(shared.includes(XSCALER_PREFLIGHT_RESPONSE_SCHEMA), 'Testbench shared data uses canonical preflight response schema');
  context.assert(shared.includes(XSCALER_ATC_HANDOFF_SCHEMA), 'Testbench shared data uses canonical ATC handoff schema');
  context.assert(shared.includes('accepted: true') && shared.includes('ok: true'), 'Testbench preflight keeps accepted/ok compatibility');
  context.assert(server.includes('/api/xscaler/preflight'), 'Testbench server exposes XScaler preflight endpoint');
  context.assert(server.includes('/api/lazy-surface/'), 'Testbench server exposes lazy-surface endpoint');
  context.assert(client.includes('/api/xscaler/preflight') && client.includes('/api/lazy-surface/'), 'Testbench client gates lazy surface loading through preflight');
}

function runXScalerTestbenchSuite({rootDir=path.resolve(__dirname,'../..')}={}) {
 const context=createSuiteContext({id:'xscaler-testbench',label:'Product XScaler Testbench'});
 validateTestbenchDriftGuards(context,rootDir);validateTestbenchEvidence(context,rootDir);return context.result();
}
module.exports={runXScalerTestbenchSuite};

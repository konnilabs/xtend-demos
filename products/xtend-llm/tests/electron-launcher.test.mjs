import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  createElectronEnvironment,
  createHostRuntimeEvidence,
  HOST_RUNTIME_EVIDENCE_ENV,
  mirrorChildExit,
  spawnWithSignalForwarding
} from '../scripts/electron-launcher.mjs';

const hostRuntime = createHostRuntimeEvidence({
  versions: {
    node: '26.5.0',
    modules: '147',
    napi: '10',
    v8: '14.6.202.33-node.0',
    openssl: '3.5.4'
  },
  environment: { npm_config_user_agent: 'npm/11.17.0 node/v26.5.0 linux x64' },
  platform: 'linux',
  arch: 'x64'
});
const environment = createElectronEnvironment({
  ELECTRON_RUN_AS_NODE: '1',
  KEEP_ME: 'yes'
}, hostRuntime);
assert.equal(environment.ELECTRON_RUN_AS_NODE, undefined);
assert.equal(environment.KEEP_ME, 'yes');
assert.deepEqual(JSON.parse(environment[HOST_RUNTIME_EVIDENCE_ENV]), hostRuntime);
assert.equal(hostRuntime.npm, '11.17.0');

const exitResult = await spawnWithSignalForwarding({
  executable: process.execPath,
  args: ['-e', 'process.exit(23)'],
  env: createElectronEnvironment(),
  stdio: 'ignore',
  signals: []
});
assert.deepEqual(exitResult, { code: 23, signal: null });

if (process.platform !== 'win32') {
  const signalResult = await spawnWithSignalForwarding({
    executable: process.execPath,
    args: ['-e', 'process.kill(process.pid, "SIGTERM")'],
    env: createElectronEnvironment(),
    stdio: 'ignore',
    signals: []
  });
  assert.deepEqual(signalResult, { code: null, signal: 'SIGTERM' });
}

const codeTarget = { exitCode: null, pid: 1, kill() { throw new Error('must not signal'); } };
assert.deepEqual(mirrorChildExit({ code: 7, signal: null }, codeTarget), { mode: 'code', exitCode: 7 });
assert.equal(codeTarget.exitCode, 7);

const signalled = [];
const signalTarget = {
  exitCode: null,
  pid: 123,
  kill(pid, signal) {
    signalled.push({ pid, signal });
  }
};
const mirroredSignal = mirrorChildExit({ code: null, signal: 'SIGTERM' }, signalTarget);
assert.equal(mirroredSignal.mode, 'signal');
assert.deepEqual(signalled, [{ pid: 123, signal: 'SIGTERM' }]);
assert.equal(signalTarget.exitCode, 143);

const fallbackTarget = {
  exitCode: null,
  pid: 123,
  kill() {
    throw new Error('unsupported signal');
  }
};
assert.deepEqual(mirrorChildExit({ code: null, signal: 'SIGTERM' }, fallbackTarget), {
  mode: 'fallback',
  signal: 'SIGTERM',
  exitCode: 143
});
assert.equal(fallbackTarget.exitCode, 143);

const productRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const launcherPath = path.join(productRoot, 'scripts', 'run-electron.mjs');
// These two children execute Node, not Electron. Explicitly model local launcher
// semantics; production hosted attestation is separately checked below unchanged.
const nodeModelEnvironment = Object.fromEntries(['PATH','HOME','TMPDIR','LANG','npm_config_user_agent'].filter(key=>process.env[key]!==undefined).map(key=>[key,process.env[key]]));

const cliExit = spawnSync(process.execPath, [
  launcherPath,
  '--xtend-executable',
  process.execPath,
  '-e',
  [
    'const evidence = JSON.parse(process.env.XTEND_LLM_HOST_RUNTIME_EVIDENCE);',
    'const argsOk = JSON.stringify(process.argv.slice(1)) === JSON.stringify(["alpha", "--", "beta"]);',
    'const evidenceOk = evidence.schema === "xtend-llm.launcher-host-runtime.v1" && evidence.node === process.versions.node;',
    'process.exitCode = !process.env.ELECTRON_RUN_AS_NODE && argsOk && evidenceOk ? 19 : 70;'
  ].join(' '),
  'alpha',
  '--',
  'beta'
], {
  cwd: productRoot,
  env: { ...nodeModelEnvironment, ELECTRON_RUN_AS_NODE: '1' },
  encoding: 'utf8'
});
assert.equal(cliExit.status, 19, cliExit.stderr);

if (process.platform !== 'win32') {
  const cliSignal = spawnSync(process.execPath, [
    launcherPath,
    '--xtend-executable',
    process.execPath,
    '-e',
    'process.kill(process.pid, "SIGTERM")'
  ], {
    cwd: productRoot,
    env: nodeModelEnvironment,
    stdio: 'ignore'
  });
  assert.equal(cliSignal.status, null);
  assert.equal(cliSignal.signal, 'SIGTERM');
}

console.log('ok - portable Electron launcher cleans environment and mirrors exit/signal state');

// A hosted production launch must still reject missing attestation before the
// supplied executable can run. This is a negative Node model, never app evidence.
const hostedRejected=spawnSync(process.execPath,[launcherPath,'--xtend-executable',process.execPath,'-e',"process.stdout.write('MUST_NOT_RUN')"],{cwd:productRoot,env:{...nodeModelEnvironment,GITHUB_ACTIONS:'true'},encoding:'utf8'});
assert.equal(hostedRejected.status,1);assert.match(hostedRejected.stderr,/Hosted app requires explicit REQUIRED_CI_ATTESTATION=1/);assert.equal(hostedRejected.stdout,'');
const identityRejected=spawnSync(process.execPath,[launcherPath,'--xtend-executable',process.execPath,'-e',"process.stdout.write('MUST_NOT_RUN')"],{cwd:productRoot,env:{...nodeModelEnvironment,GITHUB_ACTIONS:'true',REQUIRED_CI_ATTESTATION:'1'},encoding:'utf8'});
assert.equal(identityRejected.status,1);assert.match(identityRejected.stderr,process.platform==='linux'?/Missing immutable preload owner identity/:/Reviewed mandatory CI helper attestation supports Linux only/);assert.equal(identityRejected.stdout,'');

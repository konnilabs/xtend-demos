'use strict';
const fs = require('node:fs');
const stages = Object.freeze(['prelaunch-guard', 'build', 'launch-resolve', 'launch', 'module-load', 'main-start', 'app-ready', 'server', 'window', 'load', 'preload-ipc', 'renderer-check', 'runtime-identity', 'source-identity', 'report-write']);
function emitLaunchStage(stage, code, writer = line => fs.writeSync(2, line)) {
  if (!stages.includes(stage) || ![0, 1].includes(code)) throw new Error('Invalid fixed actual-launch diagnostic');
  try { writer(`::${code === 1 ? 'error' : 'notice'}::electron-actual-launch stage=${stage} code=${code}\n`); } catch { /* Transport never alters authoritative execution. */ }
}
function observeSync(stage, operation) {
  emitLaunchStage(stage, 0);
  try { return operation(); } catch (error) { emitLaunchStage(stage, 1); throw error; }
}
function relayLaunchStages(stderr, writer = line => fs.writeSync(2, line)) {
  // Never relay raw output: re-emit only canonical complete stderr lines.
  for (const line of typeof stderr === 'string' ? stderr.split(String.fromCharCode(10)) : []) {
    const match = /^::(notice|error)::electron-actual-launch stage=([a-z-]+) code=([01])$/.exec(line);
    if (match && match[0] === line && stages.includes(match[2]) && match[1] === (match[3] === '1' ? 'error' : 'notice')) {
      emitLaunchStage(match[2], Number(match[3]), writer);
    }
  }
}
module.exports = {stages, emitLaunchStage, observeSync, relayLaunchStages};

import {emitLaunchStage, observeSync} from './actual-launch-diagnostics.cjs';
import {assertSandboxExecution} from './electron-sandbox-policy.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

observeSync('prelaunch-guard', () => assertSandboxExecution());

const productRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resultDir = path.join(productRoot, '.xtend-llm-results');
const require = createRequire(import.meta.url);
let electronExecutable;

fs.mkdirSync(resultDir, { recursive: true });
fs.rmSync(path.resolve(productRoot,'../../.xtend-test-results/electron-sandbox-attestation.json'),{force:true});
for (const artifact of ['layout-smoke.json', 'layout-smoke.png', 'app-services-catfood.json', 'electron-sandbox-attestation.json']) {
  fs.rmSync(path.join(resultDir, artifact), { force: true });
}

emitLaunchStage('launch-resolve', 0);
try {
  electronExecutable = require('electron');
} catch (error) {
  emitLaunchStage('launch-resolve', 1);
  throw new Error('XTend LLM browser catfood requires its pinned Electron dev dependency. Run npm ci --prefix products/xtend-llm.', { cause: error });
}

const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;
const headless = process.platform === 'linux' && !environment.DISPLAY && !environment.WAYLAND_DISPLAY;
const electronArgs = [];
if (headless) electronArgs.push('--headless=new', '--ozone-platform=headless');
electronArgs.push('--disable-gpu', '--disable-dev-shm-usage');
electronArgs.push('.', '--', '--layout-smoke');

const xvfb = ['/usr/bin/xvfb-run', '/usr/local/bin/xvfb-run'].find((candidate) => fs.existsSync(candidate));
const command = headless && xvfb ? xvfb : electronExecutable;
const args = headless && xvfb ? ['-a', electronExecutable, ...electronArgs.filter((entry) => !entry.startsWith('--headless') && entry !== '--ozone-platform=headless')] : electronArgs;
const result = observeSync('launch', () => spawnSync(command, args, {
  cwd: productRoot,
  env: environment,
  stdio: 'inherit'
}));

if (result.error) { emitLaunchStage('launch', 1); throw result.error; }
if (result.status !== 0) { emitLaunchStage('launch', 1); process.exitCode = Number.isInteger(result.status) ? result.status : 1; }

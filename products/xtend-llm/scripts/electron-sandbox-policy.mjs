import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const disabling = /(?:^|[\s"'])--(?:no-sandbox|disable-setuid-sandbox|disable-gpu-sandbox|disable-namespace-sandbox|disable-seccomp-filter-sandbox|disable-renderer-sandbox|no-zygote-sandbox|disable-sandbox)(?:$|[=\s"'])/i;
export function assertSandboxExecution({uid,args=process.argv,environment=process.env,platform=process.platform}={uid:typeof process.getuid==='function'?process.getuid():undefined}) {
 if(uid===0||platform==='linux'&&(!Number.isInteger(uid)||uid<1))throw new Error('XTend Electron requires unprivileged execution; root is rejected');
 if(args.some(value=>disabling.test(String(value))))throw new Error('Sandbox-disabling Electron arguments are rejected');
 for(const key of ['NODE_OPTIONS','ELECTRON_ARGS','CHROMIUM_FLAGS'])if(disabling.test(String(environment[key]||'')))throw new Error('Sandbox-disabling environment is rejected: '+key);
 for(const key of ['ELECTRON_DISABLE_SANDBOX','CHROME_DEVEL_SANDBOX','ELECTRON_OVERRIDE_DIST_PATH'])if(Object.hasOwn(environment,key))throw new Error('Unreviewed sandbox/runtime environment is rejected: '+key);
 return true;
}
export function assertRendererAttestation({uid,preferences,proof,linuxStatus,platform}) {
 assertSandboxExecution({uid,args:[],environment:{},platform});
 if(preferences.sandbox!==true||preferences.nodeIntegration!==false||preferences.contextIsolation!==true||proof?.sandboxed!==true||proof?.contextIsolated!==true)throw new Error('Actual application renderer sandbox attestation failed');
 if(platform==='linux'&&!/^Seccomp:\s*2\s*$/m.test(linuxStatus||''))throw new Error('Actual application renderer Seccomp filtering missing');
 return true;
}

export function isTrustedMainFrame(event,webContents) {
 return Boolean(webContents&&event?.sender===webContents&&event.senderFrame===webContents.mainFrame);
}
export function assertOfficialRuntimeIdentity(identity) {
 const dist='/usr/lib/xtend-electron/42.10.0/edcfae0a8cf2a75ceee8a9842a0117521283164708b193495f4cb60ab2d6aa0d/dist';
 if(identity.electronVersion!=='42.10.0'||identity.executable!==dist+'/electron'||identity.executableSha256!=='0636c96f07de2c74a3eaf8692fc1743d81259c0bf66c8ebde7f7179211a8aff9'||identity.helper!==dist+'/chrome-sandbox'||identity.helperSha256!=='2015304df43beff0b74409cdc4d858107efcde650d9bc8afb1288041d62cec4b'||identity.helperUid!==0||identity.helperGid!==0||identity.helperMode!==0o4755)throw new Error('Actual application official sandbox helper/runtime identity mismatch');
 return true;
}

export function attestationPolicy({platform=process.platform,environment=process.env}={}) {
 const requested=environment.REQUIRED_CI_ATTESTATION;
 if(requested!==undefined&&requested!=='1')throw new Error('Invalid REQUIRED_CI_ATTESTATION mode');
 if(environment.GITHUB_ACTIONS==='true'&&requested!=='1')throw new Error('Hosted app requires explicit REQUIRED_CI_ATTESTATION=1');
 const mandatory=requested==='1';
 if(mandatory&&platform!=='linux')throw new Error('Reviewed mandatory CI helper attestation supports Linux only');
 return {mode:mandatory?'mandatory-ci':'local',requireOfficialHelper:mandatory};
}

// Private main-process bindings; the sandboxed preload needs only Electron IPC.
const preloadBindings=new WeakSet();
const preloadHash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export function registerApplicationPreload(appSession,{canonicalPath,expectedSourceHash,mandatory=false}){
  if(!path.isAbsolute(canonicalPath)||path.resolve(canonicalPath)!==canonicalPath||fs.realpathSync(canonicalPath)!==canonicalPath||!fs.statSync(canonicalPath).isFile())throw new Error('Invalid canonical application preload');
  const sourceSha256=preloadHash(canonicalPath);
  if((mandatory&&!/^[a-f0-9]{64}$/.test(expectedSourceHash||''))||(expectedSourceHash!==undefined&&expectedSourceHash!==sourceSha256))throw new Error('Application preload source binding mismatch');
  if(appSession.getPreloadScripts().length!==0)throw new Error('Application session already has preload registrations');
  const id=appSession.registerPreloadScript({type:'frame',filePath:canonicalPath});
  if(typeof id!=='string'||!id)throw new Error('Missing application preload registration identity');
  const binding=Object.freeze({session:appSession,id,filePath:canonicalPath,sourceSha256,nonce:crypto.randomBytes(32).toString('hex')});
  preloadBindings.add(binding);
  assertApplicationPreload(binding,{session:appSession});
  return binding;
}
export function assertApplicationPreload(binding,webContents){
  if(!preloadBindings.has(binding)||webContents?.session!==binding.session)throw new Error('Foreign application preload binding/session');
  const entries=binding.session.getPreloadScripts();
  if(!Array.isArray(entries)||entries.length!==1||entries[0].id!==binding.id||entries[0].type!=='frame'||entries[0].filePath!==binding.filePath)throw new Error('Application preload registration mismatch');
  if(fs.realpathSync(binding.filePath)!==binding.filePath||!fs.statSync(binding.filePath).isFile()||preloadHash(binding.filePath)!==binding.sourceSha256)throw new Error('Application preload source changed');
  return true;
}
export function assertExecutedPreloadProof(binding,webContents,event,proof){
  if(!isTrustedMainFrame(event,webContents))throw new Error('Untrusted application preload frame');
  assertApplicationPreload(binding,webContents);
  if(proof?.preloadRegistrationId!==binding.id||proof?.preloadNonce!==binding.nonce||proof?.preloadSourceSha256!==binding.sourceSha256)throw new Error('Application executed preload proof mismatch');
  return true;
}
export function bindPreloadLaunchEnvironment({repoRoot,environment}){
  if(!attestationPolicy({environment}).requireOfficialHelper)return {...environment};
  const demoSha=environment.XTEND_DEMO_SHA;
  if(!/^[a-f0-9]{40}$/.test(demoSha||''))throw new Error('Missing immutable preload owner identity');
  const git=(...args)=>execFileSync('git',['-C',repoRoot,...args]);
  if(git('rev-parse','HEAD').toString().trim()!==demoSha)throw new Error('Preload owner checkout identity mismatch');
  const relative='products/xtend-llm/src/main/preload.cjs';
  const expected=crypto.createHash('sha256').update(git('show',demoSha+':'+relative)).digest('hex');
  if(preloadHash(path.join(repoRoot,relative))!==expected)throw new Error('Dirty/substituted application preload source');
  return {...environment,XTEND_LLM_PRELOAD_SHA256:expected};
}

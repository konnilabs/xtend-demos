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
 const dist='/opt/xtend-electron/42.10.0/edcfae0a8cf2a75ceee8a9842a0117521283164708b193495f4cb60ab2d6aa0d/dist';
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

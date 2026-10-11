const { contextBridge, ipcRenderer } = require('electron');

// Source-bound reason observation; fixed enums only, proxy traps remain possible.
let observeBootReason = () => {};
try {
function createReasonObserver(nativeDetail, send) {
 const descriptor=Object.getOwnPropertyDescriptor, apply=Reflect.apply;
 const starts=String.prototype.startsWith;
 const rows=[["literal", "The Maraca View Projection Port does not implement the complete host projection contract.", "L001"], ["literal", "Maraca requires an injected Runtime Module Loader port or explicit ESM module APIs.", "L002"], ["literal", "Maraca requires an injected kernel scheduler authority.", "L003"], ["literal", "Disposed Maraca plan runtimes cannot be booted again.", "L004"], ["literal", "Strict Maraca requires an injected Maraca View Projection Port.", "L005"], ["literal", "Maraca compatibility mode could not construct the canonical View Projection Port.", "L006"], ["literal", "Strict Maraca requires batchUpdate() for atomic Model projection.", "L007"], ["literal", "Strict Maraca forbids a Surface-owned State projection; RMT Model is the sole application-state authority.", "L008"], ["literal", "The plan requires the official RMT state and DOM descriptor runtimes.", "L009"], ["literal", "Strict Maraca requires createRmtDomDescriptorRenderer().commit() and dispose().", "L010"], ["literal", "Strict Maraca requires the complete read-only Model and Model command ports.", "L011"], ["literal", "Strict Maraca validation requires separate evaluator and View projector ports.", "L012"], ["literal", "Strict Maraca validation requires the evaluator and View projector ports.", "L013"], ["literal", "Strict Maraca requires the Surface Controller lifecycle port.", "L014"], ["literal", "The injected PresentationEffectPort must expose invoke(effect, context).", "L015"], ["literal", "Strict Maraca plans with actions require the Action command port.", "L016"], ["literal", "Strict Maraca plans with actions require the Application Controller port.", "L017"], ["literal", "Strict Maraca plans with application events require the Event Router port.", "L018"], ["literal", "Strict Maraca plans with surfaces require the complete Surface Controller lifecycle port.", "L019"], ["literal", "Strict Maraca plans with surfaces require the Surface projection port.", "L020"], ["literal", "Strict Maraca transition plans require the Animation adapter port.", "L021"], ["literal", "Strict Maraca transition plans require the Transition Controller port.", "L022"], ["literal", "The Maraca composition root could not construct a PresentationEffectPort.", "L023"], ["literal", "DOM Descriptor muss strukturiert sein.", "V001"], ["literal", "DOM Descriptor ueberschreitet die maximal erlaubte Verschachtelung.", "V002"], ["literal", "Style darf nur als strukturiertes Objekt gesetzt werden.", "V003"], ["literal", "Trusted HTML benoetigt die explizite Trusted-DOM-Boundary.", "V004"], ["literal", "Trusted HTML benoetigt eine explizite policyRef.", "V005"], ["literal", "Trusted HTML benoetigt einen expliziten trustedDomRenderer ausserhalb des Standard-Renderers.", "V006"], ["literal", "trustedDomRenderer muss Node oder Node[] liefern.", "V007"], ["literal", "Slot-Inhalt darf nicht gleichzeitig markup und html deklarieren.", "V008"], ["literal", "Strukturierter Slot-Inhalt benoetigt descriptor, template oder einen expliziten DOM Descriptor.", "V009"], ["prefix", "Nicht unterstuetzter DOM Descriptor Type ", "V010"], ["prefix", "Unsicherer oder ungueltiger Tag ", "V011"], ["prefix", "Unsichere Property ", "V012"], ["prefix", "Nicht freigegebene Property ", "V013"], ["prefix", "Unsicheres Attribut ", "V014"], ["prefix", "Unsichere URL fuer Attribut ", "V015"], ["prefix", "Unsicherer Event-Name ", "V016"], ["prefix", "Doppelter DOM-Reconcile-Key ", "V017"], ["prefix", "trustedDomRenderer ist fehlgeschlagen: ", "V018"]];
 const own=(object,key)=>{const d=descriptor(object,key);return d&&descriptor(d,'value')&&typeof d.value==='string'?d.value:null;};
 return (topic,event)=>{let id='U000';try {
  if(topic!=='boot-error'&&topic!=='orchestration-diagnostic')return;
  if(typeof nativeDetail!=='function')throw 0;
  const detail=apply(nativeDetail,event,[]);
  const schema=own(detail,'schema'),code=own(detail,'code');
  const allowed=topic==='boot-error'?schema==='xtend.maraca.diagnostic.v1'&&code==='xtend.maraca.auto_boot_error':schema==='xtend.maraca.plan-runtime-diagnostic.v1'&&(code==='maraca.plan-runtime.boot-failed'||code==='xtend.maraca.mvc.presentation-port-missing');
  if(allowed){const message=own(detail,'message');if(message!==null)for(const row of rows){if(row[0]==='literal'?message===row[1]:apply(starts,message,[row[1]])){id=row[2];break;}}}
 }catch{}try{send(id);}catch{}};
}
function createReasonObserverV2(nativeDetail, send) {
 const descriptor=Object.getOwnPropertyDescriptor, apply=Reflect.apply;
 const starts=String.prototype.startsWith, test=RegExp.prototype.test;
 const rows=[["literal", "The Maraca View Projection Port does not implement the complete host projection contract.", "L001"], ["literal", "Maraca requires an injected Runtime Module Loader port or explicit ESM module APIs.", "L002"], ["literal", "Maraca requires an injected kernel scheduler authority.", "L003"], ["literal", "Disposed Maraca plan runtimes cannot be booted again.", "L004"], ["literal", "Strict Maraca requires an injected Maraca View Projection Port.", "L005"], ["literal", "Maraca compatibility mode could not construct the canonical View Projection Port.", "L006"], ["literal", "Strict Maraca requires batchUpdate() for atomic Model projection.", "L007"], ["literal", "Strict Maraca forbids a Surface-owned State projection; RMT Model is the sole application-state authority.", "L008"], ["literal", "The plan requires the official RMT state and DOM descriptor runtimes.", "L009"], ["literal", "Strict Maraca requires createRmtDomDescriptorRenderer().commit() and dispose().", "L010"], ["literal", "Strict Maraca requires the complete read-only Model and Model command ports.", "L011"], ["literal", "Strict Maraca validation requires separate evaluator and View projector ports.", "L012"], ["literal", "Strict Maraca validation requires the evaluator and View projector ports.", "L013"], ["literal", "Strict Maraca requires the Surface Controller lifecycle port.", "L014"], ["literal", "The injected PresentationEffectPort must expose invoke(effect, context).", "L015"], ["literal", "Strict Maraca plans with actions require the Action command port.", "L016"], ["literal", "Strict Maraca plans with actions require the Application Controller port.", "L017"], ["literal", "Strict Maraca plans with application events require the Event Router port.", "L018"], ["literal", "Strict Maraca plans with surfaces require the complete Surface Controller lifecycle port.", "L019"], ["literal", "Strict Maraca plans with surfaces require the Surface projection port.", "L020"], ["literal", "Strict Maraca transition plans require the Animation adapter port.", "L021"], ["literal", "Strict Maraca transition plans require the Transition Controller port.", "L022"], ["literal", "The Maraca composition root could not construct a PresentationEffectPort.", "L023"], ["literal", "DOM Descriptor muss strukturiert sein.", "V001"], ["literal", "DOM Descriptor ueberschreitet die maximal erlaubte Verschachtelung.", "V002"], ["literal", "Style darf nur als strukturiertes Objekt gesetzt werden.", "V003"], ["literal", "Trusted HTML benoetigt die explizite Trusted-DOM-Boundary.", "V004"], ["literal", "Trusted HTML benoetigt eine explizite policyRef.", "V005"], ["literal", "Trusted HTML benoetigt einen expliziten trustedDomRenderer ausserhalb des Standard-Renderers.", "V006"], ["literal", "trustedDomRenderer muss Node oder Node[] liefern.", "V007"], ["literal", "Slot-Inhalt darf nicht gleichzeitig markup und html deklarieren.", "V008"], ["literal", "Strukturierter Slot-Inhalt benoetigt descriptor, template oder einen expliziten DOM Descriptor.", "V009"], ["prefix", "Nicht unterstuetzter DOM Descriptor Type ", "V010"], ["prefix", "Unsicherer oder ungueltiger Tag ", "V011"], ["prefix", "Unsichere Property ", "V012"], ["prefix", "Nicht freigegebene Property ", "V013"], ["prefix", "Unsicheres Attribut ", "V014"], ["prefix", "Unsichere URL fuer Attribut ", "V015"], ["prefix", "Unsicherer Event-Name ", "V016"], ["prefix", "Doppelter DOM-Reconcile-Key ", "V017"], ["prefix", "trustedDomRenderer ist fehlgeschlagen: ", "V018"]];
 const identifier=/^[A-Za-z_$][A-Za-z0-9_$]{0,63} is not defined(?![\s\S])/;
 const nullish=/^Cannot (?:read properties of (?:undefined|null)(?: \(reading '[^'\x00-\x1f\x7f-\x9f\u2028\u2029]{1,128}'\))?|set properties of (?:undefined|null)(?: \(setting '[^'\x00-\x1f\x7f-\x9f\u2028\u2029]{1,128}'\))?)(?![\s\S])/;
 const own=(object,key)=>{const d=descriptor(object,key);return d&&descriptor(d,'value')&&typeof d.value==='string'?d.value:null;};
 return (topic,event)=>{
  if(topic!=='boot-error'&&topic!=='orchestration-diagnostic')return;
  let id='Q008',detail,schema,code,message;
  try{
   let read=false;
   try{detail=apply(nativeDetail,event,[]);read=true;}catch{id='Q001';}
   if(read){
    if(detail===null||typeof detail!=='object')id='Q002';
    else{
     let identityRead=false;
     try{schema=own(detail,'schema');code=own(detail,'code');identityRead=true;}catch{id='Q003';}
     if(identityRead){
      const allowed=topic==='boot-error'?schema==='xtend.maraca.diagnostic.v1'&&code==='xtend.maraca.auto_boot_error':schema==='xtend.maraca.plan-runtime-diagnostic.v1'&&(code==='maraca.plan-runtime.boot-failed'||code==='xtend.maraca.mvc.presentation-port-missing');
      if(!allowed)id='Q004';
      else{
       let messageRead=false;
       try{message=own(detail,'message');messageRead=true;}catch{id='Q005';}
       if(messageRead){
        if(message===null)id='Q006';
        else{
         id='Q007';
         for(const row of rows){if(row[0]==='literal'?message===row[1]:apply(starts,message,[row[1]])){id=row[2];break;}}
         if(id==='Q007'&&message.length<=256){if(apply(test,identifier,[message]))id='J001';else if(apply(test,nullish,[message]))id='J002';}
        }
       }
      }
     }
    }
   }
  }catch{id='Q008';}
  try{send(id);}catch{}
 };
}
 const detail = Object.getOwnPropertyDescriptor(CustomEvent.prototype, 'detail').get;
 if (typeof detail === 'function') observeBootReason = createReasonObserverV2(detail, id => ipcRenderer.send('xtend-llm:boot-reason-v2', id));
} catch {}

// Passive fixed-topic observation; payloads and outcomes remain untouched.
try {
  const sendBootObservation = (id) => { try { ipcRenderer.send('xtend-llm:boot-observation', id); } catch {} };
  sendBootObservation('B000');
  try { window.addEventListener('xtend-maraca:hydration-start', () => sendBootObservation('B101')); sendBootObservation('B001'); } catch {}
  try { window.addEventListener('xtend-maraca:hydration-complete', () => sendBootObservation('B102')); sendBootObservation('B002'); } catch {}
  try { window.addEventListener('xtend-maraca:orchestration-boot', () => sendBootObservation('B103')); sendBootObservation('B003'); } catch {}
  try { window.addEventListener('xtend-maraca:boot', () => sendBootObservation('B104')); sendBootObservation('B004'); } catch {}
  try { window.addEventListener('xtend-maraca:boot-error', event => { sendBootObservation('B105'); observeBootReason('boot-error', event); }); sendBootObservation('B005'); } catch {}
  try { window.addEventListener('xtend-maraca:state-change', () => sendBootObservation('B106')); sendBootObservation('B006'); } catch {}
  try { window.addEventListener('xtend-maraca:surface-change', () => sendBootObservation('B107')); sendBootObservation('B007'); } catch {}
  try { window.addEventListener('xtend-maraca:orchestration-diagnostic', event => { sendBootObservation('B108'); observeBootReason('orchestration-diagnostic', event); }); sendBootObservation('B008'); } catch {}
} catch {}

// Diagnostic-only observation of the one declared module entry; no public bridge API.
try {
  const observeEntry = (event) => {
    try {
      const target = event.target;
      if (event.isTrusted !== true || target?.tagName !== 'SCRIPT' || target.type !== 'module') return;
      const asset = new URL(target.src, location.href);
      if (asset.origin !== location.origin || asset.pathname !== '/build/xtend.maraca.mjs' || asset.search || asset.hash) return;
      const id = event.type === 'load' ? 'E001' : event.type === 'error' ? 'E002' : null;
      if (id) ipcRenderer.send('xtend-llm:entry-observation', id);
    } catch {}
  };
  document.addEventListener('load', observeEntry, true);
  document.addEventListener('error', observeEntry, true);
} catch {}

const CHANNELS = Object.freeze({
  status: 'xtend-llm:status',
  createConversation: 'xtend-llm:create-conversation',
  selectConversation: 'xtend-llm:select-conversation',
  deleteConversation: 'xtend-llm:delete-conversation',
  getSettings: 'xtend-llm:get-settings',
  updateSettings: 'xtend-llm:update-settings',
  resetApp: 'xtend-llm:reset-app',
  submitMessage: 'xtend-llm:submit-message',
  copyText: 'xtend-llm:copy-text',
  regenerateAssistantMessage: 'xtend-llm:regenerate-assistant-message',
  cancelGeneration: 'xtend-llm:cancel-generation',
  executeTool: 'xtend-llm:execute-tool',
  openExternal: 'xtend-llm:open-external',
  attachGenerationSources: 'xtend-llm:attach-generation-sources',
  telemetrySnapshot: 'xtend-llm:telemetry-snapshot',
  modelProgress: 'xtend-llm:model-progress',
  conversationPatch: 'xtend-llm:conversation-patch',
  settingsPatch: 'xtend-llm:settings-patch',
  generationDelta: 'xtend-llm:generation-delta',
  generationComplete: 'xtend-llm:generation-complete',
  generationError: 'xtend-llm:generation-error',
  workerModelProgress: 'xtend-llm:worker-model-progress',
  workerGenerationDelta: 'xtend-llm:worker-generation-delta',
  workerGenerationComplete: 'xtend-llm:worker-generation-complete',
  workerGenerationError: 'xtend-llm:worker-generation-error'
});

const PUBLIC_EVENTS = new Set([
  CHANNELS.modelProgress,
  CHANNELS.conversationPatch,
  CHANNELS.settingsPatch,
  CHANNELS.generationDelta,
  CHANNELS.generationComplete,
  CHANNELS.generationError
]);

function clone(value) {
  if (value == null || typeof value !== 'object') return value;
  return JSON.parse(JSON.stringify(value));
}

function forwardDomEvent(domEventName, ipcChannel) {
  window.addEventListener(domEventName, (event) => {
    ipcRenderer.send(ipcChannel, clone(event.detail || {}));
  });
}

function safeExternalHref(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    const url = new URL(raw, window.location.href);
    if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) return '';
    if ((url.protocol === 'http:' || url.protocol === 'https:') && url.origin === window.location.origin) return '';
    return url.href;
  } catch {
    return '';
  }
}

function anchorFromEvent(event) {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  for (const node of path) {
    if (node && node.nodeType === Node.ELEMENT_NODE && node.localName === 'a' && node.href) {
      return node;
    }
  }
  const target = event.target && event.target.closest ? event.target.closest('a[href]') : null;
  return target && target.href ? target : null;
}

window.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0) return;
  const anchor = anchorFromEvent(event);
  const href = safeExternalHref(anchor && anchor.href);
  if (!href) return;

  event.preventDefault();
  ipcRenderer.invoke(CHANNELS.openExternal, href).catch((error) => {
    console.warn('[xtend-llm] Failed to open external URL.', error);
  });
}, true);

forwardDomEvent(CHANNELS.workerModelProgress, CHANNELS.workerModelProgress);
forwardDomEvent(CHANNELS.workerGenerationDelta, CHANNELS.workerGenerationDelta);
forwardDomEvent(CHANNELS.workerGenerationComplete, CHANNELS.workerGenerationComplete);
forwardDomEvent(CHANNELS.workerGenerationError, CHANNELS.workerGenerationError);

contextBridge.exposeInMainWorld('xtendLlm', {
  status() {
    return ipcRenderer.invoke(CHANNELS.status);
  },
  createConversation() {
    return ipcRenderer.invoke(CHANNELS.createConversation);
  },
  selectConversation(id) {
    return ipcRenderer.invoke(CHANNELS.selectConversation, id);
  },
  deleteConversation(id) {
    return ipcRenderer.invoke(CHANNELS.deleteConversation, id);
  },
  getSettings() {
    return ipcRenderer.invoke(CHANNELS.getSettings);
  },
  updateSettings(payload) {
    return ipcRenderer.invoke(CHANNELS.updateSettings, clone(payload || {}));
  },
  resetApp(payload) {
    return ipcRenderer.invoke(CHANNELS.resetApp, clone(payload || {}));
  },
  submitMessage(payload) {
    return ipcRenderer.invoke(CHANNELS.submitMessage, clone(payload || {}));
  },
  copyText(payload) {
    return ipcRenderer.invoke(CHANNELS.copyText, clone(payload || {}));
  },
  regenerateAssistantMessage(payload) {
    return ipcRenderer.invoke(CHANNELS.regenerateAssistantMessage, clone(payload || {}));
  },
  cancelGeneration(jobId) {
    return ipcRenderer.invoke(CHANNELS.cancelGeneration, clone(typeof jobId === 'string' ? { jobId } : jobId || {}));
  },
  executeTool(payload) {
    return ipcRenderer.invoke(CHANNELS.executeTool, clone(payload || {}));
  },
  openExternal(url) {
    return ipcRenderer.invoke(CHANNELS.openExternal, String(url || ''));
  },
  attachGenerationSources(payload) {
    return ipcRenderer.invoke(CHANNELS.attachGenerationSources, clone(payload || {}));
  },
  telemetry() {
    return ipcRenderer.invoke(CHANNELS.telemetrySnapshot);
  },
  on(eventName, listener) {
    if (!PUBLIC_EVENTS.has(eventName)) throw new Error(`Unsupported XTend LLM event: ${eventName}`);
    if (typeof listener !== 'function') throw new Error('Listener must be a function.');
    const wrapped = (_event, payload) => listener(clone(payload));
    ipcRenderer.on(eventName, wrapped);
    return () => ipcRenderer.removeListener(eventName, wrapped);
  }
});

// Trusted actual preload; not exposed through the public renderer API.
ipcRenderer.invoke('xtend-llm:preload-identity').then(identity=>{
  if(typeof identity?.registrationId!=='string'||!identity.registrationId||!/^[a-f0-9]{64}$/.test(identity.nonce)||!/^[a-f0-9]{64}$/.test(identity.sourceSha256))throw new Error('Invalid private preload identity');
  ipcRenderer.send('xtend-llm:sandbox-attestation',{sandboxed:process.sandboxed===true,contextIsolated:process.contextIsolated===true,preloadRegistrationId:identity.registrationId,preloadNonce:identity.nonce,preloadSourceSha256:identity.sourceSha256});
}).catch(()=>ipcRenderer.send('xtend-llm:sandbox-attestation',null));

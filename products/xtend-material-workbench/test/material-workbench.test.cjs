'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
test('XTend Material Workbench product contract', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'maraca.config.json'), 'utf8'));
  const evidence = JSON.parse(fs.readFileSync(path.join(root, 'src/data/evidence.json'), 'utf8'));
  const lessons = JSON.parse(fs.readFileSync(path.join(root, 'src/data/lessons.json'), 'utf8'));
  const rmt = fs.readFileSync(path.join(root, 'src/app.rmt'), 'utf8');
  const devApi = fs.readFileSync(path.join(root, 'src/workbench-dev-api.mjs'), 'utf8');
  const visualGate = fs.readFileSync(path.join(root, 'src/workbench-visual-gate.mjs'), 'utf8');
  const runtimeHost = fs.readFileSync(path.join(root, 'src/workbench-runtime-host.mjs'), 'utf8');
  const navigation = fs.readFileSync(path.join(root, 'src/workbench-navigation.mjs'), 'utf8');
  const runtimeSite = fs.readFileSync(path.join(root, 'site/runtime.html'), 'utf8');
  const site = fs.readFileSync(path.join(root, 'site/index.html'), 'utf8');
  const theme = fs.readFileSync(path.join(root, 'site/workbench-theme.css'), 'utf8');
  const workbenchCss = fs.readFileSync(path.join(root, 'site/workbench.css'), 'utf8');
  assert.equal(config.options.cssProvider, 'tailwind');
  assert.equal(config.options.cssPreflight, 'disabled');
  assert.equal(evidence.browserEvidence.matrixCells, 384);
  assert.equal(evidence.performanceEvidence.tailwindRuntimeBytes, 0);
  assert.equal(lessons.undecidedLessonCount, 0);
  assert.match(rmt, /class "xtm-dashboard"/);
  assert.match(rmt, /action workbench\.confirmReview/);
  assert.match(rmt, /validation workbench\.lessonFilter/);
  assert.match(rmt, /transition workbench\.reviewEvidence/);
  assert.doesNotMatch(rmt, /class "(?:grid|flex|p-\d)/);
  assert.doesNotMatch(site, /workbench-dev-api\.mjs/);
  assert.match(devApi, /xtend\.devsurface\.dev-api\.v1/);
  ['getPerformanceSnapshot', 'getFabricTelemetrySnapshot', 'getKernelSnapshot', 'getHydrationSnapshot'].forEach((method) => assert.match(devApi, new RegExp(`${method}\\(`)));
  assert.match(devApi, /installWorkbenchDevApi/);
  assert.doesNotMatch(devApi, /(?:innerHTML|shadowRoot|attachShadow)/);
  assert.match(site, /\/design-tokens\/tailwind\/xtend-material-theme\.css/);
  assert.doesNotMatch(site, /\/xtend-material\/tokens\.css/);
  assert.match(site, /workbench-theme\.css/);
  assert.match(site, /workbench-visual-gate\.mjs/);
  assert.doesNotMatch(site, /<dialog\b[^>]*\bopen\b/u);
  assert.match(site, /commandfor="review-dialog" command="show-modal"/);
  assert.match(theme, /--xtend-surface-page: #f4f7fb/);
  assert.match(theme, /--xtend-text-primary: #172033/);
  assert.match(visualGate, /xtend\.material\.workbench-visual-gate\.v1/);
  assert.match(visualGate, /backgroundColor === 'rgb\(244, 247, 251\)'/);
  assert.match(visualGate, /primaryWidth >= Math\.min\(320, viewportWidth \* 0\.7\)/);
  assert.match(visualGate, /horizontalOverflow === 0/);
  assert.match(visualGate, /devApiAbsent/);
  assert.doesNotMatch(visualGate, /(?:innerHTML|shadowRoot|attachShadow)/);
  assert.match(site, /site\/runtime\.html/);
  assert.match(site, /site\/runtime\.html" target="_blank" rel="noopener"/);
  assert.match(site, /workbench-navigation\.mjs/);
  assert.match(navigation, /xtend\.material\.workbench-navigation\.v1/);
  assert.match(navigation, /addEventListener\('hashchange'/);
  assert.match(navigation, /root\.dataset\.xtmRoute = route/);
  assert.match(navigation, /root\.dataset\.xtmNavigationVisible = String\(visible\)/);
  assert.match(navigation, /navigationRect\.top >= headerRect\.bottom - 1/);
  assert.match(workbenchCss, /height: calc\(100dvh - 4rem\)/);
  assert.match(workbenchCss, /overscroll-behavior: contain/);
  assert.match(runtimeSite, /data-maraca-root/);
  assert.match(runtimeSite, /id="xtm-runtime-mount"[^>]*aria-hidden="true" inert/);
  assert.match(runtimeSite, /id="xtm-runtime-surface-count"/);
  assert.equal((runtimeSite.match(/data-route="(?:evidence|lessons|settings)"/gu) || []).length, 3);
  assert.match(runtimeSite, /data-route="runtime" aria-current="page"/);
  assert.match(runtimeHost, /bootXtendMaraca\(\{ root, lazyStrategy: 'eager' \}\)/);
  assert.match(runtimeHost, /installWorkbenchDevApi/);
  assert.match(runtimeHost, /snapshotsSerializable/);
  assert.match(runtimeHost, /presentationReady/);
  assert.match(runtimeHost, /mountRect\.width <= 1/);
  assert.match(workbenchCss, /\.xtm-runtime-mount \{/);
  assert.match(workbenchCss, /clip-path: inset\(50%\)/);
  assert.match(runtimeHost, /surfaceCount >= 15/);
  assert.doesNotMatch(runtimeHost, /(?:innerHTML|shadowRoot|attachShadow)/);
});

const { measuredTuneContract, productionComparator } = require('../../../tests/products/material-tune-contract.cjs');
const tuneCommitted = JSON.parse(fs.readFileSync(path.join(root, 'maraca.tuned.config.json')));
const tuneOrdinary = JSON.parse(fs.readFileSync(path.join(root, 'maraca.config.json')));
const compare = productionComparator(root);
// Controlled report fixtures test the assertion boundary, not real tuning performance.
function fixture() {
  const metrics = { frameworkBytes: 1, appServiceBytes: 0, serverAppServiceBytes: 0, eagerBytes: 1, totalBytes: 1, cssBytes: 0, eagerRequests: 1, chunkCount: 1 };
  const candidates = ['production', 'max'].flatMap(profile => ['route', 'component', 'none'].flatMap(lazy => ['external', 'inline'].map(css => ({ id: `${profile}-${lazy}-${css}`, profile, lazy, css, metrics: { ...metrics }, accepted: true, declaredPolicyPreserved: true, declaredDeferredPolicyCount: 1 }))));
  const winner = candidates.find(candidate => ['profile', 'lazy', 'css'].every(key => candidate[key] === tuneCommitted.selected[key]));
  winner.metrics.frameworkBytes = 0;
  return { tune: { ok: true, status: 'checked', configMatches: true, candidateCount: 12, acceptedCandidateCount: 12, candidates, selected: { id: winner.id, ...tuneCommitted.selected, metrics: { ...winner.metrics } } }, committed: structuredClone(tuneCommitted), ordinary: structuredClone(tuneOrdinary) };
}
const verify = value => measuredTuneContract(value.tune, value.committed, value.ordinary, compare);
test('measured committed selection, route capability and deferred policy positive control', () => assert.equal(verify(fixture()), true));
for (const [name, mutate] of [
  ['duplicate candidate row', value => { value.tune.candidates[0] = structuredClone(value.tune.candidates[1]); }],
  ['nonwinning selection', value => { value.tune.candidates.find(candidate => candidate.id !== value.tune.selected.id).metrics.frameworkBytes = -0; value.tune.selected.metrics.frameworkBytes = 1; value.tune.candidates.find(candidate => candidate.id === value.tune.selected.id).metrics.frameworkBytes = 1; }],
  ['tie-break nonwinner', value => { value.tune.candidates.forEach(candidate => { candidate.metrics = { ...value.tune.selected.metrics }; }); }],
  ['config mismatch', value => { value.tune.configMatches = false; }],
  ['committed selection drift', value => { value.committed.selected.lazy = 'component'; }],
  ['foreign policy', value => { value.tune.selected.lazy = 'foreign'; }],
  ['nonfinite metrics', value => { value.tune.selected.metrics.totalBytes = Infinity; }],
  ['negative metrics', value => { value.tune.selected.metrics.frameworkBytes = -1; }],
  ['missing metrics', value => { delete value.tune.selected.metrics.eagerBytes; }],
  ['fractional request count', value => { value.tune.selected.metrics.eagerRequests = 0.5; }],
  ['route capability absent', value => { value.tune.candidates = value.tune.candidates.map(candidate => ({ ...candidate, lazy: 'none' })); }],
  ['ordinary route build removed', value => { value.ordinary.options.lazy = 'none'; }],
  ['deferred policy override', value => { value.tune.candidates[0].declaredPolicyPreserved = false; }],
  ['invalid deferred count', value => { value.tune.candidates[0].declaredDeferredPolicyCount = -1; }],
  ['strict hydration removed', value => { value.committed.options.hydration = 'eager'; }],
  ['unaccepted candidate', value => { value.tune.candidates[0].accepted = false; }],
  ['selected report not candidate', value => { value.tune.selected.id = 'foreign'; }]
]) test(name + ' rejects', () => { const value = fixture(); mutate(value); assert.equal(verify(value), false); });

test('exact production objective priority and tie-break controls', () => {
  const value = fixture(), selected = value.tune.selected;
  for (const key of ['frameworkBytes', 'appServiceBytes', 'eagerBytes', 'totalBytes', 'eagerRequests', 'chunkCount']) {
    const left = structuredClone(selected), right = structuredClone(selected); left.metrics[key] = 0; right.metrics[key] = 1; assert.ok(compare(left, right) < 0);
  }
  for (const [key, preferred, other] of [['profile','production','max'], ['lazy','route','component'], ['lazy','component','none'], ['css','external','inline']]) {
    const left = structuredClone(selected), right = structuredClone(selected); left[key] = preferred; right[key] = other; assert.ok(compare(left, right) < 0);
  }
});

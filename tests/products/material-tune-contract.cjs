'use strict';
const { isDeepStrictEqual } = require('node:util');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), { createRequire } = require('node:module');
function productionComparator(productRoot) {
  const root = fs.realpathSync(productRoot), request = createRequire(path.join(root, 'package.json'));
  const file = fs.realpathSync(request.resolve('@ccslabs/xtend-maraca'));
  const expected = path.join(root, 'node_modules/@ccslabs/xtend-maraca');
  if (fs.realpathSync(expected) !== expected || !file.startsWith(expected + path.sep)) throw Error('Exact product-local Maraca source required');
  const source = fs.readFileSync(file, 'utf8');
  const start = source.indexOf('function maracaTunePreference('), end = source.indexOf('function maracaTuneCandidateRecord(', start);
  if (start < 0 || end <= start || source.indexOf('function maracaTunePreference(', start + 1) !== -1) throw Error('Exact production comparator source boundary required');
  const excerpt = source.slice(start, end);
  return vm.runInNewContext(excerpt + '\ncompareMaracaTuneCandidates;', Object.create(null));
}
const metrics = ['frameworkBytes', 'appServiceBytes', 'serverAppServiceBytes', 'eagerBytes', 'totalBytes', 'cssBytes', 'eagerRequests', 'chunkCount'];
function measuredTuneContract(tune, committed, ordinary, compare) {
  const selected = tune?.selected;
  const validPolicy = value => value && ['production', 'max'].includes(value.profile)
    && ['route', 'component', 'none'].includes(value.lazy) && ['external', 'inline'].includes(value.css);
  const validMetrics = value => metrics.every(key => Number.isFinite(value?.[key]) && value[key] >= 0)
    && ['eagerRequests', 'chunkCount'].every(key => Number.isInteger(value[key]));
  const candidates = tune?.candidates;
  return Boolean(tune?.ok === true && tune.status === 'checked' && tune.configMatches === true
    && tune.candidateCount === 12 && tune.acceptedCandidateCount === 12
    && validPolicy(selected) && validMetrics(selected.metrics)
    && isDeepStrictEqual(committed?.selected, { profile: selected.profile, lazy: selected.lazy, css: selected.css })
    && ordinary?.options?.lazy === 'route' && ordinary.options.hydration === 'strict'
    && committed?.locked?.hydration === 'strict' && committed?.options?.hydration === 'strict'
    && Array.isArray(candidates) && candidates.length === 12
    && typeof compare === 'function'
    && new Set(candidates.map(candidate => `${candidate.profile}/${candidate.lazy}/${candidate.css}`)).size === 12
    && new Set(candidates.map(candidate => candidate.id)).size === 12
    && candidates.every(candidate => candidate.id === `${candidate.profile}-${candidate.lazy}-${candidate.css}`)
    && candidates.every(candidate => validPolicy(candidate) && validMetrics(candidate.metrics)
      && candidate.accepted === true && candidate.declaredPolicyPreserved === true
      && Number.isInteger(candidate.declaredDeferredPolicyCount) && candidate.declaredDeferredPolicyCount >= 0)
    && candidates.some(candidate => candidate.lazy === 'route')
    && candidates.every(candidate => compare(selected, candidate) <= 0)
    && candidates.some(candidate => candidate.id === selected.id
      && candidate.profile === selected.profile && candidate.lazy === selected.lazy && candidate.css === selected.css
      && isDeepStrictEqual(candidate.metrics, selected.metrics)));
}
module.exports = { measuredTuneContract, productionComparator };

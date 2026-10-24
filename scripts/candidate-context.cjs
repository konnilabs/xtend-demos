'use strict';

const SHA = /^[a-f0-9]{40}$/;
const CORE_PROFILE = 'xtend.npm.core-only.v1';

// Demo checkout identity belongs to the installation/evidence context. A Core
// v2 manifest carries only its own immutable source identity.
function candidateOptions(manifest, { coreSha, demoSha, directory }) {
  if (!SHA.test(coreSha || '') || !SHA.test(demoSha || '') || manifest?.coreSha !== coreSha)
    throw Error('Candidate SHA identity mismatch');
  if (manifest.schema === 'xtend.product-candidates.v1') {
    if (Object.hasOwn(manifest, 'profile') || manifest.demoSha !== demoSha)
      throw Error('Legacy candidate requires exact paired identity');
    return { coreSha, demoSha, directory };
  }
  if (manifest.schema === 'xtend.product-candidates.v2') {
    if (manifest.profile !== CORE_PROFILE ||
        ['demoSha', 'demoRepository', 'productEvidence', 'unionEvidence'].some(key => Object.hasOwn(manifest, key)))
      throw Error('Exact Core candidate profile required; mixed Demo fields forbidden');
    return { coreSha, profile: CORE_PROFILE, directory };
  }
  throw Error('Unsupported candidate contract version');
}

module.exports = { candidateOptions };

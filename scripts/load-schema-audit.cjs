'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
function loadSchemaAudit({ coreRoot = process.env.XTEND_SCHEMA_AUDIT_CORE_ROOT || path.join(root, '.schema-audit/core'), coreSha = process.env.XTEND_CORE_SHA || require('../candidate-source.lock.json').coreSha } = {}) {
  coreRoot = fs.realpathSync(coreRoot);
  if (!/^[a-f0-9]{40}$/.test(coreSha || '')) throw Error('Exact audit Core commit required');
  const git = args => execFileSync('git', args, { cwd: coreRoot, encoding: 'utf8' }).trim();
  if (git(['rev-parse', 'HEAD']) !== coreSha || git(['status', '--porcelain', '--untracked-files=no']))
    throw Error('Independent audit source must be clean at the expected Core commit');
  const relative = 'tools/schema-inventory/source-audit.cjs', file = path.join(coreRoot, relative);
  if (!fs.existsSync(file)) throw Error('Pinned Core lacks the independent source audit; update the reviewed source pin first');
  if (fs.realpathSync(file) !== file || !fs.lstatSync(file).isFile()) throw Error('Audit entry symlink rejected');
  const expected = execFileSync('git', ['show', coreSha + ':' + relative], { cwd: coreRoot });
  if (!fs.readFileSync(file).equals(expected)) throw Error('Audit entry differs from pinned Core');
  return { coreRoot, coreSha, api: require(file).loadSourceAudit({ coreRoot, coreSha }) };
}
module.exports = { loadSchemaAudit };

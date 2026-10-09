'use strict';
const fs = require('node:fs'), path = require('node:path');
function prepareFixture({output, version = '13', candidateDirectory = path.resolve(__dirname, '../.candidate'), expected = {coreSha: process.env.XTEND_CORE_SHA, demoSha: process.env.XTEND_DEMO_SHA}} = {}) {
  if (!output || fs.existsSync(output)) throw new Error('XTend.store requires a fresh fixture directory.');
  if (!['12', '13'].includes(String(version))) throw new Error('Unsupported Laravel major.');
  const product = path.resolve(__dirname, '..');
  fs.cpSync(product, output, {recursive: true, filter: file =>
    !path.relative(product, file).split(path.sep).some(part => ['.env', '.packages', 'vendor', 'node_modules', 'storage', '.git'].includes(part))
    && !/(?:^|[\\/])(?:public[\\/]build|bootstrap[\\/](?:cache|xtend))(?:[\\/]|$)/u.test(path.relative(product, file))
    && !/\.sqlite(?:-|$)/u.test(file)
  });
  if (String(version) === '12') {
    const compatibility = path.join(product, 'tests/compatibility/laravel12');
    for (const file of ['composer.json', 'composer.lock', 'payment-provider/composer.json', 'payment-provider/composer.lock']) {
      fs.copyFileSync(path.join(compatibility, file), path.join(output, file));
    }
  }
  const prepared = require(path.join(path.resolve(output), 'scripts/prepare-packages.cjs')).preparePackages(candidateDirectory, expected);
  return {output: path.resolve(output), version, ...prepared};
}
if (require.main === module) console.log(JSON.stringify(prepareFixture({output: process.argv[2], version: process.argv[3], candidateDirectory: process.argv[4]}), null, 2));
module.exports = {prepareFixture};

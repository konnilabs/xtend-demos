'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {JSDOM} = require('jsdom');
const build = path.resolve(__dirname, '../../products/rmt-maraca-kernel-orchestration/site/build');
const load = file => import(pathToFileURL(path.join(build, file)).href);
const ownership = {mode: 'strict', domains: {events: 'event-router', visibility: 'transition-runtime', validation: 'validation-runtime'}};
async function harness(t) {
  const {createRmtDomDescriptorRenderer} = await load('runtime/xtendrmt-runtime.esm.mjs');
  const dom = new JSDOM('<main></main>');
  t.after(() => dom.window.close());
  return {dom, root: dom.window.document.querySelector('main'), renderer: createRmtDomDescriptorRenderer({documentTarget: dom.window.document})};
}
test('committed generated entry and runtime imports have a complete local file closure', () => {
  const missing = [];
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (/\.(?:mjs|js)$/.test(file)) {
        const source = fs.readFileSync(file, 'utf8');
        for (const match of source.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"?]+)['"]/g)) {
          const target = path.resolve(path.dirname(file), match[1]);
          assert.ok(target.startsWith(build + path.sep), 'generated dependency stays inside build');
          if (!fs.existsSync(target)) missing.push(path.relative(build, file) + ' -> ' + match[1]);
        }
      }
    }
  }
  visit(build);
  assert.deepEqual(missing, []);
  const report = JSON.parse(fs.readFileSync(path.join(build, 'xtend.maraca.report.json')));
  assert.equal(report.ok, true);
  for (const file of report.bundleFiles) {
    assert.equal(fs.statSync(path.join(build, file.fileName)).size, file.bytes, file.fileName + ' matches build report');
  }
});
test('generated plan and composition modules actually resolve their dependencies', async () => {
  assert.equal(typeof (await load('runtime/xtend-maraca-plan-runtime.mjs')).createMaracaPlanRuntime, 'function');
  assert.equal(typeof (await load('runtime/xtend-maraca-browser-composition-runtime.mjs')).createMaracaBrowserCompositionRoot, 'function');
});
test('generated renderer preserves missing namespaced bindings and ordinary literals', async t => {
  const {renderer} = await harness(t), context = {model: {'view.data': {}}};
  for (const reference of ['$model.view.data.title', '$state.view.data.title', '$item.missing', '$item', '$event.missing', '$event', '$target.missing', '$target', '$currentTarget.missing', '$currentTarget', '$selector.missing', '$derive.missing']) {
    assert.equal(renderer.resolveValue(reference, context), undefined, reference);
  }
  for (const literal of ['Ordinary text', '$USD', 'legacy.path']) assert.equal(renderer.resolveValue(literal, context), literal);
  assert.equal(renderer.resolveValue({op: 'literal', value: '$model.view.data.title'}, context), '$model.view.data.title');
  for (const value of [null, '', false, 0, 'Present']) assert.equal(renderer.resolveValue('$model.view.data.title', {model: {'view.data': {title: value}}}), value);
});
test('generated renderer uses the fallback for an absent model value', async t => {
  const {renderer} = await harness(t);
  const node = renderer.renderNode({type: 'element', tag: 'p', text: {op: 'if', test: '$model.view.data.title', then: '$model.view.data.title', else: 'Readable fallback'}, attributes: {title: '$model.view.data.title'}}, {model: {'view.data': {}}});
  assert.equal(node.textContent, 'Readable fallback');
  assert.equal(node.getAttribute('title'), null);
});
for (const kind of ['command', 'commands']) test('generated renderer retains inert ' + kind + ' metadata under strict event ownership', async t => {
  const {dom, renderer, root} = await harness(t);
  let installs = 0;
  const native = dom.window.EventTarget.prototype.addEventListener;
  dom.window.EventTarget.prototype.addEventListener = function (...args) { if (this.localName === 'button') installs++; return native.apply(this, args); };
  const command = {command: 'fixture.activate', event: 'click', payload: {value: 7}};
  const descriptor = {type: 'element', tag: 'button', [kind]: kind === 'commands' ? [command] : command};
  const original = JSON.stringify(descriptor);
  const report = renderer.commit({operation: 'replace-children', target: root, descriptor, ownership});
  assert.equal(report.bindings.length, 1);
  assert.equal(report.bindings[0].command, command.command);
  assert.deepEqual({...report.bindings[0].payload}, {value: 7});
  assert.equal(report.bindings[0].target, root.firstChild);
  assert.equal(installs, 0);
  assert.equal(root.firstChild.onclick, null);
  root.firstChild.click();
  assert.equal(installs, 0);
  assert.equal(JSON.stringify(descriptor), original);
});
test('generated renderer rejects actual competing event writers and forged owner claims', async t => {
  const {renderer, root} = await harness(t);
  assert.throws(() => renderer.commit({operation: 'replace-children', target: root, descriptor: {type: 'element', tag: 'button', events: {click: 'fixture.one'}}, ownership}), error => error.code === 'rmt.dom.ownership.collision');
  for (const descriptor of [{type: 'element', tag: 'button', attributes: {onclick: 'fixture()'}}, {type: 'element', tag: 'button', properties: {onclick: () => { throw Error('must not execute'); }}}]) {
    assert.throws(() => renderer.commit({operation: 'replace-children', target: root, descriptor, ownership: {...ownership, claims: {events: 'event-router'}}}));
    assert.equal(root.childNodes.length, 0);
  }
});
test('generated renderer rejects unsafe command IDs and executable tags', async t => {
  const {renderer, root} = await harness(t);
  assert.throws(() => renderer.commit({operation: 'replace-children', target: root, descriptor: {type: 'element', tag: 'button', command: {command: 'fixture.one', bindingId: 'bad id'}}, ownership}), error => error.code === 'rmt.dom.binding.id-unsafe');
  assert.throws(() => renderer.commit({operation: 'replace-children', target: root, descriptor: {type: 'element', tag: 'script', command: 'fixture.one'}, ownership}));
});

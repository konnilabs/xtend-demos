const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {pathToFileURL} = require('node:url');
const {createSuiteContext} = require('../utils/assertions');
const {resolveRepoPath} = require('../utils/files');
const {createXssPayloadCatalog, isUnsafeXssUrl, scanSourceText} = require('@ccslabs/xtend/security/xss-pentest-policy');
function requestText(url, headers = {}) {
  const target = new URL(url);
  const origin = `${target.protocol}//${target.host}`;
  const rawPath = String(url).startsWith(origin)
    ? String(url).slice(origin.length) || '/'
    : `${target.pathname}${target.search}`;

  return new Promise((resolve, reject) => {
    const request = http.request({
      hostname: target.hostname,
      port: target.port,
      path: rawPath,
      method: 'GET',
      headers
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          body
        });
      });
    });

    request.on('error', reject);
    request.end();
  });
}

async function assertXtendLlmProbes(context, rootDir, catalog) {
  const productRoot = resolveRepoPath('products/xtend-llm', rootDir);
  const markdown = await import(pathToFileURL(path.join(productRoot, 'src/renderer/markdown-format-bridge.mjs')).href);
  const codeBlocks = await import(pathToFileURL(path.join(productRoot, 'src/renderer/code-block-bridge.mjs')).href);
  const citations = await import(pathToFileURL(path.join(productRoot, 'src/renderer/citation-source-bridge.mjs')).href);
  const navigation = await import(pathToFileURL(path.join(productRoot, 'src/main/external-navigation.mjs')).href);
  const ipc = await import(pathToFileURL(path.join(productRoot, 'src/main/ipc-contract.mjs')).href);
  const appServer = await import(pathToFileURL(path.join(productRoot, 'src/main/app-server.mjs')).href);

  const maliciousMarkdown = catalog.markdown.find((entry) => entry.id === 'markdown-javascript-link').payload;
  const inlineTokens = markdown.parseInlineMarkdown(maliciousMarkdown);
  context.assert(!inlineTokens.some((token) => token && token.type === 'link' && token.href && isUnsafeXssUrl(token.href)), 'XTend LLM markdown parser does not create clickable javascript links');

  const codeSegments = codeBlocks.parseCodeFenceSegments(catalog.markdown.find((entry) => entry.id === 'markdown-code-fence-html').payload);
  context.assert(codeSegments.some((segment) => segment.type === 'code' && segment.code.includes('<script>')), 'XTend LLM code fences preserve HTML as code text');

  context.assert(citations.safeExternalUrl('javascript:alert(1)') === '', 'XTend LLM citations reject javascript URLs');
  context.assert(citations.safeExternalUrl('data:text/html,<script>alert(1)</script>') === '', 'XTend LLM citations reject data HTML URLs');
  const sourceMap = citations.createCitationSourceMap([
    { index: 1, url: 'javascript:alert(1)', title: '<img src=x onerror=alert(1)>', snippet: '<script>alert(1)</script>' },
    { index: 2, url: 'https://example.com/path?q=%3Cscript%3E', title: '<b>safe text</b>', snippet: '<img src=x onerror=alert(1)>' }
  ]);
  context.assert(!sourceMap.has(1) && sourceMap.has(2), 'XTend LLM source map filters unsafe source URLs and keeps safe sources');

  context.assert(navigation.normalizeExternalUrl('javascript:alert(1)') === '', 'XTend LLM external navigation rejects javascript URLs');
  context.assert(navigation.shouldOpenExternalUrl('http://127.0.0.1:4173/local', 'http://127.0.0.1:4173') === '', 'XTend LLM external navigation blocks same-origin openExternal');
  context.assert(navigation.shouldOpenExternalUrl('https://example.com/', 'http://127.0.0.1:4173') === 'https://example.com/', 'XTend LLM external navigation allows external https through controlled opener');

  const sourcePayload = ipc.normalizeAttachGenerationSources({
    jobId: 'job-1',
    conversationId: 'conversation-1',
    sources: [
      { index: 1, url: 'javascript:alert(1)', title: '<script>bad</script>' },
      { index: 2, url: 'https://example.com/', title: '<img src=x onerror=alert(1)>', snippet: '<script>alert(1)</script>' }
    ]
  });
  context.assert(sourcePayload.sources.length === 1 && sourcePayload.sources[0].url === 'https://example.com/', 'XTend LLM IPC source normalization filters unsafe URLs');
  context.assert(ipc.normalizeSubmitMessage({ text: '<img src=x onerror=alert(1)>', maxNewTokens: 1 }).text.includes('<img'), 'XTend LLM prompt input remains text data');
  context.assert(ipc.normalizeUpdateSettings({ customInstructions: '<script>alert(1)</script>' }).customInstructions.includes('<script>'), 'XTend LLM custom instructions remain text data');

  let server = null;
  try {
    server = appServer.createXtendLlmAppServer({ dev: false });
    const origin = await server.listen(0);
    const response = await requestText(origin, {'x-xtend-llm-capability': server.capability});
    context.assert(response.statusCode === 200, 'XTend LLM app server serves SSR shell for XSS probe');
    context.assert(response.headers['cross-origin-opener-policy'] === 'same-origin', 'XTend LLM app server emits COOP header');
    context.assert(response.body.includes("object-src 'none'"), 'XTend LLM SSR shell includes object-src CSP');
    context.assert(response.body.includes("base-uri 'self'"), 'XTend LLM SSR shell includes base-uri CSP');
    const hydration = response.body.match(/<template id="xtend-llm-ssr-hydration"[^>]*>([\s\S]*?)<\/template>/u);
    context.assert(Boolean(hydration), 'XTend LLM SSR shell includes hydration template');
    context.assert(hydration && !hydration[1].includes('<script'), 'XTend LLM hydration payload escapes executable markup');
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    const code = error && error.code ? error.code : '';
    if ((code === 'EPERM' || code === 'EACCES') && /listen/u.test(message)) {
      context.skip(`XTend LLM app server probe skipped because this environment denies loopback listen (${message})`);
    } else {
      context.fail(`XTend LLM app server probe (${message})`);
    }
  } finally {
    if (server) await server.close();
  }
}


async function runProductXss({rootDir = path.resolve(__dirname, '../..')} = {}) {
 const context=createSuiteContext({id:'product-xss',label:'Product XSS probes'});
 const targets=["products/xtend-llm/src/main/app-server.mjs", "products/xtend-llm/src/main/external-navigation.mjs", "products/xtend-llm/src/main/ipc-contract.mjs", "products/xtend-llm/src/renderer/app-controller.mjs", "products/xtend-llm/src/renderer/markdown-format-bridge.mjs", "products/xtend-llm/src/renderer/citation-source-bridge.mjs", "products/xtend-llm/src/renderer/code-block-bridge.mjs"];
 for(const filePath of targets) {
  const findings=scanSourceText(fs.readFileSync(path.join(rootDir,filePath),'utf8'),{filePath});
  context.assert(findings.filter(f=>!f.allowlisted).length===0,`Product XSS sink scan: ${filePath}`);
 }
 const staticSite=fs.readFileSync(path.join(rootDir,'products/xtend-llm/site/index.html'),'utf8');
 context.assert(staticSite.includes('Content-Security-Policy'), 'XTend LLM static site carries CSP meta for local file/server smoke');
 context.assert(staticSite.includes("object-src 'none'"), 'XTend LLM static site CSP blocks objects');
 await assertXtendLlmProbes(context,rootDir,createXssPayloadCatalog());
 return context.result();
}
module.exports={runProductXss};

# XTend product demos

Seven complete Apache-2.0 product applications extracted from [konnilabs/xtend](https://github.com/konnilabs/xtend): ERP resumability, LLM/Electron, Shop/Payment Provider, Material workbench, AppServices test bench, animation test bench and kernel orchestration.

The source and third-party notices are preserved. Framework packages and XTend MCP are maintained in Core. Product source uses versioned public APIs; independent candidate installation never reads a sibling Core checkout.

**0.9.0 is not published.** Registry-only installation is blocked. Use the pinned source/candidate workflow in [the migration runbook](migration/README.md); initial merge is blocked until its exact source commit is durably available remotely. No @latest fallback is supported.

PR/push and nightly workflows build exact pinned Core source, install verified tarballs and require product gates on Node 24.18.0 and 26.5.0. PHP/Laravel, Chromium/WebDriver, Electron and Xvfb are mandatory runtimes.

See [ownership transfer](migration/owner-transfer.json), [shared assertion ownership](migration/shared-assertions.json), and the migration provenance/move map for source identities and transformations.

Candidate inventory offers all ten packages; app installation validates only its exact declared and required transitive XTend closure. Required peers participate; optional peers do not add unrelated packages. Installed required packages must resolve locally to verified tarballs; unknown internal packages, ranges, links and Registry fallbacks fail closed. Material scaffolds require Root/Maraca/Material plus CLI/compiler/Tailwind build tooling; MCP/Fabric/Shard/standalone RMT are not Material defaults.

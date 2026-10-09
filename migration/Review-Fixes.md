# Narrow fixes after C2/D1 review

The original C2/D1 focused review remains available independently. This follow-up fixes required Info-ZIP probing (`unzip -v`, missing/nonzero negatives), exact public Generator package versions and managed Testbench regeneration, dangling required Nightly outputs, SHA-archive Candidate packing, and preserved required Shop PHP/FPM execution. No schema governance acceptance or broad rewrite is performed.

Testbench regeneration uses the verified packed public CLI, preserving all author-owned seed bytes and every original provenance assertion. Candidate locks are refreshed from digest-verified local tarballs, never npm `@latest` or registry references for unpublished 0.9.0. Independent `npm ci` readiness requires the exact `.candidate` tarballs and matching manifest, available through the pinned Core pack workflow. Initial Demo merge remains blocked while the exact implementation Core commit cannot be fetched remotely.

The dedicated Shop workflow preserves all seven original Laravel/PHP lanes, including PHP 8.3 FPM in the Laravel 12 browser lane. The primary Node24/26 aggregates additionally provision PHP 8.4 FPM and require a distinct actual FPM browser report. CLI Shop browser execution is retained separately. Real FastCGI runtime and missing-executable negatives are required contracts, not static artifact substitutes.

Material tune baseline drift (`route` vs selected `none`), Shop missing-dependency pre-boot HTTP200 baseline behavior, and independent Node26/Chrome preflight timeout remain separate. Their assertions are not weakened and these failures do not authorize unrelated upgrades or security/auth changes. All commits remain local pending independent review before push/PR.

# Local review checkpoint — blocked

Core baseline: 31d8c01f92538b55e57e741ed4e71a4e4a6604b5. Demo baseline: b332bf11e68d998d94a8ffe8a6a86fffb1d665c7. Seven complete products move with per-file source/target hashes in move-map.json. These commits are reviewable snapshots, not green merge/release candidates.

Registry-only npm ci remains blocked by unpublished 0.9.0. Candidate locks refer to exact digest-named tarballs; reproduce them from the exact pinned Core commit. The referenced commit must be durably remotely fetchable before initial Demo merge; no push has been authorized yet.

Schema governance reconciliation remains paused and is not part of these commits. Four changed and six new schema contracts require separate review; generated candidate/runtime observations also remain explicitly unapproved. Authority artifact and proposed governance/source deltas are read-only review deliverables, not silently accepted baseline records.

Known red product gates: Testbench scaffold provenance/package generation, Material tune selection, Shop missing-dependency negative case, Electron layout readiness. Native/Electron individual runtime lanes pass on Node24 and Node26. Full current-baseline comparisons and exact evidence are recorded in the external checkpoint report.

Exact local C1 implementation pin: 8fa92f2d9c25cdfc53a043914c3b92d91051b6c5. Its clean detached checkout was packed without development mode; all eight independent candidate installations passed. This does not make the red product/schema gates merge-ready.

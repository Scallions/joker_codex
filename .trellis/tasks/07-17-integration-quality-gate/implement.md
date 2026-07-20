# Full Integration and Quality Gate — Implementation Plan

## 1. Execution Rules

- This child is the implementation target; do not start the parent task.
- Work in the ordered slices below. Every slice begins with a failing audit/test or
  a recorded reproducible gap and ends with focused validation.
- Reuse pure engine, transfer, profile/run-pair, repository, and presentation
  contracts. Do not reproduce gameplay logic in browser helpers.
- Preserve unrelated changes and the active `00-bootstrap-guidelines` task.
- No frozen count, rule mapping, balance value, schema/content version, browser
  policy, or scope boundary changes without returning to parent planning.
- Inline Codex mode loads `trellis-before-dev` before edits and `trellis-check`
  after implementation; the seed-only JSONL manifests are not an activation gate.

## 2. Ordered Work

### Slice 0 — Freeze the release baseline

- [x] Record clean HEAD, runtime/tool/browser versions, existing test counts,
      archived-child commit map, and current asset/build totals in task evidence.
- [x] Run the unmodified focused catalog, persistence, progression, presentation,
      build, and both-engine browser gates to identify current failures/flakes.
- [x] Add `tests/integration/` and extract only genuinely repeated V2 scenario/E2E
      helpers after searching existing `src/test-support` and browser specs.
- [x] Add an initial failing release-ledger test for the known documentation/
      coverage/evidence gaps; do not alter production behavior in this slice.

Primary ownership:

- `.trellis/tasks/07-17-integration-quality-gate/evidence.md`
- `src/test-support/**`
- `tests/integration/**`
- shared `tests/e2e` helpers where extraction is justified

Gate: the baseline is reproducible, helper extraction preserves all current tests,
and known gaps fail for their intended reason.

### Slice 1 — Strict catalog, coverage, ownership, and release audits

- [x] Implement the test-only closed coverage registry for all 380 catalog rows;
      forbid catch-all coverage and assert every referenced owner test exists.
- [x] Aggregate 52 cards, 12 hands, every parent catalog family, 150 contiguous
      Jokers, 31 achievements, 78 objective-registry rows, local assets,
      provenance, localization, handlers, discovery/unlock, and test ownership.
- [x] Audit all runtime IDs/paths for fixture or remote leakage and prove strict
      production dependency closure.
- [x] Cover malformed ledger rules so missing, overlapping, duplicate, or stale
      selectors make the audit fail.

Likely ownership:

- `tests/integration/releaseCoverage.ts`
- `tests/integration/release-catalog.test.ts`
- focused existing content/progression audit tests only where the authoritative
  assertion belongs there

Gate: AC1's exact totals and every zero-gap category are machine-checked from live
registries, not copied constants in release prose.

### Slice 2 — Capability interaction and canonical replay

- [x] Add the reusable V2-compatible transcript runner with invariant validation,
      full rejection equality, and transfer-safe canonicalization.
- [x] Build the capability-derived 26-window/effect-operation release matrix and
      named order-sensitive scenarios from the design.
- [x] Add repeated pure, persistence/reload, and export/import replay cases for
      campaign, seeded, challenge, tutorial, and endless policies.
- [x] Add Chromium/WebKit canonical replay that performs real UI commands and
      compares the IndexedDB profile/run pair with the pure result.
- [x] Add focused regressions for every verified interaction defect before fixing
      the owning production layer.

Likely ownership:

- `src/test-support/runScenarioV2.ts`
- `tests/integration/interaction-matrix.test.ts`
- `tests/integration/deterministic-replay.test.ts`
- `tests/e2e/release-replay.spec.ts`
- owning `src/game-core/**`, `src/content/**`, or `src/progression/**` files only if
  an actual reproduced defect requires correction

Gate: same-input canonical state matches across repeated pure runs, reload/transfer,
Chromium, and WebKit; rejected/false/fault branches preserve the full preimage.

### Slice 3 — Transaction fault injection and migration/import closure

- [x] Enumerate every existing IndexedDB write method and internal write stage
      before adding a seam; prefer fake-indexeddb/adaptor injection if sufficient.
- [x] Add the smallest optional named-stage fault hook only where an actual
      transaction stage cannot otherwise be forced; keep the production default
      absent and schema-neutral.
- [x] Snapshot all relevant object stores before and after each injected failure,
      then assert exact rollback and exactly-once clean retry.
- [x] Add app-thunk failure tests for profile/settings/meta/checkpoint/import/
      clear/reset/restore operations, Chinese errors, and no optimistic gameplay
      reveal.
- [x] Complete the V1-V7 repository/transfer table: idempotence, recovery preimage,
      future versions, invalid pair/setup, checksum/UTF-8 size, slot remap,
      Infinity, and non-mutation.
- [x] Complete the three-profile isolation matrix including shared device settings.

Likely ownership:

- `src/persistence/indexedDbRepository.ts` only if the test seam is necessary
- `tests/persistence/indexedDbRepository.test.ts`
- `tests/persistence/integration-fault-matrix.test.ts`
- `tests/app/store-failure-matrix.test.ts`
- existing migration/profile-transfer tests where table rows belong

Gate: every named write stage is either proven atomic by injection or explicitly
mapped to an already-atomic transaction, and no failure changes durable or visible
committed state.

### Slice 4 — Complete mode and profile E2E flows

- [x] Add deterministic campaign win, campaign loss, post-win endless, seeded
      play, challenge success, and challenge loss flows in Chromium and WebKit.
- [x] Reuse and aggregate tutorial completion/skip/replay, progression, collection,
      achievements, statistics, help, and profile maintenance flows; add only
      missing user-path assertions.
- [x] Refresh at action/terminal boundaries and compare IndexedDB checkpoints,
      result deltas, notices, and progression to canonical expectations.
- [x] Ensure imported late-game fixtures are test-only and every asserted
      transition uses real page controls and application persistence.
- [x] Capture failure diagnostics without retries: trace, console, failed response,
      remote request, and current route/checkpoint.

Likely ownership:

- `tests/e2e/release-flows.spec.ts`
- shared `tests/e2e/helpers/**`
- existing E2E specs only where a focused flow is naturally extended

Gate: both Playwright projects pass the complete R4 mode/profile matrix with no
network request outside the local origin and no unexplained retry.

### Slice 5 — Performance, assets, presentation, and large-value closure

- [x] Rerun and aggregate current 150-Joker, 230-emblem, 15-scene, 3-stem,
      22-SFX, 4-stinger, provenance, and zero-remote audits.
- [x] Enforce all approved gzip/asset/eager-resource/lazy-decode budgets from the
      design and verify the initial route requests no audio.
- [x] Rerun both-viewport geometry/visual snapshots and the P95/Long Task motion
      probe; inspect every actual/diff before accepting any baseline update.
- [x] Add a large endless/Infinity transfer and browser-render scenario without
      duplicating score arithmetic in presentation code.
- [x] Verify autoplay, fetch/decode, scene, and performer failures remain silent or
      non-blocking and cannot change the committed checkpoint.

Likely ownership:

- existing presentation/content asset tests and Playwright performance specs
- build/resource audit helper under `tests/integration/`
- source files only for reproduced regressions

Gate: every exact budget passes at 1280x720 and 1920x1080, all required assets are
local/owned, and large values remain transfer-safe and usable.

### Slice 6 — Release documentation and parent evidence

- [x] Update `README.md` from V4/50/280 to the current V7/150/380 product, modes,
      device settings, audit pages, and actual local/quality commands.
- [x] Run a stale-release-copy grep for obsolete 50/100-Joker and old current-schema
      claims, excluding intentionally versioned migration/history fixtures.
- [x] Populate `evidence.md` only from current command output, with exact commits,
      counts, budgets, browser versions, viewports, console/network status,
      intentional differences, and approved exceptions.
- [x] Map all eight archived children and parent AC-01 through AC-13 to current
      evidence; distinguish historical unchecked boxes from current failures.
- [x] Update the live parent acceptance state only after every child gate passes.
      Do not edit archived child histories.

Gate: AC6 is complete, release documentation is current, and a reviewer can trace
every parent criterion to reproducible evidence.

### Slice 7 — Full quality gate, real-browser smoke, and handoff

- [x] Run `trellis-check` over the complete child scope and fix every verified
      blocking finding at its owner with focused and full regression reruns.
- [x] Run the full command matrix in Section 3 from a clean dependency install.
- [x] Detect and record real Chrome, Edge, and Safari versions. Run each available
      automatable named browser at 1280x720 and 1920x1080; if unchanged, apply only
      the already-approved Chrome/Safari exception and rerun real Edge.
- [x] Perform mouse-first visual/audio review of critical flows, asset ensembles,
      both presentation speeds, mute/mix, and failure fallbacks.
- [x] Close PRD AC1-AC7 and parent evidence only after outputs are current and the
      worktree contains no unexplained artifacts.
- [x] Update executable specs if implementation establishes a new durable contract,
      commit intentionally, then run `trellis-finish-work` for this child.
- [x] Leave the parent unarchived and request a separate explicit parent AC/archive
      approval from the user.

Gate: no verified critical/warning defect remains, all evidence is current, this
child is ready to archive, and parent archival authority has not been assumed.

## 3. Validation Commands

Focused commands are added beside each slice. The final gate includes:

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run content:audit
node scripts/generate-catalog-emblems.mjs --check
node scripts/generate-presentation-audio.mjs --check
npm run build
npm run build:audit
npm run test:e2e
python3 ./.trellis/scripts/task.py validate 07-17-integration-quality-gate
git diff --check
```

Additional release-focused invocations should select the new integration,
persistence fault, replay, and E2E specs during development, then the final command
matrix reruns them in full.

Manual gates:

- inspect all changed visual baselines and contact sheets;
- mouse-first smoke at both viewports in every available approved real browser;
- listen to music/SFX separation, mute restoration, and key cue/stinger mapping;
- inspect console/network/resource evidence and verify no remote runtime request;
- review `evidence.md` against parent AC-01 through AC-13.

## 4. Risk and Rollback Gates

| Risk | Prevention / detection | Rollback point |
|---|---|---|
| Test harness reimplements gameplay | runner calls public commands/invariants only; compare with existing focused tests | remove helper and keep direct authoritative tests |
| Coverage registry becomes a false green catch-all | closed selectors, required classes, overlap/missing negative tests, existing file checks | revert registry slice without touching catalog |
| Fault hook leaks into production | optional constructor-only seam, no interface/schema/UI exposure, architecture test | remove seam and use adapter/fake-indexeddb injection |
| Browser fixtures bypass real behavior | import only setup; asserted transitions use visible controls and persisted checkpoints | fall back to slower real path or narrower claim |
| Full E2E becomes flaky or masks defects | workers remain bounded, zero retries, stable seeds, traces only on failure | isolate offending scenario and fix synchronization |
| Performance probe is polluted by catalog audit | retain two workers and separate resource-heavy specs | run probe in isolated project/command |
| Snapshot update hides regression | inspect actual/diff at both viewports before update | restore prior baseline and fix layout |
| Integration fix changes balance/schema | parent-plan diff check and frozen goldens | stop; return to parent planning |
| Historical task records are rewritten | current evidence owns reconciliation | revert archive edits; keep evidence links |

## 5. Pre-Start Review Checklist

- [x] `prd.md`, `design.md`, and `implement.md` agree on scope, evidence model,
      deterministic replay, persistence fault design, browser exception, budgets,
      and parent archival boundary.
- [x] The PRD convergence pass has removed duplicate temporary notes and contains
      only testable requirements and no unresolved product question.
- [x] Repository-answerable gaps are anchored in `research/current-baseline.md`.
- [x] Inline mode is confirmed; seed JSONL manifests need no curation.
- [x] The user has reviewed these artifacts and explicitly approved task activation.

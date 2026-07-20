# Progression, Tutorial, and Modes Implementation Plan

## 1. Execution Contract

Implement this task inline and in the order below. Each slice must leave the
repository type-safe and its focused tests green before the next slice begins.
Do not start presentation work until profile/run schemas, progression projection,
and atomic persistence are stable.

Before editing production code in Phase 2:

1. run `python3 ./.trellis/scripts/task.py start 07-17-progression-tutorial-modes`
   only after the user approves these planning artifacts;
2. load `trellis-before-dev` and reread `prd.md`, `design.md`, and this file;
3. use the relevant frontend/backend specs and shared cross-layer/reuse guides;
4. record the pre-change result of the focused baseline tests listed in Section 4.

The task stays as one implementation stream because the profile schema, Run V7,
repository transaction, app router, and screens share ownership. Do not dispatch
parallel implement/check agents in this inline workflow, and do not curate the
seeded JSONL manifests.

## 2. Ordered Implementation Slices

### Slice 0 — Freeze registries and failing contract tests

- [x] Add test fixtures for fresh-profile grants, all 78 catalog unlock references,
      the 15-by-8 deck/stake matrix, 20 sequential challenges, 150 Joker marks,
      12 hand-stat rows, and the exact 31-achievement registry/category counts.
- [x] Add catalog relationship tests proving every objective target exists, every
      upgraded voucher retains its paired in-run prerequisite, and dependency
      graphs are acyclic.
- [x] Add mode-policy table tests covering campaign, post-win endless, challenge
      (including only D15/A025–A027 downstream rows), seeded, tutorial, and
      migrated legacy evidence.
- [x] Add canonical fixture builders for deterministic progression facts and
      profile records; keep test-only shortcuts out of production reducers.
- [x] Verify the new tests fail for the intended missing contracts before adding
      implementation.

Primary ownership:

- `tests/progression/**` (new)
- `tests/content/eligibility.test.ts`
- `tests/helpers/**` (small typed fixtures only)

Gate: registry/count/dependency failures must be understandable without rendering
React or opening IndexedDB.

### Slice 1 — Profile V1 domain, validation, and legacy migration

- [x] Replace the minimal unversioned profile with `ProfileRecordV1`, preserving
      stable slot identity, name, creation/update timestamps, and active-run link.
- [x] Implement fresh defaults for tutorial state, baseline objectives, per-deck
      stakes, challenges, collection, victory marks, achievements, statistics,
      projection cursor, and bounded notices.
- [x] Add pure canonical normalization and `validateProfileRecord`; reject foreign,
      duplicate, unsorted, incomplete, unsafe, or future-version data.
- [x] Add evidence-only V0-to-V1 migration. It may recover supported active-run
      discoveries/setup/unsettled terminal evidence, but must leave unsupported
      historical counters and achievements at zero.
- [x] Preserve one raw pre-migration profile/run pair for recovery and prove
      migration idempotence.

Primary ownership:

- `src/persistence/profiles.ts`
- `src/persistence/schemas.ts` or a new `src/persistence/profileSchemas.ts`
- `src/persistence/migrations/migrateProfileV0ToV1.ts` (new)
- `tests/persistence/profile-migration.test.ts` (new)
- `tests/progression/profile-invariants.test.ts` (new)

Gate: three freshly created profiles are canonical and structurally independent;
invalid/future records fail without writes.

### Slice 2 — Run V7, mode identity, and seed contracts

- [x] Add `RunStateV7`, `sessionV7`, its Zod schema and invariant validator while
      retaining all V6 gameplay fields.
- [x] Add the pure V6-to-V7 migration and extend the sequential V1-to-V7 decode
      chain without consuming RNG or changing gameplay checkpoints.
- [x] Introduce run class, owner, per-profile run sequence, frozen eligibility and
      discovery snapshots, progression rules version, and tutorial script version.
- [x] Generate new run IDs from profile, sequence, class, and seed so repeated
      plays of one seed cannot collide; keep explicit deterministic fixture IDs.
- [x] Make campaign/seeded endless legal and challenge/tutorial endless illegal.
      Preserve legacy states conservatively.
- [x] Implement the pure eight-character seed normalizer/generator boundary and
      `BXQP1|progression-modes-1|SEED8|DNN|SNN` parser/serializer/preview validator.
- [x] Ensure setup selects only profile-unlocked deck/stake/challenge content and
      freezes that eligibility for the complete run.

Primary ownership:

- `src/game-core/model/runV7.ts` (new)
- `src/game-core/invariants/validateRunStateV7.ts` (new)
- `src/game-core/commands/**`
- `src/content/runtime/runSetupV7.ts` (new)
- `src/persistence/schemasV7.ts` (new)
- `src/persistence/migrations/migrateRunV6ToV7.ts` (new)
- `src/progression/seedCode.ts` (new)
- `tests/game-core/run-v7-*.test.ts` (new)
- `tests/persistence/migrate-run-v6-to-v7.test.ts` (new)
- `tests/progression/seed-code.test.ts` (new)

Gate: same code plus same supported content version reproduces setup/RNG; malformed
or future codes and unavailable setup choices cannot create or mutate a run.

### Slice 3 — Central progression fact pipeline

- [x] Create one closed `ProgressionFact` union derived from committed before/after
      run state plus typed domain events; do not parse presentation events.
- [x] Implement the run-class policy filter and checkpoint cursor deduplication.
- [x] Implement separate content-objective and 31-achievement registries on shared
      facts, including exact progress/target/completion timestamps.
- [x] Implement bounded statistics, 380-row collection projection, Joker discovery,
      15 deck marks, and 150 Joker victory marks.
- [x] Settle Ante 8 campaign victory once before finish/endless, deduplicate final
      Joker content IDs, and upgrade marks monotonically.
- [x] Produce a bounded result delta and coalesced keyed notices as reducer output.
- [x] Use an injected application timestamp only when a fact first completes a
      durable record; keep evaluation pure and deterministic.

Primary ownership:

- `src/progression/facts.ts` (new)
- `src/progression/modePolicy.ts` (new)
- `src/progression/objectives.ts` (new)
- `src/progression/achievements.ts` (new)
- `src/progression/statistics.ts` (new)
- `src/progression/collection.ts` (new)
- `src/progression/reducer.ts` and `selectors.ts` (new)
- `tests/progression/**`

Gate: every objective and achievement has positive, negative, boundary, mode, and
idempotence coverage; identical inputs and timestamp yield canonical-equivalent
profiles.

### Slice 4 — Atomic persistence, recovery, and transfer V7

- [x] Extend `GameRepository` so a command commits the prior recovery checkpoint,
      projected profile, and next run in one transaction.
- [x] Update `commitRunCommand` to follow proposal → run validation → fact
      derivation → profile projection → pair validation → atomic write → reveal.
- [x] On any domain, invariant, projection, or persistence failure, return the exact
      prior profile/run and reveal no presentation/progression events.
- [x] Keep physical IndexedDB version 1 and namespace recovery keys for checkpoint,
      profile action, migration, and legacy reads.
- [x] Implement abandon, recoverable reset, one-step restore, target-slot import
      with identity/owner remap, and typed-name permanent deletion as transactions.
- [x] Add Profile Transfer V7 with separate envelope/profile/run/content versions,
      canonical checksum, 2 MB limit, preview, sequential migrations, and future
      rejection. Exclude recovery and device settings from export.
- [x] Prove checkpoint recovery and profile-action recovery coexist and that all
      operations remain isolated across exactly three slots.

Primary ownership:

- `src/persistence/repository.ts`
- `src/persistence/indexedDbRepository.ts`
- `src/persistence/profileTransfer.ts`
- `src/app/commitRunCommand.ts`
- `tests/persistence/indexedDbRepository.test.ts`
- `tests/persistence/profile-export.test.ts`
- `tests/app/commitRunCommand.test.ts`
- new profile-action/isolation persistence tests

Gate: injected failures at every write boundary leave both IndexedDB and Redux at
the pre-operation state; restore returns the complete prior pair.

### Slice 5 — Tutorial script and always-available reference

- [x] Add versioned tutorial content with fixed seed, D01/S01, deck order, blind,
      reward, shop, Joker, pack, consumable, and valid targets.
- [x] Validate materialized scripted choices so catalog drift fails in tests/build.
- [x] Add the eight-step pure command gate, Chinese invalid-action guidance, and
      persisted step advancement only after a successful command commit.
- [x] Add start, skip at any step, close/reload resume, completion, and replay;
      preserve original completion timestamp and ordinary progression.
- [x] Add typed selectors for the 12-hand table and stable Chinese terminology
      reference, including current run hand levels when available.

Primary ownership:

- `src/tutorial/script.ts`, `gate.ts`, `reference.ts` (new)
- `src/content/runtime/runSetupV7.ts`
- `tests/tutorial/**` (new)

Gate: a tutorial can complete through real engine commands without changing any
ordinary objective, collection, achievement, mark, or statistics field.

### Slice 6 — App routing and mode orchestration

- [x] Expand app route state from loading/profiles/playing into a typed finite union
      covering profile selection, menu, setup, play, collection, achievements,
      statistics, help, maintenance, notices, and results.
- [x] Route active runs from committed run class/phase after reload; do not depend
      on transient component state.
- [x] Add fresh-profile tutorial prompt, main menu, continue, campaign setup,
      seeded preview/copy/paste, available challenges, and setup validation.
- [x] Inject clock and seed generation at the application boundary.
- [x] Update start/submit/finish thunks to return both projected profile and run,
      maintain the single victory settlement, and preserve mode policy on reload.

Primary ownership:

- `src/app/store/appSlice.ts`
- `src/app/store/index.ts`
- `src/app/App.tsx`
- `src/app/commitRunCommand.ts`
- `tests/app/**`

Gate: refresh at every route reconstructs the same functional destination from
durable state; unavailable modes/content cannot be started through thunk calls.

### Slice 7 — Functional Chinese screens

- [x] Replace direct D01/S01 start controls with Main Menu and Mode Setup screens.
- [x] Add Collection with exactly 380 projected rows, family/status filters,
      visible locked conditions, and non-leaking Joker masks.
- [x] Add the 31-entry 百戏成就簿, bounded Statistics screen, Help overlay,
      Tutorial coach, notices/history, and result delta panels.
- [x] Add profile maintenance previews and confirmations for abandon/reset/restore,
      import/export, and exact-name permanent deletion.
- [x] Make banners wait for the existing presentation queue, remain non-modal, and
      persist acknowledgement.
- [x] Keep all functional screens in Simplified Chinese within the existing
      fixed 1280x720 stage. Do not absorb the later art/audio/motion polish child.

Primary ownership:

- `src/presentation/progression/**` (new)
- `src/presentation/tutorial/**` (new)
- `src/presentation/screens/**`
- `src/presentation/catalog/**`
- `src/presentation/styles/**`
- `tests/presentation/**`

Gate: component tests cover every empty/locked/masked/completed/error state and
prove profile switches immediately change all projections.

### Slice 8 — Integrated browser and migration scenarios

- [x] Add browser flows for tutorial start/skip/resume/replay; campaign selection,
      victory, finish/endless; seeded share code; sequential challenge; stake
      unlock; collection/achievement/statistics; notices; and profile maintenance.
- [x] Cover save/reload and command retry at progression checkpoints, including the
      Ante 8 settlement boundary.
- [x] Cover legacy local data and transfers, cross-slot remap, recovery replacement,
      future-version rejection, and three-profile isolation.
- [x] Assert zero remote content requests and stable 1280x720 layouts in Chromium
      and WebKit. Update only intentional snapshots.

Primary ownership:

- `tests/e2e/progression.spec.ts` (new)
- `tests/e2e/tutorial.spec.ts` (new)
- `tests/e2e/profile-recovery.spec.ts` (new)
- existing snapshot directories only when behavior intentionally changes

Gate: all product acceptance paths pass from a fresh IndexedDB and from supported
legacy fixtures.

### Slice 9 — Full validation and handoff

- [x] Run every command in Section 4 from the configured workspace runtime.
- [x] Inspect exact registry counts and catalog projections; do not rely only on
      snapshots.
- [x] Run `git diff --check` and review the complete diff for accidental catalog,
      seed, migration, or profile-identity drift.
- [x] Load `trellis-check`; resolve all blocking findings and rerun affected gates.
- [x] Apply `trellis-update-spec` if implementation establishes a reusable contract,
      then commit through the normal Trellis finish workflow.

## 3. Risk Gates and Rollback Points

| Risk | Required evidence before proceeding | Rollback boundary |
|---|---|---|
| Profile V1 migration fabricates history | V0 fixtures show only baseline plus durable active-run evidence | Restore raw `migration:<profileId>` preimage; never synthesize counters |
| Run V7 changes deterministic gameplay | V6 pre/post-migration state and RNG continuation compare equal outside V7 metadata | Revert V7 call-site wiring as one slice; keep V6 reader intact |
| Same-seed run ID collision | Two starts in one profile and across profiles have distinct IDs with identical seed/RNG setup | Block run creation before persistence |
| Progress commits without run, or vice versa | Failure injection at every transaction operation proves pair atomicity | Abort IndexedDB transaction and retain prior Redux pair |
| Ante 8 awards twice | retry/reload/finish/endless tests retain one cursor and one result delta | Reject checkpoint at or behind cursor |
| Seed code silently drifts | supported-version fixture reproduces exact setup; future version is rejected | Keep parser pure and start disabled |
| Import overwrites wrong slot | validated preview plus target remap and recovery isolation tests | Restore `profile-action:<targetId>` snapshot |
| Tutorial leaks ordinary progress | complete/skip/replay profile diffs touch tutorial fields only | Reject tutorial facts in mode policy |
| Collection leaks Joker identity | DOM assertions forbid masked name/rules/rarity/flavor | Render only masked projection, never raw catalog row |
| Scope expands into presentation polish | functional 1280x720 screens pass without new art/audio pipeline | Defer polish to the dependent presentation child |

Schema and persistence slices are merge/rollback units. Do not partially roll back
a schema constant while leaving its decoder, migration, invariant, or transfer
format active.

## 4. Validation Commands

Use the workspace's configured Node >=22.12 runtime. If `node`/`npm` are not on
the interactive shell PATH, load the bundled workspace dependencies first rather
than changing package versions.

Focused gates while implementing:

```bash
npm run test -- tests/progression
npm run test -- tests/tutorial
npm run test -- tests/game-core/run-v7-identity.test.ts tests/persistence/migrate-run-v6-to-v7.test.ts
npm run test -- tests/persistence/indexedDbRepository.test.ts tests/persistence/profile-export.test.ts tests/app/commitRunCommand.test.ts
npm run test -- tests/app tests/presentation
npm run content:audit
```

Final gates:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=webkit
git diff --check
python3 ./.trellis/scripts/task.py validate 07-17-progression-tutorial-modes
```

The final report must state which commands ran, their outcomes, and any intentionally
deferred presentation-child work. A build alone is not sufficient evidence.

## 5. Pre-Start Review Checklist

- [x] `prd.md`, `design.md`, and `implement.md` agree on all mode policies, counts,
      unlock matrices, tutorial scope, seed format, and recovery semantics.
- [x] No genuinely blocking product question remains.
- [x] The user has reviewed and explicitly approved these final artifacts.
- [x] Task status remains `planning` until that approval.
- [x] Phase 2 begins with `trellis-before-dev`; implementation does not begin from
      conversation memory alone.

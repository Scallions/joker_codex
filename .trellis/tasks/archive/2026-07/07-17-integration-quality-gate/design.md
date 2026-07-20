# Full Integration and Quality Gate — Technical Design

## 1. Design Objective

Build a release gate around the current application rather than a second gameplay
implementation. Existing pure rules, app orchestration, persistence, Redux state,
and presentation remain authoritative. New code is limited to reusable test
harnesses, explicit fault seams, strict audits, defect fixes, and release evidence.

The gate answers four questions:

1. Is every frozen row and mode present, owned, reachable, and covered?
2. Do cross-catalog commands remain deterministic and atomic across every layer?
3. Does the complete local application survive reloads, failures, and supported
   browser differences?
4. Can every parent acceptance criterion be traced to current evidence?

## 2. Existing Architecture and Boundaries

```text
production catalog + frozen profile snapshot
                    |
                    v
          pure game-core proposal
                    |
        validate run/profile pair
                    |
                    v
    IndexedDB transaction + recovery preimage
                    |
                    v
          fulfilled Redux checkpoint
                    |
                    v
      transient React presentation/audio
```

- `src/game-core/**` owns deterministic commands, RNG, scoring, effect ordering,
  invariants, and domain/presentation evidence. It remains browser- and
  framework-free.
- `src/content/**` owns the 380-row production catalog, versioned frozen run
  content, dependency/capability metadata, localization, and asset/contract
  manifests.
- `src/app/**` owns propose/validate/persist/reveal orchestration and routes.
- `src/persistence/**` owns V1-V7 migration, profile/run pair validation,
  IndexedDB transactions, recovery, device settings, and transfer encoding.
- `src/progression/**` and `src/tutorial/**` own run-class policy and permanent
  projections.
- `src/presentation/**` may consume committed selectors/events only. Browser media
  remains optional and cannot affect durable state.

The integration gate may observe each boundary, but it must not copy the rules into
test helpers or UI assertions.

## 3. Planning-Time Gaps to Close

Repository inspection identified concrete release gaps rather than new product
requirements:

- `README.md` still advertises V4, 50 Jokers, and 280 total rows.
- Current audits prove catalog closure, but there is no single release ledger that
  combines all parent counts, test ownership, modes, and parent AC evidence.
- Browser coverage has strong individual flows but no one canonical cross-engine
  transcript for all current V7 profile/run state and no complete challenge
  success/loss plus seeded-play matrix.
- Repository tests cover core atomic transactions, but failure injection is not
  systematic across every internal write stage and app thunk.
- Early archived PRDs contain historical unchecked boxes. Current evidence must
  reconcile them without mutating archive history.

The unrelated active `00-bootstrap-guidelines` task and its template spec files are
preserved and do not block this product parent's 9/9 child count.

## 4. Release Coverage Model

### 4.1 Test-only registry

Add a test-only release coverage registry under `tests/integration/`. It maps a
closed selector to evidence owners:

```ts
interface ReleaseCoverageRule {
  readonly id: string;
  readonly selects: (row: CatalogRow) => boolean;
  readonly contractKinds: readonly (
    | 'positive'
    | 'boundary'
    | 'debuffed'
    | 'interaction'
    | 'persistence'
  )[];
  readonly testFiles: readonly string[];
}
```

Rules may select a family or contiguous Joker range only when the owning tests
really iterate that same closed set. The audit expands all rules over the live
catalog and requires every row to have exactly the required coverage classes and
existing test-file owners. A catch-all selector is forbidden. This avoids a
380-row hand-maintained duplicate manifest while still making uncovered rows fail.

The registry is test-only and is not imported by `src/**`, catalog snapshots, or
runtime content.

### 4.2 Strict aggregate audit

`tests/integration/release-catalog.test.ts` combines the existing single-source
constants and validators. It checks:

- 52 unique standard cards and 12 poker-hand definitions;
- all parent catalog family counts, 230 + 150 = 380, and strict dependency closure;
- 31 visible achievements and the existing 78 objective registry closure;
- localization, asset, provenance, ownership, effect handler, discovery/unlock,
  and coverage-rule closure;
- no production `fixture:` identity, remote URL, missing local path, duplicate
  focal key, or unowned content.

Existing focused tests remain authoritative. The release audit links and expands
them; it does not replace their mechanical assertions.

## 5. Deterministic Scenario Contract

### 5.1 Shared test runner

Extend `src/test-support/` with a V2-compatible runner instead of copying local
`apply()` loops among browser and integration specs:

```ts
interface ScenarioStepV2 {
  readonly buildCommand: (state: RunStateV2) => RunCommandV2;
  readonly expectedPhase?: RunStateV2['phase']['kind'];
  readonly expectedRejection?: RejectionCode;
}

interface ScenarioResultV2 {
  readonly state: RunStateV2;
  readonly domainEvents: readonly DomainEventV2[];
  readonly presentationEvents: readonly PresentationEventV2[];
}
```

The runner always uses `executeCommandV2`; each step builds its command from the
current committed state, validates the version-appropriate invariant after accepted
steps, and proves full-state equality after expected rejected steps. It contains no
alternative gameplay logic.

Browser helper extraction is limited to repeated profile import, IndexedDB read,
canonical-state read, pointer parking, and checkpoint waits already duplicated
across E2E specs.

### 5.2 Canonical comparison

Canonical state uses the existing transfer-safe score encoder before stable key
ordering. Raw `JSON.stringify` is forbidden because positive Infinity would become
`null`. Each release scenario compares:

- schema/content/run identity and checkpoint;
- RNG and all materialized choices;
- zones, inventory, modifiers, runtime targets, history, and score;
- paired profile projection cursor, discoveries, objectives, notices, and result;
- transfer round-trip and reload result.

One expected canonical result is computed from the pure transcript. Chromium and
WebKit execute the corresponding real UI commands and compare the IndexedDB pair
to that result. This avoids comparing one browser against a separately drifting
golden implementation.

### 5.3 Interaction matrix

The interaction matrix is capability-derived, not a full Cartesian product. Base
coverage is generated over every declared effect operation and all 26 windows.
Named scenarios own order-sensitive combinations:

- copy/retrigger/debuff and cycle/budget behavior;
- listed-chance zero/certainty/stacked power;
- destruction plus cloning/target snapshots;
- sale value, boss suppression, and sale-trigger payout;
- tag/voucher/pack/consumable acquisition and capacity;
- card enhancement/seal/edition with scoring and destruction;
- challenge restrictions and frozen unlock/discovery pools;
- terminal reward, progression projection, and post-win endless loss.

Any defect fix adds a focused regression at its owning boundary and is then folded
into the applicable integration scenario.

## 6. Persistence Fault Design

### 6.1 Named fault stages

Add an optional constructor-only test hook to `IndexedDbGameRepository` (or the
smallest equivalent transaction helper):

```ts
type PersistenceWriteStage =
  | 'settings:before-put'
  | 'meta:before-put'
  | 'profile:before-put'
  | 'run:before-put'
  | 'recovery:before-put'
  | 'profile-action-recovery:before-put'
  | 'before-transaction-done';

type PersistenceFaultHook = (stage: PersistenceWriteStage) => boolean;
```

The exact enum is finalized from the existing repository transactions before code
changes. The default hook is absent, so production behavior and stored schemas do
not change. When a test hook returns `true`, the repository synchronously aborts the
active transaction and rejects with a test-only error. Tests inject one failure at
one named stage, await the abort, and compare every relevant object store to the
preimage.

No hook is exposed through `GameRepository`, Redux, UI, IndexedDB, or profile
transfer. If fake-indexeddb can force a stage without a source seam, prefer that
and keep production code unchanged.

### 6.2 Matrix layers

The fault matrix has two levels:

1. Repository-level: exact object-store rollback for every write method and stage.
2. App-level: rejected thunks keep the prior Redux profile/run/route/presentation
   state, show a Chinese error, and commit exactly once after a clean retry.

The matrix covers settings, meta, save/delete/reset/restore, checkpoint,
replace/import, and clear/finish/abandon. Read failures are separately checked for
safe initialization fallback where the product contract permits it.

### 6.3 Migration and transfer

One table-driven suite loads each supported schema version through the same public
repository/transfer boundaries. It verifies migration idempotence, recovery
preimage, pair ownership, frozen eligibility/discovery, content version, RNG, and
materialized choices. Invalid/future variants and oversized or checksum-corrupt
imports are compared against complete before/after store snapshots.

## 7. Browser and Real-Desktop Matrix

Automated Playwright uses the configured two workers and both projects:

| Area | Chromium | WebKit | Viewports |
|---|---:|---:|---|
| Canonical replay/reload | required | required | 1280x720 |
| Campaign win/loss/endless | required | required | 1280x720 |
| Seeded/challenge/tutorial | required | required | 1280x720 |
| Profiles/progression/ledgers | required | required | 1280x720 |
| Fixed stage/resource/performance | required | required | 1280x720, 1920x1080 |

Late-game fixtures may be imported for setup, but the tested action always travels
through the real page control, Redux thunk, repository, and rendered committed
state. Tests record console errors, failed responses, remote requests, and stage
geometry.

At final review, detect real Chrome, Edge, and Safari and record versions. Run every
available/automatable named browser mouse-first. If the environment remains
unchanged, retain the user's 2026-07-20 exception exactly: real Edge is required;
Chrome absence and Safari remote-automation disablement are explicit waivers backed
by full Chromium/WebKit automation. Do not install browsers or toggle Safari
settings without separate authority.

## 8. Performance, Assets, and Presentation

Reuse the existing presentation audits and probes as single sources of truth. Add
only integration assertions needed for release aggregation:

- parse build output for the initial gzip budget without double-counting shared
  chunks;
- verify scene/emblem/audio/Joker sizes and counts from the current manifests;
- assert initial navigation has no audio requests and only the current scene;
- assert collection does not eagerly decode all 150 Joker images;
- keep motion P95 at or below 50 ms, zero Chromium Long Tasks above 50 ms, and the
  existing WebKit timer-drift fallback;
- exercise a transfer-safe Infinity/large-history endless state and ensure the
  stage remains usable;
- inspect current visual baselines before accepting any update.

Media and visual failures remain isolated from gameplay. A missing asset may use
the existing reserved local fallback, but the release asset audit itself still
fails if a required production file is absent.

## 9. Evidence and Documentation

`evidence.md` in this task is the current release dossier. It contains:

- exact HEAD/Node/npm/Playwright/browser versions;
- command results and test counts;
- catalog/progression/asset totals;
- performance/build/resource measurements;
- browser, viewport, console, and network matrix;
- current child archive/implementation commit map;
- parent AC-01 through AC-13 status and links;
- verified defects, fixes, intentional differences, and approved exceptions.

Evidence is written after commands complete; planning-time numbers are never copied
forward as current pass results. README is updated from the same frozen constants
and current supported flows.

Historical archived PRDs are not edited. Once every gate passes, the live parent
acceptance state may be updated to link the dossier. The child is then finished and
archived. Parent archival is a separate user-approved action.

## 10. Compatibility, Rollback, and Change Control

- No durable schema/content version change is planned. If a real fix requires one,
  return to parent planning before implementation.
- Test helpers and coverage registries are rollbackable independently because they
  do not enter production bundles or saves.
- The persistence fault seam is accepted only if the production default is a no-op,
  architecture tests exclude it from UI/runtime data, and normal repository suites
  remain byte-equivalent. Otherwise use adapter-level test doubles instead.
- Each implementation slice ends with focused tests and a clean diff. A failed
  slice rolls back only its owning harness/fix, never archived child commits or user
  data.
- Balance, catalog counts, IDs, and browser policy cannot be changed as a local
  defect fix.

# Release Integration and Quality Contracts

## Scenario: Closing a local release without weakening runtime contracts

### 1. Scope / Trigger

Use this contract when a change affects the cross-catalog release ledger,
deterministic replay, IndexedDB write behavior, browser release evidence, or the
initial production resource budget. These checks are release infrastructure: they
must derive their result from shipped registries, public game commands, committed
database records, and the built `dist/` graph.

The quality layer may add test-only fixtures and constructor-only fault injection.
It must not add fixture rows to production, reproduce gameplay rules in test
helpers, change the IndexedDB schema, or expose failure controls through the
repository interface or UI.

### 2. Signatures

```ts
export type PersistenceWriteStage =
  | 'settings:before-put'
  | 'meta:before-put'
  | 'profile:before-put'
  | 'profile:before-delete'
  | 'run:before-put'
  | 'run:before-delete'
  | 'recovery:before-put'
  | 'recovery:before-delete'
  | 'profile-action-recovery:before-put'
  | 'profile-action-recovery:before-delete'
  | 'before-transaction-done';

export type PersistenceFaultHook = (stage: PersistenceWriteStage) => boolean;

export interface IndexedDbGameRepositoryOptions {
  readonly faultHook?: PersistenceFaultHook;
}

new IndexedDbGameRepository(databaseName?: string, options?: IndexedDbGameRepositoryOptions);
```

```ts
export interface ScenarioStepV2 {
  readonly buildCommand: (state: RunStateV2) => RunCommandV2;
  readonly expectedPhase?: RunStateV2['phase']['kind'];
  readonly expectedRejection?: RejectionCodeV2;
}

export function runScenarioV2(
  initialState: RunStateV2,
  steps: readonly ScenarioStepV2[],
): ScenarioResultV2;
```

```ts
export function auditReleaseCoverage(
  rows: readonly CatalogRow[],
  rules: readonly ReleaseCoverageRule[],
): ReleaseCoverageAudit;
```

The production build budget is invoked after `vite build`:

```bash
npm run build:audit
```

### 3. Contracts

- `faultHook` is optional, constructor-only, and absent in production callers. A
  `true` result synchronously aborts the current read/write transaction and throws
  `测试故障：<stage>`. All pending `transaction.done` rejections are consumed by the
  seam so tests receive the named failure rather than an unhandled rejection.
- Each stage is injected immediately before its named put/delete or immediately
  before awaiting transaction completion. It never changes store names, keys,
  schemas, serialized records, or `GameRepository`.
- A failed write keeps the complete preimage of `meta`, `settings`, `profiles`,
  `runs`, and `recovery`. The Redux view must also retain the last committed
  profile/run/settings and reveal no uncommitted presentation sequence. Removing a
  one-shot fault and retrying performs one clean commit.
- `runScenarioV2` calls the public command executor, validates accepted states with
  the matching V2-V7 invariant validator, and aggregates returned domain and
  presentation events. Expected rejections compare a transfer-safe serialization
  of the entire run preimage.
- The release ledger covers every live production row exactly once. Non-Joker
  selectors are closed families. Joker selectors are bounded ordinal ranges and a
  single `1..150` catch-all is forbidden. Every rule has unique identity, required
  positive/boundary coverage, required debuffed Joker coverage, and existing owner
  test files.
- The strict release aggregate reads live registries and proves 52 cards, 12 hands,
  230 non-Jokers, 150 contiguous Jokers, 380 total rows, 31 achievements, 78
  objectives, complete localization/assets/provenance/handlers/discovery/ownership,
  and zero unresolved or remote production dependencies.
- `build:audit` reads `dist/index.html`, follows initial module/stylesheet and
  recursive static import references, includes the shared `react-*.js` chunk,
  de-duplicates files, rejects paths outside `dist/`, and sums gzip level-9 bytes.
  The limit is `350 * 1024 = 358400` bytes.
- `index.html` explicitly declares a local SVG favicon. Named browsers must not
  fall back to a missing `/favicon.ico`, because release smoke treats local 404s as
  console failures.

### 4. Validation & Error Matrix

| Condition | Required result |
|---|---|
| Fault hook returns `false` or is absent | Run the normal transaction with no behavioral difference |
| Fault hook returns `true` at a named stage | Abort the whole transaction and throw `测试故障：<stage>` |
| Store snapshot differs after an injected failure | Release-blocking atomicity failure |
| Retry fails or applies the action more than once | Release-blocking recovery failure |
| Rejected scenario command changes transfer-safe state or RNG | Scenario runner throws a preimage error |
| Accepted scenario state violates its schema-version invariant | Scenario runner throws with the invariant violations |
| Catalog row has zero or multiple coverage rules | Release coverage audit fails |
| Rule ID is duplicated, owner test is missing, or contract class is incomplete | Release coverage audit fails |
| Joker rule is the full `1..150` range | Rule is invalid even if every row appears covered |
| Strict catalog contains fixture, remote, unresolved, unlocalized, unowned, or unhandled data | Release catalog audit fails |
| Initial built graph escapes `dist/` or references a missing file | `build:audit` throws |
| Initial gzip total exceeds 358400 bytes | `build:audit` throws with actual and allowed byte totals |
| Named browser emits a local 404 or remote runtime request | Real-browser gate fails; identify and fix or explicitly approve the exception |

### 5. Good / Base / Bad Cases

- Good: a one-shot `run:before-put` failure leaves all five stores and Redux state
  byte-equivalent; the next checkpoint succeeds once and produces presentation
  only after durable commit.
- Good: campaign, seeded, challenge, tutorial, and endless fixtures reach the same
  canonical profile/run pair through repeated pure execution, IndexedDB reopen,
  export/import, Chromium, and WebKit.
- Good: adding a new catalog family or Joker batch also adds a closed coverage rule
  pointing to real positive/boundary/interaction owners.
- Base: production constructs `new IndexedDbGameRepository()` without options and
  observes the same schema and behavior as before the seam existed.
- Base: lazy route chunks, catalog images, scenes, and audio do not count toward the
  initial gzip graph unless they become statically initial dependencies.
- Bad: a fault hook is stored in IndexedDB, exposed on `GameRepository`, or toggled
  from UI/runtime configuration.
- Bad: browser helpers calculate expected score/progression instead of comparing
  the persisted pair with the public pure commit result.
- Bad: a release ledger marks all Jokers covered with one broad selector or refers
  to a deleted test file.
- Bad: a size gate adds Vite's printed gzip rows and double-counts shared chunks, or
  ignores a static dependency because it is not directly present in `index.html`.

### 6. Tests Required

- `tests/integration/release-catalog.test.ts` and
  `tests/integration/release-coverage.test.ts`: exact live counts, strict catalog
  closure, favicon declaration, and malformed coverage rules.
- `tests/integration/interaction-matrix.test.ts`: every effect operation, all 26
  windows, and named risky interaction groups with no overlap or gap.
- `tests/integration/scenario-runner.test.ts` and
  `tests/integration/deterministic-replay.test.ts`: accepted/rejected transcripts,
  version-aware invariants, five run classes, reload, and transfer equality.
- `tests/persistence/integration-fault-matrix.test.ts`: every write surface and
  meaningful named stage, all-store preimage equality, and clean retry.
- `tests/app/store-failure-matrix.test.ts`: committed Redux view, Chinese error,
  no presentation leak, durable preimage, and retry.
- `tests/persistence/profile-isolation-matrix.test.ts`: all three slots plus shared
  device settings.
- `tests/e2e/release-replay.spec.ts` and `tests/e2e/release-flows.spec.ts`: real UI
  controls, canonical IndexedDB pair, terminal challenge paths, and large
  endless/Infinity transfer in Chromium and WebKit.
- `npm run build && npm run build:audit`: exact initial gzip report after every
  dependency or entry-graph change.
- Full release completion also requires format, lint, strict TypeScript, all
  Vitest/coverage/content/generator gates, 64-case Chromium/WebKit E2E, named
  Chrome/Edge desktop smoke, Safari smoke or the explicitly approved WebDriver
  exception, Trellis validation, and `git diff --check`.

### 7. Wrong vs Correct

#### Wrong

```ts
// Leaks a mutable test switch into production and may fail after partial writes.
repository.failNextWrite = true;
await store.put(profile);
throw new Error('forced failure');
```

```ts
// A false green: every Joker is nominally owned by one catch-all rule.
{ selector: { family: 'joker', firstOrdinal: 1, lastOrdinal: 150 } }
```

#### Correct

```ts
let armed = true;
const repository = new IndexedDbGameRepository(databaseName, {
  faultHook: (stage) => {
    if (!armed || stage !== 'run:before-put') return false;
    armed = false;
    return true;
  },
});
```

```ts
// Closed, reviewable ranges point at real behavior and ledger owners.
{
  selector: { family: 'joker', firstOrdinal: 131, lastOrdinal: 145 },
  contractKinds: ['positive', 'boundary', 'debuffed'],
  testFiles: [
    'tests/game-core/jokers-131-145.test.ts',
    'tests/content/joker-catalog-101-150.test.ts',
  ],
}
```

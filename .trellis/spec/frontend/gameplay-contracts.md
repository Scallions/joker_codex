# Gameplay and Local Persistence Contracts

> Executable boundaries for the deterministic game engine, Redux orchestration,
> IndexedDB persistence, and the fixed desktop stage.

## 1. Scope / Trigger

Use this contract whenever a change adds or modifies a gameplay command, `RunState`
field, RNG consumer, profile/save field, IndexedDB store, or screen transition.
These values cross the pure engine, application store, persistence adapter, and
React presentation layers, so a local-looking change can otherwise break replay or
resume determinism.

## 2. Signatures

```ts
type CommandResultV2 =
  | {
      readonly ok: true;
      readonly state: RunStateV2;
      readonly domainEvents: readonly DomainEventV2[];
      readonly presentationEvents: readonly PresentationEventV2[];
    }
  | {
      readonly ok: false;
      readonly rejection: { readonly code: RejectionCode; readonly message: string };
    };

function executeCommandV2(
  state: RunStateV2,
  command: RunCommandV2,
): CommandResultV2;

function commitRunCommand(
  repository: Pick<GameRepository, "commitCheckpoint">,
  profile: ProfileRecord,
  current: RunStateV2,
  command: RunCommandV2,
): Promise<CommitRunCommandResult>;
```

Every `RunCommandV2` contains the caller's `checkpointId`. Random operations accept
the PRNG value from `RunState.rngState` and return the next value in the proposed
state; they never read ambient randomness.

```ts
type EffectWindow =
  | "blind-selected" | "round-start" | "before-hand"
  | "scored-card" | "held-card" | "joker-independent" | "after-hand"
  | "discard" | "round-end" | "blind-skipped" | "shop-entered"
  | "shop-rerolled" | "item-acquired" | "pack-opened" | "ante-ended";

interface EffectReference {
  readonly id: string;
  readonly handlerId: string;
  readonly windows: readonly EffectWindow[];
  readonly priority: number;
  readonly parameters: Readonly<Record<string, string | number | boolean | null>>;
}

function resolveEffectQueue(
  sources: readonly EffectQueueSource[],
  window: EffectWindow,
  options?: { maximumDepth?: number; maximumOperations?: number },
): EffectQueueResolution;

function validateRunStateV2(state: RunStateV2):
  | { readonly ok: true }
  | { readonly ok: false; readonly violations: readonly string[] };
```

Handler IDs are registered in executable code. Durable content stores only
`EffectReference`; it never stores functions. Queue ancestry is limited to 32 and
one command may resolve at most 10,000 effect operations.

```ts
interface RunStateV3 extends RunStateV2 {
  readonly schemaVersion: 3;
  readonly contentVersion: "run-economy-2" | "catalog-baseline-3";
  readonly mode:
    | "migrated-run-economy"
    | "production-campaign"
    | "production-challenge";
  readonly setupV3: RunSetupIdentityV3;
  readonly productionContentV3: RunContentSnapshotV3;
  readonly rulesV3: RunRulesV3;
  readonly modifiersV3: RunModifiersV3;
  readonly externalDependenciesV3: ExternalDependencyStateV3;
  readonly materializedChoicesV3: readonly MaterializedChoiceV3[];
  readonly migrationV3: MigrationMetadataV3;
}

function createProductionRunV3(
  catalog: ProductionCatalog,
  options: CreateProductionRunOptionsV3,
): RunStateV3;

function migrateRunV2ToV3(run: RunStateV2): RunStateV3;

function validateRunStateV3(state: RunStateV3):
  | { readonly ok: true }
  | { readonly ok: false; readonly violations: readonly string[] };
```

Migration is pure and consumes no RNG. A production run snapshots all resolved
player-facing content; a migrated V2 run keeps its embedded fixture snapshot and
records its source schema/checkpoint in `migrationV3`.

```ts
interface GameRepository {
  initialize(): Promise<void>;
  listProfiles(): Promise<ProfileRecord[]>;
  getProfile(id: ProfileId): Promise<ProfileRecord | undefined>;
  saveProfile(profile: ProfileRecord): Promise<void>;
  deleteProfile(id: ProfileId): Promise<void>;
  setActiveProfile(id: ProfileId | null): Promise<void>;
  getActiveProfileId(): Promise<ProfileId | null>;
  loadRun(id: ProfileId): Promise<RunStateV2 | undefined>;
  loadRecoveryRun(id: ProfileId): Promise<RunStateV2 | undefined>;
  commitCheckpoint(profile: ProfileRecord, run: RunStateV2): Promise<void>;
  replaceProfile(profile: ProfileRecord, run: RunStateV2 | null): Promise<void>;
  clearRun(profile: ProfileRecord): Promise<void>;
}
```

Physical IndexedDB version 1 owns `meta`, `settings`, `profiles`, `runs`, and
`recovery`; the current logical run/content schema inside those stores is V3
(`catalog-baseline-3`). Loads chain V1 -> V2 -> V3 while preserving a
pre-migration recovery record. Profile export writes a V3
`profile-transfer-3` envelope with `profile`, optional `run`, run content
version, and a checksum over the canonical payload; import still accepts and
migrates valid V2 envelopes. Positive Infinity is encoded by the score wire
codec and must never pass through raw `JSON.stringify` as `null`.

## 3. Contracts

- `src/game-core/**` is framework-free and may not import React, Redux, Motion,
  IndexedDB, `idb`, presentation, or application modules.
- The V2-compatible command surface and `RunStateV3` are fully serializable.
  Production runs use `bxqp:` identifiers and snapshot the resolved 230-row
  non-奇牌 catalog; migrated foundation runs retain their embedded `fixture:`
  identities and `run-economy-2` content version.
- Content IDs identify catalog entries; they never select engine behavior. Content
  points to registered handlers by `handlerId`; only handlers emit the exhaustive
  `EffectOperation` union. Do not route behavior with `contentId` or ad hoc
  `handlerId === ...` branches.
- The 15 hook windows are command-routing contracts, not documentation-only tags.
  Lifecycle commands call the shared bounded queue; scoring preserves the fixed
  before-hand -> scored-card -> held-card -> joker -> global -> after-hand order.
- Copy/retrigger uses queue entries and ancestry tokens, never recursive handler
  calls. Missing handlers, cycles, or operation-budget overflow reject the whole
  proposal without changing RNG/checkpoint.
- Visible random results (lineups, shops, generated cards, pack options, boss
  reroll choices) are materialized into `RunStateV2` before commit. Empty/blocked
  pools do not consume RNG.
- V3 also materializes setup identity, card/Joker modifiers, external dependency
  resolution, and random choice records. New runs default to production D01/S01;
  fixtures remain explicit test/migration inputs only.
- Inventory capacity is the sum of instance `slotContribution`. A pack's temporary
  capacity is consumed once and materialized as an instance-level contribution
  exemption; it is not a hidden UI allowance.
- `history.effectObservations` is the serializable observation hook for later
  progression/catalog children. Each record includes window, source/effect IDs,
  value, and the checkpoint that committed it.
- `Math.random()`, current time, browser globals, and mutable module-level state are
  forbidden inside the engine. Time and seed values enter through commands/factories.
- A valid command returns a new proposed state whose `checkpointId` advances once.
  A rejection returns no state, consumes no RNG, and performs no persistence.
- The application flow is `propose -> validate invariants -> persist transaction ->
  reveal state/events`. React never displays a proposed checkpoint before
  `transaction.done` resolves.
- `commitCheckpoint` writes the prior run to `recovery`, then writes the profile and
  new run in one read-write transaction. Import replacement is also atomic.
- Import accepts at most 2 MB, validates JSON, schema/content versions, checksum,
  profile/run identity, and run invariants before requesting user confirmation.
- Screens dispatch typed commands and render selectors/state only; poker evaluation,
  money changes, draw order, and inventory rules do not live in components.
- The 16:9 stage uses `overflow: clip`, not `overflow: hidden`. The latter creates a
  scroll container; focusing a bottom action can retain an internal scroll offset
  across screens and shift the next absolute-positioned screen. Welcome typography
  must be scoped as `.welcome h1`, never `.stage h1`.

## 4. Validation & Error Matrix

| Condition | Required result |
|---|---|
| Command checkpoint differs from state | `stale-checkpoint`; no mutation/RNG use |
| Command is illegal in the current phase | `illegal-phase`; no persistence |
| Selection is empty or exceeds five cards | Typed rejection; budgets unchanged |
| Hands/discards/money/capacity exhausted | Typed rejection; checkpoint unchanged |
| Effect handler is missing | `effect-handler-missing`; reject the proposal |
| Effect ancestry cycles or exceeds 32 | `effect-cycle`; no partial operations |
| Effect resolution exceeds 10,000 operations | `effect-budget`; no truncation |
| Item/pack/blind/tag/voucher reference is absent from frozen content | Invariant or `pool-empty`; do not commit |
| Pending choice has foreign/duplicate targets or stale choice ID | `invalid-target`/`choice-mismatch`; preserve frame and RNG |
| Reward ID is already consumed or receipt total does not equal its lines | Invariant failure; do not persist |
| Money would fall below `-allowedDebt` | `insufficient-funds`; preserve offer and RNG |
| Proposed state violates card, ID, budget, or phase invariants | Do not persist or reveal it |
| IndexedDB transaction rejects | Keep the exact prior React state; report Chinese error |
| Import exceeds size, fails JSON/Zod/checksum, or mismatches IDs | Reject before confirmation; keep all slots intact |
| Stored V1/V2 run is valid | Migrate to V3 atomically and keep the exact preimage in `recovery` |
| Stored/exported schema or content version is newer/unsupported | Reject; never downgrade or replace current data |
| `integration-strict` has unresolved reserved 奇牌 IDs | Catalog/run creation fails; test doubles are forbidden |
| Production catalog count, localization, asset, ownership, or contract closure drifts | Bootstrap/content audit fails before play |
| Profile is deleted or replaced | Profile, run, recovery, and active-profile metadata remain consistent in one transaction |

## 5. Good / Base / Bad Cases

- Good: the same seed plus command sequence yields byte-equivalent canonical state
  in the pure scenario runner, Chromium, and WebKit, including RNG/checkpoint values.
- Good: a new fixture adds a serializable `EffectReference` and registered pure
  handler; existing routing invokes it at the declared window without a command
  switch change.
- Good: production D01/S01 created twice from the same seed has identical setup,
  230-row snapshot, lineup, RNG, and materialized choices, including after a
  save/reload or export/import round trip.
- Base: a rejected command returns a Chinese domain error while the current run,
  random state, budgets, and save remain unchanged.
- Base: a valid V2 fixture run loads as V3 with `run-economy-2`, while every
  fixture ID and already materialized offer/choice remains unchanged.
- Bad: a component calculates score or draws cards, a handler mutates state or calls
  itself, a thunk updates Redux before `commitCheckpoint` resolves, or a migration
  silently invents missing gameplay data.
- Bad: replacing a V2 snapshot with current production rows, resolving future
  奇牌 dependencies with shipped doubles, or offering behavior through a
  `contentId`/`handlerId` conditional outside the registry.

## 6. Tests Required

- Golden PRNG vector and deterministic shuffle conservation.
- Table tests for all 12 poker classifications plus permutation properties.
- Command tests for success, stale checkpoint, illegal phase, exhausted budgets,
  deterministic replay, win/loss, shop actions, and invariant preservation.
- One registry matrix must cover every `EffectOperation` and all 15 windows. Command
  integration must prove lifecycle windows produce durable observations; score
  goldens must freeze source/copy/retrigger ordering and cycle/budget rejection.
- Accepted campaign/economy commands must pass `validateRunStateV2` and a V2 Zod
  structured-clone round trip after every checkpoint. Rejections must compare the
  entire prior state, RNG, offers, inventory, and checkpoint.
- Property tests mix legal and rejected V2 commands and assert the same invariants;
  include regression coverage for face-down/forced/selected IDs after zone moves.
- Repository tests for checkpoint/recovery, injected write failure, three-profile
  isolation, atomic replacement, and invalid import non-mutation.
- V2-to-V3 migration must be idempotent, retain the V2 recovery preimage, and
  preserve production V3 state exactly through IndexedDB and profile
  export/import round trips.
- Component tests assert screens dispatch commands and show committed state/errors.
- Playwright runs the same deterministic script in Chromium and WebKit, reloads at
  action boundaries, compares the full saved `RunState`, and covers win, loss, shop,
  profile isolation, and export/import.
- The catalog audit must prove exactly 230 unique production rows, all-local
  assets, 13 family render paths, and zero remote content requests in Chromium
  and WebKit.
- Visual snapshots cover profile, table, shop, and result at 1280x720. Move the mouse
  away from hover targets and wait for Motion springs before capturing.

## 7. Wrong vs Correct

### Wrong

```ts
// UI exposes an uncommitted proposal and domain code reads ambient randomness.
const result = executeCommandV2(run, command);
if (result.ok) dispatch(runChanged(result.state));
await repository.commitCheckpoint(profile, result.state);

// Catalog IDs must not select executable behavior.
if (effect.handlerId === "fixture:some-handler") mutateRun(run);
```

### Correct

```ts
const result = executeCommandV2(run, command);
if (!result.ok) return result;

const validation = validateRunStateV2(result.state);
if (!validation.ok) return invariantFailure(validation.violations);
await repository.commitCheckpoint(profile, result.state);
return result; // reducer reveals this checkpoint only after persistence succeeds
```

Handlers stay pure and return primitives; the queue applies them after cycle/budget
validation:

```ts
registry["fixture:run-economy:handler:add-money"] = (effect) => [
  { type: "add-money", amount: readSafeInteger(effect, "amount") },
];
```

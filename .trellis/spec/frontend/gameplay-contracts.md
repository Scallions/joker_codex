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
  nowEpochMs: number,
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
  | "shop-rerolled" | "item-acquired" | "pack-opened" | "pack-skipped"
  | "item-sold" | "playing-card-added" | "playing-card-modifier-succeeded"
  | "other-joker-resolved" | "ante-ended" | "consumable-used"
  | "playing-card-destroyed" | "boss-ability-triggered"
  | "blind-survival" | "shop-left" | "passive";

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

The first production Joker batch advanced durable runs to V4. V3 and V4 remain
supported migration inputs and compatibility shapes; the second production batch
advances new local campaigns to V5.

```ts
interface JokerModifierStateV4 extends JokerModifierStateV3 {
  readonly abilityState: Readonly<Record<string, string | number | boolean>>;
}

type RunStateV4 = Omit<
  RunStateV3,
  "schemaVersion" | "contentVersion" | "modifiersV3"
> & {
  readonly schemaVersion: 4;
  readonly contentVersion:
    | "run-economy-2"
    | "catalog-baseline-3"
    | "joker-catalog-1";
  readonly modifiersV3: RunModifiersV4;
  readonly migrationV4: MigrationMetadataV4;
};

function createProductionRunV4(
  catalog: ProductionCatalog,
  options: CreateProductionRunOptionsV4,
): RunStateV4;

function migrateRunV3ToV4(run: RunStateV2): RunStateV4;

function validateRunStateV4(state: RunStateV4):
  | { readonly ok: true }
  | { readonly ok: false; readonly violations: readonly string[] };

function resolvePlayedHandV3(
  state: RunStateV4,
  cards: readonly RunPlayingCard[],
): ScoreResolution;
```

```ts
interface JokerRuntimeStateV5 {
  readonly initialDeckSize: number;
  readonly sharedRoundTargetRank: Rank | null;
  readonly sharedRoundTargetSuit: Suit | null;
  readonly bossDisabledForRound: boolean;
}

type RunStateV5 = Omit<RunStateV4, "schemaVersion" | "contentVersion"> & {
  readonly schemaVersion: 5;
  readonly contentVersion:
    | "run-economy-2"
    | "catalog-baseline-3"
    | "joker-catalog-1"
    | "joker-catalog-2";
  readonly jokerRuntimeV5: JokerRuntimeStateV5;
  readonly migrationV5: MigrationMetadataV5;
};

function createProductionRunV5(
  catalog: ProductionCatalog,
  options: CreateProductionRunOptionsV5,
): RunStateV5;

function migrateRunV4ToV5(run: RunStateV4): RunStateV5;

function validateRunStateV5(state: RunStateV5):
  | { readonly ok: true }
  | { readonly ok: false; readonly violations: readonly string[] };
```

The third production Joker batch advances new campaigns and normalized saves to
V6 while keeping every V2-V5 content snapshot as a supported migration input.

```ts
interface JokerRuntimeStateV6 {
  readonly castleTargetSuit: Suit | null;
  readonly idolTargetRank: Rank | null;
  readonly idolTargetSuit: Suit | null;
  readonly jokerCapacityDebt: number;
}

type RunStateV6 = Omit<RunStateV5, "schemaVersion" | "contentVersion"> & {
  readonly schemaVersion: 6;
  readonly contentVersion:
    | "run-economy-2"
    | "catalog-baseline-3"
    | "joker-catalog-1"
    | "joker-catalog-2"
    | "joker-catalog-3";
  readonly jokerRuntimeV6: JokerRuntimeStateV6;
  readonly migrationV6: MigrationMetadataV6;
};

function createProductionRunV6(
  catalog: ProductionCatalog,
  options: CreateProductionRunOptionsV6,
): RunStateV6;

function migrateRunV5ToV6(run: RunStateV5): RunStateV6;

function validateRunStateV6(state: RunStateV6):
  | { readonly ok: true }
  | { readonly ok: false; readonly violations: readonly string[] };

interface ListedChanceRequestV6 {
  readonly numerator: number;
  readonly denominator: number;
  readonly sourceId: string;
  readonly reason: string;
}

interface ListedChanceResultV6 {
  readonly succeeded: boolean;
  readonly effectiveNumerator: number;
  readonly denominator: number;
  readonly roll: number | null;
  readonly rngState: RandomState;
}

function resolveListedChanceV6(
  request: ListedChanceRequestV6,
  listedChancePower: number,
  rngState: RandomState,
): ListedChanceResultV6;

function buildFrozenJokerSourceGraphV6(
  sources: readonly EffectQueueSource[],
  eventId?: string,
): FrozenJokerSourceGraphV6;

function destroyPlayingCardsV6(
  state: RunStateV2,
  cardIds: readonly CardId[],
  reason: string,
): RunWindowResolutionV2;

function hasFourDistinctSuitAssignment(
  scoringCardIds: readonly CardId[],
  identities: Readonly<Record<CardId, EffectivePlayingCardV3>>,
): boolean;

function usedJokerSlotsForRun(run: RunStateV2): number;
function usedConsumableSlotsForRun(run: RunStateV2): number;
function effectiveHandsPerRoundForRun(run: RunStateV2): number;
function bossEffectsDisabledForRun(
  run: RunStateV2,
  blind?: MaterializedBlind | null,
): boolean;
```

V7 adds profile ownership, a monotonic run sequence, run-class policy, and frozen
profile-derived eligibility to the V6 gameplay state. New runs must be V7; V1-V6
runs are compatibility inputs only.

```ts
type RunClassV7 =
  | "campaign"
  | "seeded"
  | "challenge"
  | "tutorial"
  | "migrated-legacy";

interface RunSessionV7 {
  readonly runClass: RunClassV7;
  readonly profileId: ProfileId | null;
  readonly runSequence: number;
  readonly progressionRulesVersion: typeof PROGRESSION_RULES_VERSION;
  readonly eligibilityObjectiveIds: readonly string[];
  readonly discoveredContentIds: readonly string[];
  readonly tutorialScriptVersion: typeof TUTORIAL_SCRIPT_VERSION | null;
}

type RunStateV7 = Omit<RunStateV6, "schemaVersion" | "contentVersion"> & {
  readonly schemaVersion: 7;
  readonly contentVersion: RunStateV6["contentVersion"];
  readonly sessionV7: RunSessionV7;
  readonly migrationV7: MigrationMetadataV7;
};

interface CreateProductionRunOptionsV7 extends CreateProductionRunOptionsV6 {
  readonly profileId: ProfileId;
  readonly runSequence: number;
  readonly runClass: Exclude<RunClassV7, "migrated-legacy">;
  readonly eligibilityObjectiveIds: readonly string[];
  readonly discoveredContentIds: readonly string[];
}

function createProductionRunV7(
  catalog: ProductionCatalog,
  options: CreateProductionRunOptionsV7,
): RunStateV7;

function migrateRunV6ToV7(run: RunStateV2): RunStateV7;
function validateRunStateV7(state: RunStateV7): RunValidationResultV3;
function validateProfileRunPair(
  profile: ProfileRecord,
  run: RunStateV2 | null,
): ProfileRunPairValidation;
```

`runId` is `run:<profileId>:<runSequence>:<runClass>:<seed>`. A new run uses an
eight-character uppercase alphanumeric seed and a positive safe-integer sequence.
A migrated legacy run has `profileId: null`, `runSequence: 0`, and never advances
progression. `eligibilityObjectiveIds` and `discoveredContentIds` are sorted,
unique start-of-run snapshots; runtime catalogs, shop pools, setup, and validation
must use those snapshots rather than live profile state.

Profile schema V1 is the owner of all durable progression state. The projection
cursor and run-local result delta are committed with the same checkpoint as the
run; only the terminal projection is copied to `lastResultSummary`.

```ts
interface ProfileRecord extends ProfileProgressionState {
  readonly schemaVersion: 1;
  readonly id: ProfileId;
  readonly slot: 1 | 2 | 3;
  readonly activeRunId: RunId | null;
}

interface CurrentRunProgress {
  readonly runId: RunId | null;
  readonly campaignVictorySettled: boolean;
  readonly resultDelta: ResultDeltaSummary | null;
  // bounded run-local counters omitted here
}

type ProgressionPolicy = "full" | "challenge-only" | "tutorial-only" | "none";
```

V6 owns the J103/J127 shared targets independently from V5's J083/J099 targets.
Target draws use a stable non-Stone full-deck pool, materialize pool/index evidence,
and use a no-RNG Ace-of-Spades fallback. Capacity debt is always exactly
`max(0, usedJokerSlots - jokerSlots)`; only the validated sale-clone transaction
may create it.

V5/V6 command windows receive an immutable discriminated event fact for the accepted
played hand, discard, consumable use, pack action, item sale, playing-card addition,
modifier success, other-Joker resolution, or blind result. Card identities are
captured at event entry; later mutation, destruction, zone movement, or draw cannot
rewrite what another source observes in the same window.

`JokerPredicate`, `JokerValue`, and `CatalogOperation` are closed serializable
unions. Definitions may compose bounded predicates and dynamic values, but only
registered handlers may turn them into score, retrigger, state, creation,
destruction, sale-value, resource, or observation operations.

```ts
function drawJokerDefinitionV3<T>(
  candidates: readonly JokerRarityDrawCandidateV3<T>[],
  rngState: RandomState,
  policy: "ordinary" | "common" | "uncommon" | "rare" | "legendary",
): JokerRarityDrawResultV3<T>;
```

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
  loadProfileActionRecovery(id: ProfileId): Promise<
    { readonly profile: ProfileRecord; readonly run: RunStateV2 | null } | undefined
  >;
  restoreProfileAction(id: ProfileId): Promise<{
    readonly profile: ProfileRecord;
    readonly run: RunStateV2 | null;
  }>;
  resetProfile(id: ProfileId, nowEpochMs: number): Promise<ProfileRecord>;
  commitCheckpoint(profile: ProfileRecord, run: RunStateV2): Promise<void>;
  replaceProfile(profile: ProfileRecord, run: RunStateV2 | null): Promise<void>;
  clearRun(profile: ProfileRecord): Promise<void>;
}
```

Physical IndexedDB version 1 owns `meta`, `settings`, `profiles`, `runs`, and
`recovery`, and `profileActionRecovery`; the current logical run schema inside
those stores is V7. Loads chain V1 -> V2 -> V3 -> V4 -> V5 -> V6 -> V7 while
preserving the exact pre-migration recovery record. Profile export normalizes a
valid older run to a `profile-transfer-7` envelope containing profile schema/run
schema/content versions, the profile, optional run, and a checksum over the
canonical payload. Import still accepts valid legacy envelopes and migrates them
forward. The 2 MB limit is measured in UTF-8 bytes. Positive Infinity is encoded
by the score wire codec and must never pass through raw `JSON.stringify` as `null`.

## 3. Contracts

- `src/game-core/**` is framework-free and may not import React, Redux, Motion,
  IndexedDB, `idb`, presentation, or application modules.
- The V2-compatible command surface and current `RunStateV7` are fully serializable.
  Production runs use `bxqp:` identifiers and snapshot exactly 230 non-Joker rows
  plus 150 real Joker rows. The aggregate is 380, IDs `bxqp:joker:001` through
  `150` are locally resolved, and no reserved Joker dependency remains unresolved
  in either catalog-child or integration-strict mode. Migrated foundation runs
  retain their embedded `fixture:` identities and original content version.
- Content IDs identify catalog entries; they never select engine behavior. Content
  points to registered handlers by `handlerId`; only handlers emit the exhaustive
  `EffectOperation` union. Do not route behavior with `contentId` or ad hoc
  `handlerId === ...` branches.
- The 26 hook windows are command-routing contracts, not documentation-only tags.
  Lifecycle commands call the shared bounded queue; scoring preserves the fixed
  before-hand -> scored-card -> held-card -> joker -> global -> after-hand order.
- Copy/retrigger uses queue entries and ancestry tokens, never recursive handler
  calls. Missing handlers, cycles, or operation-budget overflow reject the whole
  proposal without changing RNG/checkpoint.
- Visible random results (lineups, shops, generated cards, pack options, boss
  reroll choices) are materialized into `RunStateV2` before commit. Empty/blocked
  pools do not consume RNG.
- V3 materializes setup identity, card/Joker modifiers, external dependency
  resolution, and random choice records. V4/V5/V6 additionally require one modifier
  row per owned Joker and an exact `abilityState` key/type set derived from the
  frozen definition. Acquisition initializes it; sale or destruction removes it
  in the same proposed checkpoint. Unknown or missing keys, non-safe-integer
  numbers, and values whose primitive type differs from the definition invalidate
  the run.
- Production Joker definitions use the predicate/value/operation DSL. Engine,
  command, shop, migration, and presentation code must not switch on Joker content
  IDs. `resolvePlayedHandV3` returns one complete score/RNG/state proposal; callers
  never commit intermediate ability-state or generated-content changes.
- V5/V6 played-hand, discard, sale, and reward paths are atomic proposals over frozen
  event facts. A played hand captures clone facts before card mutation, resolves
  immediate card/retrigger passes and left-to-right Joker hooks, then commits clone,
  destruction, addition events, zones, draw, history, score, and one checkpoint.
  Discard removes the chosen cards from zones, resolves card/Joker discard effects
  against the frozen entry set, then draws from the post-effect deck.
- Every permanent playing-card removal uses one V6 destruction proposal. It rejects
  duplicate/unknown IDs before mutation, freezes effective identity and modifiers,
  removes every deck/round/modifier reference once, emits one
  `playing-card-destroyed` event, and rejects the whole proposal on a late failure.
- V6 freezes one event-entry Joker source graph. Dynamic leftmost/right-adjacent
  route cycles are traced no-op branches; static copy/retrigger cycles fail the
  proposal. Explicit gameplay chances use the bounded listed-chance service, while
  selection, shuffle, rarity, edition, sticker, and target RNG remain unaffected.
- Sale freezes the source/copy graph before removal, applies sale-trigger effects,
  removes the item, and pays its pre-removal value. Boss suppression is the single
  `bossEffectsDisabledForRun` projection over the legacy round flag plus active
  passive sources; the round flag resets on the next blind. Non-sale destruction
  emits no sale event.
- End-of-round processing applies source state/destruction and money lines before
  sticker settlement, base interest, separately capped extra-interest sources, and
  target rotation. J060 targets live per instance; J083 rank and J099 suit targets
  are shared persisted values. Relevant active sources alone rotate targets, and a
  deterministic empty fallback consumes no RNG.
- J103 and J127 targets are V6 run-shared but independent of each other and of the
  V5 target fields. Acquisition, round settlement, blind entry, last-source sale,
  reload, and all-Stone fallback must preserve their target lifecycle and evidence.
- Boss rules emit one `boss-ability-triggered` event only when an enabled rule
  changes or restricts the played hand. J149 is an idempotent derived suppression;
  it suppresses the Boss rule and therefore J129 payout. Draw/deck exhaustion skips
  J107 survival and loses immediately.
- Ordinary Joker sources perform a two-stage draw: choose among non-empty Common,
  Uncommon, and Rare pools with weights 70/25/5, then draw a stable ID within the
  chosen rarity. A forced rarity skips stage one. A blocked/empty forced pool
  returns `pool-empty` with the original RNG state.
- Owned passive capabilities are derived from active, non-debuffed sources at the
  use site. Acquisition, sale, debuff, and destruction must not permanently patch
  base rules; duplicate idempotent capabilities remain idempotent and additive
  capabilities explicitly aggregate.
- The first acquisition of a production Joker emits one durable discovery
  observation. Already materialized offers and pack choices remain unchanged
  across reload or a later catalog refresh.
- New runs default to production D01/S01 and `progression-modes-1`; fixtures remain
  explicit test/migration inputs only.
- V7 run policy is closed: campaign (including post-win endless) advances full
  progression; challenge advances only challenge attempts/completions, its
  explicitly derived unlocks/achievements/statistics, and no ordinary ledger;
  tutorial advances only tutorial state; seeded and migrated-legacy advance none.
- Challenge setup requires both its sequential gate and matching completed
  objective, and uses fixed D01/S01. Tutorial also uses D01/S01. Campaign and
  seeded stakes are contextual to the selected deck. Starting any mode freezes the
  eligible objective IDs and discovered Joker IDs; later profile changes cannot
  expand an active run's pools.
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
  new run in one read-write transaction. Before any profile-only write, the
  repository reads the paired run and validates the pair in the same transaction.
  Import replacement, reset, restore, clear, and delete are also pair-atomic.
- A valid profile/run pair has matching active-run IDs, V7 owner, run sequence,
  projection cursor/checkpoint, frozen objective/discovery subsets, and legal
  setup. The pair validator is shared by repository writes and transfer import.
- Import accepts at most 2 MB of UTF-8, validates JSON, schema/content versions,
  checksum, profile/run identity, V7 frozen setup, and run invariants before
  requesting user confirmation.
- A `run-lost` or `finished` checkpoint remains in `runs` so refresh can render the
  same result. It is cleared only when the player explicitly returns to the menu.
- Browser navigation is a typed `DurableAppRoute` serialized in the location hash.
  With no active run, initialization may restore menu/setup/collection/
  achievements/statistics/help/maintenance/notices. Any valid active run overrides
  the hash and routes from its committed phase. A fresh profile cannot use a setup
  hash to bypass the first-tutorial prompt.
- Screens dispatch typed commands and render selectors/state only; poker evaluation,
  money changes, draw order, and inventory rules do not live in components.
- Shop, pack, table, and audit screens resolve Joker art, rarity, flavor, and
  committed current values through shared presentation selectors. They never
  recompute a score effect or mutate ability state. The 150 raster assets must be
  local 768x1024 WebP files with unique focal keys and reviewed provenance
  sidecars; runtime content requests may not leave the local origin.
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
| Dynamic left/right copy routing revisits an event-entry node | Trace a no-op branch; consume no RNG and continue other sources |
| Listed chance numerator is zero or reaches certainty after power | Return `roll: null`; preserve RNG; fail or succeed respectively |
| Permanent destruction repeats an ID or references an unknown card | `pool-empty`; preserve every zone, modifier, event, and RNG field |
| V6 Joker debt differs from `max(0, usedJokerSlots - jokerSlots)` | Invariant failure; do not persist |
| Item/pack/blind/tag/voucher reference is absent from frozen content | Invariant or `pool-empty`; do not commit |
| Pending choice has foreign/duplicate targets or stale choice ID | `invalid-target`/`choice-mismatch`; preserve frame and RNG |
| Reward ID is already consumed or receipt total does not equal its lines | Invariant failure; do not persist |
| Money would fall below `-allowedDebt` | `insufficient-funds`; preserve offer and RNG |
| Proposed state violates card, ID, budget, or phase invariants | Do not persist or reveal it |
| IndexedDB transaction rejects | Keep the exact prior React state; report Chinese error |
| Import exceeds size, fails JSON/Zod/checksum, or mismatches IDs | Reject before confirmation; keep all slots intact |
| Stored V1/V2/V3/V4/V5/V6 run is valid | Migrate through V7 atomically and keep the exact preimage in `recovery` |
| V4/V5/V6 owned Joker lacks exactly one matching modifier/ability-state record | Invariant failure; do not persist |
| V4/V5/V6 ability-state key/type differs from the frozen definition | Invariant/Zod failure; do not replace local data |
| V7 owner/run sequence/projection cursor differs from the profile | Pair validation failure; abort the whole transaction |
| V7 setup or runtime content requires an objective/discovery absent from the frozen snapshot | Invariant/pair validation failure; do not start, import, or commit |
| Challenge/tutorial does not use D01/S01, or challenge is ahead of its sequential gate | Reject setup/import; keep profile and run unchanged |
| Seeded/tutorial facts attempt to advance ordinary progression | Filter by run-class policy; persist no ordinary delta |
| Import text exceeds 2,000,000 UTF-8 bytes | Reject before JSON parsing or replacement |
| Terminal run is reloaded before explicit return-to-menu | Restore the same result phase and accumulated run delta |
| Route hash requests setup for a fresh profile | Restore `menu`, keep `setupMode: null`, and show tutorial prompt |
| Forced Joker rarity has no eligible row | `pool-empty`; return the original RNG and offer state |
| Joker acquisition, sale, or destruction leaves an orphan modifier | Reject the whole proposal |
| Stored/exported schema or content version is newer/unsupported | Reject; never downgrade or replace current data |
| `integration-strict` has unresolved reserved 奇牌 IDs | Catalog/run creation fails; test doubles are forbidden |
| Production catalog is not exactly 230 non-Jokers + 150 Jokers, or localization/asset/ownership/contract closure drifts | Bootstrap/content audit fails before play |
| Joker raster is remote, missing, not 768x1024, shares a focal key, or lacks approved provenance | Content/browser audit fails before play |
| Profile is deleted or replaced | Profile, run, recovery, profile-action recovery, and active-profile metadata remain consistent in one transaction |

## 5. Good / Base / Bad Cases

- Good: the same seed plus command sequence yields byte-equivalent canonical state
  in the pure scenario runner, Chromium, and WebKit, including RNG/checkpoint values.
- Good: a new fixture adds a serializable `EffectReference` and registered pure
  handler; existing routing invokes it at the declared window without a command
  switch change.
- Good: production D01/S01 created twice from the same profile, sequence, mode, and
  seed has identical V7 identity, frozen eligibility, V6 gameplay state,
  380-row snapshot, lineup, RNG, ability state, targets, discovery observations, and
  materialized choices, including after save/reload or export/import.
- Good: a campaign checkpoint projects facts once, advances the cursor to the same
  checkpoint, accumulates one run-local delta, and commits profile plus run in one
  transaction; refresh of its terminal checkpoint renders the same complete result.
- Base: a valid V1-V6 run migrates to a V7 `migrated-legacy` session with sequence
  zero, evidence-backed discoveries only, and no invented historical progression.
- Base: a seeded run may be replayed from its canonical share code, but produces no
  objective, collection, achievement, victory-mark, or ordinary statistics delta.
- Good: a Joker catalog row declares predicates, values, copy facet, stickers,
  initial state, localization, and asset metadata; generic handlers execute it
  without an ID branch, and the shared selector renders its committed current value.
- Base: a rejected command returns a Chinese domain error while the current run,
  random state, budgets, and save remain unchanged.
- Base: a valid V2/V3/V4/V5 fixture run loads as V6 while preserving its content version,
  fixture IDs, RNG, offers, choices, and recovery preimage; owned Jokers receive
  only the initial ability-state keys declared by their embedded definitions.
- Base: a forced empty rarity source or a false chance/capacity branch returns no
  candidate and consumes no RNG.
- Bad: a component calculates score or draws cards, a handler mutates state or calls
  itself, a thunk updates Redux before `commitCheckpoint` resolves, or a migration
  silently invents missing gameplay data.
- Bad: replacing a V2 snapshot with current production rows, resolving future
  奇牌 dependencies with shipped doubles, or offering behavior through a
  `contentId`/`handlerId` conditional outside the registry.
- Bad: React derives `storedMult`, sale growth, or silk count independently from
  engine rules, or an acquisition/destruction path updates inventory without the
  matching V4/V5/V6 modifier and discovery state.
- Bad: a shop reads the current profile after run start, a profile is saved without
  validating its paired run, a terminal run is deleted during load, or a component
  stores the only copy of the current route/result delta.

## 6. Tests Required

- Golden PRNG vector and deterministic shuffle conservation.
- Table tests for all 12 poker classifications plus permutation properties.
- Command tests for success, stale checkpoint, illegal phase, exhausted budgets,
  deterministic replay, win/loss, shop actions, and invariant preservation.
- One registry matrix must cover every `EffectOperation` and all 26 windows. Command
  integration must prove lifecycle windows produce durable observations; score
  goldens must freeze source/copy/retrigger ordering and cycle/budget rejection.
- Accepted campaign/economy commands must pass the version-appropriate V2/V3/V4/V5/V6
  /V7 invariant validator and Zod structured-clone round trip after every checkpoint.
  Rejections compare the entire prior state, RNG, offers, inventory, ability
  state, observations, and checkpoint.
- Property tests mix legal and rejected V2 commands and assert the same invariants;
  include regression coverage for face-down/forced/selected IDs after zone moves.
- Repository tests for checkpoint/recovery, injected write failure, three-profile
  isolation, atomic replacement, and invalid import non-mutation.
- V1 -> V2 -> V3 -> V4 -> V5 -> V6 -> V7 migration must be deterministic and
  idempotent at its
  terminal version, retain the exact recovery preimage, reject future versions,
  and preserve production/migrated state through IndexedDB and
  `profile-transfer-7` export/import round trips.
- Pair tests must reject mismatched active-run IDs, V7 owners, sequence/cursor,
  forged eligibility/discovery snapshots, locked setup, and a profile-only save
  that would orphan a run. Injected transaction failure must leave both records
  byte-equivalent to the preimage.
- Progression policy tests must cover campaign/endless, challenge success/loss,
  seeded, tutorial, and migrated-legacy facts; terminal result tests assert the
  accumulated whole-run delta survives reload until explicit menu return.
- Joker catalog tests assert 150 contiguous IDs, 61 Common/64 Uncommon/20 Rare/
  5 Legendary rows, exact 230/150/380 counts, zero unresolved production IDs, and
  complete localization, contract, discovery, ownership, and asset closure.
- V6 primitive tests freeze graph adjacency/cycle traces, listed-chance zero and
  certainty RNG preservation, distinct-card suit assignment, atomic multi-zone
  destruction, exact Joker debt, and zero-slot Negative consumables.
- Every production Joker needs positive, boundary/false, and debuffed coverage.
  Mutable/random rows additionally prove same-seed replay, false-branch RNG
  preservation, reload, recovery, export/import, and orphan-state cleanup.
- Rarity tests assert non-empty-pool renormalization, stable within-rarity draws,
  forced empty-pool non-consumption, and real shop/Buffoon-pack acquisition.
- Component tests assert screens dispatch commands and show committed state/errors.
- Playwright runs the same deterministic script in Chromium and WebKit, reloads at
  action boundaries, compares the full saved `RunState`, and covers win, loss, shop,
  profile isolation, and export/import. Route coverage additionally reloads a
  no-run feature page and mode setup, proves an active run overrides the route, and
  proves terminal results remain visible.
- The catalog audit must prove exactly 230 unique production rows, all-local
  assets, 13 family render paths, and zero remote content requests in Chromium
  and WebKit.
- The separate Joker audit must prove exactly 150 unique rows and focal keys,
  150/150 successful 768x1024 image decodes, fifteen 10-card ensemble views, and zero
  remote requests in Chromium and WebKit. Representative shop, Buffoon-pack, and
  table tests must show the local art and committed current value after reload.
- Visual snapshots cover profile, table, shop, and result at 1280x720. Move the mouse
  away from hover targets and wait for Motion springs before capturing.

## 7. Wrong vs Correct

### Wrong

```ts
// UI exposes an uncommitted proposal and domain code reads ambient randomness.
const result = executeCommandV2(run, command);
if (result.ok) dispatch(runChanged(result.state));
await repository.commitCheckpoint(profile, result.state);

// Live profile state must not expand a run that already froze its pools.
const shopPool = catalog.rows.filter((row) => isAvailable(profile, row));

// Catalog IDs must not select executable behavior.
if (effect.handlerId === "fixture:some-handler") mutateRun(run);

// Presentation must not reinterpret durable Joker mechanics.
const current = run.modifiersV3.jokers.find(...).abilityState.storedMult;
```

### Correct

```ts
const result = executeCommandV2(run, command);
if (!result.ok) return result;

const validation = validateRunStateV2(result.state);
if (!validation.ok) return invariantFailure(validation.violations);
const projectedProfile = reduceProfileProgression(
  profile,
  deriveProgressionFacts(run, result.state, result.domainEvents),
  nowEpochMs,
);
const pair = validateProfileRunPair(projectedProfile, result.state);
if (!pair.ok) return invariantFailure(pair.violations);
await repository.commitCheckpoint(projectedProfile, result.state);
return result; // reducer reveals this checkpoint only after persistence succeeds

const frozenObjectives = new Set(run.sessionV7.eligibilityObjectiveIds);
const shopPool = catalog.rows.filter((row) => isFrozenAvailable(row, frozenObjectives));

const presentation = selectOwnedJokerPresentation(run, joker);
// React renders presentation.currentValue; the selector reads committed V4/V5/V6 state.
```

Handlers stay pure and return primitives; the queue applies them after cycle/budget
validation:

```ts
registry["fixture:run-economy:handler:add-money"] = (effect) => [
  { type: "add-money", amount: readSafeInteger(effect, "amount") },
];
```

## Scenario: Post-commit stage presentation and local device audio

### 1. Scope / Trigger

- Trigger: changing score arithmetic evidence, `PresentationEventV2`, the transient
  presentation queue, device settings, the IndexedDB `settings` store, scene audio,
  or the React audio director.
- These paths cross the pure engine, persistence, Redux, React, and browser media
  boundaries. They must preserve the rule that durable gameplay commits before any
  optional performance is revealed.

### 2. Signatures

```ts
type PresentationSpeed = "full" | "brisk";

interface DeviceSettingsV1 {
  readonly schemaVersion: 1;
  readonly masterVolume: number;
  readonly musicVolume: number;
  readonly sfxVolume: number;
  readonly muted: boolean;
  readonly presentationSpeed: PresentationSpeed;
}

interface GameRepository {
  getSettings(): Promise<DeviceSettingsV1>;
  saveSettings(settings: DeviceSettingsV1): Promise<void>;
}

interface ScorePresentationEvidenceV3 {
  readonly version: 1;
  readonly cues: readonly ScorePresentationCueV3[];
}

type PresentationEventV2 =
  | { readonly type: "score-performance"; readonly evidence: ScorePresentationEvidenceV3 }
  | /* other typed cues */ never;

function planPresentationSequence(input: {
  readonly events: readonly PresentationEventV2[];
  readonly runId: string;
  readonly checkpointId: number;
}): PresentationSequenceV1 | null;

interface AudioDirectorEngine {
  unlock(): Promise<boolean>;
  setSettings(settings: DeviceSettingsV1): void;
  setScene(sceneId: PresentationSceneId): void;
  playOneShot(id: PresentationAudioId, cueKey: string): Promise<boolean>;
  suspend(): Promise<void>;
  resume(): Promise<void>;
  destroy(): Promise<void>;
}
```

### 3. Contracts

- The score resolver that owns the arithmetic emits structured hand, card, source,
  and total evidence. Presentation code consumes that union and must not parse a
  debug trace or recompute score, repetitions, money, or Joker effects.
- One accepted played-hand command emits one `score-performance` event. Redux calls
  `planPresentationSequence` only in `submitRunCommand.fulfilled`, after
  `commitCheckpoint` has resolved. A rejected or failed write reveals no sequence.
- `PresentationSequenceV1` is transient application state. It is never added to
  `RunState`, IndexedDB run/profile records, recovery, or profile transfer JSON.
  Reload resumes the committed phase without replaying the old performance.
- A sequence ID is `<runId>:<checkpointId>`. Adjacent equivalent cues coalesce,
  rendered cues are bounded to 48, overflow retains an exact omitted-repetition
  count, and the final total remains present. A score performance lasts at most
  10 seconds in `full` mode or 3 seconds in `brisk` mode.
- Skip, tab hiding, completed playback, or a performer error may only clear the
  transient sequence. They must not dispatch a gameplay command or write a second
  checkpoint. A performer error shows a non-blocking Chinese warning and leaves the
  committed screen usable.
- Device settings live at IndexedDB `settings["device"]`, independently from every
  profile and run. Each volume is finite and inclusive in `[0, 1]`. Legacy V0 data
  migrates to V1 with `presentationSpeed: "full"`; an absent record uses
  `DEFAULT_DEVICE_SETTINGS`; a future schema is rejected rather than downgraded.
- The settings thunk may update the controls optimistically, but it stores the prior
  `DeviceSettingsV1` and restores it if `saveSettings` rejects. A settings read
  failure falls back to defaults with a warning and must not block initialization.
- `AudioDirector` is lazy-loaded and may create/unlock Web Audio only after a trusted
  pointer or keyboard event. Initial navigation must request no audio asset. The
  three 96-second music stems share one epoch/phase; scene changes ramp stem gains
  over 400 ms and setting changes ramp gains over 40 ms.
- Media is an optional browser adapter. Missing Web Audio, autoplay denial, fetch or
  decode failure, suspend/resume failure, and teardown failure must resolve to a
  silent/error status rather than reject gameplay or navigation. A failed unlock is
  retryable on the next trusted activation.
- One-shots deduplicate by stable cue key, suppress the same sound within 40 ms, and
  cap concurrent sources at 8. Visibility changes suspend/resume the audio context;
  a hidden document also finishes the visual sequence.
- React StrictMode performs a simulated unmount/remount. Audio teardown must be
  scheduled for the next task and cancelled by the immediate remount; synchronous
  cleanup would close the only engine before its first trusted unlock.

### 4. Validation & Error Matrix

| Condition | Required result |
|---|---|
| Any volume is non-finite or outside `[0, 1]` | Reject settings; persist nothing |
| Settings schema is greater than 1 | `设备声场设置版本过新`; never downgrade |
| Legacy settings omit `schemaVersion` and `presentationSpeed` | Migrate once with `presentationSpeed: "full"` |
| Settings write rejects | Restore the exact prior Redux settings and show a Chinese error |
| Gameplay persistence rejects | Keep prior run and `presentationSequence: null` |
| Presentation event list is empty | Planner returns `null` |
| Expanded score cues exceed the render bound | Coalesce/bound to at most 48 cues and preserve exact overflow count/final total |
| Skip occurs before or after any cue | Clear only the transient sequence; saved run remains byte-equivalent |
| Browser denies autoplay or has no AudioContext | Status becomes `error`; next trusted activation may retry |
| Audio fetch/decode fails | Silence audio, show non-blocking warning, keep all routes and commands usable |
| Cue key was played, same sound fired within 40 ms, or 8 one-shots are active | Return `false`; create no extra source |
| Document becomes hidden | Finish visual sequence and suspend audio without changing durable state |

### 5. Good / Base / Bad Cases

- Good: a played hand is committed, Redux reveals a sequence derived from the same
  typed evidence, the player skips it, and IndexedDB remains exactly equal before
  and after the skip and reload.
- Good: a trusted click unlocks three synchronized stems; changing scenes crossfades
  their gains without restarting them, while cue IDs trigger bounded one-shots.
- Base: audio is unavailable, so the stage stays silent and displays one warning;
  profile creation, navigation, commands, save/reload, and deterministic replay all
  continue normally.
- Base: a legacy device record loads at the same volumes/mute value and gains the
  default full-speed performance setting.
- Bad: React parses score debug text, starts a performance before
  `transaction.done`, persists a queue cursor in the run, preloads audio on first
  paint, or lets a media promise reject a gameplay thunk.

### 6. Tests Required

- Unit-test settings defaults, V0 migration, V1 decode, future-version rejection,
  non-finite/out-of-range volumes, repository round-trip, and Redux write rollback.
- Score goldens assert the exact typed evidence at the arithmetic owner and exactly
  one `score-performance` event per accepted played hand. Architecture tests reject
  browser/audio imports from `src/game-core/**` and debug-trace parsing from
  presentation modules.
- Sequence tests assert adjacent coalescing, exact repetition counts, 48-cue bound,
  final-total preservation, stable IDs, full/brisk duration caps, skip, hidden, and
  performer-failure completion.
- Audio engine tests use fakes to assert trusted unlock retry, synchronized stem
  offsets, 400/40 ms ramps, deduplication, the 8-source cap, visibility behavior,
  media-failure isolation, and best-effort teardown. Component tests include the
  StrictMode simulated unmount/remount lifecycle.
- Playwright runs Chromium and WebKit and asserts settings persistence, no initial
  audio requests, media-failure-safe navigation, exact saved-run equality across
  full/brisk skip and reload, 1280x720 visual baselines, and a fixed 1920x1080 stage
  with no outer scrolling. The repeatable motion probe keeps frame-gap P95 at or
  below 50 ms, requires zero Chromium Long Task entries above 50 ms, and uses a
  timer-drift fallback where the Long Task API is unavailable.

### 7. Wrong vs Correct

#### Wrong

```ts
// Reveals uncommitted work and lets presentation reinterpret engine output.
dispatch(showPerformance(parseScoreDebug(result.debugTrace)));
await repository.commitCheckpoint(profile, result.state);

// Starts browser media during initial render and lets failure escape to the app.
const engine = new PresentationAudioEngine();
await engine.unlock();
```

#### Correct

```ts
const committed = await commitRunCommand(
  repository,
  profile,
  run,
  command,
  nowEpochMs,
);

// The fulfilled reducer runs only after persistence and consumes typed evidence.
state.run = committed.run;
state.presentationSequence = planPresentationSequence({
  events: committed.presentationEvents,
  runId: committed.run.runId,
  checkpointId: committed.run.checkpointId,
});

// A trusted activation owns media startup; failure changes audio status only.
window.addEventListener("pointerdown", (event) => {
  if (event.isTrusted) void engine.unlock();
});
```

## Scenario: Accepted hand normalization and fixed-stage presentation geometry

### 1. Scope / Trigger

- Apply this contract whenever an accepted command can return to an active round,
  change the playing-card set, or change the table/chrome presentation.
- Hand membership and order remain engine-owned durable state. Layout and motion
  may present that committed state, but must not derive another order in React.

### 2. Signatures

```ts
executeCommandV2(state: RunStateV2, command: RunCommandV2): CommandResultV2;

interface StageShellProps {
  readonly presentationSpeed?: PresentationSpeed;
}

motionProfileForSpeed(speed: PresentationSpeed): MotionProfile;
```

- `PlayingStageChrome` owns the shared `playing-status` and
  `playing-navigation` zones. `SoundStageDrawer` owns `audio-controls`.
- Table geometry exposes `table-inventory`, `table-ledger`, `table-center`,
  `table-hand`, and `table-actions` through stable `data-layout-zone` values.

### 3. Contracts

- After the command-specific handler accepts, `executeCommandV2` resolves every
  `playing-card-added` window, then sorts an active round's `handIds` once with
  `sortCardIdsV2(state, handIds, round.sortMode)`, then returns the accepted result.
- Automatic normalization emits no sort event, consumes no RNG, and creates no
  additional checkpoint. It returns the original state object when the phase is
  not an active round or the current order already matches.
- Rejected commands return their exact preimage and never normalize a legacy
  unsorted save. Such a save normalizes on its next accepted round command.
- New hand-card motion uses stable card IDs and transient presentation state only.
  Sequence completion, skip, hidden-tab completion, or performer failure releases
  the same committed cards without dispatching another gameplay command.
- The fixed 16:9 stage groups navigation into one flex-owned zone and keeps the
  named audio, status, inventory, ledger, center, hand, and action zones contained
  and separated by at least 8 CSS pixels at 1280x720 and 1920x1080.
- Tutorial guidance has priority in the shared status slot. Its long copy opens as
  an explicit `tutorial-detail` overlay; progression notices remain compact.
- `full` and `brisk` motion profiles share endpoints and stable IDs. `brisk` changes
  timing/stagger only; neither profile may change committed DOM content or geometry.

### 4. Validation & Error Matrix

| Condition | Required result |
|---|---|
| Accepted command returns an active round with unsorted `handIds` | Normalize once using the committed `sortMode` |
| Accepted command adds playing cards | Resolve all added-card windows before normalization |
| Command is rejected | Preserve exact state, card order, checkpoint, events, and RNG |
| Active hand is already ordered or no round is active | Preserve the original state object |
| Tutorial and unread notice both exist | Render tutorial in `playing-status`; keep notice durable for later display |
| Named fixed-stage zones intersect or have less than 8px separation | Browser geometry gate fails |
| Full tutorial copy is requested | Open the named modal overlay without advancing tutorial state |
| Presentation completes, skips, hides, or fails | Release transient cards; keep the saved run byte-equivalent |

### 5. Good / Base / Bad Cases

- Good: discard draws replacements, added-card effects finish, and the returned
  hand is suit-sorted with identical card sets, draw pile, RNG, events, and one
  accepted checkpoint.
- Good: audio controls, compact tutorial status, grouped navigation, Joker
  inventory, ledger, hand, and actions remain visibly separated in both browsers.
- Base: a legacy unsorted active save remains unchanged when a command rejects and
  normalizes on the next accepted round command.
- Bad: a component sorts a copy of the hand, an automatic sort emits a domain
  event, or an absolute-positioned button independently competes for top-row space.

### 6. Tests Required

- Engine regression tests cover initial rank order, rank/suit play and discard,
  added-card effects, legacy unsorted saves, selected/forced/face-down ID
  conservation, rejection preimage equality, and manual sort event/checkpoint rules.
- Component tests cover the single navigation zone, tutorial/notice priority,
  explicit tutorial modal, always-visible skip, card hold/release, bounded score
  impact nodes, and `StageShell` full/brisk propagation.
- Playwright runs Chromium and WebKit at 1280x720 and 1920x1080, checks containment,
  the explicit minimum-gap matrix, no outer scroll, and intentional modal overlap.
  Changed snapshots are accepted only after those geometry assertions pass.
- The motion performance probe retains frame-gap P95 at or below 50 ms and zero
  repeated Long Task or timer-drift violations above 50 ms.

### 7. Wrong vs Correct

#### Wrong

```ts
// React invents a second order and a separate button owns a competing offset.
const visibleHand = [...run.round.handIds].sort(componentComparator);
return <button style={{ position: "absolute", top: 16, right: 200 }}>帮助</button>;
```

#### Correct

```ts
const normalized = normalizeActiveRoundHandOrder(afterAddedCardWindows);
return accept(normalized, domainEvents, presentationEvents);

// Presentation consumes the committed order and shared geometry ownership.
const visibleHand = run.round.handIds;
return <PlayingStageChrome />;
```

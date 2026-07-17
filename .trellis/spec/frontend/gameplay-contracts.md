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
type CommandResult =
  | {
      readonly ok: true;
      readonly state: RunState;
      readonly domainEvents: readonly DomainEvent[];
      readonly presentationEvents: readonly PresentationEvent[];
    }
  | {
      readonly ok: false;
      readonly rejection: { readonly code: RejectionCode; readonly message: string };
    };

function executeCommand(state: RunState, command: RunCommand): CommandResult;

function commitRunCommand(
  repository: Pick<GameRepository, "commitCheckpoint">,
  profile: ProfileRecord,
  current: RunState,
  command: RunCommand,
): Promise<CommitRunCommandResult>;
```

Every `RunCommand` contains the caller's `checkpointId`. Random operations accept
the PRNG value from `RunState.rngState` and return the next value in the proposed
state; they never read ambient randomness.

```ts
interface GameRepository {
  initialize(): Promise<void>;
  listProfiles(): Promise<ProfileRecord[]>;
  getProfile(id: ProfileId): Promise<ProfileRecord | undefined>;
  saveProfile(profile: ProfileRecord): Promise<void>;
  deleteProfile(id: ProfileId): Promise<void>;
  setActiveProfile(id: ProfileId | null): Promise<void>;
  getActiveProfileId(): Promise<ProfileId | null>;
  loadRun(id: ProfileId): Promise<RunState | undefined>;
  loadRecoveryRun(id: ProfileId): Promise<RunState | undefined>;
  commitCheckpoint(profile: ProfileRecord, run: RunState): Promise<void>;
  replaceProfile(profile: ProfileRecord, run: RunState | null): Promise<void>;
  clearRun(profile: ProfileRecord): Promise<void>;
}
```

IndexedDB V1 owns `meta`, `settings`, `profiles`, `runs`, and `recovery` stores.
Profile export is a versioned JSON envelope with `profile`, optional `run`, and a
checksum over the canonical payload.

## 3. Contracts

- `src/game-core/**` is framework-free and may not import React, Redux, Motion,
  IndexedDB, `idb`, presentation, or application modules.
- `RunState` is fully serializable. Gameplay identifiers use project-owned branded
  strings; foundation fixtures use `fixture:` namespaces.
- Content IDs identify catalog entries; they never select engine behavior. Items
  carry serializable typed effect payloads (for example
  `{ type: "set-rank", rank: "ace" }`) that command handlers execute.
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
| Proposed state violates card, ID, budget, or phase invariants | Do not persist or reveal it |
| IndexedDB transaction rejects | Keep the exact prior React state; report Chinese error |
| Import exceeds size, fails JSON/Zod/checksum, or mismatches IDs | Reject before confirmation; keep all slots intact |
| Profile is deleted or replaced | Profile, run, recovery, and active-profile metadata remain consistent in one transaction |

## 5. Good / Base / Bad Cases

- Good: the same seed plus command sequence yields byte-equivalent canonical state
  in the pure scenario runner, Chromium, and WebKit, including RNG/checkpoint values.
- Base: a rejected command returns a Chinese domain error while the current run,
  random state, budgets, and save remain unchanged.
- Bad: a component calculates score or draws cards, a thunk updates Redux before
  `commitCheckpoint` resolves, or a migration silently invents missing gameplay data.

## 6. Tests Required

- Golden PRNG vector and deterministic shuffle conservation.
- Table tests for all 12 poker classifications plus permutation properties.
- Command tests for success, stale checkpoint, illegal phase, exhausted budgets,
  deterministic replay, win/loss, shop actions, and invariant preservation.
- Repository tests for checkpoint/recovery, injected write failure, three-profile
  isolation, atomic replacement, and invalid import non-mutation.
- Component tests assert screens dispatch commands and show committed state/errors.
- Playwright runs the same deterministic script in Chromium and WebKit, reloads at
  action boundaries, compares the full saved `RunState`, and covers win, loss, shop,
  profile isolation, and export/import.
- Visual snapshots cover profile, table, shop, and result at 1280x720. Move the mouse
  away from hover targets and wait for Motion springs before capturing.

## 7. Wrong vs Correct

### Wrong

```ts
// UI exposes an uncommitted proposal and domain code reads ambient randomness.
const result = executeCommand(run, command);
if (result.ok) dispatch(runChanged(result.state));
await repository.commitCheckpoint(profile, result.state);
const roll = Math.random();
```

### Correct

```ts
const result = executeCommand(run, command);
if (!result.ok) return result;

validateRunState(result.state);
await repository.commitCheckpoint(profile, result.state);
return result; // reducer reveals this checkpoint only after persistence succeeds
```

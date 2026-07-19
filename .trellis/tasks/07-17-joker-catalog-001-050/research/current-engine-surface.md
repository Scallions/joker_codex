# Joker 001-050 — Current Engine Surface

## Purpose

Record the repository evidence used to plan the first 50 production 奇牌. This
file describes the current implementation and the resulting engineering gaps; it
does not add new product decisions.

Evidence was inspected on 2026-07-19 against `main` after the 230-row non-奇牌
catalog task was archived.

## Confirmed foundations

- `RunStateV2` remains the executable base contract and `RunStateV3` adds the
  production catalog snapshot, setup identity, modifiers, external dependencies,
  and materialized choices.
- Gameplay behavior is durable `EffectReference` data routed through 15 explicit
  windows. The registry rejects missing handlers, ancestry cycles, and more than
  10,000 operations.
- The score resolver already orders before-hand, scored-card, held-card,
  independent-Joker, global, and after-hand phases. It also supports deterministic
  card-modifier rolls and scored-card retriggers.
- Blind selection, round end, shop entry/reroll, acquisition, and sale already
  have command-owned transition points where atomic Joker effects can be added.
- Shops and Buffoon-equivalent packs already materialize `JokerDefinitionV2`
  values, apply editions/stickers, enforce slot contribution, and snapshot offers.
- V3 saves, recovery, export/import, invariants, and Zod validation already cover
  owned Jokers and their edition/sticker modifiers.
- The production catalog reserves `bxqp:joker:001` through `bxqp:joker:150`, and
  the challenge/setup tests use capability doubles for unresolved definitions.
- The query-gated catalog audit already proves local asset loading, deterministic
  focal keys, pagination, and Chromium/WebKit screenshots at 1280x720.

## Catalog and content gaps

1. `CatalogFamily` contains the 13 non-奇牌 families only. A production Joker row
   cannot currently enter `PRODUCTION_CATALOG`.
2. `CatalogRow` has no Joker rarity, copy policy, sticker eligibility, initial
   runtime state, or flavor-text key.
3. `createProductionRunContent` does not compile catalog rows into
   `JokerDefinitionV2`; production runs therefore contain no real Jokers.
4. `buildExternalDependencies` always reports all 150 reserved IDs as external.
   After this batch it must report 001-050 as locally resolved and only 051-150 as
   unresolved without losing ownership metadata for any reserved ID.
5. The validator fixes the non-奇牌 total at 230. It needs separate ledgers for
   230 frozen non-奇牌 rows, 50 implemented Joker rows, 100 unresolved Joker IDs,
   and a 280-row aggregate without changing the historical 230-row audit.
6. Discovery is currently consulted by a generic eligibility helper as though it
   were availability. First acquisition must be able to discover a Joker without
   blocking that Joker from appearing in the first place.
7. Availability has no `deck-contains-modifier` predicate required by J032.
8. Asset ownership only accepts shared project SVG. The approved Joker direction
   requires one local reviewed raster illustration and provenance record per row,
   while card frames and gameplay labels remain DOM/SVG.

## Shop and acquisition gaps

- `drawItemDefinitions` uses a flat `weightUnits` pool. It does not perform the
  frozen Joker rarity draw (Common 70%, Uncommon 25%, Rare 5%, Legendary only by
  explicit source) followed by a stable within-rarity draw.
- Duplicate, ban, no-Joker-route, capacity, edition, and sticker materialization
  already exist and should remain shared.
- Sticker rolls do not inspect row eligibility. J038 and J050 must reject the
  permanent sticker; J021, J044, and J049 must reject the perishable sticker.
- Acquisition initializes owned presentation/effects but no typed per-instance
  ability state. J021, J044, J046, J049, and J050 require persisted values.
- Selling removes the instance but does not recompute passive rules. J020 must
  stop authorizing new purchases below zero after sale while an already-negative
  balance remains a valid state to repay.
- A first acquisition does not yet emit a durable discovery observation for the
  later progression task.

## Scoring gaps

The current generic score operations are unconditional once a window resolves.
Rows 001-050 require reusable predicates and dynamic amounts, not content-ID
branches:

- played hand contains Pair, Three of a Kind, Two Pair, Straight, or Flush;
- played-card count at most three;
- scored card suit, rank set, parity, Ace, or effective face status;
- remaining discards, occupied/empty Joker slots, full-deck modifier counts, and
  owned-Joker count;
- current played-hand history including the hand being resolved;
- all held cards satisfy a suit set, including empty-hand, Wild, Stone, and
  debuff rulings;
- lowest ranked held card with rightmost tie-breaking and held-card retriggers;
- final hand of the round and per-scored-card retrigger predicates;
- deterministic uniform `0..23`, per-card `1/4`, per-card `1/2`, and pre-score
  `1/4` checks with one declared RNG consumer per eligible activation.

The score resolver currently returns score, RNG, money delta, destroyed playing
cards, and modifier rolls. It cannot return updated hand levels, per-Joker state,
created consumables, or destroyed Joker instances. Pre-score and post-score
Joker mutations therefore need a single atomic played-hand proposal rather than
UI or command-level special cases.

## Lifecycle and passive-rule gaps

| Required behavior | Existing support | Missing contract |
|---|---|---|
| J018 four-card Straights/Flushes | `straightSize` and `flushSize` rules | Recompute as a passive owned-Joker capability; separate four-card Straight and Flush subsets may form a five-card Straight Flush. |
| J019 held-card retrigger | Modifier identity can retrigger itself | Joker-sourced held-card retrigger that does not recursively retrigger retrigger effects. |
| J020 debt floor | `allowedDebt` and affordability checks | Owned-source derivation, sale behavior, and valid repayment state after source removal. |
| J021 adjacent destruction/growth | Destruction and sale-value helpers exist | Resolve immediate right neighbor, respect permanent sticker, destroy without sale payout, then update source state. |
| J024 add Stone-like card | Random card creation and modifier assignment exist | Create one random underlying card with fixed stone-mask enhancement and place it outside the current draw. |
| J025 every-six-hands cycle | Played-hand history exists | Include current hand and expose deterministic modulo-six predicate. |
| J026 generated Tarot | Typed family creation exists | Per-scored-card capacity and chance ordering inside score resolution. |
| J030 free reroll | `free-reroll` operation exists | Shop-entry source policy and one-use expiry are already compatible. |
| J035 conditional round money | Round-end queue and reward lines exist | Dynamic `2 × remainingDiscards` amount guarded by `discardsUsed === 0`. |
| J037 all cards are face cards | Face checks exist in several modules | One shared effective-face selector used by scoring, Joker predicates, and blind debuffs. |
| J038/J050 self-destruction | Joker removal exists only through sale | Destroy-source operation, no sale payout, sticker eligibility, and extinction observation. |
| J044/J049 persistent growth | V3 Joker modifiers persist stickers | Typed ability-state map with bounded numeric initialization/update. |
| J045 pre-score hand level | Level-hand operation exists | Apply successful roll before evaluating the current hand and persist the new level. |
| J046 sell-value growth | `sellValueOverride` exists | Round-end source-relative increment and save/reload fixtures. |
| J047 hands/discards exchange | Add/set operations exist | Existing blind-selected window can express it once Joker rows compile. |

## Persistence gaps

- `JokerModifierStateV3` needs a strict serializable ability-state field whose
  allowed keys and initial values are supplied by the catalog definition.
- `schemasV3.ts`, V2-to-V3 migration, default modifier construction,
  synchronization, invariants, export/import, and recovery tests must all agree
  on the new field.
- Existing V3 saves need an idempotent logical migration/defaulting path. The
  task must not invalidate active local runs merely because their saved Joker
  modifiers predate ability state.
- Materialized RNG evidence must record Joker rolls and generated content IDs;
  replay may not reroll after load or presentation timing.

## Presentation gaps

- The existing audit title and exact 230 count intentionally describe non-奇牌
  content. Joker review should be a distinct 50-row ledger/tab so the previous
  acceptance evidence remains meaningful.
- Shop and pack cards already render materialized names and descriptions, but
  they need the Joker image asset/rarity metadata and state-aware current-value
  lines.
- Game-table Joker slots currently show owned names and descriptions only. The
  task needs visible current values for counters/growth without calculating
  gameplay rules in React.
- Player-profile collection masking and permanent discovery persistence remain
  owned by the later progression/collection task. This batch records acquisition
  evidence and supplies a complete review surface.

## Architecture consequences

1. Extend the catalog with a Joker-specific discriminant/metadata block while
   retaining one aggregate validator and one source of row counts.
2. Add small typed Joker predicates and operations that are shared by behavior
   profile, never selected by content ID.
3. Introduce one framework-free played-hand transaction that owns pre-score,
   score, post-score, RNG, creation, destruction, and ability-state updates.
4. Derive passive capabilities from active non-debuffed owned Joker effects at
   their point of use; do not permanently patch base rules on acquisition.
5. Store mutable per-instance numbers in V3 modifier state and initialize them
   from definition metadata.
6. Keep the legacy fixture handlers and V2-compatible command interface working.
7. Replace the first 50 external capability doubles with real production
   definitions while preserving doubles for 051-150 in child-mode tests only.
8. Add a separate local Joker art/provenance manifest and audit route, generated
   from the same 50 row definitions.

## Evidence paths

- `src/content/schema/catalog.ts`
- `src/content/schema/validateCatalog.ts`
- `src/content/runtime/productionRunContent.ts`
- `src/content/runtime/eligibility.ts`
- `src/content/dependencies/externalDependencies.ts`
- `src/game-core/model/runV2.ts`
- `src/game-core/model/runV3.ts`
- `src/game-core/effects/registry.ts`
- `src/game-core/effects/scoreHandV2.ts`
- `src/game-core/effects/runWindowV2.ts`
- `src/game-core/effects/applyStateOperationV3.ts`
- `src/game-core/commands/executeCommandV2.ts`
- `src/game-core/economy/shopV2.ts`
- `src/persistence/schemasV3.ts`
- `src/presentation/catalog/CatalogAuditScreen.tsx`
- `.trellis/spec/frontend/gameplay-contracts.md`

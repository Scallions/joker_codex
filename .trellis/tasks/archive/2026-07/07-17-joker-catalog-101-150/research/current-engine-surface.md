# Joker 101-150 — Current Engine Surface

## Purpose

Record the repository evidence used to plan the final 50 production 奇牌. This
is an implementation audit, not a second requirements document. It describes
the accepted V5 runtime, reusable contracts, and the irreducible gaps exposed by
J101-J150.

Evidence was inspected on 2026-07-20 against `main` after the completed 051-100
implementation/archive sequence (`f79279b`, `f901752`, `953e373`).

## Accepted foundations

- The production catalog is one discriminated aggregate. It currently freezes
  230 non-奇牌 + 100 奇牌 = 330 definitions and version `joker-catalog-2`
  (`src/content/schema/catalog.ts`).
- `src/content/catalogs/jokers.ts` compiles a serializable `JokerSource` into
  stable IDs, localization keys, art/ownership IDs, availability, discovery,
  rarity, ensemble, copy policy, sticker eligibility, ability state, contracts,
  effects, and typed operations. No production callback is stored in content.
- The catalog trigger union and runtime `EffectWindow` already cover score,
  held, discard, blind, round, shop, acquisition, pack, sale, card-addition,
  modifier-success, other-Joker, consumable, ante-end, and passive boundaries.
- V5 event facts already preserve immutable played-hand, discard, consumable,
  pack, sale, playing-card-added, modifier-success, other-Joker, and blind-result
  context (`src/game-core/rules/jokerEventFactsV5.ts`).
- The effect registry resolves sources in stable position/ID order, respects
  debuff, supports copy/retrigger source operations, records `copiedBy` ancestry,
  limits depth, and caps a queue at 10,000 operations
  (`src/game-core/effects/registry.ts`).
- `applyRunWindowEffectsV2` collects blind/tag/voucher/Joker/consumable sources,
  resolves one queue, and applies generic operations to a proposed state
  (`src/game-core/effects/runWindowV2.ts`).
- The V5 played-hand resolver proposes score, money, modifier rolls, state,
  destruction IDs, and RNG before the command commits zones/history/checkpoint
  (`src/game-core/effects/scoreHandV2.ts`,
  `src/game-core/commands/executeCommandV2.ts`).
- Per-instance ability state is strictly keyed from definition initial state and
  validated for every owned Joker. Shared V5 state persists initial deck size,
  one target rank, one target suit, and current-round one-shot Boss suppression
  (`src/game-core/model/runV5.ts`,
  `src/game-core/invariants/validateRunStateV5.ts`).
- Active passive capabilities are recomputed through the same queue. Current
  capabilities include hand/flush/straight parameters, allowed debt, free
  reroll, face projection, all-played scoring, hand/discard deltas, and
  source-specific extra interest
  (`src/game-core/rules/jokerPassiveCapabilitiesV3.ts`).
- Shop/pack materialization is deterministic, rarity-first for Jokers, and
  serializes offers/options into the run. Eligibility already has an
  `allowDuplicates` concept, although the actual materializers currently impose
  uniqueness directly (`src/content/runtime/eligibility.ts`,
  `src/game-core/economy/shopV2.ts`).
- Acquisition, stickers, editions, discovery, content creation, random targets,
  and modifier rolls already materialize durable choices rather than letting
  React reroll them.
- V1-V5 persistence, migration, IndexedDB recovery, profile transfer, strict
  schema validation, and recovery fingerprints are already production paths.
- The content audit and local asset pipeline validate local WebP paths,
  dimensions, ownership/provenance, focal uniqueness, localization, contracts,
  handlers, counts, and unresolved dependencies.

## Catalog and acquisition gaps

1. Counts/version stop at 100 Jokers and 330 total definitions. The child must
   freeze 150/380, add `joker-catalog-3`, resolve J101-J150, and reject any
   remaining Joker external double.
2. `JokerEnsemble` lacks the five approved final-batch presentation groups.
3. `AvailabilityRule` supports deck-modifier gates needed by J106/J120, and the
   ordinary rarity drawer already excludes Legendary rows. The legendary route
   nevertheless needs an explicit tested source contract so J146-J150 cannot
   leak into shops yet remain reachable through the existing `legend-call`
   Spectral-equivalent definition.
4. `src/content/catalogs/consumables.ts` still records a reserved Joker external
   dependency on the legendary creation row. Once all 150 definitions compile,
   that placeholder must be removed and strict dependency closure revalidated.
5. Shop card fill/reroll and non-standard pack option materialization currently
   use content-ID uniqueness unconditionally. Free-Joker tag materialization has
   a second local `usedContentIds` set. J121 needs one capability-derived policy
   applied consistently to shop and relevant pack candidates, not separate
   branches.
6. `repriceShopV2` knows only ordinary discounts. J143 requires a generic
   zero-price family capability for Planet consumables and Celestial packs while
   preserving already-free offers and leaving unrelated items/vouchers alone.

## Copy graph gap

The current resolver can follow `copy-source` left/right/instance operations,
but its semantics are sufficient only for static content-authored edges:

- it filters debuffed sources and sorts them, then recomputes relative targets
  from that filtered array rather than retaining a complete frozen owned layout;
- a cycle rejects the whole queue as `effect-cycle`; J123/J138 can form a legal
  layout-dependent dynamic cycle that must suppress only that branch;
- no operation declares an event-sensitive copy router anchored to the copied
  source position;
- source copy compatibility remains a coarse row policy while J136 requires
  copyable Chips plus an incompatible hand-size passive, and many scaling rows
  require copyable current output plus noncopying growth/reset/destruction;
- graph construction is repeated per queue call instead of being frozen at the
  event entry shared by nested score/retrigger/sale/creation passes;
- copy trace does not distinguish target edge, compatible facets skipped, or a
  safely suppressed dynamic cycle.

J123 must route through the immediate source to its right. J138 must route
through the leftmost owned source. When a router copies another router, the
copied router keeps its own source anchor: `[target, J123, J138]` lets both
routers reach `target`; `[J123-A, J123-B, target]` lets A traverse B to target.
Reorder after event admission cannot retarget the current event. Chance-based
copied output receives an independent roll. Passive, growth, reset,
destruction, edition, and sticker facets are skipped unless the matrix declares
an event action compatible.

The design consequence is one `FrozenJokerSourceGraphV6` containing every owned
position, active/debuff flag, effects, and typed route edge. Dynamic cycles
produce a no-op trace; malformed static fixture cycles and budget exhaustion
remain hard failures.

## Probability gap

Gameplay chances are currently resolved in several places:

- DSL `{ kind: 'chance' }` predicates;
- catalog state operations;
- card enhancement/edition behavior and Glass break in scoring;
- setup/blind draw transformations;
- some consumable/modifier actions.

Shop rarity, item weighting, edition/sticker materialization, random targets,
shuffle, and random choice also consume RNG, but they are weighted selections,
not player-visible `1 in N` effect chances.

J126 requires a single semantic boundary. Add `resolveListedChanceV6` with an
integer numerator/denominator and the active passive multiplier. It multiplies
the numerator by `2^sourceCount`, clamps to the denominator, consumes no RNG at
zero or certainty, and materializes ordinary probabilistic rolls. It applies to
explicit gameplay effect chances, including harmful chances and Glass break,
but never to weights, shuffle, target selection, shop rarity, editions, stickers,
or random target/card/content choice. Every migrated call site needs an earlier-
row regression because J001-J100 already contain chance effects.

## Suit and hand-shape gap

- The current effective-card projection exposes one suit plus Wild/Stone/debuff
  flags. Suit predicates and poker classification assume ordinary equality.
  J113 needs one passive suit-equivalence relation consumed by Flush detection,
  suit-target predicates, discard matching, and all later suit mechanics.
- J122 is not satisfied by `union(candidate suits) == four suits`. Four distinct
  scoring cards must be assignable one-to-one to Hearts, Diamonds, Clubs, and
  Spades. Wild and suit equivalence expand a card's candidates, but one card may
  fill only one role. A small deterministic bipartite matcher belongs in poker
  facts/capabilities.
- J128 likewise requires two distinct scoring cards: one assignable to Clubs and
  another assignable to a non-Club suit. It should reuse the assignment helper.
- J131-J135 can reuse existing `hand-contains` facts. J144 needs the same pure
  poker classifier applied to an immutable discarded-card set and exposed on the
  discard event.
- Current hand facts do not expose `playedCardIds` versus a four-role suit
  assignment result as generic predicates. Add facts, not ordinal-specific
  tests.

## New event and transaction gaps

### Playing-card destruction

Permanent card removal is scattered. `scoreHandV2.ts` returns
`destroyedCardIds`; `executeCommandV2.ts` filters the deck/zones; generic state
operations can remove cards directly; consumables have their own destroy paths.
No immutable destruction event exists, so J120/J146 cannot reliably observe the
pre-removal enhancement/face projection or reason.

All permanent removal must pass through one proposal helper that:

1. validates unique owned card IDs and freezes printed/effective identity plus
   enhancement/seal/edition/bonus state;
2. removes each ID from deck, hand, draw, discard, selection, face-down, forced,
   and modifier mirrors exactly once;
3. emits one `playing-card-destroyed` event with IDs and reason;
4. resolves active sources left-to-right against the snapshot;
5. validates and commits atomically.

Glass break, consumables, Joker effects, and future destruction callers use the
same helper. Reference implementation defects that omit a legitimate
destruction source are not compatibility requirements.

### Boss ability and Boss suppression

V5 owns `bossDisabledForRound`, set by a sale-trigger operation. Boss checks are
duplicated across score validation, hand size, blind rules, run windows, and
reward settlement. J149 adds a passive, idempotent disable that must combine with
the V5 one-shot flag and respond immediately to debuff/sale/destruction.

Define `bossEffectsDisabledForRun(state)` from the one-shot flag or any active
passive source, then use it at every Boss effect call site. It disables effects,
not the Boss target/reward identity. Multiple sources remain boolean; the
reference multi-copy inversion defect is intentionally excluded.

J129 also needs `boss-ability-triggered`, emitted once for a played hand only
when at least one enabled Boss rule actually applies. Merely facing a Boss,
failing its target, or evaluating a disabled rule does not emit it. Immutable
facts include Boss/rule IDs and affected cards; each active/copy source pays once
per event.

### Last-hand survival

`playSelected` currently marks any unmet target with zero hands as `run-lost`
immediately. J107 requires a command-owned survival decision before that commit.
The resolver applies only to hand-exhaustion loss (not deck/draw exhaustion),
requires `score * 4 >= targetScore`, consumes the first eligible active source
left-to-right, destroys it without a sale event, and enters the ordinary cleared
round path. The resulting receipt omits base Blind reward while retaining
remaining valid interest/tag/effect lines. Failure/rejection remains atomic.

### Shop exit and consumable capacity

`leaveShop` currently runs `ante-ended` after a Boss shop, advances the lineup,
and emits only a domain event. J150 needs an actual `shop-left` effect window
before ante/lineup mutation, triggered only by the accepted Next Round command.

Owned consumables already store `editionId`, but capacity is checked with array
length in acquisition, operations, and invariants. Add one shared
`consumableSlotContribution`/`usedConsumableSlots` rule: Negative edition uses
zero, every other consumable uses one. J150 freezes the pre-window eligible
owned-consumable pool; every normal/copied source draws independently from that
same pool, creates a new Negative clone with new instance ID, and consumes no RNG
when the pool is empty. Generated copies do not feed the same window.

### Sale cloning and legal Joker capacity debt

Sale effects already see a pre-removal snapshot, but `sellJoker` applies the
window, pays, and filters the sold instance without a clone transaction. J137
needs a readiness counter and an atomic operation that picks another pre-sale
owned Joker, copies content/ability/edition/stickers, strips Negative edition,
resets a duplicated J137 counter to zero, removes the source, and pays the sale.

Ordinarily the removed source frees one slot. If J137 itself is Negative, a
non-Negative clone can legally leave inventory one slot over capacity. V2
invariants currently reject this except for one challenge-specific rule. V6
needs a small generic `jokerCapacityDebt` equal to `max(0, usedSlots - slots)`:
only the validated clone operation may introduce debt; ordinary acquisition is
blocked while debt is positive; later removal normalizes it. Persistence and
invariants can then distinguish a legal committed overage from corruption.

## Lifecycle and state gaps by row family

| Behavior | Reusable base | Missing contract |
|---|---|---|
| J102 ten-hand retrigger | card retrigger queue, ability state | one noncopying remaining-hand decrement after each active played-hand event and self-destroy after the 10th affected hand |
| J103/J127 round targets | V5 shared rank/suit target materialization | independent Castle suit and Idol rank+suit fields; weighted full-deck card choice and deterministic Stone-only fallback |
| J105 sale growth | `item-sold` facts, factor state | deliberate-sale classification and active Boss-defeat reset |
| J110 other sale values | sale pricing helper | dynamic sum of every other owned Joker's current sale value |
| J111/J125/J136 round rules | passive hand/discard deltas | hands-per-round delta and partial-copy facet for J136 Chips only |
| J112 random sealed card | card-add helper, seals | random rank+suit plus uniformly random seal, force into opening hand, allow hand-size overflow, trigger-copy |
| J121 duplicate offers | deterministic shop/pack draws | capability-scoped duplicate policy across three materializers |
| J124/J130/J148 counters | per-instance ability state | scored-2 growth, per-round Jack factor/reset, quotient/remainder discard accumulation |
| J137 sale duplicate | sale snapshot, materializers | exact state/sticker/edition clone and legal capacity debt |
| J139 unique Planets | consumable history observations | distinct content-ID history projection and end-round payout |
| J142 Tarot creation | blind-selected creation | capacity-before-RNG and copied independent creation |
| J143 free content | shop repricing | family-aware zero-price capability for cards and packs |
| J144 first discard level | discard facts, hand leveling | discarded-set poker classification frozen on first discard |
| J146 destruction growth | effective face projection | destruction event count and all-cards-face passive interaction |
| J150 Negative clone | content clone, shop exit | zero-slot consumables and pre-window target pool |

## V6 persistence boundary

V5 shared suit/rank fields must keep their J083/J099 meanings. J103 and J127
cannot reuse them without coupling unrelated target displays. Introduce a
minimal V6 extension:

```ts
interface JokerRuntimeStateV6 {
  readonly castleTargetSuit: JokerSuit | null;
  readonly idolTargetRank: JokerRank | null;
  readonly idolTargetSuit: JokerSuit | null;
  readonly jokerCapacityDebt: number;
}
```

Per-instance mutable values stay in `abilityState`: J102 remaining hands, J103
stored Chips, J105 factor, J120 factor, J124 Chips, J130 round factor, J137
completed rounds, J146 factor, and J148 factor/remainder. Probability factor,
duplicate allowance, price rules, hands/hand-size/discards, suit equivalence,
and passive Boss disable are derived capabilities and never durable patches.

V5-to-V6 migration preserves the V5 content snapshot/version, initializes the
three targets to null and capacity debt to the currently provable legal value
(normally zero), consumes no RNG, and records metadata. A target is materialized
only upon first relevant acquisition or an active round-boundary rotation. New
runs snapshot all 380 definitions under `joker-catalog-3`; migrated V5 runs do
not silently gain J101-J150.

## Presentation and asset gaps

- Definitions, audit pagination, contracts, and assets stop at J100. They must
  extend to fifteen ten-card ensembles/150 entries without changing earlier
  row identity.
- Generic current-value copy needs projections for remaining retrigger hands,
  Castle/Idol targets, stored Chips/factors, sale-factor growth, skipped blinds,
  readiness rounds, unique Planets, enhanced-card count, discard remainder,
  probability multiplier, and copied-target compatibility.
- Fifty new local 768x1024 WebP files and provenance sidecars must follow the
  frozen focal briefs. Validators continue to reject remote paths, duplicate
  focal keys, missing ownership, decode failure, or raster gameplay text.
- The copy target/status display is a projection of the frozen current layout;
  it must not become the authority that resolves copy behavior.

## Architecture consequences

1. Keep one serializable Joker DSL and one ordered proposal pipeline; extend
   typed facts, operations, capabilities, and services rather than introducing a
   J101-J150 interpreter.
2. Build a complete event-entry source graph and let compatible operations route
   through it. Runtime layout cycles are traced no-ops; hard budgets still fail
   the proposal.
3. Centralize listed chances, card destruction, Boss disable/trigger, shop exit,
   and inventory slot accounting before compiling the rows that depend on them.
4. Advance durable shape only for independent shared targets and legal capacity
   debt. Keep per-instance state in the accepted ability map and global rules as
   derived passives.
5. Preserve one accepted-command/one-checkpoint atomicity, stored random
   evidence, old frozen snapshots, and the full J001-J100 regression baseline.
6. Extend aggregate, dependency, localization, contract, art, and audit ledgers
   to J150; presentation remains a read-only projection.

## Evidence paths

- `src/content/schema/catalog.ts`
- `src/content/catalogs/jokers.ts`
- `src/content/catalogs/consumables.ts`
- `src/content/runtime/eligibility.ts`
- `src/content/runtime/productionRunContent.ts`
- `src/content/runtime/runSetupV5.ts`
- `src/game-core/model/runV2.ts`
- `src/game-core/model/runV3.ts`
- `src/game-core/model/runV5.ts`
- `src/game-core/rules/jokerEventFactsV5.ts`
- `src/game-core/rules/jokerEffectDslV3.ts`
- `src/game-core/rules/jokerPassiveCapabilitiesV3.ts`
- `src/game-core/rules/runtimeV3.ts`
- `src/game-core/effects/registry.ts`
- `src/game-core/effects/runWindowV2.ts`
- `src/game-core/effects/scoreHandV2.ts`
- `src/game-core/effects/applyStateOperationV3.ts`
- `src/game-core/commands/executeCommandV2.ts`
- `src/game-core/economy/shopV2.ts`
- `src/game-core/invariants/validateRunStateV2.ts`
- `src/game-core/invariants/validateRunStateV5.ts`
- `src/persistence/`
- `src/presentation/selectors/jokerPresentation.ts`
- `.trellis/spec/frontend/gameplay-contracts.md`

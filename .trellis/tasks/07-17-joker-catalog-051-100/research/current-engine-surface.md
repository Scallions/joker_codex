# Joker 051-100 — Current Engine Surface

## Purpose

Record the repository evidence used to plan the second 50 production 奇牌. This
is an implementation audit, not a second requirements document. It describes
the accepted 001-050 runtime, the exact reusable contracts, and the irreducible
gaps that rows 051-100 expose.

Evidence was inspected on 2026-07-19 against `main` after the 001-050 work and
archive commits (`19b0171`, `6c3525f`).

## Accepted foundations

- The production aggregate is already a discriminated non-奇牌/奇牌 catalog.
  `CatalogFamily` includes `joker`, while count constants currently freeze 230
  non-奇牌 + 50 奇牌 = 280 rows (`src/content/schema/catalog.ts:21-52`).
- Production 奇牌 rows already own rarity, ensemble, copy policy, sticker
  eligibility, initial ability state, localization keys, discovery, and typed
  effects through one builder (`src/content/catalogs/jokers.ts:12-84`).
- The catalog trigger union already names score, discard, round, blind, shop,
  pack, acquisition, and consumable-use moments
  (`src/content/schema/catalog.ts:69-87`).
- Joker predicates, values, and operations are finite serializable unions rather
  than callbacks (`src/content/schema/catalog.ts:109-278`). The existing set
  covers hand facts, scored/held identity, chance, remaining resources, full-deck
  modifier counts, state values, score, retriggers, creation, source/right-hand
  destruction, state growth, hand leveling, sale-value growth, and round
  resources.
- `RunPlayingCard.bonusChips` is already durable and therefore can own J056's
  permanent per-card Chips without a parallel modifier field
  (`src/game-core/model/runV2.ts:64-72`).
- V4 adds a strict primitive ability-state map per Joker instance and snapshots
  the `joker-catalog-1` content version (`src/game-core/model/runV3.ts:104-133`).
  New acquisitions initialize it from definitions
  (`src/content/runtime/runSetupV4.ts:69-83`).
- Hand facts already separate displayed hand, all played cards, scoring cards,
  held cards, effective identities, and Pair/Three/Two-Pair/Straight/Flush
  containment (`src/game-core/poker/handFactsV3.ts:14-32`). Effective identity
  already freezes printed rank/suit, Wild, Stone, face, and debuff projections
  (`src/game-core/poker/effectiveCardV3.ts:8-19`).
- Passive capabilities are recomputed from active, non-debuffed owned sources at
  the point of use. The current collector owns Straight/Flush size, debt, free
  reroll, and all-cards-face (`src/game-core/rules/jokerPassiveCapabilitiesV3.ts:6-75`).
- The score proposal resolves all Joker windows before committing the command,
  carries proposed state/RNG/destruction/materialized rolls, and computes hand
  facts once (`src/game-core/effects/scoreHandV2.ts:34-56`,
  `src/game-core/effects/scoreHandV2.ts:363-410`).
- Lifecycle operations use the same state applicator as command windows and can
  update V4 state, money, inventory, cards, discovery, and materialized choices
  (`src/game-core/effects/applyStateOperationV3.ts:35-50`).
- Played hands commit a complete score proposal and only then replace cards,
  update the deck/history, and checkpoint (`src/game-core/commands/executeCommandV2.ts:642-733`).
- V4 persistence validates ability-state keys and values, projects through the
  V3 base schema, verifies content-version closure, and runs invariants
  (`src/persistence/schemasV4.ts:8-103`).

## Catalog and definition gaps

1. The production ledgers are fixed at 50 Joker rows and 280 total rows
   (`src/content/schema/catalog.ts:44-52`). The batch must freeze 100 implemented
   Joker rows, 330 aggregate rows, and only 101-150 as unresolved external IDs.
2. The current ensemble union and validator know only the five 001-050 groups.
   They need the approved presentation-only groups 造化秘戏, 失序机关, 云路贵客,
   夜市账房, and 异兽散场 without treating them as gameplay tags.
3. `AvailabilityRule` can express prerequisites and deck modifiers
   (`src/content/schema/catalog.ts:54-61`), so J061/J089/J091 need no content-ID
   shop branch. J061 does require the generic prerequisite evaluator to accept a
   persisted effect observation as its evidence source.
4. Acquisition can initialize static state, but J060 needs an independent hand
   target and the round needs shared J083 rank/J099 suit targets. Those random
   values cannot be guessed by presentation or regenerated after reload.

## Event-context gap

The largest shared gap is not another effect window; it is the typed facts carried
by a window.

- `EffectWindow` currently has 16 runtime values and does not include
  `consumable-used`, even though the catalog trigger union does
  (`src/game-core/model/runV2.ts:33-52`, `src/content/schema/catalog.ts:69-87`).
- `RunWindowOptionsV2` carries only source inclusion switches and newly drawn
  card IDs (`src/game-core/effects/runWindowV2.ts:17-33`). It cannot identify the
  cards discarded, the item family used/acquired/sold, the pack skipped, the
  blind position defeated, or a successful playing-card modifier activation.
- `recordConsumableUse` writes every use as a generic `consumable-used`
  observation under the unrelated `item-acquired` window and stores only the
  content ID (`src/game-core/commands/executeCommandV2.ts:131-149`). J055 and J086
  need the family (`planet` or `tarot`) and a real `consumable-used` event.
- A discard moves zones, applies modifier lifecycle, draws replacements, and only
  then runs the generic `discard` window
  (`src/game-core/commands/executeCommandV2.ts:807-871`). Joker DSL cannot inspect
  the discarded snapshot, distinguish first discard, count face/target-rank
  cards, or destroy a specific discarded card.
- Opening a bought pack already runs `pack-opened`
  (`src/game-core/commands/executeCommandV2.ts:1373-1439`), but `skipPack` only
  closes the choice and emits `choice-cancelled`
  (`src/game-core/commands/executeCommandV2.ts:2327-2343`). J063 requires one
  explicit pack-skipped event per skipped pack.
- A successful reroll already has a post-reroll hook and no rejected reroll
  reaches it (`src/game-core/commands/executeCommandV2.ts:1287-1322`). J096 can
  reuse that hook once source state changes can consume event facts.
- Selling a Joker or consumable removes it and pays out, but no pre-removal source
  snapshot is passed through an effect queue. J077/J094 and J079 require a typed
  sale transaction, including the sold source's debuff/copy state and all
  inventory sale values.

The design consequence is one bounded `JokerEventFactsV5` value attached to an
atomic proposal. It should carry only immutable IDs/counts/families/flags needed
by generic predicates and operations. Durable history remains selective; the
event object itself is not appended wholesale to saves.

## Score and card-mutation gaps

Rows 051-100 require reusable expressions beyond the current DSL:

- exact played-card count, first hand, first discard, displayed-hand equality,
  played rank containment, and whether the current type was played earlier in
  this round;
- selected target hand/rank/suit, discard-set face/rank counts, money at most a
  threshold, blind position, and item/event family;
- draw-pile count, full-deck printed/effective rank count, difference from the
  run's initial deck size, Tarot uses, money scaling, and exact-rarity Joker
  iteration;
- permanent full-state clone of the one played card, returned to hand after
  scoring; all played cards joining the scoring set; permanent `bonusChips`
  mutation; enhancement removal/replacement without removing seal or edition;
  and destruction of a played/discarded card;
- state changes that clamp at zero/one, destroy the source at a threshold, choose
  a random non-source non-permanent Joker, and keep growth independent from
  target availability;
- an after-other-Joker hook so every exactly-Uncommon Joker is followed by each
  active J092 multiplier even when that Uncommon has no direct score output.

The current hand-fact builder derives scoring IDs from the ordinary poker result
(`src/game-core/poker/handFactsV3.ts:56-65`). J052 therefore needs a passive
`all-played-cards-score` capability applied when facts are built, not a content-ID
override after scoring. J069 similarly needs a generic Straight-gap capability
owned by the poker evaluator.

The current score context contains state, hand facts, source, window, optional
card ID, RNG, and stencil count (`src/game-core/rules/jokerEffectDslV3.ts:18-26`).
Extending that one context with typed event facts is sufficient; a second Joker
interpreter is not.

## Passive-rule and economy gaps

| Required behavior | Reusable base | Missing contract |
|---|---|---|
| J052 all played cards score | `HandFactsV3.playedCardIds/scoringCardIds` | Derived `allPlayedCardsScore` capability before facts and card passes. |
| J069 one-rank gaps in Straights | Existing Straight/Flush size capabilities | Generic maximum rank-gap/step capability consumed by poker candidates. |
| J080/J087 hand size | Base rule already has `handSize` | Dynamic owned-source sum, V4 current value for J080, and immediate draw/trim policy. |
| J088 extra discard | Base rule already has `discardsPerRound` | Dynamic owned-source contribution when a round starts; sale/debuff affects future rounds only. |
| J084 extra interest | Reward resolver computes interest after round-end effects (`executeCommandV2.ts:563-617`) | An interest-rate bonus capability with the same cap per copy and explicit reward lines. |
| J077 boss suppression | Blind rules are command-owned | Persisted current-round `bossDisabled` flag and recomputation of target/restrictions after a valid sale. |
| J094 double tag | Typed tag inventory already exists | Sale-triggered creation of the project `复签` definition without RNG. |

Round-end ordering already runs Joker effects before interest. Keep that useful
boundary, but add one explicit phase sequence: card/Joker round-end effects,
temporary-source destruction, Boss growth/payout, sticker settlement, interest,
receipt commit. A debuffed source contributes neither effect nor growth.

## Persistence gap and V5 boundary

V4 ability state can persist per-instance counters and independent J060 targets,
but it cannot faithfully recover the run's initial deck size after cards have
already been added or removed. J081 makes that value gameplay state.

Introduce a minimal V5 durable extension rather than reconstructing history:

```ts
interface JokerRuntimeStateV5 {
  readonly initialDeckSize: number;
  readonly sharedRoundTargetRank: JokerRank | null;
  readonly sharedRoundTargetSuit: JokerSuit | null;
  readonly bossDisabledForRound: boolean;
}
```

- New runs capture `initialDeckSize` immediately after setup creates the deck.
- V4-to-V5 migration uses the V4 checkpoint's current deck length as the only
  deterministic compatibility baseline and records that migration source. It
  does not pretend to know pre-V4 mutations.
- Migration initializes shared targets to `null` without consuming RNG. A new
  run or migrated run materializes the relevant shared target on first J083/J099
  acquisition, then persists it; multiple copies never roll separately. The
  current target for the upcoming round is prepared at the prior round-end
  boundary while a relevant source is active.
- J060's independent target remains in that instance's V4-compatible
  `abilityState` because copies may legitimately display different hands.
- Content version advances to `joker-catalog-2`; parsers retain V2-V4 import and
  recovery paths, while new checkpoints write V5 only.

All random selections and chance results continue to append
`MaterializedChoiceV3` evidence (`src/game-core/model/runV3.ts:76-82`). False
predicates, full capacity, missing targets, and rejected commands consume no RNG.

## Presentation and asset gaps

- The current definitions and audit surface stop at J050. The ledger must become
  a 100-row projection while preserving the accepted 001-050 entries byte-for-
  byte except for aggregate counts and pagination.
- Generic current-value copy exists for source ability-state outputs; it needs
  new value projections for draw-pile count, target hand/rank/suit, full-deck
  counts, initial-size delta, money, Tarot uses, and passive bonuses. React must
  render those projections, never calculate the effect or switch on content ID.
- Fifty new local 768x1024 WebP files and provenance records must use the approved
  ensembles. The validator continues to reject remote paths, duplicate focal
  keys, missing sidecars, failed decodes, and raster gameplay text.

## Architecture consequences

1. Keep one serializable Joker DSL and add event facts, predicates, values,
   operations, and passive capabilities only where the frozen matrix requires.
2. Advance to V5 only for initial-deck truth, shared round targets, and the
   current-round Boss-suppression flag; leave per-instance values in the existing
   ability-state map.
3. Route play, discard, consumable use, pack open/skip, reroll, blind result, and
   sale through one pure command proposal that validates before checkpointing.
4. Preserve fixed phase ordering and left-to-right source order; never infer
   behavior from ordinal, name, localization, ensemble, or content ID.
5. Extend the aggregate definition/count/asset ledgers to J100 and subtract those
   IDs from external dependencies; preserve J101-J150 doubles only in child-mode
   fixtures.
6. Keep presentation a projection of committed definitions, event trace, and
   durable current values.

## Evidence paths

- `src/content/schema/catalog.ts`
- `src/content/catalogs/jokers.ts`
- `src/content/runtime/productionRunContent.ts`
- `src/content/runtime/runSetupV4.ts`
- `src/game-core/model/runV2.ts`
- `src/game-core/model/runV3.ts`
- `src/game-core/rules/jokerEffectDslV3.ts`
- `src/game-core/rules/jokerPassiveCapabilitiesV3.ts`
- `src/game-core/effects/scoreHandV2.ts`
- `src/game-core/effects/runWindowV2.ts`
- `src/game-core/effects/applyStateOperationV3.ts`
- `src/game-core/commands/executeCommandV2.ts`
- `src/game-core/poker/handFactsV3.ts`
- `src/game-core/poker/effectiveCardV3.ts`
- `src/persistence/schemasV4.ts`
- `.trellis/spec/frontend/gameplay-contracts.md`

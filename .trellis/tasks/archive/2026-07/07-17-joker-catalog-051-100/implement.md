# Joker Catalog 051-100 — Implementation Plan

## Entry gate

- [x] The user has reviewed `prd.md`, `design.md`, `implement.md`, both research
      files, and explicitly approved implementation.
- [x] Run `python3 .trellis/scripts/task.py start 07-17-joker-catalog-051-100`
      only after that approval.
- [x] Invoke `trellis-before-dev` before editing production code and load the
      gameplay contract plus this task's engine audit and frozen matrix.
- [x] Classify the working tree and preserve unrelated changes.
- [x] Record a green baseline for the accepted 001-050 content, engine,
      persistence, component, and browser suites before adding red tests.

No slice may add behavior selected by Joker ID, ordinal, Chinese name, ensemble,
or asset path. Every slice ends green and is a source-control rollback point.

## Slice 0 — Freeze executable ledgers and red contracts

- [x] Add one machine-readable J051-J100 expected ledger for IDs, names, rules,
      flavor, rarity, cost, availability, ensembles, copy facets, sticker
      exclusions, initial state, contract IDs, art, and provenance.
- [x] Add red catalog tests for 50 contiguous new rows; the 19/25/6 rarity split;
      230/100/330 family counts; 100 resolved Joker IDs; and 50 unresolved IDs.
- [x] Add red positive, boundary, and debuffed-source vectors for every row and
      named fixtures for every matrix interaction.
- [x] Add red V4-to-V5 migration, V2-to-V5 chain, old-snapshot, recovery,
      export/import, and no-RNG migration fixtures.
- [x] Confirm failures describe absent V5/new-row contracts while all pre-existing
      tests remain green.

Gate:

```bash
npx vitest run tests/content/joker-catalog-051-100.test.ts tests/game-core/joker-contract-ledger-051-100.test.ts tests/persistence/migrate-run-v4-to-v5.test.ts
```

Rollback point: test-only commit.

## Slice 1 — Catalog version, aggregate, and row identities

- [x] Add `joker-catalog-2` to the known production-version union without
      rewriting existing rows' introduction metadata.
- [x] Extend aggregate ledgers to 100 real Jokers and 330 total rows; permit
      external doubles only for J101-J150.
- [x] Extend `JokerEnsemble` with the five approved presentation-only values and
      prove no gameplay predicate can consume them.
- [x] Add all 50 original Chinese identities, explicit rules, flavor, costs,
      availability, copy/sticker policies, initial state, and effect references
      from the frozen matrix.
- [x] Express J061/J089/J091 availability through generic persisted-observation
      and full-deck-modifier rules. Discovery remains acquisition metadata.
- [x] Validate state-key closure, copy-facet agreement, safe hundredths, sticker
      exclusions, localization, contracts, assets, and provenance.

Gate:

```bash
npx vitest run tests/content/joker-catalog-051-100.test.ts tests/content/catalog-audit.test.ts tests/content/production-run-v5.test.ts
npm run content:audit
npm run typecheck
```

Rollback point: catalog/version commit. Runtime behavior may still be red.

## Slice 2 — RunStateV5 and forward-only persistence

- [x] Add `runV5.ts` with `initialDeckSize`, nullable shared rank/suit targets,
      `bossDisabledForRound`, and migration metadata.
- [x] Capture the true initial deck size for new runs after setup and before
      gameplay; initialize shared targets only when their first source appears.
- [x] Implement a pure V4-to-V5 migration that preserves the frozen content
      snapshot, uses current durable deck length, assigns null targets, clears
      Boss suppression, and consumes no RNG.
- [x] Preserve the V1→V2→V3→V4→V5 chain and old V2-V4 compatibility resolvers.
- [x] Add strict V5 schemas/invariants, recovery fingerprints, IndexedDB
      normalization, metadata repair, future-version rejection, and export/import.
- [x] Widen ability-state guards to V4/V5 without weakening exact key/value
      validation or injecting J051-J100 into old runs.

Gate:

```bash
npx vitest run tests/persistence tests/game-core/run-v5-invariants.test.ts tests/game-core/run-v4-invariants.test.ts
npm run typecheck
```

Rollback point: V5 reader/writer/migration commit. Do not land a writer without
all readers and recovery paths.

## Slice 3 — Typed event facts and atomic proposal coordinator

- [x] Add the six runtime windows `consumable-used`, `pack-skipped`, `item-sold`,
      `playing-card-added`, `playing-card-modifier-succeeded`, and
      `other-joker-resolved`; align trigger and runtime unions.
- [x] Add the discriminated immutable `JokerEventFactsV5` variants from
      `design.md` and strict serializers/validators.
- [x] Extend the existing bounded run-window proposal pipeline so nested V5 windows
      share one frozen copy graph, operation budget, RNG proposal, event trace, and
      commit; do not introduce a parallel V5-only coordinator.
- [x] Reject over-budget recursion, invalid event/window pairs, capacity errors,
      target errors, and invariant failures without partial mutation or RNG use.
- [x] Preserve the existing 10,000-operation and copy-ancestry limits.

Gate:

```bash
npx vitest run tests/game-core/joker-event-facts-v5.test.ts tests/game-core/run-window-v5.test.ts tests/game-core/effect-pipeline.test.ts
npm run typecheck
```

Rollback point: event/proposal commit.

## Slice 4 — DSL, dynamic values, passive capabilities, and targets

- [x] Add only the frozen-matrix predicates, values, operations, and copy facets
      enumerated in `design.md`; keep every payload serializable and bounded.
- [x] Extend the exhaustive registry/applicator and invalid-contract tests.
- [x] Add V5 passives for all-played-card scoring, Straight maximum step, hand
      size, round-start discards, and source-specific extra interest.
- [x] Make the hand evaluator consume generic capabilities before deriving
      scoring IDs; prove duplicate boolean/max sources are idempotent and numeric
      sources stack with safe bounds.
- [x] Add per-instance hand, weighted shared rank, non-repeating shared suit, and
      random-other-Joker materializers with stable pool order and stored evidence.
- [x] Materialize J083/J099 on first acquisition; rotate the upcoming target only
      at round end while a relevant active source exists. Empty deterministic
      fallbacks consume no RNG.

Gate:

```bash
npx vitest run tests/game-core/joker-effect-dsl-v5.test.ts tests/game-core/joker-passives-v5.test.ts tests/game-core/joker-targets-v5.test.ts tests/game-core/poker.test.ts
npm run typecheck
```

Rollback point: shared DSL/passive/target commit.

## Slice 5 — Atomic played-hand and card-mutation transaction

- [x] Route new V5 runs through one played-hand proposal while preserving frozen
      compatibility resolvers for older runs.
- [x] Freeze command-entry/event facts and implement J051 deferred full-state
      clone plus J054 deferred destruction in the documented order.
- [x] Implement all-played scoring, pre-card enhancement removal/replacement,
      permanent `bonusChips`, modifier-success events, immediate retrigger passes,
      and held-card passes.
- [x] Resolve pre-output state changes, independent Joker output, and the
      `other-joker-resolved` hook left-to-right without recursive J092 events.
- [x] Commit clones, destruction, card-added events, zone movement, replacement
      draw, history, score, invariants, and one checkpoint as a single unit.
- [x] Prove any late failure restores cards, modifiers, inventory, money, state,
      score, history, RNG, and persistence exactly.

Gate:

```bash
npx vitest run tests/game-core/joker-played-hand-v5.test.ts tests/game-core/joker-card-mutation-v5.test.ts tests/game-core/joker-other-source-v5.test.ts tests/game-core/jokers-001-050.test.ts
npm run typecheck
```

Rollback point: played-hand transaction commit.

## Slice 6 — Lifecycle, sale, Boss, and reward transactions

- [x] Reorder discard handling around immutable facts, modifier effects, Joker
      effects, proposed destruction, zone movement, and replacement draw.
- [x] Emit typed events only after successful consumable use, permanent card
      addition, pack opening/skipping, shop reroll, item sale, and blind result.
- [x] Route every permanent card addition through one helper; transforms,
      reloads, and mirror repair must not emit false additions.
- [x] Freeze sale sources/copies before removal; apply sale-trigger effects,
      remove the item, pay its pre-removal value, recompute passives, and commit.
- [x] Implement current-round Boss suppression as V5 state and reset it on the
      next blind. Non-sale destruction must never emit a sale event.
- [x] Implement the exact round-end sequence for source effects, temporary
      destruction, Boss growth/payout, sticker settlement, base interest,
      separately capped J084 sources, target rotation, validation, and receipt.

Gate:

```bash
npx vitest run tests/game-core/joker-discard-v5.test.ts tests/game-core/joker-lifecycle-v5.test.ts tests/game-core/joker-sale-v5.test.ts tests/game-core/joker-reward-v5.test.ts
npm run typecheck
```

Rollback point: lifecycle transaction commit.

## Slice 7 — Rows 051-070

- [x] Implement J051-J060 clone, all-card scoring, draw-pile value, first-hand
      destruction/creation, consumable growth, card bonus, discard payout,
      bidirectional state, Straight/Ace creation, and independent hand target.
- [x] Implement J061-J070 extinction availability, repeated-hand factor,
      pack-skip growth, independent blind growth/destruction, exact-four growth,
      Straight-Flush creation, common creation, enhancement consumption,
      Straight-step passive, and card-added growth.
- [x] Add positive, boundary, debuffed, copy, sticker, same-seed/reload, and named
      cross-row fixtures for all twenty rows.

Gate:

```bash
npx vitest run tests/game-core/jokers-051-070.test.ts tests/game-core/joker-interactions-051-070.test.ts tests/content/eligibility.test.ts
npm run content:audit
```

Rollback point: first 20 new rows.

## Slice 8 — Rows 071-085

- [x] Implement J071-J080 low-money creation, held K factors, full-deck rank
      payout, Boss-growing payout, global-maximum reset/growth, face enhancement,
      Boss suppression, first-face factor, inventory-wide value growth, and
      expiring hand-size passive.
- [x] Implement J081-J085 initial-deck delta, held-face chance money, weighted
      shared discard rank, separately capped interest, and pack-open creation.
- [x] Cover source order, pre/post money snapshots, tied global maxima, duplicate
      interest sources, mid-hand passive loss, sale/debuff boundaries, reload,
      and all matrix interaction fixtures.

Gate:

```bash
npx vitest run tests/game-core/jokers-071-085.test.ts tests/game-core/joker-interactions-071-085.test.ts tests/game-core/joker-economy-071-085.test.ts
npm run content:audit
```

Rollback point: 35 functional new rows.

## Slice 9 — Rows 086-100

- [x] Implement J086-J090 historical Tarot count, stackable hand/discard
      passives, Stone count Chips, and fixed end-round payout.
- [x] Implement J091-J100 successful-modifier growth, after-Uncommon factors,
      money Chips, sale tag, first-discard destruction/payout, reroll growth,
      expiring Mult, Two-Pair growth, shared non-repeating suit, and per-card
      discard decay/destruction.
- [x] Cover acquisition preconditions, multi-branch modifier success, debuffed
      rarity targets, sale source snapshots, first-discard opportunity, free
      rerolls, fixed-point thresholds, shared targets, reload, and every matrix
      fixture.
- [x] Run the complete J001-J050 contract suite after all shared primitives and
      all 50 new rows are active.

Gate:

```bash
npx vitest run tests/game-core/jokers-086-100.test.ts tests/game-core/joker-interactions-086-100.test.ts tests/game-core/jokers-001-050.test.ts
npm run content:audit
```

Rollback point: all 50 new rows functional.

## Slice 10 — Real acquisition, discovery, and campaign integration

- [x] Route ordinary shops, rerolls, Buffoon-equivalent packs, tags, Spectral
      creation, challenges, and starting inventory through the 100 real rows.
- [x] Remove J051-J100 doubles from production-child fixtures and reject attempts
      to shadow them; retain declared J101-J150 doubles only.
- [x] Preserve rarity-first weighted draw and renormalization over non-empty
      eligible pools; forced empty rarity fails without consuming RNG.
- [x] Persist first-acquisition discovery evidence without gating first offers.
- [x] Prove saved offers/pack options/materialized choices are immutable across
      reload, catalog refresh, migration, and recovery.

Gate:

```bash
npx vitest run tests/game-core/joker-rarity-pools.test.ts tests/game-core/shop-catalog-v5.test.ts tests/game-core/run-setup-catalog-v5.test.ts tests/content/production-run-v5.test.ts
npm run content:audit
```

Rollback point: real 100-row acquisition commit.

## Slice 11 — Original illustrations and presentation

- [x] Load the project `imagegen` skill before generating raster artwork.
- [x] Generate one 768×1024 text-free master from every approved art brief and
      record its prompt/source sidecar before optimization.
- [x] Visually inspect identity distance, focal uniqueness, pose/composition,
      crop, text/logo/watermark artifacts, geometry, and ensemble consistency;
      regenerate failures.
- [x] Optimize accepted masters to local WebP and complete all ownership,
      provenance, dimensions, and unique-focal records.
- [x] Extend shared current-value projections for state, counts, targets, money,
      history, passives, and hundredths; React may only render projections.
- [x] Paginate the 100-row Joker audit by ten ensembles while retaining the
      accepted non-Joker ledger and representative shop, pack, and table views.
- [x] Prove all assets decode, all paths are local, and no browser request reaches
      a remote image or runtime service.

Gate:

```bash
npx vitest run tests/presentation/joker-catalog-audit.test.tsx tests/presentation/shop-screen.test.tsx tests/presentation/game-table.test.tsx
CI=1 npx playwright test tests/e2e/joker-catalog-audit.spec.ts tests/e2e/joker-gameplay.spec.ts
npm run content:audit
```

Rollback point: art/presentation commit. Decode success alone is not visual
acceptance.

## Slice 12 — Full integration, specs, and local acceptance

- [x] Run seeded real campaigns across all five new ensembles and every relevant
      score, discard, consumable, pack, reroll, blind, sale, reward, save/load,
      win, and endless boundary.
- [x] Compare pure-engine and persisted Chromium/WebKit checkpoints for RNG,
      target values, offers, state, score traces, discovery, mutation, and
      destruction.
- [x] Fault-inject every new migration, recovery, capacity, target, creation,
      destruction, and late-command failure boundary.
- [x] Re-run the full non-Joker, J001-J050, legacy V2-V4, challenge, modifier,
      component, and browser baselines.
- [x] Update `.trellis/spec/frontend/gameplay-contracts.md` with V5 event facts,
      transaction order, target persistence, compatibility, and 330-row snapshot
      guarantees; update local run/audit documentation if commands changed.
- [x] Inspect the locally running game at 1280×720 in Chromium and WebKit and
      record exact commands/results as acceptance evidence below.
- [x] Invoke `trellis-check`, resolve every blocking finding, and repeat the full
      gate from a clean classified tree.

Final gate:

```bash
npm run check
npm run test:coverage
CI=1 npm run test:e2e
npm run content:audit
git diff --check
python3 ./.trellis/scripts/task.py validate .trellis/tasks/07-17-joker-catalog-051-100
```

## High-risk review checklist

- [x] No content-ID/name/ensemble behavior branch exists in runtime, commands,
      persistence, selectors, or React.
- [x] Capacity and predicates precede RNG; every consumed value is materialized.
- [x] Played/discard/sale event facts remain immutable throughout nested effects.
- [x] Copy facet, debuff, retrigger, source order, destruction, and state-growth
      semantics match the frozen matrix exactly.
- [x] V5 migration never changes an old run's frozen catalog or invents targets.
- [x] Failed commands never alter checkpoint, RNG, state, cards, inventory,
      money, history, score, discovery, or presentation events.
- [x] All 001-050 behavior and all 230 non-Joker rows remain green.

## Required completion evidence

- 50/50 new definitions and 50/50 row contract groups pass.
- The 19 Common / 25 Uncommon / 6 Rare batch split and 230 + 100 = 330
  aggregate counts pass; only J101-J150 remain unresolved.
- 50/50 original names, rules, flavor lines, local illustrations, provenance,
  and ownership records pass automated and visual review.
- Every mutable or random row passes same-seed replay, reload, recovery,
  export/import, false-branch no-consumption, and rejection atomicity checks.
- Chromium and WebKit show the complete 100-row ledger and representative real
  gameplay at 1280×720 with no runtime network dependency.
- The final gate, Trellis validation, and classified working-tree review pass.

## Acceptance evidence

Recorded on 2026-07-19:

- Production audit resolves 230 non-奇牌 rows plus 100 real 奇牌 rows for a
  330-row snapshot; J101-J150 are the only 50 unresolved reserved IDs. The new
  batch freezes 19 Common / 25 Uncommon / 6 Rare rows.
- J051-J100 compile from the shared serializable DSL without content-ID, Chinese
  name, or ensemble behavior branches. The 38 frozen named interaction fixtures
  are present, and the focused V5 suite passes 12 files / 57 tests.
- V5 migration, schema, invariants, IndexedDB normalization, recovery, transfer,
  immutable event facts, target materialization, atomic card/discard/sale/reward
  paths, copy/debuff/order semantics, and J001-J050 compatibility all pass the
  full 82-file / 356-test Vitest run.
- All 50 new 768×1024 text-free WebP illustrations and provenance sidecars decode
  locally. The ten-ensemble 100-row audit and a real persisted J100 table state
  pass Chromium and WebKit with no remote request.
- `trellis-check` found and resolved lifecycle compilation, post-destruction
  source execution, free-pack event routing, discard ordering, stale V4/50-row
  E2E expectations, formatting, and lint drift. The V5 transaction and 330-row
  snapshot contracts are now recorded in
  `.trellis/spec/frontend/gameplay-contracts.md`.
- Final evidence: Prettier, ESLint, TypeScript, production build, content audit,
  `git diff --check`, and Trellis task validation pass; Vitest coverage passes at
  81.45% statements / 74.27% branches / 87.8% functions / 84.86% lines; the full
  1280×720 Playwright run passes 26/26 across Chromium and WebKit.

Implementation note: shared V5 behavior extends the existing generic V2/V3
command, queue, applicator, scoring, passive, and selector modules instead of
duplicating them into parallel V5-only files. Version-specific durable state,
migration, validation, and setup remain isolated in V5 modules.

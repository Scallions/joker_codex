# Complete Run and Economy Implementation Plan

## Preconditions

- Parent PRD/design and this child's PRD/design/research are authoritative.
- The archived foundation commits remain the rollback baseline.
- Obtain explicit user approval for these artifacts, then activate only this
  child with the Trellis task script.
- Load `trellis-before-dev` and all routed package specs before changing
  application code.
- Keep fixture IDs under `fixture:run-economy:*`; do not claim production catalog
  completion.

## Slice 1: Freeze V2 Contracts and Migration

### Red gate

1. Add type/schema tests for every V2 phase, progress, round, inventory, economy,
   shop, reward, result, and pending-choice variant.
2. Add invalid-state tables for phase/resource mismatches, duplicate/foreign card
   IDs, invalid score values, slot overflows, double-consumed receipts, and
   unresolved content IDs.
3. Add V1 raw fixtures for active round, shop, win, loss, recovery, and profile
   transfer; assert deterministic V2 snapshots and preserved IDs/checkpoints.
4. Add transfer tests proving positive Infinity round-trips through tagged JSON
   while null, NaN, negative infinity, and misplaced tags fail closed.

### Green work

1. Split the foundation V1 types/schema into a frozen migration input module.
2. Implement V2 model types, branded IDs, Zod schemas, and invariant validation.
3. Implement pure V1 -> V2 migration without RNG consumption.
4. Upgrade the IndexedDB repository to migrate atomically on first load while
   retaining raw V1 recovery data.
5. Add canonical V2 export/import codecs and checksums for non-finite scores.
6. Update memory repository/test builders and profile transfer preview paths.

### Gate

- All migration outputs pass V2 schema and invariants.
- Injected migration/transaction failure leaves V1 data and profile metadata
  intact.
- Existing profile/foundation tests either pass unchanged or have explicit V2
  expectations; no behavior disappears silently.

## Slice 2: Progression, Blind Selection, and Round Lifecycle

### Red gate

1. Freeze the ante -1..39 target table, default run constants, blind multipliers,
   reward values, finisher positions, and infinite-target comparison.
2. Add scenario tests for play/skip routing, visible tag persistence, boss
   eligibility/no-repeat cycles, durable boss-reroll confirmation, ante increment,
   ante-8 win choice, finish, endless entry, later finisher routing, and loss.
3. Add rejection tests for boss skip, wrong blind, duplicate skip/reward, invalid
   win choice, stale checkpoints, and every wrong-phase command.
4. Add property tests proving rejected commands preserve canonical state and RNG.

### Green work

1. Implement score arithmetic/formatting and frozen ante target helpers.
2. Implement fixture blind/tag catalogs and stable weighted pool helpers.
3. Implement ante materialization, boss history, skip, select, round setup, deck
   reshuffle/deal, win/loss, reward-state creation, shop/ante advance, and endless.
4. Extend domain/presentation events and pure selectors for the new lifecycle.
5. Replace the one-blind start action with a clearly labeled full fixture campaign
   while retaining migrated-foundation handling.

### Gate

- Pure scenarios can play all 24 ordinary campaign blinds, skip either eligible
  blind, win ante 8, enter ante 9, and lose deterministically.
- Reload snapshots at every lifecycle phase reproduce the same next command and
  RNG result.

## Slice 3: Poker Rule Context and Ordered Effect Engine

### Red gate

1. Extend poker tables/properties for all matching candidates, hand levels, wild
   suits, no-rank/stone cards, shortened straights/flushes, face overrides, hand
   restrictions, permutation invariance where applicable, and deterministic ties.
2. Write one golden interaction fixture for every declared hook window and every
   primitive operation.
3. Freeze scored-card, held-card, 奇牌, additive/multiplicative, post-score, and
   presentation-event order with trace snapshots.
4. Add copy and stacked-retrigger fixtures, debuffed source/card fixtures,
   transform/destroy/create/deferred fixtures, empty-pool behavior, and legitimate
   repeat depth near the safety boundary.
5. Add direct and indirect copy/retrigger cycles plus operation-budget overflow;
   assert full rejection with unchanged checkpoint/RNG.

### Green work

1. Refactor poker evaluation into candidate detection plus winning selection under
   a typed rule context.
2. Implement hook-window/source types, handler registry contracts, queue entries,
   primitive operations, trace events, and bounded resolver.
3. Route random primitives exclusively through stable sorted-pool selection.
4. Implement the complete scoring pipeline and round draw/terminal consequences
   on top of the queue.
5. Add namespaced fixture handlers for each capability category.
6. Keep handlers pure and exhaustive; enforce registry/catalog references at
   startup and in architecture tests.

### Gate

- Score/effect trace goldens establish exact order independent of React.
- Every primitive and window has positive, negative, and save/reload coverage.
- `game-core` still has no React, Redux, IndexedDB, Motion, DOM, or audio import.

## Slice 4: Rewards, Economy, Shops, Vouchers, Tags, and Packs

### Red gate

1. Table-test reward lines, remaining-hand income, interest floor/cap, disabled
   interest, cap modifiers, negative money/debt, discounts, half-down rounding,
   dynamic sale value, and minimum/exception prices.
2. Freeze default shop slots/weights, first-shop guarantee, reroll 5+n, new-shop
   restock, stable ante voucher, voucher prerequisites, and boss restock.
3. Add shop scripts for buy/sell/reorder, full inventory, slot-exempt instance,
   insufficient funds, discount, reroll, generated/free offer, duplicate filter,
   empty pool, and blocked pool.
4. Add pack scripts for each fixture family/size, multiple picks, target
   validation, temporary capacity, skip, empty options, nested effect outcome,
   and materialized-choice reload.
5. Add immediate/deferred tag and one-shot consumption tests.

### Green work

1. Implement reward receipt calculation/claim and typed economy lines.
2. Implement price/sale/interest/debt helpers and economy effect integration.
3. Implement materialized shops, weighted pools, rerolls, voucher lifecycle,
   inventory capacity selectors, acquisition/sale, and tag effects.
4. Implement the discriminated choice stack, persisted target toggles, pack
   purchase/options/picks, consumable targeting, boss-reroll confirmation, forced
   card choices, temporary capacity, cancel/skip, and return transitions.
5. Expand fixture catalogs only as needed to prove the matrix in `design.md`.

### Gate

- No shop/pack/reward option is regenerated on reload.
- Rejected transactions do not remove offers, spend money, consume choices, or
  advance RNG.
- Every accepted economy action is applied once and survives round-trip storage.

## Slice 5: Atomic Orchestration and Playable Chinese UI

### Red gate

1. Extend commit-orchestration tests across every new command, including
   persistence failure and double-click/stale command races.
2. Add component tests for blind selection/skip, round ledger, reward receipt,
   expanded shop, voucher, pack choice/targets, win/endless, loss, migration
   notice, and Chinese rejection/recovery messages.
3. Add presentation-queue tests proving new animations/events start only after
   persistence resolves and can be skipped without changing domain state.

### Green work

1. Extend the Redux slice/action bridge and selectors for V2 state.
2. Build functional `BlindSelect`, `Reward`, `Pack`, and `RunWon` screens and
   expand the table/shop/result screens within the existing fixed stage.
3. Add legal-action projections, target selection, offer/receipt breakdowns,
   endless labels, and score formatting without duplicating domain rules.
4. Surface migration/save/effect-cycle/empty-pool errors through existing error
   boundary/recovery patterns.
5. Keep presentation events ordered and post-commit; use simple Motion/CSS
   transitions only where they do not expand this child's art-polish scope.

### Gate

- A player can create/select a profile, start the full fixture campaign, select
  or skip blinds, play rounds, claim rewards, use shops/packs, win, choose endless,
  reload, and resume entirely through the local UI.
- Existing 1280x720 and larger-stage layouts remain usable in Chromium/WebKit.

## Slice 6: Campaign, Persistence, and Quality Gate

1. Add pure golden campaigns for:
   - play-all eight-ante win;
   - mixed skip/play win with immediate/deferred tags;
   - loss by exhausted hands;
   - ante-8 finish and endless entry;
   - save/reload after every committed action;
   - V1 migrate then continue.
2. Add Playwright Chromium/WebKit flows for campaign routing, representative
   round, reward, shop, pack, win/endless, loss, profile isolation, and injected
   persistence failure. Use public UI/import flows, never direct Redux mutation.
3. Update visual snapshots only for intentional new stable screens and inspect
   them at 1280x720.
4. Run focused coverage for all new branches and ensure no test-only catalog is
   counted as production content.
5. Run the full project gate, then `trellis-check`; fix findings and rerun the
   complete gate from a clean working tree.
6. Update project specs only for durable conventions learned during
   implementation, commit intentionally, finish, and archive this child. Do not
   archive or start the parent automatically.

## Required Validation Commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run test:e2e
npm run build
git diff --check
python3 ./.trellis/scripts/task.py validate 07-17-complete-run-and-economy
```

Focused commands are encouraged during slices but do not replace the final gate.
If dependencies change, run `npm ci` before the final gate and include lockfile
review.

## Traceability Matrix

| PRD area | Primary slices |
|---|---|
| Complete states, blind/ante, win/loss/endless | 2, 5, 6 |
| Poker and ordered effects | 3, 6 |
| Economy and durable rewards | 4, 5, 6 |
| Shops, packs, vouchers, tags, slots | 4, 5, 6 |
| Atomic saves and V1 migration | 1, 5, 6 |
| Playable Simplified Chinese UI | 5, 6 |
| Illegal-command/RNG invariants | 1-4, 6 |

## Risk and Rollback Points

- Finish and verify each slice before broadening the next; the archived foundation
  commits are the task-level rollback point.
- Do not weaken Zod, invariants, serializability, or transaction ordering to pass
  a migration or UI test.
- Do not use recursive handler calls or ad hoc effect conditionals inside
  `executeCommand`; return to the queue contract if an interaction does not fit.
- Do not move complete production catalog work into this child. Add only a fixture
  that proves an otherwise untested engine capability.
- If V1 migration cannot preserve a field, fail with an explicit recovery path;
  never silently reset an active profile.
- If browser E2E runtime grows unbounded, shorten the deterministic fixture build
  or use valid import checkpoints, not domain bypass hooks.

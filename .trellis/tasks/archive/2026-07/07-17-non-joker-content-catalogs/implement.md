# Non-Joker Content Catalogs — Implementation Plan

## Entry Gate

- [x] User has reviewed `prd.md`, `design.md`, and this plan and explicitly
      approved implementation.
- [x] `task.py start 07-17-non-joker-content-catalogs` has been run only after
      that approval.
- [x] `trellis-before-dev` has loaded the active gameplay/persistence contract and
      the two task research files.
- [x] Working tree ownership is classified before any edit; unrelated changes are
      left untouched.

## Slice 0 — Freeze executable acceptance fixtures

- [x] Add a machine-readable 230-row count ledger and red tests for each family,
      the 32-to-15 booster mapping, reserved 奇牌 dependencies, and manifest
      closure.
- [x] Add golden setup/scoring/economy vectors for the nontrivial numerical
      contracts before implementing their behavior.
- [x] Add migration fixtures containing representative V2 choices, shop offers,
      packs, rewards, Infinity scores, and fixture handler references.
- [x] Add test helpers that create declared 奇牌 capability doubles without
      placing them in the production aggregate.

Gate:

```bash
npx vitest run tests/content tests/persistence/migrate-run-v2.test.ts
```

Expected at this slice: new tests fail for the intended missing production
contracts while all pre-existing suites remain green.

## Slice 1 — Catalog schema, identity, and validator

- [x] Add branded content/localization/asset/ownership/contract IDs and exhaustive
      family discriminated unions.
- [x] Add typed availability, discovery, unlock-objective, rule-patch, and
      external-dependency contracts.
- [x] Reserve `bxqp:joker:001` through `bxqp:joker:150` without defining shipped
      奇牌 rows.
- [x] Add localization, asset, ownership, and contract manifests plus the
      `catalog-child` and `integration-strict` validator modes.
- [x] Add one production aggregate assembled from family modules; reject fixture
      and test-double rows.
- [x] Add `npm run content:audit` and make the build/test gate invoke the audit.

Gate:

```bash
npm run content:audit
npx vitest run tests/content/catalog-schema.test.ts tests/content/catalog-audit.test.ts
npm run typecheck
```

Rollback point: schema/validator commit. Do not add behavior rows until IDs and
manifest failure messages are stable.

## Slice 2 — Logical V3 model and atomic migration

- [x] Define `RunStateV3`, `RunContentSnapshotV3`, expanded run rules/history,
      setup identity, owned modifiers/stickers, and supported content versions.
- [x] Add strict Zod schemas and invariant validation for every new field and
      cross-reference.
- [x] Implement pure, idempotent V2-to-V3 migration that preserves checkpoint,
      RNG, materialized fixture content, choices, receipts, and history.
- [x] Chain V1 -> V2 -> V3 for legacy loads and imports.
- [x] Update repository initialization so the V2 preimage and V3 result commit
      atomically to recovery/runs; update profile export/import envelope V3.
- [x] Add injected failure, downgrade rejection, 2 MB limit, and three-profile
      isolation tests.

Gate:

```bash
npx vitest run tests/persistence tests/game-core/run-v3-invariants.test.ts
npm run typecheck
```

Rollback point: V3 migration commit. V2 readers, handlers, and fixtures remain
available; no UI switches to V3 until this gate passes.

## Slice 3 — Shared setup, modifier, and pool primitives

- [x] Implement baseline -> deck -> cumulative stake or challenge setup
      composition with deterministic card recipes and rule patches.
- [x] Centralize shop/pack/free/generated eligibility, exclusions, duplicates,
      prerequisites, discovery, and external dependency checks.
- [x] Implement enhancements E01-E08, seals L01-L04, editions N01-N05, and the
      three run-only stickers with fixed ordering and debuff behavior.
- [x] Add generic operations for suit/rank/full-card copy, card creation,
      modifier replacement, stickers, pool generation, restrictions, and
      one-shot expiry.
- [x] Extend invariants for mutually exclusive modifiers, slot contribution,
      sticker counters, and card conservation.

Gate:

```bash
npx vitest run tests/game-core/modifiers-v3.test.ts tests/game-core/setup-v3.test.ts tests/game-core/eligibility-v3.test.ts
npm run typecheck
```

Rollback point: shared rule primitives commit. No family handler may bypass these
services afterward.

## Slice 4 — Consumable catalogs

- [x] Implement original identity, localization, assets, definitions, and handlers
      for T01-T22.
- [x] Implement P01-P12 with exact Chips/Mult level increments and secret-hand
      availability.
- [x] Implement X01-X18 with explicit random ordering, capacity checks, target
      cardinality, indestructible 奇牌 handling, rare replacement rates, and
      cumulative hand-size costs.
- [x] Materialize target frames for pack use and ensure every success/rejection is
      atomic and replayable.
- [x] Add table-driven positive/boundary tests plus cross-tests with all modifiers,
      seals, editions, debuffs, copies, and slot capacity.

Gate:

```bash
npx vitest run tests/content/consumables.test.ts tests/game-core/consumable-commands-v3.test.ts tests/game-core/consumable-interactions-v3.test.ts
npm run content:audit
```

Rollback point: 52-consumable commit.

## Slice 5 — Vouchers, tags, boosters, shop, and economy

- [x] Implement V01-V32 pair prerequisites, costs, unlock metadata, and all shop,
      pricing, weight, Ante, slot, interest, hand/discard, and boss-reroll rules.
- [x] Implement G01-G24 immediate/deferred/stacking behavior, Ante gates, edition
      deferral, free shop/pack behavior, history-derived rewards, and expiry.
- [x] Implement 15 booster profiles and 32 unique collection rows/assets with
      exact integer weights, options, picks, price, temporary capacity, rare
      replacements, target hands, and safe exit behavior.
- [x] Update shop materialization and reroll logic to use centralized eligibility
      and preserve stable Ante vouchers and exclusions.
- [x] Add cross-tests for voucher pairs, discounts and sale values, edition rates,
      tag stacking, pack duplicates, free offers, future 奇牌 test doubles, and
      empty/blocked pools.

Gate:

```bash
npx vitest run tests/content/vouchers-tags-packs.test.ts tests/game-core/shop-catalog-v3.test.ts tests/game-core/economy-catalog-v3.test.ts
npm run content:audit
```

Rollback point: economy catalogs commit.

## Slice 6 — Complete blind catalog

- [x] Implement B01-B30 with original identity/assets, exact minimum Antes,
      rewards, target multipliers, and boss/finisher pool rules.
- [x] Add generic command semantics for random held-card discard, most-played-hand
      money reset, face-down draw policies, pre-score level reduction, hand-type
      restrictions, prior-Ante debuff, fixed draw-three, per-card cost, base-score
      halving, 奇牌 conceal/reorder/disable, sell-to-enable, and forced selection.
- [x] Ensure reroll/seen-pool/disable behavior remains deterministic and a disabled
      target-multiplier boss returns to the ordinary 2x baseline where required.
- [x] Add one positive and one boundary/rejection fixture per distinct blind
      operation plus full Ante/finisher selection properties.

Gate:

```bash
npx vitest run tests/content/blinds.test.ts tests/game-core/blind-contracts-v3.test.ts tests/game-core/ante-v3-properties.test.ts
npm run content:audit
```

Rollback point: blind catalog commit.

## Slice 7 — Decks, stakes, and challenge contracts

- [x] Implement D01-D15 card recipes, starting inventory, rule patches, scoring
      transforms, tag generation, and deterministic randomization.
- [x] Implement S01-S08 cumulative target tables, rewards, budgets, and sticker
      generation with exact materialized rates.
- [x] Implement C01-C20 starting recipes, rule overrides, bans, external
      dependencies, and metadata; test every row through setup and representative
      commands using declared 奇牌 doubles.
- [x] Add composition properties proving normal runs apply one deck plus cumulative
      stakes, challenges use their own S01 contract, and setup consumes RNG only
      for visible/materialized outcomes.
- [x] Switch the default new-run path to production D01/S01 while retaining
      migrated V2 fixture execution.

Gate:

```bash
npx vitest run tests/content/decks-stakes-challenges.test.ts tests/game-core/run-setup-catalog-v3.test.ts tests/game-core/catalog-run-properties.test.ts
npm run content:audit
```

Rollback point: run-setup catalogs commit.

## Slice 8 — Original asset set and catalog audit UI

- [x] Establish reusable 午夜百戏 frames, fibers, seals, and palette tokens.
- [x] Produce a distinct local focal asset/cover for every one of the 230 rows.
      Use project-authored SVG where suitable; if generated raster art is needed,
      use the image-generation workflow and retain prompt/source provenance.
- [x] Review every asset for copied identity, unwanted text/logos, malformed
      geometry, duplicate focal composition, dimensions, and transparent edges;
      mark ownership records reviewed only after inspection.
- [x] Build `CatalogCard` and a query-gated, paginated `CatalogAuditScreen` that
      resolves all Chinese localization and assets without affecting game rules.
- [x] Add programmatic image-load/no-external-request checks and representative
      1280x720 Chromium/WebKit snapshots for every family.

Gate:

```bash
npm run content:audit
npx vitest run tests/presentation/catalog-audit.test.tsx
CI=1 npx playwright test tests/e2e/catalog-audit.spec.ts
```

Rollback point: asset/audit commit. Do not accept a bulk-generated set until the
ownership and visual-review audit is complete.

## Slice 9 — Full integration and regression gate

- [x] Run a deterministic production D01/S01 campaign through blind, reward,
      shop, voucher, tag, pack, modifier, consumable, boss, win, and endless
      boundaries with reloads between irreversible actions.
- [x] Run representative higher-stake and challenge setup/command scripts using
      declared external 奇牌 doubles; assert no double appears in shipped content.
- [x] Compare canonical pure-run output with Chromium and WebKit persisted state.
- [x] Fault-inject migration and every new persistence boundary.
- [x] Run the 230-row manifest/contract audit in `catalog-child` mode and confirm
      `integration-strict` fails only for the intentionally future-owned 奇牌 IDs.
- [x] Inspect all family audit pages and critical gameplay snapshots at 1280x720.
- [x] Update README for the audit command/query and V3 local-save behavior.

Final gate:

```bash
npm run check
npm run test:coverage
CI=1 npm run test:e2e
npm run content:audit
git diff --check
python3 ./.trellis/scripts/task.py validate 07-17-non-joker-content-catalogs
```

Required evidence:

- 230/230 local rows and every family count pass;
- 230/230 rows have localization, asset, ownership, and executable contract IDs;
- V2 migration and V3 recovery/export/import pass;
- all existing and new unit/property/component/E2E tests pass;
- Chromium and WebKit canonical checkpoints match;
- coverage does not regress without an explained exclusion;
- working tree contains only this task's classified changes.

## High-Risk Files and Review Focus

- `src/game-core/model/runV2.ts` and new `runV3.ts`: do not mutate the old durable
  contract in place or make strict schema fields optional just to pass migration.
- `src/game-core/commands/executeCommandV2.ts`: migrated runs must keep working;
  shared extraction cannot change V2 command order.
- `src/game-core/effects/registry.ts`: retain fixture handlers and the bounded
  queue; project handlers must not branch on content IDs.
- `src/persistence/indexedDbRepository.ts`, `schemasV3.ts`, and profile transfer:
  prove transaction and checksum behavior under failure before switching defaults.
- Catalog aggregate and manifests: generate from family sources; avoid parallel
  hand-maintained count tables that can drift.
- Asset directories: never overwrite reviewed source/provenance files during
  optimization.

## Final Planning Review Checklist

- [x] No unresolved open question remains in `prd.md`.
- [x] The frozen matrix totals 230 and distinguishes booster rows from profiles.
- [x] V3 migration, external 奇牌 dependencies, known-defect policy, and asset
      ownership are explicit.
- [x] The user approves implementation after reviewing all three planning
      artifacts.

## Completion Evidence — 2026-07-18

- `npm run check`: format, lint, type-check, 51 test files / 200 tests, and
  production build passed.
- `npm run test:coverage`: 80.47% statements, 73.05% branches, 86.72%
  functions, and 83.17% lines.
- `npm run content:audit`: 230/230 rows, 13 families, 32 booster rows / 15
  profiles, 150 reserved external 奇牌 IDs, and manifest closure passed.
- `CI=1 npm run test:e2e`: Chromium and WebKit passed 16/16 scenarios,
  including 230 local images, zero remote content requests, persistence, and
  1280x720 visual baselines.
- `git diff --check` and
  `python3 ./.trellis/scripts/task.py validate 07-17-non-joker-content-catalogs`
  passed.

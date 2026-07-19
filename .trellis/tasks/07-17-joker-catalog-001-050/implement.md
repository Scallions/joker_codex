# Joker Catalog 001-050 — Implementation Plan

## Entry gate

- [ ] User has reviewed `prd.md`, `design.md`, `implement.md`, and the complete
      frozen matrix and explicitly approved implementation.
- [ ] `python3 .trellis/scripts/task.py start 07-17-joker-catalog-001-050` is run
      only after that approval.
- [ ] `trellis-before-dev` loads the gameplay/persistence specification and both
      task research files before code changes.
- [ ] Working-tree ownership is classified; unrelated changes are preserved.
- [ ] The current local baseline passes the focused content, engine, persistence,
      and browser smoke suites before new red tests are added.

## Slice 0 — Freeze executable acceptance ledgers

- [ ] Add a machine-readable expected ledger for IDs J001-J050, names, rules,
      flavor, rarity, costs, ensembles, availability, copy policy, sticker
      exclusions, initial state, and contract IDs.
- [ ] Add red catalog tests for 50 contiguous definitions, 36/14 rarity split,
      exact 230/50/280 counts, 50 resolved IDs, 100 unresolved IDs, and complete
      localization/asset/contract closure.
- [ ] Add red contract vectors for every fixed numerical row and named fixtures
      for the matrix's complex timing/interaction rulings.
- [ ] Add red V3-to-V4 migration fixtures containing owned Jokers, stickers,
      offers, pack choices, rewards, effect observations, and recovery data.
- [ ] Confirm all failures point to missing new contracts rather than regressions
      in existing fixtures.

Gate:

```bash
npx vitest run tests/content/joker-catalog.test.ts tests/game-core/joker-contract-ledger.test.ts tests/persistence/migrate-run-v3-to-v4.test.ts
```

Expected at this slice: new tests fail for absent Joker/V4 contracts; pre-existing
tests remain green.

Rollback point: test-only commit.

## Slice 1 — Joker catalog schema, aggregate, and dependency resolution

- [ ] Add `joker` to the production family model through a discriminated
      `JokerCatalogRow`, including rarity, flavor, ensemble, copy policy, sticker
      eligibility, and initial ability state.
- [ ] Extend Zod validation with strict Joker metadata and exact state-key/value
      constraints.
- [ ] Add generated non-Joker, Joker-batch, aggregate, implemented-ID, and
      unresolved-ID ledgers without changing the frozen 230-row assertions.
- [ ] Update external dependency construction so real definitions satisfy
      reserved IDs and doubles may cover only undefined 051-150 rows.
- [ ] Add Joker localization, flavor, asset/provenance, mechanical mapping,
      discovery, and contract manifests from one row source.
- [ ] Compile Joker rows to `JokerDefinitionV2` snapshots with no behavior inferred
      from names, ordinals, or IDs.
- [ ] Add all 50 row definitions from the frozen matrix; behavior can remain red
      until later slices, but every effect reference must be structurally valid.

Gate:

```bash
npx vitest run tests/content/joker-catalog.test.ts tests/content/catalog-audit.test.ts tests/content/production-run-v3.test.ts
npm run content:audit
npm run typecheck
```

Rollback point: schema/catalog commit. Do not change scoring before identity and
manifest failure messages are stable.

## Slice 2 — RunStateV4 and forward-only local migration

- [ ] Define `RunStateV4`, V4 Joker modifier/ability state, supported content
      versions, migration metadata, and shared V3/V4 catalog-run guards.
- [ ] Add strict V4 Zod schemas and invariant checks for exact state keys,
      primitive finite values, source definition, inventory/modifier one-to-one
      alignment, and destroyed/sold cleanup.
- [ ] Implement pure idempotent V3-to-V4 migration and chain V1 -> V2 -> V3 -> V4.
- [ ] Preserve embedded content snapshots and all materialized state; do not
      replace a resumed V3 run with the new 50-row catalog.
- [ ] Update new-run factories to emit V4 `joker-catalog-1` runs and initialize
      source-defined ability state on acquisition.
- [ ] Update recovery, IndexedDB load, export/import envelope, checksum, future
      version rejection, and injected-failure tests.
- [ ] Keep legacy V2 fixture handlers/runs executable after migration.

Gate:

```bash
npx vitest run tests/persistence tests/game-core/run-v4-invariants.test.ts tests/game-core/run-v2-invariants.test.ts
npm run typecheck
```

Rollback point: V4 migration commit. No Joker state mutation is added until this
gate proves recovery and import safety.

## Slice 3 — Hand facts, effective identity, and passive capabilities

- [ ] Add `HandFactsV3` capable of reporting independent Pair, Three-of-a-Kind,
      Two-Pair, Straight, Flush, played/scoring/held order, and displayed hand.
- [ ] Freeze four-card Straight/Flush and mixed-subset Straight Flush behavior;
      prove duplicate J018 sources are idempotent.
- [ ] Centralize effective face, suit, rank-value, Wild, Stone, and debuff
      projections used by poker evaluation, blind rules, and Joker predicates.
- [ ] Add passive owned-Joker capability resolution through the bounded queue for
      J018, J020, J030, and J037.
- [ ] Update affordability so J020 instances add borrowing permission, source
      removal blocks new debt, and an existing negative balance remains valid.
- [ ] Add rightmost-lowest held-card selection and empty/all-held suit facts.
- [ ] Add property tests for subhands, duplicate passive sources, Pareidolia/face
      debuffs, Wild/Stone held cards, and all rank tie cases.

Gate:

```bash
npx vitest run tests/game-core/joker-hand-facts.test.ts tests/game-core/joker-passives.test.ts tests/game-core/poker.test.ts tests/game-core/economy-shop-v2.test.ts
npm run typecheck
```

Rollback point: facts/passive commit. No row-specific IDs may appear in these
services.

## Slice 4 — Predicate/value DSL and atomic played-hand transaction

- [ ] Add strict serializable Joker predicates, dynamic values, and the minimal
      shared effect operations defined in `design.md`.
- [ ] Register pure handlers and exhaustive applicators; update operation budgets,
      invariants, and error messages.
- [ ] Extend copy queue entries with `output`/`trigger`/`none` facets while
      retaining ancestry limits and legacy fixture behavior.
- [ ] Implement scored-card and held-card retrigger targets with immediate pass
      ordering and no recursive retrigger generators.
- [ ] Implement source-state mutations, source/right-neighbor destruction,
      source sell-value growth, fixed-enhancement card creation, typed consumable
      creation, and discovery/extinction observations.
- [ ] Implement `resolvePlayedHandV3` as one pure proposal and route production V4
      play commands through it; keep migrated fixture runs on the legacy resolver.
- [ ] Materialize Joker rolls, selected/generated IDs, and state changes before
      returning; reject any intermediate failure atomically.
- [ ] Prove the existing after-hand window is not evaluated twice.

Gate:

```bash
npx vitest run tests/game-core/joker-effect-dsl.test.ts tests/game-core/joker-played-hand-transaction.test.ts tests/game-core/effect-pipeline.test.ts tests/game-core/run-window-integration.test.ts
npm run typecheck
```

Rollback point: engine primitive commit. All remaining row slices must use these
operations instead of adding command branches.

## Slice 5 — Rows 001-020: fixed score, subhands, and passives

- [ ] Implement J001-J005 fixed/suit additive Mult contracts.
- [ ] Implement J006-J015 Pair/Three/Two-Pair/Straight/Flush additive Mult/Chips
      contracts using independent hand facts.
- [ ] Implement J016 played-card count, J017 stencil empty-slot factor, J018
      four-card rules, J019 held-card replay, and J020 debt permission.
- [ ] Add one positive, false/boundary, and debuffed fixture per row.
- [ ] Add copy-output tests, duplicate-stencil math, zero-slot/negative-edition
      cases, J018+J009/J014, and J019+J029-compatible held replay fixtures.
- [ ] Verify all 20 rows appear in real ordinary shop and Buffoon pack pools.

Gate:

```bash
npx vitest run tests/game-core/jokers-001-020.test.ts tests/game-core/joker-interactions-001-020.test.ts tests/content/joker-runtime.test.ts
npm run content:audit
```

Rollback point: first 20 functional rows.

## Slice 6 — Rows 021-030: lifecycle, creation, chance, and retrigger

- [ ] Implement J021 adjacent destruction/stored Mult with permanent-target and
      rightmost/no-target boundaries.
- [ ] Implement J022/J023 dynamic discard score values.
- [ ] Implement J024 deterministic random Stone-like card addition outside the
      current draw and full zone conservation.
- [ ] Implement J025 run-wide modulo-six activation including current hand.
- [ ] Implement J026 per-8 capacity-before-roll Tarot creation and retriggers.
- [ ] Implement J027 uniform inclusive 0..23 Mult with stored roll evidence.
- [ ] Implement J028 final-hand all-card retrigger and J029 rightmost-lowest held
      rank behavior.
- [ ] Implement J030 one idempotent free reroll per entered shop.
- [ ] Cover J021+J046, J025+J047, J028+J036, Mime/Red-Seal held passes,
      destruction without sale payout, and reload after every RNG/state mutation.

Gate:

```bash
npx vitest run tests/game-core/jokers-021-030.test.ts tests/game-core/joker-lifecycle-021-030.test.ts tests/game-core/joker-interactions-021-030.test.ts
npm run content:audit
```

Rollback point: 30 functional rows.

## Slice 7 — Rows 031-040: deck counts, economy, global face, extinction

- [ ] Implement J031 rank-set Mult and J032 full-deck silk-shadow factor plus
      conditional appearance in shop and packs.
- [ ] Implement J033 effective-face Chips and J034 owned-Joker dynamic Mult,
      including debuffed and zero-slot instances.
- [ ] Implement J035 conditional round-end reward before interest.
- [ ] Implement J036 low-rank retrigger and J037 shared all-face capability.
- [ ] Implement J038 round-end 1/6 self-destruction, permanent-sticker exclusion,
      and J061 extinction observation without a J061 definition.
- [ ] Implement J039 even-rank Mult and J040 odd-rank Chips.
- [ ] Cover J033/J042+J037, J037+J044, Challenge C06/C09/C14 dependencies,
      sticker eligibility, copy facets, and round-end/reload ordering.

Gate:

```bash
npx vitest run tests/game-core/jokers-031-040.test.ts tests/game-core/joker-lifecycle-031-040.test.ts tests/game-core/joker-interactions-031-040.test.ts tests/content/eligibility.test.ts
npm run content:audit
```

Rollback point: 40 functional rows.

## Slice 8 — Rows 041-050: history, growth, leveling, and expiry

- [ ] Implement J041 ordered Ace Chips/Mult and J042 per-face independent money
      checks across retrigger passes.
- [ ] Implement J043 retroactive matching-hand count including the current hand.
- [ ] Implement J044 pre-output growth/reset with effective/debuffed face rules
      and Perishable exclusion.
- [ ] Implement J045 pre-score 1/4 hand-level upgrade so the current hand uses the
      upgraded base values.
- [ ] Implement J046 round-end sell-value increment before interest/reward and
      save/reload.
- [ ] Implement J047 blind-selected +3 hands/set-zero discards with copied trigger
      behavior.
- [ ] Implement J048 empty/Wild/Stone/debuff all-held suit predicate.
- [ ] Implement J049 pre-output Straight growth with Perishable exclusion.
- [ ] Implement J050 100-to-0 post-hand decay, no-Permanent eligibility, and
      no-payout self-destruction.
- [ ] Cover the matrix cross-row fixtures and canonical reload/export/import
      vectors for every stateful row.

Gate:

```bash
npx vitest run tests/game-core/jokers-041-050.test.ts tests/game-core/joker-lifecycle-041-050.test.ts tests/game-core/joker-interactions-041-050.test.ts
npm run content:audit
```

Rollback point: all 50 mechanically functional rows.

## Slice 9 — Rarity draw, acquisition, discovery, and real dependency integration

- [ ] Implement source-weighted rarity selection followed by stable within-rarity
      selection and renormalization over non-empty eligible pools.
- [ ] Support forced Common/Uncommon/Rare sources, with `pool-empty` and no RNG
      when the exact pool is absent.
- [ ] Route ordinary shop, reroll, Buffoon packs, tags, Spectral generation,
      challenges, and starting inventory through real definitions.
- [ ] Apply edition/sticker/capacity/ban/no-Joker-route rules through the shared
      acquisition path and row eligibility metadata.
- [ ] Emit deterministic first-acquisition discovery evidence without blocking
      initial availability.
- [ ] Remove 001-050 doubles from production-child integration tests and reject
      attempts to shadow them; retain declared doubles for 051-150 only.
- [ ] Prove saved materialized offers/choices remain unchanged across catalog
      refreshes and reloads.

Gate:

```bash
npx vitest run tests/game-core/joker-rarity-pools.test.ts tests/game-core/shop-catalog-v3.test.ts tests/game-core/run-setup-catalog-v3.test.ts tests/content/production-run-v3.test.ts
npm run content:audit
```

Rollback point: real acquisition/dependency commit.

## Slice 10 — Fifty original images and Joker presentation

- [ ] Load the project `imagegen` skill before generating any raster artwork.
- [ ] Generate one 768×1024 text-free master from each approved matrix brief;
      store its prompt/source sidecar before optimization.
- [ ] Inspect every master for identity similarity, duplicate pose/composition,
      unwanted text/logo/watermark, anatomy/geometry defects, crop, and ensemble
      consistency. Regenerate failures rather than marking them reviewed.
- [ ] Optimize reviewed masters to local WebP and complete ownership/provenance
      records with unique focal keys.
- [ ] Preserve the existing 230-row audit at `?catalog-audit=1`; add the 50-row
      ensemble/rarity Joker ledger at `?catalog-audit=jokers`.
- [ ] Add shared committed-state selectors for art, rarity, flavor, and current
      state values; use them in shop, pack, and table cards without gameplay logic
      in React.
- [ ] Add image-decode, file-presence, dimensions, unique-composition metadata,
      and zero-remote-request tests.
- [ ] Visually inspect all five ensemble pages and representative stateful
      shop/table views at 1280×720 in Chromium and WebKit.

Gate:

```bash
npx vitest run tests/presentation/joker-catalog-audit.test.tsx tests/presentation/shop-screen.test.tsx tests/presentation/game-table.test.tsx
CI=1 npx playwright test tests/e2e/joker-catalog-audit.spec.ts tests/e2e/joker-gameplay.spec.ts
npm run content:audit
```

Rollback point: art/presentation commit. No image is accepted solely because it
decodes; visual review is mandatory.

## Slice 11 — Full integration, specifications, and local acceptance

- [ ] Run a seeded production campaign that acquires representative rows from all
      five ensembles, reloads around irreversible actions, and crosses blind,
      reward, shop, pack, boss, win, and endless boundaries.
- [ ] Compare canonical pure-engine and persisted Chromium/WebKit checkpoints for
      RNG, offers, ability state, score traces, discovery, and destruction.
- [ ] Fault-inject every new migration/persistence boundary and every atomic
      create/destroy/capacity rejection.
- [ ] Re-run all archived 230-row, V2 fixture, V3 migration, challenge, modifier,
      and browser baselines.
- [ ] Update `.trellis/spec/frontend/gameplay-contracts.md` with V4 state,
      predicate/value/copy contracts, rarity selection, and 280-row snapshot
      guarantees.
- [ ] Update README local-run/audit instructions for the Joker ledger; do not add
      a server dependency beyond the existing local Vite workflow.
- [ ] Inspect the local game directly at `http://127.0.0.1:4173/` and record the
      exact acceptance commands/results in this plan.

Final gate:

```bash
npm run check
npm run test:coverage
CI=1 npm run test:e2e
npm run content:audit
git diff --check
python3 ./.trellis/scripts/task.py validate 07-17-joker-catalog-001-050
```

Required evidence:

- 50/50 real definitions and row contracts pass;
- 36 Common / 14 Uncommon, 230 non-Joker + 50 Joker = 280 aggregate, and 100
  unresolved future IDs pass;
- 50/50 localization/flavor/art/provenance/ownership records pass;
- every stateful/random row passes reload, recovery, export/import, and canonical
  replay checks;
- local Chromium and WebKit show all five art ensembles and representative real
  gameplay without remote requests;
- the full legacy and archived acceptance suite remains green;
- the working tree contains only classified task changes.

## Acceptance evidence — 2026-07-19

- `npm run check` passed: Prettier, ESLint, strict TypeScript, 68 Vitest files / 289
  tests, and the Vite production build all completed successfully. Vite retained
  its non-blocking advisory that the main production chunk exceeds 500 kB.
- `npm run test:coverage` passed with the same 68 files / 289 tests: 81.61%
  statements, 74.33% branches, 87.7% functions, and 84.68% lines.
- `npm run test:e2e` passed 24/24 tests across Chromium and WebKit at 1280x720,
  including legacy V4 checkpoint parity, the frozen 230-row ledger, the 50-row
  Joker ledger, real J044 shop acquisition, J050 Buffoon-pack acquisition, table
  current values, reload, win/loss, fault injection, export/import, and visual
  baselines.
- A final focused rerun of `joker-catalog-audit.spec.ts` and
  `joker-gameplay.spec.ts` passed 8/8 after the presentation selector was made
  operation-driven.
- The five 10-card ensemble screenshots and representative J044 shop/table
  screenshots were visually inspected in both engines. All 50 raster assets
  decoded at 768x1024, all focal keys were unique, and browser request capture
  reported zero remote content requests.
- `npm run content:audit` passed 2 files / 7 tests. The broader catalog suite in
  `npm run check` proves 36 Common / 14 Uncommon, 230 + 50 = 280 aggregate rows,
  50 locally resolved Joker IDs, and 100 unresolved future IDs.
- `git diff --check` passed. The active Vite development server remained directly
  usable at `http://127.0.0.1:4173/`; no deployment or external service was added.
- `python3 ./.trellis/scripts/task.py validate 07-17-joker-catalog-001-050`
  passed all 7 implementation-context and 7 check-context entries.

## High-risk files and review focus

- `src/content/schema/catalog.ts` and validator: preserve the exact 230-row ledger
  while adding a discriminated Joker family and resolved dependency math.
- `src/game-core/model/runV2.ts`, V3, and new V4 model: keep migrated fixture runs
  executable and state keys strict.
- `src/game-core/effects/registry.ts`, score resolver, and run-window applicator:
  no ID branches, double after-hand resolution, cycle bypass, or partial mutation.
- `src/game-core/commands/executeCommandV2.ts`: accept one V4 proposal and advance
  checkpoint once.
- shop/pack selection: rarity renormalization, forced empty pools, sticker
  eligibility, and materialized offer stability.
- persistence schemas/repository/profile transfer: forward-only migration,
  recovery preimage, checksum, and failure atomicity.
- asset/provenance directories: never overwrite reviewed masters or sidecars with
  a bulk generation/optimization command.

## Final planning review checklist

- [ ] No unresolved product or interaction question remains in `prd.md` or the
      frozen matrix.
- [ ] The matrix contains exactly 50 mechanics, names, explicit descriptions,
      flavor lines, behavior mappings, and unique art briefs.
- [ ] V4 migration, external dependencies, discovery ownership, copy facets,
      sticker exclusions, safety differences, and asset review are explicit.
- [ ] Every implementation slice has a focused gate and rollback point.
- [ ] User approves implementation after reviewing all planning artifacts.

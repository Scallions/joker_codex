# Current Integration Baseline

## Scope

Planning-time repository audit for the final child
`07-17-integration-quality-gate`. This file records confirmed facts and concrete
gaps; it is not final pass evidence. Current results will be written to
`evidence.md` during execution.

## Confirmed Repository State

- Clean `main` at `9a26ed5` on 2026-07-20.
- Eight sibling implementation tasks are archived; the parent task reports 8/9
  children complete and this child is the sole remaining product child.
- Source layers: `app`, `content`, `game-core`, `persistence`, `presentation`,
  `progression`, `tutorial`, and `test-support`.
- `package.json` exposes format, lint, strict typecheck, Vitest, coverage,
  content-audit, production-build, and Playwright commands.
- Test inventory at planning time: 126 Vitest files and 10 Playwright spec files.
  The preceding task's current-HEAD gate recorded 581 Vitest tests and 48
  Chromium/WebKit project cases.
- `playwright.config.ts` runs Chromium and WebKit with two workers, zero retries,
  a 1280x720 default viewport, retained traces on failure, and the local Vite
  origin `http://127.0.0.1:4173`.
- `.trellis/spec/frontend/gameplay-contracts.md` is the active executable contract
  for engine, catalog, persistence, progression, presentation, audio, and browser
  boundaries.

## Existing Strong Evidence

- `tests/content/catalog-audit.test.ts` proves 230 non-Jokers, 150 Jokers, 380
  total rows, exact family counts, 910 localization entries, 380 asset/contract
  records, local paths, and zero unresolved strict-mode Joker dependency.
- Joker batch and runtime tests cover all 150 contiguous definitions, rarity,
  assets, runtime operations, positive/boundary/debuffed behavior, and high-risk
  copy/chance/destruction/lifecycle cases.
- `tests/game-core/campaign-lifecycle.test.ts` proves deterministic complete
  eight-ante win, loss, skip routes, and endless continuation in the pure engine.
- Persistence tests cover recovery checkpoints, profile/run pair validation,
  V1-V7 migration paths, profile transfer, UTF-8 size, checksum, Infinity, and key
  atomic repository operations.
- Current E2E specs cover deterministic action boundaries, campaign win/loss,
  endless entry, one injected command-write failure, profile isolation/export,
  challenge entry/abandon, tutorial completion, progression ledgers, audio,
  presentation, asset audits, performance, and both target viewports.
- The presentation child recorded 150 Joker images, 230 emblems, 15 scenes, three
  music stems, 22 SFX, four stingers, build/resource budgets, Chromium/WebKit
  visual/performance evidence, and real Edge smoke.

## Concrete Gaps Found During Planning

1. `README.md:31`, `README.md:45`, and `README.md:52` still describe 50 Jokers,
   V4 `joker-catalog-1`, and 280 total production rows.
2. No single current release audit combines every parent catalog count, 52 cards,
   12 hands, 31 achievements, test ownership, modes, assets, and parent AC links.
3. Existing E2E flows are individually strong, but there is no reusable canonical
   V2 transcript that compares the complete paired V7 profile/run state across
   repeated pure execution, reload/transfer, Chromium, and WebKit.
4. Browser mode coverage starts a challenge and exercises challenge progression in
   lower layers, but does not currently provide complete real-UI challenge success
   and challenge loss plus seeded-play release flows in both engines.
5. `tests/app/commitRunCommand.test.ts` and settings tests prove key failure
   rollback, while `tests/persistence/indexedDbRepository.test.ts` proves several
   atomic methods. There is no systematic named internal-write-stage fault matrix
   across every repository write surface and owning app thunk.
6. Early archived PRDs for foundation, non-Joker catalogs, and Joker 001-050 retain
   unchecked acceptance boxes despite completed task status and later regression
   evidence. These are historical-documentation gaps, not proof of a current
   runtime failure. Current integration evidence must reconcile them without
   rewriting archive history.
7. The real-browser environment at the preceding gate had Edge
   `150.0.4078.83`, absent Google Chrome, and Safari 26.4 with remote automation
   disabled. The user explicitly accepted real Edge plus full Playwright
   Chromium/WebKit as the local exception; the final gate must re-detect rather
   than assume the environment is unchanged.

## Decisions Resolved from Existing Requirements

- No arbitrary new global line-coverage percentage is introduced. Release closure
  is measured by the required full coverage command plus exact registry/contract/
  interaction ownership; content cannot be considered covered by percentage alone.
- Full Cartesian pairing of all 380 rows is neither bounded nor semantically
  meaningful. The integration matrix is derived from capabilities/dependencies,
  then supplemented by named order-sensitive interactions.
- Test fixtures may reach late-game states, but asserted browser transitions must
  use the actual UI, Redux, repository, and persisted checkpoint path.
- Archived task files remain immutable history. `evidence.md` and the live parent
  task become the current acceptance record.
- The unrelated `00-bootstrap-guidelines` task is preserved and does not block the
  product parent's child-completion count.

# UI Audit Repair and Artifact Retirement Implementation Plan

## 1. Execution contract

- Do not start product-code implementation until the user reviews `prd.md`,
  `design.md`, and this plan and explicitly approves implementation.
- At implementation start, run the project `trellis-before-dev` skill, start this
  task through Trellis, and re-read the selected frontend/gameplay/release specs.
- Work inline in the current workspace. Do not dispatch implementation or check
  agents, install dependencies, create a child task tree, or change branches unless
  the user requests it.
- Use test-driven development for every behavior slice. New assertions must first
  fail for the intended reason; keep unrelated tests green between slices.
- Use `apply_patch` for authored edits and preserve unrelated user changes. Do not
  regenerate catalog art or presentation audio; this task should leave both output
  sets byte-stable.
- Do not commit browser screenshots or create a replacement audit-evidence folder.
  Playwright traces/screenshots remain ephemeral test output.
- The archived audit directory is a destructive, explicitly approved target, but
  it may be removed only in Slice 7 after all prior gates are green.

## 2. Slice 0 — Freeze the baseline and add red contracts

### 2.1 Baseline

1. Record `git status --short`, current commit, active task metadata, Node/npm
   versions, and preview state.
2. Run focused existing tutorial, shop, result, progression, table, geometry, and
   performance tests to distinguish baseline failures from the new work.
3. Record current initial gzip size with `npm run build && npm run build:audit`.
4. Confirm the exact audit deletion target and list its files without modifying it.

### 2.2 Failing tests

Add focused red assertions for:

1. incompatible tutorial pack rejection and restored impossible-choice recovery;
2. reward-phase tutorial copy and tutorial-specific result content;
3. one nested hand-action ownership rail;
4. production catalog artwork on non-Joker shop/choice cards;
5. bounded one/two-offer and centered one-through-five-choice layouts;
6. content-height route modifiers and large-stage geometry;
7. absent achievement IDs and in-button clipboard success/failure feedback.

Gate: every new test fails on the intended old behavior, while the pre-existing
focused suite still passes.

## 3. Slice 1 — Repair the complete tutorial path

### 3.1 Shared compatibility and gate

1. Add the pure tutorial pack-offer/choice compatibility helpers over the frozen
   `RunStateV7` snapshot.
2. Make step-7 `buy-pack` acceptance require a consumable-capable definition.
3. Make `skip-pack` acceptable only when an already-open choice has no remaining
   consumable option.
4. Advance that recovery-only `pack-skipped` event to step 8 without touching
   ordinary progression facts, RNG, or script version.
5. Add the shared phase-aware instruction selector and use it in both compact coach
   copy and gate rejection copy.

### 3.2 Shop and choice affordances

1. Add `教程可用` seals to compatible step-7 packs.
2. Disable incompatible purchase controls and render the exact nearby reason
   `本步不可用：不会产出消耗牌`.
3. In a valid tutorial pack choice, keep the lesson-required consumable path and
   prevent `放弃余项` from bypassing it.
4. In an impossible restored choice, disable irrelevant option actions and expose
   `返回夜市并跳过本步` in the stable footer.
5. Preserve ordinary-run pack purchase, choice, and abandon behavior.

### 3.3 Tutorial result

1. Add the dedicated `8/8` tutorial branch and four learning groups.
2. Reuse the final-hand values as a compact recap.
3. Hide normal metrics/setup identity/permanent-progress heading only for tutorial.
4. Preserve all other result branches and return/checkpoint behavior.

Gate:

```sh
npx vitest run tests/tutorial/tutorial-flow.test.ts
npx vitest run tests/presentation/tutorial-coach.test.tsx tests/presentation/shop-screen.test.tsx tests/presentation/result-screen.test.tsx
npx playwright test tests/e2e/tutorial.spec.ts
```

The browser test must cover both the normal fixed tutorial and a valid imported
restored incompatible-choice fixture.

## 4. Slice 2 — Unify table action ownership

1. Move sort, prediction/selection, deck count, play, and discard into one nested
   horizontal rail directly below the card fan.
2. Add `table-hand-cards` while retaining `table-hand` and `table-actions` hooks.
3. Convert play/discard plaques to compact horizontal forms without changing
   labels, command payloads, disabled predicates, or click ownership.
4. Rebalance hand width/height now that the detached right rail is gone; keep fan
   transforms inside the stage and separated from the ledger/center.
5. Update component and E2E geometry assertions from sibling separation to
   fan-above-rail containment.
6. Exercise manual sort and accepted play/discard, then prove the existing
   post-command automatic ordering still holds.

Gate:

```sh
npx vitest run tests/presentation/game-table.test.tsx tests/game-core/hand-order-normalization.test.ts
npx playwright test tests/e2e/layout-occlusion.spec.ts tests/e2e/presentation-performance.spec.ts
```

## 5. Slice 3 — Enlarge catalog art and adapt card counts

### 5.1 Shared artwork selector

1. Add one presentation-only catalog artwork selector backed by precomputed row and
   asset maps.
2. Cover production item IDs and booster pack IDs; return `null` for unknown or
   embedded fixture IDs.
3. Reuse `CatalogEmblem` for SVG loading/fallback and the current Joker inspector
   for WebP art.

### 5.2 Shop cards

1. Replace non-Joker/pack typographic circles with dedicated catalog-art frames
   when an asset exists; retain the seal fallback otherwise.
2. Add family/type and tutorial compatibility scan lines without changing names,
   effects, prices, or purchase commands.
3. Replace fixed stretching rows with bounded, centered count-adaptive tracks.
4. Verify one, two, three, and four offer fixtures at both baselines, including long
   Chinese copy and disabled actions.

### 5.3 Pack choices

1. Add the bounded pack-choice screen variant and stable option/action layout
   hooks.
2. Use centered wrapping cards with a maximum width for counts one through five.
3. Render consumable SVGs and retain Joker inspection.
4. Keep the footer visible, including the ordinary abandon and tutorial recovery
   variants.

Gate:

```sh
npx vitest run tests/presentation/catalog-emblem.test.tsx tests/presentation/shop-screen.test.tsx tests/presentation/joker-choice.test.tsx
npx playwright test tests/e2e/tutorial.spec.ts tests/e2e/layout-occlusion.spec.ts
```

Browser assertions must include local asset success, artwork minimum dimensions,
direct action hit targets, centered bounds, no outer scroll, and no remote request.

## 6. Slice 4 — Apply page-level large-stage composition

1. Add `contentHeightScreen` to the progression CSS module with stage-safe
   max-height and explicit inner-scroll ownership.
2. Apply it to menu, all mode setups, maintenance, and empty notices only.
3. Keep non-empty notices and dense collection/achievement/statistics/help screens
   on the full-height class.
4. Add `blindSelectScreen` to the decision CSS module and apply it only to blind
   selection.
5. At 1920, assert the panel ends near its content and leaves the existing scene
   visible. At 1280, assert all controls remain contained and any necessary scroll
   belongs to the named inner region.
6. Inspect both browsers for clipped Chinese text, accidental filler, and material
   or shadow regressions.

Gate:

```sh
npx vitest run tests/presentation/progression-screens.test.tsx tests/presentation/mode-and-profile-tools.test.tsx
npx playwright test tests/e2e/progression.spec.ts tests/e2e/layout-occlusion.spec.ts
```

## 7. Slice 5 — Finish low-risk feedback polish

1. Remove the achievement ID element and its unused style.
2. Invert its component assertion: 31 rows/icons remain, but no
   `bxqp:achievement:*` text is player-visible.
3. Track clipboard completion against the current canonical code.
4. Show `已复制 ✓` on the triggering button only after a successful write, retain
   `分享码已复制` as redundant status, reset on code change, and show a truthful
   failure message on rejection.
5. Keep the canonical code, seed parsing, setup validation, and start-run behavior
   unchanged.

Gate:

```sh
npx vitest run tests/presentation/progression-screens.test.tsx tests/presentation/mode-and-profile-tools.test.tsx
npx playwright test tests/e2e/progression.spec.ts
```

## 8. Slice 6 — Integrated acceptance before cleanup

### 8.1 Focused matrix

Run and review, in Chromium and WebKit:

1. normal eight-step tutorial and restored incompatible-choice recovery;
2. ordinary table select/sort/play/discard with automatic order;
3. reward, shop item/pack tabs, pack options, target choice, and tutorial result;
4. one/two/four shop offers and one-through-five pack choices;
5. main menu, all setup modes, blind select, maintenance, empty/non-empty notices,
   achievements, and help;
6. share-code copy success and failure;
7. 1280x720 and 1920x1080 containment, non-overlap, direct hit targets, inner
   scroll ownership, and exposed large-stage background.

Inspect every intentionally changed browser image at full resolution. Do not
approve clipped copy, ambiguous disabled states, tiny artwork, unstable footer
actions, or browser-specific geometry.

### 8.2 Full pre-cleanup quality gate

```sh
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run content:audit
node scripts/generate-catalog-emblems.mjs --check
node scripts/generate-presentation-audio.mjs --check
npm run build
npm run build:audit
npm run test:e2e
python3 ./.trellis/scripts/task.py validate 07-21-fix-ui-audit-findings
git diff --check
```

Also run the presentation performance probe and retain frame-gap P95 `<=50ms`,
zero Chromium Long Tasks above 50ms, and zero timer drift above 50ms. Confirm no
asset manifest, generated asset, dependency lockfile, gameplay schema, or
persistence schema changed.

Gate: every PRD acceptance item except the audit-directory deletion is checked and
the diff contains no unrelated file. If any gate fails, keep the audit directory
and return to the owning slice.

## 9. Slice 7 — Retire the superseded audit and verify the final tree

1. Re-resolve and list the exact target
   `.trellis/tasks/archive/2026-07/07-21-ui-experience-playtest-audit/`.
2. Confirm Slice 6 evidence is green immediately before deletion.
3. Delete that directory only: task metadata, PRD/design/plan, report, screenshots,
   annotations, and wireframes.
4. Prove the exact directory no longer exists.
5. Search the current tree for stale links to its report/evidence files. Retain only
   this replacement task's stable finding/resolution metadata and normal Git
   history.
6. Confirm the developer journal, unrelated archive entries, active
   `00-bootstrap-guidelines`, source, tests, and generated assets still exist.
7. Run the final-tree gates again:

```sh
npm run check
npm run test:coverage
npm run content:audit
node scripts/generate-catalog-emblems.mjs --check
node scripts/generate-presentation-audio.mjs --check
npm run test:e2e
python3 ./.trellis/scripts/task.py validate 07-21-fix-ui-audit-findings
git status --short
git diff --check
```

8. Run the inline `trellis-check` workflow, fix every actionable finding, and
   repeat affected gates.
9. Present the final diff, resolved-finding summary, browser matrix, performance/
   bundle evidence, and deletion proof to the user before any commit.

## 10. Rollback and failure policy

- Before Slice 7, rollback is ordinary source/test rework; the old audit remains
  intact.
- If deletion verification fails, stop and restore only the explicitly targeted
  audit paths from the current branch history before continuing. Never reset or
  rewrite unrelated work.
- A failure in Chromium, WebKit, build budget, performance, local assets, or full
  quality gates blocks cleanup and completion.
- Near-passing geometry, a visually hidden incompatible button, or a recovery path
  proven only by direct state mutation is not acceptance. The final interactions
  must be exercised through rendered controls.

## 11. Pre-start checklist

- [x] UX-001 through UX-009 mapped to owners; UX-010 explicitly deferred.
- [x] Tutorial purchase guard and legacy recovery semantics defined.
- [x] Result, action rail, artwork, adaptive layout, and large-stage composition
      approved by the user.
- [x] Gameplay, persistence, asset, browser, and deletion boundaries captured.
- [x] Single-task execution and final-only audit deletion selected.
- [x] PRD, technical design, and implementation plan completed.
- [x] User has reviewed all three artifacts and explicitly approved implementation.

## 12. Implementation evidence

- Tutorial purchase guidance, incompatible-choice recovery, reward wording, and
  the dedicated `8/8` completion summary are covered by component, unit, and
  rendered-control end-to-end tests.
- The table action rail, adaptive shop/pack layouts, enlarged production artwork,
  content-height large-stage surfaces, achievement labels, and copy feedback are
  covered at 1280x720 and 1920x1080 in Chromium and WebKit.
- `npm run check` passes with 138 test files and 671 tests; the production bundle
  audit reports 294896 gzip bytes against a 358400-byte budget.
- Coverage passes at 82.05% statements, 75.47% branches, 88.68% functions, and
  85.22% lines. Content audit passes 7 tests; all 230 catalog emblems and 29 fixed-
  seed presentation audio files verify unchanged.
- The full Playwright matrix passes 86 tests. Motion probes report P95 frame times
  of 27ms in Chromium and 47ms in WebKit, no timer drift above 50ms, and no
  Chromium Long Task above 50ms.
- The superseded audit archive remained intact through every pre-cleanup gate.
  Its exact 56-file directory was then removed; unrelated archives, the active
  bootstrap task, developer journals, source, tests, and generated assets remain.
- Final `trellis-check` synchronized the fixed-stage gameplay contract with the
  nested `table-hand-cards` / `table-actions` ownership model, so future geometry
  checks do not revive the retired detached-action layout.

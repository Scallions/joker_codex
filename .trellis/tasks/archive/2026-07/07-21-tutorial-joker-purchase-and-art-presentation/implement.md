# Tutorial Joker Purchase and Artwork Presentation Implementation Plan

## 1. Execution contract

- Do not edit product code until the user reviews `prd.md`, `design.md`, and this
  plan and explicitly approves implementation.
- After approval, start the Trellis task, load `trellis-before-dev`, and re-read the
  task artifacts plus the selected frontend gameplay/release contracts before the
  first product edit.
- Work inline in the current workspace. Preserve unrelated user files, the
  `00-bootstrap-guidelines` task, and the already-running local preview.
- Use `apply_patch` for authored edits. Do not regenerate approved Joker assets,
  add dependencies, change schemas, or modify gameplay rules for this UI defect.
- Follow red-green-refactor within each slice. A new test must fail for the intended
  pre-change reason before its implementation is added.
- Geometry and direct hit-target assertions must pass before accepting snapshots.

## 2. Slice 0 — Freeze baseline and add the defect contracts

### 2.1 Record implementation baseline

1. Capture `git status --short`, current task metadata, Node/npm versions, and the
   currently affected tracked files. Preserve unrelated dirty files if any.
2. Re-run the focused tutorial E2E and retain the known false-green result as the
   baseline: the role click succeeds despite the real pointer target being covered.
3. Record the current build gzip size and local/remote asset audit status for later
   comparison.

### 2.2 Add failing shop tests

1. Extend the existing shop component fixture so it can represent four card offers,
   four pack offers, an active tutorial profile at step 6, and repository failures.
2. Add red assertions for:
   - two named offer-group controls with exact counts;
   - only one group mounted at a time;
   - ordinary and tutorial step-6 item defaults;
   - a persisted step-7 transition selecting packs;
   - a rejected persistence write retaining items and exact prior state;
   - group-specific empty states and zero checkpoint writes from manual switching.
3. Add a browser helper that verifies the center point of a visible action resolves
   through `elementFromPoint` to that same action or one of its descendants.
4. Add the red tutorial-shop geometry assertion at 1280x720 before changing CSS.
   It must fail because pack content currently owns the Joker button coordinates.

Gate: all pre-existing tests remain green; every new test fails for the documented
missing tabs or covered hit target, not for fixture/setup noise.

## 3. Slice 1 — Repair shop grouping and committed tutorial transition

### 3.1 Implement transient offer groups

1. Add the `items | packs` local discriminant to `ShopScreen` without changing the
   run/shop model.
2. Read the active profile and V7 tutorial identity. Initialize from the committed
   step (`step 7 -> packs`, otherwise `items`).
3. Tag the transient selection with its owning committed tutorial step. When the
   committed step changes, derive the step-6/step-7 default without a synchronous
   state-setting effect. Do not observe a click promise, inventory length, `busy`,
   or an optimistic event.
4. Render visible `单品 <count>` and `补充包 <count>` controls and mount only the
   active array. Keep the reroll action in the items group.
5. Keep vouchers outside both groups in a bounded visible footer rail and preserve
   the owned-inventory internal scroll.

### 3.2 Repair card geometry and control ownership

1. Split Joker, consumable/playing-card, and pack styling so pack articles cannot
   reuse a Joker artwork layout accidentally.
2. Recompose item cards into a 2x2 grid with larger Joker thumbnails and dedicated
   purchase-button classes.
3. Replace broad descendant button selectors before adding artwork triggers.
4. Add `shop-offer-tabs`, `shop-offer-grid`, `shop-vouchers`, and `shop-inventory`
   geometry hooks.
5. Verify all live counts, sold-out transitions, vouchers, inventory actions, and
   rerolls at both supported stage sizes.

### 3.3 Prove commit ordering

1. Drive the real `submitRunCommand` thunk with a tutorial step-6 shop.
2. On success, require one checkpoint write, step 7, one Joker acquisition, and the
   packs group only after the fulfilled store update.
3. On repository failure, require no revealed proposal, unchanged checkpoint/RNG/
   profile, visible step 6, and the items group.
4. Retain existing insufficient-money, full-inventory, sold-out, and busy/repeated-
   click behavior.

Focused gate:

```sh
npx vitest run tests/presentation/shop-screen.test.tsx tests/tutorial/tutorial-flow.test.ts
npx playwright test tests/e2e/tutorial.spec.ts --grep "八步教程"
```

The browser purchase assertion must now succeed without Playwright-induced hidden
scrolling.

## 4. Slice 2 — Build the single read-only inspector

### 4.1 Add red component contracts

1. Create focused tests for one closed host, open content, exact local path, 3:4
   art, all display fields, and explicit/scrim/Escape close paths.
2. Capture the store and repository after application initialization; prove an
   open/close cycle emits no dispatch and no persistence call and leaves a deep
   snapshot of run/profile/settings unchanged.
3. Add red checks for provider route reset and at most one open presentation.

### 4.2 Implement the context and host

1. Create `JokerArtworkInspectorProvider`, its private host/frame, and
   `JokerArtworkTrigger` in the shared presentation component layer.
2. Store only `JokerPresentation | null`; accept no command or repository props.
3. Mount one provider inside `StageShell` from `GameApplication`, keyed by route or
   playing phase so unmount clears stale transient state.
4. Add the named inspector layer token between notice/navigation and drawer.
5. Implement a stage-contained scrim, two-column frame, contained 3:4 artwork,
   solid detail panel, and explicit close action.
6. Add scoped Escape handling and outside-frame close behavior with cleanup.
7. Add bounded transform/opacity entrance and exit using existing presentation
   duration variables. Do not add timers, particles, audio, or remote media.

Focused gate:

```sh
npx vitest run tests/presentation/joker-artwork-inspector.test.tsx tests/presentation/stage-scene.test.tsx
npm run typecheck
npm run lint
```

## 5. Slice 3 — Connect every approved Joker surface

### 5.1 Shop offer and owned inventory

1. Replace resolvable Joker `<img>` nodes with the shared trigger while preserving
   `data-testid`, focal metadata, offer rarity/ensemble metadata, and fallback icons.
2. Enlarge route thumbnails within the repaired grid and inventory rail.
3. Keep purchase, reorder, and sell controls as independent buttons; art activation
   may not bubble into them or inherit their CSS.
4. Verify owned projections show committed dynamic values in the inspector.

### 5.2 Table Joker slots

1. Use the shared trigger only when the existing `showArtwork` contract is true.
2. Keep concealed Jokers as silhouettes with no selector payload in context.
3. Keep debuffed visible Jokers inspectable and preserve `压制` on the placard.
4. Recheck the existing table non-overlap matrix after thumbnail geometry changes.

### 5.3 Joker pack choices

1. Activate only Joker-option artwork through the shared trigger.
2. Preserve `选此件`, consumed-state disabling, generated-card tags, and pack
   choice checkpoint behavior.
3. Keep the existing larger pack artwork footprint unless measurement finds a safe
   increase at both baselines.

### 5.4 Player collection

1. Continue using `selectCollectionRows` for discovery/visibility truth.
2. For a discovered Joker row with approved art, obtain the base
   `JokerPresentation` and mount a lazy shared trigger.
3. For undiscovered rows, never call/pass the Joker presentation and keep the
   existing silhouette/name masking.
4. Preserve filters, victory marks, lock copy, internal ledger scroll, and non-
   Joker `CatalogEmblem` behavior.
5. Add a selector regression iterating all 150 production Joker IDs and an image-
   count test proving the inspector does not mount 150 full-size copies.

Focused gate:

```sh
npx vitest run \
  tests/presentation/joker-artwork-inspector.test.tsx \
  tests/presentation/shop-screen.test.tsx \
  tests/presentation/game-table.test.tsx \
  tests/presentation/joker-choice.test.tsx \
  tests/presentation/progression-screens.test.tsx \
  tests/presentation/joker-presentation.test.ts
```

## 6. Slice 4 — Browser acceptance, visuals, and failure matrix

### 6.1 Tutorial browser acceptance

At `1280x720` and `1920x1080`, in Chromium and WebKit:

1. enter a fresh tutorial and reach step 6 through the real flow;
2. assert exact tab counts and that only item actions are mounted;
3. assert the intended Joker purchase target is visible, inside the stage,
   unobscured through `elementFromPoint`, and requires no outer/hidden scroll;
4. purchase once, await the persisted checkpoint/profile update, and assert exactly
   one transition to step 7 plus the packs group;
5. refresh and assert the committed step-7 shop restores the packs group;
6. buy and consume the required pack item and finish the existing tutorial.

### 6.1.1 Follow-up pack target repair

1. Reproduce the reported step through the complete real tutorial at 1280x720 and
   distinguish pack purchase, pack-option selection, and target confirmation.
2. Add a red center-point assertion for the enabled `确认施行` action after the
   minimum target selection; retain direct-hit checks for pack purchase and
   `选此件` at both supported viewports.
3. Recompose only the target-choice presentation as a bounded flex column. Use a
   13-column playing-card grid at desktop baselines, keep that grid as the sole
   overflow owner, and keep the footer action row continuously visible.
4. Run the complete eight-step test without retry in Chromium and WebKit, then run
   the full release gates before checking the added PRD acceptance criterion.

### 6.2 Inspector browser acceptance

1. Open representative common/uncommon/rare/legendary, owned, debuffed, pack, and
   collection artwork across the five approved surfaces.
2. For every open frame, assert stage containment, no outer scroll, exact content,
   direct close hit target, and image minimums:
   - at least 300x400 at 1280x720;
   - at least 384x512 at 1920x1080.
3. Assert concealed and undiscovered fixtures expose no art trigger or dialog data.
4. Compare IndexedDB/store checkpoints, profile, and RNG before/after inspector
   cycles.
5. Assert no console error, page error, remote request, or local asset 404.

### 6.3 Visual review

1. Update only snapshots intentionally affected by shop cards, table placards,
   pack artwork activation, collection rows, or the new inspector.
2. Inspect every changed Chromium and WebKit image at full resolution.
3. Reject snapshots with clipped Chinese copy, hidden counts/actions, cropped
   inspector art, ambiguous click regions, or unintended layer overlap.

Focused browser gate:

```sh
npx playwright test tests/e2e/tutorial.spec.ts tests/e2e/layout-occlusion.spec.ts
npx playwright test tests/e2e/joker-artwork-inspector.spec.ts
```

Use the actual final spec path if inspector coverage is added to the nearest
existing presentation spec instead of a new file.

## 7. Slice 5 — Full release and Trellis closure

1. Run the complete release gate in order.
2. Confirm generated catalog emblems and presentation audio remain byte-stable.
3. Confirm no asset manifest, run/profile schema, tutorial script version, or
   dependency changed.
4. Record gzip size and require `<=358400` bytes.
5. Run the presentation performance probe used by the prior layout/motion task;
   retain frame-gap P95 `<=50ms`, zero Chromium Long Tasks above `50ms`, and zero
   timer drift above `50ms`.
6. Run the inline `trellis-check` workflow over the entire task, fix every
   actionable issue, and validate the task artifacts.
7. Review `git diff` for unrelated files and `git diff --check` before requesting
   commit approval.

## 8. Final verification commands

Run from `/Users/pallaz/workspaces/tmps/joker_codex`:

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
python3 ./.trellis/scripts/task.py validate 07-21-tutorial-joker-purchase-and-art-presentation
git diff --check
```

Final evidence must include both browser projects without retry, both supported
viewports, direct hit-target proof for the tutorial purchase, exact post-commit
step/tab behavior, all five inspector surfaces, concealment/non-mutation checks,
image-size measurements, no remote/missing assets, bundle budget, and intentional
snapshot review.

## 9. Risk controls

| Risk | Required proof before proceeding |
|---|---|
| False-green tutorial click remains | center-point hit target resolves to the real purchase button |
| Tab changes optimistically | forced persistence failure stays on step 6/items with exact state |
| Inspector mutates play | zero dispatch/write and deep-equal store/repository state |
| Action buttons conflict with art trigger | dedicated classes plus independent click tests |
| Hidden content leaks | no trigger/presentation DOM for concealed or undiscovered fixtures |
| Collection loads all large art | one host and bounded mounted inspector image count |
| CSS breaks prior layout | full two-viewport geometry matrix before snapshots |
| New presentation exceeds budget | full build and performance audits remain within existing limits |

## 10. Pre-start checklist

- [x] Tutorial defect reproduced through real browser hit-testing.
- [x] False-green E2E mechanism identified.
- [x] Shop grouping, tutorial defaults, inspector interaction, five surfaces, and
      viewport scope confirmed by the user.
- [x] Persistence, RNG, concealment, local-asset, loading, and action-ownership
      boundaries captured.
- [x] PRD, technical design, and implementation plan completed.
- [x] User has reviewed all three artifacts and explicitly approved implementation.

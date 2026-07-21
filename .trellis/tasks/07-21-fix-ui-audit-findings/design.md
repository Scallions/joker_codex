# UI Audit Repair and Artifact Retirement Technical Design

## 1. Design objective

Resolve UX-001 through UX-009 as one integrated presentation release, prove the
result at both supported desktop baselines in Chromium and WebKit, and then remove
the superseded audit directory from the current tree. UX-010 remains a separate
optional experiment.

This stays one Trellis task rather than a parent with children because the repair
slices share the same tutorial fixture, presentation CSS, geometry helpers, and
final browser matrix. Audit retirement is also atomic: no individual slice may
delete the source evidence before every other slice passes. The implementation
plan still divides the work into independently reviewable, test-first slices.

## 2. Approved decisions

| Area | Decision |
| --- | --- |
| Tutorial pack shelf | Show every offer; mark compatible packs `教程可用`; disable incompatible purchases with `本步不可用：不会产出消耗牌` |
| Restored incompatible choice | Offer a safe return path only when the open choice has no remaining consumable; recovery advances past the impossible lesson state |
| Tutorial result | Show `八步入门 · 8/8 完成`, four learned-action groups, a compact final-hand recap, and `教程说明：不会写入普通进度` |
| Table controls | Put sorting, prediction/selection, draw-pile context, play, and discard in one horizontal rail directly below the hand |
| Action styling | Retain compact cinnabar play and gold discard plaques |
| Shop art | Keep Joker WebP inspection; use existing catalog SVGs for non-Jokers and boosters; create no assets |
| Sparse layouts | Bound card width and center one or two shop offers; center one through five pack choices by count |
| Large stage | Add opt-in content-height page variants and reveal the existing theater background; add no filler content |
| Audit cleanup | Delete only `.trellis/tasks/archive/2026-07/07-21-ui-experience-playtest-audit/`, only after all acceptance gates pass |

## 3. Non-negotiable invariants

1. Gameplay rules, score calculation, shop contents, prices, RNG consumption,
   progression policy, audio, and persistence schemas do not change.
2. Existing `RunCommandV2` shapes and the `propose -> validate -> persist -> reveal`
   checkpoint boundary remain unchanged.
3. The previously implemented accepted-command hand-order normalization remains
   the sole automatic sorting owner. This task changes only where the manual sort
   controls render.
4. Production artwork remains local and owned. No remote URL, generated image,
   dependency, or asset-manifest row is added.
5. The page and fixed 16:9 stage never scroll. Only named, bounded inner regions
   may scroll when content exceeds the 1280x720 stage.
6. Chromium and WebKit at 1280x720 and 1920x1080 are release baselines. Mobile,
   touch, shorter desktops, and accessibility-only changes remain out of scope.
7. Dense collection, achievement, statistics, and help screens retain their
   existing full-height internal-scroll layout. Content-height behavior is opt-in,
   not a global `.screen` rewrite.
8. Audit removal is a final current-tree deletion. Git history, the developer
   journal, unrelated archived tasks, and `00-bootstrap-guidelines` are preserved.

## 4. Architecture and ownership

### 4.1 Tutorial decision flow

```text
Run V7 content snapshot
  -> shared tutorial pack-compatibility selector
  -> ShopScreen affordance + gateTutorialCommand enforcement
  -> existing commitRunCommand transaction
  -> deriveTutorialProgressionFacts
  -> TutorialCoach / ResultScreen presentation
```

Compatibility must have one owner. Add a pure helper in the tutorial layer that
resolves a shop offer through `offer.packId -> run.content.packs` and reports
whether `allowedItemKinds` includes `consumable`. Both `ShopScreen` and
`gateTutorialCommand` consume it; neither re-implements pack-family guesses.

The helper reads only the frozen run snapshot. It does not import the production
catalog, mutate the run, or infer behavior from a display name.

### 4.2 Catalog artwork flow

```text
Materialized item contentId / packId
  -> PRODUCTION_CATALOG row + asset maps
  -> presentation-only catalog-artwork selector
  -> CatalogEmblem or existing JokerArtworkTrigger
  -> local SVG/WebP with existing fallback behavior
```

Create one presentation selector for catalog row/asset lookup instead of copying
maps into `ShopScreen` and `ChoiceScreen`. Current production item `contentId` and
pack `packId` already equal catalog row IDs. Fixture, generated, or older embedded
content that has no production asset receives the existing typographic/fallback
seal; it never becomes an error and does not require a save migration.

Jokers continue through `selectJokerPresentation` and
`JokerArtworkTrigger`, preserving rarity metadata, concealment, and the large-art
inspector. Non-Joker catalog rows use `CatalogEmblem` and its local SVG failure
fallback.

## 5. Tutorial resilience and phase clarity

### 5.1 Purchase-time protection

At tutorial step 7, each pack article derives:

- the frozen `PackDefinition`;
- tutorial compatibility;
- family/size display copy;
- its existing price affordability.

A compatible offer gets a visible `教程可用` seal and retains the normal purchase
button. An incompatible offer remains fully visible, but its purchase control is
disabled and the exact nearby reason is
`本步不可用：不会产出消耗牌`. The tutorial reason takes visual precedence over
the ordinary insufficient-funds state because incompatibility is the decisive
blocker. Outside tutorial step 7, behavior and copy remain unchanged.

The command gate independently rejects a forged or stale incompatible `buy-pack`
command. UI disabling is therefore guidance, not the security/consistency
boundary.

### 5.2 Restored impossible-choice recovery

An old checkpoint may already contain a pack choice that the new purchase guard
would never open. Derive whether the current choice still has an unconsumed
consumable option.

- If it does, the ordinary tutorial contract remains: non-consumable choices and
  `放弃余项` cannot bypass the lesson.
- If it does not, non-consumable option actions show that they cannot complete the
  step and the footer exposes `返回夜市并跳过本步`.
- `gateTutorialCommand` accepts `skip-pack` only for that impossible restored
  state.
- `deriveTutorialProgressionFacts` treats the corresponding `pack-skipped` event
  as a recovery completion and advances to step 8. This exception is tied to the
  pre-command choice content, so a valid consumable pack cannot use it.

This makes the legacy state finishable without changing pack generation, adding an
item, consuming RNG, or altering the normal tutorial path.

### 5.3 Phase-aware guidance

Add a pure tutorial display-copy selector keyed by the current step and run phase.
Step 5 keeps its existing table instruction while the phase is `round`, then uses
`点击“收赏入夜市”，领取戏票奖励。` in `round-reward`. The compact coach and
gate rejection copy use the same selector so they cannot contradict each other.
The durable eight-step script IDs and script version do not change.

### 5.4 Tutorial result variant

`ResultScreen` derives `isTutorial` once and uses a dedicated summary branch:

- header: `入门教程 · 已完成` and `八步入门 · 8/8 完成`;
- four compact learning groups: `识幕`, `理牌`, `结算`, and `夜市`;
- the existing final hand, restyled as a compact learning recap;
- a section headed `教程说明：不会写入普通进度`;
- the existing return-to-menu and saved-checkpoint affordances.

The tutorial branch does not render final score, target, remaining hands, money,
seed/share setup details, or `本局永久进度`. Campaign, seeded, challenge, loss,
and ordinary result branches stay byte-for-byte equivalent in meaning and retain
their current progression summaries.

## 6. Unified hand action rail

Restructure only the lower table presentation:

```text
table-hand
  table-hand-cards   centered animated card fan
  table-actions      horizontal owned control rail
    sort group | prediction + selected count | deck count | play | discard
```

Move the two existing sort dispatchers and the two existing play/discard dispatchers
without changing their command payloads or disabled predicates. Keep stable card
IDs, Motion layout/exit behavior, fan transforms, and presentation sequencing.

`table-hand` becomes the whole hand assembly. Add `table-hand-cards` for geometry
checks and keep `table-actions` on the nested rail. Tests stop requiring the hand
container and its child rail to be separated; instead they prove that the rail is
contained by the hand assembly, sits below the card fan, and remains separated
from the ledger and center stage.

The play and discard buttons retain their gradients, clip-path plaque silhouette,
and labels, but use compact horizontal dimensions. Sort buttons stay visually
secondary. Prediction, selected count, and deck count remain readable without
requiring pointer travel to another screen edge.

## 7. Adaptive shop and pack choices

### 7.1 Shop offer grid

Replace the fixed stretching 2x2 track behavior with count-adaptive tracks:

- one or two cards use a bounded maximum width and are centered;
- three or four cards use the available two-column composition at 1280 and remain
  bounded/centered on 1920;
- cards size to their content within the existing market's bounded inner region;
- overflow, if required by unusually long fixture copy, belongs to the offer grid,
  never the page.

Each non-Joker item and booster gets a dedicated artwork frame using the existing
SVG at a responsive, materially larger size. The target is at least 80x104 CSS
pixels at 1280 and 96x124 at 1920 when the card is present. Artwork remains a
separate focal block; it is not used as a full-card background. Item family/type,
effect text, price, and tutorial status stay in independent scan lines.

### 7.2 Pack-choice composition

Give the pack-choice screen its own bounded flex-column variant, parallel to the
existing target-choice variant:

- header is fixed within the panel;
- options are the sole scroll owner;
- one through five option cards wrap with `justify-content: center` and a maximum
  width, so the last row is centered rather than left-anchored;
- the footer action area remains continuously visible and separated from options;
- Joker choices keep the inspector trigger; consumables use catalog SVGs;
- ordinary `放弃余项` behavior is unchanged outside the tutorial recovery rule.

Stable `data-layout-zone` hooks identify pack options and pack actions for browser
geometry checks without depending on CSS-module class hashes.

## 8. Content-height large-stage variants

Add opt-in modifiers instead of weakening the shared full-height screen contract.

### Progression screens

`contentHeightScreen` uses content height up to the existing stage-safe maximum,
keeps the same width, material, inset border, and shadow, and becomes a bounded
flex column when it owns an inner scroll region. Apply it to:

- returning/main menu;
- campaign, seeded, and challenge setup;
- profile maintenance;
- notices only when the list is empty.

Maintenance may grow to the stage-safe maximum and then scroll only its existing
`.scrollArea`. Non-empty notices and the dense collection/achievement/statistics/
help pages keep the current full-height layout.

### Decision screens

Add a separate `blindSelectScreen` modifier with `height: auto` and the existing
stage-safe maximum. Blind cards remain a three-card composition. Pack and target
choices keep their own bounded full-height variants because their candidate count
can require scrolling.

At 1920x1080 the shorter panels expose the already-loaded theater scene around the
surface. No preview, statistic, ornament, or placeholder is added to fill space.

## 9. Low-risk feedback polish

### Achievement IDs

Remove the player-facing `<code>` containing `achievementId` and its now-unused CSS
rule. The ID remains the React key and progression lookup key. Tests assert that
no `bxqp:achievement:*` text is rendered, while all 31 records, icons, progress,
and timestamps remain.

### Share-code copy

Track which canonical share code completed a clipboard write. After the promise
resolves, the triggering button reads `已复制 ✓` and the existing redundant status
message remains. A changed canonical code resets the local success state. A
clipboard rejection leaves the code selectable and shows a local failure message;
it must not claim success.

## 10. Test design

### 10.1 Pure tutorial tests

Extend `tests/tutorial/tutorial-flow.test.ts` with:

- compatible pack accepted and incompatible pack rejected at step 7;
- compatibility derived from frozen `allowedItemKinds`, not family/name;
- valid consumable choice cannot skip the lesson;
- restored choice with no consumable accepts `skip-pack`, emits the ordinary
  `pack-skipped` event, advances to step 8, and changes no ordinary progression;
- step-5 reward-phase guidance differs from its round guidance;
- full normal eight-step flow still completes and remains progression-neutral.

### 10.2 Component tests

- `ShopScreen`: compatible seal, exact disabled reason, forged-click protection,
  catalog SVG/fallback, and one/two/four-offer class/data states.
- `ChoiceScreen`: centered count variants, stable footer, non-Joker artwork,
  valid-step skip protection, and restored-choice recovery.
- `ResultScreen`: tutorial `8/8` learning recap with forbidden normal metrics
  absent; ordinary/seeded result summaries unchanged.
- `GameTableScreen`: one nested action-ownership zone, unchanged command payloads
  and disabled rules, and automatic post-command order still visible.
- progression screens: achievement IDs absent and copy success/failure located at
  the triggering button.
- catalog presentation selector: production SVG resolution plus safe missing-ID
  fallback.

### 10.3 Browser acceptance

Run every relevant spec under both Playwright projects. Each project exercises
1280x720 and 1920x1080 through explicit viewport loops.

1. Complete the ordinary eight-step tutorial through rendered controls. At step 7,
   verify all packs remain visible, incompatible controls are disabled with the
   exact reason, compatible controls are direct hit targets, and the result has no
   normal zero metrics.
2. Build a valid restored V7 tutorial fixture through public pure constructors and
   command execution, representing an already-open incompatible pack. Import it
   through the supported UI, take the rendered recovery action, and finish the
   tutorial.
3. Assert table fan/rail containment and pairwise non-overlap with ledger, center,
   chrome, and stage edges. Exercise sort, select, play, and discard.
4. Cover one/two/four shop offers and one through five pack choices with centered
   bounds, direct action hit targets, artwork minimums, and no outer scroll.
5. Measure the content-height surfaces at 1920, prove their visible content is
   contained, and prove the theater background remains exposed. Recheck the same
   routes at 1280 for clipping and inner-scroll ownership.
6. Verify achievement copy, share-code button feedback, no console/page errors,
   no local 404, and no remote request.

The existing presentation performance probe remains a release gate because the
table and card grids change layout. Frame-gap P95 stays at or below 50ms, with no
Chromium Long Tasks or timer drift above 50ms.

## 11. Audit retirement protocol

The source directory contains its Trellis metadata, report, PNG screenshots,
annotated SVGs, and wireframes. Treat it as one explicit deletion target:

```text
.trellis/tasks/archive/2026-07/07-21-ui-experience-playtest-audit/
```

Before deletion:

1. every UX-001 through UX-009 acceptance row is green;
2. focused unit/component tests are green;
3. Chromium and WebKit pass at both viewports;
4. the full quality, content, generator, build-budget, and performance gates pass;
5. the final diff contains no unrelated file.

After deletion, verify the exact directory is absent and search the current tree
for stale report/evidence links. References in this replacement task may retain the
stable finding IDs and the retired directory name as historical resolution
metadata; no old report, screenshot, annotation, or wireframe remains. Do not
rewrite Git history or delete developer journals.

No new committed audit screenshot directory replaces the old one. Final browser
artifacts remain ephemeral test output, while this task's PRD/design/plan and test
contracts become the durable record that the findings were resolved.

## 12. Risk controls

| Risk | Control |
| --- | --- |
| UI-only pack disabling is bypassed | Shared frozen-snapshot selector plus command-gate rejection |
| Recovery becomes a normal shortcut | Permit `skip-pack` only when the pre-command choice has no unconsumed consumable |
| Presentation assets disagree with saves | Asset lookup is optional and presentation-only; missing IDs fall back safely |
| Sparse cards still stretch at 1920 | Maximum card width plus browser bounding-box assertions |
| Last pack-choice row remains left-heavy | Wrapping flex composition with centered lines and one-through-five tests |
| Table rail breaks automatic sorting | Do not edit engine normalization; retain existing ordering/performance tests |
| Content-height clips dense pages | Opt-in variants only; max-height plus named inner scroll owners |
| Cleanup happens too early | Deletion is the final implementation slice and depends on every preceding gate |
| New task recreates stale audit clutter | Keep resolution evidence in executable tests and task artifacts, not a new screenshot archive |

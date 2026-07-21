# Fix UI Audit Findings and Retire Audit Artifacts

## Goal

Resolve the confirmed UI and player-experience findings from the archived
2026-07-21 playtest audit, verify the corrected experience in Chromium and
WebKit at the supported 1280x720 and 1920x1080 desktop baselines, and then remove
the superseded audit task, report, screenshots, annotations, and wireframes so
future work does not mistake already-fixed findings for active defects.

## Background

- The approved audit recorded one P0, one P1, seven P2 findings, and one P3
  experiment under
  `.trellis/tasks/archive/2026-07/07-21-ui-experience-playtest-audit/`.
- The product already has a stable midnight-theater, paper, cinnabar, and gold
  visual identity. The requested work should improve hierarchy, control
  ownership, feedback, recovery, and large-screen composition within that
  identity.
- Supported desktop baselines remain 1280x720 and 1920x1080 in Chromium and
  WebKit, with a fixed stage and no outer-page scrolling.
- The user explicitly requested removal of the superseded audit documents and
  evidence after the corresponding fixes are verified.

## Finding Scope Map

| Finding | Repair owner in this task |
| --- | --- |
| UX-001 | Tutorial-compatible pack affordance, command guard, and restored-run recovery |
| UX-002 | Unified hand action rail |
| UX-003 | Tutorial-specific completion recap |
| UX-004 | Count-adaptive shop offer layout |
| UX-005 | Phase-aware reward instruction |
| UX-006 | Content-height large-stage variants |
| UX-007 | Player-facing achievement copy |
| UX-008 | In-place share-code copy feedback |
| UX-009 | Centered pack-choice composition and stable actions |

UX-010 is intentionally deferred as an optional experiment and is not a release
condition for this repair task.

## Requirements

### R1 — Tutorial resilience and phase clarity

- Prevent tutorial step 7 from accepting a pack that cannot produce the required
  consumable without explaining and constraining that choice.
- Keep every offered pack visible. Mark tutorial-compatible packs with a
  `教程可用` seal; disable each incompatible purchase action and show the direct
  reason `本步不可用：不会产出消耗牌` instead of hiding the offer.
- Preserve a recovery path if a legacy or restored run is already inside an
  incompatible pack choice; choosing or abandoning must never leave the tutorial
  permanently stuck.
- Keep the ordinary step-7 requirement intact for valid tutorial states: a
  compatible pack must still yield and use a consumable. Only an already-open
  choice with no usable consumable may take the legacy recovery path.
- Update tutorial guidance when the phase moves from table play to reward.
- Replace contradictory normal-run zero metrics on the tutorial completion screen
  with `八步入门 · 8/8 完成`, four grouped learned-action summaries, the final
  hand as one compact learning recap, and `教程说明：不会写入普通进度`.
- Hide final score, target, remaining hands, money, and the normal
  `本局永久进度` heading from the tutorial result only.

### R2 — Unified hand-action ownership

- Bring hand sorting, current selection/prediction context, play, and discard into
  one horizontal interaction rail directly beneath the hand.
- Retain compact versions of the existing cinnabar play plaque and gold discard
  plaque instead of replacing them with generic toolbar buttons.
- Preserve automatic post-play/post-discard sorting, card fan presentation,
  pointer hit targets, score performance, and the existing gameplay commands.

### R3 — Adaptive shop and choice composition

- Keep sparse shop offers at a readable maximum size instead of stretching one or
  two offers across the full 1920px stage.
- Reuse existing approved artwork rather than generating assets: Joker WebP art
  and inspector behavior remain unchanged; consumables and boosters use their
  existing catalog SVG assets at a materially larger size.
- Make item type, artwork/family cue, effect, price, and tutorial compatibility
  easier to scan without changing shop contents or economics. Do not use product
  art as a full-card background that competes with copy or purchase controls.
- Center pack choices according to candidate count and keep the abandon action in
  a stable, visible choice-action area at both supported viewports.

### R4 — Large-stage composition

- Use content-height panels and page-level size variants to reduce repeated
  unintentional lower-page dead zones on returning menu, mode setup, blind
  selection, maintenance, and empty-notice surfaces at 1920x1080.
- Let the existing theater background re-enter the composition. Preserve
  intentional breathing room and do not add unrelated previews, statistics,
  ornament, or placeholder content merely to fill the stage.

### R5 — Low-risk feedback and polish

- Hide internal achievement identifiers from the player-facing achievement view.
- Show share-code copy success at the triggering button while preserving any
  useful redundant status message.

### R6 — Verification and audit retirement

- Add or update component and end-to-end regression coverage for every changed
  objective behavior and supported viewport contract.
- Re-run the complete eight-step tutorial, including an incompatible-pack
  recovery case, and representative ordinary-run/reference surfaces through real
  rendered controls.
- Do not delete the archived audit task until all in-scope findings pass their
  automated and browser acceptance checks.
- After verification, delete the entire superseded archived audit directory,
  including its report, screenshots, annotated evidence, wireframes, and task
  planning metadata. The new implementation task must describe the findings as
  resolved rather than carrying forward stale audit evidence.
- Preserve normal Git history and the developer session journal. Audit retirement
  is a current-tree deletion, not a history rewrite.

## Acceptance Criteria

- [x] Tutorial step 7 exposes which offered packs can complete the step and does
      not allow a first-time player to enter an unrecoverable incompatible choice.
- [x] A restored incompatible tutorial pack choice can be abandoned safely and
      the tutorial can continue to completion.
- [x] Reward guidance names the actual reward action; the tutorial completion
      screen shows `8/8` completion and no contradictory normal-run zero summary.
- [x] Sorting, selection context, play, and discard have one clear bottom control
      ownership zone with no overlap at 1280x720 or 1920x1080.
- [x] One- and two-offer shop states and one- through five-choice pack states are
      centered, readable, and keep all required actions in the viewport.
- [x] The named 1920x1080 menu, setup, blind-selection, maintenance, and empty-
      notice surfaces use intentional content-height composition while retaining
      the approved theater identity.
- [x] Achievement pages no longer display `bxqp:achievement:*` identifiers.
- [x] Share-code copy success is visible at the copy button immediately after the
      action.
- [x] Chromium and WebKit regression checks pass at both supported viewports with
      no outer scroll or newly introduced occlusion.
- [x] Gameplay rules, scores, shop contents, prices, progression, persistence
      schema, and audio composition are unchanged.
- [x] The full project quality gate passes.
- [x] The archived `07-21-ui-experience-playtest-audit` directory no longer exists
      only after every preceding acceptance criterion is verified.

## Out of Scope

- Gameplay, scoring, balance, difficulty, economy, catalog composition, rewards,
  unlock pacing, persistence migrations, or new content.
- Mobile/touch layouts, viewports below 1280x720, accessibility-only work, and
  non-Chinese localization.
- Replacing the established art direction or creating a high-fidelity redesign.
- The audit's UX-010 interactive miniature-card examples for the hand-reference
  page. This remains a separate P3 experiment rather than a confirmed defect in
  the current repair batch.
- Deleting unrelated historical tasks, specifications, tests, or the active
  `00-bootstrap-guidelines` task.

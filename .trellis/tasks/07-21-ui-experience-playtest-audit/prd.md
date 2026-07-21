# Audit UI and Player Experience Through Playtesting

## Goal

Play the current local build through its real browser UI and produce an
evidence-backed audit of what should improve in visual design and player
experience. The audit must help a later implementation task distinguish urgent
interaction defects, high-value polish, and larger redesign opportunities without
changing or evaluating gameplay rules, balance, content pools, or progression
economy.

## Background

- The user asked for a fresh hands-on playtest after the tutorial shop, fixed-stage
  layout, automatic hand sorting, motion polish, and Joker artwork-inspection work.
- The current release contract treats 1280x720 and 1920x1080 as supported desktop
  baselines and requires a fixed 16:9 stage with no outer page scroll.
- Existing automated coverage is strong at deterministic correctness and geometry,
  but a green hit-target or snapshot test does not answer whether hierarchy,
  discoverability, pacing, copy density, feedback, and visual focus feel good to a
  player.
- The product is local-first and Chinese. Accessibility remediation is not part of
  this review unless a condition also blocks ordinary pointer-based play.

## Requirements

- Use the currently running local build and real browser controls. Do not replace
  the experience with component fixtures or state-only inspection.
- Cover the first-time profile/menu path, the eight-step tutorial, ordinary setup
  and table play, reward/shop/pack/choice flows, Joker inspection, sound settings,
  progression/reference screens, and terminal/result navigation.
- Evaluate visual hierarchy, density, legibility, discoverability, control
  ownership, feedback, motion pacing, spatial consistency, error/recovery clarity,
  and the number of unnecessary actions or context switches.
- Separate objective defects from taste-based opportunities. Every objective
  defect needs reproducible evidence; every subjective recommendation needs a
  stated player benefit and trade-off.
- Rank findings by player impact and recurrence, group them into quick wins versus
  structural improvements, and avoid gameplay/balance recommendations.
- Preserve the workspace and player data during the audit except for disposable
  local profiles/runs created through normal UI play. Do not edit product code in
  this task.
- Use existing test/spec evidence only as context. The report must be based on a
  fresh playthrough and direct visual inspection.

## Acceptance Criteria

- [ ] A reproducible coverage ledger identifies every reviewed surface, viewport,
      route/state, browser, and completion status.
- [ ] The tutorial and at least one ordinary-run path are exercised through real
      UI controls from entry to shop/result or another justified terminal point.
- [ ] Each finding records severity, recurrence, affected surface, evidence,
      player impact, recommended direction, and implementation size/risk.
- [ ] The final report distinguishes blockers, friction, polish opportunities, and
      optional visual experiments, then identifies the five highest-value changes.
- [ ] Findings explicitly exclude gameplay rules, balance, rewards, catalog
      composition, difficulty, and content-design changes.
- [ ] No product source, generated asset, schema, dependency, or persistent test
      fixture is modified by the audit.

## Current Scope Decisions

- Primary language: Chinese.
- Primary interaction: mouse/pointer desktop play.
- Supported baselines already established by the repository: 1280x720 and
  1920x1080, in Chromium and WebKit release coverage.
- Viewports shorter than 720 CSS pixels are excluded, including diagnostic-only
  laptop-height checks. Findings must not treat that deferred responsive scope as
  a defect in this audit.
- Preserve the existing midnight-theater, paper-playbill, cinnabar, and gold art
  direction. Recommend hierarchy, composition, control, feedback, and motion
  changes within that identity; propose structural redesign only when direct
  playtest evidence shows the current structure impedes use.
- Include motion and presentation audio as interaction feedback: assess whether
  they clarify state, confirm actions, and support pacing. Do not judge music or
  sound-effect composition as creative content.
- Evaluate both first-time and returning-player experience. Weight onboarding,
  comprehension, and first-action confidence most heavily, while separately
  recording recurring clicks, waits, and visual travel that accumulate in repeat
  play.
- Attach an annotated screenshot to every high-priority finding. Add a simplified
  before/after wireframe for only the three to five highest-value recommendations;
  do not create high-fidelity replacement designs.
- Audit output first; implementation belongs to one or more later approved tasks.

## Deliverables

- `research/ui-ux-audit.md`: Chinese audit report with executive summary, coverage
  ledger, prioritized findings, quick wins, structural improvements, optional
  experiments, and the recommended top five.
- `research/evidence/`: named screenshots from the actual playthrough, including
  annotated copies for high-priority findings.
- Three to five compact before/after wireframes embedded in or linked from the
  report. They communicate layout and interaction direction rather than final art.
- Each finding uses the same fields: ID, severity (`P0` blocker, `P1` major
  friction, `P2` recurring/local friction, `P3` polish/experiment), audience,
  recurrence, route/state, viewport/browser, evidence, player impact,
  recommendation, trade-off, and estimated implementation size/risk.

## Out of Scope

- Gameplay mechanics, balance, difficulty, scoring, reward values, shop/catalog
  composition, unlock pacing, and content-design recommendations.
- Viewports below 1280x720, mobile/touch layouts, accessibility-only remediation,
  localization beyond Chinese, and creative review of music or sound effects.
- Product-code fixes, asset generation/replacement, schema or dependency changes,
  automated-test changes, or implementation commits.
- A high-fidelity redesign or replacement of the established art direction.

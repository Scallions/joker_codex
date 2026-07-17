# Full Integration and Quality Gate

## Goal

Integrate every catalog and mode, close interaction gaps, validate persistence, performance, and supported browsers.

## Requirements

- Depends on completion of every preceding child.
- Audit every gameplay, localization, art, audio, ownership, and test manifest
  against the frozen parent catalog and acceptance criteria.
- Close arbitrary cross-catalog interactions, deterministic replay, content
  versioning, and all known persistence/migration/import failure paths.
- Run complete campaign, challenge, seeded, endless, tutorial, progression,
  profile, and achievement flows in supported browsers.
- Profile and correct critical load, rendering, animation, collection, scoring,
  and very-large-number performance without undocumented balance changes.
- Produce final parent-criterion evidence and identify any intentional difference.

## Acceptance Criteria

- [ ] Generated audits show exact approved counts and zero missing, duplicate,
      unlocalized, unowned, unillustrated, unhandled, or untested content rows.
- [ ] Full interaction, deterministic replay, persistence fault-injection, save
      migration/import, and profile-isolation suites pass.
- [ ] Complete E2E flows pass in Chromium and WebKit, followed by successful real
      Chrome, Edge, and Safari desktop smoke runs at supported viewports.
- [ ] Required performance budgets and visual/audio review gates pass with no
      runtime network dependency.
- [ ] Every parent acceptance criterion links to current evidence, every child is
      complete, and no critical/warning defect remains unverified or unresolved.

## Out of Scope

- New features, future reference updates, original rebalance, mobile, backend,
  public deployment, and compatibility with another product are not integration
  fixes and require new planning.

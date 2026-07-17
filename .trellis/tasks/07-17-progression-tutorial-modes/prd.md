# Progression Tutorial and Modes

## Goal

Deliver profiles, unlocks, collection, statistics, achievements, tutorial, seeded runs, challenges, stakes, and endless progression.

## Requirements

- Depends on implemented non-奇牌 catalogs and all 150 奇牌.
- Finish the three-profile lifecycle, isolated progression, deck/stake/challenge
  availability, collection discovery, stickers, statistics, and unlock rules.
- Implement the local 百戏成就簿 with original objectives, names, icons, trigger
  progress, unlock timestamps, and save migration.
- Implement first-profile Chinese in-run tutorial, skip, replay, poker-hand table,
  and contextual terminology reference.
- Finish campaign, seeded, challenge, stake, win/loss, and endless selection and
  result flows, including content-version labeling.
- Complete safe profile deletion/reset and individual import/export recovery.

## Acceptance Criteria

- [ ] Three profiles remain isolated across all unlocks, discoveries, statistics,
      achievements, tutorial state, active runs, delete/reset, and import/export.
- [ ] A fresh profile can complete, skip, and replay the guided tutorial without
      leaking scripted state into ordinary runs.
- [ ] All deck/stake/challenge/unlock/discovery/achievement triggers have positive,
      negative, boundary, and migration fixtures.
- [ ] Seeded runs display their seed/content version and reproduce exactly within
      that version after save, reload, and manual entry.
- [ ] Collection, statistics, achievement book, mode selection, result screens,
      full browser flows, and build pass in Simplified Chinese.

## Out of Scope

- Final art/audio replacement and full cross-content quality certification belong
  to later children.

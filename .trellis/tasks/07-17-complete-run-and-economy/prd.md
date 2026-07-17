# Complete Run and Economy

## Goal

Extend the vertical slice to the complete ante, blind, scoring, shop, pack, economy, win, loss, and endless loop.

## Requirements

- Depends on the completed playable foundation slice.
- Implement every run phase and legal transition from setup through blind
  selection, rounds, rewards, shops, ante eight, win/loss, and endless play.
- Complete poker-hand classification and the ordered scoring/effect pipeline.
- Implement effect primitives and handler registry contracts for copy, retrigger,
  debuff, create, transform, destroy, inventory, economy, and deferred effects.
- Implement blind routing/skips, shops, rerolls, packs, inventory slots,
  consumable choices, vouchers, tags, income, interest, sales, and costs using
  deterministic fixture content.
- Persist every committed transition through the parent's transaction protocol.

## Acceptance Criteria

- [ ] Deterministic fixtures can win and lose complete eight-ante runs and elect
      to enter endless mode.
- [ ] Every run substate rejects illegal commands without consuming RNG or
      changing the committed checkpoint.
- [ ] Scoring fixtures cover all poker hands and every defined effect window,
      including order, repetitions, debuffs, destruction, and copied effects.
- [ ] Fixture shops and packs cover purchase, sell, reroll, discounts, slot
      limits, generated items, and empty/blocked pool behavior.
- [ ] Save/reload after every action preserves phase, inventory, economy, score,
      random state, and pending choices exactly.
- [ ] Full focused test suites, E2E campaign fixtures, and production build pass.

## Out of Scope

- Complete production catalogs, final unlock/progression UI, and final art/audio
  belong to later children.

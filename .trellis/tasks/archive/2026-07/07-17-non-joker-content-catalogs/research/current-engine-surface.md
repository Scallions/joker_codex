# Current Engine Surface

## Purpose

Record the repository evidence available before planning the production
non-奇牌 catalogs. This is implementation evidence, not a new product decision.

## Confirmed Foundations

- `RunStateV2` owns a serializable `RunContentSnapshot` containing blinds, tags,
  vouchers, items, and packs.
- Content behavior is represented by durable `EffectReference` values routed
  through 15 explicit effect windows and an executable handler registry.
- The current fixture already proves boss effects, deferred tags, two-tier
  vouchers, consumables, materialized pack choices, weighted shops, and an
  eight-ante campaign/endless transition.
- Playing cards already carry mutually exclusive `enhancementId`, `sealId`, and
  `editionId` fields, but production definitions and contracts for those modifier
  families do not exist.
- `RunModeV2` currently exposes fixture and migration modes only. There is no
  production deck, stake, or challenge definition model yet.
- Current player-facing content uses `fixture:` IDs and in-definition Chinese
  strings. There is no production localization manifest, asset ownership
  manifest, or generated contract-coverage manifest.

## Planning Consequences

- Production content needs a versioned catalog schema and stable project-owned ID
  namespace before row implementation begins.
- Existing fixture behavior should be retained as regression evidence while
  production rows migrate to shared typed primitives.
- The task must extend the model for deck, stake, challenge, modifier, ownership,
  localization, and coverage metadata without placing executable functions in
  durable state.
- Profile unlock state and mode-selection UI belong to the later progression
  child unless the product scope explicitly moves them into this child.

## Evidence Paths

- `src/game-core/model/runV2.ts`
- `src/game-core/effects/registry.ts`
- `src/content/fixtures/runEconomy.ts`
- `.trellis/spec/frontend/gameplay-contracts.md`
- `.trellis/tasks/07-17-chinese-joker-card-web-game/design.md`
- `.trellis/tasks/07-17-chinese-joker-card-web-game/implement.md`
- `.trellis/tasks/07-17-chinese-joker-card-web-game/research/gameplay-scope.md`
- `.trellis/tasks/07-17-chinese-joker-card-web-game/research/visual-direction.md`

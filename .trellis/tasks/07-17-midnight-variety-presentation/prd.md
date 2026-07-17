# Midnight Variety Presentation

## Goal

Deliver the complete original Midnight Variety Show UI, animation, illustration, and audio system across all screens.

## Requirements

- Depends on functional screens and content from the preceding children.
- Apply the approved 午夜百戏 palette, materials, stage composition, typography,
  card frames, illustration system, and circular score-seal identity everywhere.
- Replace baseline placeholders with original, ownership-tracked illustrations,
  textures, icons, card backs, frames, menus, overlays, and result art.
- Implement ordered card/table motion, scoring performance, shop/pack transitions,
  particles, and stable 16:9 scaling at 1280x720 and larger viewports.
- Deliver original local music and SFX with separate controls and event mapping.
- Optimize, preload, and lazy-load assets without introducing runtime network
  dependencies or gameplay coupling.

## Acceptance Criteria

- [ ] Profile, menu, table, shop, pack, collection, achievements, tutorial,
      settings, and result screens share a coherent original 午夜百戏 identity.
- [ ] All critical Chinese text, numbers, slots, controls, and hover explanations
      remain readable and clickable at supported viewports without page scroll.
- [ ] Score sequences visually follow domain event order but skipping or failing
      an animation cannot change the committed result.
- [ ] Original asset/source/license manifests are complete and no excluded brand,
      art, audio, mascot, CRT treatment, or copied text ships.
- [ ] Critical-screen visual snapshots, performance checks, audio controls,
      Chrome/Edge/Safari smoke tests, and production build pass.

## Out of Scope

- Mobile/touch, gamepad, accessibility modes, public deployment, and gameplay
  rebalance remain outside the parent scope.

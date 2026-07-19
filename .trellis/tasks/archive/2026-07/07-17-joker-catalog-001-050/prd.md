# Joker Catalog 001-050

## Goal

Ship the first 50 production 奇牌 as fully playable, deterministic, original
Chinese content in the local desktop-browser game. Each row must be reachable
through real shop/pack/generation paths, survive save and replay boundaries, and
have a reviewed unique illustration and an executable interaction contract.

## Player outcome

- A player can encounter, inspect, buy, arrange, use, and sell the first 50 奇牌
  through the existing campaign without test doubles.
- Effects communicate their exact trigger and current value in Chinese while the
  cards remain visually part of the original 午夜百戏 world.
- The same seed and command sequence produces the same offers, rolls, state
  changes, score trace, and saved checkpoint before and after reload.
- Acquiring a row emits durable discovery evidence for the later progression
  task; this batch also exposes all 50 rows in a local review ledger.

## Requirements

- Build on the existing V3 run/economy engine and extend its shared operations,
  predicates, state, persistence, and presentation contracts where the frozen
  matrix identifies a gap. Do not route behavior by content ID.
- Freeze rows 001-050 against the Balatro v1.0.1o collection order as the
  internal mechanical research index. The shipped catalog must retain project
  IDs `bxqp:joker:001` through `bxqp:joker:050`; reference names, copy, visual
  identities, assets, and code are never shipped or treated as compatibility
  contracts.
- Implement catalog rows 001-050 as one-to-one mechanical mappings with original
  stable IDs, Chinese names/copy, unique illustrations, costs, rarity, unlocks,
  discovery behavior, and typed handlers.
- Treat
  `research/frozen-joker-matrix-001-050.md` as the normative row ledger for all
  names, rules copy, values, rarity, cost, hooks, timing rulings, copy policies,
  sticker exclusions, art briefs, and cross-row fixtures.
- Compile the 50 rows into production `JokerDefinitionV2` snapshots and replace
  external/test-double resolution for IDs 001-050. IDs 051-150 remain declared
  external dependencies owned by later children.
- Preserve the accepted 230-row non-奇牌 ledger as its own audit while exposing a
  280-row production aggregate, a 50-row Joker ledger, and exactly 100 unresolved
  future Joker IDs in child validation mode.
- Use a two-stage deterministic Joker draw: source/rarity policy first, then a
  stable within-rarity draw. Empty or blocked pools consume no RNG.
- Persist typed per-instance ability state and every visible random result through
  Zod validation, invariants, recovery, export/import, and reload.
- Recompute passive owned-Joker capabilities at their use site so acquisition,
  sale, debuff, edition slot contribution, and destruction never leave permanent
  rule patches behind.
- Use shared primitives where exact semantics match and document every new
  handler's hook, priority, copy, retrigger, debuff, and destruction behavior.
- Maintain localization, flavor, asset ownership/provenance, mechanical mapping,
  discovery, and test-coverage manifests from the same row definitions.
- Store every illustration locally. Raster art contains no gameplay text, logos,
  copied frames, or reference-game identity; names, costs, rarity, counters, and
  rules remain DOM/SVG presentation.
- Keep the app directly runnable with the existing local Vite workflow and make
  no runtime network request for content or art.

## Acceptance Criteria

- [ ] Production validation reports 230 frozen non-奇牌 rows, 50 real Joker rows,
      280 aggregate rows, 50 resolved Joker IDs, and 100 unresolved future Joker
      IDs; no `fixture:` definition enters shipped content.
- [ ] IDs `bxqp:joker:001` through `050` are each reachable through every allowed
      source, use the frozen rarity/cost/availability rule, initialize correctly,
      and emit a first-acquisition discovery observation.
- [ ] All 50 effects execute the frozen numerical, timing, ordering, state,
      capacity, copy, retrigger, debuff, sticker, sale, and destruction contracts.
- [ ] Every row has at least one positive and one boundary fixture, plus named
      interaction tests for every matrix ruling it references.
- [ ] RNG consumers prove same-seed replay, no-consumption false branches, stored
      materialization, reload equivalence, and rejection atomicity.
- [ ] Every mutable row proves save/reload, export/import, recovery, and invariant
      validation without breaking older V2 or pre-ability-state V3 runs.
- [ ] Real campaign shop and Buffoon-pack flows can offer and acquire the rows;
      edition/sticker/capacity/bans/challenges use the shared production paths.
- [ ] All 50 approved names, explicit descriptions, and separate flavor lines are
      complete, unique, and resolved from localization keys.
- [ ] All 50 local illustrations have unique focal composition, prompt/source
      provenance, ownership review, successful image decoding, and no remote
      requests, unwanted text/logos, or copied identity.
- [ ] The Joker review ledger and representative shop/table views pass component
      tests and 1280×720 Chromium/WebKit smoke and visual review.
- [ ] Formatting, lint, type-check, unit/property/component tests, build, content
      audit, full E2E, Trellis validation, and `git diff --check` pass without
      regressing the archived 230-row or legacy engine fixtures.

## Out of Scope

- Definitions, names, art, and mechanics for rows 051-150.
- Final strict 150-Joker integration, full balance review, progression unlock
  economy, profile collection masking, achievements, and the final collection
  browser; later children own these surfaces.
- Mobile/responsive redesign, accessibility-specific work, online services,
  multiplayer, telemetry, cloud saves, and deployment.
- Save, data, asset, naming, or defect compatibility with Balatro.
- Balance changes beyond a documented project-safety ruling in the frozen matrix.

## Planning evidence

- `research/frozen-joker-matrix-001-050.md` — normative 50-row mechanical,
  localization, art, and interaction ledger.
- `research/current-engine-surface.md` — repository-backed capability and gap
  audit used by the technical design.

## Approved Product Decisions

### Mechanical index baseline

- Approved on 2026-07-18: rows 001-050 follow the Balatro v1.0.1o collection
  order for research, implementation traceability, and deterministic contract
  fixtures.
- The baseline fixes each row's mechanical role, numerical values, rarity, cost,
  availability rule, and ordering dependencies unless a documented project
  safety rule requires a deliberate deviation.
- `bxqp:joker:001` through `bxqp:joker:050` are permanent project-owned IDs.
  Later catalog batches and saved runs may depend on these IDs, so the rows must
  not be renumbered after approval.
- This is a gameplay-reference mapping only. 百戏奇牌 remains an original game
  and does not promise save, data, naming, asset, or behavior compatibility with
  Balatro.

### Visual organization

- Approved on 2026-07-19: present the first 50 奇牌 as five original ensembles
  within the established “午夜百戏” art direction:
  - `001-010`: 主台笑匠
  - `011-020`: 面具幻术
  - `021-030`: 幕后机关
  - `031-040`: 乐舞杂技
  - `041-050`: 夜场精怪
- Each row requires a distinct focal subject, silhouette, composition, and local
  illustration asset. An ensemble may share material, palette, or stage-light
  cues, but may not reuse a character pose as another row's identity.
- The ensembles are presentation groupings, not gameplay tags. They do not add
  synergy rules, availability rules, or mechanical dependencies.
- Do not reproduce or allude to Balatro character designs, names, card art, or
  visual motifs. Gameplay labels and symbols remain project-owned DOM/SVG UI;
  illustrations must not contain generated text or logos.

### Chinese naming and copy

- Approved on 2026-07-19: use an “evocative identity, explicit rules” copy
  model for all 50 rows.
- Each original Chinese card name must be 2-6 Han characters and derive from
  the 百戏 troupe, illusion, stage machinery, music and acrobatics, or midnight
  spirit vocabulary appropriate to its approved ensemble.
- Rules copy must state the trigger, target, numerical value, probability,
  duration, and limiting condition directly whenever they apply. Metaphor may
  not replace executable rules.
- Optional flavor copy is displayed separately, remains brief, and never carries
  information required to play correctly.
- Do not translate, transliterate, parody, or closely echo reference card names
  or descriptions. Mechanical traceability lives only in research and test
  manifests, never in the shipped presentation.

### Reference quirks and project safety

- Approved on 2026-07-19: reproduce the approved player-visible mechanics and
  numerical behavior, not defects of a reference implementation.
- Preserve specified trigger order, probability, stacking, copy, retrigger,
  destruction, and persistent-state semantics when they form part of the
  approved mapping.
- Do not reproduce crashes, softlocks, leaked state, non-deterministic random
  consumption, corrupt saves, or displays that contradict executable rules.
- Resolve ambiguous interactions as explicit project-owned deterministic
  contracts. Every such ruling requires a named fixture and a mapping-manifest
  note so that later catalog batches cannot silently change it.
- Any intentional safety deviation must be documented beside the affected row;
  bug-level compatibility is not a product goal.

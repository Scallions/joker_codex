# Joker Catalog 051-100

## Goal

Implement, illustrate, localize, and contract-test original 奇牌 entries 51 through 100.

## Requirements

- Depends on the complete run/economy engine and the stabilized shared primitives
  from rows 001-050.
- Implement catalog rows 051-100 as one-to-one mechanical mappings with original
  stable IDs, Chinese names/copy, unique illustrations, costs, rarity, unlocks,
  discovery behavior, and typed handlers.
- Reuse existing primitives without changing their semantics; any necessary
  semantic change must update and revalidate rows 001-050 explicitly.
- Maintain localization, asset ownership, mapping, and test manifests.

## Acceptance Criteria

- [ ] Exactly 50 assigned rows are functional, discoverable, purchasable or
      otherwise reachable, and visible in the collection.
- [ ] Every row has positive and boundary contract fixtures plus named tests for
      each relevant interaction category.
- [ ] Cross-batch copy, retrigger, debuff, ordering, destruction, save/reload,
      and deterministic replay fixtures pass where applicable.
- [ ] Every row has approved original Chinese presentation and a unique original
      illustration with complete ownership metadata.
- [ ] Count, localization, asset, handler, test, build, and browser smoke gates
      pass together with the full rows 001-050 regression suite.

## Out of Scope

- Rows 101-150 and final whole-catalog integration are owned by later children.

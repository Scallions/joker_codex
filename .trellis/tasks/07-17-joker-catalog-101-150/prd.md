# Joker Catalog 101-150

## Goal

Implement, illustrate, localize, and contract-test original 奇牌 entries 101 through 150.

## Requirements

- Depends on the complete run/economy engine and stabilized shared primitives
  from rows 001-100.
- Implement catalog rows 101-150 as one-to-one mechanical mappings with original
  stable IDs, Chinese names/copy, unique illustrations, costs, rarity, unlocks,
  discovery behavior, and typed handlers.
- Reuse existing primitives without changing their semantics; any necessary
  semantic change must update and revalidate all affected earlier rows.
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
      pass together with the full rows 001-100 regression suite.

## Out of Scope

- Final whole-catalog balancing and arbitrary cross-content audit belong to the
  integration child.

# Joker Catalog 001-050

## Goal

Implement, illustrate, localize, and contract-test original 奇牌 entries 1 through 50.

## Requirements

- Depends on the complete run/economy effect engine and approved 奇牌 matrix.
- Implement catalog rows 001-050 as one-to-one mechanical mappings with original
  stable IDs, Chinese names/copy, unique illustrations, costs, rarity, unlocks,
  discovery behavior, and typed handlers.
- Use shared primitives where exact semantics match and document every new
  handler's hook, priority, copy, retrigger, debuff, and destruction behavior.
- Maintain localization, asset ownership, mapping, and test manifests.

## Acceptance Criteria

- [ ] Exactly 50 assigned rows are functional, discoverable, purchasable or
      otherwise reachable, and visible in the collection.
- [ ] Every row has positive and boundary contract fixtures plus named tests for
      each relevant interaction category.
- [ ] Copy, retrigger, debuff, ordering, sale, destruction, save/reload, and
      deterministic replay behavior is covered where applicable.
- [ ] Every row has approved original Chinese presentation and a unique original
      illustration with complete ownership metadata.
- [ ] Count, localization, asset, handler, test, build, and browser smoke gates
      pass without regressing earlier engine fixtures.

## Out of Scope

- Rows 051-150 and final cross-batch integration are owned by later children.

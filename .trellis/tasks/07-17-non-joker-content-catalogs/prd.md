# Non-Joker Content Catalogs

## Goal

Implement mapped decks, blinds, consumables, vouchers, tags, packs, modifiers, editions, seals, and related contracts.

## Requirements

- Depends on the complete run/economy engine and approved content matrices.
- Implement project-owned one-to-one mechanical mappings for 15 decks, 8 stakes,
  20 challenges, 32 vouchers, 22 Tarot equivalents, 12 Planet equivalents,
  18 Spectral equivalents, 24 tags, 30 blind entries, 32 booster entries,
  8 enhancements, 4 seals, and 5 editions.
- Give every entry an original stable ID, Simplified Chinese name/description,
  parameters, availability/unlock contract, and original presentation asset.
- Reuse typed primitives where semantics match; add focused handlers without
  weakening earlier contracts.
- Track every entry in build-validated content, asset, localization, and test
  manifests.

## Acceptance Criteria

- [ ] Build-time count checks match every approved catalog count with no duplicate
      ID, missing localization, missing asset, orphaned handler, or untested row.
- [ ] Every entry is reachable through at least one deterministic scenario and
      has positive, boundary, and required cross-category fixtures.
- [ ] Unlock, discovery, shop/pool eligibility, rarity, cost, and exclusion rules
      survive profile and active-run save round trips.
- [ ] All player-facing names, descriptions, and assets are original and pass the
      ownership manifest review.
- [ ] Catalog contract suites, interaction suites, browser smoke tests, and build
      pass without changing the approved balance baseline silently.

## Out of Scope

- The 150 奇牌, final progression screens, and final whole-game visual/audio pass
  belong to other children.

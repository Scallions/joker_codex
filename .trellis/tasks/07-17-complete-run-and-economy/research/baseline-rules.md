# Frozen Run and Economy Baseline

## Purpose

This note records the secondary gameplay evidence used to turn the parent's
"frozen stable PC baseline" decision into testable 百戏奇牌 constants. It is not
a license to copy names, text, IDs, assets, source code, save formats, or random
behavior. All player-facing content and implementation remain project-owned.

Evidence was checked on 2026-07-17. Community wiki material is treated as
secondary evidence and must be backed by independent contract fixtures.

## Default Run Constants

| Rule | Frozen fixture value |
|---|---:|
| Starting money | 4 |
| Hand size | 8 |
| Hands per round | 4 |
| Discards per round | 3 |
| Maximum selected cards | 5 |
| 奇牌 slots | 5 |
| Consumable slots | 2 |
| Interest unit | 1 per full 5 non-negative money |
| Default interest cap | 5 |

## Ante and Blind Constants

- Each ante routes small -> big -> boss.
- Small and big may be skipped for a visible tag; boss may not be skipped.
- Small target multiplier: 1x. Big target multiplier: 1.5x. Ordinary boss
  default: 2x, with definition overrides.
- Default rewards: small 3, big 4, ordinary boss 5. Finisher fixtures use 8.
- Ante 8 is the campaign finisher. Endless begins at ante 9; later finishers
  appear every eight antes.

Baseline small-blind target table for the default fixture difficulty:

| Ante | Base target | Ante | Base target | Ante | Base target |
|---:|---:|---:|---:|---:|---:|
| -1 | 100 | 13 | 4.7e10 | 27 | 8.4e109 |
| 0 | 100 | 14 | 2.9e13 | 28 | 2.0e122 |
| 1 | 300 | 15 | 7.7e16 | 29 | 2.7e135 |
| 2 | 800 | 16 | 8.6e20 | 30 | 2.1e149 |
| 3 | 2,000 | 17 | 4.2e25 | 31 | 9.9e163 |
| 4 | 5,000 | 18 | 9.2e30 | 32 | 2.7e179 |
| 5 | 11,000 | 19 | 9.2e36 | 33 | 4.4e195 |
| 6 | 20,000 | 20 | 4.3e43 | 34 | 4.4e212 |
| 7 | 35,000 | 21 | 9.7e50 | 35 | 2.8e230 |
| 8 | 50,000 | 22 | 1.0e59 | 36 | 1.1e249 |
| 9 | 110,000 | 23 | 5.8e67 | 37 | 2.7e268 |
| 10 | 560,000 | 24 | 1.6e77 | 38 | 4.5e288 |
| 11 | 7,200,000 | 25 | 2.4e87 | 39 | Infinity boundary |
| 12 | 300,000,000 | 26 | 1.9e98 |  |  |

百戏奇牌 will never persist NaN. The centralized target operation maps numeric
overflow to positive Infinity, the formatter displays a defined Chinese
sentinel, and the target comparator treats an infinite target as unreachable.
This preserves the terminal endless boundary without importing a reference-game
NaN bug into saves or JSON.

## Reward Order

The default cash-out contract is frozen as:

1. resolve end-of-round/deferred effects in declared source order;
2. calculate interest from the post-effect, pre-cash-out money balance;
3. materialize a durable receipt containing blind reward, remaining-hand reward,
   interest, and other declared income/cost lines;
4. apply and claim the receipt exactly once;
5. enter shop, or enter the ante-8 win choice after its finisher.

Default formulas:

```text
handReward = remainingHands
interest = min(interestCap, floor(max(0, money) / 5) * interestRate)
cashOut = blindReward + handReward + interest + orderedEffectLines
```

Fixture modifiers cover disabled interest, cap increases, alternative remaining
action rewards, and negative end-of-round costs.

## Shop and Pack Constants

- Default shop: two weighted card/consumable offers, two booster pack offers,
  and one voucher offer.
- Default random-offer weights: 奇牌-equivalent 20, tarot-equivalent 4,
  planet-equivalent 4. Fixture families use original IDs and names.
- A reroll starts at 5 and increases by 1 each time in the same shop. It replaces
  only random card/consumable offers; packs and voucher do not reroll.
- Packs restock on each new shop. The ante voucher is stable across that ante and
  restocks after the boss or an explicit voucher-tag effect.
- Voucher fixture cost is 10 and supports base/dependent prerequisite contracts.
- Normal/jumbo/mega pack price baseline is 4/6/8.
- Standard, tarot-like, and planet-like packs expose 3/5/5 options and allow
  1/1/2 picks. 奇牌 and spectral-like packs expose 2/4/4 and allow 1/1/2 picks.
- A pack opens immediately after purchase and may be skipped without choosing.

Pricing helpers are centralized:

```text
purchase = max(1, roundHalfDown((baseCost + editionCost) * discount))
sale = max(1, floor(currentPurchase / 2))
```

Exceptions are explicit definition/handler overrides, never UI conditionals.

## Ordering Evidence Applied to the Effect Engine

The hand pipeline uses this reference behavior as evidence, then expresses it as
an original typed contract:

1. blind/pre-play effects;
2. played cards left to right, including card modifiers and on-scored handlers;
3. explicit retriggers of each scored-card sequence;
4. held cards left to right, including their retriggers;
5. 奇牌 left to right, with each source's additive/multiplicative operations in
   emitted order;
6. consumable/global post-card effects;
7. final score and post-score consequences.

Debuffed cards may still participate in hand classification but do not contribute
chips or card-triggered effects. Debuffed 奇牌 do not execute their handler or
edition behavior. Copy and retrigger are queue semantics, not recursive handler
calls.

## Sources

- Official high-level play guide:
  https://balatrogame.com/how-to-play/
- Community blind, reward, ante, boss, and endless tables:
  https://balatrogame.fandom.com/wiki/Blinds_and_Antes
- Community gameplay reward description:
  https://balatrogame.fandom.com/wiki/Gameplay_rules
- Community shop slots, weights, reroll, price, and sale rules:
  https://balatrogame.fandom.com/wiki/The_Shop
- Community pack option/pick/price/weight rules:
  https://balatrogame.fandom.com/wiki/Booster_Packs
- Community voucher pairing, cost, restock, and modifier rules:
  https://balatrogame.fandom.com/wiki/Vouchers
- Community activation-order guide:
  https://balatrogame.fandom.com/wiki/Guide%3A_Activation_Sequence
- Community skip behavior summary:
  https://balatrowiki.org/w/Skips

## Evidence Limits

- The official guide confirms the broad loop but not every number.
- Wiki pages can drift or contain mistakes. Constants above are frozen for this
  project version and will not change merely because an external page changes.
- Any later correction that changes gameplay must update this note, bump the
  百戏奇牌 content version, provide save behavior, and update golden fixtures.

# Gameplay Reference Scope

## Purpose and Evidence Limit

This file freezes the planning catalog for 百戏奇牌. Balatro is used only as a
gameplay/system reference. Names, copy, IDs, art, audio, random streams, saves,
and implementation code remain original to this project.

The official Steam page gives the high-level mode and content claims, but its
marketing counts are not complete enough to define every catalog. The community
wiki collection index supplies the detailed counts below. Treat wiki-derived
mechanics as secondary evidence: every mapped rule must be rewritten as a
project-owned contract and validated through independent play/behavior fixtures
before its implementation is accepted.

## Frozen Catalog

| Catalog | Planning count | Required 百戏奇牌 treatment |
|---|---:|---|
| Standard playing cards | 52 | Original face/back design; rank/suit behavior |
| Poker hands | 12 | Base plus hidden hands; independent Chinese names/copy |
| 奇牌 | 150 | One-to-one mechanical mapping; unique original identity |
| Starting decks | 15 | One-to-one run modifier and unlock mapping |
| Difficulty stakes | 8 | Ordered cumulative difficulty modifiers |
| Challenge runs | 20 | Fixed starting state, bans, and special rules |
| Vouchers | 32 | Two-tier run upgrades and unlock prerequisites |
| Tarot-equivalent cards | 22 | Deck-editing and utility effects |
| Planet-equivalent cards | 12 | Poker-hand level upgrades, including hidden hands |
| Spectral-equivalent cards | 18 | High-impact deck edits and tradeoffs |
| Card enhancements | 8 | Mutually exclusive enhancement slot |
| Seals | 4 | Mutually exclusive seal slot |
| Editions | 5 | Base plus four special presentation/mechanical editions |
| Tags | 24 | Skip-blind rewards and deferred effects |
| Blind collection entries | 30 | Small/big plus boss and finisher behavior catalog |
| Booster pack collection entries | 32 | Original pack identities and mapped offer/pick rules |
| Local achievements | 31 baseline objectives | Original names/icons; local triggers only |
| Local profiles | 3 | Independent progression and active run |

The exact distinction between collection entries and mechanically distinct pack
families must be explicit in the content matrix; decorative variants must not be
mistaken for separate rule implementations.

## Complete Game Loop

1. Select one of three local profiles.
2. Start campaign, challenge, or seeded mode with an eligible deck and stake.
3. For each ante, view small, big, and boss blinds.
4. Play or skip eligible blinds; skipping grants a tag and forfeits the round/shop.
5. During a blind, draw a hand, select up to the legal play limit, play poker
   hands or discard, resolve ordered effects, and accumulate score.
6. Win by reaching the blind target within the hand budget; otherwise lose the run.
7. Resolve round income, interest, remaining-hand rewards, unlock/stat events,
   and challenge/stake modifiers.
8. Enter the shop, purchase/sell/reorder cards and consumables, reroll offers,
   redeem the voucher, and open booster packs.
9. Defeat the ante-8 finisher to record a win and unlock endless continuation.
10. Persist after every committed action; collection, achievements, statistics,
    and unlocks remain profile-local.

## Rule Subsystems That Need Independent Contracts

- Hand construction, draw/discard, sorting, card selection, and deck mutation.
- Poker-hand classification with wild suits, stone/no-rank cards, face-card
  overrides, four-card straights/flushes, and multiple matching hidden hands.
- Scoring windows: hand base, scored-card chips/effects, held-card effects,
  奇牌 ordering, additive multiplier, multiplicative multiplier, repetitions,
  debuffs, seals, editions, and post-score destruction.
- Blind/ante scaling, boss selection and reroll, boss debuffs, skip eligibility,
  tag timing, and finisher selection.
- Shop weighted pools, rarity, editions/stickers, duplicate restrictions,
  reroll prices, vouchers, packs, discounts, and generated/free items.
- Economy: round rewards, remaining hands, interest caps, sales, rental costs,
  bankruptcy allowances, and money-triggered effects.
- Inventory/slot limits for 奇牌 and consumables, negative editions, temporary
  slots while opening packs, copying, creation, destruction, and reordering.
- Unlock/discovery rules, deck/stake progression, challenge availability,
  collection rules, statistics, stickers, and achievements.
- Seeded determinism, active-run replay fixtures, autosave boundaries, migration,
  and profile isolation.
- Tutorial overrides and scripted offers without leaking tutorial state into
  ordinary random runs.

## Acceptance Matrix Contract

Each catalog row must ultimately contain:

- project-owned stable ID;
- original Simplified Chinese display name and description;
- original art/audio references where applicable;
- availability, rarity, cost, unlock, and discovery rules;
- typed effect hooks and ordering priority;
- parameter data and version introduced;
- dependencies and exclusions;
- at least one positive contract fixture;
- negative/boundary fixtures;
- named interaction fixtures for every shared effect category it can alter;
- implementation and visual-review status.

No catalog is complete merely because its entries render. Completion requires
reachable acquisition, correct behavior, deterministic save/reload, collection
tracking, original presentation, and automated contract coverage.

## Sources

- Official Steam product page (mode and headline catalog):
  https://store.steampowered.com/app/2379780/Balatro/
- Community collection index (detailed catalog counts):
  https://balatrogame.fandom.com/wiki/Collection
- Community gameplay loop description:
  https://balatrogame.fandom.com/wiki/Gameplay_rules
- Community tag behavior and count:
  https://balatrogame.fandom.com/wiki/Tags
- Community spectral-card behavior and count:
  https://balatrogame.fandom.com/wiki/Spectral_Cards
- Community blind/ante behavior:
  https://balatrogame.fandom.com/wiki/Blinds_and_Antes
- Community card-modifier interaction notes:
  https://balatrogame.fandom.com/wiki/Card_Modifiers


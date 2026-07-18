# Frozen Non-Joker Catalog Matrix

## Evidence Boundary

This matrix freezes the stable PC mechanical baseline selected by the parent task
on 2026-07-17. Evidence was rechecked on 2026-07-18. Reference row labels below
are internal research indices only: shipped IDs, Chinese names, descriptions,
artwork, random streams, and save formats remain original to 百戏奇牌.

Community sources are secondary evidence. Mechanics are paraphrased into typed
contracts and must be independently frozen by deterministic fixtures. Known
reference defects are not compatibility requirements: the project keeps the
existing positive-Infinity boundary, implements the documented modifier intent
instead of the known shop-seal defect, and prevents pack softlocks.

## Count Ledger

| Family | Rows | Mechanical profiles |
|---|---:|---:|
| Starting decks | 15 | 15 |
| Cumulative stakes | 8 | 8 |
| Challenges | 20 | 20 composed rule sets |
| Vouchers | 32 | 16 prerequisite pairs |
| Tarot-equivalent consumables | 22 | 22 |
| Planet-equivalent consumables | 12 | 12 poker-hand upgrades |
| Spectral-equivalent consumables | 18 | 18 |
| Tags | 24 | 24 |
| Blinds | 30 | 30 |
| Booster collection entries | 32 | 15 family/size profiles |
| Playing-card enhancements | 8 | 8 |
| Seals | 4 | 4 |
| Editions, including base | 5 | 5 |
| **Total** | **230** | |

Three run-only Joker stickers are also required by stakes and challenges:
permanent/no-sale, five-round expiry, and one-dollar purchase plus three-dollar
round upkeep. They are typed modifiers but are not additional collection rows.

## D01-D15 Starting Deck Contracts

| Row | Frozen mechanic |
|---|---|
| D01 | Standard 52 cards; +1 discard each round. |
| D02 | Standard 52 cards; +1 hand each round. |
| D03 | Standard 52 cards; start with 10 additional money. |
| D04 | Standard deck; no interest; round income is 2 per remaining hand and 1 per remaining discard. |
| D05 | Standard deck; +1 奇牌 slot and -1 hand each round. |
| D06 | Start with the consumable-slot voucher and two copies of the last-used-copy consumable. |
| D07 | Start with the most-played-hand pack voucher and -1 consumable slot. |
| D08 | Spectral-equivalent cards enter the shop pool; start with the consumable that applies the multiplicative edition and destroys other 奇牌. |
| D09 | Forty-card deck with all face ranks removed. |
| D10 | Fifty-two cards containing only Hearts and Spades, two of each suit per rank. |
| D11 | Start with Tarot and Planet shop-frequency vouchers plus the first shop-slot voucher. |
| D12 | Standard deck; +2 hand size and -1 奇牌 slot. |
| D13 | Gain one tag-copy token after every defeated boss. |
| D14 | Before final scoring, average Chips and Mult; all blind targets are doubled. |
| D15 | Deterministically randomize the rank and suit of each of 52 starting cards. |

## S01-S08 Cumulative Stake Contracts

| Row | Added rule |
|---|---|
| S01 | Baseline difficulty. |
| S02 | Small blind pays no base reward. |
| S03 | Use the frozen Green target table: 300, 900, 2,600, 8,000, 20,000, 36,000, 60,000, 100,000 for Antes 1-8, then its documented endless curve. |
| S04 | Eligible generated 奇牌 have a 30% permanent/no-sale sticker chance. |
| S05 | -1 discard each round. |
| S06 | Use the frozen Purple target table: 300, 1,000, 3,200, 9,000, 25,000, 60,000, 110,000, 200,000 for Antes 1-8, then its documented endless curve. |
| S07 | Eligible generated 奇牌 have a 30% five-round-expiry sticker chance. |
| S08 | Eligible generated 奇牌 have a 30% rental sticker chance; rental items cost 1 to buy and charge 3 at round end. |

Stakes compose in order. Sticker rolls are independent, materialized, and never
use ambient randomness. Challenge runs consume S01 only; profile unlock ordering
belongs to the progression child.

## C01-C20 Challenge Contracts

Every row includes a starting deck recipe, rule overrides, starting inventory,
and cross-family allow/ban sets. References to future 奇牌 use reserved stable IDs
and dependency validation; deterministic test doubles prove composition until the
owning 奇牌 batches provide real definitions.

| Row | Frozen composed rules |
|---|---|
| C01 | No blind reward, remaining-hand reward, or interest; start with five sell-value-scaling 奇牌; ban the corresponding passive economy sources. |
| C02 | Two copies of every face card, no A/2/3; start with two permanent 奇牌 supporting non-face scaling and shorter straights. |
| C03 | Start with 100 and both interest-cap vouchers; Chips before multiplication cannot exceed current nonnegative money. |
| C04 | Start with one permanent, immovable leftmost 奇牌. |
| C05 | Each drawn card independently has a 1-in-4 face-down roll. |
| C06 | Ranks 2-9 only; no remaining-hand reward or interest; start with one negative permanent all-face-card source and one permanent face-card economy source; ban the face-card-debuff boss. |
| C07 | Base hand size 10; lose one hand-size unit per full 5 current money. |
| C08 | Every acquired 奇牌 is permanent/no-sale; exclude self-expiring/destructive rows and the sell-to-enable finisher. |
| C09 | Replace all face cards with enhancement E06; start with one permanent generator of that enhancement. |
| C10 | All 52 cards start with seal L02; a played card becomes debuffed after it scores. |
| C11 | After the Ante-4 boss, all owned 奇牌 become permanent and nominal 奇牌 capacity becomes zero; ban the sell-to-enable finisher. |
| C12 | Every purchase permanently increases future prices by 1; start with the debt 奇牌; ban both discount vouchers. |
| C13 | 奇牌 do not enter ordinary shop offers; start with one permanent consumer 奇牌, two specified Tarot equivalents, and the two playing-card-shop vouchers. |
| C14 | All 52 cards start with enhancement E04; start with two permanent negative chance-doubling 奇牌; ban every source that can add non-E04 cards or overwrite E04. |
| C15 | Start with two permanent 奇牌: one hand-history scaler and one negative E06-card generator. |
| C16 | Two hands, two discards, and four 奇牌 slots; start with two permanent 奇牌 and both Planet-frequency vouchers; ban hand-count increases. |
| C17 | Six discards, hand size five, seven 奇牌 slots; start with two specified 奇牌; ban hand-size 奇牌. |
| C18 | One hand, six discards, start with 10, each discard costs 1; start with the debt 奇牌; ban hand-count increases. |
| C19 | Small and big blinds pay no base reward; three 奇牌 slots. |
| C20 | Zero 奇牌 slots and no 奇牌 shop offers; ban every Tarot, Spectral, tag, blind, and pack route that can create or require 奇牌. |

## V01-V32 Voucher Pairs

All vouchers cost 10, are unique per run, and the second row in each pair is only
eligible after the first has been redeemed. Unlock objectives are metadata in
this child and become profile behavior later.

| Pair | Base / dependent mechanics |
|---|---|
| V01/V02 | Shop random offer slots become 3, then 4; fill newly opened slots immediately. |
| V03/V04 | Cards and packs are 25%, then 50% off using round-half-down pricing. |
| V05/V06 | Raise special-edition generation weights to the frozen 2x/4x tables, including the distinct 奇牌 polychrome ratios. |
| V07/V08 | Reduce base reroll price by 2, then by another 2, with the global minimum preserved. |
| V09/V10 | +1 consumable slot; then each Tarot-pack option independently has a 20% Spectral replacement roll. |
| V11/V12 | Planet packs guarantee the most-played hand's row; then held matching Planet consumables contribute x1.5 during scoring. |
| V13/V14 | +1 hand each round, then another +1. |
| V15/V16 | +1 discard each round, then another +1. |
| V17/V18 | Tarot shop weight becomes 2x, then 4x. |
| V19/V20 | Planet shop weight becomes 2x, then 4x. |
| V21/V22 | Interest cap becomes 10, then 20. |
| V23/V24 | Base row is intentionally inert; dependent row adds one 奇牌 slot. |
| V25/V26 | Playing cards enter the shop; then generated shop cards may carry enhancement, edition, and seal according to the intended distribution. |
| V27/V28 | Move back one Ante and lose one hand each round; then move back one Ante and lose one discard each round. |
| V29/V30 | Boss reroll costs 10 once per Ante, then costs 10 without a per-Ante limit. |
| V31/V32 | +1 hand size, then another +1. |

## T01-T22 Tarot-Equivalent Contracts

Default cost is 3. Target cardinality and inventory-room checks are command
contracts, not UI checks.

| Row | Frozen mechanic |
|---|---|
| T01 | Copy the last used T/P consumable, excluding this row. |
| T02-T09 | Apply E08 to two, create up to two P rows, apply E02 to two, create up to two T rows, apply E01 to two, apply E03/E05/E04 to one respectively. |
| T10 | Add current nonnegative money, capped at 20. |
| T11 | One-in-four chance to add E02-edition family N02/N03/N04 to a random eligible base-edition 奇牌, using 50/35/15 conditional weights. |
| T12 | Raise up to two ranks by one with K -> A -> 2 wrapping. |
| T13 | Destroy up to two selected playing cards. |
| T14 | Copy the complete right selected card state onto the left selected card. |
| T15 | Add total current 奇牌 sell value, capped at 50. |
| T16/T17 | Apply E07/E06 to one selected card. |
| T18-T20/T22 | Convert up to three selected cards to Diamonds/Clubs/Hearts/Spades without changing rank or modifiers. |
| T21 | Create one random eligible 奇牌 without in-run stickers, subject to capacity. |

## P01-P12 Planet-Equivalent Contracts

Default cost is 3. Each use adds the listed Mult and Chips to its poker hand.

| Row | Hand | Mult | Chips | Availability |
|---|---|---:|---:|---|
| P01 | High Card | 1 | 10 | base |
| P02 | Pair | 1 | 15 | base |
| P03 | Two Pair | 1 | 20 | base |
| P04 | Three of a Kind | 2 | 20 | base |
| P05 | Straight | 3 | 30 | base |
| P06 | Flush | 2 | 15 | base |
| P07 | Full House | 2 | 25 | base |
| P08 | Four of a Kind | 3 | 30 | base |
| P09 | Straight Flush | 4 | 40 | base |
| P10 | Five of a Kind | 3 | 35 | after hand is played this run |
| P11 | Flush House | 4 | 40 | after hand is played this run |
| P12 | Flush Five | 3 | 50 | after hand is played this run |

## X01-X18 Spectral-Equivalent Contracts

Default cost is 4. Rare X17/X18 options have a 0.3% per-option replacement chance
only in their allowed pack families and cannot enter ordinary creation pools.

| Row | Frozen mechanic |
|---|---|
| X01-X03 | Destroy one random held card; add 3 enhanced face cards / 2 enhanced Aces / 4 enhanced numbered cards. |
| X04/X12/X14/X15 | Apply seals L01/L02/L03/L04 to one selected card. |
| X05 | Apply N02/N03/N04 to one selected playing card with 50/35/15 weights. |
| X06 | Create one rare 奇牌 if capacity allows, then set money to zero. |
| X07 | Convert the held hand to one random suit. |
| X08 | Convert the held hand to one random rank and reduce hand size by one. |
| X09 | Apply N05 to a random eligible 奇牌; cumulative hand-size cost is 1 + prior uses. |
| X10 | Destroy five random held cards and add 20 money. |
| X11 | Copy one random owned 奇牌, including its non-negative edition, then destroy every other destructible 奇牌. |
| X13 | Apply N04 to one random eligible 奇牌, then destroy every other destructible 奇牌. |
| X16 | Create two exact copies of one selected playing card. |
| X17 | Create one legendary 奇牌 if capacity allows. |
| X18 | Increase every poker-hand level by one. |

## G01-G24 Tag Contracts

| Row | Frozen mechanic |
|---|---|
| G01/G02 | Add a free uncommon/rare 奇牌 to the next shop. |
| G03-G06 | Make the next eligible base-edition shop 奇牌 free and apply N05/N02/N03/N04; defer until a target exists. |
| G07 | Add 25 money after the next defeated boss. |
| G08 | Add one extra eligible voucher to the next shop. |
| G09 | Reroll the upcoming boss using the ordinary seen-pool rules. |
| G10-G13 | Immediately open a free mega Standard/Tarot/Planet/奇牌 pack. |
| G14 | Add 1 per hand played so far in the run. |
| G15 | Add 1 per unused discard accumulated so far in the run. |
| G16 | Immediately open a free normal Spectral pack. |
| G17 | Initial random items and packs in the next shop cost zero; rerolls and vouchers are excluded. |
| G18 | Copy the next non-G18 tag; stacked copies add linearly. |
| G19 | +3 hand size for the next round only. |
| G20 | First reroll in the next shop costs zero, then normal increments resume. |
| G21 | Create up to two common 奇牌 without stickers, subject to capacity. |
| G22 | Add 5 per skipped blind including the current skip. |
| G23 | Increase the materialized indicated poker hand by three levels; secret hands require prior play. |
| G24 | Add current nonnegative money, capped at 40. |

Ante 1 excludes G03, G10, G12-G16, G21, and G23. Hidden discovery requirements
for G02-G06 are metadata until progression owns profile evaluation.

## B01-B30 Blind Contracts

| Rows | Frozen mechanic |
|---|---|
| B01/B02 | Small 1x/$3 and big 1.5x/$4; both skippable. |
| B03 | After each played hand, discard two random held cards. |
| B04 | Playing the run's most-played hand sets money to zero. |
| B05 | First hand of the round is face down. |
| B06 | 4x target. |
| B07 | Each drawn card has a 1-in-7 face-down roll. |
| B08 | Decrease the played hand's level by one before scoring, minimum one. |
| B09/B12/B14/B18/B22 | Debuff Clubs/Spades/Diamonds/all face cards/Hearts respectively. |
| B10 | Draw replacements face down after each played hand. |
| B11 | Exactly five cards must be played for the hand to score. |
| B13 | Start with zero discards. |
| B15 | -1 hand size. |
| B16 | Repeated poker-hand types do not score this round. |
| B17 | Only the first played poker-hand type scores this round. |
| B19 | After play or discard, draw exactly three cards. |
| B20 | Debuff cards played earlier in the current Ante. |
| B21 | One hand, 1x target. |
| B23 | Lose 1 per played card. |
| B24 | Halve poker-hand base Chips and Mult before other scoring. |
| B25 | Draw face cards face down. |
| B26 | Finisher: conceal and deterministically reorder all 奇牌. |
| B27 | Finisher: all cards debuffed until one 奇牌 is sold. |
| B28 | Finisher: 6x target. |
| B29 | Finisher: disable one random 奇牌 per hand, rematerialized each hand. |
| B30 | Finisher: one held card remains forced-selected until played or discarded. |

Ordinary bosses reward 5 and use 2x targets unless overridden. Minimum-Ante
eligibility is preserved from the frozen table, and seen pools reset only after
all eligible rows have appeared.

## K01-K32 Booster Collection Entries

Thirty-two collection rows map to fifteen mechanical family/size profiles. Each
row still owns a stable ID and unique original cover asset. Weight units use a
100x integer scale so the existing integer weighted picker stays exact.

| Family | Collection variants | Profiles (cost/options/picks) | Per-row weight units |
|---|---:|---|---|
| Standard | 4 normal, 2 jumbo, 2 mega | 4/3/1; 6/5/1; 8/5/2 | 100, 100, 25 |
| Tarot | 4 normal, 2 jumbo, 2 mega | 4/3/1; 6/5/1; 8/5/2 | 100, 100, 25 |
| Planet | 4 normal, 2 jumbo, 2 mega | 4/3/1; 6/5/1; 8/5/2 | 100, 100, 25 |
| 奇牌 | 2 normal, 1 jumbo, 1 mega | 4/2/1; 6/4/1; 8/4/2 | 60, 60, 15 |
| Spectral | 2 normal, 1 jumbo, 1 mega | 4/2/1; 6/4/1; 8/4/2 | 30, 30, 7 |

Standard options may materialize enhancement, edition, and seal rolls. Tarot and
Spectral packs also materialize a target hand. Pack generation avoids duplicates
already materialized in the same shop/pack unless a future 奇牌 explicitly relaxes
that rule.

## E01-E08, L01-L04, N01-N05 Modifier Contracts

| Family | Rows and mechanics |
|---|---|
| Enhancements | E01 +30 Chips; E02 +4 Mult; E03 all suits; E04 x2 Mult plus independent 1-in-4 post-score destruction; E05 x1.5 held Mult; E06 always scores, +50 Chips, no effective rank/suit; E07 +3 at round end while held; E08 independent 1-in-5 +20 Mult and 1-in-15 +20 money rolls. |
| Seals | L01 +3 when played and scored; L02 one scored/held retrigger; L03 create the Planet row for the final hand at round end if capacity allows; L04 create one Tarot row when discarded if capacity allows. |
| Editions | N01 base; N02 +50 Chips; N03 +10 Mult; N04 x1.5 Mult; N05 contributes one instance-level slot for 奇牌 or consumables. Playing-card N05 remains non-generatable. |

Each playing card may have at most one enhancement, one seal, and one edition.
Replacing a modifier is explicit. Debuff suppresses modifier operations except
E06's identity and N05's capacity contribution.

## Cross-Family Dependency Gates

- Challenges, 奇牌 packs, T21, X06, X11, X13, X17, G01-G06, G13, G21, and three
  finishers reference the later 奇牌 catalog. This child reserves IDs, validates
  dependency shape, and uses purpose-built test doubles; no fake shipped 奇牌
  definition counts as completion.
- Deck/stake/challenge unlock objectives are complete metadata here. Profile
  evaluation, navigation, and playable-mode E2E belong to progression.
- The presentation child may polish or animate assets, but every row in this task
  must already have a valid original local asset and ownership record.

## Sources

- Official play guide: https://balatrogame.com/how-to-play/
- Collection counts: https://balatrogame.fandom.com/wiki/Collection
- Decks: https://balatrogame.fandom.com/wiki/Decks
- Stakes: https://balatrogame.fandom.com/wiki/Stakes
- Challenges: https://balatrogame.fandom.com/wiki/Challenge_Decks
- Vouchers: https://balatrogame.fandom.com/wiki/Vouchers
- Tarot cards: https://balatrogame.fandom.com/wiki/Tarot_Cards
- Planet cards: https://balatrogame.fandom.com/wiki/Planet_Cards
- Spectral cards: https://balatrogame.fandom.com/wiki/Spectral_Cards
- Tags: https://balatrogame.fandom.com/wiki/Tags
- Blinds and Antes: https://balatrogame.fandom.com/wiki/Blinds_and_Antes
- Booster packs: https://balatrogame.fandom.com/wiki/Booster_Packs
- Card modifiers: https://balatrogame.fandom.com/wiki/Card_Modifiers

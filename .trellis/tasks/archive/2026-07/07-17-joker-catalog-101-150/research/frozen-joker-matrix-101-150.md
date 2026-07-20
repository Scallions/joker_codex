# Joker 101-150 — Frozen Production Matrix

## 1. Normative boundary

This matrix is the executable content contract for `bxqp:joker:101` through
`bxqp:joker:150`. Implementation, tests, localization, current-value copy, art
provenance, and review fixtures must agree with it. Any row change after task
activation requires an explicit PRD/design update and renewed approval.

The approved research index follows v1.0.1o collection order. The
[complete reference table](https://balatrogame.fandom.com/wiki/Jokers) and
[structured community data](https://balatrowiki.org/w/Module:Jokers/data) are
secondary evidence for order, rarity, price, compatibility, and displayed
numbers. Named pages are linked below where timing materially matters. 百戏奇牌
does not ship reference names, translated descriptions, code, frames, artwork,
or identity. The IDs, Chinese presentation, rules text, art briefs, and edge-case
contracts below are project-owned originals.

Terms:

- **O / output copy**: repeat the target source's current compatible score or
  payout output. Never advance/reset/destroy the target or mutate its state.
- **T / trigger copy**: repeat the compatible event action after its own
  capacity/target/chance checks. Each copied action owns trace and RNG evidence.
- **R / route copy**: follow the target router's frozen graph edge from the
  target router's position, then copy compatible facets found downstream.
- **N / none**: incompatible; no facet is routed through a copier.
- **E−**: Permanent excluded. **P−**: Perishable excluded. Rental is allowed on
  every row.
- **source active**: the owned source exists and is not debuffed at that exact
  event phase.

## 2. Frozen ledger

| Property | Frozen value |
|---|---|
| Stable IDs | `bxqp:joker:101` through `bxqp:joker:150` |
| Batch size | 50 |
| Rarity | 6 Common / 25 Uncommon / 14 Rare / 5 Legendary |
| Aggregate after batch | 230 non-奇牌 + 150 奇牌 = 380 rows |
| Unresolved reserved Joker IDs | none |
| Default availability | baseline eligible in ordinary Joker pools |
| Additional availability | J106 requires 金叶; J120 requires 碎璃; J146-J150 legendary source only |
| Discovery | first acquisition; never gates the first legal offer |
| Permanent exclusions | J102, J107, J137 |
| Perishable exclusions | J103, J120, J124 |
| Copy-incompatible rows | J107, J111, J113, J121, J125, J126, J137, J139, J143, J149 |
| Visual ensembles | 铜线急报 / 四色巡游 / 镜局重台 / 百相压轴 / 星火终章 |

All fractional multiplier state is stored as safe integer hundredths. For
example, `multFactorHundredths=175` renders/evaluates as `×1.75`; cumulative
binary floating-point values are never persisted.

## 3. Shared executable rulings

### 3.1 Atomic events and RNG

1. An accepted command validates phase, selection, funds, capacity, target pool,
   copy budget, and schema constraints before committing one proposal/checkpoint.
   A rejected command returns the original state and RNG exactly.
2. Every event freezes source layout and relevant card/item facts at entry.
   Later movement, destruction, mutation, sale, or generated content does not
   rewrite eligibility within the same event.
3. Sources resolve left-to-right. A source destroyed before its phase does not
   trigger; a source debuffed at its phase is skipped. Nested windows share the
   10,000-operation budget.
4. Deterministic predicates/capacity checks precede RNG. Zero chance, guaranteed
   chance, empty pool, full capacity, and false predicate consume no draw. Every
   consumed roll/choice is materialized and survives reload/export/recovery.
5. Newly created sources do not join an already-frozen event. Newly created
   cards/items can participate only in later explicitly emitted events.

### 3.2 Dynamic copy graph

The copy contract is based on the event-entry owned order. J123 points to its
immediate right-hand source; J138 points to the leftmost source. A router copied
by another router retains its own anchor. This is required for chains such as
`[target, J123, J138]` and `[J123-A, J123-B, target]`.

- Right-edge J123 has no target. Leftmost J138 targeting itself has no effect.
- Dynamic layout cycles suppress only the cyclic branch and append a trace; they
  do not fail the command or spend RNG. Malformed static fixture cycles remain
  validation failures and the shared operation budget remains a hard failure.
- Layout/reorder changes after admission affect only the next event.
- Debuffed router or target contributes nothing. A target's compatible facet is
  copied using the target's current durable state; state growth/reset,
  self-destruction, passive rules, edition, and sticker are skipped.
- Chance-based copied facets roll independently. A sold router can trigger a
  copied compatible sale action using the pre-sale graph.
- J136 proves partial compatibility: +250 Chips is copied; −2 hand size is not.

These rulings preserve the compatible-facet behavior summarized by the
[copy-mechanic research page](https://balatrogame.fandom.com/wiki/Blueprint)
without importing reference identity or its platform-specific defects.

### 3.3 Listed chance multiplier

J126 contributes one active factor of two to every explicitly listed gameplay
chance numerator. With `n` active physical J126 sources:

```text
effectiveNumerator = min(denominator, numerator * 2^n)
```

The service uses saturating integer arithmetic. It applies equally to beneficial
and harmful effect chances, including Joker/card-modifier chances and Glass
break, and to every retrigger/copied pass independently. It does **not** affect
weighted pools, rarity, shop/pack content selection, shuffle, target selection,
edition/sticker materialization, or arbitrary random choice. Zero and certainty
consume no RNG. This bounded scope follows the player-visible behavior described
by the [probability reference](https://balatrogame.fandom.com/wiki/Oops%21_All_6s)
while avoiding hidden RNG drift.

### 3.4 Suits, faces, and assignment

- J113 makes Hearts/Diamonds mutually equivalent and Clubs/Spades mutually
  equivalent at every active suit check: Flush classification, scored/held/
  discarded suit predicates, J103/J116-J119/J127/J128, and earlier rows.
  Printed suit remains unchanged in saves and presentation.
- Wild expands a card's suit candidates; Stone has none. Temporary debuff
  suppresses card output but its non-Stone base suit remains available for hand
  shape/assignment. J103/J127 target selection uses stored base suit, not the
  expanded candidates.
- J122 requires a one-to-one assignment from **four distinct scoring cards** to
  Hearts, Diamonds, Clubs, and Spades. One Wild/equivalent card cannot fill two
  roles. J128 similarly requires two distinct scoring cards: one assignable to
  Clubs and one assignable to a non-Club suit. A deterministic bipartite matcher
  decides both; input order cannot change the boolean result.
- J146 reads the pre-destruction effective-face snapshot. The active all-cards-
  face capability makes any non-debuffed playing card a face for this purpose.

The four-distinct-card ruling matches the corrected behavior summarized by the
[Flower Pot page](https://balatrogame.fandom.com/wiki/Flower_Pot).

### 3.5 Playing-card destruction

All permanent card removal uses one `playing-card-destroyed` proposal. It freezes
rank/suit/face/debuff and enhancement/seal/edition/bonus state, removes the card
from every zone and modifier mirror once, then resolves J120/J146 left-to-right.

- J120 grows +75 hundredths per destroyed card whose frozen enhancement is
  碎璃. J146 grows +100 hundredths per destroyed non-debuffed effective face.
- A card may satisfy both and grows both sources. Multiple destroyed cards count
  separately; multiple physical sources each grow their own state.
- Glass break occurs after the scoring passes, so resulting growth applies from
  the next independent Joker output. Consumable/Joker destruction outside score
  applies immediately to later events.
- Playing-card transformation, temporary debuff, zone movement, reload repair,
  and Joker destruction are not playing-card destruction events.

This generic contract intentionally fixes source-path omissions documented by
the [Glass growth reference](https://balatrogame.fandom.com/wiki/Glass_Joker).

### 3.6 Boss ability, disable, and survival

- Boss effects are disabled when either the existing current-round one-shot flag
  or at least one active J149 exists. This is an idempotent boolean. Multiple
  J149 never invert an effect. Every Boss-rule use site reads the same helper;
  target/restriction projections are recomputed after relevant sale/debuff.
- `boss-ability-triggered` fires once for a played hand only if an enabled Boss
  rule actually applies. Merely facing a Boss, missing its target, or inspecting
  a disabled rule is not a trigger. J129 pays once per active/copied source.
- If the last ordinary hand misses the target, J107 may save the round only when
  `score * 4 >= targetScore`. The first eligible active J107 left-to-right is
  destroyed without sale, the Blind counts as defeated, and ordinary round-end
  effects/interest/tags continue. Base Blind reward is zero. Deck/draw exhaustion
  is not saved.
- J149 suppression prevents J129 payout because no Boss rule actually applies.
  The earlier sell-to-disable effect and J149 share the same disabled projection.

See the secondary [Boss-trigger payout](https://balatrogame.fandom.com/wiki/Matador),
[survival](https://balatrogame.fandom.com/wiki/Mr._Bones), and
[passive suppression](https://balatrogame.fandom.com/wiki/Chicot) research pages.

### 3.7 Sale, capacity, duplicate offers, and shop exit

- A deliberate sale is an accepted player Joker/consumable sale. Destruction,
  use, expiry, sticker settlement, and automatic replacement are not sales.
- J105 grows after each deliberate sale while active and resets to ×1 after an
  actively observed defeated Boss. If debuffed at Boss settlement, it neither
  resets nor outputs. Copiers copy only its current factor.
- J137 readiness advances after each defeated round while active. At 2/2, its
  accepted sale chooses a random other Joker from the pre-sale inventory,
  removes J137, pays its sale value, and duplicates the target's definition,
  current ability state, edition, and stickers. Negative edition is stripped;
  a duplicated J137 resets to 0/2. A debuffed or unready source sells normally
  without a target roll.
- If a Negative J137 creates a normal-slot clone above capacity, V6 records exact
  `jokerCapacityDebt`. Ordinary acquisition is blocked until later removal pays
  the debt down; the state remains valid and reloadable.
- Active J121 permits duplicate **content IDs** only for Jokers, Tarot, Planet,
  and Spectral items in shops and eligible packs. It does not affect playing
  cards, boosters, vouchers, already-materialized offers/options, or acquisition
  capacity. Removing/debuffing it affects only future materialization.
- On accepted Next Round, `shop-left` resolves before ante/lineup mutation. J150
  chooses independently from the event-entry owned consumable pool and creates a
  Negative clone. Negative consumables use zero slots, so full ordinary capacity
  is legal. Generated clones do not enter the same frozen target pool. Empty pool
  consumes no RNG.

These contracts draw timing evidence from the secondary
[Campfire](https://balatrogame.fandom.com/wiki/Campfire),
[Invisible clone](https://balatrogame.fandom.com/wiki/Invisible_Joker),
[duplicate-offer](https://balatrogame.fandom.com/wiki/Showman), and
[shop-exit clone](https://balatrogame.fandom.com/wiki/Perkeo) pages.

### 3.8 Round targets, counters, and history

- J103 uses one V6 run-shared Castle target suit. First acquisition materializes
  it immediately by choosing a non-Stone full-deck card uniformly and reading
  its base suit, making duplicates proportional. Every upcoming round rerolls
  while at least one active J103 exists; repeat suits are allowed. An all-Stone
  deck deterministically targets Spades without RNG. Each instance owns Chips.
- J127 uses one V6 run-shared Idol rank+suit. First acquisition and each upcoming
  round choose one non-Stone full-deck card uniformly; duplicate cards weight the
  result. All-Stone deterministically targets Ace of Spades without RNG. Each
  active source applies independently to matching scored cards.
- J102 decrements only after an active hand it retriggers and affects the tenth
  hand before self-destruction. Debuff pauses it. J130 resets its round factor to
  ×1 at round start and grows +0.5 per eligible discarded Jack. J137 increments
  once per defeated round. J148 carries `discardRemainder` across rounds and
  converts every full 23 cards into +1 factor, retaining surplus.
- J114 counts all blinds skipped this run, including before acquisition. J139
  counts distinct Planet content IDs successfully used this run, including
  before acquisition. J141 counts current full-deck enhanced cards, regardless
  of temporary debuff.

Target selection evidence comes from the secondary
[Castle](https://balatrogame.fandom.com/wiki/Castle) and
[Idol](https://balatrogame.fandom.com/wiki/The_Idol) pages; the 23-card quotient
and remainder contract follows the current
[Yorick](https://balatrogame.fandom.com/wiki/Yorick_%28Joker%29) behavior.

### 3.9 Phase order

Played hand:

1. validate restrictions and freeze layout/hand/card/Boss facts;
2. resolve before-hand and construct card/retrigger passes;
3. score each card left-to-right, including J101/J104/J106/J109/J115-J119/
   J127/J147 and copied routes;
4. score held passes including J140;
5. apply pre-output growth already caused by card passes (J124), then independent
   outputs left-to-right (J103/J105/J108/J110/J114/J120/J122-J138/J141/J145-J148);
6. perform post-score Glass/card destruction and emit destruction growth;
7. evaluate win, J107 survival, after-hand effects, zones/history, reward/loss,
   invariant, and one checkpoint.

Discard:

1. freeze discarded identities and classify the discarded set;
2. apply modifier lifecycle, then J103/J130/J144/J148 left-to-right against the
   immutable snapshot;
3. apply any proposed destruction, draw replacement, validate, checkpoint.

Round/shop:

1. blind selection resolves creations (J142), resources, target projection, and
   opening draw/card insertion (J112);
2. round end resolves ordinary effects, J137 readiness/J139 payout, stickers,
   rewards, Boss-result J105 reset, and next-round target rotation;
3. shop entry/materialization/repricing uses current J121/J143 capabilities;
4. accepted shop exit resolves J150, then Boss `ante-ended` if applicable, then
   advances the lineup and checkpoints.

## 4. Frozen row ledger

Every row also owns the standard contracts
`contract:joker:jNNN:{positive,boundary,debuffed}`. The fixture column names
additional interaction coverage; names are stable test identifiers.

### 4.1 J101-J125

| ID / original name | Rarity / cost / availability | Executable Chinese rule | Hooks and durable state | Copy / sticker | Named interaction fixture |
|---|---|---|---|---|---|
| J101 双频铜筒 | Common / 4 / always | 每张参与计分的 10 或 4 给予 +10 筹码和 +4 倍率。 | `scored-card`; no state | O | `j101-ten-four-retrigger` |
| J102 十沫汽壶 | Uncommon / 6 / always | 接下来 10 次出牌中，每张参与计分的牌额外触发 1 次；第 10 次结算后自毁。 | card retrigger + after-hand; `remainingHands=10` | T / E− | `j102-tenth-hand-before-dissolve` |
| J103 四旗守垒 | Uncommon / 6 / always | 每弃掉 1 张当前目标花色牌，永久获得 +3 筹码；目标花色每回合重选。（当前 +0 筹码） | discard + independent + round target; `chips=0`, V6 suit | O / P− | `j103-weighted-suit-stone-fallback` |
| J104 笑面迎宾 | Common / 4 / always | 每张参与计分的有效人头牌给予 +5 倍率。 | `scored-card`; no state | O | `j104-face-projection-retrigger` |
| J105 售签炉火 | Rare / 9 / always | 出售奇牌或消耗牌后获得 ×0.25 倍率；击败班主后重置为 ×1。（当前 ×1） | item-sold + independent + Boss result; `factor=100` | O | `j105-deliberate-sale-boss-reset` |
| J106 金叶戏券 | Common / 5 / deck contains 金叶 | 每张参与计分的 金叶牌给予 4 戏票。 | `scored-card`; no state | T | `j106-gold-retrigger-money` |
| J107 余命骨灯 | Uncommon / 5 / always | 最后一次出牌未达目标但总分至少为目标的 25% 时，自毁并通过本盲注；不获得基础盲注赏金。 | blind-survival; no state | N / E− | `j107-quarter-target-no-base-reward` |
| J108 末手飞人 | Uncommon / 6 / always | 本回合最后一次出牌给予 ×3 倍率。 | independent; no state | O | `j108-final-hand-order` |
| J109 花面回台 | Uncommon / 6 / always | 每张参与计分的有效人头牌额外触发 1 次。 | `scored-card`; no state | T | `j109-face-retrigger-copy` |
| J110 众价佩刀 | Common / 4 / always | 给予等同于其他所有已持有奇牌当前出售价值总和的倍率。 | independent; derived sale-value snapshot | O | `j110-other-sale-value-snapshot` |
| J111 长袖歌伶 | Uncommon / 6 / always | 手牌上限 +2；每回合出牌次数 −1。 | passive; derived deltas | N | `j111-round-resource-freeze` |
| J112 封印入场 | Uncommon / 6 / always | 回合开始时，将 1 张随机点数与花色、带 1 枚随机封印的牌加入完整牌组并直接放入手牌。 | round-start; generated card + seal | T | `j112-sealed-card-overflow-copy` |
| J113 朱玄染幕 | Uncommon / 7 / always | 红桃与方片视为同一花色；黑桃与梅花视为同一花色。 | passive suit equivalence | N | `j113-color-equivalence-all-suit-checks` |
| J114 越盲旧鼓 | Uncommon / 6 / always | 本牌局每跳过 1 个盲注，给予 ×0.25 倍率。（当前 ×1） | independent; run history | O | `j114-skips-before-acquisition` |
| J115 首牌悬签 | Common / 4 / always | 本次出牌中第 1 张参与计分的牌额外触发 2 次。 | first scored card; no state | T | `j115-first-scoring-card-two-passes` |
| J116 方晶钱雨 | Uncommon / 7 / always | 每张参与计分的方片牌给予 1 戏票。 | `scored-card`; no state | T | `j116-diamond-money-retrigger` |
| J117 红玉心火 | Uncommon / 7 / always | 每张参与计分的红桃牌有 1/2 概率给予 ×1.5 倍率。 | `scored-card` listed chance | O | `j117-independent-copy-rolls` |
| J118 黑羽箭筹 | Uncommon / 7 / always | 每张参与计分的黑桃牌给予 +50 筹码。 | `scored-card`; no state | O | `j118-spade-suit-equivalence` |
| J119 墨玉和声 | Uncommon / 7 / always | 每张参与计分的梅花牌给予 +7 倍率。 | `scored-card`; no state | O | `j119-club-suit-equivalence` |
| J120 碎璃增辉 | Uncommon / 6 / deck contains 碎璃 | 每有 1 张 碎璃牌被永久摧毁，永久获得 ×0.75 倍率。（当前 ×1） | card-destroyed + independent; `factor=100` | O / P− | `j120-unified-destruction-next-score` |
| J121 重台班主 | Uncommon / 5 / always | 夜市与牌包可再次出现已持有或已展示的奇牌、纸术牌、星谱和幽戏牌。 | passive materialization permission | N | `j121-duplicate-scope-materialized-offer` |
| J122 四色花台 | Uncommon / 6 / always | 若参与计分的牌能用 4 张不同牌分别代表四种花色，给予 ×3 倍率。 | independent assignment fact | O | `j122-four-distinct-suit-assignment` |
| J123 右照工谱 | Rare / 10 / always | 复制右侧相邻奇牌的兼容效果。 | event-entry right route | R | `j123-right-router-chain-cycle` |
| J124 二点小将 | Rare / 8 / always | 每张参与计分的 2 使本牌永久获得 +8 筹码。（当前 +0 筹码） | scored-card growth + independent; `chips=0` | O / P− | `j124-growth-before-current-output` |
| J125 三退窄袖 | Uncommon / 7 / always | 每回合弃牌次数 +3；手牌上限 −1。 | passive; derived deltas | N | `j125-next-round-resources` |

### 4.2 J126-J150

| ID / original name | Rarity / cost / availability | Executable Chinese rule | Hooks and durable state | Copy / sticker | Named interaction fixture |
|---|---|---|---|---|---|
| J126 倍彩六骰 | Uncommon / 4 / always | 所有明确标注概率的游戏效果，其成功分子翻倍；多张本牌按 2 的幂叠加，最高为必定触发。 | passive listed-chance factor | N | `j126-beneficial-harmful-scope` |
| J127 巡牌神龛 | Uncommon / 6 / always | 每张参与计分且与本回合目标点数和花色同时相符的牌给予 ×2 倍率；目标牌每回合重选。 | scored-card + round target; V6 rank/suit | O | `j127-weighted-card-target-reload` |
| J128 异色双照 | Uncommon / 6 / always | 若参与计分的牌中有 1 张可视为梅花，且另有 1 张不同的牌可视为非梅花，给予 ×2 倍率。 | independent assignment fact | O | `j128-distinct-club-other-assignment` |
| J129 触禁红巾 | Uncommon / 7 / always | 打出的牌实际触发班主能力时，获得 8 戏票。 | boss-ability-triggered | T | `j129-actual-boss-trigger-only` |
| J130 弃将长路 | Rare / 8 / always | 本回合每弃掉 1 张非失效 J，本牌获得 ×0.5 倍率；回合开始时重置为 ×1。（当前 ×1） | discard + independent + round-start; `factor=100` | O | `j130-jack-count-reset` |
| J131 双人成契 | Rare / 8 / always | 若打出的牌包含对子，给予 ×2 倍率。 | independent hand fact | O | `j131-pair-contained-secret-hand` |
| J132 三人成阵 | Rare / 8 / always | 若打出的牌包含三条，给予 ×3 倍率。 | independent hand fact | O | `j132-three-kind-contained` |
| J133 四门成家 | Rare / 8 / always | 若打出的牌包含四条，给予 ×4 倍率。 | independent hand fact | O | `j133-four-kind-contained` |
| J134 长索列阵 | Rare / 8 / always | 若打出的牌包含顺子，给予 ×3 倍率。 | independent hand fact | O | `j134-straight-contained` |
| J135 同袍成部 | Rare / 8 / always | 若打出的牌包含同花，给予 ×2 倍率。 | independent hand fact | O | `j135-flush-contained-suit-equivalence` |
| J136 逆空飞将 | Rare / 7 / always | +250 筹码；手牌上限 −2。 | independent Chips + passive hand-size delta | O for Chips only | `j136-copy-chips-not-hand-size` |
| J137 无影替身 | Rare / 8 / always | 每击败 1 个盲注，准备度 +1；达到 2/2 后出售本牌，会随机复制另一张已持有奇牌。（当前 0/2） | round result + atomic sale clone; `roundsReady=0` | N / E− | `j137-negative-source-capacity-debt` |
| J138 左照灵感 | Rare / 10 / always | 复制最左侧奇牌的兼容效果。 | event-entry leftmost route | R | `j138-leftmost-router-chain` |
| J139 星路税吏 | Uncommon / 6 / always | 回合结束时，本牌局每使用过 1 种不同的星谱，获得 1 戏票。 | round-end; distinct run history | N | `j139-distinct-planets-before-acquisition` |
| J140 月后清歌 | Common / 5 / always | 每张留在手牌中的非失效 Q 给予 +13 倍率。 | held-card; no state | O | `j140-held-queen-retrigger` |
| J141 十六纹牒 | Rare / 7 / always | 若完整牌组中至少有 16 张带强化的牌，给予 ×3 倍率。 | independent; full-deck modifier count | O | `j141-sixteen-enhancements-debuff-independent` |
| J142 开盲纸卜 | Uncommon / 6 / always | 选择盲注后，若消耗牌栏位可容纳，生成 1 张随机纸术牌。 | blind-selected content creation | T | `j142-capacity-before-rng-copy` |
| J143 免票星官 | Uncommon / 8 / always | 夜市中的星谱和星谱牌包价格均为 0。 | passive shop pricing | N | `j143-zero-price-family-scope` |
| J144 首弃焚谱 | Rare / 8 / always | 每回合第一次弃牌时，将所弃牌组成的牌型提升 1 级。 | first discard classified hand | T | `j144-first-discard-classification-copy` |
| J145 五票提靴 | Uncommon / 7 / always | 每持有完整 5 戏票，+2 倍率；负债按 0 戏票计算。（当前 +0） | independent; current money projection | O | `j145-negative-money-floor` |
| J146 毁面白伶 | Legendary / 20 / legendary source | 每有 1 张非失效的有效人头牌被永久摧毁，本牌永久获得 ×1 倍率。（当前 ×1） | card-destroyed + independent; `factor=100` | O | `j146-all-face-destruction-snapshot` |
| J147 王后双谕 | Legendary / 20 / legendary source | 每张参与计分的 K 或 Q 给予 ×2 倍率。 | scored-card; no state | O | `j147-king-queen-retrigger-copy` |
| J148 廿三骨冢 | Legendary / 20 / legendary source | 每累计弃掉 23 张牌，本牌永久获得 ×1 倍率；多出的张数保留。（当前 ×1，进度 0/23） | discard + independent; `factor=100`, `remainder=0` | O | `j148-23-card-surplus-forced` |
| J149 缄令赤臣 | Legendary / 20 / legendary source | 当前班主的全部特殊能力失效。 | passive Boss disable | N | `j149-idempotent-disable-no-inversion` |
| J150 负印酒灵 | Legendary / 20 / legendary source | 离开夜市并选择下一回合时，随机复制 1 张已持有消耗牌，并为复制品赋予剪影彩面。 | shop-left content clone | T | `j150-frozen-pool-negative-zero-slot` |

## 5. Original presentation and illustration briefs

All final masters are 768×1024 portrait, text-free, local WebP. Each composition
uses the accepted 午夜百戏 palette/frame language but owns a unique focal key,
silhouette, pose, and stage arrangement. No brief may include readable card
symbols, gameplay numbers, logos, or reference-game motifs.

### 5.1 J101-J110 — 铜线急报 (`brass-dispatch`)

| ID / name | Unique focal composition | Flavor line |
|---|---|---|
| J101 双频铜筒 | Two crossed brass speaking tubes share one pulsing diaphragm; one large and one small bell mouth, diagonal composition. | `十点与四点，恰好接上同一根线。` |
| J102 十沫汽壶 | A lacquer soda kettle releases ten distinct luminous bubbles through a tiny encore stage, vertical countdown arc. | `十场泡沫，够全班再唱一遍。` |
| J103 四旗守垒 | A squat traveling watchtower rotates four colored silk flags above a growing stack of brass chips. | `旗色一换，旧墙仍记得每次弃守。` |
| J104 笑面迎宾 | A smiling porcelain usher mask opens a fan of warm footlights toward a procession of court silhouettes. | `门一开，花面先把掌声请进来。` |
| J105 售签炉火 | Torn sale tags feed a portable copper brazier whose multiplier dial grows brighter, with a crowned snuffer overhead. | `卖掉旧物，炉心才肯添火。` |
| J106 金叶戏券 | A gilded admission ticket passes through a scoring press and sheds exactly four coin sparks, centered horizontal motion. | `金叶一过闸，票钱便回了头。` |
| J107 余命骨灯 | A fragile bone lantern shields one last ember beneath a quarter-circle brass gauge, austere dark negative space. | `只剩四分之一，也够照到散场。` |
| J108 末手飞人 | A lone acrobat launches from the final empty hand-shaped platform into a triple-ring spotlight. | `最后一跃，才配得上三重喝彩。` |
| J109 花面回台 | A face mask steps through one curtain and immediately reappears through a second echo curtain. | `花面刚退，回声已经换好衣裳。` |
| J110 众价佩刀 | A curved appraisal sabre reflects many dangling price charms along its blade while excluding its own tag. | `众人的身价，都压在这一寸刃上。` |

### 5.2 J111-J120 — 四色巡游 (`four-color-procession`)

| ID / name | Unique focal composition | Flavor line |
|---|---|---|
| J111 长袖歌伶 | A singer's two enormous sleeves widen the hand-stage while one of four drumbeats fades behind her. | `袖能多留两客，曲却少唱一折。` |
| J112 封印入场 | A fresh blank playing-card silhouette descends by ribbon with one of four wax-seal shapes, forced into a crowded opening hand. | `新客带印，不等点名便入席。` |
| J113 朱玄染幕 | Two red dye streams merge across one half of a curtain while two black streams merge across the other, perfect bilateral split. | `朱归朱，玄归玄，旧花色都染进幕里。` |
| J114 越盲旧鼓 | A weathered drum rolls past skipped blindfolded gateposts, gaining one luminous ring at each untouched gate. | `不入的门，也会在鼓皮上留声。` |
| J115 首牌悬签 | The first card-shaped puppet hangs beneath three successive pull-cords while the rest wait unlit. | `头一位登台，绳师总肯多拉两回。` |
| J116 方晶钱雨 | A faceted diamond canopy refracts falling coins onto a single scoring lane, sharp crystalline silhouette. | `方晶一亮，零钱便认路。` |
| J117 红玉心火 | A heart-red gemstone furnace flips a two-sided ember coin before releasing a multiplier flame. | `半数心火，也足以烧红整幕。` |
| J118 黑羽箭筹 | A giant black feather arrow strikes a square chip target and bursts into fifty small brass tiles. | `黑羽落处，筹码自会列阵。` |
| J119 墨玉和声 | A dark club-shaped agate choir radiates seven red sound ribbons from a low circular stage. | `墨玉不高唱，七声仍压得住场。` |
| J120 碎璃增辉 | A cracked glass halo gathers shards from disappearing cards and thickens into layered multiplier light. | `每一片碎声，都替余光加重。` |

### 5.3 J121-J130 — 镜局重台 (`mirror-stage`)

| ID / name | Unique focal composition | Flavor line |
|---|---|---|
| J121 重台班主 | A ringmaster opens nested duplicate stalls inside mirrored proscenium arches, each stocked with repeated silhouettes. | `台子能重搭，客人也能再来。` |
| J122 四色花台 | Four different card-shaped dancers each carry one colored flower to separate corners of a square stage. | `四花须四手，少一人便不成台。` |
| J123 右照工谱 | A precise brass drafting device points one illuminated lens only toward the adjacent right-hand stage panel. | `右厢写什么，工谱便照着演什么。` |
| J124 二点小将 | A tiny armored performer marked only by two round pips stacks eight brass bricks beneath an oversized helmet. | `身量虽小，每次登台都添八分底气。` |
| J125 三退窄袖 | Three discard ribbons spill from a very narrow sleeve while one hand-shaped seat folds shut. | `退路多三条，袖口便要窄一寸。` |
| J126 倍彩六骰 | A lacquered six-faced die splits every probability beam into two, then four, then a solid guaranteed band. | `骰声翻倍，好运与坏运都听得见。` |
| J127 巡牌神龛 | A rotating shrine frames one exact rank-and-suit silhouette selected from a wheel of deck cards. | `神龛每夜巡一牌，只认那一副面孔。` |
| J128 异色双照 | Two separate mirrors catch a club-colored dancer and a contrasting-suit dancer, joined by one multiplier ribbon. | `两面不同的影，才照得出同一束光。` |
| J129 触禁红巾 | A red scarf snaps taut only when it crosses an active Boss mechanism, releasing eight coin sparks. | `禁令真被碰响，红巾才肯收钱。` |
| J130 弃将长路 | Discarded jack-like generals march along a road that adds half-rings to a round multiplier wheel before dawn resets it. | `弃一员将，长路便再宽半程。` |

### 5.4 J131-J140 — 百相压轴 (`grand-formation`)

| ID / name | Unique focal composition | Flavor line |
|---|---|---|
| J131 双人成契 | Two masked partners clasp matching ribbons beneath a doubled halo, intimate centered composition. | `两人对上眼，契书便自己合拢。` |
| J132 三人成阵 | Three performers form a triangular drum formation with a triple multiplier pulse at the center. | `三角一稳，台心便有三重回声。` |
| J133 四门成家 | Four gate-bearing figures close around one family lantern, creating a strong square fortress silhouette. | `四门都在，便是压得住场的家。` |
| J134 长索列阵 | Five rope knots ascend in an unbroken diagonal sequence toward a triple-ring finish. | `索上一步接一步，队形从不落空。` |
| J135 同袍成部 | A troupe in one continuous fabric color fans across the stage beneath a doubled crest. | `同袍同色，便能同声压轴。` |
| J136 逆空飞将 | A stunt performer hangs upside down above a huge 250-chip counterweight while two seats drop away below. | `倒着飞得更高，只是台下少两席。` |
| J137 无影替身 | A translucent understudy peels away from an empty costume after two moonlit round seals, leaving a copied figure behind. | `熬过两场，影子便学会替人留下。` |
| J138 左照灵感 | A rough ink-splash mirror sends all its attention to the far-left performer, asymmetrical sweeping brushwork. | `灵感从最左边起笔，再一路抄到台心。` |
| J139 星路税吏 | A celestial toll clerk stamps distinct star charts once each and drops one coin per unique route into a narrow box. | `旧星路不重收，新星路一条一票。` |
| J140 月后清歌 | A moon-crowned queen silhouette sings from the held-card balcony, sending thirteen thin red notes downward. | `王后不必登台，清歌照样落到分上。` |

### 5.5 J141-J150 — 星火终章 (`starfire-legend`)

| ID / name | Unique focal composition | Flavor line |
|---|---|---|
| J141 十六纹牒 | A ceremonial license unfurls sixteen glowing enhancement emblems around one triple multiplier seal. | `纹样凑足十六，旧牒才肯放行。` |
| J142 开盲纸卜 | A blind-selection bell cracks open into one floating paper divination card above an empty consumable niche. | `盲注才定，纸上的卦已经到了。` |
| J143 免票星官 | An observatory official erases price tags from star charts and celestial pack boxes with a comet brush. | `星官一挥笔，天图从此不收门票。` |
| J144 首弃焚谱 | The first discarded hand burns its poker silhouette into a music manuscript that rises one illuminated level. | `头一把弃牌，最适合拿来烧成新谱。` |
| J145 五票提靴 | Tall stage boots climb coin steps grouped in fives, producing two red beats at every completed step. | `五票垫一层，靴跟便响两声。` |
| J146 毁面白伶 | A legendary white-robed performer gathers shattered face masks into an ever-growing luminous multiplier mantle. | `面孔碎得越多，白衣越显得有名。` |
| J147 王后双谕 | A king and queen issue mirrored decrees from opposite balconies, each casting a double halo onto scoring cards. | `王与后各下一谕，台上便多一重天。` |
| J148 廿三骨冢 | Twenty-three small bone tokens spiral into a monumental grave mound while surplus tokens wait on the next ring. | `二十三骨成一冢，多出的留给下一夜。` |
| J149 缄令赤臣 | A crimson legendary minister seals an enormous Boss command machine with one silent black ribbon. | `赤臣不驳令，只让令再也发不出声。` |
| J150 负印酒灵 | A spectral wine spirit pours one owned consumable silhouette through a dark cutout press, producing a zero-slot shadow copy. | `离店前饮一盏，旧牌便多出一道剪影。` |

## 6. Mandatory cross-row fixture set

In addition to the row fixtures above, the following shared suites are normative:

- `copy-graph-right-left-anchor`, `copy-graph-router-chain`,
  `copy-graph-dynamic-cycle-noop`, `copy-graph-event-layout-freeze`,
  `copy-graph-partial-facet`, `copy-graph-sold-router`, and
  `copy-graph-debuff-budget` across J001-J150.
- `listed-chance-stacked-benefit`, `listed-chance-stacked-harm`,
  `listed-chance-zero-and-certain-no-rng`, `listed-chance-copy-retrigger`, and
  `listed-chance-selection-scope-exclusion`.
- `suit-equivalence-flush-and-predicates`, `four-role-distinct-assignment`, and
  `club-other-distinct-assignment` with Wild, Stone, debuff, and J113.
- `destroy-glass-and-face-same-event`, `destroy-multi-card-source-order`,
  `destroy-zone-mirror-atomicity`, and `destroy-late-failure-rollback`.
- `boss-trigger-enabled-disabled`, `boss-passive-idempotent`,
  `survival-quarter-threshold`, `survival-no-base-reward`, and
  `survival-not-deck-exhaustion`.
- `duplicate-shop-pack-scope`, `sale-clone-state-sticker-edition`,
  `sale-clone-negative-capacity-debt`, `negative-consumable-zero-slot`, and
  `shop-left-frozen-target-pool`.
- `v5-to-v6-no-rng`, `v2-to-v6-forward-chain`, `v5-snapshot-immutability`,
  `v6-recovery-export-import`, and `v6-random-target-reload-equivalence`.

These identifiers must appear in machine-readable coverage metadata and map to
named tests; a generic loop count alone is not acceptance evidence.

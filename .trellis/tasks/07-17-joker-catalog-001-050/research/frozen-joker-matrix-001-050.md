# Frozen Joker Matrix 001-050

## Evidence boundary

This matrix freezes the product-approved Balatro v1.0.1o collection order as an
internal mechanical research index. It was rechecked on 2026-07-19 against the
[complete Joker table](https://balatrogame.fandom.com/wiki/Jokers), selected
interaction pages, the [activation sequence](https://balatrogame.fandom.com/wiki/Guide%3A_Activation_Sequence),
and the independent [v1.0.1o catalog index](https://balatrohq.com/jokers/).

Those community sources are secondary evidence. Every rule below is paraphrased
into a project-owned deterministic contract and must be proved independently by
fixtures. Reference names, descriptions, art, IDs, data structures, defects, and
save behavior are not shipped and are not compatibility targets.

## Frozen count ledger

| Property | Frozen value |
|---|---:|
| Rows | 50 |
| Stable IDs | `bxqp:joker:001` through `bxqp:joker:050` |
| Common (`common`, 常见) | 36 |
| Uncommon (`uncommon`, 少见) | 14 |
| Rare / Legendary | 0 |
| Available from the beginning | 50 |
| Additional appearance condition | J032 requires at least one `bxqp:enhancement:silk-shadow` card in the full deck |
| Discovery trigger | First acquisition of that stable ID |
| Visual ensembles | 5 groups of 10 |
| Local unique illustrations | 50 |

All rows are part of ordinary Joker shop and Buffoon-equivalent pack sources
unless another run rule bans that source. Availability controls whether a row can
be offered; discovery controls collection presentation and never blocks a first
offer. This batch emits discovery observations. Profile-level persistence and the
masked collection browser remain owned by the later progression task.

## Shared semantic rulings

### Hand and card facts

- “Contains” checks every valid subhand among all played cards, not only the
  highest displayed hand label. A stronger hand may therefore contain Pair,
  Three of a Kind, Straight, or Flush facts at the same time.
- With J018 active, Straight and Flush need four cards. A five-card play may form
  a Straight Flush from one four-card Straight subset and a different four-card
  Flush subset. Multiple J018 instances do not reduce either size below four.
- A scored-card effect runs only for `scoringCardIds`, once per scoring pass.
  Retriggers insert immediate additional passes for that same card before moving
  to the next card.
- Effective face status is shared by Joker predicates and blind debuffs. J037
  makes every playing card a face card without changing rank or suit. A debuffed
  J037 does not. A debuffed scored card supplies no card effect.
- Rank values for J029 are 2-10, face cards 10, and Ace 11. Stone-like cards are
  ignored. Among equal lowest ranks, the rightmost card in current hand order is
  selected; if it is debuffed it contributes zero. Held-card retriggers repeat
  that selected card's contribution.
- J048 succeeds for an empty held hand. Wild-equivalent cards qualify. A
  Stone-like held card fails. A debuffed Wild card uses its printed suit.

### Timing and persistent state

- J025 uses the run-wide played-hand count including the hand being resolved and
  activates when that count is divisible by six.
- J043 counts all prior matching hands plus the current hand; buying it late is
  retroactive.
- J044 updates before its independent scoring output: a safe hand gains one and
  uses the new value; a scoring effective face card resets it to zero before
  output. Debuffed face cards do not reset it.
- J045 rolls and, on success, raises the played hand before base Chips/Mult are
  evaluated, so the current hand benefits.
- J049 gains 15 before independent output when the current play contains a
  Straight, so the triggering hand benefits.
- J050 supplies 100 Chips on its first hand, then loses 5 after each played hand.
  It destroys itself without sale payout immediately after reaching zero.
- J035 and J046 resolve at round end before interest is calculated. Their money
  or sell-value changes survive save/reload and may affect that round's economy.
- J024 creates its card after the initial round draw has been materialized. The
  new card joins the permanent full deck but cannot be drawn during that round.

### Randomness and capacity

- Random sources resolve left-to-right by Joker position, then card scoring order,
  then retrigger pass. Each eligible activation consumes exactly one declared
  PRNG draw.
- A missing eligible target or full destination capacity consumes no RNG. For
  J026, capacity is checked again after every successful creation, so later 8s do
  not roll once the consumable area becomes full.
- Every roll, selected/generated ID, state update, and destruction is included in
  the proposed checkpoint before presentation. Reloading never rerolls it.

### Copy, debuff, and destruction policy

The matrix uses three future-facing copy policies:

- `output`: a copy source may repeat the current scoring output but never owns or
  doubles the target's persistent mutation.
- `trigger`: a copy source repeats the stateless trigger, including an independent
  RNG/capacity check when relevant.
- `none`: passive rule or source-local lifecycle behavior is not copyable.

All original abilities are suppressed while their Joker instance is debuffed.
Edition slot contribution, sticker restrictions, sale value, and being counted by
another row are instance metadata and remain visible to those external rules.

- Permanent sticker is allowed on every row except J038 and J050.
- Perishable sticker is allowed on every row except J021, J044, and J049.
- Destruction never pays sale value.
- J021 cannot destroy a permanent right neighbor and gains nothing when
  destruction fails.
- J038 successful extinction records `bxqp:history:joker-038-extinct` for the
  later J061 availability contract.

## 001-010 — 主台笑匠

| ID | Original zh-CN name | Rarity / cost | Shipped rules copy | Executable behavior mapping |
|---|---|---|---|---|
| J001 | 开场喝彩 | 常见 / 2 | `+4 倍率。` | `joker-independent`; fixed add-Mult 4; copy `output`; no state. |
| J002 | 晶灯笑客 | 常见 / 5 | `每张参与计分的方片牌给予 +3 倍率。` | `scored-card`; effective suit `diamonds`; add-Mult 3 per pass; copy `output`. |
| J003 | 绛心花旦 | 常见 / 5 | `每张参与计分的红桃牌给予 +3 倍率。` | `scored-card`; effective suit `hearts`; add-Mult 3 per pass; copy `output`. |
| J004 | 墨锋武生 | 常见 / 5 | `每张参与计分的黑桃牌给予 +3 倍率。` | `scored-card`; effective suit `spades`; add-Mult 3 per pass; copy `output`. |
| J005 | 青梅饕客 | 常见 / 5 | `每张参与计分的梅花牌给予 +3 倍率。` | `scored-card`; effective suit `clubs`; add-Mult 3 per pass; copy `output`. |
| J006 | 对口笑场 | 常见 / 3 | `若打出的牌包含对子，+8 倍率。` | `joker-independent`; hand fact `contains-pair`; add-Mult 8; copy `output`. |
| J007 | 三声迭笑 | 常见 / 4 | `若打出的牌包含三条，+12 倍率。` | `joker-independent`; hand fact `contains-three-kind`; add-Mult 12; copy `output`. |
| J008 | 双偶同台 | 常见 / 4 | `若打出的牌包含两对，+10 倍率。` | `joker-independent`; hand fact `contains-two-pair`; add-Mult 10; copy `output`. |
| J009 | 连步登台 | 常见 / 4 | `若打出的牌包含顺子，+12 倍率。` | `joker-independent`; hand fact `contains-straight`; add-Mult 12; copy `output`. |
| J010 | 一色满堂 | 常见 / 4 | `若打出的牌包含同花，+10 倍率。` | `joker-independent`; hand fact `contains-flush`; add-Mult 10; copy `output`. |

## 011-020 — 面具幻术

| ID | Original zh-CN name | Rarity / cost | Shipped rules copy | Executable behavior mapping |
|---|---|---|---|---|
| J011 | 双影掌声 | 常见 / 3 | `若打出的牌包含对子，+50 筹码。` | `joker-independent`; `contains-pair`; add-Chips 50; copy `output`. |
| J012 | 三响铜面 | 常见 / 4 | `若打出的牌包含三条，+100 筹码。` | `joker-independent`; `contains-three-kind`; add-Chips 100; copy `output`. |
| J013 | 对对回声 | 常见 / 4 | `若打出的牌包含两对，+80 筹码。` | `joker-independent`; `contains-two-pair`; add-Chips 80; copy `output`. |
| J014 | 连环换脸 | 常见 / 4 | `若打出的牌包含顺子，+100 筹码。` | `joker-independent`; `contains-straight`; add-Chips 100; copy `output`. |
| J015 | 同彩覆面 | 常见 / 4 | `若打出的牌包含同花，+80 筹码。` | `joker-independent`; `contains-flush`; add-Chips 80; copy `output`. |
| J016 | 三言小戏 | 常见 / 5 | `若本手打出不多于 3 张牌，+20 倍率。` | `joker-independent`; played-card count `<=3`; add-Mult 20; copy `output`. |
| J017 | 空座剪影 | 少见 / 8 | `结算时，倍率乘以空奇牌栏位数量；计算空位时，本牌自身也计作 1 个空位。` | `joker-independent`; factor `jokerSlots - usedSlots + originalStencilCount`; minimum 1; copied instances do not add a counted slot; copy `output`. |
| J018 | 四幕成章 | 少见 / 7 | `顺子与同花只需 4 张牌即可成立；重复持有不叠加。` | Passive hand-evaluation capability; no score operation; copy `none`; recomputed from active owned sources. |
| J019 | 无声回演 | 少见 / 5 | `所有留在手中的牌，其“留在手中”能力额外触发 1 次。` | `held-card`; add one held pass; retrigger effects do not retrigger themselves; copy `trigger`. |
| J020 | 夜账面票 | 常见 / 1 | `允许戏票最低降至 -20。` | Passive affordability floor; copy `none`; removal stops new debt spending but does not invalidate an existing negative balance. |

## 021-030 — 幕后机关

| ID | Original zh-CN name | Rarity / cost | Shipped rules copy | Executable behavior mapping |
|---|---|---|---|---|
| J021 | 右厢断绳 | 少见 / 6 | `选择盲注时，若右侧紧邻有可销毁奇牌，销毁之，并将其出售价值的 2 倍永久加入本牌倍率。（当前 +0）` | `blind-selected` relative destroy then source-state add; `joker-independent` outputs stored Mult; permanent target blocks both; copy `output`; no Perishable. |
| J022 | 余签战鼓 | 常见 / 5 | `每剩余 1 次弃牌，+30 筹码。` | `joker-independent`; dynamic add-Chips `30 × discardsRemaining`; copy `output`. |
| J023 | 封箱登顶 | 常见 / 5 | `剩余弃牌次数为 0 时，+15 倍率。` | `joker-independent`; guard `discardsRemaining === 0`; add-Mult 15; copy `output`. |
| J024 | 石偶铸坊 | 少见 / 6 | `选择盲注时，将 1 张随机点数与花色、带石面强化的戏牌永久加入牌组。` | `blind-selected`; generate one underlying card with `stone-mask`; place in round discard zone; copy `trigger`. |
| J025 | 六拍机关 | 少见 / 5 | `每打出 6 手牌，本牌在第 6 手使倍率 ×4；随后重新计数。（初始还需 5 手）` | `joker-independent`; `(runHandsPlayed + 1) % 6 === 0`; multiply Mult by 4; copy `output`; no instance state. |
| J026 | 八角签筒 | 常见 / 5 | `每张参与计分的 8 独立进行 1/4 检定；成功且消耗牌区有空位时，生成 1 张纸戏牌。` | `scored-card`; rank 8; sequential capacity then chance then typed Tarot creation per pass; copy `trigger`. |
| J027 | 乱墨唱单 | 常见 / 4 | `每次结算本牌时，等概率获得 +0 至 +23 倍率。` | `joker-independent`; one inclusive uniform integer draw; add result; materialize roll; copy `trigger`. |
| J028 | 暮鼓返场 | 少见 / 5 | `若这是本回合最后 1 次出牌，所有打出的牌额外结算 1 次。` | `scored-card`; guard `handsRemaining === 1`; one immediate retrigger pass for every played scoring card; copy `trigger`. |
| J029 | 托底拳师 | 常见 / 5 | `留在手中的最低点数牌，在该牌结算时给予其点数 2 倍的倍率。` | `held-card`; ignore Stone, rightmost-lowest tie; add-Mult `2 × rankValue`; Mime/Red-Seal passes repeat; copy `output`. |
| J030 | 换摊转轮 | 常见 / 4 | `每次进入夜市时获得 1 次免费换摊；离开夜市后失效。` | `shop-entered`; set one-use free-reroll flag; duplicate instances do not stack uses; copy `none`. |

## 031-040 — 乐舞杂技

| ID | Original zh-CN name | Rarity / cost | Shipped rules copy | Executable behavior mapping |
|---|---|---|---|---|
| J031 | 螺旋拍板 | 少见 / 8 | `参与计分的 A、2、3、5、8 各给予 +8 倍率。` | `scored-card`; rank set `{A,2,3,5,8}`; add-Mult 8 per pass; copy `output`. |
| J032 | 绸弦共鸣 | 少见 / 7 | `完整牌组中每有 1 张绸影强化戏牌，本牌使倍率额外 ×0.2。（当前 ×1）` | `joker-independent`; factor `1 + 0.2 × fullDeckSilkShadowCount`; shop/pack eligibility requires count `>=1`; copy `output`. |
| J033 | 花面大鼓 | 常见 / 4 | `每张参与计分的花牌给予 +30 筹码。` | `scored-card`; shared effective-face predicate; add-Chips 30 per pass; copy `output`. |
| J034 | 群像和声 | 常见 / 4 | `每持有 1 张奇牌，+3 倍率。` | `joker-independent`; add-Mult `3 × ownedJokerCount`, including self, debuffed, and zero-slot instances; copy `output`. |
| J035 | 静袖钱铃 | 常见 / 4 | `回合结束时，若本回合未使用弃牌，每剩余 1 次弃牌获得 2 戏票。` | `round-end`; guard `discardsUsed === 0`; add money/reward line `2 × discardsRemaining`; copy `trigger`. |
| J036 | 低阶快板 | 少见 / 6 | `参与计分的 2、3、4、5 各额外结算 1 次。` | `scored-card`; rank set `{2,3,4,5}`; one immediate retrigger pass; copy `trigger`. |
| J037 | 万面合唱 | 少见 / 5 | `所有戏牌均视为花牌；其原点数与花色不变。` | Passive shared effective-face capability affecting Jokers and blinds; copy `none`. |
| J038 | 易断高弦 | 常见 / 5 | `+15 倍率。回合结束时进行 1/6 检定；成功则销毁本牌。` | `joker-independent` add-Mult 15, copy `output`; original `round-end` extinction roll only; no Permanent; emit J038-extinct history. |
| J039 | 双拍步 | 常见 / 4 | `参与计分的 2、4、6、8、10 各给予 +4 倍率。` | `scored-card`; even rank set; add-Mult 4 per pass; copy `output`. |
| J040 | 单拍跃 | 常见 / 4 | `参与计分的 A、3、5、7、9 各给予 +31 筹码。` | `scored-card`; odd rank set with Ace; add-Chips 31 per pass; copy `output`. |

## 041-050 — 夜场精怪

| ID | Original zh-CN name | Rarity / cost | Shipped rules copy | Executable behavior mapping |
|---|---|---|---|---|
| J041 | 首星书灵 | 常见 / 4 | `每张参与计分的 A 给予 +20 筹码与 +4 倍率。` | `scored-card`; Ace; ordered add-Chips 20 then add-Mult 4 per pass; copy `output`. |
| J042 | 花面钱灵 | 常见 / 4 | `每张参与计分的花牌独立进行 1/2 检定；成功获得 2 戏票。` | `scored-card`; effective face; one chance and money award per pass; materialize roll; copy `trigger`. |
| J043 | 旧调回声 | 常见 / 5 | `结算时，按本局截至当前手已打出该牌型的次数增加倍率。` | `joker-independent`; add-Mult `matchingHistoryCount + 1`; retroactive; copy `output`. |
| J044 | 无面夜行 | 常见 / 6 | `连续打出没有花牌参与计分的手牌时，本牌永久获得 +1 倍率；有花牌参与计分时重置为 +0。（当前 +0）` | Pre-independent source-state update then stored add-Mult; effective/debuffed face ruling; copy `output`; no Perishable. |
| J045 | 升调天灯 | 少见 / 5 | `打出手牌时进行 1/4 检定；成功则在计分前将该牌型提升 1 级。` | `before-hand`; independent roll per original/copied trigger; persist hand level before evaluation; copy `trigger`. |
| J046 | 封价钱匣 | 常见 / 4 | `回合结束时，本牌的出售价值永久增加 3。` | `round-end`; source-local `sellValueOverride += 3`; copy `none`; persists through save/reload. |
| J047 | 借更影客 | 少见 / 6 | `选择盲注时，获得 3 次出牌，并失去全部弃牌次数。` | `blind-selected`; add hands 3 then set discards 0; each copied trigger repeats hand gain, discard remains zero; copy `trigger`. |
| J048 | 玄幕墨妖 | 少见 / 6 | `若所有留在手中的牌都是黑桃或梅花，倍率 ×3。` | `joker-independent`; all-held predicate with empty/Wild/Stone/debuff rulings; multiply Mult 3; copy `output`. |
| J049 | 长索疾鬼 | 常见 / 5 | `打出的牌包含顺子时，本牌永久获得 +15 筹码。（当前 +0）` | Pre-independent source-state add then stored add-Chips; triggering hand benefits; copy `output`; no Perishable. |
| J050 | 燃尽纸灯 | 常见 / 5 | `+100 筹码；每打出一手牌后永久失去 5 筹码，降至 0 时销毁本牌。` | `joker-independent` stored add-Chips; original `after-hand` decrements then self-destroys at zero; copy `output`; no Permanent. |

## Illustration and flavor manifest

Every row resolves to `/assets/jokers/<ordinal>.webp` and a matching reviewed
provenance record under `public/assets/jokers/provenance/`. Target master size is
768×1024 portrait, locally optimized to WebP. Prompts forbid typography, logos,
watermarks, copied card frames, modern UI, and reference-game characters.
Gameplay names, costs, rarity, suit glyphs, counters, and effect text are DOM/SVG
overlays outside the raster.

### 001-010 art briefs

| ID / name | Unique focal composition | Flavor line |
|---|---|---|
| J001 开场喝彩 | A masked opening comic catches a burst of gold paper applause beneath one vermilion spotlight; frontal triangular silhouette. | `第一声锣，总要有人接住。` |
| J002 晶灯笑客 | A crystal-lantern juggler balances four angular clear lamps in a diagonal arc; cool white and brass against indigo. | `晶灯一亮，笑声便有了价。` |
| J003 绛心花旦 | A ribbon dancer turns inside a red silk loop, face hidden by a petal mask; circular composition and warm lacquer highlights. | `她把满场心跳系成一结。` |
| J004 墨锋武生 | An opera warrior cuts a black fan-shaped shadow with a long sleeve; hard vertical silhouette, silver edge light. | `锋不出鞘，影先喝彩。` |
| J005 青梅饕客 | A broad comic performer presents a green-plum banquet tray while tiny stage spirits steal morsels; low wide composition. | `一桌青梅，喂饱半场笑声。` |
| J006 对口笑场 | Two contrasting masked speakers lean toward one shared brass microphone gong; mirrored profiles, split red-blue light. | `你递半句，我接满堂。` |
| J007 三声迭笑 | Three receding paper masks release nested sound ribbons toward the viewer; deep tunnel perspective. | `第三声笑，从第一声背后回来。` |
| J008 双偶同台 | Two pairs of hand puppets cross on an X-shaped miniature stage, each pair tied by different silk cords. | `台上成双，台下也成双。` |
| J009 连步登台 | A comic tumbler climbs five floating stage blocks in one continuous S-curve; footprints glow brass. | `一步不落，笑便不断。` |
| J010 一色满堂 | Ten performers in varied silhouettes bow beneath one wash of cinnabar light; panoramic fan formation. | `灯色一合，满堂同声。` |

### 011-020 art briefs

| ID / name | Unique focal composition | Flavor line |
|---|---|---|
| J011 双影掌声 | A double-faced lacquer mask hovers between two oversized clapping paper hands; strong left-right symmetry. | `影子也会替你鼓掌。` |
| J012 三响铜面 | Three copper masks strike stacked gongs at different heights; cascading sparks form a descending rhythm. | `一面一响，三响压台。` |
| J013 对对回声 | Four half-masks pair across two rippling silk curtains; concentric echo rings join the pairs. | `两对回声，不肯各自散场。` |
| J014 连环换脸 | A chain of five original masks flips along a sweeping ribbon, each silhouette visibly distinct; no human face exposed. | `脸还未定，脚步已经连上。` |
| J015 同彩覆面 | A pale mask is submerged in one pool of saturated stage pigment while multicolored drips stop at the rim. | `今夜只借一种颜色。` |
| J016 三言小戏 | One tiny performer commands a vast empty stage using only three floating props; extreme scale contrast. | `话少三句，戏不少一分。` |
| J017 空座剪影 | A cut-paper performer stands inside the negative space of five empty theater chairs; bold hollow silhouette. | `空座越多，影子越响。` |
| J018 四幕成章 | Four hinged stage panels fold into a complete proscenium arch around a fifth loose panel; geometric overhead view. | `少一幕，也能成章。` |
| J019 无声回演 | A smooth white listening mask raises one finger while held-card shadows repeat behind it; no striped mime costume. | `不出一声，余音自会返场。` |
| J020 夜账面票 | A moonlit ticket clerk wears a ledger mask as twenty dark debt threads descend below the counter; vertical drop. | `账可以欠，夜不能停。` |

### 021-030 art briefs

| ID / name | Unique focal composition | Flavor line |
|---|---|---|
| J021 右厢断绳 | A backstage rigger cuts the right-hand fly-rope as a neighboring prop becomes golden Mult dust; asymmetric rightward action. | `右厢一落，左边便更重。` |
| J022 余签战鼓 | Unused paper discard slips strike a deep vermilion drum like drumsticks; chips scatter in measured rows. | `留下的签，都能再敲一响。` |
| J023 封箱登顶 | A sealed stack of prop trunks forms a mountain under a lone summit lantern; no loose discard papers remain. | `袖口一封，山顶便亮。` |
| J024 石偶铸坊 | A masked artisan pours moonlit stone into a playing-card-shaped puppet mold; sparks and stone dust frame the forge. | `新偶沉默，却压得住全场。` |
| J025 六拍机关 | A six-tooth brass escapement opens into four concentric light petals on its final click; macro mechanical view. | `前五拍蓄势，第六拍开门。` |
| J026 八角签筒 | An eight-sided wooden lot drum releases one glowing paper charm into an empty sleeve pocket; tilted dynamic composition. | `八角一转，纸灵自来。` |
| J027 乱墨唱单 | A runaway backstage ink press sprays twenty-four differently sized dots around a blank program sheet; chaotic spiral. | `唱单没写准，喝彩倒正好。` |
| J028 暮鼓返场 | A sunset drum casts a second complete shadow-performance behind the departing cast; horizon split composition. | `最后一鼓，叫全班再演一遍。` |
| J029 托底拳师 | A compact strongman lifts the lowest stage floorboard while taller cards remain overhead; low-angle weight composition. | `托住最低处，整台才站得稳。` |
| J030 换摊转轮 | A night-market carousel rotates three stalls while one brass reroll token floats untouched at its hub; circular top view. | `今夜第一次换摊，不收票。` |

### 031-040 art briefs

| ID / name | Unique focal composition | Flavor line |
|---|---|---|
| J031 螺旋拍板 | Five carved rhythm tiles spiral toward a central clapper, their spacing following a visibly expanding sequence. | `旧拍相加，生出新拍。` |
| J032 绸弦共鸣 | A masked musician plucks silver-silk strings that connect many shadowed cards across the full deck; wide radial resonance. | `一根绸弦，整副牌都听见。` |
| J033 花面大鼓 | A giant drum bears an original floral opera mask in relief while scored face silhouettes strike its rim. | `花面一到，鼓点就重。` |
| J034 群像和声 | A conductor stands before a fan of fifty distinct troupe silhouettes whose voices braid into one gold ribbon. | `每多一位，和声便厚一层。` |
| J035 静袖钱铃 | Folded sleeves remain perfectly still while untouched coin bells gather along their hems; serene horizontal balance. | `袖不动，钱铃自己响。` |
| J036 低阶快板 | A nimble clapper player sends four low note-ribbons bouncing twice across a floor-level track; rapid zigzag. | `低音最短，回身最快。` |
| J037 万面合唱 | A chorus of radically different masks projects one shared face-shaped beam over scattered playing cards. | `不是人人有面，是万物都能登台。` |
| J038 易断高弦 | One taut high string glows above a six-segment tuning wheel, fraying at the brightest point; suspenseful close-up. | `这一音很高，也只剩一线。` |
| J039 双拍步 | An acrobat crosses paired lantern platforms in even two-beat strides; repeated bilateral rhythm. | `双拍落地，步步有声。` |
| J040 单拍跃 | A lone dancer leaps across five odd-spaced hand drums, each landing throwing square chip sparks. | `单拍不齐，倒更会跳。` |

### 041-050 art briefs

| ID / name | Unique focal composition | Flavor line |
|---|---|---|
| J041 首星书灵 | A scroll spirit rises from an open stage ledger beneath one solitary star-lantern; Chips and Mult ribbons diverge. | `第一颗星，照亮两本账。` |
| J042 花面钱灵 | A floral-mask spirit flips brass coins through a half-lit gate, alternating light and dark paths. | `花面一笑，铜钱未必落空。` |
| J043 旧调回声 | An ancient melody ghost walks through nested rings of its own past performances; each ring grows denser. | `唱得越久，旧调越响。` |
| J044 无面夜行 | A faceless night walker leaves a growing trail of tally-lanterns until one floral mask erases them all. | `不见花面，脚步就不会停。` |
| J045 升调天灯 | A music-marked sky lantern lifts an entire miniature stage one tier upward before the curtain opens; upward diagonal. | `灯先升一尺，戏再开场。` |
| J046 封价钱匣 | A locked midnight cash chest accumulates three fresh brass seals around its rim under a sleeping spirit. | `不开匣，身价也会长。` |
| J047 借更影客 | A shadow performer unwinds three extra watch-wicks while knotting a discard fan shut; opposing hand gestures. | `借来三更，换走一袖退路。` |
| J048 玄幕墨妖 | An ink spirit gathers only spade- and club-shaped shadows beneath a black stage curtain; empty center remains luminous. | `玄幕之下，只认两种黑。` |
| J049 长索疾鬼 | A rope-walking ghost straightens a segmented luminous path while chip weights accumulate on its balancing pole. | `索越走越直，分量越走越重。` |
| J050 燃尽纸灯 | A paper stage lantern burns downward through twenty visible wick segments, turning final light into ash; no ice imagery. | `先借满灯，后还成灰。` |

## Required row-level fixtures

Every row receives at least:

1. one positive contract fixture proving exact numerical output and trace order;
2. one boundary fixture proving its false/no-target/no-capacity branch;
3. a debuffed-source fixture;
4. save/reload and deterministic replay coverage for any state or RNG consumer;
5. copy-policy coverage when the relevant future test double can express it;
6. named interaction fixtures for every shared ruling cited by that row.

Cross-row fixtures in this batch must explicitly cover J018+J009/J014,
J019+J029, J021+J046, J025+J047, J028+J036, J033/J042+J037,
J037+J044, and J048 with Wild/Stone/debuff states. Cross-batch dependency
fixtures record J038 -> J061 without defining or shipping J061.

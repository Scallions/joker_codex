# Joker 051-100 — Frozen Production Matrix

## 1. Normative boundary

This matrix is the executable content contract for `bxqp:joker:051` through
`bxqp:joker:100`. Implementation, tests, localization, current-value copy, art
provenance, and review fixtures must agree with it. A row change after task
activation requires an explicit PRD/design update and re-review.

The approved mechanical research index is the v1.0.1o order. The
[complete reference table](https://balatrogame.fandom.com/wiki/Jokers) and the
[v1.0.1o database](https://balatrohq.com/jokers/) are secondary evidence for
order, rarity, price, compatibility, and player-visible numbers. Named pages are
linked in the rulings below where they resolve material timing. 百戏奇牌 does not
ship reference names, translated descriptions, source code, frames, artwork, or
identity. The Chinese names, rules copy, flavor, IDs, assets, handler data, and
deterministic edge-case contracts below are project-owned originals.

Terms in this document:

- **output copy**: a compatible copier repeats the source's current score output;
  it never advances, resets, or destroys the source's persistent state.
- **trigger copy**: a compatible copier repeats the event action after ordinary
  capacity/target checks; each successful copied action has its own trace/RNG.
- **none**: the behavior is not copyable.
- **Permanent excluded**: the permanent sticker may not materialize on the row.
- **Perishable excluded**: the perishable sticker may not materialize on the row.
- **source active**: the source exists and is not debuffed at that exact event.

## 2. Frozen ledger

| Property | Frozen value |
|---|---|
| Stable IDs | `bxqp:joker:051` through `bxqp:joker:100` |
| Batch size | 50 |
| Rarity | 19 Common / 25 Uncommon / 6 Rare / 0 Legendary |
| Aggregate after batch | 230 non-奇牌 + 100 奇牌 = 330 rows |
| Unresolved reserved IDs | `bxqp:joker:101` through `150` only |
| Default availability | Always eligible in ordinary Joker pools |
| Additional availability | J061 requires J038 extinction; J089 requires 石面; J091 requires 吉结 |
| Discovery | First acquisition; discovery never gates the first offer |
| Permanent exclusions | J061, J077, J080, J094, J097, J100 |
| Perishable exclusions | J055, J058, J063, J064, J065, J068, J070, J074, J075, J091, J096, J098 |
| Rental eligibility | All 50 |
| Visual ensembles | 造化秘戏 / 失序机关 / 云路贵客 / 夜市账房 / 异兽散场 |

All fractional Mult state is stored as safe integer hundredths. For example,
`multFactorHundredths=125` renders and evaluates as `×1.25`; no cumulative binary
floating-point state is persisted.

## 3. Shared executable rulings

### 3.1 Transactions, snapshots, and RNG

1. Every accepted command first validates phase, selection, funds, capacity, and
   durable schema constraints, then builds one pure proposal. Rejection returns
   the original checkpoint and RNG state.
2. Each play/discard/use/open/skip/reroll/sale/blind-result event owns an immutable
   fact snapshot. Later destruction or transformation does not erase another
   source's eligibility within that same event.
3. Sources resolve by fixed phase and then left-to-right position. A source
   destroyed before its phase does not trigger. A source debuffed at its phase is
   skipped. Copy ancestry and the existing 10,000-operation budget still apply.
4. Capacity and non-random predicates are checked before RNG. A false predicate,
   full consumable/Joker area, empty eligible target pool, or rejected command
   consumes no draw. Every consumed draw/target/content choice is materialized.
5. A reload resumes committed choices; it never repeats an acquisition target,
   target-hand/rank/suit roll, chance roll, creation draw, or destruction draw.

### 3.2 Hand and card order

The played-hand proposal uses this order:

1. validate the hand against current blind/passive rules;
2. freeze printed/effective identities and the displayed hand;
3. capture any command-entry clone snapshot;
4. apply before-card Joker transformations left-to-right; the displayed hand and
   scoring membership do not change afterward;
5. score each scoring card left-to-right: current card Chips and card modifiers,
   then per-card Joker actions, then immediate retrigger passes;
6. score held-card passes;
7. update pre-output state (J058/J065/J075/J098), resolve independent Jokers
   left-to-right, and insert J092 after each exactly-Uncommon Joker;
8. apply after-hand card creation/destruction, move zones, append history, and
   checkpoint once.

J052 changes scoring membership to every played card but never changes the
displayed hand. A debuffed member stays in the scoring list for trace/order but
contributes no card Chips or card effects.

J068 removes an enhancement and J076 writes 金叶 before that card's own modifier
effect. Their source order matters: J076 left of J068 creates then removes 金叶;
J068 left of J076 removes the old enhancement then J076 writes 金叶. Seal,
edition, printed identity, and permanent bonus Chips are untouched. Stone loses
its no-rank/no-suit projection only after the already-frozen hand is classified.

J056 adds +5 permanent `bonusChips` after the current card pass has contributed
its existing Chips. The first pass does not use the new +5; an immediate
retrigger does. Every scoring/retrigger pass can add another +5. The bonus remains
after J056 is sold and is included in later full-state clones.

J078 selects the first non-debuffed scoring face card in scoring order. It
multiplies after that card's own enhancement and edition; every retrigger pass of
that same selected card repeats J078. Later face cards do not.

### 3.3 Creation, cloning, mutation, and destruction

- J051 clones the sole played card's command-entry printed rank/suit,
  enhancement, seal, edition, and permanent bonus Chips under a new stable card
  ID. It does not copy transient debuff/selection/zone flags. The clone is added
  after scoring and drawn into hand; the original follows ordinary discard or
  J054 destruction. Each successful clone emits one playing-card-added event.
- J051 and J054 both recognize a debuffed played card. J051's clone is created
  before J054 destroys the original, independent of Joker order. J054 destroys
  the 6 even when the consumable area is full; it creates no 幽戏牌 in that case.
- J067 creates Common Jokers sequentially up to current slot capacity using the
  ordinary deterministic materializer. A one-slot gap creates one; no gap
  consumes no RNG. Newly created sources do not retroactively join the already
  running blind-selected queue.
- J064 growth and destruction are independent. It gains `+50` hundredths on a
  Small/Big selection even with no target. It never targets itself and ignores
  Permanent Jokers; another J064 is eligible. J067 left of J064 can create a new
  destruction candidate, while J064 left of J067 cannot destroy a later creation.
- J068 only consumes non-debuffed scoring enhanced cards. Multiple J068 sources
  act left-to-right; only the first that sees the enhancement grows.
- J095 resolves discarded-card modifier effects first, then destroys the one
  card. Other discard Jokers still read the immutable pre-destruction snapshot.

### 3.4 Round targets and history

- J060 owns an independent `targetHand` per instance. Acquisition materializes it
  immediately; round end rerolls from ordinary hands plus secret hands already
  played at least once. Different instances may show different targets. A copied
  trigger uses the source target.
- J083 reads one run-shared target rank. First acquisition materializes the
  current-round target immediately. At round end, while any active J083 exists,
  the upcoming round's target is selected from one effective non-Stone card in
  the current full deck uniformly by card, so repeated ranks are proportionally
  more likely. If every card is Stone, the target is Ace without RNG. Multiple
  J083 sources share it and may each pay.
- J099 reads one run-shared target suit. First acquisition materializes the
  current-round target immediately. At round end, while any active J099 exists,
  the upcoming target is chosen uniformly among the three suits other than the
  current suit, so it never immediately repeats. Multiple J099 sources share it.
- J062 searches only the current round's accepted hands before the current hand.
- J075 compares the current displayed hand with global counts before the current
  hand. Every hand tied for the maximum is a reset hand. With no prior hands, the
  current type is treated as tied for maximum and resets/stays at ×1.
- J081 compares the current full-deck size with the V5 initial-deck size captured
  at setup: `max(0, initial - current) × 4` Mult. Acquisition time is irrelevant.
- J086 counts all successfully used 纸术牌 in this run, including uses before
  acquisition. J055 analogously grows only on future 星谱 uses because its state
  is instance-local.

### 3.5 Discard, pack, sale, debuff, and round end

- One player discard command or forced discard group is one discard action. J058
  loses 1 Mult per action (floor 0); J100 loses one hundredth per discarded card.
  J057 pays once when at least three non-debuffed effective face cards are in the
  same snapshot. J083 pays per matching non-Stone effective rank.
- J095's opportunity is consumed by the first discard action of the round. If
  that action has other than one card, it does nothing and cannot trigger later.
- `pack-opened` fires once after a paid/free pack successfully materializes.
  J085 checks capacity before its 1/2 roll. `pack-skipped` fires once when the
  player abandons the current pack, regardless of remaining picks; J063 grows
  once, not once per unchosen option.
- J096 grows after every successful shop reroll, including a free reroll. A failed
  affordability/phase check does not grow it.
- Sale-trigger sources are snapshotted before removal. J077 only disables the
  currently active Boss and does nothing beyond ordinary sale payout elsewhere;
  a debuffed J077 cannot disable it. J094 creates one `复签` on an active sale;
  a debuffed J094 does not. Compatible future copiers trigger only when the copier
  itself is sold while copying the row.
- J079 raises the sell value of every currently owned Joker (including itself)
  and consumable by 1. Target debuff does not matter; source debuff does.
- Round-end order is: ordinary Joker/card effects left-to-right; temporary value
  decrement/self-destruction; Boss-result growth/payout; sticker settlement;
  base and J084 interest lines; receipt commit. J074 grows by 2 before paying the
  defeated Boss round. A debuffed source neither changes state nor pays.
- J080 provides its current hand-size bonus for the completed round, then loses
  1 and destroys itself at 0. J097 loses 4 Mult and destroys at 0. J100 destroys
  immediately when discard loss reaches ×1.00.

### 3.6 Special score values

- J053 counts cards still in `round.drawPileIds` at its independent phase.
- J072 and J082 resolve on held-card passes and therefore repeat under existing
  held-card retriggers. Debuffed held cards do not trigger them.
- J091 grows once per 吉结 card pass when either or both of that pass's independent
  success checks succeed; a double success is still one +0.25. A retrigger is a
  new pass and can grow again.
- J092 fires ×1.5 immediately after every owned exactly-Uncommon Joker's place in
  the independent Joker sequence, even if that Uncommon is passive/economy or
  debuffed. Rare and Legendary do not qualify. J092 itself must be active. Each
  active J092 and compatible copied trigger adds its own ×1.5 at that position.
- J093 uses `max(0, current money) × 2` Chips at its independent phase.
- Each J084 adds a separate interest component of `$1 × floor(max(0,money)/5)`,
  capped separately by the current interest cap. Copies stack components; it
  does not alter the base interest rate or cap.

## 4. 051-060 — 造化秘戏

Visual vocabulary: paper embryos, mirrored props, alchemical stage machinery,
and cyan/vermilion transformation light.

| ID | Original zh-CN name | Rarity / cost | Shipped rules copy | Executable behavior mapping |
|---|---|---|---|---|
| J051 | 镜胎双生 | 稀有 / 8 | `若本回合第一次出牌仅打出 1 张戏牌，结算后将其完整复制品永久加入牌组并抽到手中。` | First-hand + exact-one snapshot; after-score full-state clone; added-card event; copy `trigger`; all stickers. |
| J052 | 满堂入戏 | 常见 / 3 | `每张打出的戏牌都参与计分；牌型仍按原规则判定。` | Passive `all-played-cards-score`; no repeated value under copies; copy `none`; all stickers. |
| J053 | 帷后余筹 | 常见 / 5 | `抽牌堆中每剩余 1 张戏牌，+2 筹码。` | Independent Chips `2 × drawPileIds.length`; copy `output`; all stickers. |
| J054 | 六爻焚偶 | 少见 / 6 | `若本回合第一次出牌仅打出 1 张 6，结算后销毁该牌；若消耗牌区有空位，再生成 1 张随机幽戏牌。` | First-hand/exact-one/printed-or-effective 6; destroy played original; capacity-gated Spectral-family creation; copy `none`; all stickers. |
| J055 | 星谱添辉 | 少见 / 6 | `每使用 1 张星谱，本牌永久获得 ×0.1 倍率。（当前 ×1）` | `consumable-used` family planet; state `multFactorHundredths=100`, +10; independent factor; copy `output`; Perishable excluded. |
| J056 | 旅痕刻筹 | 少见 / 5 | `每张参与计分的戏牌在每次结算后永久获得 +5 筹码。` | Per-scoring-pass mutate card `bonusChips += 5` after existing card output; copy `trigger`; all stickers. |
| J057 | 落面收赏 | 常见 / 4 | `一次弃牌中若弃掉至少 3 张非失效花牌，获得 5 戏票。` | Discard snapshot; effective face and not debuffed count >=3; one money award; copy `trigger`; all stickers. |
| J058 | 青藤台账 | 常见 / 4 | `每打出一手牌，本牌永久获得 +1 倍率；每次弃牌永久失去 1 倍率，最低为 +0。（当前 +0）` | Before independent `storedMult +=1`, current hand benefits; discard action decrement 1 floor 0; copy `output`; Perishable excluded. |
| J059 | 首尾叠桥 | 常见 / 4 | `若打出的牌包含顺子与 A，且消耗牌区有空位，生成 1 张随机纸术牌。` | Hand contains Straight + any played effective Ace; capacity before content draw; copy `trigger`; all stickers. |
| J060 | 换目戏单 | 常见 / 4 | `打出指定牌型时获得 4 戏票；指定牌型在每回合结束时随机更换。（当前：高牌）` | Per-instance materialized `targetHand`; displayed-hand equality money 4; independent round-end reroll; copy `trigger`; all stickers. |

## 5. 061-070 — 失序机关

Visual vocabulary: broken escapements, self-eating machines, black brass,
unstable neon, and asymmetric backstage rigging.

| ID | Original zh-CN name | Rarity / cost | Shipped rules copy | Executable behavior mapping |
|---|---|---|---|---|
| J061 | 劫后金果 | 常见 / 4 | `倍率 ×3。回合结束时进行 1/1000 检定；成功则销毁本牌。` | Available only after persisted J038-extinct observation; independent ×3 output; original round-end chance/self-destroy; copy `output`; Permanent excluded. |
| J062 | 回手利刃 | 少见 / 6 | `若本回合此前已打出过当前牌型，倍率 ×3。` | Displayed hand exists in current-round prior hands; current is not counted for predicate; copy `output`; all stickers. |
| J063 | 空匣红签 | 常见 / 5 | `每跳过 1 个已打开的卡包，本牌永久获得 +3 倍率。（当前 +0）` | `pack-skipped` once per pack; state `storedMult +=3`; independent output; copy `output`; Perishable excluded. |
| J064 | 狂轮吞座 | 少见 / 7 | `选择小盲注或大盲注时，本牌永久获得 ×0.5 倍率，并随机销毁另一张非永久奇牌。（当前 ×1）` | Non-Boss blind select; +50 hundredths regardless target; random eligible non-source destruction; copy `output`; Perishable excluded. |
| J065 | 四方积木 | 常见 / 4 | `若本手恰好打出 4 张牌，本牌永久获得 +4 筹码。（当前 +0）` | Exact played count 4, including non-scoring/debuffed cards; pre-independent state +4 and current output; copy `output`; Perishable excluded. |
| J066 | 合脉招魂 | 少见 / 6 | `若本手牌型为同花顺，且消耗牌区有空位，生成 1 张随机幽戏牌。` | Displayed hand exactly straight-flush; capacity before draw; copy `trigger`; all stickers. |
| J067 | 开台散班 | 常见 / 6 | `选择盲注时，依栏位空余依次生成至多 2 张随机常见奇牌。` | Blind-selected; sequential fixed-Common materialization up to capacity; new sources do not rejoin queue; copy `trigger`; all stickers. |
| J068 | 饮华夜爵 | 少见 / 7 | `每张参与计分且带强化的非失效戏牌，在结算前失去强化，并使本牌永久获得 ×0.1 倍率。（当前 ×1）` | Before-card left-to-right remove enhancement only; +10 hundredths per consumed card; hand facts frozen; independent factor; copy `output`; Perishable excluded. |
| J069 | 隔阶飞索 | 少见 / 7 | `顺子中相邻点数之间可相差至多 2；重复持有不叠加。` | Passive Straight maximum step 2; Ace boundary follows ordinary evaluator; copy `none`; all stickers. |
| J070 | 添牌幻灯 | 少见 / 7 | `每当 1 张戏牌永久加入牌组，本牌永久获得 ×0.25 倍率。（当前 ×1）` | One `playing-card-added` event per card; +25 hundredths; no trigger on transform/reload; independent factor; copy `output`; Perishable excluded. |

## 6. 071-080 — 云路贵客

Visual vocabulary: airborne inns, traveling patrons, cloud ledgers, moonlit
carriages, and soft gold against storm-blue skies.

| ID | Original zh-CN name | Rarity / cost | Shipped rules copy | Executable behavior mapping |
|---|---|---|---|---|
| J071 | 穷游符客 | 稀有 / 8 | `出牌时若持有不多于 4 戏票，且消耗牌区有空位，生成 1 张随机纸术牌。` | Money snapshot `<=4` before hand payouts; capacity then draw; copy `trigger`; all stickers. |
| J072 | 袖中王侯 | 稀有 / 8 | `每张留在手中的 K，在每次结算时给予 ×1.5 倍率。` | Held-card, effective non-debuffed King; every held retrigger pass; copy `output`; all stickers. |
| J073 | 九盏云钱 | 少见 / 7 | `回合结束时，完整牌组中每有 1 张印刷点数为 9 的戏牌，获得 1 戏票。` | Full-deck printed-rank 9 count, including enhanced 9s; end-round money; copy `none`; all stickers. |
| J074 | 步云钱筒 | 少见 / 6 | `回合结束时获得 1 戏票；每击败一次压轴盲注，今后的回合赏金永久增加 2 戏票。（当前 1）` | State `roundPayout=1`; defeated Boss adds 2 before same-round payout; copy `none`; Perishable excluded. |
| J075 | 避峰玄碑 | 稀有 / 8 | `若当前牌型不是此前全局打出次数最多的牌型，本牌永久获得 ×0.2 倍率；否则重置为 ×1。（当前 ×1）` | Compare pre-current global counts/ties; +20 or set 100 before output; current hand uses changed factor; copy `output`; Perishable excluded. |
| J076 | 镀夜花面 | 少见 / 7 | `每张参与计分的非失效花牌在结算前变为 金叶强化。` | Before-card effective face, not debuffed; replace enhancement with gold-leaf; source order with J068; copy `none`; all stickers. |
| J077 | 断冠力士 | 少见 / 5 | `在压轴盲注中出售本牌，可使当前班主能力在本回合失效。` | Pre-removal sale event; active non-debuffed source; set current-round boss-disabled and recompute target/restrictions; copy `trigger`; Permanent excluded. |
| J078 | 首面照灯 | 常见 / 5 | `本手第一张参与计分的非失效花牌，在每次结算时给予 ×2 倍率。` | Select first eligible scoring face; after card modifier; repeat on same card retriggers; copy `output`; all stickers. |
| J079 | 众物添价 | 少见 / 6 | `回合结束时，所有持有的奇牌与消耗牌出售价值永久增加 1；包括本牌。` | End-round inventory-wide sell-value +1; target debuff irrelevant; copy `none`; all stickers. |
| J080 | 五席云茧 | 少见 / 6 | `手牌上限 +5；每回合结束永久减少 1，降至 +0 时销毁本牌。（当前 +5）` | Passive hand-size from state `handSizeBonus=5`; round-end decrement/destroy; current hand is not trimmed immediately on loss; copy `none`; Permanent excluded. |

## 7. 081-090 — 夜市账房

Visual vocabulary: compact market stalls, abacuses, receipt spirits, coin lamps,
and amber-green mercantile light.

| ID | Original zh-CN name | Rarity / cost | Shipped rules copy | Executable behavior mapping |
|---|---|---|---|---|
| J081 | 瘦册掌柜 | 少见 / 6 | `完整牌组每比本局初始牌组少 1 张，+4 倍率。（当前 +0）` | `4 × max(0, V5.initialDeckSize - fullDeckSize)`; retroactive/dynamic; copy `output`; all stickers. |
| J082 | 袖面零钱 | 常见 / 6 | `每张留在手中的非失效花牌，在每次结算时独立进行 1/2 检定；成功获得 1 戏票。` | Held-card effective face; capacity irrelevant; chance/money per held pass; copy `trigger`; all stickers. |
| J083 | 点数回票 | 常见 / 4 | `每弃掉 1 张与本回合指定点数相同的非石面戏牌，获得 5 戏票。（当前：A）` | Shared weighted round target rank; discard snapshot effective-rank count ×5; copy `trigger`; all stickers. |
| J084 | 月息算盘 | 少见 / 5 | `回合结算时，每持有 5 戏票额外获得 1 戏票利钱；本效果单独受当前利钱上限限制。` | Separate interest component per source after end-round effects; same step/cap, no base-rule mutation; copy `none`; all stickers. |
| J085 | 开匣幻签 | 常见 / 4 | `每打开 1 个卡包，若消耗牌区有空位，进行 1/2 检定；成功生成 1 张随机纸术牌。` | `pack-opened`; capacity before chance and content draw; copy `trigger`; all stickers. |
| J086 | 旧符算命 | 常见 / 6 | `本局每成功使用过 1 张纸术牌，+1 倍率。（当前 +0）` | Dynamic count of typed Tarot-use observations, including before acquisition; independent output; copy `output`; all stickers. |
| J087 | 掌盘杂耍 | 常见 / 4 | `手牌上限 +1；重复持有可叠加。` | Passive dynamic hand-size +1 per active source; current excess hand is kept until next draw; copy `none`; all stickers. |
| J088 | 醉袖添签 | 常见 / 4 | `每回合弃牌次数 +1；重复持有可叠加。` | Passive round-start discard allowance +1 per active source; no mid-round retroactive leak after sale/debuff; copy `none`; all stickers. |
| J089 | 石仓筹主 | 少见 / 6 | `完整牌组中每有 1 张石面强化戏牌，+25 筹码。（当前 +0）` | Availability/full-deck modifier `stone-mask`; dynamic `25 × count`; copy `output`; all stickers. |
| J090 | 金更俸客 | 常见 / 6 | `回合结束时获得 4 戏票。` | End-round money 4 and reward line; copy `none`; all stickers. |

## 8. 091-100 — 异兽散场

Visual vocabulary: strange market beasts, closing-night debris, paper fur,
lacquer horns, edible props, and saturated final-curtain color.

| ID | Original zh-CN name | Rarity / cost | Shipped rules copy | Executable behavior mapping |
|---|---|---|---|---|
| J091 | 福铃狸奴 | 少见 / 6 | `每当 1 张吉结强化戏牌在一次结算中至少成功触发 1 项能力，本牌永久获得 ×0.25 倍率。（当前 ×1）` | Availability `lucky-knot`; one successful-modifier event per card pass; +25 hundredths; independent output; copy `output`; Perishable excluded. |
| J092 | 稀客签谱 | 稀有 / 8 | `每张少见奇牌完成自身结算后，额外给予 ×1.5 倍率。` | After-other-Joker hook for exact rarity uncommon, including passive/debuffed target; each active source/copy multiplies; copy `trigger`; all stickers. |
| J093 | 铜角钱兽 | 少见 / 6 | `每持有 1 戏票，+2 筹码；负债按 0 戏票计算。（当前 +0）` | Independent Chips `2 × max(0,money)` from current committed proposal state; copy `output`; all stickers. |
| J094 | 双响冰露 | 少见 / 6 | `出售本牌时生成 1 枚免费复签。` | Active pre-removal sale; add fixed `bxqp:tag:copy-next-tag`; no RNG; copy `trigger`; Permanent excluded. |
| J095 | 一弃当票 | 少见 / 6 | `若本回合第一次弃牌仅弃 1 张，先结算该牌弃牌能力，再销毁它并获得 3 戏票。` | First discard opportunity; exact one; modifier-before-destruction; immutable snapshot; copy `none`; all stickers. |
| J096 | 转摊闪账 | 少见 / 5 | `夜市每成功换摊 1 次，本牌永久获得 +2 倍率。（当前 +0）` | Post-success `shop-rerolled`, free rerolls included; state +2; independent output; copy `output`; Perishable excluded. |
| J097 | 酥火纸囊 | 常见 / 5 | `+20 倍率；每回合结束永久失去 4 倍率，降至 +0 时销毁本牌。` | State `storedMult=20`; independent output; round-end decrement/destroy; copy `output`; Permanent excluded. |
| J098 | 成双戏袍 | 少见 / 6 | `若打出的牌包含两对，本牌永久获得 +2 倍率。（当前 +0）` | Contains Two Pair; pre-independent state +2 and current hand benefits; copy `output`; Perishable excluded. |
| J099 | 四象古兽 | 稀有 / 8 | `每张参与计分且与本回合指定花色相符的非失效戏牌给予 ×1.5 倍率；指定花色回合结束时更换且不会连续重复。` | Shared target suit; scored-card effective suit, Wild can match; per pass factor; round-end non-repeat roll; copy `output`; all stickers. |
| J100 | 百丝汤魇 | 少见 / 6 | `倍率 ×2；每弃掉 1 张牌永久失去 ×0.01，降至 ×1 时销毁本牌。（当前 ×2）` | State `multFactorHundredths=200`; discard snapshot count decrement; immediate destroy at <=100; independent factor; copy `output`; Permanent excluded. |

## 9. Illustration and flavor manifest

Every row resolves to `/assets/jokers/<ordinal>.webp` and one reviewed sidecar
under `public/assets/jokers/provenance/`. Target master size is 768×1024 portrait,
optimized locally to WebP. Prompts forbid typography, logos, watermarks, copied
card frames, reference-game characters, and modern UI. Names, costs, rarity,
counters, and rules remain DOM/SVG overlays.

### 051-060 art briefs — 造化秘戏

| ID / name | Unique focal composition | Flavor line |
|---|---|---|
| J051 镜胎双生 | A paper embryo splits across a tall bronze mirror into two identical masked puppets, one still wet with cyan lacquer; strict bilateral composition. | `镜里先有第二声呼吸。` |
| J052 满堂入戏 | Five wildly different discarded stage props rush through one proscenium and each casts a scoring-gold shadow; deep funnel perspective. | `踏上台板的，都算一角。` |
| J053 帷后余筹 | A backstage keeper pours a long hidden deck from an indigo curtain into a blue ceramic counting bowl; narrow vertical cascade. | `帷后越厚，台前越沉。` |
| J054 六爻焚偶 | A lone six-jointed paper puppet burns inside a hexagonal brazier while a pale spirit card rises from the smoke. | `第六节骨，通往幽场。` |
| J055 星谱添辉 | A masked astronomer stitches fresh gold nodes into a dark scroll-map after each opened star folio; expanding spiral. | `每翻一页，天幕便亮一分。` |
| J056 旅痕刻筹 | A road-worn card pilgrim leaves five brass tally cuts on every stepping stone it crosses; low diagonal journey. | `走过一次，牌脚便更重。` |
| J057 落面收赏 | Three opera masks tumble together into a cashier's open sleeve while five coins leap upward; triangular fall. | `面一落，赏钱才肯露头。` |
| J058 青藤台账 | A living green vine writes rising hand marks and erases discard marks from a midnight ledger; split grow-and-recede composition. | `出手添一叶，退手落一叶。` |
| J059 首尾叠桥 | An ace-shaped lantern anchors one end of a five-step silk bridge, releasing a paper charm where the bridge closes. | `首尾一接，纸路便通。` |
| J060 换目戏单 | A revolving eye-shaped notice drum shows a different miniature stage scene on each panel; centered mechanical iris. | `今夜要演什么，由转目决定。` |

### 061-070 art briefs — 失序机关

| ID / name | Unique focal composition | Flavor line |
|---|---|---|
| J061 劫后金果 | A radiant gold fruit grows from the ashes of a snapped high string, with one nearly invisible fracture under it. | `旧种断绝，才结出这枚险果。` |
| J062 回手利刃 | A curved backstage blade follows its own previous cut through a paper hand silhouette; double-loop motion. | `第二刀，总认得第一刀的路。` |
| J063 空匣红签 | An abandoned booster chest collapses while three red tally slips fasten themselves to a small engine. | `匣中不要的，也能记到账上。` |
| J064 狂轮吞座 | A broken carnival wheel bites an adjacent empty chair as its central multiplier dial swells; violent off-center silhouette. | `轮子越疯，座位越少。` |
| J065 四方积木 | Four square stage blocks lock around a tiny chip furnace, adding one brass tooth to each side. | `四角合拢，分量便留下。` |
| J066 合脉招魂 | A straight ribbon and one-color silk stream cross into a luminous spirit gate; no human figure, precise X composition. | `两脉相合，幽客便有门。` |
| J067 开台散班 | A cracked casting machine ejects two tiny common masked performers toward vacant stage hooks. | `班子散着来，也能立刻开锣。` |
| J068 饮华夜爵 | A lacquered night noble drinks colored enhancement varnish from scored cards through thin crimson tubes; tall predatory profile. | `借走你的华彩，换成他的夜力。` |
| J069 隔阶飞索 | An acrobat leaps across rank platforms two steps apart on a slack luminous rope; wide zigzag silhouette. | `空一阶，脚下仍有路。` |
| J070 添牌幻灯 | A hovering glass lantern projects a larger multiplying apparition whenever a fresh playing card enters its beam. | `牌影一多，幻光便厚。` |

### 071-080 art briefs — 云路贵客

| ID / name | Unique focal composition | Flavor line |
|---|---|---|
| J071 穷游符客 | A penniless traveler with four coins or fewer walks a cloud road while a paper charm follows like luggage. | `盘缠见底，符纸才肯作伴。` |
| J072 袖中王侯 | Several crowned card silhouettes sit hidden inside enormous cloud sleeves, each releasing a deep multiplier halo. | `王侯不登台，也能压住全场。` |
| J073 九盏云钱 | Nine lanterns shaped from folded clouds rain one coin each into a suspended purse; arcing night sky. | `第九盏灯，只照钱落下。` |
| J074 步云钱筒 | A modest coin canister climbs cloud stairs, gaining two brass rings after passing each crowned storm gate. | `过一重压轴，赏钱便高两层。` |
| J075 避峰玄碑 | A dark monument walks around the most crowded mountain peak while its multiplier inscriptions grow on quieter paths. | `不登旧峰，碑文才会继续。` |
| J076 镀夜花面 | A masked artisan brushes molten gold leaf across a procession of face-card spirits before they reach the scoring lamp. | `花面过手，夜色也会镀金。` |
| J077 断冠力士 | A compact strongman snaps a tyrant's crown mechanism in half as his own sale tag falls away. | `卖掉一身力，换班主闭嘴。` |
| J078 首面照灯 | One square spotlight catches only the first face mask in a long scoring procession; later masks remain in shadow. | `头一张脸，独占整盏灯。` |
| J079 众物添价 | A traveling appraiser touches every Joker and consumable with one gold valuation wand, including the tag on their own robe. | `万物同涨，他也不例外。` |
| J080 五席云茧 | A cloud cocoon unfolds five extra theater seats, one dissolving into silk after each sunset. | `云茧宽五席，也只借五更。` |

### 081-090 art briefs — 夜市账房

| ID / name | Unique focal composition | Flavor line |
|---|---|---|
| J081 瘦册掌柜 | A thin shopkeeper measures a shrinking deck against the untouched first page of a ledger; negative space grows between them. | `册子越瘦，账上的声量越大。` |
| J082 袖面零钱 | Face masks hidden in hanging sleeves flip coins through alternating bright and dark gates; compact stall view. | `袖里有人，零钱未必睡着。` |
| J083 点数回票 | A receipt spirit stamps one rotating rank seal while identical discarded cards return as five-coin sparks. | `点数对上，废票也能回钱。` |
| J084 月息算盘 | A crescent abacus counts coins in groups of five, with a second capped rail glowing above the ordinary one. | `月下利钱，另走一档算盘。` |
| J085 开匣幻签 | A newly opened market box exhales a coin-flip moon and one uncertain paper charm toward an empty pocket. | `匣盖一响，幻签只来一半。` |
| J086 旧符算命 | A fortune clerk reads a towering trail of already-used paper charms, each becoming one red tally on a fan. | `旧符烧过，命数仍记得。` |
| J087 掌盘杂耍 | A market juggler balances one extra hand-shaped tray above a crowded row of cards; clean upward triangle. | `多一只盘，便多留一张。` |
| J088 醉袖添签 | A tipsy sleeve spirit pours one additional discard slip from a tilted wine gourd into the round ledger. | `酒多一口，退路多一张。` |
| J089 石仓筹主 | A warehouse master weighs many stone-masked cards, each dropping twenty-five square chips onto a floor scale. | `石面不说话，秤砣替它开口。` |
| J090 金更俸客 | A punctual night clerk receives exactly four coins beneath the final watch lantern; calm centered symmetry. | `更鼓一落，四枚不少。` |

### 091-100 art briefs — 异兽散场

| ID / name | Unique focal composition | Flavor line |
|---|---|---|
| J091 福铃狸奴 | A paper-furred cat beast bats a lucky-knot bell; each successful chime adds a quarter-ring to its halo. | `铃真响一次，狸奴便胖一圈。` |
| J092 稀客签谱 | A collector beast opens a rarity ledger as green uncommon guests pass, stamping a multiplier after each silhouette. | `稀客走过，谱上就重一笔。` |
| J093 铜角钱兽 | A broad brass-horned beast pulls a chip cart whose load doubles with every coin piled beneath its hooves. | `钱压得住角，角托得起筹。` |
| J094 双响冰露 | A frosted fantasy bottle cracks open on sale and releases one two-echo paper seal; no brand label or text. | `瓶只响一声，签会应两次。` |
| J095 一弃当票 | A pawn-beast accepts one lone discarded card, lets its seal flare, then cuts it into three coins. | `只收一张，先听它说完遗言。` |
| J096 转摊闪账 | A lightning-tailed clerk spins a market carousel; every completed turn writes two bright marks on its body. | `摊位一转，闪账添双。` |
| J097 酥火纸囊 | A puffed paper snack pouch bursts with twenty red sparks, losing four kernels of light at each closing bell. | `香气最盛时，也已经在散。` |
| J098 成双戏袍 | A strange two-legged robe grows two embroidered multiplier knots whenever two pairs of sleeves meet. | `成双的不只牌，还有衣褶。` |
| J099 四象古兽 | An ancient four-limbed beast circles four suit gates, choosing a different colored gate after every curtain fall. | `四门轮转，旧兽从不回头。` |
| J100 百丝汤魇 | A noodle-like paper nightmare coils around a bowl marked by one hundred tiny thread notches, thinning with every discarded card. | `一百根丝，够它慢慢散场。` |

## 10. Named interaction fixture matrix

Every listed fixture is normative. Names may be extended, not silently removed.

| Fixture ID | Required proof |
|---|---|
| `j051-j054-clone-before-destroy` | Sole 6 is cloned from command-entry full state, original is destroyed after scoring, clone enters hand, one added-card event, order-independent sources. |
| `j051-j056-clone-snapshot` | Same-hand Hiker growth is not in the command-entry clone; a later clone includes already committed bonus Chips. |
| `j051-j070-one-added-event` | One successful clone grows every active J070 exactly once; rejection/full invariant consumes no RNG or growth. |
| `j052-j056-all-played-score` | Padded non-hand cards join scoring and receive J056 growth without changing displayed hand. |
| `j056-retrigger-current-pass-order` | First pass uses old bonus, adds 5; retrigger uses the new bonus and adds another 5. |
| `j057-j083-j095-j100-discard-snapshot` | Seal/modifier effects occur first; money/count effects read the same original set; J095 destruction does not hide the card from peers. |
| `j058-discard-action-not-card-count` | Five-card discard removes one stored Mult; J100 removes five hundredths. |
| `j060-independent-targets-reload` | Two instances may differ, copied trigger uses source target, round reroll materializes, reload is identical. |
| `j061-requires-j038-extinction` | Ordinary J038 ownership/sale is insufficient; persisted self-extinction enables J061 across reload. |
| `j063-pack-skip-once` | Skipping with several options/picks remaining grows once; finishing picks/opening only does not. |
| `j064-j067-left-right` | J067-left creations may be destroyed; J064-left cannot target later creations; growth occurs even with empty eligible pool. |
| `j065-exact-four-all-debuffed` | Four played debuffed/non-scoring cards still grow J065 and the current hand receives new stored Chips. |
| `j068-j076-left-right` | Gold-then-strip versus strip-then-Gold; frozen hand type, seals/editions retained, multiple J068 only first consumes. |
| `j069-straight-gap-boundaries` | Valid one-rank gaps, invalid larger gaps, Ace-high/low boundary, duplicate sources do not widen again. |
| `j070-add-not-transform` | DNA/new-card effects grow; Gold/Stone transformations, load, and mirror synchronization do not. |
| `j074-boss-grow-before-pay` | Boss result raises payout by 2 before that receipt; non-Boss and debuffed source do not. |
| `j075-global-tie-reset` | All tied maximum types reset; alternative hand grows before scoring; save/reload preserves hundredths. |
| `j077-sale-boss-only` | Active sale disables current Boss and recomputes restriction/target; ordinary blind, debuffed sale, and non-sale destruction do not. |
| `j078-first-face-retrigger` | Only first eligible face selected; its retriggers repeat ×2 after modifier output; later faces do not. |
| `j079-all-inventory-values` | Self, other Jokers, and consumables gain one; debuffed targets still gain; debuffed source changes none. |
| `j080-j087-hand-size-recompute` | Stacking, debuff, sale, decrement, zero-destroy, pack hand size, and excess-hand-until-next-draw policies. |
| `j081-starting-size-late-acquire` | Initial size survives additions/removals and late acquisition; V4 migration baseline is explicit and deterministic. |
| `j083-weighted-shared-rank` | Repeated ranks have per-card weight, all-Stone falls back to Ace, copies share, reload does not reroll. |
| `j084-interest-components` | Base and multiple extra components each cap separately, use post-round money, negative money yields zero. |
| `j085-capacity-before-roll` | Full area consumes no chance/content RNG; open and skip are distinct events. |
| `j086-retroactive-tarot-history` | Earlier Tarot uses count, Planet/Spectral uses do not, copied output is equal. |
| `j088-round-resource-boundary` | Blind-selected creation affects upcoming round; mid-round sale/debuff does not rewrite already granted discards. |
| `j091-double-success-once` | One Lucky pass with two successes grows once; a retriggered successful pass grows again; failed pass does not. |
| `j092-after-each-uncommon` | Exact Uncommon only, including passive/debuffed target, multiplier immediately follows target; active copies stack. |
| `j093-negative-money-clamp` | Positive money scales, zero/negative gives zero, earlier same-hand money affects later position deterministically. |
| `j094-sold-copier-trigger` | Selling source or compatible active copier creates fixed 复签; debuffed/permanent-blocked/non-sale destruction does not. |
| `j095-first-discard-consumed` | Multi-card first discard consumes opportunity; later singleton does nothing; Purple-equivalent seal resolves before destruction. |
| `j096-free-and-paid-rerolls` | Both successful rerolls grow; rejected reroll preserves state/RNG. |
| `j097-five-round-lifetime` | 20→16→12→8→4→destroy; copied output does not duplicate decay. |
| `j098-triggering-hand-benefits` | Two-Pair containment (including higher displayed hand) grows before current output; non-Two-Pair does not. |
| `j099-shared-suit-no-repeat` | All copies share target, Wild matches, Stone/debuff does not, round target never immediately repeats across reload. |
| `j100-card-count-threshold` | Per-card loss, exact integer hundredths, immediate destruction at 100, copy output does not duplicate decay. |
| `batch-001-100-copy-debuff-order` | Representative old/new output, trigger, none, debuff, retrigger, destruction, and source-order behavior remains bounded. |

## 11. Per-row minimum coverage

Every row receives:

1. a positive fixture proving exact numerical output/state and trace position;
2. a boundary fixture proving its false, no-target, no-capacity, or threshold path;
3. a debuffed-source fixture;
4. copy-policy coverage, using the declared future copier double where needed;
5. save/reload and deterministic replay for every mutable or random row;
6. all named interaction fixtures referenced by its shared mechanism;
7. localization, current-value, asset, provenance, discovery, availability, and
   real shop/pack/table reachability assertions.

The batch gate also runs the complete 001-050 contract suite. A shared primitive
is not accepted merely because its new-row test passes.

## 12. Secondary evidence links

The following pages were used only to resolve mechanical timing/compatibility;
the frozen project rulings above remain the implementation authority:

- [single-card cloning](https://balatrogame.fandom.com/wiki/DNA)
- [single-6 destruction](https://balatrogame.fandom.com/wiki/Sixth_Sense)
- [first face-card retrigger](https://balatrogame.fandom.com/wiki/Photograph)
- [first-discard destruction](https://balatrogame.fandom.com/wiki/Trading_Card)
- [decaying hand-size source](https://balatrogame.fandom.com/wiki/Turtle_Bean)
- [independent target hands](https://balatrogame.fandom.com/wiki/To_Do_List)
- [weighted target rank](https://balatrogame.fandom.com/wiki/Mail-In_Rebate)
- [enhancement transform ordering](https://balatrogame.fandom.com/wiki/Midas_Mask)
- [Boss-disable sale](https://balatrogame.fandom.com/wiki/Luchador)
- [tag-creation sale](https://balatrogame.fandom.com/wiki/Diet_Cola)
- [after-Uncommon multipliers](https://balatrogame.fandom.com/wiki/Baseball_Card)
- [permanent card Chips](https://balatrogame.fandom.com/wiki/Hiker)

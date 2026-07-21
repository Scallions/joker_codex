# Fix Tutorial Joker Purchase and Improve Art Presentation

## Goal

Make the tutorial's Joker and booster-pack purchase steps completable through the
real shop flow, and let players appreciate locally generated card art at a useful
viewing size without obscuring gameplay-critical information.

## Background

- The user reports that the tutorial reaches a "购买奇牌" stage but the offered
  Joker cannot be purchased.
- Many high-quality generated assets are rendered too small in normal gameplay;
  the Joker illustration is the clearest example and its details are unreadable.
- Follow-up browser acceptance found that a targeted consumable can be chosen from
  the tutorial pack, but its `确认施行` action starts below the fixed 1280x720 stage.
  The only path to it is an undiscoverable nested scroll, which presents as a pack
  choice that cannot be completed.
- Candidate presentation improvements raised by the user include larger cards,
  using art as contextual background, and an explicit click-to-inspect view.

## Product Decisions

- The primary large-art interaction is a reusable click-to-inspect centered
  "stage frame". It preserves the artwork's 3:4 composition and shows the Chinese
  name, rarity, rules, committed current value, and flavor text.
- The inspector is presentation-only: opening, closing, or switching it dispatches
  no gameplay command and writes no checkpoint. Purchase/use/sell controls remain
  visible in their owning screen rather than moving into the inspector.
- Runtime thumbnails may be enlarged where space permits. Artwork is not used as
  the primary text background; a low-opacity ambient treatment may be used inside
  the inspector only when it does not reduce legibility.
- The first release covers all 150 approved Joker artworks across five
  player-facing surfaces: shop offers, shop-owned inventory, table Joker slots,
  Joker pack choices, and the player collection. Non-Joker deck/blind/tag/voucher
  SVG emblems are deferred because their aspect ratios and information hierarchy
  require a separate presentation contract.
- The tutorial purchase repair and the shared Joker inspector remain one task.
  They share the shop offer layout, presentation selectors, geometry checks, and
  release screenshots, so splitting them would duplicate the riskiest integration
  boundary without creating an independently deployable result.
- Supported viewport acceptance remains 1280x720 and 1920x1080. The shop must use
  explicit internal navigation when offers exceed its visible capacity; it may not
  silently clip descendants. A global redesign for desktop heights below 720px is
  deferred to a separate responsive-layout task.
- The shop separates its existing offer collections into two explicit local tabs:
  `单品 <count>` for card offers and `补充包 <count>` for pack offers. Each tab has
  capacity for a 2x2 grid. The selected tab is transient presentation state and is
  never persisted.
- A tutorial shop opens `单品` during step 6 and switches to `补充包` when the
  committed Joker purchase advances the profile to step 7. Non-tutorial shops
  default to `单品`; a player's tab choice lasts only for that mounted shop view.

## Confirmed Repository Evidence

- The tutorial deliberately creates four card-offer slots and four pack-offer
  slots (`src/tutorial/script.ts:130-131`). `ShopScreen` renders both collections
  into the same offer grid (`src/presentation/screens/ShopScreen.tsx:80,154`).
- That grid defines only two columns by two explicit rows and clips overflow
  (`src/presentation/screens/ShopScreen.module.css:138-153`). At the real tutorial
  shop on a 1280x720 viewport, pack cards cover the four Joker cards; hit-testing
  the visible coordinates of "购买 对对回声" reaches a pack's "封" element instead
  of the purchase button.
- The existing Chromium tutorial flow still passes because its role-based click
  (`tests/e2e/tutorial.spec.ts:189`) scrolls the clipped descendant into view. The
  test does not assert that the purchase target is visibly unobscured or directly
  hit-testable, so it does not represent the reported manual interaction.
- Approved Joker files are 768x1024. Their current rendered size is about 50x66px
  in shop offers (`ShopScreen.module.css:199`) and 41x60px on the table
  (`GameTableScreen.module.css:88`); the shop inventory uses another 50x66px copy.
- Pack-choice Joker art is larger (`DecisionScreen.module.css:116`), while the
  player collection uses a five-column grid with a 78px-tall art strip. There is no
  shared artwork inspector/lightbox component today.
- A shorter 1280x577 desktop viewport also clips blind-selection actions because
  the fixed-stage contents do not adapt below the two existing 720/1080 baselines;
  this is related evidence but is not yet included in task scope.
- At the supported 1280x720 baseline, the tutorial's 52-card target grid uses eight
  columns and seven rows. The enabled `确认施行` control begins around y=908 while
  the stage ends at y=720; `elementFromPoint` at its center therefore returns no
  target. Playwright's ordinary role click can scroll the nested choice screen and
  remains a false green unless the final action is checked directly.

## Requirements

- Preserve the tutorial's deterministic progression and ensure its Joker-purchase
  instruction can be completed with the visible real purchase control.
- Diagnose and fix the owning gameplay/UI contract rather than bypassing the
  tutorial gate or granting the Joker directly.
- Represent the tutorial shop's actual eight offers through the approved visible
  group navigation, and require the intended purchase control to be visible,
  unobscured, and hit-testable without hidden programmatic scrolling.
- Provide a reusable way to inspect important local artwork at a materially larger
  size with the card's Chinese name, rarity, rules, committed current value, and
  flavor. Price and gameplay actions stay on the unchanged owning screen.
- Open the shared inspector by activating the artwork itself, close it explicitly
  or through the backdrop/Escape path, and restore the unchanged owning screen.
- Apply the inspector to every Joker-bearing player surface: shop offer, shop
  inventory, table slot, pack choice, and collection row. Preserve route-specific
  gameplay controls and concealment rules.
- Do not reveal inspector triggers or data for undiscovered collection entries or
  table Jokers hidden by a concealment effect. Debuffed visible Jokers remain
  inspectable and keep their committed status visible on the owning screen.
- Keep runtime assets local; do not add remote requests or replace the approved
  generated files with lower-resolution substitutes.
- Load only the artwork required by the current route and opened inspector; do not
  eagerly decode or mount all 150 full-size Joker assets.
- Preserve deterministic commands, persistence, replay, tutorial isolation, and
  the existing fixed-stage/no-outer-scroll requirements.
- Keep the target-choice confirmation continuously visible inside the stage and
  directly hit-testable after a valid target is selected. A full playing-card
  target set should use the natural 13-rank by 4-suit desktop composition; only
  the target grid may scroll at narrower widths, never the owning confirmation.

## Acceptance Criteria

- [x] A fresh tutorial can reach the Joker-purchase instruction, buy the intended
      Joker through the visible shop control, advance exactly once, refresh, and
      continue without changing ordinary campaign progression.
- [x] At the tutorial shop, every required Joker and pack action has a distinct
      visible rectangle; `elementFromPoint` at the Joker purchase target resolves
      to that action rather than another offer, and no offer is silently clipped.
- [x] At both supported viewports, shop overflow is discoverable and operable with
      no outer page scroll; all offer groups can be reached through visible UI.
- [x] `单品` and `补充包` tabs show exact live counts, never render their offer
      grids on top of one another, and a tutorial step transition switches tabs
      only after the Joker purchase checkpoint commits.
- [x] Insufficient-money, sold-out, full-inventory, repeated-click, refresh, and
      persistence boundaries retain their normal typed behavior in tutorial and
      non-tutorial runs.
- [x] The stage-frame inspector preserves the 3:4 image without cropping and shows
      it at no less than 300x400 CSS pixels at 1280x720 and 384x512 CSS pixels at
      1920x1080, alongside the complete approved detail fields.
- [x] Purchase, pick, sell, reorder, and other gameplay actions are neither moved
      into nor duplicated by the inspector; closing it returns to the unchanged
      action state on the owning screen.
- [x] Opening and closing the stage-frame inspector changes no run/profile state,
      checkpoint, RNG, command count, or persisted data.
- [x] Representative Joker art can be inspected from every approved gameplay
      surface at 1280x720 and 1920x1080 in Chromium and WebKit.
- [x] All 150 approved Joker content IDs resolve through the same inspector data
      contract; representative common, uncommon, rare, legendary, owned, debuffed,
      and undiscovered/locked boundaries retain their intended visibility rules.
- [x] The inspection view uses only local approved assets, introduces no outer
      page scroll or unexplained overlap, and closes without mutating gameplay.
- [x] Collection filtering/lazy loading remains bounded: unopened inspector state
      does not mount a full-size copy of every Joker artwork.
- [x] Unit/component/integration/E2E regression tests cover the purchase defect and
      the final artwork interaction; intentional visual changes are reviewed.
- [x] The real eight-step tutorial completes in Chromium and WebKit at both
      supported viewports; booster purchase, `选此件`, target selection,
      `确认施行`, and shop exit are directly hit-testable with no hidden outer or
      whole-screen scroll required.

## Out of Scope

- Global responsive reflow for desktop viewports shorter than 720px.
- Large-art inspection for non-Joker SVG families.
- Persisting inspector or shop-tab presentation state.
- Moving purchase, sell, reorder, use, or pack-pick commands into the inspector.
- Regenerating or replacing approved local asset files.

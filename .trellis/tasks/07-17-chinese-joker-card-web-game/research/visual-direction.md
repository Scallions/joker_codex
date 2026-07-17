# Visual Direction: 午夜百戏

## Concept

百戏奇牌 takes place on a tiny midnight variety-show stage rather than a casino
table. The player is the unseen stage master arranging a succession of impossible
card tricks for an audience represented by shadowed paper-cut silhouettes.

The memorable signature is a circular vermilion stage seal beneath the active
hand. It behaves like a theatrical spotlight: each scoring layer stamps another
ring, glyph, coin mark, or paper flare into the seal until the final score breaks
outward. This replaces generic neon counters with a visual metaphor unique to
the product.

## Art Direction

- **Tone:** theatrical, mischievous, tactile, nocturnal, densely crafted.
- **Palette:** ink-indigo stage, vermilion action color, warm paper-ivory cards,
  aged brass/gold economy accents, jade utility accents, soot-black shadows.
- **Materials:** lacquered wood, handmade paper fibers, stamped foil, silk cords,
  carved brass, ink wash, and sparse electric glow.
- **Characters:** original masked comic performers, illusionists, musicians,
  acrobats, prop masters, and mischievous stage spirits. No clown mascot.
- **Typography:** characterful display lettering for titles and large scores;
  highly readable Chinese body face for dense descriptions. Bundle only fonts
  with verified redistribution rights, otherwise use an intentional local font
  stack and custom title lettering assets.
- **Cards:** ivory stock with visible fibers, strong rank/suit corners, a unique
  border language per catalog, and full-bleed original 奇牌 illustrations.

## Table Composition

Use a fixed 16:9 stage that scales inside the viewport rather than a scrolling
page. At 1280x720:

- top: five default 奇牌 slots as hanging stage placards, consumables offset to
  the upper-right, each with clear capacity marks;
- left: a narrow lacquered run ledger for ante, blind, hands, discards, money,
  target, and current score;
- center: opponent blind banner above the circular scoring seal and played cards;
- bottom-center: fanned player hand with sort and deck-inspection controls;
- right/lower-right: context actions rendered as physical stage tickets or seals;
- overlays: collection, deck, shop, packs, tutorial, profile, and run results use
  curtains, folding screens, or ledgers instead of generic glass cards.

The composition may overlap and break a strict grid, but gameplay hit targets and
critical numbers must remain stable across state transitions.

## Motion Language

- Cards lift with a crisp paper snap, slight perspective, and short silk-cord
  follow-through rather than floaty easing.
- Scoring is an ordered performance: hand name stamp, base chips, card strikes,
  held-card effects, 奇牌 placard triggers, multiplier drumroll, final seal burst.
- Purchases exchange a brass coin that travels from the ledger to the item.
- Destruction tears paper inward; transformation overprints a new stamp; copying
  creates a misregistered duplicate before snapping into alignment.
- Large transitions use stage curtains and lighting changes. Routine hover/focus
  motion stays restrained so high-impact score moments remain special.

## Sound Direction

- dry card flicks, paper rubs, wooden table taps, brass coins, seal stamps;
- short gong, clapper, and drum accents tied to score tiers rather than constant
  percussion;
- low-key original electronic loop with Chinese instrumental timbres, separated
  into music and SFX buses;
- deterministic gameplay never waits on audio completion.

## Asset Production Principles

- Generate or draw all shipped images specifically for 百戏奇牌.
- Maintain a manifest with source, license/ownership, prompt/source file, crop,
  dimensions, and owning content ID.
- Prefer a small number of reusable material textures and frames plus unique
  focal illustrations, avoiding 150 nearly identical templated cards.
- Review all generated illustrations for unwanted text, borrowed logos, broken
  hands/faces, inconsistent borders, and visual similarity to excluded assets.
- Keep gameplay symbols, suit marks, rank text, costs, and rule text as live
  DOM/SVG layers rather than baking them into generated raster artwork.

## Influence of `frontend-design`

The skill's guidance led to a single bold theatrical concept, a memorable scoring
seal, an asymmetrical stage composition, custom material vocabulary, and a clear
motion hierarchy. It also rules out a generic dashboard, purple-gradient UI,
stock component library appearance, and undifferentiated glass panels.


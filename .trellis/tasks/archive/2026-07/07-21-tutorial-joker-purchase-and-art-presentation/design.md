# Tutorial Joker Purchase and Artwork Presentation Technical Design

## 1. Design objective

Repair the tutorial night market through the real shop interaction and introduce
one shared, theatrical, read-only Joker artwork inspector. The result must make
all eight tutorial offers reachable without clipping, preserve commit-before-
reveal tutorial semantics, and let the approved 768x1024 artwork be viewed at a
useful size from every player-facing Joker surface.

This task changes presentation composition and tests only. It changes no catalog
row, balance value, command union, RNG algorithm, run/profile schema, persistence
schema, tutorial script version, generated asset, or network policy.

## 2. Approved product decisions

| Area | Decision |
|---|---|
| Shop navigation | Two transient groups: `单品 <count>` and `补充包 <count>` |
| Shop capacity | Only the active group is mounted in a 2x2 grid; groups never overlap |
| Tutorial default | Step 6 opens `单品`; committed transition to step 7 opens `补充包` |
| Target choice | Playing cards use 13 rank columns; target grid scrolls independently while confirmation stays pinned |
| Ordinary default | Open `单品`; local choice lasts only for the mounted shop screen |
| Large-art interaction | Activating a Joker thumbnail opens one centered stage-frame inspector |
| Inspector content | 3:4 art, Chinese name, rarity, rules, committed current value, flavor |
| Inspector authority | View-only; purchase, pick, sell, reorder, and use stay on their owner screen |
| Covered surfaces | Shop offer, shop inventory, table slot, Joker pack option, collection row |
| Concealment | Undiscovered collection and concealed table Jokers expose no inspector trigger |
| Viewports | Fixed desktop baselines `1280x720` and `1920x1080` |
| Assets | Reuse approved local Joker WebP files; no generation or remote media |

## 3. Non-negotiable invariants

1. `src/game-core/**`, tutorial gating, progression projection, persistence, and
   command execution remain unchanged unless a failing test proves an owning
   contract defect beyond the confirmed layout bug.
2. A tutorial purchase advances from step 6 to step 7 only after the existing
   `commitRunCommand` path validates, projects, and persists the checkpoint.
3. A rejected or persistence-failed purchase leaves the run, profile, active tab,
   checkpoint, RNG, and visible tutorial step at their prior committed values.
4. Shop tabs and the inspector live only in React presentation state. They are not
   added to Redux, IndexedDB, transfer JSON, replay data, or browser routing.
5. Opening, closing, or viewing a Joker dispatches no gameplay or settings action
   and performs no repository write.
6. Inspector copy comes from `JokerPresentation`; screens do not reimplement rarity
   labels, flavor lookup, runtime current-value calculation, or asset resolution.
7. Undiscovered and concealed entries cannot leak a name, rule, rarity, artwork,
   current value, or focal metadata through the inspector DOM.
8. Only the active shop group and active inspector image are mounted. The feature
   must not eagerly mount a full-size copy of all 150 Joker artworks.
9. The fixed stage and browser page never gain outer scroll. Required purchase and
   close targets remain inside the stage and directly hit-testable.
10. No snapshot update may substitute for a green geometry and hit-target test.
11. A valid tutorial target selection must leave `确认施行` inside the fixed stage;
    Playwright-assisted scrolling is not acceptance evidence.

## 4. Confirmed cause and boundary

The tutorial intentionally sets `cardOfferSlots = 4` and `packOfferSlots = 4`.
`ShopScreen` currently appends both arrays to one grid with two columns and two
explicit rows. The owning section clips overflow, so the four pack articles occupy
the same visible coordinates as the four card articles. Browser hit-testing at the
Joker purchase button resolves to pack content even though the button is enabled.

The existing role-based Playwright click is a false green because Playwright can
scroll a clipped descendant into view before clicking it. The repair therefore
belongs to shop composition and browser geometry, not the tutorial gate or engine.

The follow-up pack report has the same false-green shape at the next screen. The
pack purchase and `选此件` targets are unobscured, but a targeted consumable renders
all 52 eligible playing cards in an eight-column grid. At 1280x720 the enabled
confirmation is below the fixed stage inside `.screen`'s nested scroll area. The
repair belongs to `ChoiceScreen`: make the target screen a bounded flex column,
scroll only the target grid, pin its action row, and use a 13-column deck layout at
the supported desktop baselines. No command, tutorial gate, or choice model changes.

## 5. Architecture

### 5.1 Data-flow map

```text
Tutorial purchase
  -> existing buy-shop-offer thunk
  -> gate + pure proposal + invariants + progression projection
  -> IndexedDB commitCheckpoint(profile step 7, run checkpoint N+1)
  -> submitRunCommand.fulfilled reveals both committed objects
  -> ShopScreen observes committed currentStepId
  -> local active group becomes packs

Joker artwork
  -> catalog/run state
  -> selectJokerPresentation or selectOwnedJokerPresentation
  -> immutable JokerPresentation snapshot
  -> local inspector context
  -> one stage-local inspector host
```

No reverse edge exists from the inspector into Redux, commands, progression, or
persistence.

### 5.2 Shop offer-group state

Add a local discriminant in `ShopScreen`:

```ts
type ShopOfferGroup = 'items' | 'packs';
```

The component reads the active profile alongside the run and determines whether
the current V7 run is a tutorial. Its local selection records both the chosen
group and the committed tutorial step that owned that choice. Initial state is
`packs` only for tutorial step 7; every other mount begins at `items`. When the
committed step differs from the step attached to the local choice, rendering uses
the new step's default without a synchronous state-setting effect:

- step 6 -> `items`;
- step 7 -> `packs`;
- other tutorial steps do not force a selection.

The derived reset depends on the committed profile field, not `busy`, the click
event, a promise callback, inventory length, or optimistic run state. A later
manual tab activation records the current step together with its selection.
`appSlice` publishes the new profile only from `submitRunCommand.fulfilled`, after
`commitCheckpoint` succeeds. A persistence rejection therefore cannot trigger the
automatic tab change.

Render a visible tab strip with live array lengths. Mount exactly one collection:

- `items`: `shop.cardOffers`, with the existing reroll control;
- `packs`: `shop.packOffers`, without a misleading reroll action.

Both use the same bounded 2x2 layout but distinct item/pack article classes. Empty
state copy is scoped to the active group. Voucher offers remain a separate compact
footer rail; if more than one exists, that rail uses a visible bounded internal
scroll rather than inheriting the offer grid's clipping. Owned Jokers keep their
existing explicit internal scroll.

The Joker offer layout becomes a small horizontal poster rather than a centered
stack: a larger 3:4 thumbnail occupies one column and copy/action occupies the
other. Purchase controls receive a dedicated class. Do not retain broad selectors
such as `.offer > button` or `.ownedJokers button`, because the artwork itself now
has an independent button and must not inherit purchase/reorder styling.

Stable layout hooks are added for browser contracts:

```text
shop-offer-tabs
shop-offer-grid
shop-vouchers
shop-inventory
```

### 5.3 Shared Joker inspector contract

Create `src/presentation/components/JokerArtworkInspector.tsx` and its CSS module.
The module exports:

- `JokerArtworkInspectorProvider` — owns `JokerPresentation | null` in local state,
  provides `openInspector`/`closeInspector`, and renders one host;
- `JokerArtworkTrigger` — a semantic, style-reset artwork button that receives an
  already-approved `JokerPresentation` and renders its thumbnail;
- a private inspector frame/host — renders nothing image-heavy while closed.

`GameApplication` places the provider inside `StageShell`, around all routed screen
content. The provider is keyed by the current application route/playing phase so a
route change discards a stale inspection snapshot. There is still exactly one host
for the application, not one modal per card or collection row.

The trigger accepts only presentation concerns: the `JokerPresentation`, optional
surface/image classes, and optional browser image-loading mode. It receives no
dispatcher, command, price, offer ID, instance action, or repository. It keeps the
existing local asset path, focal-key data, and test ID on the image. Collection
triggers retain `loading="lazy"`; ordinary gameplay thumbnails use their current
eager behavior.

The open snapshot is rendered as:

- a stage-contained scrim;
- one centered two-column frame;
- a contained, uncropped 3:4 main image;
- a solid high-contrast information panel for name, rarity, rules, current value
  when non-null, and flavor;
- an optional low-opacity ambient copy of the same cached image behind the frame,
  never as the primary text background;
- one explicit `关闭鉴赏` control.

The main image height uses stage-relative sizing equivalent to
`clamp(25rem, 64vh, 38rem)`, preserving 3:4. Final measured geometry must be at
least 300x400 CSS pixels at 1280x720 and 384x512 at 1920x1080.

The inspector closes through its explicit button, clicking the scrim outside the
frame, or Escape. Frame clicks stop at the frame and never close or invoke the
underlying surface. The key listener exists only while open and is cleaned up on
close/unmount. Entrance/exit treatment is bounded transform/opacity motion using
the existing stage duration variables; it adds no timer loop or gameplay cue.

Add `--bx-layer-inspector` between notice/navigation and drawer ownership. The
inspector covers route actions and committed-result performances while open; the
score-seal performance uses the notice layer below it, while the sound drawer
remains the higher, explicit global overlay. No portal escapes the fixed-stage
isolation boundary.

### 5.4 Five-surface integration

All integrations pass an existing selector result to the shared trigger:

| Surface | Projection | Visibility rule | Owning actions |
|---|---|---|---|
| Shop offer | `selectJokerPresentation` | Joker presentation exists | Purchase remains beside art |
| Shop inventory | `selectOwnedJokerPresentation` | Owned presentation exists | Reorder/sell unchanged |
| Table slot | `selectOwnedJokerPresentation` | Presentation exists and `!concealJokers` | Sell-to-enable unchanged |
| Pack option | `selectJokerPresentation` | Option is a Joker with presentation | `选此件` unchanged |
| Collection row | `selectJokerPresentation(row.contentId)` | Joker row is discovered and has approved art | Filters/ledger unchanged |

Fallback icons remain non-interactive when a selector cannot resolve a
presentation. Table concealment is evaluated before creating the trigger, so the
hidden data never enters inspector context. A visible debuffed Joker remains
inspectable using its committed owned projection; `压制` remains the route status
and no effective value is recomputed in the inspector.

The collection continues to use `selectCollectionRows` as the visibility owner.
It must not call the Joker selector for an undiscovered row. The all-150 contract
is verified by selector tests, while browser tests use representative rarities and
states rather than trying to open 150 dialogs.

### 5.5 Styling and interaction ownership

Route CSS modules own thumbnail geometry; the shared component owns only button
reset, focus-neutral framing, and inspector composition. This avoids one global
size breaking five different layouts.

Expected route adjustments:

- shop offers: materially larger poster thumbnail inside the 2x2 card;
- shop inventory: slightly larger 3:4 thumbnail without shrinking action labels;
- table: use the available placard height while retaining name/status and all
  non-overlap geometry from the previous layout task;
- pack choice: preserve the existing 168px art area and make it activatable;
- collection: retain lazy thumbnails, expand the useful crop where geometry
  permits, and activate only discovered Joker artwork.

The image within every trigger uses `object-fit: cover` only for route thumbnails;
the inspector always uses `object-fit: contain`. Art activation is limited to the
thumbnail button so clicking purchase, pick, sell, reorder, filters, or the rest of
the article cannot accidentally open the inspector.

## 6. Failure and edge handling

- **Insufficient money / full inventory / sold out:** existing disabled/rejection
  behavior remains authoritative; tab state cannot make the command legal.
- **Repeated purchase:** `busy` continues disabling command buttons. Only a
  fulfilled committed transition can switch tutorial groups.
- **Persistence failure:** Redux retains the old profile/run, the tutorial remains
  at step 6, and the items group stays selected.
- **Refresh:** tabs and inspector reset. The committed tutorial profile restores
  step 7 and therefore mounts the pack group on the next shop render.
- **Zero active offers:** show a group-specific empty state while the other tab and
  its exact count remain visible.
- **Unknown Joker projection:** preserve the existing fallback and do not create a
  broken inspector trigger.
- **Undiscovered/concealed Joker:** render no trigger and no hidden inspector copy.
- **Route/phase change:** provider remount clears the local snapshot.
- **Image failure:** retain current local-asset audit and browser 404 gates; do not
  fetch a remote fallback or silently substitute a different asset.

## 7. Test design

### 7.1 Shop component contracts

Extend `tests/presentation/shop-screen.test.tsx` with realistic seeded shops:

1. live item/pack counts and only the active group's actions in the DOM;
2. ordinary shop defaults to items and manual switching writes no checkpoint;
3. tutorial step 6 defaults to items;
4. successful real Joker purchase persists once, advances exactly to step 7, then
   switches to packs;
5. persistence rejection leaves items selected, step 6 visible, and state exact;
6. insufficient funds, full inventory, sold-out groups, and repeated clicks retain
   existing typed behavior.

Do not test the transition by manually editing React props after a click. Drive the
real store/thunk/repository boundary so the test proves commit ordering.

### 7.2 Inspector component and integration contracts

Add focused tests that prove:

- one host exists and the closed host mounts no full-size art;
- each trigger opens the exact selected local image and all approved fields;
- explicit close, scrim, and Escape remove the dialog;
- opening/closing leaves a structured clone of app run/profile/settings equal,
  produces zero post-initialization dispatches, and invokes no repository write;
- owned dynamic current values are used instead of base values;
- shop offer/inventory, table, pack choice, and collection integrations open the
  same shared inspector;
- concealed table and undiscovered collection rows have no trigger and leak no
  name/art/rule in the dialog DOM;
- a visible debuffed Joker is inspectable while its route status remains `压制`;
- iterating all 150 production Joker IDs yields the shared presentation fields and
  approved local asset paths;
- collection lazy loading does not mount 150 inspector-sized images.

### 7.3 Browser geometry and real hit targets

Extend `tests/e2e/helpers/layoutGeometry.ts` with a hit-target assertion that takes
the center of a visible action rectangle, calls `document.elementFromPoint`, and
requires the action to contain the returned node. This catches the reported defect
that role-based clicks missed.

At both supported viewports and both browser projects:

1. run a fresh tutorial to step 6;
2. assert both tabs/counts, item-grid containment, no item/pack overlap, no outer
   scroll, and direct hit-testing of the intended Joker purchase button;
3. click that real target, await the checkpoint/profile commit, assert exactly one
   step advance and the pack group;
4. refresh at the committed shop and assert the pack group restores from step 7;
5. continue through the existing pack tutorial flow;
6. open/close representative inspectors on all five surfaces and measure the main
   image threshold, stage containment, and underlying-state equality;
7. assert no console error, local 404, or remote request.

Keep the existing end-to-end tutorial test, but replace its false-green purchase
assumption with the new visibility/hit-target precondition. Add or update visual
snapshots only after geometry is green, then inspect every changed image.

## 8. Compatibility, performance, and asset policy

- No migration or version bump is needed because both new states are transient.
- No runtime dependency, generated image, font, sound, or manifest entry is added.
- The existing 768x1024 WebP is reused for both thumbnail and inspector; browser
  caching prevents a second network payload for the same URL.
- The provider owns at most one presentation snapshot. Closed state owns no image;
  open state owns one main image and at most one cached ambient treatment.
- Collection thumbnails retain `loading="lazy"` and the inspector does not
  prefetch other Joker IDs.
- Motion is transform/opacity-first, bounded, and respects existing full/brisk
  stage timing variables.
- Build gzip remains `<=358400` bytes. Browser audits retain zero remote requests,
  zero missing local assets, and the existing frame/long-task limits.

## 9. Rollback boundaries

| Risk | Early signal | Control | Independent rollback |
|---|---|---|---|
| Tutorial switches before persistence | failure test shows packs after rejection | derive tab only from fulfilled profile step | Shop step-sync effect |
| Tabs hide an offer group | wrong counts or absent tab | exact array counts + active-only DOM tests | Shop tab/layout block |
| Artwork click invokes gameplay | dispatch/repository spy changes | trigger API accepts no command authority | Shared trigger/provider |
| Concealed art leaks | hidden-name/art DOM assertion fails | gate before selector/context | Individual surface adapter |
| Inspector covers global drawer incorrectly | layer geometry test fails | named layer token and stage-local host | Inspector CSS layer |
| Collection decodes too much | image/memory audit regresses | lazy thumbnails + one host | Collection trigger adapter |
| Snapshot masks overlap | visual changes with red geometry | geometry/hit gate before snapshot | Reject snapshot update |

## 10. Expected file ownership

Primary implementation files:

- `src/app/App.tsx`
- `src/presentation/components/JokerArtworkInspector.tsx`
- `src/presentation/components/JokerArtworkInspector.module.css`
- `src/presentation/theme/tokens.css`
- `src/presentation/screens/ShopScreen.tsx`
- `src/presentation/screens/ShopScreen.module.css`
- `src/presentation/screens/GameTableScreen.tsx`
- `src/presentation/screens/GameTableScreen.module.css`
- `src/presentation/screens/ChoiceScreen.tsx`
- `src/presentation/screens/DecisionScreen.module.css`
- `src/presentation/progression/CollectionScreen.tsx`
- `src/presentation/progression/ProgressionScreens.module.css`

Expected tests:

- `tests/presentation/shop-screen.test.tsx`
- `tests/presentation/joker-artwork-inspector.test.tsx`
- existing surface component tests where their fixture is already authoritative
- `tests/e2e/helpers/layoutGeometry.ts`
- `tests/e2e/tutorial.spec.ts`
- `tests/e2e/layout-occlusion.spec.ts`
- a focused inspector E2E spec or the nearest existing presentation spec
- intentional Chromium/WebKit visual baselines affected by final geometry

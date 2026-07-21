# Fix Card Deselection Position

## Goal

Ensure a playing card returns immediately and completely to its original hand-fan
pose after the player clicks it a second time to deselect it.

## Background

- The reported reproduction is: click the leftmost hand card, then click the same
  card again. It appears to remain selected or otherwise fails to return to its
  original position.
- This is a frontend interaction defect; gameplay rules and card-selection limits
  are not part of the requested change.
- A rendered Chromium run confirmed that the second click removes the selected
  class, but Motion leaves `scale(0.97)` on the card even after the pointer moves
  away. While the pointer remains over the deselected card, the ordinary hover
  pose also keeps it at `y=-10px` instead of its settled fan offset.
- The stale tap scale reproduces on a middle card as well; the leftmost card only
  makes the geometry drift more visually obvious.

## Requirements

- Reproduce the defect through the rendered game table using the leftmost card and
  confirm whether it is position-specific.
- Distinguish committed selection state from the card's rendered position and
  animation state.
- A second click on a selected card must clear its selected state and immediately
  return it to the same settled fan pose it had before selection, even while the
  pointer remains over that card.
- Suppress the ordinary hover lift for the remainder of that pointer visit after
  deselection. Once the pointer leaves and later re-enters, restore the normal
  hover affordance.
- A completed click/tap gesture must never leave a stale scale or transform layer
  on the card.
- Preserve selection toggling for every hand position, stable card identity,
  sorting, play/discard actions, entry/exit animation, and persistence behavior.
- Add a rendered regression test for select then deselect behavior.

## Acceptance Criteria

- [x] The defect is reproduced in a real browser before the fix.
- [x] Clicking the leftmost card once marks it selected and moves it to the selected
      pose.
- [x] Clicking the same card again removes the selected state and restores its
      original settled horizontal position, vertical position, scale `1`, and fan
      rotation while the pointer is still over the card.
- [x] After pointer leave and re-entry, the ordinary hover pose works again and
      leaving it restores the same settled pose.
- [x] Repeating the interaction does not accumulate drift or leave stale inline
      transforms/classes.
- [x] The same select/deselect cycle leaves a non-edge card at scale `1` after the
      pointer moves away.
- [x] Neighboring cards keep their order and settled fan poses throughout.
- [x] The rendered regression passes in Chromium and WebKit.

## Out of Scope

- Changing card-selection rules, maximum selection count, scoring, sorting, or
  gameplay commands.
- Redesigning the card fan or introducing new selection animation art direction.

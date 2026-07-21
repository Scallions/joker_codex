# Browser Reproduction

## Environment

- Local Vite application: `http://127.0.0.1:4173`
- Browser automation: rendered Chromium through `agent-browser`
- Fresh profile and ordinary campaign run

## Observations

The leftmost card began in its settled fan pose:

```text
translate3d(0px, 7.7px, 0px) rotate(-7.7deg)
```

After selecting it, the selected class was present and the card was raised. After
clicking it again, the selected class was removed, but the inline gesture pose was:

```text
translateY(-10px) scale(0.97) rotate(-7.7deg)
```

After moving the pointer away, the vertical fan offset returned but the tap scale
remained stale:

```text
translateY(7.7px) scale(0.97) rotate(-7.7deg)
```

Repeating the same cycle with a middle card left that card at `scale(0.97)` too.
The committed selection state and selected CSS class were already correct, so the
defect is isolated to rendered gesture reconciliation rather than the game command.

## Planning Consequence

The regression must assert both the toggle state and the complete settled visual
pose. A state-only test would pass while the user-visible defect remains.

## Resolution Evidence

The final repair separates transform ownership: Motion keeps the durable fan,
entry, and exit transform, while transient pointer lift/compression uses CSS
individual `translate` and `scale` properties. Deselect suppresses hover for the
rest of the current pointer visit and clears that suppression after the pointer
has left and physically moves again.

The regression was observed failing against the original code on both vertical
offset and scale. The repaired path passed ten consecutive Chromium repetitions,
five consecutive WebKit repetitions, and the 32-case browser matrix covering
foundation flows, both viewport baselines, presentation, tutorial, and motion
performance.

# Component Guidelines

> React component, props, composition, styling, and motion conventions.

---

## Overview

Components are typed function components by default. Screens bind Redux state
and application thunks to presentation. Small reusable components own visual
semantics and accept native element attributes where that improves composition.
Class error boundaries are used only where React requires them.

---

## Component Structure

A typical component orders imports as third-party, application modules, pure
domain modules, presentation modules, then its CSS module. Local constants and
private subcomponents precede the exported component.

Screens guard their domain phase before rendering:

~~~tsx
export function ShopScreen() {
  const dispatch = useAppDispatch();
  const { run, busy } = useAppSelector((state) => state.app);

  if (!run || run.phase.kind !== 'shop' || !run.shop) return null;
  // Derive view values, then render the active stage.
}
~~~

Keep pure formatting and selection logic outside JSX when it can be tested
without React. Use lazy imports in src/app/App.tsx for major run-stage screens.

---

## Props Conventions

- Define named interfaces for non-trivial props and mark inputs readonly.
- Extend native attribute types for primitives instead of re-declaring common
  DOM props.
- Default button type to button in shared button components.
- Name callbacks by intent, such as onSelect or onClose.
- Use discriminated unions for mutually exclusive variants instead of several
  loosely related booleans.

~~~tsx
export interface SealButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly tone?: 'vermilion' | 'jade' | 'paper';
}
~~~

---

## Composition

- StageShell owns the scene background and global stage material.
- Provider components such as JokerArtworkInspectorProvider own cross-screen
  transient presentation services.
- StagePrimitives exposes themed surfaces and controls; screens supply content
  and layout.
- Prefer children and native props for visual composition. Do not pass entire
  Redux state trees through props.
- Presentation components dispatch thunks; they do not instantiate
  repositories or execute persistence transactions.

---

## Styling and Motion

- Use CSS Modules for component and screen styles.
- Use src/presentation/theme/tokens.css for shared color, spacing, and material
  variables; use global.css only for reset and application-wide rules.
- Use data attributes for finite visual variants and test-visible layout state.
- Use Motion for durable entry, exit, and layout transitions. Use CSS
  individual translate/scale properties for transient pointer feedback when
  Motion already owns the transform.
- Read motion timing from motionTokens.ts and honor the stored presentation
  speed.

---

## Interaction Semantics

The project uses semantic buttons, explicit type attributes, useful accessible
names for icon-only controls, and aria-pressed for toggle groups. Decorative
marks use aria-hidden. This is a pragmatic interaction baseline, not a separate
accessibility-certification gate.

Actions must expose disabled state while a persistence operation is busy.
Pointer motion must not leave controls visually selected after domain state has
settled.

---

## Common Mistakes

- Duplicating stage primitives or hard-coding a new palette in one screen.
- Storing durable game state in component useState.
- Dispatching during render or calling a repository from presentation code.
- Giving Motion and CSS transform competing ownership of the same axis.
- Deriving local state once from props without handling a later context change.
- Using clickable div elements where an existing button primitive fits.

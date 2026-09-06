---
name: atlas-design-system
description: Implement or review a React and HeroUI business application screen using Atlas Design System contracts, examples, and validation rules. Use when an Issue must be turned into an Atlas-compliant screen or when comparing a design-contract run with a baseline.
---

# Atlas Design System

Use Atlas as an implementation contract. Do not copy its design data into this Skill.

## Before implementation

1. Confirm the Issue identifies the user, task, business constraints, required states, and completion checks. When a business decision is missing and it would change the screen structure or behavior, decide from `brief.md` and `DESIGN.md`, then record the assumption and the alternative in the final report. Runs are non-interactive; nobody can answer a question mid-run.
2. Read `DESIGN.md` at the Atlas repository root.
3. Read the resolved experiment context when it exists:

   `HARNESS_RESOLVED.json`

   When working in the Atlas repository without a prepared Harness workspace, resolve the experiment manifest:

   `node scripts/resolve-design-contract.mjs experiments/<scenario>/manifest.json`

4. Read only the files returned in `resources`. Treat missing IDs, variants, component references, and Agent Skills as errors.
5. Use the official `heroui-react` Skill for current HeroUI v3 component APIs, anatomy, source styles, and theme variables. Atlas component contracts remain the authority for which components and variants are allowed.

## Implementation

1. Keep the Issue unchanged. Use the resolved Pattern to choose the page structure and the Example for feature-specific composition, states, components, and business rules. When the resolved contract contains `screens`, build each route with the Pattern variant assigned to it and implement every overlay (Drawer, AlertDialog) with the component and spacing variant the overlay entry names.
2. Import `design/layout.css` and use the class names listed in each resolved `layout` contract (`layout.classes` on Pattern variants). Do not reimplement those classes with custom CSS; add feature CSS only for concerns the layout partials do not cover.
3. Fetch the relevant HeroUI v3 documentation through the `heroui-react` Skill before implementing a component. Use only HeroUI components and variants allowed by the resolved Atlas contracts. Do not recreate an approved component with custom HTML.
4. Use semantic tokens. Do not place raw color values in JSX or feature CSS.
5. Implement every required state and recovery path before visual polish.
6. Apply the repository's `ui-writing` Skill when writing Japanese UI text. Do not copy product-specific terminology from external references into Atlas.

## Validation and correction

Run `pnpm check` once, after a screen is finished: it runs lint, type checking and tests in one pass and reports every failure together. Do not run `pnpm lint` or `pnpm test:run` individually after each edit. Atlas rules are enforced as ESLint rules `atlas/*`; fix every reported violation, then confirm the production build with `pnpm build`. Run the design evaluation configured by the experiment when working with a saved Run. Return failed rule IDs to the next correction Run; do not edit generated comparison artifacts by hand.

Do not report completion while a required check fails. Keep human review items separate from automatic pass or fail results.

## Output

Report the Issue, resolved Pattern and Example IDs, files changed, checks run, failed or review-only rules, and remaining work. State clearly when the implementation used Atlas and when it was a baseline without design contracts.

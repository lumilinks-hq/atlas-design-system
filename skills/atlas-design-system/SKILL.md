---
name: atlas-design-system
description: Implement or review a React and HeroUI business application screen using Atlas Design System contracts, examples, and validation rules. Use when an Issue must be turned into an Atlas-compliant screen or when comparing a design-contract run with a baseline.
---

# Atlas Design System

Use Atlas as an implementation contract. Do not copy its design data into this Skill.

## Before implementation

1. Confirm the Issue identifies the user, task, business constraints, required states, and completion checks. Stop and ask for the missing business decision when it would change the screen structure or behavior.
2. Read `DESIGN.md` at the Atlas repository root.
3. Resolve the experiment manifest:

   `node scripts/resolve-design-contract.mjs experiments/<scenario>/manifest.json`

4. Read only the files returned in `resources`. Treat missing IDs, variants, and component references as errors.

## Implementation

1. Keep the Issue unchanged. Use the resolved Pattern to choose the page structure and the Example for feature-specific composition, states, components, and business rules.
2. Use HeroUI components listed by the resolved component contracts. Do not recreate an approved component with custom HTML.
3. Use semantic tokens. Do not place raw color values in JSX or feature CSS.
4. Implement every required state and recovery path before visual polish.
5. Apply the repository's `smarthr-ui-writing` Skill when writing Japanese UI text. Do not copy SmartHR-specific product terminology into Atlas.

## Validation and correction

Run `pnpm design:check`, type checking, tests, and the production build. Run the design evaluation configured by the experiment when working with a saved Run. Return failed rule IDs to the next correction Run; do not edit generated comparison artifacts by hand.

Do not report completion while a required check fails. Keep human review items separate from automatic pass or fail results.

## Output

Report the Issue, resolved Pattern and Example IDs, files changed, checks run, failed or review-only rules, and remaining work. State clearly when the implementation used Atlas and when it was a baseline without design contracts.

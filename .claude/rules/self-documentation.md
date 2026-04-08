# Self-Documentation Policy

Whenever a non-obvious decision is made — a workaround, a library quirk, an
architectural choice, or a discovered constraint — document it immediately in the
relevant CLAUDE.md under a **Known Solutions** or **Design Decisions** section.

The test: *would the next conversation know to do this, or would it repeat the mistake?*
If no, write it down.

What to record:
- Why a specific approach was chosen over the obvious one
- Library version quirks or gotchas discovered during development
- Constraints imposed by the stack or environment
- Decisions that look wrong but are intentional

## Pre-Implementation Check

Before writing code that touches business logic, read `RULES.md` at the project root.
If your implementation would violate any numbered rule, stop and raise the conflict
with the user. Do not silently work around a rule.

## Module Spec Format

When documenting a new complex module in `*/docs/`, use this structure:
Purpose → Inputs → Outputs → Algorithm (decision table, not prose) →
Boundaries (MUST use / MUST NOT use / MUST NOT invent) →
Integration Points (exact file paths) → Applicable RULES.md numbers.

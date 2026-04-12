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

Before writing code that touches business logic, check `docs/MAP.md` → use the
RULES.md category index to open only the sections relevant to your task (e.g.,
N1–N2 for nicknames, T1–T4 for timezone, P1–P6 for posts). Do not read all of
RULES.md — jump to the applicable category.

If your implementation would violate any numbered rule, stop and raise the conflict
with the user. Do not silently work around a rule.

## Phase 3–5 Module Spec Gate

**No code may be written for any Phase 3, 4, or 5 module until:**
1. A full Module Specification exists in `docs/` following the Module Spec Format below.
2. The spec has been manually reviewed and approved by the user.

This is a hard gate — not a suggestion. If a user ask implies Phase 3–5 implementation without a pre-existing approved spec, stop and raise it explicitly before doing anything else.

Approved specs:
- `docs/TIMERS.md` — Activity Timers (Phase 2) ✓
- `docs/AUTH.md` — Discord Auth (Phase 2) ✓
- `docs/CHARACTERS.md` — Character Engine & Ownership (Phase 3) — draft, not yet approved

## Module Spec Format

When documenting a new complex module in `*/docs/`, use this structure:
Purpose → Inputs → Outputs → Algorithm (decision table, not prose) →
Boundaries (MUST use / MUST NOT use / MUST NOT invent) →
Integration Points (exact file paths) → Applicable RULES.md numbers.

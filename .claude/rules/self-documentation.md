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

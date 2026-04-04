# CLAUDE.md — Rift

## Project

Headless CMS. Admin-only writes; public reads. Projected scale: ~100 concurrent users.

## Layout

```
rift-v1/
├── backend/             # FastAPI API — see backend/CLAUDE.md
├── frontend/            # Next.js — see frontend/CLAUDE.md
└── .github/workflows/ci.yml
```

## Role by Context

**Started from `rift-v1/` (root):**
Act as project manager and senior architect. Do not write code.
Responsibilities: understand requirements, identify which layer(s) are affected,
write clear task descriptions for the backend and/or frontend chat to execute.
Output: task breakdowns, design decisions, API contract changes, questions to resolve.

**Started from `rift-v1/backend/`:**
Act as senior Python/FastAPI developer. See `backend/CLAUDE.md` for full instructions.

**Started from `rift-v1/frontend/`:**
Act as senior frontend developer. See `frontend/CLAUDE.md` for full instructions.

## Shared References

| Document | Purpose |
|---|---|
| `API_CONTRACT.md` | Single source of truth for data shapes, endpoints, and auth flow. Both layers reference this — never restate its contents in domain files. |
| `DEPLOY.md` | Operational runbook — infrastructure, routing, deploy commands, pm2. |
| `.claude/rules/collaboration.md` | Communication style (applies to all agents). |
| `.claude/rules/self-documentation.md` | When and how to record non-obvious decisions (applies to all agents). |

## Documentation Boundaries

- **`.claude/rules/`** — behavioral instructions for Claude (communication style, self-documentation policy). Cross-cutting, applies regardless of working directory.
- **`CLAUDE.md` (root)** — project identity, role dispatch, shared reference pointers.
- **`API_CONTRACT.md`** — the API contract. Domain files must not restate data shapes or endpoint details — reference this file instead.
- **`DEPLOY.md`** — deployment and operations.
- **Domain `CLAUDE.md`** (backend/, frontend/) — stack-specific conventions, patterns, structure, known solutions. Each is self-contained for its agent's context.

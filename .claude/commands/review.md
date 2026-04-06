Perform a periodic code review of the Rift project.

## Strategy

Do NOT read every file. Use a diff-based, targeted approach to stay within token budget:

1. **Read `REVIEW_LOG.md`** to find the last reviewed commit SHA.
2. **Run `git diff <last-sha>..HEAD --stat`** to see what changed since the last review.
   - If there are no new commits, review the uncommitted working tree instead: `git diff --stat` + `git diff --stat --cached`.
3. **Spawn 2-3 Explore agents in parallel**, each scoped to a specific concern:
   - **Backend agent**: review changed backend files for correctness, security, API contract compliance.
   - **Frontend agent**: review changed frontend files for type safety, component patterns, dead code, consistency with CLAUDE.md conventions.
   - **Cross-cutting agent**: check that API_CONTRACT.md, schemas, and client code are in sync.
4. **Collect findings** from all agents. Categorize as:
   - **Critical** — bugs, security issues, data loss risks
   - **Warning** — inconsistencies, dead code, missing validations
   - **Suggestion** — style, naming, minor improvements
5. **Update `REVIEW_LOG.md`** with a new entry recording:
   - Commit range reviewed
   - Date
   - Areas covered
   - Issues found (or "clean")
6. **Present findings** to the user as a concise summary table.

## Important

- Respect the project's role rules: do NOT write code from the root context. Only report findings.
- If there are no changes since the last review, say so and skip.
- Keep agent prompts focused — each agent should read only the files relevant to its concern.

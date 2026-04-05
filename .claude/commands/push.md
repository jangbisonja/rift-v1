Stage all changes, commit, and push to origin/main.

Steps:
1. Run `git status` and `git diff --stat` to summarize what changed.
2. Stage all modified and untracked files. Do NOT stage `.env`, secrets, or large binaries.
3. Draft a concise conventional-commit message summarizing the changes (what and why).
4. Commit with that message and the Co-Authored-By trailer:
   `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
5. Push to `origin main`.
6. Report the commit hash and a one-line summary of what was pushed.

If there is nothing to commit, say so and skip the push.

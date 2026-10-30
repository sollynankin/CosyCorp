---
description: Commit all changes to Cosycorp and push them to GitHub (updates the live site)
argument-hint: [optional commit message]
allowed-tools: Bash(git status:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git diff:*), Bash(git log:*), Bash(npm test:*), Bash(npm run typecheck:*)
---

Publish the current state of the game to GitHub.

1. Run `npm test` and `npm run typecheck`. If either fails, stop and report; do not push a broken build (the deploy runs the tests too).
2. Run `git status --short` and `git diff --stat`. If nothing changed, say so and stop.
3. Stage everything with `git add -A`.
4. Commit. Use "$ARGUMENTS" as the message if given; otherwise write a short, plain summary of what changed
   (one line, imperative, e.g. "Add ponds to the lake"). End the message with the Co-Authored-By line from the session.
5. Run `git push origin main`.
6. Reply with one line: what was pushed, and that GitHub Pages rebuilds https://sollynankin.github.io/CosyCorp/ in about a minute.

Only ever push this folder's own repo (it must report its own top-level folder: hearthvale), never a parent folder.

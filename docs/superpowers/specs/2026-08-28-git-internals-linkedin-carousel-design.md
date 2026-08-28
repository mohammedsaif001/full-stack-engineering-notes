# Git Internals — LinkedIn Carousel + Post

**Date:** 2026-08-28
**Author:** Mohammed Saif
**Status:** Approved for implementation

## Goal

Produce a LinkedIn content package that teaches Git internals end to end,
positioning the author as a senior engineer who explains clearly. Two
artifacts:

1. **A 33-slide carousel** — a design canvas (multi-artboard), editorial-light
   aesthetic, 1080×1080 slides, exportable to PNG for upload to LinkedIn.
2. **The LinkedIn post copy** — a repo markdown file (`02-github/linkedin-post.md`)
   with a story hook (two real personal experiences: `cherry-pick`, `reflog`),
   the technical lesson, and a CTA.

Audience: engineers on LinkedIn; recruiters are a deliberate secondary audience
(the post is a portfolio signal — "helps others learn").

## Content source

Every section of `02-github/Github.md` is represented in the carousel, condensed
to slide length, plus six new slides covering genuine gaps in the doc:

- `HEAD~` / `HEAD^` notation (used in the doc, never explained)
- `git commit --amend` (absent)
- `git rm` / `git mv` (absent)
- `.gitignore` (mentioned only in "related concepts")
- Merge conflicts — what `<<<<<<<` / `=======` / `>>>>>>>` mean, how to resolve
- Tags in depth — lightweight vs annotated, `git push --tags`

## Aesthetic (locked — "editorial light")

- **Ground:** warm off-white `#faf8f3` (matches the mermaid diagram backgrounds
  in the doc)
- **Ink:** `#1a1a1a`
- **Accent:** single ink-blue hue via oklch, ~`oklch(0.45 0.12 250)` (`#2f5fb0`-ish)
- **Callout tints:** `#fff5e6` (warm), `#e6f0ff` (cool) — same as the doc's palette
- **Type:**
  - Display / slide titles: **Newsreader** (Google Font), serif, characterful.
    Fallback: `Georgia, 'Times New Roman', serif`.
  - Body: **IBM Plex Sans** (Google Font). Fallback: `system-ui, -apple-system, sans-serif`.
  - Code: **IBM Plex Mono** (Google Font). Fallback: `ui-monospace, 'Courier New', monospace`.
  - (Inter, Roboto, Arial, Fraunces deliberately avoided per design-skill slop list.)
- **No emoji, no dingbats.** Diagrams are hand-drawn inline SVG, stroke-based,
  consistent style.
- **No gradient backgrounds, no rounded-corner-left-border-accent containers.**

## Slide format

Fixed square artboards, **1080×1080** (LinkedIn carousel standard). Each slide:

- **Eyebrow** — small uppercase section label + accent rule
- **Headline** — serif, ~44–56px, `text-wrap: balance`
- **Body** — IBM Plex Sans, ~24–28px; short prose, one code block or one inline
  SVG diagram where the doc has a mermaid chart
- **Footer** — slide number `NN / 33` left, wordmark "Mohammed Saif · Git Internals"
  right, hairline rule above
- Layout via flex/grid with `gap`, inline styles (so the canvas properties panel
  can edit them)

Code blocks: `#fff5e6` background, `IBM Plex Mono`, ~18–20px, comment lines in a
muted ink.

## Canvas structure

- Artboards: `Main.dc.html` (cover) + `Slide02.dc.html` … `Slide33.dc.html`
- `canvas.json`: grid layout, ~4 artboards per row, ≥120px row gaps / ≥80px
  column gaps, `w`/`h` = 1080×1080 each, single page, `launch: {view: "canvas"}`
- Each artboard is static (no holes, no tweaks) → `class Component extends DCLogic {}`
  with a `$preview` of 1080×1080, no `renderVals`. Content is literal markup.
- `support.js` head line kept verbatim.
- Google Fonts `<link>` inside `<helmet>` on every artboard.

## Slide outline (33)

1. **Cover** — "Git Internals: what actually happens when you `reset --hard`" +
   name / role / "a field guide"
2. **What is a VCS** — recall / compare / collaborate / attribute / revert;
   local vs centralized vs distributed; why distributed won
3. **Git vs GitHub / GitLab / Bitbucket** — Git is the tool; they are hosting
   platforms (PRs, issues, CI) layered on top; Git works fully offline
4. **clone vs fork** — clone = local Git command; fork = server-side platform
   feature; `origin` vs `upstream`; the 8-step contribution flow
5. **Anatomy of `.git`** — HEAD, config, objects/, refs/heads + refs/remotes,
   logs/ (reflog), index; "this folder *is* the repo"
6. **Snapshots, not diffs** — blob / tree / commit / tag; commit → tree →
   (blobs + subtrees); each commit also points to its parent
7. **The linked list** — every commit stores its parent's hash; SVG chain
   A ← B ← C; HEAD → branch → commit; branch = movable pointer (why branching
   is cheap)
8. **Where hashes live** — SHA-1, content-addressed; `2a/bce…` sharding for
   filesystem speed; `git cat-file -p <hash>` shows the raw object
9. **`HEAD~` / `HEAD^` notation** *(new)* — `HEAD~1` = parent, `HEAD~3` = three
   back; `HEAD^` = first parent, `HEAD^2` = second parent of a merge; used
   everywhere (`reset`, `rebase`, `diff`)
10. **The staging area (index)** — working dir → `git add` → staging → `git commit`
    → repo; why it exists (build commits deliberately, one logical change each)
11. **Setup & inspection** — `git init` / `clone` / `status` / `diff` /
    `diff --staged`; `git config --global user.name/email`; `--global` vs local;
    useful config (editor, `init.defaultBranch`, `pull.rebase`, aliases)
12. **`git log`** — `--oneline` / `--graph --all` / `-p`; searching: `--grep`,
    `-i --grep`, `--all-match`, `-S` (pickaxe), `-G` (regex); `git blame`,
    `git blame -L`, `git show`
13. **Staging & committing** — `git add <file>` / `.` / `-p` (hunks);
    `commit -m` vs `commit -am` — `-a` only stages *already-tracked* files, not
    new/untracked ones
14. **`git commit --amend`** *(new)* — rewrites the last commit (message or
    content); creates a new hash; safe only if not pushed; `--amend --no-edit`
15. **`git rm` / `git mv`** *(new)* — stage a deletion / rename; `git rm --cached`
    to untrack but keep on disk; Git detects renames by content anyway
16. **`.gitignore`** *(new)* — patterns for files Git should never track
    (`node_modules/`, `.env`, build output); already-tracked files need
    `git rm --cached`; `.gitignore` itself is committed
17. **Branching** — `git branch` / `-d` / `-D`; `checkout <b>` / `checkout -b`;
    `switch` / `switch -c`; naming convention `<type>/<kebab-desc>`
18. **Conventional Commits** — `feat / fix / docs / style / refactor / test /
    chore / perf`; tooling parses prefixes for changelogs / version bumps; makes
    `git log --oneline` self-documenting
19. **checkout vs switch vs restore** — `checkout` did three jobs; 2.23 split it:
    `switch` = branches only, `restore` = file content, `restore --staged` = unstage
20. **`git reset` — soft / mixed / hard** — soft: move pointer, keep staged;
    mixed (default): move, keep unstaged; hard: move, discard; SVG of C/D
    orphaned after `reset --hard B`
21. **How Git tracks a `reset --hard`** *(the promised deep dive)* — `reset` only
    moves a ref; the commit objects still sit in `.git/objects`, just unreachable;
    `git reflog` logs every HEAD move; recover via
    `git reflog` → `git switch -c recovered <hash>`; GC reclaims after ~30 days
22. **`git revert`** — creates a *new* commit that applies the inverse; adds to
    history, doesn't rewrite it; SVG (…C…D + E-undoes-C); always prefer on
    shared branches
23. **Merge conflicts** *(new)* — why they happen; the `<<<<<<< HEAD` /
    `=======` / `>>>>>>> branch` markers; resolve = edit to the desired final
    state, delete markers, `git add`, continue; `git merge --abort` /
    `git rebase --abort`
24. **The stash** — `git stash` / `list` / `pop` / `apply` / `drop` / `-u`;
    use case: urgent branch switch mid-change
25. **merge vs rebase vs squash** — merge: 2-parent commit, branchy, no hash
    change; rebase: replays as new hashes, linear; squash: flattens to one
    commit; the side-by-side table; never rebase/squash shared history
26. **`git diff`** — working vs staged / staged vs HEAD / `HEAD` / branch..branch
    / commit..commit; read-only, `+` / `-`
27. **`git pull` = fetch + merge (or rebase)** — `fetch` = download only, safe;
    `pull` = fetch + integrate; `merge` = safe on shared; `rebase` = linear but
    rewrites; `pull --rebase`
28. **`git remote`** — named URL to another copy; `origin` is convention, not a
    keyword; `upstream` for forks; SSH vs HTTPS+PAT; credential helpers;
    multiple accounts via `--local` config + `~/.ssh/config` host aliases;
    `git push -u`
29. **Tags in depth** *(new)* — lightweight (just a pointer) vs annotated
    (`git tag -a v1.0.0 -m …`, its own object with tagger + message); tags are
    *not* pushed by default — `git push origin v1.0.0` / `git push --tags`
30. **HEAD, detached HEAD, branches, tags** — HEAD = "where am I"; detached HEAD
    = points straight at a commit; new commits there can be lost — `git switch -c`
    to keep them; branch = movable label, tag = fixed label
31. **`git cherry-pick`** — apply one commit from another branch without merging
    the rest; `git cherry-pick <hash>` / `A^..B` for a range; the real use case:
    porting a fix between branches that can't be fully merged
32. **Related concepts + key takeaways** — interactive rebase, bisect, hooks,
    submodules/subtrees, signed commits; then the 9 condensed takeaways
33. **Closing** — resources (git-scm docs / Pro Git / learngitbranching);
    "I write about backend + tooling — follow for more"; LinkedIn handle

## LinkedIn post copy — `02-github/linkedin-post.md`

Plain markdown, ready to paste. Structure:

- **Hook** (1–2 lines): what happens *inside* Git when you `reset --hard` — the
  commits don't die.
- **Frame** (2 lines): Git is a snapshot database with a backward-pointing chain;
  GitHub is just a place to share it. Most "I lost my work" moments are
  recoverable once you know that.
- **Story 1 — cherry-pick** (first person, real): a project with two parallel
  branches — internal dev (unreleased features) and the client branch (delivered
  code). The client's team fixed a bug on their branch. Couldn't merge the whole
  branch back (it carried client-only requirements); couldn't push internal
  changes onto it (would leak unreleased features). Noted the commit IDs,
  `git cherry-pick`ed the handful of fix commits onto internal. Regained control
  without contaminating either branch.
- **Story 2 — reflog** (first person, real): a junior's feature wasn't working,
  they ran `git reset --hard` and pushed. I knew Git keeps records — ran
  `git reflog`, found where HEAD pointed before the reset, recovered the lost
  commits. Nothing is truly gone until garbage collection (~30 days).
- **Lesson** (2–3 lines): `reset` moves a pointer; the objects linger.
  `reflog` is the safety net for local history. `revert` — not `reset` — once
  work is shared. `cherry-pick` when you need one commit, not a whole branch.
- **CTA**: full breakdown in the carousel below — 33 slides, Git internals from
  `.git/objects` to `rebase`. Follow for more backend + tooling writeups.
- **Hashtags**: `#git #softwareengineering #versioncontrol #backend #devtools`

Story tone: first person, direct, no scenario framing (these are real
experiences per the author).

## Build steps

1. Author `Main.dc.html` + `Slide02–33.dc.html` + `canvas.json` in
   `02-github/carousel/` as working files.
2. Seed with `seed-canvas.mjs` → `git-internals-carousel.html`, title
   "Git Internals Carousel".
3. `--check` the seeded file.
4. Publish via Artifact tool, `contract: "0.1.31"`, favicon 🌿 (or a git-ish
   emoji), capabilities per this user's roster.
5. Write `02-github/linkedin-post.md`.
6. Commit both the carousel working files and the post.

## Out of scope

- No animation beyond a single CSS reveal if any (static PNG export is the point).
- No interactive controls — every artboard is static.
- Not covered: GPG signing internals, git internals of pack files / delta
  compression, worktrees, `git notes`, LFS (listed as "explore further" only).

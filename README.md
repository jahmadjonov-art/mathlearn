# Open Study

A free learning hub with a self-paced mathematics course and starter classes in
English and SQL. Learners can browse without creating an account; lessons are
free and work on phones, tablets, and computers.

The same math course is live in two places, and they remember progress differently:

| | Where | Progress |
|---|---|---|
| **Public site** | https://mediumvioletred-lyrebird-185443.hostingersite.com/ | Saved in the browser you use. Another device, or cleared site data, starts again. |
| **Private page** | https://claude.ai/artifact/PvHyJcrAx6Sqa6jVrgtcva | Saved to the owner's claude.ai account, so it follows them between devices. |

The difference is not a setting: the claude.ai page can store data against a
signed-in account, and a plain static site has no accounts to store it against.
The math code is identical in both; `store.js` uses the account when one is
there and the browser otherwise. English and SQL each include introductory
lessons with practice checks, and their completion is saved in the current
browser.

## What exists

| | |
|---|---|
| Curriculum map | 13 levels, 111 modules, **589 skills** — the whole route, written out |
| Practice built | **236 skills** (levels 0–5: counting → geometry), unlimited generated questions |
| Lesson prose | 236 written lessons, about 16,300 words |
| Other starter classes | English and SQL, with two interactive lessons each |
| Checks | 85,000+ generated questions and 1,500+ diagrams validated per run, plus a real Chromium run |

Levels 6–12 are mapped in full and listed in the app as being written. Progress
is stored per skill id, so adding a level never disturbs existing progress.

## The route

0. Number sense — counting, place value, the facts worth knowing by heart
1. Whole-number arithmetic — written methods, factors and primes, signed numbers
2. Fractions, decimals, percents — and the proportional reasoning under all of it
3. Pre-algebra — letters for numbers, equations, the coordinate plane
4. Algebra I — functions, lines, systems, quadratics
5. Geometry — shape, measurement, trigonometry, proof
6. Algebra II and trigonometry — the full function toolkit, logs, the unit circle
7. **SAT and ACT** — everything above re-aimed at the tests, with timing and method
8. Calculus — rates of change and accumulation, through a first look at several variables
9. Discrete mathematics and the mathematics of computing — logic, proof, counting,
   number theory, binary and bits, graphs, complexity, and an explicit
   maths-to-code translation module
10. Linear algebra — vectors, matrices, eigenvalues, least squares
11. Probability and statistics — including a module on how statistics goes wrong
12. Applied tracks — money and accounting (the CPA arithmetic), trading and
    quantitative mathematics, machine learning, optimisation, interview mathematics

## Site layout

```
index.html      learning hub and course catalog
course.html     shared lesson page for English and SQL
site.css        responsive hub and lesson styles
courses.js      course catalog and starter lesson content
site.js         search, filters, lesson navigation and browser progress
src/
  index.html      mathematics course page
  mathcore.js     fractions, integers, an expression parser, maths typesetting
  curriculum.js   the whole map — levels, modules, skills, stable skill ids
  figures.js      geometry diagrams, drawn as SVG from the same numbers a question uses
  generators.js   one problem generator per skill
  grade.js        decides whether a typed answer is right
  engine.js       mastery levels, spaced review, unlocking, session building
  store.js        progress persistence (artifact db, localStorage fallback)
  app.js          views and interaction
  lessons/<module>.json   written lesson prose, keyed by skill id
tests/
  run.sh          every suite; run this before publishing
  t-portal.js     learning hub, starter lessons, and saved progress
```

There is no build step and no runtime dependency: this is a static HTML, CSS,
and JavaScript site. Serve or publish the repository root so the hub is at `/`
and the complete math course remains at `/src/index.html`. The browser tests use
Playwright and Chromium; the learning pages themselves do not.

## Diagrams

A question may carry a `figure`: an SVG string built by `figures.js` from the same
numbers the question is asked with. Three rules, each learned the hard way:

**A diagram is drawn to its numbers.** Early drafts drew every triangle from one
fixed template, so a triangle labelled with a 134-degree apex appeared acute, and a
70-degree central angle was drawn at 140. Use `triangleAngles`, `rightTriangle`,
`elevation` and the like, which compute the geometry from the labels. Where a
figure is only schematic (`areaShape`, `solid`) it says *not to scale* on itself.

**A diagram must fit its canvas.** Anything drawn outside the viewBox is silently
cut off. `tests/t-figures.js` measures every figure any generator produces, and
parses the drawn shapes to confirm angles, leg ratios and lines of sight match
what is written beside them.

**A diagram is markup, not text.** It is inserted unescaped, so only `figures.js`
may build one and nothing a learner types may reach it. The same test fails on
any scriptable content.

Not every skill has a diagram yet. In level 5, those that would most benefit and
lack one are `triangle-inequality`, `special-right-triangles`,
`similar-side-lengths`, `polygon-angles`, `congruence-criteria` and
`circle-equation`; the logic and proof module is text by nature.

## How the teaching works

- **Six mastery stages per skill.** Two correct in a row promotes; a wrong
  answer demotes one stage. A skill counts as learned at stage 3.
- **Spaced review.** A skill falls due 1, 2, 4, 9 then 21 days after it was last
  answered correctly, so it keeps coming back at widening intervals.
- **Soft gating.** Levels are recommended in order and open as the previous one
  reaches 80%, but any level can be opened early, and a placement check can
  credit a whole level at once.
- **Generated questions.** One generator per skill, seeded, with a difficulty
  tier that rises with mastery. No answer key exists to memorise, and every
  question can show its full working — including the mistake most people make.
- **Graded by value, not spelling.** Algebraic answers are checked by sampling
  both expressions at random points, so any correct rearrangement is accepted.

## The rules that keep it honest

**Skill ids are permanent.** Progress is keyed on them. Rename a skill's title
freely; never change its id, and never reuse one.

**A skill is practisable when `generators.js` has an entry under its id.** The
app derives that itself, so there is no "built" flag to keep in sync. A skill
with no generator shows as *being written* and is skipped by every session.

**A generator returns a question and its full working.** Signature
`fn(R, d) -> question`, where `R` is a seeded random source and `d` is a
difficulty tier (1–3). Shape:

```js
{ prompt, kind, answer, solution: [...],
  choices?, fields?, lowest?, tol?, unit?, requireFactored?, answerAlt? }
```

`kind` is one of `num`, `frac`, `mc`, `expr`, `text`, `multi`.

**Maths is delimited by `~tildes~`, not dollars**, because prices appear
throughout and `$12.50` has to survive as text. Inside a segment: `\f{a}{b}` for
a stacked fraction, `^{}` and `_{}`, `sqrt{}`, and backslash words such as
`\in`, `\le`, `\sum` for symbols that would otherwise collide with English.

**The tests check what the learner sees, not just what the code produced.** Every
string is rendered and the suite fails if a backslash command or a stray math
delimiter survives into the output. That rule exists because raw `\times` once
reached the screen in 92 skills while every other check passed.

**Every generator is exercised 360 times before it ships** — `tests/run.sh`
round-trips each one's own stated answer through the real grader and rejects
unbalanced delimiters, duplicate multiple-choice options, missing working, and
currency that has landed inside maths markup. Two content bugs and four code
bugs were caught this way during the first build; do not skip it.

## Adding a class

Add an entry to `COURSES` in `courses.js` to place a class on the home page. For
a short self-contained course, add matching lesson data to `LESSONS`; the shared
lesson page provides navigation, explanations, example code, quick checks, and
browser-based completion tracking. Use the existing math app for a subject that
needs generated practice, spaced review, and a larger curriculum.

Run `tests/run.sh` and publish the repository root as a static site. Keep
`index.html` at the archive root. The site has no build step or backend setup.

## Adding a math level

1. Write the generators in `src/generators.js` under the ids already in
   `src/curriculum.js`. Nothing else needs touching for practice to appear.
2. Write `src/lessons/<module>.json` — one entry per skill, with `why` (the
   intuition, not the procedure), optional `sections`, `traps`, and `code` where
   a programming parallel genuinely helps.
3. Run `tests/run.sh`.
4. Publish to **both** places, or they drift apart. Progress is keyed to stable
   skill ids; never change or reuse an existing id.

   - **Public site:** upload the repository root as a static site to the
     Hostinger website at the address above. Its account details live in
     `.hostinger/site.json`, which git ignores because this repository is public.
   - **Private page:** republish the claude.ai artifact to the **same URL** above,
     or its owner loses their saved progress and their link. Pass that URL as the
     Artifact tool's `url`, and pass `generators.js`, any changed source file, and
     the new `lessons/*.json` in `files`; files you leave out are kept, and
     omitting `capabilities` carries the stored `db`/`user` declaration forward.

   **Two traps worth knowing:**
   - Do not send `src/index.html` to the claude.ai page unless it really changed.
     Its "Open Study" and "All classes" links point at `/`, the hub on the public
     site, and lead nowhere on claude.ai. Leaving the file out keeps the page's
     own copy.
   - The Artifact tool only reads paths under the session's working directory or
     its scratchpad. When this repository is cloned outside that directory, copy
     `src/` into the scratchpad and publish from there (`diff -r` the copy
     against `src/` first). The repository stays the source of truth; the copy is
     only a staging area.

Write for someone who is not a programmer and wants to understand, not be
impressed: plain English, no unexplained jargon, and say why a rule is true
rather than asserting it.

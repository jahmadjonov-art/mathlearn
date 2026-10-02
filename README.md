# Zero to Quant

A self-paced mathematics course that starts at counting and place value and runs
to the mathematics used in quantitative finance, statistics and computing.

**Live page:** https://claude.ai/artifact/PvHyJcrAx6Sqa6jVrgtcva
(private; progress is saved against the owner's account and follows him between
devices)

## What exists

| | |
|---|---|
| Curriculum map | 13 levels, 111 modules, **589 skills** — the whole route, written out |
| Practice built | **131 skills** (levels 0–3: counting → pre-algebra), unlimited generated questions |
| Lesson prose | 131 written lessons, about 7,800 words |
| Checks | 47,000+ generated questions validated per run, plus a real Chromium run |

Levels 4–12 are mapped in full and listed in the app as being written. Progress
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

## Layout

```
src/
  index.html      the page: title, design tokens, both themes, script tags
  mathcore.js     fractions, integers, an expression parser, maths typesetting
  curriculum.js   the whole map — levels, modules, skills, stable skill ids
  generators.js   one problem generator per skill
  grade.js        decides whether a typed answer is right
  engine.js       mastery levels, spaced review, unlocking, session building
  store.js        progress persistence (artifact db, localStorage fallback)
  app.js          views and interaction
  lessons/<module>.json   written lesson prose, keyed by skill id
tests/
  run.sh          every suite; run this before publishing
```

No build step and no dependencies in the page itself: `src/` is plain HTML and
JavaScript, served as published files. The test suite uses Playwright with the
Chromium already present in the build environment.

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

**Every generator is exercised 360 times before it ships** — `tests/run.sh`
round-trips each one's own stated answer through the real grader and rejects
unbalanced delimiters, duplicate multiple-choice options, missing working, and
currency that has landed inside maths markup. Two content bugs and four code
bugs were caught this way during the first build; do not skip it.

## Adding a level

1. Write the generators in `src/generators.js` under the ids already in
   `src/curriculum.js`. Nothing else needs touching for practice to appear.
2. Write `src/lessons/<module>.json` — one entry per skill, with `why` (the
   intuition, not the procedure), optional `sections`, `traps`, and `code` where
   a programming parallel genuinely helps.
3. Run `tests/run.sh`.
4. Republish the artifact to the **same URL** above, or the owner loses his saved
   progress and his link.

Write for someone who is not a programmer and wants to understand, not be
impressed: plain English, no unexplained jargon, and say why a rule is true
rather than asserting it.

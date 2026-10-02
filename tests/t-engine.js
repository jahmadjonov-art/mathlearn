const E = require('../src/engine.js');
const CUR = require('../src/curriculum.js');
let fails = 0, n = 0;
function ok(c, label) { n++; if (!c) { fails++; console.log('FAIL: ' + label); } }
function eq(a, b, label) { n++; if (a !== b) { fails++; console.log('FAIL: ' + label + ' got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b)); } }

const T = 1000;                       // an arbitrary "today"
let p = E.emptyProgress();

// a brand new learner starts at the very first practisable skill
const first = E.nextSkill(p);
ok(first && first.level.id === 'L0', 'starts in level 0');
ok(E.isPractisable(first.skill.id), 'first suggested skill is practisable');

// promotion needs two correct in a row per level, not one
const id = first.skill.id;
E.recordAnswer(p, id, true, T);
eq(E.skillState(p, id).lv, 1, 'first correct reaches level 1');
E.recordAnswer(p, id, true, T);
eq(E.skillState(p, id).lv, 1, 'one more correct is banked as streak, not a jump');
E.recordAnswer(p, id, true, T);
eq(E.skillState(p, id).lv, 2, 'two in a row promotes');
ok(!E.isLearned(p, id), 'level 2 is not learned yet');
E.recordAnswer(p, id, true, T); E.recordAnswer(p, id, true, T);
eq(E.skillState(p, id).lv, 3, 'reaches level 3');
ok(E.isLearned(p, id), 'level 3 counts as learned');

// a wrong answer demotes by one and never below 1
E.recordAnswer(p, id, false, T);
eq(E.skillState(p, id).lv, 2, 'wrong answer demotes one level');
eq(E.skillState(p, id).st, 0, 'wrong answer clears the streak');
let q = E.emptyProgress();
E.recordAnswer(q, id, true, T); E.recordAnswer(q, id, false, T); E.recordAnswer(q, id, false, T);
eq(E.skillState(q, id).lv, 1, 'never demoted below level 1');

// review scheduling
eq(E.skillState(p, id).due, T + E.INTERVALS[2], 'due date follows the level interval');
eq(E.dueSkills(p, T).length, 0, 'nothing due on the same day');
eq(E.dueSkills(p, T + E.INTERVALS[2]).length, 1, 'due once the interval has passed');

// day counters and streak
const row = p.days[String(T)];
eq(row[0], 6, 'answers counted for the day');
eq(row[1], 5, 'correct answers counted for the day');
E.touchStreak(p, T); eq(p.streak.n, 1, 'streak starts at 1');
E.touchStreak(p, T); eq(p.streak.n, 1, 'same day does not double-count');
E.touchStreak(p, T + 1); eq(p.streak.n, 2, 'consecutive day extends the streak');
E.touchStreak(p, T + 5); eq(p.streak.n, 1, 'a gap resets the streak');

// gating: level 1 is shut until level 0 is 80% learned, and the override opens it
let g = E.emptyProgress();
ok(E.levelUnlocked(g, 'L0'), 'level 0 is always open');
ok(!E.levelUnlocked(g, 'L1'), 'level 1 starts shut');
g.opened['L1'] = 1;
ok(E.levelUnlocked(g, 'L1'), 'the override opens a level');
let h = E.emptyProgress();
CUR.levels[0].modules.forEach(m => m.skills.forEach(s => {
  h.skills[s.id] = { a: 5, c: 5, st: 0, lv: 3, due: T + 4, last: T };
}));
ok(E.levelUnlocked(h, 'L1'), 'finishing level 0 opens level 1');
eq(Math.round(E.levelStats(h, 'L0').pct * 100), 100, 'level 0 reads as fully learned');

// sessions
const s1 = E.buildSession(h, { kind: 'skill', skillId: id, count: 8 });
eq(s1.length, 8, 'skill session has the requested length');
ok(s1.every(it => it.id === id), 'skill session stays on one skill');
eq(s1[0].tier, 2, 'a level-3 skill is practised at tier 2');
const s2 = E.buildSession(h, { kind: 'module', moduleId: 'M0.1', count: 10 });
eq(s2.length, 10, 'module session has the requested length');
ok(new Set(s2.map(x => x.id)).size > 1, 'module session mixes skills');
const s3 = E.buildSession(h, { kind: 'review', today: T + 50, count: 15 });
ok(s3.length > 0 && s3.length <= 15, 'review session is bounded');
const s4 = E.buildSession(h, { kind: 'level', levelId: 'L0', count: 25 });
eq(s4.length, 25, 'level exam length');
ok(s4.every(it => E.isPractisable(it.id)), 'sessions only contain practisable skills');

// an empty review queue falls back to the stalest skills rather than nothing
const s5 = E.buildSession(h, { kind: 'review', today: T, count: 10 });
ok(s5.length > 0, 'review never comes back empty when something has been studied');

// overview and weak spots
const ov = E.overview(h, T);
eq(ov.learned, E.levelStats(h, 'L0').total, 'overview counts learned skills');
ok(ov.totalSkills === 589, 'overview sees the whole map (' + ov.totalSkills + ')');
ok(ov.builtSkills === 131, 'overview counts practisable skills (' + ov.builtSkills + ')');
let w = E.emptyProgress();
w.skills[id] = { a: 10, c: 3, st: 0, lv: 1, due: T, last: T };
eq(E.weakSkills(w)[0].id, id, 'weak skills surfaces a low accuracy');

// every skill the map says exists must be addressable
let unknown = [];
CUR.levels.forEach(l => l.modules.forEach(m => m.skills.forEach(s => {
  if (!E.INDEX.bySkill[s.id]) unknown.push(s.id);
})));
eq(unknown.length, 0, 'index covers every skill');

console.log(fails ? fails + ' of ' + n + ' engine checks FAILED' : 'all ' + n + ' engine checks passed');
process.exit(fails ? 1 : 0);

/* engine.js — what counts as learned, what to study next, and when to review.
   Pure functions over a progress object, so the rules can be tested without a
   browser. The progress shape is deliberately terse: it is stored as one JSON
   document per learner and read on every page load.

     progress = {
       v: 2,
       skills: { <skillId>: { a, c, st, lv, due, last } },   // attempts, correct,
                                                            // streak, level 0-5,
                                                            // due day, last day
       days:   { <dayNumber>: [answered, correct] },
       streak: { n, last },
       opened: { <levelId>: 1 }      // levels unlocked by hand
     }
*/
(function (root) {
  'use strict';
  var CUR = root.CURRICULUM || require('./curriculum.js');
  var GEN = root.GENERATORS || require('./generators.js');

  var MS_DAY = 86400000;
  /* Days are counted in the learner's own local time, so "tomorrow" means after
     their midnight rather than UTC's. */
  function dayOf(ts) {
    var d = new Date(ts === undefined ? Date.now() : ts);
    return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / MS_DAY);
  }

  /* Review intervals in days, indexed by level. Level 5 is the longest gap a
     skill reaches; it keeps coming back, just rarely. */
  var INTERVALS = [0, 1, 2, 4, 9, 21];
  var LEARNED = 3;       /* level at which a skill counts toward progress */
  var MASTERED = 5;

  function blankSkill() { return { a: 0, c: 0, st: 0, lv: 0, due: 0, last: 0 }; }

  function emptyProgress() {
    return { v: 2, skills: {}, days: {}, streak: { n: 0, last: 0 }, opened: {} };
  }

  function skillState(progress, id) {
    return (progress.skills && progress.skills[id]) || blankSkill();
  }

  /* Record one answer and return the updated skill state. */
  function recordAnswer(progress, id, correct, today) {
    if (!progress.skills) progress.skills = {};
    var s = progress.skills[id] || blankSkill();
    s.a += 1;
    s.last = today;
    if (correct) {
      s.c += 1;
      s.st += 1;
      /* Two correct in a row at the current level promotes. One lucky guess
         should not advance a skill a whole stage. */
      if (s.lv === 0) { s.lv = 1; s.st = 0; }   /* the first correct answer opens the
                                                   skill; it does not also count
                                                   toward the next promotion */
      else if (s.st >= 2) { s.lv = Math.min(MASTERED, s.lv + 1); s.st = 0; }
    } else {
      s.st = 0;
      s.lv = Math.max(1, s.lv - 1);
    }
    s.due = today + INTERVALS[s.lv];
    progress.skills[id] = s;

    var dayKey = String(today);
    if (!progress.days) progress.days = {};
    var row = progress.days[dayKey] || [0, 0];
    row[0] += 1;
    if (correct) row[1] += 1;
    progress.days[dayKey] = row;
    return s;
  }

  /* A day on which at least one question was answered extends the streak. */
  function touchStreak(progress, today) {
    if (!progress.streak) progress.streak = { n: 0, last: 0 };
    var st = progress.streak;
    if (st.last === today) return st;
    st.n = (st.last === today - 1) ? st.n + 1 : 1;
    st.last = today;
    return st;
  }

  function isLearned(progress, id) { return skillState(progress, id).lv >= LEARNED; }
  function isMastered(progress, id) { return skillState(progress, id).lv >= MASTERED; }
  function isPractisable(id) { return !!GEN[id]; }

  /* ---------- structure helpers ---------- */
  var INDEX = (function () {
    var bySkill = {}, byModule = {}, byLevel = {}, order = [];
    CUR.levels.forEach(function (lv, li) {
      byLevel[lv.id] = { level: lv, index: li };
      lv.modules.forEach(function (m, mi) {
        byModule[m.id] = { module: m, level: lv, index: mi };
        m.skills.forEach(function (s, si) {
          bySkill[s.id] = { skill: s, module: m, level: lv, index: si };
          order.push(s.id);
        });
      });
    });
    return { bySkill: bySkill, byModule: byModule, byLevel: byLevel, order: order };
  })();

  function moduleStats(progress, moduleId) {
    var m = INDEX.byModule[moduleId].module;
    var total = 0, learned = 0, mastered = 0, ready = 0;
    m.skills.forEach(function (s) {
      total++;
      if (isPractisable(s.id)) ready++;
      if (isLearned(progress, s.id)) learned++;
      if (isMastered(progress, s.id)) mastered++;
    });
    return { total: total, learned: learned, mastered: mastered, ready: ready,
             pct: total ? learned / total : 0, built: total ? ready / total : 0 };
  }

  function levelStats(progress, levelId) {
    var lv = INDEX.byLevel[levelId].level;
    var total = 0, learned = 0, mastered = 0, ready = 0;
    lv.modules.forEach(function (m) {
      var st = moduleStats(progress, m.id);
      total += st.total; learned += st.learned; mastered += st.mastered; ready += st.ready;
    });
    return { total: total, learned: learned, mastered: mastered, ready: ready,
             pct: total ? learned / total : 0, built: total ? ready / total : 0 };
  }

  /* A level opens when the one before it is 80% learned, or when the learner
     opens it by hand. Gates here are advice with an override, not a wall: the
     ordering is what carries the teaching, and someone who already knows the
     earlier material should not have to grind through it. */
  function levelUnlocked(progress, levelId) {
    var at = INDEX.byLevel[levelId].index;
    if (at === 0) return true;
    if (progress.opened && progress.opened[levelId]) return true;
    var prev = CUR.levels[at - 1];
    return levelStats(progress, prev.id).pct >= 0.8;
  }

  function moduleUnlocked(progress, moduleId) {
    var info = INDEX.byModule[moduleId];
    if (!levelUnlocked(progress, info.level.id)) return false;
    if (info.index === 0) return true;
    if (progress.opened && progress.opened[moduleId]) return true;
    var prev = info.level.modules[info.index - 1];
    return moduleStats(progress, prev.id).pct >= 0.7;
  }

  /* ---------- what to do next ---------- */

  /* Every practisable skill whose review date has arrived, soonest first. */
  function dueSkills(progress, today, limit) {
    var out = [];
    Object.keys(progress.skills || {}).forEach(function (id) {
      var s = progress.skills[id];
      if (!INDEX.bySkill[id] || !isPractisable(id)) return;
      if (s.lv >= 1 && s.due <= today) out.push({ id: id, due: s.due, lv: s.lv });
    });
    out.sort(function (a, b) { return a.due - b.due || a.lv - b.lv; });
    return limit ? out.slice(0, limit) : out;
  }

  /* The next skill to learn: first practisable, not-yet-learned skill in
     curriculum order inside an unlocked module. */
  function nextSkill(progress) {
    for (var i = 0; i < CUR.levels.length; i++) {
      var lv = CUR.levels[i];
      if (!levelUnlocked(progress, lv.id)) continue;
      for (var j = 0; j < lv.modules.length; j++) {
        var m = lv.modules[j];
        if (!moduleUnlocked(progress, m.id)) continue;
        for (var k = 0; k < m.skills.length; k++) {
          var s = m.skills[k];
          if (!isPractisable(s.id)) continue;
          if (!isLearned(progress, s.id)) {
            return { skill: s, module: m, level: lv, state: skillState(progress, s.id) };
          }
        }
      }
    }
    return null;
  }

  /* Difficulty tier for a skill, from how well it is known. */
  function tierFor(state) {
    if (!state || state.lv <= 1) return 1;
    if (state.lv <= 3) return 2;
    return 3;
  }

  /* Build a practice session: a list of {skillId, tier}. */
  function buildSession(progress, spec) {
    var today = spec.today === undefined ? dayOf() : spec.today;
    var items = [];
    function push(id, n) {
      var st = skillState(progress, id);
      for (var i = 0; i < n; i++) items.push({ id: id, tier: tierFor(st) });
    }
    if (spec.kind === 'skill') {
      push(spec.skillId, spec.count || 8);
    } else if (spec.kind === 'module') {
      var m = INDEX.byModule[spec.moduleId].module;
      var ids = m.skills.map(function (s) { return s.id; }).filter(isPractisable);
      var per = Math.max(1, Math.round((spec.count || 10) / Math.max(1, ids.length)));
      ids.forEach(function (id) { push(id, per); });
      items = items.slice(0, spec.count || 10);
    } else if (spec.kind === 'review') {
      var due = dueSkills(progress, today, spec.count || 15);
      due.forEach(function (row) { push(row.id, 1); });
      /* If nothing is due, revisit the least-recently-practised learned skills
         rather than showing an empty session. */
      if (!items.length) {
        var learned = Object.keys(progress.skills || {})
          .filter(function (id) { return isPractisable(id) && progress.skills[id].lv >= 1; })
          .sort(function (a, b) { return progress.skills[a].last - progress.skills[b].last; })
          .slice(0, spec.count || 10);
        learned.forEach(function (id) { push(id, 1); });
      }
    } else if (spec.kind === 'level') {
      var lv = INDEX.byLevel[spec.levelId].level;
      var pool = [];
      lv.modules.forEach(function (m2) {
        m2.skills.forEach(function (s) { if (isPractisable(s.id)) pool.push(s.id); });
      });
      var want = spec.count || 25;
      for (var i = 0; i < want && pool.length; i++) push(pool[i % pool.length], 1);
      items = items.slice(0, want);
    }
    return items;
  }

  /* ---------- summary for the dashboard ---------- */
  function overview(progress, today) {
    today = today === undefined ? dayOf() : today;
    var totalSkills = 0, builtSkills = 0, learned = 0, mastered = 0, attempts = 0, correct = 0;
    CUR.levels.forEach(function (lv) {
      var st = levelStats(progress, lv.id);
      totalSkills += st.total; builtSkills += st.ready; learned += st.learned; mastered += st.mastered;
    });
    Object.keys(progress.skills || {}).forEach(function (id) {
      attempts += progress.skills[id].a; correct += progress.skills[id].c;
    });
    var todayRow = (progress.days || {})[String(today)] || [0, 0];
    return {
      totalSkills: totalSkills, builtSkills: builtSkills, learned: learned, mastered: mastered,
      attempts: attempts, correct: correct,
      accuracy: attempts ? correct / attempts : 0,
      todayAnswered: todayRow[0], todayCorrect: todayRow[1],
      due: dueSkills(progress, today).length,
      streak: (progress.streak || {}).n || 0
    };
  }

  /* Skills the learner gets wrong most often, for the weak-spots list. */
  function weakSkills(progress, limit) {
    var rows = [];
    Object.keys(progress.skills || {}).forEach(function (id) {
      var s = progress.skills[id];
      if (!INDEX.bySkill[id] || s.a < 3) return;
      var acc = s.c / s.a;
      if (acc >= 0.8) return;
      rows.push({ id: id, acc: acc, attempts: s.a, title: INDEX.bySkill[id].skill.t });
    });
    rows.sort(function (a, b) { return a.acc - b.acc || b.attempts - a.attempts; });
    return rows.slice(0, limit || 6);
  }

  var E = {
    MS_DAY: MS_DAY, INTERVALS: INTERVALS, LEARNED: LEARNED, MASTERED: MASTERED,
    dayOf: dayOf, emptyProgress: emptyProgress, blankSkill: blankSkill, skillState: skillState,
    recordAnswer: recordAnswer, touchStreak: touchStreak,
    isLearned: isLearned, isMastered: isMastered, isPractisable: isPractisable,
    INDEX: INDEX, moduleStats: moduleStats, levelStats: levelStats,
    levelUnlocked: levelUnlocked, moduleUnlocked: moduleUnlocked,
    dueSkills: dueSkills, nextSkill: nextSkill, tierFor: tierFor,
    buildSession: buildSession, overview: overview, weakSkills: weakSkills
  };
  root.ENGINE = E;
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof window !== 'undefined' ? window : globalThis);

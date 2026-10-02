/* app.js — views and interaction.
   One screen at a time, driven by a tiny state object. All learner-facing text
   goes through MC.rich(), which escapes HTML and typesets the maths, so nothing
   generated reaches the page as raw markup. */
(function () {
  'use strict';
  var MC = window.MC, CUR = window.CURRICULUM, GEN = window.GENERATORS,
      GRADE = window.GRADE, E = window.ENGINE;

  var S = {
    progress: null,
    store: null,
    view: 'today',
    session: null,
    teach: null,
    lessons: {},            /* moduleId -> lesson json or false when missing */
    syncNote: 'This browser only',
    syncState: 'local',
    openLevels: {}
  };

  /* ---------------- small helpers ---------------- */
  function rich(s) { return MC.rich(s); }
  function esc(s) { return MC.esc(s); }
  function $(id) { return document.getElementById(id); }
  function today() { return E.dayOf(); }
  function pct(x) { return Math.round(x * 100); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

  function save() {
    if (S.store) S.store.save(S.progress);
  }

  /* A seed that changes per question but is reproducible within one question,
     so re-rendering never swaps the problem under the learner. */
  function seedFor(id, n) {
    var h = 0;
    for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return Math.abs((h ^ (n * 2654435761)) % 2147483647) || 7;
  }

  function makeQuestion(skillId, tier, nonce) {
    var gen = GEN[skillId];
    if (!gen) return null;
    var R = MC.makeRandom(seedFor(skillId, nonce));
    try { return gen(R, tier); }
    catch (e) { return null; }
  }

  /* ---------------- boot ---------------- */
  function boot() {
    S.store = new window.STORE(function (state, detail) {
      S.syncState = state;
      if (detail) S.syncNote = detail;
      paintBar();
    });
    S.store.open().then(function (data) {
      S.progress = migrate(data) || E.emptyProgress();
      render();
      window.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden' && S.store) S.store.flush();
      });
    });
  }

  function migrate(data) {
    if (!data) return null;
    if (!data.skills) data.skills = {};
    if (!data.days) data.days = {};
    if (!data.streak) data.streak = { n: 0, last: 0 };
    if (!data.opened) data.opened = {};
    data.v = 2;
    return data;
  }

  /* ---------------- top bar ---------------- */
  function paintBar() {
    if (!S.progress) return;
    var ov = E.overview(S.progress, today());
    var cs = $('chip-streak'), cd = $('chip-due'), ct = $('chip-today');
    if (ov.streak > 0) { cs.classList.remove('hide'); cs.textContent = ov.streak + ' day' + (ov.streak === 1 ? '' : 's'); }
    else cs.classList.add('hide');
    if (ov.due > 0) { cd.classList.remove('hide'); cd.textContent = ov.due + ' to review'; }
    else cd.classList.add('hide');
    ct.textContent = ov.todayAnswered + ' today';
  }

  var TABS = [
    { id: 'today', label: 'Today', icon: 'M3 11l9-8 9 8M5 10v10h14V10' },
    { id: 'map', label: 'Course', icon: 'M4 5h16M4 12h16M4 19h10' },
    { id: 'review', label: 'Review', icon: 'M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4' },
    { id: 'stats', label: 'Progress', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
    { id: 'about', label: 'How', icon: 'M12 17v.01M12 13a2.5 2.5 0 1 0-2.5-2.5M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z' }
  ];
  function paintTabs() {
    $('tabs').innerHTML = TABS.map(function (t) {
      return '<button class="tab' + (S.view === t.id ? ' on' : '') + '" data-tab="' + t.id + '">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + t.icon + '" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '<span>' + t.label + '</span></button>';
    }).join('');
  }

  function go(view) {
    S.view = view;
    if (view !== 'practice') S.session = null;
    if (view !== 'learn') S.teach = null;
    window.scrollTo(0, 0);
    render();
  }

  /* ---------------- render ---------------- */
  function render() {
    paintTabs();
    paintBar();
    var v = $('view');
    if (S.view === 'today') v.innerHTML = viewToday();
    else if (S.view === 'map') v.innerHTML = viewMap();
    else if (S.view === 'review') v.innerHTML = viewReview();
    else if (S.view === 'stats') v.innerHTML = viewStats();
    else if (S.view === 'about') v.innerHTML = viewAbout();
    else if (S.view === 'practice') v.innerHTML = viewPractice();
    else if (S.view === 'learn') v.innerHTML = viewLearn();
    afterRender();
  }

  /* ---------------- TODAY ---------------- */
  function viewToday() {
    var ov = E.overview(S.progress, today());
    var next = E.nextSkill(S.progress);
    var fresh = ov.attempts === 0;
    var out = '';

    if (fresh) {
      out += card('lead',
        '<div class="eyebrow">Start here</div>' +
        '<h2>Mathematics from the beginning, in order</h2>' +
        '<div class="prose"><p>Thirteen levels run from counting and place value to the mathematics behind ' +
        'trading, statistics and code. Each level is broken into skills, and a skill is yours once you can ' +
        'answer it correctly several times across several days — not once.</p>' +
        '<p>Every question is generated fresh, so you can never memorise the answer, and every question ' +
        'shows its full working when you get it wrong.</p></div>' +
        '<div class="btn-row">' +
        btn('primary', 'start-first', 'Start at the beginning') +
        btn('ghost', 'start-placement', 'I know some already — check me') +
        '</div>');
    }

    if (ov.due > 0) {
      out += card('',
        '<div class="eyebrow">Due now</div>' +
        '<h2>' + plural(ov.due, 'skill') + ' ready to review</h2>' +
        '<p class="muted small">Reviewing on the day a skill falls due is what moves it from ' +
        '"I just did that" to "I know that".</p>' +
        '<div class="btn-row">' + btn('primary', 'start-review', 'Review now') + '</div>');
    }

    if (next) {
      var st = E.skillState(S.progress, next.skill.id);
      out += card(ov.due > 0 ? '' : 'lead',
        '<div class="eyebrow">' + esc(next.level.id + ' · ' + next.module.title) + '</div>' +
        '<h2>' + esc(next.skill.t) + '</h2>' +
        '<p class="muted small">' + rich(next.skill.goal) + '</p>' +
        (st.lv > 0 ? '<div class="meter thin" style="margin-top:10px"><i style="width:' +
          pct(st.lv / E.MASTERED) + '%"></i></div><p class="tiny muted" style="margin-top:6px">' +
          'Level ' + st.lv + ' of ' + E.MASTERED + ' · ' + st.c + ' of ' + st.a + ' right so far</p>' : '') +
        '<div class="btn-row">' +
        btn('primary', 'teach:' + next.skill.id, st.lv === 0 ? 'Show me how' : 'Keep practising') +
        btn('ghost', 'practice-skill:' + next.skill.id, 'Practise') +
        '</div>');
    } else if (!fresh) {
      out += card('', '<h2>Everything built so far is learned</h2>' +
        '<p class="muted small">You have worked through every skill that currently has practice ' +
        'questions written. Keep reviewing to hold it, and look at the course map to see what is coming.</p>' +
        '<div class="btn-row">' + btn('primary', 'start-review', 'Review') + btn('ghost', 'tab:map', 'See the course') + '</div>');
    }

    out += card('flat',
      '<div class="stat-row">' +
      stat(ov.todayAnswered, 'answered today') +
      stat(ov.streak, 'day streak') +
      stat(ov.learned, 'skills learned') +
      stat(ov.attempts ? pct(ov.accuracy) + '%' : '—', 'accuracy') +
      '</div>');

    /* the thirteen-level strip */
    out += '<div class="card flat"><div class="eyebrow">The whole route</div>' +
      '<div style="display:grid;gap:7px;margin-top:10px">' +
      CUR.levels.map(function (lv) {
        var st = E.levelStats(S.progress, lv.id);
        var open = E.levelUnlocked(S.progress, lv.id);
        return '<div style="display:grid;grid-template-columns:34px 1fr auto;gap:9px;align-items:center">' +
          '<span class="tiny" style="color:var(--ink-3);font-weight:600">' + esc(lv.id) + '</span>' +
          '<div><div class="tiny" style="color:' + (open ? 'var(--ink)' : 'var(--ink-3)') + '">' +
          esc(lv.title) + '</div><div class="meter thin" style="margin-top:3px"><i style="width:' +
          pct(st.pct) + '%"></i></div></div>' +
          '<span class="tiny muted" style="font-variant-numeric:tabular-nums">' + st.learned + '/' + st.total + '</span>' +
          '</div>';
      }).join('') + '</div></div>';

    var weak = E.weakSkills(S.progress, 4);
    if (weak.length) {
      out += card('', '<div class="eyebrow">Worth another look</div>' +
        '<h2>Where you are losing marks</h2>' +
        weak.map(function (w) {
          return '<div class="skill"><span class="skill-dot l1"></span><span class="skill-name">' +
            esc(w.title) + '<small>' + pct(w.acc) + '% right over ' + plural(w.attempts, 'attempt') +
            '</small></span>' + btn('ghost small', 'practice-skill:' + w.id, 'Practise') + '</div>';
        }).join(''));
    }
    return out;
  }

  function stat(v, label) {
    return '<div class="stat"><b>' + esc(String(v)) + '</b><span>' + esc(label) + '</span></div>';
  }
  function card(cls, inner) { return '<div class="card ' + cls + '">' + inner + '</div>'; }
  function btn(cls, action, label) {
    return '<button class="btn ' + cls + '" data-act="' + esc(action) + '">' + esc(label) + '</button>';
  }

  /* ---------------- COURSE MAP ---------------- */
  function viewMap() {
    var out = '<h1>The course</h1><p class="muted small">' +
      CUR.levels.length + ' levels, ' +
      CUR.levels.reduce(function (a, l) { return a + l.modules.length; }, 0) + ' modules, ' +
      E.overview(S.progress).totalSkills + ' skills. Levels open as you work, and you can open one early ' +
      'if you already know the material.</p>';

    CUR.levels.forEach(function (lv) {
      var st = E.levelStats(S.progress, lv.id);
      var open = E.levelUnlocked(S.progress, lv.id);
      var isOpen = !!S.openLevels[lv.id];
      out += '<details class="lvl' + (open ? '' : ' locked') + '"' + (isOpen ? ' open' : '') +
        ' data-level="' + esc(lv.id) + '">' +
        '<summary><span class="lvl-tag">' + esc(lv.id) + '</span>' +
        '<span class="lvl-name">' + esc(lv.title) + '</span>' +
        '<span class="tiny muted" style="font-variant-numeric:tabular-nums">' + pct(st.pct) + '%</span>' +
        '<span class="lvl-meta">' + esc(lv.blurb) + '</span></summary>' +
        '<div class="lvl-body">' +
        '<div class="meter thin" style="margin:11px 0"><i style="width:' + pct(st.pct) + '%"></i></div>' +
        '<p class="tiny muted">' + st.learned + ' of ' + st.total + ' skills learned · ' +
        st.ready + ' have practice questions written' +
        (st.ready < st.total ? ' · ' + (st.total - st.ready) + ' still being built' : '') + '</p>' +
        (!open ? '<p class="tiny muted">Recommended after the level before it. ' +
          '</p><div class="btn-row">' + btn('ghost small', 'open-level:' + lv.id, 'Open it anyway') + '</div>' : '') +
        lv.modules.map(function (m) { return moduleBlock(m, open); }).join('') +
        (st.ready >= 4 ? '<div class="btn-row">' + btn('ghost small', 'exam:' + lv.id, 'Mixed test on this level') + '</div>' : '') +
        '</div></details>';
    });
    return out;
  }

  function moduleBlock(m, levelOpen) {
    var st = E.moduleStats(S.progress, m.id);
    var open = levelOpen && E.moduleUnlocked(S.progress, m.id);
    return '<div class="mod"><div class="mod-head"><b>' + esc(m.title) + '</b>' +
      '<span class="tiny muted" style="margin-left:auto;font-variant-numeric:tabular-nums">' +
      st.learned + '/' + st.total + '</span></div>' +
      '<div class="mod-aim">' + rich(m.aim) + '</div>' +
      m.skills.map(function (s) {
        var ss = E.skillState(S.progress, s.id);
        var built = E.isPractisable(s.id);
        var cls = ss.lv >= 5 ? 'l5' : ss.lv >= 3 ? 'l3' : ss.lv >= 1 ? 'l1' : '';
        return '<div class="skill"><span class="skill-dot ' + cls + '"></span>' +
          '<span class="skill-name">' + esc(s.t) + '<small>' + rich(s.goal) + '</small></span>' +
          (built ? btn('ghost small', 'teach:' + s.id, ss.lv ? 'Practise' : 'Learn')
                 : '<span class="soon">being written</span>') +
          '</div>';
      }).join('') +
      (st.ready >= 2 && open ? '<div class="btn-row">' +
        btn('ghost small', 'practice-module:' + m.id, 'Mixed practice on this module') + '</div>' : '');
  }

  /* ---------------- REVIEW ---------------- */
  function viewReview() {
    var due = E.dueSkills(S.progress, today());
    var out = '<h1>Review</h1>';
    if (!due.length) {
      var studied = Object.keys(S.progress.skills || {}).length;
      out += card('', '<h2>Nothing is due today</h2>' +
        '<p class="muted small">' + (studied
          ? 'Everything you have learned is still inside its review window. You can run an early ' +
            'review anyway, or carry on with new material.'
          : 'Once you have learned a skill it will start appearing here on a schedule — one day later, ' +
            'then two, four, nine, three weeks.') + '</p>' +
        '<div class="btn-row">' + (studied ? btn('primary', 'start-review', 'Early review') : '') +
        btn('ghost', 'tab:today', 'Back to today') + '</div>');
      return out;
    }
    out += card('lead', '<h2>' + plural(due.length, 'skill') + ' due</h2>' +
      '<p class="muted small">A mixed set drawn from what you have already learned. Reviews are short ' +
      'by design — one or two questions each.</p>' +
      '<div class="btn-row">' + btn('primary', 'start-review', 'Start review') + '</div>');
    out += '<div class="card flat"><div class="eyebrow">In this review</div>' +
      due.slice(0, 20).map(function (row) {
        var info = E.INDEX.bySkill[row.id];
        var late = today() - row.due;
        return '<div class="skill"><span class="skill-dot ' + (row.lv >= 3 ? 'l3' : 'l1') + '"></span>' +
          '<span class="skill-name">' + esc(info.skill.t) + '<small>' + esc(info.level.id + ' · ' + info.module.title) +
          (late > 0 ? ' · ' + plural(late, 'day') + ' overdue' : ' · due today') + '</small></span></div>';
      }).join('') + '</div>';
    return out;
  }

  /* ---------------- STATS ---------------- */
  function viewStats() {
    var ov = E.overview(S.progress, today());
    var out = '<h1>Progress</h1>';
    out += card('flat', '<div class="stat-row">' +
      stat(ov.learned, 'skills learned') + stat(ov.mastered, 'fully mastered') +
      stat(ov.attempts, 'questions answered') + stat(ov.attempts ? pct(ov.accuracy) + '%' : '—', 'all-time accuracy') +
      '</div>');

    /* last fourteen days */
    var bars = [], max = 1;
    for (var i = 13; i >= 0; i--) {
      var d = today() - i, row = (S.progress.days || {})[String(d)] || [0, 0];
      bars.push({ d: d, n: row[0], c: row[1] });
      if (row[0] > max) max = row[0];
    }
    out += '<div class="card"><div class="eyebrow">Last fourteen days</div>' +
      '<h2>Questions answered</h2>' +
      '<div style="display:flex;align-items:flex-end;gap:4px;height:90px;margin-top:8px">' +
      bars.map(function (b) {
        var h = Math.max(2, Math.round(b.n / max * 86));
        var acc = b.n ? b.c / b.n : 0;
        return '<div title="' + b.n + ' answered" style="flex:1;min-width:0;display:flex;flex-direction:column;' +
          'justify-content:flex-end;height:100%"><div style="height:' + h + 'px;border-radius:4px 4px 0 0;' +
          'background:' + (b.n === 0 ? 'var(--card-2)' : acc >= 0.8 ? 'var(--accent)' : acc >= 0.6 ? 'var(--warn)' : 'var(--bad)') +
          '"></div></div>';
      }).join('') + '</div>' +
      '<p class="tiny muted" style="margin-top:8px">Bar height is how many questions you answered; ' +
      'colour is how many you got right — green above 80%, amber above 60%.</p></div>';

    /* per level */
    out += '<div class="card"><div class="eyebrow">By level</div>';
    CUR.levels.forEach(function (lv) {
      var st = E.levelStats(S.progress, lv.id);
      out += '<div style="margin:11px 0"><div style="display:flex;gap:8px;align-items:baseline">' +
        '<span class="small" style="font-weight:500">' + esc(lv.id + ' ' + lv.title) + '</span>' +
        '<span class="tiny muted" style="margin-left:auto;font-variant-numeric:tabular-nums">' +
        st.learned + '/' + st.total + '</span></div>' +
        '<div class="meter thin" style="margin-top:4px"><i style="width:' + pct(st.pct) + '%"></i></div></div>';
    });
    out += '</div>';

    var weak = E.weakSkills(S.progress, 8);
    if (weak.length) {
      out += '<div class="card"><div class="eyebrow">Weakest skills</div><h2>Below 80% right</h2>' +
        weak.map(function (w) {
          return '<div class="skill"><span class="skill-dot l1"></span><span class="skill-name">' +
            esc(w.title) + '<small>' + pct(w.acc) + '% over ' + plural(w.attempts, 'attempt') + '</small></span>' +
            btn('ghost small', 'practice-skill:' + w.id, 'Drill') + '</div>';
        }).join('') + '</div>';
    }

    out += card('flat', '<div class="eyebrow">Saving</div><p class="small muted">' + esc(S.syncNote) +
      '. Progress is stored against your account where possible, so it follows you between devices.</p>' +
      '<div class="btn-row">' + btn('ghost small', 'reset', 'Reset all progress') + '</div>');
    return out;
  }

  /* ---------------- ABOUT ---------------- */
  function viewAbout() {
    return '<h1>How this works</h1>' +
      card('', '<h2>Nothing is skipped</h2><div class="prose"><p>The course starts at counting and ' +
        'place value and runs to the mathematics used in quantitative finance, statistics and ' +
        'computing. Each level assumes only the levels before it. If something later feels impossible, ' +
        'the cause is almost always a gap earlier, and the map will show you where.</p></div>') +
      card('', '<h2>A skill is learned by coming back to it</h2><div class="prose">' +
        '<p>Each skill has six stages. A right answer moves you up, a wrong one moves you down, and ' +
        'the gap before a skill returns grows as you get it right: one day, two, four, nine, then ' +
        'three weeks. This is spaced repetition, and it is the difference between passing a test on ' +
        'Friday and still knowing the material in a year.</p></div>') +
      card('', '<h2>The questions are generated, not stored</h2><div class="prose">' +
        '<p>Every question is built from a rule, with fresh numbers each time, so there is an endless ' +
        'supply and no way to memorise an answer key. Every question can show its full working, ' +
        'step by step — including the specific mistake most people make on it.</p></div>') +
      card('', '<h2>Where this is going</h2><div class="prose">' +
        '<p>Levels 0 to 3 — counting through pre-algebra — are fully built: ' +
        E.overview(S.progress).builtSkills + ' skills with unlimited practice. The remaining levels ' +
        'are mapped out in full and are being written in order, so the course grows ahead of you. ' +
        'Your progress is kept against the skill, so nothing is lost when new material lands.</p>' +
        '<p>After pre-algebra comes algebra, geometry, the SAT and ACT layer, pre-calculus, calculus, ' +
        'discrete mathematics and the mathematics of computing, linear algebra, probability and ' +
        'statistics, and finally applied tracks: money and accounting, trading and quantitative ' +
        'mathematics, machine learning, optimisation.</p></div>') +
      card('flat', '<div class="eyebrow">Answering</div><div class="prose small">' +
        '<p>Type numbers plainly: <code>12</code>, <code>-3.5</code>, <code>3/4</code>, ' +
        '<code>1 1/2</code> for one and a half. Fractions are accepted in any equivalent form unless ' +
        'the question asks for lowest terms. For algebra, write <code>2x+3</code> or <code>2*x+3</code> — ' +
        'any correct arrangement is accepted, because the answer is checked by value, not by spelling.</p></div>');
  }

  /* ---------------- PRACTICE ---------------- */
  function startSession(spec, title, meta) {
    var items = E.buildSession(S.progress, spec);
    if (!items.length) { go('today'); return; }
    S.session = {
      spec: spec, title: title, meta: meta || '', items: items, i: 0, nonce: Date.now() % 100000,
      results: [], q: null, state: 'asking', requeued: {}, gained: []
    };
    nextQuestion();
    S.view = 'practice';
    window.scrollTo(0, 0);
    render();
  }

  function nextQuestion() {
    var s = S.session;
    if (!s) return;
    if (s.i >= s.items.length) { s.state = 'done'; return; }
    var it = s.items[s.i];
    s.q = makeQuestion(it.id, it.tier, s.nonce + s.i * 101);
    if (!s.q) { s.i++; return nextQuestion(); }
    s.state = 'asking';
    s.picked = null;
    s.verdict = null;
  }

  function viewPractice() {
    var s = S.session;
    if (!s) return viewToday();
    if (s.state === 'done') return viewSessionDone();
    var q = s.q, it = s.items[s.i];
    var info = E.INDEX.bySkill[it.id];
    var out = '<div class="card">' +
      '<div class="qmeta"><span class="eyebrow">' + esc(s.title) + '</span>' +
      '<span class="dots">' + s.items.map(function (_, k) {
        var r = s.results[k];
        return '<i class="' + (k === s.i ? 'now ' : '') + (r === true ? 'ok' : r === false ? 'no' : '') + '"></i>';
      }).join('') + '</span></div>' +
      '<p class="tiny muted" style="margin:-6px 0 10px">' + esc(info.skill.t) + '</p>' +
      '<div class="qtext">' + rich(q.prompt) + '</div>';

    if (q.kind === 'mc') {
      out += '<div class="choices">' + q.choices.map(function (c, k) {
        var cls = 'choice';
        if (s.verdict) {
          if (k === q.answer) cls += ' right';
          else if (String(k) === String(s.picked)) cls += ' wrong';
        } else if (String(k) === String(s.picked)) cls += ' picked';
        return '<button class="' + cls + '" data-choice="' + k + '"' + (s.verdict ? ' disabled' : '') + '>' +
          rich(c) + '</button>';
      }).join('') + '</div>';
    } else if (q.kind === 'multi') {
      out += '<div class="fields">' + q.fields.map(function (f, k) {
        return '<div class="field"><label for="ans' + k + '">' + rich(f.label) + '</label>' +
          '<input type="text" id="ans' + k + '" autocomplete="off" autocapitalize="off" spellcheck="false"' +
          (s.verdict ? ' disabled' : '') + '></div>';
      }).join('') + '</div>' + keypad();
    } else {
      out += '<input type="text" id="ans0" autocomplete="off" autocapitalize="off" spellcheck="false" ' +
        'placeholder="' + (q.kind === 'frac' ? 'a fraction, like 3/4' :
          q.kind === 'expr' ? 'an expression, like 2x+3' : 'your answer') + '"' +
        (s.verdict ? ' disabled' : '') + '>' + keypad();
      if (q.unit) out += '<p class="tiny muted" style="margin-top:6px">Answer in ' + esc(q.unit) + '.</p>';
    }

    if (s.verdict) {
      out += '<div class="verdict ' + (s.verdict.correct ? 'ok' : 'no') + '">' +
        '<b>' + (s.verdict.correct ? 'Correct' : 'Not right') + '</b>' +
        (s.verdict.note ? ' <span class="small muted">' + esc(s.verdict.note) + '</span>' : '') +
        (!s.verdict.correct ? '<p class="small" style="margin:8px 0 0">The answer is ' +
          '<strong>' + rich(answerText(q)) + '</strong>.</p>' : '') +
        '<ol class="steps">' + q.solution.map(function (st) { return '<li>' + rich(st) + '</li>'; }).join('') +
        '</ol></div>';
    }

    out += '<div class="btn-row">' +
      (s.verdict
        ? btn('primary', 'next-q', s.i + 1 >= s.items.length ? 'Finish' : 'Next question')
        : btn('primary', 'check', 'Check')) +
      btn('ghost', 'quit-session', 'Stop') +
      '</div></div>';
    return out;
  }

  function keypad() {
    var keys = [['/', '/'], ['-', '-'], ['.', '.'], ['^', '^'], ['sqrt(', '√'], ['pi', 'π'], ['(', '('], [')', ')']];
    return '<div class="keypad">' + keys.map(function (k) {
      return '<button type="button" data-key="' + esc(k[0]) + '">' + esc(k[1]) + '</button>';
    }).join('') + '</div>';
  }

  function answerText(q) {
    if (q.kind === 'num') return MC.fmt(q.answer, 6);
    if (q.kind === 'frac') return q.answer.d === 1 ? String(q.answer.n) : q.answer.n + '/' + q.answer.d;
    if (q.kind === 'mc') return q.choices[q.answer];
    if (q.kind === 'expr') return q.answer.replace(/\*/g, '');
    if (q.kind === 'text') return Array.isArray(q.answer) ? q.answer[0] : q.answer;
    if (q.kind === 'multi') return q.fields.map(function (f) {
      return f.label + ' = ' + (f.kind === 'frac' ? f.answer.n + '/' + f.answer.d : MC.fmt(f.answer, 6));
    }).join(', ');
    return '';
  }

  function doCheck() {
    var s = S.session;
    if (!s || s.verdict) return;
    var q = s.q;
    var raw;
    if (q.kind === 'mc') {
      if (s.picked === null || s.picked === undefined) return;
      raw = s.picked;
    } else if (q.kind === 'multi') {
      raw = q.fields.map(function (_, k) { var el = $('ans' + k); return el ? el.value : ''; });
      if (raw.every(function (v) { return !String(v).trim(); })) return;
    } else {
      var el = $('ans0');
      raw = el ? el.value : '';
      if (!String(raw).trim()) return;
    }
    var res = GRADE.check(q, raw);
    s.verdict = res;
    s.results[s.i] = res.correct;
    var before = E.skillState(S.progress, s.items[s.i].id).lv;
    E.recordAnswer(S.progress, s.items[s.i].id, res.correct, today());
    E.touchStreak(S.progress, today());
    var after = E.skillState(S.progress, s.items[s.i].id).lv;
    if (after > before && after >= E.LEARNED && before < E.LEARNED) s.gained.push(s.items[s.i].id);
    /* A missed question comes back once at the end of the session. */
    if (!res.correct && !s.requeued[s.items[s.i].id] && s.items.length < 24) {
      s.requeued[s.items[s.i].id] = 1;
      s.items.push({ id: s.items[s.i].id, tier: s.items[s.i].tier });
    }
    save();
    render();
  }

  function viewSessionDone() {
    var s = S.session;
    var n = s.results.filter(function (r) { return r !== undefined; }).length;
    var right = s.results.filter(function (r) { return r === true; }).length;
    var acc = n ? right / n : 0;
    var headline = acc === 1 ? 'All correct' : acc >= 0.8 ? 'Strong set' : acc >= 0.5 ? 'Mixed set' : 'Hard set';
    var out = card('lead', '<div class="eyebrow">' + esc(s.title) + '</div>' +
      '<h2>' + headline + ' — ' + right + ' of ' + n + '</h2>' +
      '<div class="meter" style="margin:10px 0 12px"><i style="width:' + pct(acc) + '%"></i></div>' +
      (s.gained.length
        ? '<p class="small">Newly learned: ' + s.gained.map(function (id) {
            return esc(E.INDEX.bySkill[id].skill.t); }).join(', ') + '.</p>'
        : '') +
      (acc < 0.6 ? '<p class="small muted">A low score here is information, not a verdict. The skill ' +
        'has moved back a stage and will come round again sooner.</p>'
        : '<p class="small muted">Each correct answer pushed these skills further down the review ' +
          'schedule, so they will come back less often.</p>') +
      '<div class="btn-row">' +
      btn('primary', 'tab:today', 'Back to today') +
      (s.spec.kind === 'skill' ? btn('ghost', 'practice-skill:' + s.spec.skillId, 'Another set') : '') +
      '</div>');
    return out;
  }

  /* ---------------- LEARN / TEACH ---------------- */
  function viewLearn() {
    var t = S.teach;
    if (!t) return viewToday();
    var info = E.INDEX.bySkill[t.id];
    var st = E.skillState(S.progress, t.id);
    var out = '<div class="card">' +
      '<div class="eyebrow">' + esc(info.level.id + ' · ' + info.module.title) + '</div>' +
      '<h2>' + esc(info.skill.t) + '</h2>' +
      '<p class="muted small">' + rich(info.skill.goal) + '</p>';

    var lesson = S.lessons[info.module.id];
    var written = lesson && lesson.skills && lesson.skills[t.id];
    if (written) {
      if (written.why) out += '<div class="prose" style="margin-top:14px">' + rich(written.why) + '</div>';
      (written.sections || []).forEach(function (sec) {
        out += '<h3 style="margin-top:16px">' + esc(sec.h) + '</h3><div class="prose">' + rich(sec.body) + '</div>';
      });
      if (written.traps && written.traps.length) {
        out += '<h3 style="margin-top:16px">Where people go wrong</h3><ul class="prose small">' +
          written.traps.map(function (x) { return '<li>' + rich(x) + '</li>'; }).join('') + '</ul>';
      }
      if (written.code) {
        out += '<h3 style="margin-top:16px">The same idea in code</h3>' +
          '<pre style="overflow-x:auto;background:var(--card-2);padding:12px;border-radius:9px"><code>' +
          esc(written.code.body) + '</code></pre>' +
          (written.code.note ? '<p class="tiny muted">' + rich(written.code.note) + '</p>' : '');
      }
    }
    out += '</div>';

    /* a worked example, always available whether or not prose exists */
    out += '<div class="card"><div class="eyebrow">Worked example</div>' +
      '<div class="qtext" style="margin-top:6px">' + rich(t.q.prompt) + '</div>' +
      '<ol class="steps">' + t.q.solution.map(function (stp) { return '<li>' + rich(stp) + '</li>'; }).join('') +
      '</ol>' +
      '<p class="small" style="margin-top:12px">Answer: <strong>' + rich(answerText(t.q)) + '</strong></p>' +
      '<div class="btn-row">' +
      btn('primary', 'practice-skill:' + t.id, 'Your turn') +
      btn('ghost', 'another-example:' + t.id, 'Another example') +
      btn('ghost', 'tab:today', 'Back') +
      '</div></div>';

    if (st.a > 0) {
      out += card('flat', '<p class="tiny muted">You have answered ' + plural(st.a, 'question') +
        ' on this skill, ' + st.c + ' correctly. It sits at stage ' + st.lv + ' of ' + E.MASTERED + '.</p>');
    }
    return out;
  }

  function teach(id, nonce) {
    var info = E.INDEX.bySkill[id];
    if (!info || !E.isPractisable(id)) { go('today'); return; }
    var q = makeQuestion(id, 1, nonce || (Date.now() % 90000));
    S.teach = { id: id, q: q };
    S.view = 'learn';
    window.scrollTo(0, 0);
    /* fetch the written lesson for this module if we have not tried yet */
    if (S.lessons[info.module.id] === undefined) {
      S.lessons[info.module.id] = false;
      fetch('lessons/' + info.module.id + '.json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (j) { S.lessons[info.module.id] = j; if (S.view === 'learn') render(); } })
        .catch(function () { /* no written lesson: the worked example stands alone */ });
    }
    render();
  }

  /* ---------------- PLACEMENT ---------------- */
  function startPlacement(levelIdx) {
    var lv = CUR.levels[levelIdx];
    if (!lv) { go('today'); return; }
    var pool = [];
    lv.modules.forEach(function (m) {
      m.skills.forEach(function (s) { if (E.isPractisable(s.id)) pool.push(s.id); });
    });
    if (pool.length < 4) { go('today'); return; }
    var R = MC.makeRandom(Date.now() % 100000);
    var picked = R.shuffle(pool).slice(0, 6);
    S.session = {
      spec: { kind: 'placement', levelIdx: levelIdx },
      title: 'Placement check · ' + lv.id + ' ' + lv.title,
      items: picked.map(function (id) { return { id: id, tier: 2 }; }),
      i: 0, nonce: Date.now() % 100000, results: [], q: null, state: 'asking',
      requeued: { skip: 1 }, gained: [], placement: true
    };
    /* placement questions must not be re-queued on a miss */
    S.session.items.forEach(function (it) { S.session.requeued[it.id] = 1; });
    nextQuestion();
    S.view = 'practice';
    window.scrollTo(0, 0);
    render();
  }

  function finishPlacement() {
    var s = S.session;
    var right = s.results.filter(function (r) { return r === true; }).length;
    var lv = CUR.levels[s.spec.levelIdx];
    var passed = right >= 5;
    if (passed) {
      /* credit the level, but schedule it for review in two days rather than
         declaring it finished for good */
      lv.modules.forEach(function (m) {
        m.skills.forEach(function (sk) {
          if (!E.isPractisable(sk.id)) return;
          var cur = E.skillState(S.progress, sk.id);
          if (cur.lv >= E.LEARNED) return;
          S.progress.skills[sk.id] = { a: Math.max(cur.a, 3), c: Math.max(cur.c, 3), st: 0,
            lv: E.LEARNED, due: today() + 2, last: today() };
        });
      });
      if (CUR.levels[s.spec.levelIdx + 1]) S.progress.opened[CUR.levels[s.spec.levelIdx + 1].id] = 1;
      save();
    }
    var nextIdx = s.spec.levelIdx + 1;
    var hasNext = CUR.levels[nextIdx] &&
      CUR.levels[nextIdx].modules.some(function (m) {
        return m.skills.some(function (sk) { return E.isPractisable(sk.id); });
      });
    S.session = null;
    S.view = 'placement-result';
    S.placementResult = { lv: lv, right: right, passed: passed, nextIdx: nextIdx, hasNext: hasNext };
    window.scrollTo(0, 0);
    renderPlacementResult();
  }

  function renderPlacementResult() {
    var r = S.placementResult;
    paintTabs(); paintBar();
    $('view').innerHTML = card('lead',
      '<div class="eyebrow">Placement check</div>' +
      '<h2>' + esc(r.lv.id + ' ' + r.lv.title) + ' — ' + r.right + ' of 6</h2>' +
      (r.passed
        ? '<p class="small">That is comfortably enough. This level is marked as known, and it will ' +
          'still come back in review so nothing rusts.</p>' +
          (r.hasNext
            ? '<p class="small muted">Carry on and check the next level too, or stop here and start work.</p>'
            : '<p class="small muted">That is as far as the placement check goes for now.</p>')
        : '<p class="small">Under five out of six, so this is the right level to start at. That is ' +
          'useful information, not a bad result — it tells you exactly where the work is.</p>') +
      '<div class="btn-row">' +
      (r.passed && r.hasNext ? btn('primary', 'placement:' + r.nextIdx, 'Check the next level') : '') +
      btn(r.passed && r.hasNext ? 'ghost' : 'primary', 'tab:today', 'Start learning') +
      '</div>');
    afterRender();
  }

  /* ---------------- events ---------------- */
  function afterRender() {
    var el = $('ans0');
    if (el && !el.disabled) el.focus();
  }

  document.addEventListener('click', function (ev) {
    var keyBtn = ev.target.closest('[data-key]');
    if (keyBtn) {
      var target = document.activeElement;
      if (!target || target.tagName !== 'INPUT') target = $('ans0');
      if (target) {
        var k = keyBtn.getAttribute('data-key');
        var pos = target.selectionStart === null ? target.value.length : target.selectionStart;
        target.value = target.value.slice(0, pos) + k + target.value.slice(target.selectionEnd || pos);
        target.focus();
        target.setSelectionRange(pos + k.length, pos + k.length);
      }
      return;
    }
    var choice = ev.target.closest('[data-choice]');
    if (choice && S.session && !S.session.verdict) {
      S.session.picked = choice.getAttribute('data-choice');
      render();
      doCheck();
      return;
    }
    var tab = ev.target.closest('[data-tab]');
    if (tab) { go(tab.getAttribute('data-tab')); return; }
    var det = ev.target.closest('details.lvl');
    if (det && ev.target.closest('summary')) {
      /* remember which levels are expanded across re-renders */
      setTimeout(function () { S.openLevels[det.getAttribute('data-level')] = det.open; }, 0);
    }
    var act = ev.target.closest('[data-act]');
    if (!act) return;
    var a = act.getAttribute('data-act');
    var arg = a.indexOf(':') > -1 ? a.slice(a.indexOf(':') + 1) : null;
    var cmd = a.indexOf(':') > -1 ? a.slice(0, a.indexOf(':')) : a;

    if (cmd === 'tab') return go(arg);
    if (cmd === 'check') return doCheck();
    if (cmd === 'next-q') {
      var s = S.session;
      s.i++;
      if (s.i >= s.items.length) {
        if (s.placement) return finishPlacement();
        s.state = 'done';
      } else nextQuestion();
      window.scrollTo(0, 0);
      return render();
    }
    if (cmd === 'quit-session') {
      if (S.store) S.store.flush();
      return go('today');
    }
    if (cmd === 'teach') return teach(arg);
    if (cmd === 'another-example') return teach(arg, Date.now() % 90000 + 13);
    if (cmd === 'practice-skill') {
      var info = E.INDEX.bySkill[arg];
      return startSession({ kind: 'skill', skillId: arg, count: 8 }, 'Practice', info.skill.t);
    }
    if (cmd === 'practice-module') {
      var mi = E.INDEX.byModule[arg];
      return startSession({ kind: 'module', moduleId: arg, count: 10 }, 'Mixed practice', mi.module.title);
    }
    if (cmd === 'start-review') return startSession({ kind: 'review', count: 15 }, 'Review');
    if (cmd === 'exam') {
      var li = E.INDEX.byLevel[arg];
      return startSession({ kind: 'level', levelId: arg, count: 20 }, 'Level test', li.level.title);
    }
    if (cmd === 'start-first') {
      var n = E.nextSkill(S.progress);
      return n ? teach(n.skill.id) : go('map');
    }
    if (cmd === 'start-placement') return startPlacement(0);
    if (cmd === 'placement') return startPlacement(+arg);
    if (cmd === 'open-level') {
      S.progress.opened[arg] = 1;
      S.openLevels[arg] = true;
      save();
      return render();
    }
    if (cmd === 'reset') {
      if (act.getAttribute('data-confirm')) {
        S.progress = E.emptyProgress();
        save();
        return go('today');
      }
      act.setAttribute('data-confirm', '1');
      act.textContent = 'Tap again to erase everything';
      act.classList.add('primary');
      return;
    }
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' || S.view !== 'practice' || !S.session) return;
    ev.preventDefault();
    if (S.session.verdict) {
      var s = S.session;
      s.i++;
      if (s.i >= s.items.length) {
        if (s.placement) return finishPlacement();
        s.state = 'done';
      } else nextQuestion();
      window.scrollTo(0, 0);
      render();
    } else doCheck();
  });

  /* A read-only hook for the browser test suite, limited to a local file or a
     loopback server. It cannot exist on the published page, where it would hand
     out answers. */
  if (location.protocol === 'file:' ||
      location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    window.__peek = function () {
      var q = S.session && S.session.q;
      if (!q) return null;
      return {
        kind: q.kind,
        answer: q.kind === 'frac' ? q.answer.n + '/' + q.answer.d
              : q.kind === 'expr' ? q.answer
              : q.kind === 'text' ? (Array.isArray(q.answer) ? q.answer[0] : q.answer)
              : String(q.answer),
        fields: (q.fields || []).map(function (f) {
          return f.kind === 'frac' ? f.answer.n + '/' + f.answer.d : String(f.answer);
        })
      };
    };
  }

  boot();
})();

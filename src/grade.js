/* grade.js — decides whether a typed answer is right.
   Deliberately generous about form and strict about value: 0.75, 3/4 and
   "  .75 " are the same answer, but 0.7 is not. Where a question asks for a
   particular form (lowest terms, a specific unit), the requirement is carried
   on the question object rather than assumed. */
(function (root) {
  'use strict';
  var MC = root.MC || require('./mathcore.js');

  function clean(s) { return String(s === null || s === undefined ? '' : s).trim(); }

  function tidyText(s) {
    return clean(s).toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[.·]+$/, '')
      .replace(/−/g, '-');
  }

  function numbersMatch(got, want, tol) {
    if (got === null || !isFinite(got)) return false;
    if (tol !== undefined && tol !== null) return Math.abs(got - want) <= tol;
    if (Number.isInteger(want)) return got === want;
    /* default: agree to 4 decimal places, or to a relative 1e-6 for big numbers */
    var abs = Math.abs(got - want);
    return abs <= 5e-5 || abs <= 1e-6 * Math.abs(want);
  }

  /* "3,4,10" === "3, 4, 10" */
  function listMatch(input, want) {
    var a = tidyText(input).replace(/\s*,\s*/g, ',').replace(/\s+/g, ',').split(',').filter(Boolean);
    var b = tidyText(want).replace(/\s*,\s*/g, ',').split(',').filter(Boolean);
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      var x = MC.parseNumber(a[i]), y = MC.parseNumber(b[i]);
      if (x === null || y === null) { if (a[i] !== b[i]) return false; }
      else if (!numbersMatch(x, y)) return false;
    }
    return true;
  }

  /* "400 + 20 + 3" in any order */
  function sumMatch(input, want) {
    function terms(s) {
      return clean(s).replace(/\s/g, '').split('+').filter(Boolean)
        .map(function (t) { return MC.parseNumber(t); })
        .filter(function (v) { return v !== null; })
        .sort(function (a, b) { return a - b; });
    }
    var a = terms(input), b = terms(want);
    if (!a.length || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (!numbersMatch(a[i], b[i])) return false;
    return true;
  }

  /* "2:05 pm", "2:05pm", "14:05" */
  function timeMatch(input, want) {
    function norm(s) {
      var t = tidyText(s).replace(/\./g, '').replace(/\s/g, '');
      var m = t.match(/^(\d{1,2}):(\d{2})(am|pm)?$/);
      if (!m) return null;
      return m[1].replace(/^0/, '') + ':' + m[2] + (m[3] || '');
    }
    var a = norm(input), b = norm(want);
    return a !== null && a === b;
  }

  /* The main entry point. Returns
     { correct, note } — note explains a rejected form, e.g. not in lowest terms. */
  function check(q, raw) {
    var input = clean(raw);
    if (!input) return { correct: false, note: 'Nothing entered.' };

    switch (q.kind) {
      case 'num': {
        var got = MC.parseNumber(input);
        if (got === null) return { correct: false, note: 'That does not read as a number.' };
        var ok = numbersMatch(got, q.answer, q.tol);
        if (!ok && Array.isArray(q.answerAlt)) {
          ok = q.answerAlt.some(function (a) { return numbersMatch(got, a, q.tol); });
        }
        if (!ok && q.wrongForm) {
          /* a near miss worth naming, e.g. the right digits with the point misplaced */
          for (var i = 0; i < q.wrongForm.length; i++) {
            if (numbersMatch(got, q.wrongForm[i].value, q.tol)) {
              return { correct: false, note: q.wrongForm[i].note };
            }
          }
        }
        return { correct: ok };
      }

      case 'frac': {
        var parts = MC.parseFractionParts(input);
        if (!parts) {
          var asNum = MC.parseNumber(input);
          if (asNum !== null && numbersMatch(asNum, q.answer.n / q.answer.d)) {
            return { correct: false, note: 'Right value, but write it as a fraction.' };
          }
          return { correct: false, note: 'Write the answer as a fraction, like 3/4.' };
        }
        if (parts.n * q.answer.d !== q.answer.n * parts.d) return { correct: false };
        if (q.lowest) {
          var gg = MC.gcd(parts.n, parts.d);
          if (gg !== 1 && Math.abs(parts.d) !== 1) {
            return { correct: false, note: 'Right value, but not in lowest terms yet. Divide top and bottom by ' + gg + '.' };
          }
        }
        return { correct: true };
      }

      case 'mc':
        return { correct: String(input) === String(q.answer) };

      case 'expr': {
        var cleaned = input.replace(/^[a-zA-Z]\s*(\(x\))?\s*=\s*/, '').replace(/\s/g, '');
        if (!cleaned) return { correct: false, note: 'Nothing entered.' };
        var same;
        try { same = MC.sameExpression(cleaned, q.answer, { domain: q.domain }); }
        catch (e) { return { correct: false, note: 'That expression could not be read.' }; }
        if (!same && Array.isArray(q.answerAlt)) {
          same = q.answerAlt.some(function (a) {
            try { return MC.sameExpression(cleaned, a, { domain: q.domain }); } catch (e) { return false; }
          });
        }
        /* "factored" means the whole expression is a product or a power at the top
           level: 7(2x+3), -7*(2x+3), (x+1)(x+2), (x+1)^2, x(x+3). */
        var looksFactored = /\)\s*\(/.test(input) || /\)\s*\^/.test(input) ||
          /^\s*-?\s*\d*\.?\d*\s*\*?\s*[a-zA-Z]?\s*\*?\s*\(/.test(input);
        if (same && q.requireFactored && !looksFactored) {
          return { correct: false, note: 'Right value, but the question asks for it in factored form.' };
        }
        return { correct: same };
      }

      case 'text': {
        if (q.normaliseList) return { correct: listMatch(input, q.answer) };
        if (q.normaliseSum) return { correct: sumMatch(input, q.answer) };
        if (q.normaliseTime) return { correct: timeMatch(input, q.answer) };
        var want = Array.isArray(q.answer) ? q.answer : [q.answer];
        var gotT = tidyText(input).replace(/\s/g, '');
        return { correct: want.some(function (w) { return tidyText(w).replace(/\s/g, '') === gotT; }) };
      }

      case 'multi': {
        /* raw is an array of entries, one per field */
        var vals = Array.isArray(raw) ? raw : [raw];
        var allOk = true, note = null;
        q.fields.forEach(function (f, i) {
          var sub = { kind: f.kind || 'num', answer: f.answer, tol: f.tol, lowest: f.lowest,
                      answerAlt: f.answerAlt, domain: f.domain };
          var r = check(sub, vals[i]);
          if (!r.correct) { allOk = false; if (!note && r.note) note = f.label + ': ' + r.note; }
        });
        return { correct: allOk, note: note };
      }
    }
    return { correct: false, note: 'Unrecognised question type.' };
  }

  var G = { check: check, numbersMatch: numbersMatch, tidyText: tidyText };
  root.GRADE = G;
  if (typeof module !== 'undefined' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);

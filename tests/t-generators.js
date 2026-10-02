/* Exercises every generator that exists, 120 times per difficulty tier, and
   round-trips its own stated answer through the real grader. A generator that
   produces a question its own answer fails is a bug that would otherwise reach
   a learner as "wrong" on a correct answer. */
const MC = require('../src/mathcore.js');
const GEN = require('../src/generators.js');
const GRADE = require('../src/grade.js');
const CUR = require('../src/curriculum.js');

const problems = [];
function bad(id, msg, q) { problems.push(id + ': ' + msg + (q ? '  [' + JSON.stringify(q).slice(0, 220) + ']' : '')); }

function textOf(q) {
  return [q.prompt].concat(q.solution || []).concat(q.choices || []).concat(q.hint || []).join(' | ');
}

/* what a learner would type if they were right */
function correctInput(q) {
  switch (q.kind) {
    case 'num': return String(q.answer);
    case 'frac': return q.answer.n + '/' + q.answer.d;
    case 'mc': return String(q.answer);
    case 'expr': return q.answer;
    case 'text': return Array.isArray(q.answer) ? q.answer[0] : q.answer;
    case 'multi': return q.fields.map(f => f.kind === 'frac' ? f.answer.n + '/' + f.answer.d : String(f.answer));
  }
  return '';
}

let count = 0;
const ids = Object.keys(GEN);
for (const id of ids) {
  for (let d = 1; d <= 3; d++) {
    for (let i = 0; i < 120; i++) {
      const R = MC.makeRandom(d * 100000 + i * 7 + id.length);
      let q;
      try { q = GEN[id](R, d); } catch (e) { bad(id, 'threw at d=' + d + ': ' + e.message); break; }
      count++;
      if (!q || typeof q.prompt !== 'string' || !q.prompt.trim()) { bad(id, 'empty prompt', q); break; }
      /* Scan for stringification artifacts. A term of art deliberately written
         as *undefined* or `null` is prose, not a bug, so those forms are removed
         before the scan and a bare occurrence still fails. */
      const txt = textOf(q).replace(/[*`]undefined[*`]/g, '').replace(/[*`]null[*`]/g, '');
      if (/\bundefined\b|NaN|\[object|\bnull\b|\bInfinity\b/.test(txt)) { bad(id, 'bad text: ' + txt.slice(0, 160)); break; }
      if (!Array.isArray(q.solution) || !q.solution.length) { bad(id, 'no solution steps', q); break; }
      /* math delimiters must pair up, or half the text renders as a formula */
      for (const piece of [q.prompt].concat(q.solution, q.choices || [])) {
        if (((String(piece).match(/~/g) || []).length) % 2) { bad(id, 'unbalanced math delimiter in: ' + piece); break; }
        /* a price inside a math segment means a $ landed in formula markup */
        const segs = String(piece).split('~');
        for (let k = 1; k < segs.length; k += 2) {
          if (segs[k].indexOf('$') > -1) { bad(id, 'currency inside a math segment: ' + piece); break; }
        }
      }
      if (q.solution.some(s => typeof s !== 'string' || !s.trim())) { bad(id, 'empty solution step', q); break; }
      if (q.kind === 'num' && (typeof q.answer !== 'number' || !isFinite(q.answer))) { bad(id, 'non-finite answer', q); break; }
      if (q.kind === 'frac' && (!q.answer || !Number.isInteger(q.answer.n) || !Number.isInteger(q.answer.d) || q.answer.d === 0)) { bad(id, 'bad fraction answer', q); break; }
      if (q.kind === 'frac' && MC.gcd(q.answer.n, q.answer.d) !== 1 && q.lowest) { bad(id, 'stated fraction answer is not in lowest terms', q); break; }
      if (q.kind === 'mc') {
        if (!Array.isArray(q.choices) || q.choices.length < 2) { bad(id, 'too few choices', q); break; }
        if (new Set(q.choices.map(String)).size !== q.choices.length) { bad(id, 'duplicate choices', q); break; }
        if (!(q.answer >= 0 && q.answer < q.choices.length)) { bad(id, 'answer index out of range', q); break; }
      }
      if (q.kind === 'expr') {
        try { MC.parse(q.answer); } catch (e) { bad(id, 'answer expression unparseable: ' + q.answer); break; }
      }
      if (q.kind === 'multi' && (!Array.isArray(q.fields) || !q.fields.length)) { bad(id, 'no fields', q); break; }
      /* the round trip */
      const res = GRADE.check(q, correctInput(q));
      if (!res.correct) { bad(id, 'grader rejects its own answer (' + JSON.stringify(correctInput(q)) + ') note=' + res.note, q); break; }
    }
  }
}

/* coverage against the map */
let total = 0, have = 0;
CUR.levels.forEach(l => l.modules.forEach(m => m.skills.forEach(s => { total++; if (GEN[s.id]) have++; })));
const orphans = ids.filter(id => {
  let found = false;
  CUR.levels.forEach(l => l.modules.forEach(m => m.skills.forEach(s => { if (s.id === id) found = true; })));
  return !found;
});
if (orphans.length) problems.push('generators with no skill in the map: ' + orphans.join(', '));

console.log(count + ' generated questions checked across ' + ids.length + ' generators');
console.log('curriculum coverage: ' + have + '/' + total + ' skills practisable');
if (problems.length) { console.log('\n' + problems.length + ' PROBLEM(S):'); problems.slice(0, 40).forEach(p => console.log(' - ' + p)); process.exit(1); }
console.log('no problems found');

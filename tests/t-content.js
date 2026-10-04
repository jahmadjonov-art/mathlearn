/* Lesson prose is content, not code, so it gets its own checks: valid JSON,
   balanced math delimiters, no stray template values, and every referenced skill
   actually existing in the map. */
const fs = require('fs'), path = require('path');
const CUR = require('../src/curriculum.js');
const GEN = require('../src/generators.js');
const MC = require('../src/mathcore.js');

const problems = [];
const dir = path.resolve(__dirname, '../src/lessons');
const ids = {};
CUR.levels.forEach(l => l.modules.forEach(m => m.skills.forEach(s => { ids[s.id] = m.id; })));

let files = 0, lessons = 0, words = 0;
fs.readdirSync(dir).filter(f => f.endsWith('.json')).forEach(f => {
  files++;
  let j;
  try { j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
  catch (e) { problems.push(f + ': invalid JSON — ' + e.message); return; }
  if (j.module + '.json' !== f) problems.push(f + ': module field says ' + j.module);
  Object.keys(j.skills || {}).forEach(id => {
    lessons++;
    if (!ids[id]) { problems.push(f + ': lesson for unknown skill ' + id); return; }
    if (ids[id] !== j.module) problems.push(f + ': ' + id + ' belongs to module ' + ids[id]);
    const L = j.skills[id];
    const texts = [L.why].concat((L.sections || []).map(s => s.h + ' ' + s.body),
      L.traps || [], L.code ? [L.code.body, L.code.note] : []).filter(Boolean);
    if (!L.why || L.why.length < 60) problems.push(f + '/' + id + ': the "why" is missing or too short');
    texts.forEach(t => {
      words += String(t).split(/\s+/).length;
      if (((String(t).match(/~/g) || []).length) % 2) problems.push(f + '/' + id + ': unbalanced math delimiter in "' + String(t).slice(0, 70) + '"');
      const scan = String(t).replace(/[*`]undefined[*`]/g, '');
      if (/\bundefined\b|\bNaN\b|\[object/.test(scan)) problems.push(f + '/' + id + ': stray value in prose');
      /* rendering must not throw and must produce something */
      let html;
      try { html = MC.rich(String(t)); } catch (e) { problems.push(f + '/' + id + ': rich() threw — ' + e.message); return; }
      if (!html) problems.push(f + '/' + id + ': rendered to nothing');
      if (/<script/i.test(html)) problems.push(f + '/' + id + ': produced a script tag');
      const left = html.match(/\\[a-zA-Z]+|\\[{}^_%]/);
      if (left) problems.push(f + '/' + id + ': raw markup reaches the screen (' + left[0] + ') in "' + String(t).slice(0, 60) + '"');
    });
  });
});

/* levels 0-3 must be complete on both counts */
let gaps = [];
CUR.levels.slice(0, 4).forEach(l => l.modules.forEach(m => m.skills.forEach(s => {
  if (!GEN[s.id]) gaps.push(s.id + ' (no generator)');
  const p = path.join(dir, m.id + '.json');
  if (!fs.existsSync(p)) { gaps.push(m.id + ' (no lesson file)'); return; }
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (!j.skills[s.id]) gaps.push(s.id + ' (no lesson)');
})));
if (gaps.length) problems.push('levels 0-3 incomplete: ' + gaps.slice(0, 12).join(', '));

console.log(files + ' lesson files, ' + lessons + ' skill lessons, about ' + words + ' words of prose');
if (problems.length) { console.log('\n' + problems.length + ' PROBLEM(S):'); problems.slice(0, 30).forEach(p => console.log(' - ' + p)); process.exit(1); }
console.log('content checks passed');

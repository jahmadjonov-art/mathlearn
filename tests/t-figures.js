/* Figures are injected into the page as markup rather than escaped text, so they
   get their own checks: every figure type must produce well-formed SVG, carry no
   scriptable content, and contain no bad numbers. Also sweeps every generator's
   output for the same, since generators are what actually build figures. */
const F = require('../src/figures.js');
const MC = require('../src/mathcore.js');
const GEN = require('../src/generators.js');

const problems = [];
function check(label, s) {
  if (typeof s !== 'string' || !/^<svg /.test(s)) { problems.push(label + ': not an SVG string'); return; }
  if (!/<\/svg>$/.test(s.trim())) problems.push(label + ': SVG is not closed');
  if (/NaN|undefined|Infinity/.test(s)) problems.push(label + ': bad numeric value in output');
  /* nothing that could execute, and no way to reach outside the diagram */
  if (/<script|<foreignObject|\son\w+\s*=|javascript:|<iframe|<use\b|xlink:href/i.test(s)) {
    problems.push(label + ': scriptable or external content in a figure');
  }
  /* tags must balance, or the surrounding card's markup breaks */
  const open = (s.match(/<(svg|g|text|path|line|circle|polygon|ellipse)\b/g) || []).length;
  const close = (s.match(/<\/(svg|g|text)>|\/>/g) || []).length;
  if (close < open) problems.push(label + ': ' + open + ' elements but only ' + close + ' closers');
}

/* every figure type, across a spread of inputs */
for (let deg = 5; deg <= 175; deg += 10) check('angleAt(' + deg + ')', F.angleAt(deg));
['linear', 'vertical', 'complementary'].forEach(k => {
  for (let deg = 15; deg <= 80; deg += 13) check('anglePair(' + k + ',' + deg + ')', F.anglePair(k, deg));
});
['corresponding', 'alternate', 'cointerior'].forEach(p => check('transversal(' + p + ')', F.transversal(64, p)));
check('triangle plain', F.triangle({}));
check('triangle loaded', F.triangle({ right: true, sides: [{ on: 'AB', label: '5', ticks: 2 },
  { on: 'BC', label: '12' }], angles: [{ at: 'B', label: 'x' }, { at: 'C', label: '40°' }] }));
[['radius'], ['diameter'], ['chord'], ['tangent'], ['sector'], ['central'], ['inscribed'],
 ['radius', 'sector'], ['central', 'inscribed']].forEach(parts =>
  check('circleFig(' + parts.join('+') + ')', F.circleFig(parts, { sectorAngle: 72, angle: 110 })));
check('grid empty', F.grid({}));
check('grid loaded', F.grid({ span: 8, points: [[3, 4, 'A'], [-2, -5, 'B']],
  segments: [[[3, 4], [-2, -5]], [[0, 0], [3, 4], 'var(--accent)', true]],
  shapes: [{ points: [[1, 1], [4, 1], [4, 3]] }] }));
['rectangle', 'triangle', 'parallelogram', 'trapezium', 'composite'].forEach(k =>
  check('areaShape(' + k + ')', F.areaShape(k, { base: '10', height: '4', top: '6', a: '3', b: '7' })));
['prism', 'cuboid', 'cylinder', 'cone', 'pyramid', 'sphere'].forEach(k =>
  check('solid(' + k + ')', F.solid(k, { radius: '3', height: '8', length: '5', width: '4', base: '6' })));

/* ---- figures must be TRUE to their numbers, not just well-formed ----
   Two diagrams once shipped drawn at a size that contradicted their own labels (a
   134-degree apex drawn acute, a 70-degree central angle drawn at 140). Well-formed
   SVG says nothing about that, so these measure the drawn geometry directly. */
function polyPts(svg) {
  const m = svg.match(/<polygon points="([^"]+)"/);
  return m ? m[1].trim().split(/\s+/).map(t => t.split(',').map(Number)) : null;
}
function ang(P, Q, R) {   /* angle at Q between P and R, in degrees */
  const a = [P[0] - Q[0], P[1] - Q[1]], b = [R[0] - Q[0], R[1] - Q[1]];
  return Math.acos((a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b))) * 180 / Math.PI;
}
[[26, 89], [53, 57], [20, 100], [110, 35], [70, 70], [45, 45], [15, 150], [60, 60]].forEach(([a, b]) => {
  const t = polyPts(F.triangleAngles(a, b, {}));
  if (!t) { problems.push('triangleAngles(' + a + ',' + b + '): no polygon drawn'); return; }
  const got = [ang(t[1], t[0], t[2]), ang(t[0], t[1], t[2]), ang(t[0], t[2], t[1])];
  const want = [a, b, 180 - a - b];
  got.forEach((g, i) => { if (Math.abs(g - want[i]) > 0.6) problems.push(
    'triangleAngles(' + a + ',' + b + '): angle ' + i + ' is drawn at ' + g.toFixed(1) + ' but labelled ' + want[i]); });
});
[[3, 4], [5, 12], [8, 15], [7, 24], [20, 21], [4, 3]].forEach(([adj, opp]) => {
  const t = polyPts(F.rightTriangle(adj, opp, {}));
  const legH = Math.hypot(t[1][0] - t[0][0], t[1][1] - t[0][1]), legV = Math.hypot(t[2][0] - t[0][0], t[2][1] - t[0][1]);
  if (Math.abs(legH / legV - adj / opp) > 0.01) problems.push('rightTriangle(' + adj + ',' + opp + '): legs drawn in ratio ' +
    (legH / legV).toFixed(3) + ' but the labels say ' + (adj / opp).toFixed(3));
  if (Math.abs(ang(t[1], t[0], t[2]) - 90) > 0.01) problems.push('rightTriangle(' + adj + ',' + opp + '): the right angle is not 90');
});
[40, 70, 100, 120, 160].forEach(deg => {
  const svg = F.circleFig(['central', 'inscribed'], { angle: deg });
  const lines = [...svg.matchAll(/<line x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)" stroke="var\(--ink-3\)"/g)]
    .map(m => m.slice(1).map(Number));
  if (lines.length !== 2) { problems.push('circleFig central ' + deg + ': expected 2 radii, found ' + lines.length); return; }
  const c = [lines[0][2], lines[0][3]];
  const drawn = ang([lines[0][0], lines[0][1]], c, [lines[1][0], lines[1][1]]);
  if (Math.abs(drawn - deg) > 0.6) problems.push('circleFig: central angle drawn at ' + drawn.toFixed(1) + ' but labelled ' + deg);
});

/* an elevation diagram must contain a line of sight at exactly the labelled angle */
['elevation', 'depression'].forEach(kind => [12, 25, 40, 55, 70].forEach(deg => {
  const svg = F.elevation(kind, deg, {});
  const lines = [...svg.matchAll(/<line x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)"/g)].map(m => m.slice(1).map(Number));
  const has = lines.some(l => Math.abs(Math.atan2(Math.abs(l[3] - l[1]), Math.abs(l[2] - l[0])) * 180 / Math.PI - deg) < 0.6);
  if (!has) problems.push('elevation(' + kind + ',' + deg + '): no line of sight drawn at ' + deg + ' degrees');
}));

/* nothing may be drawn outside its own canvas, where it would be silently cut off */
function spills(label, svg) {
  const vb = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  if (!vb) return;
  const W = +vb[1], H = +vb[2];
  const xs = [...svg.matchAll(/\s(?:x|cx|x1|x2)="([\d.-]+)"/g)].map(m => +m[1]);
  const ys = [...svg.matchAll(/\s(?:y|cy|y1|y2)="([\d.-]+)"/g)].map(m => +m[1]);
  const pts = [...svg.matchAll(/points="([^"]+)"/g)].flatMap(m => m[1].trim().split(/\s+/).map(t => t.split(',').map(Number)));
  xs.concat(pts.map(p => p[0])).forEach(v => { if (v < -2 || v > W + 2) problems.push(label + ': a coordinate x=' + v + ' is outside the ' + W + ' wide canvas'); });
  ys.concat(pts.map(p => p[1])).forEach(v => { if (v < -2 || v > H + 2) problems.push(label + ': a coordinate y=' + v + ' is outside the ' + H + ' tall canvas'); });
}

/* and every figure any generator produces */
let withFigures = 0, figureCount = 0;
Object.keys(GEN).forEach(id => {
  for (let d = 1; d <= 3; d++) {
    for (let i = 0; i < 30; i++) {
      let q;
      try { q = GEN[id](MC.makeRandom(d * 7777 + i * 13 + id.length), d); } catch (e) { continue; }
      if (q && q.figure) { check('generator ' + id, q.figure); spills('generator ' + id, q.figure); figureCount++; }
    }
  }
  for (let d = 1; d <= 3; d++) {
    const q = (() => { try { return GEN[id](MC.makeRandom(d * 99 + 1), d); } catch (e) { return null; } })();
    if (q && q.figure) { withFigures++; break; }
  }
});

console.log('figure types checked, plus ' + figureCount + ' figures from ' + withFigures + ' generators');
if (problems.length) {
  console.log('\n' + problems.length + ' PROBLEM(S):');
  [...new Set(problems)].slice(0, 25).forEach(p => console.log(' - ' + p));
  process.exit(1);
}
console.log('figure checks passed');

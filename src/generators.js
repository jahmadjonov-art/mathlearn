/* generators.js — one problem generator per skill.
   A generator is  fn(R, d) -> question  where R is a seeded random source and
   d is a difficulty tier (1 easiest, 3 hardest). It returns:
     { prompt, kind, answer, solution:[..], choices?, fields?, lowest?, tol?, unit?, hint? }
   kinds: num (numeric entry) | frac (fraction entry) | mc (choice) | expr
          (algebraic, graded by equivalence) | text (normalised string) | multi
          (several labelled boxes)
   Every generator is exercised 300 times by tests/t-generators.js, which checks
   the stated answer against an independent recomputation and rejects prompts or
   solutions containing NaN, undefined or an empty step. */
(function (root) {
  'use strict';
  var MC = root.MC || require('./mathcore.js');
  var F = MC.F, Frac = MC.Frac;
  var GEN = {};
  function g(id, fn) { GEN[id] = fn; }

  /* ---------- small shared helpers ---------- */
  function num(prompt, answer, solution, extra) {
    var q = { prompt: prompt, kind: 'num', answer: answer, solution: solution };
    if (extra) for (var k in extra) q[k] = extra[k];
    return q;
  }
  function frac(prompt, fr, solution, extra) {
    var q = { prompt: prompt, kind: 'frac', answer: { n: fr.n, d: fr.d }, solution: solution, lowest: true };
    if (extra) for (var k in extra) q[k] = extra[k];
    return q;
  }
  function mc(prompt, choices, answerIndex, solution, extra) {
    var q = { prompt: prompt, kind: 'mc', choices: choices, answer: answerIndex, solution: solution };
    if (extra) for (var k in extra) q[k] = extra[k];
    return q;
  }
  function expr(prompt, answer, solution, extra) {
    var q = { prompt: prompt, kind: 'expr', answer: answer, solution: solution };
    if (extra) for (var k in extra) q[k] = extra[k];
    return q;
  }
  function multi(prompt, fields, solution, extra) {
    var q = { prompt: prompt, kind: 'multi', fields: fields, solution: solution };
    if (extra) for (var k in extra) q[k] = extra[k];
    return q;
  }
  /* shuffle choices but keep track of where the right one landed */
  function shuffleChoices(R, choices, correctIndex) {
    var tagged = choices.map(function (c, i) { return { c: c, right: i === correctIndex }; });
    var mixed = R.shuffle(tagged);
    var idx = 0;
    mixed.forEach(function (t, i) { if (t.right) idx = i; });
    return { choices: mixed.map(function (t) { return t.c; }), answer: idx };
  }
  /* Build a choice list from one right option and some wrong ones, dropping any
     wrong option that collides with the right one or with another. Degenerate
     parameters (2^2, where base and exponent agree) are the usual cause, and a
     duplicated option makes a question unanswerable. */
  function choiceSet(R, right, wrongs) {
    var seen = {}, out = [right];
    seen[String(right)] = 1;
    wrongs.forEach(function (w) {
      var k = String(w);
      if (!seen[k]) { seen[k] = 1; out.push(w); }
    });
    return shuffleChoices(R, out, 0);
  }

  /* distinct wrong numeric options around a right answer */
  function distractors(R, right, n, spread) {
    var out = [], guard = 0;
    while (out.length < n && guard++ < 200) {
      var delta = R.nonzero(-spread, spread);
      var v = right + delta;
      if (v !== right && out.indexOf(v) === -1) out.push(v);
    }
    return out;
  }
  var NAMES = ['Amir', 'Bea', 'Chen', 'Dalia', 'Eli', 'Fatima', 'Gus', 'Hana', 'Ivan', 'Jada',
               'Kemal', 'Lena', 'Marco', 'Nia', 'Omar', 'Pia', 'Quinn', 'Rosa', 'Sam', 'Tariq'];
  var ITEMS = ['apples', 'pencils', 'stickers', 'marbles', 'cards', 'buttons', 'coins', 'books'];

  /* =====================================================================
     LEVEL 0 — NUMBER SENSE
     ===================================================================== */

  g('count-sequence', function (R, d) {
    var step = d === 1 ? R.pick([1, 2, 5, 10]) : R.pick([2, 3, 4, 5, 10, 25, 50]);
    var start = d === 1 ? R.int(1, 40) : R.int(20, 400);
    var back = d > 1 && R.bool(0.4);
    if (back) start = start + step * 6;
    var seq = [];
    for (var i = 0; i < 4; i++) seq.push(start + (back ? -1 : 1) * step * i);
    var next = start + (back ? -1 : 1) * step * 4;
    return num('Continue the pattern. What number comes next?\n\n~' + seq.join(',\; ') + ',\; ?~',
      next,
      ['Each step ' + (back ? 'subtracts' : 'adds') + ' ' + step + ': ' + seq[0] + ' \\to ' + seq[1] + ' is ' + (back ? '-' : '+') + step + '.',
       'So the next term is ' + seq[3] + (back ? ' - ' : ' + ') + step + ' = **' + next + '**.']);
  });

  g('number-line-place', function (R, d) {
    var step = d === 1 ? R.pick([1, 2, 5]) : R.pick([5, 10, 20, 25, 50, 100]);
    var start = step * R.int(0, 6);
    var ticks = 10, k = R.int(2, 8);
    var value = start + k * step;
    return num('A number line starts at ~' + start + '~ and every tick mark counts up by ~' + step + '~. ' +
      'What number sits on the ' + MC.ordinal(k) + ' tick after the start?',
      value,
      [k + ' ticks at ' + step + ' each is ' + k + ' \\times ' + step + ' = ' + (k * step) + '.',
       'Starting from ' + start + ': ' + start + ' + ' + (k * step) + ' = **' + value + '**.']);
  });

  g('compare-whole', function (R, d) {
    var digits = d === 1 ? 2 : (d === 2 ? 4 : 6);
    var lo = Math.pow(10, digits - 1), hi = Math.pow(10, digits) - 1;
    var a = R.int(lo, hi), b = R.int(lo, hi);
    if (a === b) b = a + R.int(1, 9);
    var bigger = Math.max(a, b);
    var place = String(a).length === String(b).length;
    return mc('Which is larger?', ['~' + a + '~', '~' + b + '~'], a > b ? 0 : 1,
      [place ? 'Both have ' + String(a).length + ' digits, so compare from the left until the digits differ.'
             : 'The number with more digits is larger: ' + MC.commas(a) + ' has ' + String(a).length +
               ' digits and ' + MC.commas(b) + ' has ' + String(b).length + '.',
       '**' + MC.commas(bigger) + '** is larger.']);
  });

  g('order-whole', function (R, d) {
    var count = d === 1 ? 3 : 4;
    var digits = d === 1 ? 2 : 4;
    var lo = Math.pow(10, digits - 1), hi = Math.pow(10, digits) - 1;
    var vals = R.distinct(count, lo, hi);
    var sorted = vals.slice().sort(function (x, y) { return x - y; });
    var desc = R.bool(0.3);
    if (desc) sorted.reverse();
    return { prompt: 'Put these in order, ' + (desc ? 'largest first' : 'smallest first') +
        ', separated by commas:\n\n~' + vals.join(',\; ') + '~',
      kind: 'text', answer: sorted.join(','), normaliseList: true,
      solution: ['Compare digit by digit from the left.',
        'In order: **' + sorted.join(', ') + '**.'] };
  });

  g('ordinal-position', function (R, d) {
    var n = R.int(3, d === 1 ? 10 : 30);
    var total = n + R.int(1, 8);
    var mode = R.pick(['which', 'fromEnd']);
    if (mode === 'which') {
      return num(total + ' people queue up. Counting from the front, what position number does the person ' +
        'standing immediately behind the ' + MC.ordinal(n) + ' person have?', n + 1,
        ['Immediately behind means one place further back.',
         'That is position ' + n + ' + 1 = **' + (n + 1) + '**.']);
    }
    var fromEnd = total - n + 1;
    return num(total + ' people queue up. Someone is ' + MC.ordinal(n) + ' from the front. ' +
      'What position are they from the back?', fromEnd,
      ['There are ' + total + ' people. Being ' + MC.ordinal(n) + ' from the front leaves ' + (total - n) +
       ' people behind them.',
       'Counting themselves, they are ' + (total - n) + ' + 1 = **' + fromEnd + '** from the back.',
       'The check: ' + n + ' + ' + fromEnd + ' = ' + (n + fromEnd) + ' = ' + total + ' + 1, which is always true.']);
  });

  g('place-value-name', function (R, d) {
    var digits = d === 1 ? 3 : (d === 2 ? 5 : 7);
    var n = R.int(Math.pow(10, digits - 1), Math.pow(10, digits) - 1);
    var s = String(n);
    var pos = R.int(0, s.length - 1);
    var digit = +s[pos];
    var placeValue = digit * Math.pow(10, s.length - 1 - pos);
    var placeNames = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands',
                      'millions', 'ten millions'];
    var placeName = placeNames[s.length - 1 - pos];
    return num('In the number ~' + MC.commas(n) + '~, the digit ~' + digit + '~ sits in the ' + placeName +
      ' place. What is that digit worth?', placeValue,
      ['A digit in the ' + placeName + ' place is worth that many ' + placeName + '.',
       digit + ' \\times ' + MC.commas(Math.pow(10, s.length - 1 - pos)) + ' = **' + MC.commas(placeValue) + '**.']);
  });

  g('expanded-form', function (R, d) {
    var digits = d === 1 ? 3 : 4;
    var n = R.int(Math.pow(10, digits - 1), Math.pow(10, digits) - 1);
    var s = String(n), parts = [];
    for (var i = 0; i < s.length; i++) {
      var v = +s[i] * Math.pow(10, s.length - 1 - i);
      if (v) parts.push(v);
    }
    if (R.bool(0.5)) {
      return num('Write this sum as a single number:\n\n~' + parts.join(' + ') + '~', n,
        ['Each part gives the value of one place.',
         'Adding them: **' + MC.commas(n) + '**.']);
    }
    return { prompt: 'Write ~' + MC.commas(n) + '~ in expanded form, as a sum like ~400 + 20 + 3~.',
      kind: 'text', answer: parts.join('+'), normaliseSum: true,
      solution: ['Take each non-zero digit and give it its place value.',
        '**' + parts.join(' + ') + '**'] };
  });

  g('read-write-large', function (R, d) {
    var groups = d === 1 ? 2 : (d === 2 ? 3 : 4);
    var n = R.int(Math.pow(10, groups * 3 - 3), Math.pow(10, groups * 3) - 1);
    var words = numberToWords(n);
    if (R.bool(0.5)) {
      return { prompt: 'Write this number using digits:\n\n**' + words + '**', kind: 'num', answer: n,
        solution: ['Work in groups of three from the right: ' + MC.commas(n) + '.',
          'The answer is **' + MC.commas(n) + '**.'] };
    }
    return { prompt: 'How many digits does ~' + MC.commas(n) + '~ have?', kind: 'num',
      answer: String(n).length,
      solution: ['Count the digits, ignoring the commas: ' + String(n).split('').join(' '),
        'That is **' + String(n).length + '** digits.'] };
  });
  function numberToWords(n) {
    var ones = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven',
      'twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
    var tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
    function under1000(x) {
      var out = [];
      if (x >= 100) { out.push(ones[Math.floor(x / 100)] + ' hundred'); x %= 100; }
      if (x >= 20) { out.push(tens[Math.floor(x / 10)] + (x % 10 ? '-' + ones[x % 10] : '')); }
      else if (x > 0) out.push(ones[x]);
      return out.join(' ');
    }
    if (n === 0) return 'zero';
    var scales = [[1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']], parts = [];
    scales.forEach(function (s) {
      if (n >= s[0]) { parts.push(under1000(Math.floor(n / s[0])) + ' ' + s[1]); n %= s[0]; }
    });
    if (n > 0) parts.push(under1000(n));
    return parts.join(' ');
  }

  g('round-whole', function (R, d) {
    var places = d === 1 ? [10] : (d === 2 ? [10, 100] : [10, 100, 1000, 10000]);
    var p = R.pick(places);
    var n = R.int(p * 2, p * 100);
    /* make a tie sometimes, so the rule for 5 gets exercised */
    if (R.bool(0.2)) n = Math.floor(n / p) * p + p / 2;
    var rounded = Math.round(n / p) * p;
    var names = { 10: 'ten', 100: 'hundred', 1000: 'thousand', 10000: 'ten thousand' };
    var digit = Math.floor((n % p) / (p / 10));
    return num('Round ~' + MC.commas(n) + '~ to the nearest ' + names[p] + '.', rounded,
      ['Look at the digit one place to the right of the ' + names[p] + ' place: it is ' + digit + '.',
       digit >= 5 ? 'Because it is 5 or more, round up.' : 'Because it is less than 5, round down.',
       'The answer is **' + MC.commas(rounded) + '**.']);
  });

  g('estimate-sums', function (R, d) {
    var p = d === 1 ? 10 : 100;
    var a = R.int(p * 2, p * 90), b = R.int(p * 2, p * 90);
    var ra = Math.round(a / p) * p, rb = Math.round(b / p) * p;
    return num('Estimate ~' + MC.commas(a) + ' + ' + MC.commas(b) + '~ by rounding each number to the nearest ' +
      (p === 10 ? 'ten' : 'hundred') + ' first. Give the estimate.', ra + rb,
      [MC.commas(a) + ' rounds to ' + MC.commas(ra) + ', and ' + MC.commas(b) + ' rounds to ' + MC.commas(rb) + '.',
       MC.commas(ra) + ' + ' + MC.commas(rb) + ' = **' + MC.commas(ra + rb) + '**.',
       'The exact answer is ' + MC.commas(a + b) + ', so the estimate is off by ' + MC.commas(Math.abs(a + b - ra - rb)) + '. ' +
       'An estimate is for catching a badly wrong answer, not for replacing the exact one.']);
  });

  g('make-ten', function (R, d) {
    var a = R.int(d === 1 ? 6 : 2, 9);
    var b = R.int(d === 1 ? 4 : 5, 9);
    var need = 10 - a, rest = b - need;
    return num('Use making ten to add: ~' + a + ' + ' + b + '~', a + b,
      [a + ' needs ' + need + ' more to reach 10.',
       'Split ' + b + ' into ' + need + ' + ' + rest + '.',
       a + ' + ' + need + ' = 10, then 10 + ' + rest + ' = **' + (a + b) + '**.']);
  });

  g('add-facts', function (R, d) {
    var hi = d === 1 ? 9 : (d === 2 ? 12 : 20);
    var a = R.int(2, hi), b = R.int(2, hi);
    return num('~' + a + ' + ' + b + ' = ?~', a + b,
      [a + ' + ' + b + ' = **' + (a + b) + '**.',
       'If that was not instant, make ten first: ' + a + ' + ' + (10 - a) + ' = 10, with ' + (b - (10 - a)) + ' left over.']);
  });

  g('sub-facts', function (R, d) {
    var hi = d === 1 ? 10 : (d === 2 ? 18 : 20);
    var total = R.int(5, hi), part = R.int(1, total - 1);
    if (R.bool(0.35)) {
      return num('~' + total + ' - \\square = ' + (total - part) + '~. What is the missing number?', part,
        ['Read it as: what adds to ' + (total - part) + ' to make ' + total + '?',
         (total - part) + ' + ' + part + ' = ' + total + ', so the missing number is **' + part + '**.']);
    }
    return num('~' + total + ' - ' + part + ' = ?~', total - part,
      ['Count up from ' + part + ' to ' + total + ': that is ' + (total - part) + '.',
       'So ' + total + ' - ' + part + ' = **' + (total - part) + '**.']);
  });

  g('add-sub-relation', function (R, d) {
    var a = R.int(3, d === 1 ? 20 : 90), b = R.int(3, d === 1 ? 20 : 90);
    var sum = a + b;
    var which = R.pick(['missingAddend', 'missingStart']);
    if (which === 'missingAddend') {
      return num('~' + a + ' + \\square = ' + sum + '~', b,
        ['Turn it into a subtraction: ' + sum + ' - ' + a + '.',
         sum + ' - ' + a + ' = **' + b + '**.',
         'Check by adding back: ' + a + ' + ' + b + ' = ' + sum + '.']);
    }
    return num('~\\square - ' + a + ' = ' + b + '~', sum,
      ['The thing being reduced is the largest number here.',
       'Add it back: ' + b + ' + ' + a + ' = **' + sum + '**.',
       'Check: ' + sum + ' - ' + a + ' = ' + b + '.']);
  });

  g('mental-add-strategies', function (R, d) {
    var a = R.int(20, 90), b = R.pick([19, 29, 39, 49, 98, 99, 198, 199]);
    if (d === 1) b = R.pick([19, 29, 9, 99]);
    var round = b + 1;
    return num('Add in your head: ~' + a + ' + ' + b + '~', a + b,
      [b + ' is one less than ' + round + '.',
       'Add ' + round + ': ' + a + ' + ' + round + ' = ' + (a + round) + '.',
       'Then take the extra 1 back off: ' + (a + round) + ' - 1 = **' + (a + b) + '**.']);
  });

  g('mult-meaning', function (R, d) {
    var rows = R.int(2, d === 1 ? 6 : 9), cols = R.int(2, d === 1 ? 6 : 9);
    var mode = R.pick(['groups', 'rect', 'repeated']);
    if (mode === 'repeated') {
      var reps = [];
      for (var i = 0; i < rows; i++) reps.push(cols);
      return num('Write this as a multiplication and work it out:\n\n~' + reps.join(' + ') + '~', rows * cols,
        ['There are ' + rows + ' copies of ' + cols + '.',
         'That is ' + rows + ' \\times ' + cols + ' = **' + (rows * cols) + '**.']);
    }
    if (mode === 'rect') {
      return num('A rectangle is made of unit squares, ~' + rows + '~ rows by ~' + cols + '~ columns. ' +
        'How many squares is that?', rows * cols,
        ['Each row holds ' + cols + ' squares and there are ' + rows + ' rows.',
         rows + ' \\times ' + cols + ' = **' + (rows * cols) + '**.',
         'A product is an area as much as it is repeated addition. That picture is what makes the area model work later.']);
    }
    var item = R.pick(ITEMS);
    return num(R.pick(NAMES) + ' has ~' + rows + '~ bags with ~' + cols + '~ ' + item + ' in each bag. ' +
      'How many ' + item + ' is that?', rows * cols,
      [rows + ' equal groups of ' + cols + '.',
       rows + ' \\times ' + cols + ' = **' + (rows * cols) + '**.']);
  });

  g('times-tables', function (R, d) {
    var hi = d === 1 ? 7 : (d === 2 ? 10 : 12);
    var a = R.int(2, hi), b = R.int(2, 12);
    return num('~' + a + ' \\times ' + b + ' = ?~', a * b,
      [a + ' \\times ' + b + ' = **' + (a * b) + '**.',
       'If it is not automatic yet, build from a fact you know: ' + a + ' \\times ' + (b - 1) + ' = ' +
       (a * (b - 1)) + ', then add ' + a + '.']);
  });

  g('div-meaning', function (R, d) {
    var b = R.int(2, d === 1 ? 6 : 12), q = R.int(2, d === 1 ? 8 : 12);
    var a = b * q;
    var mode = R.pick(['share', 'group']);
    var item = R.pick(ITEMS);
    if (mode === 'share') {
      return num(a + ' ' + item + ' are shared equally between ' + b + ' people. How many does each person get?', q,
        ['Sharing ' + a + ' into ' + b + ' equal parts is ' + a + ' \\div ' + b + '.',
         a + ' \\div ' + b + ' = **' + q + '** each.',
         'Check by multiplying back: ' + b + ' \\times ' + q + ' = ' + a + '.']);
    }
    return num(a + ' ' + item + ' are packed into bags of ' + b + '. How many bags?', q,
      ['This asks how many groups of ' + b + ' fit into ' + a + ', which is ' + a + ' \\div ' + b + '.',
       a + ' \\div ' + b + ' = **' + q + '** bags.',
       'Sharing and grouping give the same calculation. That is why one symbol covers both.']);
  });

  g('div-facts', function (R, d) {
    var b = R.int(2, d === 1 ? 6 : 12), q = R.int(2, 12);
    return num('~' + (b * q) + ' \\div ' + b + ' = ?~', q,
      ['Ask: ' + b + ' times what makes ' + (b * q) + '?',
       b + ' \\times ' + q + ' = ' + (b * q) + ', so the answer is **' + q + '**.']);
  });

  g('mult-div-relation', function (R, d) {
    var a = R.int(2, 12), b = R.int(2, 12), p = a * b;
    var which = R.int(0, 2);
    if (which === 0) {
      return num('~' + a + ' \\times \\square = ' + p + '~', b,
        ['Divide to undo the multiplication: ' + p + ' \\div ' + a + '.',
         'The missing factor is **' + b + '**.']);
    }
    if (which === 1) {
      return num('~\\square \\div ' + a + ' = ' + b + '~', p,
        ['Multiply to undo the division: ' + b + ' \\times ' + a + '.',
         'The missing number is **' + p + '**.']);
    }
    return num('One fact in a family is ~' + a + ' \\times ' + b + ' = ' + p + '~. ' +
      'What is ~' + p + ' \\div ' + b + '~?', a,
      ['Every multiplication fact carries two divisions with it.',
       'From ' + a + ' \\times ' + b + ' = ' + p + ' you get ' + p + ' \\div ' + b + ' = **' + a + '**.']);
  });

  g('zero-one-rules', function (R, d) {
    var n = R.int(2, 99);
    var cases = [
      { q: '~' + n + ' \\times 0 = ?~', a: 0, s: ['Zero groups of anything is nothing.', 'The answer is **0**.'] },
      { q: '~' + n + ' \\times 1 = ?~', a: n, s: ['One group of ' + n + ' is ' + n + '.', 'The answer is **' + n + '**.'] },
      { q: '~' + n + ' \\div 1 = ?~', a: n, s: ['Sharing between one person gives them everything.', 'The answer is **' + n + '**.'] },
      { q: '~0 \\div ' + n + ' = ?~', a: 0, s: ['Sharing nothing between ' + n + ' people gives each nothing.', 'The answer is **0**.'] },
      { q: '~' + n + ' \\div ' + n + ' = ?~', a: 1, s: ['Any number fits into itself exactly once.', 'The answer is **1**.'] }
    ];
    if (d > 1 && R.bool(0.35)) {
      var sh = shuffleChoices(R, ['It is 0', 'It is ' + n, 'It has no answer', 'It is 1'], 2);
      return mc('What is ~' + n + ' \\div 0~?', sh.choices, sh.answer,
        ['Division asks: what times 0 gives ' + n + '?',
         'Nothing times 0 gives ' + n + ', because anything times 0 is 0.',
         'So **there is no answer**. Division by zero is *undefined* — not zero, and not infinity.']);
    }
    var c = R.pick(cases);
    return num(c.q, c.a, c.s);
  });

  g('money-count', function (R, d) {
    var coins = [1, 5, 10, 25, 100, 500, 1000, 2000];
    var k = d === 1 ? 3 : (d === 2 ? 4 : 5);
    var picked = [], total = 0;
    for (var i = 0; i < k; i++) { var c = R.pick(coins); picked.push(c); total += c; }
    picked.sort(function (a, b) { return b - a; });
    function nameOf(c) {
      return { 1: 'penny', 5: 'nickel', 10: 'dime', 25: 'quarter', 100: '\u00241 bill',
               500: '\u00245 bill', 1000: '\u002410 bill', 2000: '\u002420 bill' }[c];
    }
    var counts = {};
    picked.forEach(function (c) { counts[c] = (counts[c] || 0) + 1; });
    var desc = Object.keys(counts).sort(function (a, b) { return b - a; }).map(function (c) {
      var nm = nameOf(+c);
      return counts[c] + ' ' + (counts[c] > 1 ? (nm.indexOf('bill') > -1 ? nm + 's' : (nm === 'penny' ? 'pennies' : nm + 's')) : nm);
    }).join(', ');
    if (d >= 2 && R.bool(0.4)) {
      var price = Math.floor(total * R.int(30, 90) / 100);
      return num('You hand over ' + desc + ' (' + MC.money(total / 100) + ') to pay a bill of ' +
        MC.money(price / 100) + '. How much change do you get, in dollars?', (total - price) / 100,
        ['You gave ' + MC.money(total / 100) + ' and owed ' + MC.money(price / 100) + '.',
         MC.money(total / 100) + ' - ' + MC.money(price / 100) + ' = **' + MC.money((total - price) / 100) + '**.',
         'A till counts up from the price to the amount given — same answer, fewer mistakes.'],
        { unit: 'dollars', tol: 0.005 });
    }
    return num('How much money is this, in dollars?\n\n' + desc, total / 100,
      ['Add the values: ' + picked.map(function (c) { return MC.money(c / 100); }).join(' + ') + '.',
       'Total: **' + MC.money(total / 100) + '**.'],
      { unit: 'dollars', tol: 0.005 });
  });

  g('time-read', function (R, d) {
    var h24 = R.int(0, 23), m = R.pick([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
    var h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    var suffix = h24 < 12 ? 'a.m.' : 'p.m.';
    var two = function (x) { return (x < 10 ? '0' : '') + x; };
    if (R.bool(0.5)) {
      return { prompt: 'Write ~' + two(h24) + ':' + two(m) + '~ as a 12-hour time. Use the form ' +
          '`' + h12 + ':' + two(m) + ' ' + (h24 < 12 ? 'am' : 'pm') + '`.',
        kind: 'text', answer: h12 + ':' + two(m) + (h24 < 12 ? 'am' : 'pm'), normaliseTime: true,
        solution: [h24 >= 13 ? 'Subtract 12 from ' + h24 + ' to get ' + h12 + '.' :
            (h24 === 0 ? 'Hour 00 is 12 in the 12-hour clock.' : 'Hours 1 to 12 stay the same.'),
          'The time is **' + h12 + ':' + two(m) + ' ' + suffix + '**.'] };
    }
    var mins = h24 * 60 + m;
    return num('How many minutes past midnight is ~' + two(h24) + ':' + two(m) + '~?', mins,
      [h24 + ' hours is ' + h24 + ' \\times 60 = ' + (h24 * 60) + ' minutes.',
       'Add the ' + m + ' minutes: ' + (h24 * 60) + ' + ' + m + ' = **' + mins + '**.']);
  });

  g('time-elapsed', function (R, d) {
    var startH = R.int(d === 1 ? 7 : 1, d === 1 ? 11 : 23);
    var startM = R.pick([0, 10, 15, 20, 30, 40, 45, 50]);
    var durH = R.int(1, d === 1 ? 3 : 9), durM = R.pick([0, 15, 20, 25, 30, 40, 45, 50]);
    var total = startH * 60 + startM + durH * 60 + durM;
    var endH = Math.floor(total / 60) % 24, endM = total % 60;
    var two = function (x) { return (x < 10 ? '0' : '') + x; };
    return { prompt: 'A train leaves at ~' + two(startH) + ':' + two(startM) + '~ and the journey takes ~' +
        durH + '~ h ~' + durM + '~ min. What time does it arrive? Answer in 24-hour form, like `14:35`.',
      kind: 'text', answer: two(endH) + ':' + two(endM), normaliseTime: true,
      solution: ['Add the hours first: ' + two(startH) + ':' + two(startM) + ' + ' + durH + ' h = ' +
          two((startH + durH) % 24) + ':' + two(startM) + '.',
        'Now add ' + durM + ' min to the minutes: ' + startM + ' + ' + durM + ' = ' + (startM + durM) +
          (startM + durM >= 60 ? ', which is over 60, so carry one hour and keep ' + ((startM + durM) % 60) + ' min.' : '.'),
        'Arrival: **' + two(endH) + ':' + two(endM) + '**.'] };
  });

  g('measure-units', function (R, d) {
    var sets = [
      { q: 'the length of a pencil', opts: ['millimetres', 'centimetres', 'metres', 'kilometres'], right: 1 },
      { q: 'the distance between two cities', opts: ['centimetres', 'metres', 'kilometres', 'millimetres'], right: 2 },
      { q: 'the mass of an apple', opts: ['milligrams', 'grams', 'kilograms', 'tonnes'], right: 1 },
      { q: 'the mass of a car', opts: ['grams', 'kilograms', 'milligrams', 'carats'], right: 1 },
      { q: 'the water in a bath', opts: ['millilitres', 'litres', 'cubic kilometres', 'grams'], right: 1 },
      { q: 'the thickness of a coin', opts: ['millimetres', 'metres', 'kilometres', 'litres'], right: 0 },
      { q: 'the floor area of a room', opts: ['square metres', 'metres', 'cubic metres', 'kilometres'], right: 0 }
    ];
    var s = R.pick(sets);
    var sh = shuffleChoices(R, s.opts, s.right);
    return mc('Which unit should you use to measure ' + s.q + '?', sh.choices, sh.answer,
      ['Pick the unit that makes the number convenient — not far too large and not far too small.',
       'The sensible unit is **' + s.opts[s.right] + '**.',
       'An answer without its unit is not an answer. "12" could be 12 mm or 12 km.']);
  });

  /* =====================================================================
     LEVEL 1 — WHOLE-NUMBER ARITHMETIC
     ===================================================================== */

  g('add-multidigit', function (R, d) {
    var digits = d === 1 ? 2 : (d === 2 ? 3 : 4);
    var lo = Math.pow(10, digits - 1), hi = Math.pow(10, digits) - 1;
    var k = d === 3 && R.bool(0.4) ? 3 : 2;
    var nums = [];
    for (var i = 0; i < k; i++) nums.push(R.int(lo, hi));
    var total = nums.reduce(function (a, b) { return a + b; }, 0);
    var onesSum = nums.reduce(function (a, b) { return a + (b % 10); }, 0);
    return num('~' + nums.join(' + ') + ' = ?~', total,
      ['Line the numbers up by place value and add the ones column first: ' +
        nums.map(function (n) { return n % 10; }).join(' + ') + ' = ' + onesSum +
        (onesSum >= 10 ? ', so write ' + (onesSum % 10) + ' and carry ' + Math.floor(onesSum / 10) + '.' : '.'),
       'Work left through the remaining columns, carrying where a column passes 9.',
       'Total: **' + MC.commas(total) + '**.']);
  });

  g('sub-multidigit', function (R, d) {
    var digits = d === 1 ? 2 : (d === 2 ? 3 : 4);
    var hi = Math.pow(10, digits) - 1, lo = Math.pow(10, digits - 1);
    var a = R.int(lo + 1, hi), b = R.int(lo, a - 1);
    /* at higher difficulty, force a borrow across a zero */
    if (d === 3) { a = R.int(1, 9) * 1000 + R.int(0, 9) * 100 + 0 * 10 + R.int(0, 4); b = R.int(100, a - 1); }
    return num('~' + MC.commas(a) + ' - ' + MC.commas(b) + ' = ?~', a - b,
      ['Subtract column by column from the right. Where the top digit is smaller, borrow ten from the column to its left.',
       (String(a).indexOf('0') > -1 ? 'There is a zero to borrow across: take from the next non-zero column, which turns the zeros into nines.' :
        'Keep each borrow written down so you do not lose it.'),
       MC.commas(a) + ' - ' + MC.commas(b) + ' = **' + MC.commas(a - b) + '**.',
       'Check by adding back: ' + MC.commas(a - b) + ' + ' + MC.commas(b) + ' = ' + MC.commas(a) + '.']);
  });

  g('add-sub-checks', function (R, d) {
    var a = R.int(100, 9999), b = R.int(100, a - 1);
    var wrong = a - b + R.pick([-100, -10, -1, 1, 10, 100, 1000]);
    var sh = shuffleChoices(R, ['Add ' + MC.commas(wrong) + ' and ' + MC.commas(b) + ' and see whether you get ' + MC.commas(a),
      'Subtract ' + MC.commas(b) + ' from ' + MC.commas(wrong), 'Round both numbers and add',
      'Multiply ' + MC.commas(wrong) + ' by ' + MC.commas(b)], 0);
    return mc('Someone calculates ~' + MC.commas(a) + ' - ' + MC.commas(b) + ' = ' + MC.commas(wrong) +
      '~. What is the quickest way to check whether that is right?', sh.choices, sh.answer,
      ['Subtraction is undone by addition, so the answer plus what you took away must give what you started with.',
       MC.commas(wrong) + ' + ' + MC.commas(b) + ' = ' + MC.commas(wrong + b) + ', but the starting number was ' +
         MC.commas(a) + ', so the answer is wrong.',
       'The correct answer is ' + MC.commas(a - b) + '. **Checking by the inverse operation** catches almost every arithmetic slip.']);
  });

  g('mult-by-ten', function (R, d) {
    var a = R.int(d === 1 ? 2 : 12, d === 1 ? 99 : 9999);
    var zeros = R.int(1, d === 1 ? 2 : 4);
    var p = Math.pow(10, zeros);
    if (d >= 2 && R.bool(0.4)) {
      var prod = a * p;
      return num('~' + MC.commas(prod) + ' \\div ' + MC.commas(p) + ' = ?~', a,
        ['Dividing by ' + MC.commas(p) + ' moves every digit ' + zeros + ' place' + (zeros > 1 ? 's' : '') + ' to the right.',
         'Answer: **' + MC.commas(a) + '**.']);
    }
    return num('~' + MC.commas(a) + ' \\times ' + MC.commas(p) + ' = ?~', a * p,
      ['Multiplying by ' + MC.commas(p) + ' shifts every digit ' + zeros + ' place' + (zeros > 1 ? 's' : '') + ' to the left.',
       'So write ' + a + ' followed by ' + zeros + ' zero' + (zeros > 1 ? 's' : '') + ': **' + MC.commas(a * p) + '**.',
       'The zeros are a consequence of place value, not a trick to memorise.']);
  });

  g('mult-area-model', function (R, d) {
    var a = R.int(11, d === 1 ? 29 : 99), b = R.int(11, d === 1 ? 19 : 99);
    var aT = Math.floor(a / 10) * 10, aO = a % 10, bT = Math.floor(b / 10) * 10, bO = b % 10;
    return num('Use the area model to multiply ~' + a + ' \\times ' + b + '~.', a * b,
      ['Split each number by place value: ' + a + ' = ' + aT + ' + ' + aO + ' and ' + b + ' = ' + bT + ' + ' + bO + '.',
       'Four rectangles: ' + aT + '\\times' + bT + ' = ' + (aT * bT) + ', ' + aT + '\\times' + bO + ' = ' + (aT * bO) +
         ', ' + aO + '\\times' + bT + ' = ' + (aO * bT) + ', ' + aO + '\\times' + bO + ' = ' + (aO * bO) + '.',
       'Add the four areas: ' + (aT * bT) + ' + ' + (aT * bO) + ' + ' + (aO * bT) + ' + ' + (aO * bO) + ' = **' + (a * b) + '**.',
       'This is exactly what the column method does; the area model just shows you the four pieces.']);
  });

  g('mult-standard', function (R, d) {
    var a = d === 1 ? R.int(12, 99) : (d === 2 ? R.int(100, 999) : R.int(1000, 9999));
    var b = d === 1 ? R.int(2, 9) : (d === 2 ? R.int(11, 99) : R.int(11, 99));
    return num('~' + MC.commas(a) + ' \\times ' + b + ' = ?~', a * b,
      (b < 10
        ? ['Multiply each digit of ' + a + ' by ' + b + ', right to left, carrying as you go.',
           'Answer: **' + MC.commas(a * b) + '**.']
        : ['Multiply by the ones digit of ' + b + ': ' + MC.commas(a) + ' \\times ' + (b % 10) + ' = ' + MC.commas(a * (b % 10)) + '.',
           'Multiply by the tens digit, shifting one place left: ' + MC.commas(a) + ' \\times ' + Math.floor(b / 10) +
             ' = ' + MC.commas(a * Math.floor(b / 10)) + ', written as ' + MC.commas(a * Math.floor(b / 10) * 10) + '.',
           'Add the partial products: ' + MC.commas(a * (b % 10)) + ' + ' + MC.commas(a * Math.floor(b / 10) * 10) +
             ' = **' + MC.commas(a * b) + '**.']));
  });

  g('mult-mental-tricks', function (R, d) {
    var kinds = ['double-halve', 'near-hundred', 'times-five', 'times-nine'];
    var kind = R.pick(d === 1 ? ['times-five', 'times-nine'] : kinds);
    if (kind === 'double-halve') {
      var a = R.pick([14, 16, 18, 22, 24, 26, 28, 35, 45]), b = R.pick([5, 15, 25, 50]);
      return num('Multiply in your head: ~' + a + ' \\times ' + b + '~', a * b,
        ['Halve one factor and double the other — the product does not change.',
         (a / 2) + ' \\times ' + (b * 2) + ' = ' + (a * b) + (b * 2 === 100 || b * 2 === 50 ? ', which is now easy.' : '.'),
         'Answer: **' + MC.commas(a * b) + '**.']);
    }
    if (kind === 'near-hundred') {
      var x = R.int(2, 99), y = R.pick([98, 99, 101, 102]);
      return num('Multiply in your head: ~' + x + ' \\times ' + y + '~', x * y,
        [y + ' is ' + (y > 100 ? y - 100 + ' more' : 100 - y + ' less') + ' than 100.',
         x + ' \\times 100 = ' + (x * 100) + ', then ' + (y > 100 ? 'add ' : 'subtract ') + x + ' \\times ' +
           Math.abs(y - 100) + ' = ' + (x * Math.abs(y - 100)) + '.',
         'Answer: **' + MC.commas(x * y) + '**.']);
    }
    if (kind === 'times-five') {
      var n = R.int(12, 199) * 2;
      return num('Multiply in your head: ~' + n + ' \\times 5~', n * 5,
        ['Multiplying by 5 is multiplying by 10 and halving.',
         n + ' \\times 10 = ' + (n * 10) + ', and half of that is **' + (n * 5) + '**.']);
    }
    var m = R.int(12, 99);
    return num('Multiply in your head: ~' + m + ' \\times 9~', m * 9,
      ['Nine is ten minus one.',
       m + ' \\times 10 = ' + (m * 10) + ', then subtract ' + m + ': ' + (m * 10) + ' - ' + m + ' = **' + (m * 9) + '**.']);
  });

  g('div-short', function (R, d) {
    var b = R.int(2, 9);
    var q = d === 1 ? R.int(11, 99) : (d === 2 ? R.int(100, 999) : R.int(1000, 9999));
    var r = R.bool(0.5) ? R.int(1, b - 1) : 0;
    var a = b * q + r;
    if (r === 0) {
      return num('~' + MC.commas(a) + ' \\div ' + b + ' = ?~', q,
        ['Work left to right: divide each digit by ' + b + ', carrying any remainder to the next digit.',
         'Answer: **' + MC.commas(q) + '**.',
         'Check: ' + b + ' \\times ' + MC.commas(q) + ' = ' + MC.commas(a) + '.']);
    }
    return multi('~' + MC.commas(a) + ' \\div ' + b + '~ — give the quotient and the remainder.',
      [{ label: 'Quotient', answer: q }, { label: 'Remainder', answer: r }],
      ['Divide left to right, carrying remainders along.',
       b + ' goes into ' + MC.commas(a) + ' a total of ' + MC.commas(q) + ' times, with ' + r + ' left over.',
       'Quotient **' + MC.commas(q) + '**, remainder **' + r + '**.',
       'Check: ' + b + ' \\times ' + MC.commas(q) + ' + ' + r + ' = ' + MC.commas(a) + '.']);
  });

  g('div-long', function (R, d) {
    var b = d === 1 ? R.int(11, 25) : (d === 2 ? R.int(12, 99) : R.int(101, 499));
    var q = d === 3 ? R.int(11, 99) : R.int(11, 199);
    var r = R.bool(0.45) ? R.int(1, b - 1) : 0;
    var a = b * q + r;
    if (r === 0) {
      return num('~' + MC.commas(a) + ' \\div ' + b + ' = ?~', q,
        ['Estimate how many times ' + b + ' fits into the leading digits, multiply, subtract, bring down the next digit, repeat.',
         'Answer: **' + MC.commas(q) + '**.',
         'Check: ' + b + ' \\times ' + MC.commas(q) + ' = ' + MC.commas(a) + '.']);
    }
    return multi('~' + MC.commas(a) + ' \\div ' + MC.commas(b) + '~ — give the quotient and the remainder.',
      [{ label: 'Quotient', answer: q }, { label: 'Remainder', answer: r }],
      ['Set it out as long division: estimate, multiply, subtract, bring down, repeat.',
       MC.commas(b) + ' \\times ' + MC.commas(q) + ' = ' + MC.commas(b * q) + ', and ' + MC.commas(a) + ' - ' +
         MC.commas(b * q) + ' = ' + r + ', which is smaller than ' + MC.commas(b) + ', so the division stops.',
       'Quotient **' + MC.commas(q) + '**, remainder **' + r + '**.']);
  });

  g('div-remainder-meaning', function (R, d) {
    var per = R.int(3, 12), groups = R.int(4, 30), extra = R.int(1, per - 1);
    var total = per * groups + extra;
    var mode = R.pick(['roundUp', 'roundDown', 'remainder', 'exact']);
    var thing = R.pick(['people', 'boxes', 'buses', 'tables']);
    if (mode === 'roundUp') {
      return num(MC.commas(total) + ' people must travel in buses holding ' + per + ' each. ' +
        'How many buses are needed?', groups + 1,
        [MC.commas(total) + ' \\div ' + per + ' = ' + groups + ' remainder ' + extra + '.',
         groups + ' full buses carry ' + (per * groups) + ' people and ' + extra + ' are still waiting.',
         'Those ' + extra + ' need a bus too, so the answer is **' + (groups + 1) + '**.',
         'This is the question type where you must round the quotient up, whatever the remainder is.']);
    }
    if (mode === 'roundDown') {
      return num('You have ' + MC.commas(total) + ' flowers and want bunches of exactly ' + per +
        '. How many complete bunches can you make?', groups,
        [MC.commas(total) + ' \\div ' + per + ' = ' + groups + ' remainder ' + extra + '.',
         'Only complete bunches count, so the ' + extra + ' spare flowers are ignored.',
         'Answer: **' + groups + '**.']);
    }
    if (mode === 'remainder') {
      return num(MC.commas(total) + ' sweets are shared equally between ' + per + ' children. ' +
        'How many are left over?', total % per,
        [MC.commas(total) + ' \\div ' + per + ' = ' + Math.floor(total / per) + ' remainder ' + (total % per) + '.',
         'Each child gets ' + Math.floor(total / per) + ' and **' + (total % per) + '** are left over.']);
    }
    var a2 = per * groups;
    return num(MC.commas(a2) + ' is shared equally between ' + per + '. How much does each get?', groups,
      ['This one divides exactly: ' + MC.commas(a2) + ' \\div ' + per + ' = **' + groups + '**.',
       'Before answering any division word problem, decide what the remainder means: ignore it, round up, or report it.']);
  });

  g('order-ops-basic', function (R, d) {
    var a = R.int(2, 9), b = R.int(2, 9), c = R.int(2, 9), e = R.int(2, 3);
    var forms = [
      { s: a + ' + ' + b + ' \\times ' + c, v: a + b * c,
        st: ['Multiplication outranks addition, so do ' + b + ' \\times ' + c + ' = ' + (b * c) + ' first.',
             a + ' + ' + (b * c) + ' = **' + (a + b * c) + '**.',
             'Working left to right would give ' + ((a + b) * c) + ', which is wrong.'] },
      { s: '(' + a + ' + ' + b + ') \\times ' + c, v: (a + b) * c,
        st: ['Brackets first: ' + a + ' + ' + b + ' = ' + (a + b) + '.',
             (a + b) + ' \\times ' + c + ' = **' + ((a + b) * c) + '**.'] },
      { s: a + ' + ' + b + '^{' + e + '} \\times ' + c, v: a + Math.pow(b, e) * c,
        st: ['Powers come before multiplication: ' + b + '^{' + e + '} = ' + Math.pow(b, e) + '.',
             'Then multiply: ' + Math.pow(b, e) + ' \\times ' + c + ' = ' + (Math.pow(b, e) * c) + '.',
             'Finally add: ' + a + ' + ' + (Math.pow(b, e) * c) + ' = **' + (a + Math.pow(b, e) * c) + '**.'] },
      { s: a * c + ' \\div ' + c + ' + ' + b, v: a + b,
        st: ['Division and multiplication rank equally and are done left to right: ' + (a * c) + ' \\div ' + c + ' = ' + a + '.',
             a + ' + ' + b + ' = **' + (a + b) + '**.'] },
      { s: a + ' \\times ' + b + ' - ' + c + ' \\times ' + 2, v: a * b - c * 2,
        st: ['Both products first: ' + a + '\\times' + b + ' = ' + (a * b) + ' and ' + c + '\\times2 = ' + (c * 2) + '.',
             'Then subtract: ' + (a * b) + ' - ' + (c * 2) + ' = **' + (a * b - c * 2) + '**.'] }
    ];
    var f = R.pick(d === 1 ? forms.slice(0, 2) : forms);
    return num('~' + f.s + ' = ?~', f.v, f.st);
  });

  g('order-ops-nested', function (R, d) {
    var a = R.int(2, 9), b = R.int(2, 9), c = R.int(2, 6), e = R.int(2, 3);
    if (R.bool(0.5)) {
      var inner = a + b, mid = inner * c, val = mid - a;
      return num('~' + c + '(' + a + ' + ' + b + ') - ' + a + ' = ?~', val,
        ['Innermost bracket first: ' + a + ' + ' + b + ' = ' + inner + '.',
         'A number next to a bracket means multiply: ' + c + ' \\times ' + inner + ' = ' + mid + '.',
         mid + ' - ' + a + ' = **' + val + '**.']);
    }
    var top = a * b + c, bot = c + 1, v2 = top / bot;
    /* force a whole-number result */
    var k = R.int(2, 9); bot = k; top = k * R.int(2, 9);
    v2 = top / bot;
    return num('~\\f{' + top + ' + ' + a + '}{' + bot + '} = ?~', (top + a) / bot,
      ['A fraction bar groups everything above it: work out ' + top + ' + ' + a + ' = ' + (top + a) + ' first.',
       (top + a) + ' \\div ' + bot + ' = **' + MC.fmt((top + a) / bot) + '**.',
       'The bar is a grouping symbol as much as a bracket is.'], { tol: 0.0005 });
  });

  g('order-ops-traps', function (R, d) {
    var a = R.int(2, 9), b = R.int(2, 9), c = R.int(2, 9);
    var kinds = ['leftRight', 'negSquare', 'subtractOrder'];
    var kind = R.pick(kinds);
    if (kind === 'leftRight') {
      var v = a * 1;
      var total = R.int(2, 6) * R.int(2, 6);
      var x = total, y = R.int(2, 6), z = R.int(2, 6);
      var val = x / y * z;
      if (!Number.isInteger(val)) { x = y * z * R.int(2, 5); val = x / y * z; }
      return num('~' + x + ' \\div ' + y + ' \\times ' + z + ' = ?~', val,
        ['Division and multiplication have equal rank, so go strictly left to right.',
         x + ' \\div ' + y + ' = ' + (x / y) + ', then \\times ' + z + ' = **' + val + '**.',
         'Doing the multiplication first would give ' + (x / (y * z)) + '. The order matters here.']);
    }
    if (kind === 'negSquare') {
      var n = R.int(3, 9);   /* at n = 2 the distractors 2n and n^2 coincide */
      var sh = choiceSet(R, '~-' + (n * n) + '~',
        ['~' + (n * n) + '~', '~-' + (2 * n) + '~', '~' + (2 * n) + '~']);
      return mc('What is ~-' + n + '^{2}~?', sh.choices, sh.answer,
        ['The power applies to ' + n + ' only — the minus sign is not inside it.',
         'So this is ~-(' + n + '^{2}) = -' + (n * n) + '~.',
         'Had the question been ~(-' + n + ')^{2}~, the answer would be ~' + (n * n) + '~. The brackets are the whole difference.']);
    }
    var p = R.int(10, 40), q2 = R.int(2, 9), r2 = R.int(2, 9);
    return num('~' + p + ' - ' + q2 + ' - ' + r2 + ' = ?~', p - q2 - r2,
      ['Subtraction is also left to right: ' + p + ' - ' + q2 + ' = ' + (p - q2) + '.',
       (p - q2) + ' - ' + r2 + ' = **' + (p - q2 - r2) + '**.',
       'Doing the right-hand subtraction first gives ' + (p - (q2 - r2)) + ', which is wrong. Subtraction is not associative.']);
  });

  g('factors-multiples', function (R, d) {
    var n = R.int(d === 1 ? 6 : 12, d === 1 ? 30 : 100);
    if (R.bool(0.5)) {
      var ds = MC.divisors(n);
      return { prompt: 'List every factor of ~' + n + '~, smallest first, separated by commas.',
        kind: 'text', answer: ds.join(','), normaliseList: true,
        solution: ['Test each number from 1 upward, pairing each factor with its partner: ' +
            MC.factorPairs(n).map(function (p) { return p[0] + '\\times' + p[1]; }).join(', ') + '.',
          'Factors: **' + ds.join(', ') + '**.',
          'You only need to test up to ' + Math.floor(Math.sqrt(n)) + ', because beyond that the pairs repeat.'] };
    }
    var k = R.int(3, 6), m = R.int(3, 12);
    var mults = [];
    for (var i = 1; i <= k; i++) mults.push(m * i);
    return { prompt: 'List the first ~' + k + '~ multiples of ~' + m + '~, separated by commas.',
      kind: 'text', answer: mults.join(','), normaliseList: true,
      solution: ['Multiply ' + m + ' by 1, 2, 3, and so on.',
        '**' + mults.join(', ') + '**.',
        'Factors divide into a number; multiples are built from it. A number has finitely many factors and endlessly many multiples.'] };
  });

  g('divisibility-rules', function (R, d) {
    var tests = [2, 3, 4, 5, 6, 8, 9, 10, 11];
    var t = R.pick(d === 1 ? [2, 5, 10, 3] : tests);
    var n = R.int(1000, 99999);
    if (R.bool(0.5)) n = n - (n % t);  /* make it divisible half the time */
    var yes = n % t === 0;
    var why = {
      2: 'the last digit (' + (n % 10) + ') is ' + (n % 2 === 0 ? 'even' : 'odd'),
      5: 'the last digit is ' + (n % 10) + ', ' + (n % 5 === 0 ? 'which is 0 or 5' : 'which is neither 0 nor 5'),
      10: 'the last digit is ' + (n % 10),
      3: 'the digit sum is ' + digitSum(n) + ', which is ' + (digitSum(n) % 3 === 0 ? '' : 'not ') + 'a multiple of 3',
      9: 'the digit sum is ' + digitSum(n) + ', which is ' + (digitSum(n) % 9 === 0 ? '' : 'not ') + 'a multiple of 9',
      4: 'the last two digits make ' + (n % 100) + ', which is ' + (n % 4 === 0 ? '' : 'not ') + 'a multiple of 4',
      8: 'the last three digits make ' + (n % 1000) + ', which is ' + (n % 8 === 0 ? '' : 'not ') + 'a multiple of 8',
      6: 'it is ' + (n % 2 === 0 ? '' : 'not ') + 'even and the digit sum ' + digitSum(n) + ' is ' +
         (digitSum(n) % 3 === 0 ? '' : 'not ') + 'a multiple of 3, and 6 needs both',
      11: 'the alternating digit sum is ' + altSum(n) + ', which is ' + (altSum(n) % 11 === 0 ? '' : 'not ') + 'a multiple of 11'
    }[t];
    var sh = shuffleChoices(R, ['Yes', 'No'], yes ? 0 : 1);
    return mc('Is ~' + MC.commas(n) + '~ divisible by ~' + t + '~?', sh.choices, sh.answer,
      ['Use the rule for ' + t + ' rather than dividing.',
       'Here ' + why + '.',
       'So the answer is **' + (yes ? 'yes' : 'no') + '**.']);
  });
  function digitSum(n) { return String(Math.abs(n)).split('').reduce(function (a, c) { return a + (+c); }, 0); }
  function altSum(n) {
    var s = String(Math.abs(n)).split('').reverse(), t = 0;
    for (var i = 0; i < s.length; i++) t += (i % 2 ? -1 : 1) * (+s[i]);
    return Math.abs(t);
  }

  g('primes-composites', function (R, d) {
    var hi = d === 1 ? 50 : (d === 2 ? 120 : 400);
    var n = R.int(10, hi);
    if (R.bool(0.45)) { var ps = MC.primesUpTo(hi).filter(function (p) { return p > 9; }); n = R.pick(ps); }
    var prime = MC.isPrime(n);
    var sh = shuffleChoices(R, ['Prime', 'Composite'], prime ? 0 : 1);
    var smallest = null;
    for (var p2 = 2; p2 * p2 <= n && !smallest; p2++) if (n % p2 === 0) smallest = p2;
    return mc('Is ~' + n + '~ prime or composite?', sh.choices, sh.answer,
      ['Test only primes up to ~sqrt{' + n + '}~, which is about ' + MC.fmt(Math.sqrt(n), 1) + '. ' +
        'Beyond that any factor would already have a partner below it.',
       prime ? 'None of 2, 3, 5, 7' + (n > 121 ? ', 11, 13' : '') + ' divides ' + n + '.'
             : n + ' = ' + smallest + ' \\times ' + (n / smallest) + ', so it has a factor other than 1 and itself.',
       '**' + (prime ? 'Prime' : 'Composite') + '**.']);
  });

  g('prime-factorisation', function (R, d) {
    var n;
    do {
      n = d === 1 ? R.int(12, 60) : (d === 2 ? R.int(60, 400) : R.int(400, 3000));
    } while (MC.isPrime(n));
    var pf = MC.primeFactors(n);
    var counts = {};
    pf.forEach(function (p) { counts[p] = (counts[p] || 0) + 1; });
    var pretty = Object.keys(counts).map(function (p) {
      return counts[p] > 1 ? p + '^{' + counts[p] + '}' : p;
    }).join(' \\times ');
    return { prompt: 'Write the prime factorisation of ~' + n + '~. Enter it as a product like `2*2*3*5`, ' +
        'smallest prime first.',
      kind: 'text', answer: pf.join('*'), normaliseList: false, answerAlt: [pf.join('x'), pf.join(' * ')],
      checkProduct: { value: n, primes: true },
      solution: ['Divide by the smallest prime that fits, repeatedly: ' +
          buildFactorTree(n).join(', then '),
        'Prime factorisation: **' + pf.join(' \\times ') + '**, which is ~' + pretty + '~.',
        'Every whole number above 1 has exactly one prime factorisation. That uniqueness is what makes GCF and LCM work.'] };
  });
  function buildFactorTree(n) {
    var steps = [], cur = n;
    for (var p = 2; p * p <= cur; p++) {
      while (cur % p === 0) { steps.push(cur + ' \\div ' + p + ' = ' + (cur / p)); cur = cur / p; }
    }
    if (cur > 1 && steps.length) steps.push(cur + ' is prime, so stop');
    return steps;
  }

  g('gcf', function (R, d) {
    var g1 = R.int(2, d === 1 ? 8 : 24);
    var a = g1 * R.int(2, 12), b = g1 * R.int(2, 12);
    if (a === b) b = a + g1;
    var answer = MC.gcd(a, b);
    return num('Find the greatest common factor of ~' + a + '~ and ~' + b + '~.', answer,
      ['Prime factors: ' + a + ' = ' + MC.primeFactors(a).join('\\times') + ' and ' + b + ' = ' +
        MC.primeFactors(b).join('\\times') + '.',
       'Take every prime they share, to the lower power.',
       'GCF = **' + answer + '**.',
       'The quick alternative is the Euclidean method: ' + Math.max(a, b) + ' mod ' + Math.min(a, b) + ' = ' +
         (Math.max(a, b) % Math.min(a, b)) + ', and keep going until the remainder is 0.']);
  });

  g('lcm', function (R, d) {
    var a = R.int(d === 1 ? 2 : 6, d === 1 ? 12 : 30), b = R.int(d === 1 ? 2 : 6, d === 1 ? 12 : 30);
    if (a === b) b = a + 1;
    var answer = MC.lcm(a, b);
    if (d >= 2 && R.bool(0.4)) {
      return num('One bus leaves every ~' + a + '~ minutes and another every ~' + b + '~ minutes. ' +
        'They both leave at 9:00. How many minutes until they next leave together?', answer,
        ['You need a time that is a multiple of both ' + a + ' and ' + b + ' — the least common multiple.',
         'LCM(' + a + ', ' + b + ') = ' + a + ' \\times ' + b + ' \\div GCF = ' + (a * b) + ' \\div ' + MC.gcd(a, b) +
           ' = **' + answer + '** minutes.',
         'Shared-event questions want the LCM. Splitting-into-equal-groups questions want the GCF.']);
    }
    return num('Find the least common multiple of ~' + a + '~ and ~' + b + '~.', answer,
      ['Use LCM ~= \\f{a \\times b}{GCF}~: GCF(' + a + ', ' + b + ') = ' + MC.gcd(a, b) + '.',
       (a * b) + ' \\div ' + MC.gcd(a, b) + ' = **' + answer + '**.']);
  });

  g('integers-line', function (R, d) {
    var a = R.int(-40, 40), b = R.int(-40, 40);
    if (a === b) b = a + R.nonzero(1, 5);
    if (R.bool(0.4)) {
      var vals = R.distinct(4, -30, 30);
      var sorted = vals.slice().sort(function (x, y) { return x - y; });
      return { prompt: 'Put these in order, smallest first, separated by commas:\n\n~' + vals.join(',\; ') + '~',
        kind: 'text', answer: sorted.join(','), normaliseList: true,
        solution: ['On the number line, further left is smaller. Every negative is below every positive.',
          '**' + sorted.join(', ') + '**.',
          'Among negatives the one with the larger digits is the smaller number: ~-30 < -4~.'] };
    }
    var sh = shuffleChoices(R, ['~' + a + '~', '~' + b + '~'], a > b ? 0 : 1);
    return mc('Which number is larger?', sh.choices, sh.answer,
      ['Think about position on the number line: the one further right is larger.',
       '**' + Math.max(a, b) + '** is larger.',
       (a < 0 && b < 0) ? 'With two negatives, the one closer to zero wins.' :
         'Any positive number beats any negative number.']);
  });

  g('absolute-value', function (R, d) {
    var n = R.nonzero(-30, 30);
    if (d === 1) return num('~|' + n + '| = ?~', Math.abs(n),
      ['Absolute value is distance from zero, and distance is never negative.',
       '~|' + n + '| = ' + Math.abs(n) + '~.']);
    var kinds = ['expr', 'equation', 'distance'];
    var k = R.pick(kinds);
    if (k === 'expr') {
      var a = R.nonzero(-12, 12), b = R.nonzero(-12, 12);
      return num('~|' + a + '| - |' + b + '| = ?~', Math.abs(a) - Math.abs(b),
        ['Take each absolute value first: ~|' + a + '| = ' + Math.abs(a) + '~ and ~|' + b + '| = ' + Math.abs(b) + '~.',
         Math.abs(a) + ' - ' + Math.abs(b) + ' = **' + (Math.abs(a) - Math.abs(b)) + '**.',
         'The bars act like brackets: finish inside them before doing anything else.']);
    }
    if (k === 'equation') {
      var c = R.int(1, 15);
      return mc('How many solutions does ~|x| = ' + c + '~ have?', ['0', '1', '2', 'Infinitely many'], 2,
        ['Two numbers sit at distance ' + c + ' from zero: ' + c + ' and -' + c + '.',
         'So there are **2** solutions.',
         'By contrast ~|x| = 0~ has one solution and ~|x| = -3~ has none, because distance cannot be negative.']);
    }
    var p = R.int(-20, 20), q = R.int(-20, 20);
    return num('How far apart are ~' + p + '~ and ~' + q + '~ on the number line?', Math.abs(p - q),
      ['Distance is ~|' + p + ' - (' + q + ')| = |' + (p - q) + '|~.',
       'That is **' + Math.abs(p - q) + '**.',
       'Subtracting in the other order gives the same distance, which is exactly why the bars are there.']);
  });

  g('add-sub-integers', function (R, d) {
    var a = R.nonzero(d === 1 ? -12 : -40, d === 1 ? 12 : 40);
    var b = R.nonzero(d === 1 ? -12 : -40, d === 1 ? 12 : 40);
    var op = R.bool() ? '+' : '-';
    var val = op === '+' ? a + b : a - b;
    var shown = op === '+'
      ? a + ' + (' + b + ')'
      : a + ' - (' + b + ')';
    var steps;
    if (op === '-') {
      steps = ['Subtracting is adding the opposite: ~' + a + ' - (' + b + ') = ' + a + ' + (' + (-b) + ')~.',
        (a >= 0 && -b >= 0) || (a < 0 && -b < 0)
          ? 'Same signs, so add the sizes and keep the sign: **' + val + '**.'
          : 'Different signs, so subtract the smaller size from the larger and take the sign of the larger: **' + val + '**.'];
    } else {
      steps = [(a >= 0) === (b >= 0)
        ? 'Same signs: add the sizes, keep the sign. ' + Math.abs(a) + ' + ' + Math.abs(b) + ' = ' + (Math.abs(a) + Math.abs(b)) + ', so **' + val + '**.'
        : 'Different signs: subtract the smaller size from the larger, and take the sign of the one with the larger size. ' +
          Math.max(Math.abs(a), Math.abs(b)) + ' - ' + Math.min(Math.abs(a), Math.abs(b)) + ' = ' +
          (Math.max(Math.abs(a), Math.abs(b)) - Math.min(Math.abs(a), Math.abs(b))) + ', so **' + val + '**.'];
      steps.push('On the number line: start at ' + a + ' and move ' + (b >= 0 ? 'right' : 'left') + ' by ' + Math.abs(b) + '.');
    }
    return num('~' + shown + ' = ?~', val, steps);
  });

  g('mult-div-integers', function (R, d) {
    var a = R.nonzero(-12, 12), b = R.nonzero(-12, 12);
    if (R.bool(0.5)) {
      return num('~(' + a + ') \\times (' + b + ') = ?~', a * b,
        ['Multiply the sizes: ' + Math.abs(a) + ' \\times ' + Math.abs(b) + ' = ' + Math.abs(a * b) + '.',
         (a > 0) === (b > 0) ? 'Signs match, so the answer is positive: **' + (a * b) + '**.'
                             : 'Signs differ, so the answer is negative: **' + (a * b) + '**.',
         'Two negatives multiply to a positive because multiplying by a negative reverses direction, and reversing twice faces forward again.']);
    }
    var q = R.nonzero(-12, 12), p = q * b;
    return num('~(' + p + ') \\div (' + b + ') = ?~', q,
      ['Divide the sizes: ' + Math.abs(p) + ' \\div ' + Math.abs(b) + ' = ' + Math.abs(q) + '.',
       (p > 0) === (b > 0) ? 'Signs match, so the result is positive: **' + q + '**.'
                           : 'Signs differ, so the result is negative: **' + q + '**.']);
  });

  g('integer-word-problems', function (R, d) {
    var kinds = ['temperature', 'bank', 'elevation', 'golf'];
    var k = R.pick(kinds);
    if (k === 'temperature') {
      var start = R.int(-20, 10), drop = R.int(3, 25);
      return num('The temperature is ~' + start + '~ degrees and then falls by ~' + drop + '~ degrees. ' +
        'What is the new temperature?', start - drop,
        ['Falling means subtract: ' + start + ' - ' + drop + '.',
         '**' + (start - drop) + '** degrees.']);
    }
    if (k === 'bank') {
      var bal = R.int(-200, 400), dep = R.int(50, 500);
      return num('An account is at ' + MC.money(bal) + ' and a deposit of ' + MC.money(dep) +
        ' arrives. What is the balance now, in dollars?', bal + dep,
        ['A deposit adds: ' + bal + ' + ' + dep + '.',
         'New balance: **' + MC.money(bal + dep) + '**.',
         bal < 0 ? 'The account started overdrawn, which is what the negative sign records.' :
                   'Keeping the sign explicit is what stops an overdraft looking like a credit.'],
        { unit: 'dollars', tol: 0.005 });
    }
    if (k === 'elevation') {
      var depth = -R.int(20, 300), climb = R.int(30, 500);
      return num('A submarine sits at ~' + depth + '~ m relative to sea level and rises ~' + climb + '~ m. ' +
        'What is its elevation now, in metres?', depth + climb,
        ['Rising adds: ' + depth + ' + ' + climb + '.',
         '**' + (depth + climb) + '** m' + (depth + climb > 0 ? ', which is above sea level.' : ', still below sea level.')]);
    }
    var scores = [];
    for (var i = 0; i < 4; i++) scores.push(R.nonzero(-3, 4));
    var tot = scores.reduce(function (a, b) { return a + b; }, 0);
    return num('A golfer scores ' + scores.map(function (s) { return s > 0 ? '+' + s : s; }).join(', ') +
      ' on four holes. What is the total relative to par?', tot,
      ['Add the signed numbers: ' + scores.join(' + ').replace(/\+ -/g, '- ') + '.',
       'Total: **' + (tot > 0 ? '+' + tot : tot) + '**.']);
  });

  g('exponent-meaning', function (R, d) {
    var b = R.int(2, d === 1 ? 6 : 12), e = R.int(2, d === 1 ? 3 : 5);
    while (b === e) e = R.int(2, d === 1 ? 3 : 5);   /* 2^2 would make the distractors collide */
    if (R.bool(0.3)) {
      var sh = choiceSet(R, '~' + Math.pow(b, e) + '~',
        ['~' + (b * e) + '~', '~' + (b + e) + '~', '~' + Math.pow(e, b) + '~']);
      return mc('What is ~' + b + '^{' + e + '}~?', sh.choices, sh.answer,
        ['The exponent counts how many copies of the base are multiplied, not how many times to multiply by the exponent.',
         '~' + b + '^{' + e + '} = ' + new Array(e).fill(b).join(' \\times ') + ' = ' + Math.pow(b, e) + '~.',
         'The classic error is reading ~' + b + '^{' + e + '}~ as ~' + b + ' \\times ' + e + ' = ' + (b * e) + '~.']);
    }
    var val = Math.pow(b, e);
    return num('~' + b + '^{' + e + '} = ?~', val,
      ['~' + b + '^{' + e + '}~ means ' + e + ' copies of ' + b + ' multiplied together.',
       new Array(e).fill(b).join(' \\times ') + ' = **' + val + '**.']);
  });

  g('perfect-squares-cubes', function (R, d) {
    if (R.bool(0.5)) {
      var n = R.int(2, d === 1 ? 12 : 25);
      return num('~' + n + '^{2} = ?~', n * n,
        [n + ' \\times ' + n + ' = **' + (n * n) + '**.',
         'Squares up to 25 are worth knowing by sight: they turn up constantly in factoring and in the Pythagorean theorem.']);
    }
    var c = R.int(2, d === 1 ? 6 : 10);
    return num('~' + c + '^{3} = ?~', c * c * c,
      [c + ' \\times ' + c + ' = ' + (c * c) + ', then ' + (c * c) + ' \\times ' + c + ' = **' + (c * c * c) + '**.']);
  });

  g('square-roots-exact', function (R, d) {
    if (R.bool(0.6) || d === 1) {
      var n = R.int(2, d === 1 ? 12 : 25);
      return num('~sqrt{' + (n * n) + '} = ?~', n,
        ['Ask which number times itself gives ' + (n * n) + '.',
         n + ' \\times ' + n + ' = ' + (n * n) + ', so ~sqrt{' + (n * n) + '} = **' + n + '**~.',
         'By convention the radical sign means the positive root.']);
    }
    var k = R.int(2, 20);
    var target = R.int(k * k + 1, (k + 1) * (k + 1) - 1);
    return multi('~sqrt{' + target + '}~ lies between which two consecutive whole numbers?',
      [{ label: 'Lower', answer: k }, { label: 'Upper', answer: k + 1 }],
      [k + '^{2} = ' + (k * k) + ' and ' + (k + 1) + '^{2} = ' + ((k + 1) * (k + 1)) + '.',
       'Since ' + (k * k) + ' < ' + target + ' < ' + ((k + 1) * (k + 1)) + ', the root is between **' + k +
         '** and **' + (k + 1) + '**.',
       'To one decimal place it is about ' + MC.fmt(Math.sqrt(target), 1) + '.']);
  });

  g('powers-of-ten', function (R, d) {
    var e = R.int(1, d === 1 ? 3 : 6);
    var neg = d > 1 && R.bool(0.4);
    var a = R.int(2, 99);
    if (neg) {
      var val = a / Math.pow(10, e);
      return num('~' + a + ' \\times 10^{-' + e + '} = ?~', val,
        ['A negative exponent on ten means divide by that power of ten.',
         a + ' \\div ' + MC.commas(Math.pow(10, e)) + ' = **' + MC.fmt(val, 8) + '**.'], { tol: 1e-9 });
    }
    return num('~' + a + ' \\times 10^{' + e + '} = ?~', a * Math.pow(10, e),
      ['~10^{' + e + '} = ' + MC.commas(Math.pow(10, e)) + '~.',
       a + ' \\times ' + MC.commas(Math.pow(10, e)) + ' = **' + MC.commas(a * Math.pow(10, e)) + '**.']);
  });

  g('one-step-words', function (R, d) {
    var name = R.pick(NAMES), item = R.pick(ITEMS);
    var kinds = ['add', 'sub', 'mult', 'div'];
    var k = R.pick(kinds);
    if (k === 'add') {
      var a = R.int(d === 1 ? 10 : 120, d === 1 ? 90 : 9000), b = R.int(d === 1 ? 10 : 120, d === 1 ? 90 : 9000);
      return num(name + ' has ' + MC.commas(a) + ' ' + item + ' and is given ' + MC.commas(b) +
        ' more. How many now?', a + b,
        ['"Given more" means the total grows, so add.',
         MC.commas(a) + ' + ' + MC.commas(b) + ' = **' + MC.commas(a + b) + '**.']);
    }
    if (k === 'sub') {
      var c = R.int(d === 1 ? 20 : 500, d === 1 ? 99 : 9000), e2 = R.int(5, c - 1);
      return num(name + ' has ' + MC.commas(c) + ' ' + item + ' and gives away ' + MC.commas(e2) +
        '. How many are left?', c - e2,
        ['"Gives away" and "left" both point to subtraction.',
         MC.commas(c) + ' - ' + MC.commas(e2) + ' = **' + MC.commas(c - e2) + '**.']);
    }
    if (k === 'mult') {
      var g2 = R.int(3, d === 1 ? 9 : 40), per = R.int(3, d === 1 ? 12 : 60);
      return num(name + ' buys ' + g2 + ' packs with ' + per + ' ' + item + ' in each. How many altogether?', g2 * per,
        ['Equal groups means multiply.',
         g2 + ' \\times ' + per + ' = **' + MC.commas(g2 * per) + '**.']);
    }
    var per2 = R.int(3, 12), groups = R.int(3, d === 1 ? 9 : 40);
    return num(name + ' shares ' + (per2 * groups) + ' ' + item + ' equally between ' + groups +
      ' friends. How many each?', per2,
      ['Equal sharing means divide.',
       (per2 * groups) + ' \\div ' + groups + ' = **' + per2 + '**.']);
  });

  g('multi-step-words', function (R, d) {
    var name = R.pick(NAMES);
    var kinds = ['shopping', 'travel', 'wages'];
    var k = R.pick(kinds);
    if (k === 'shopping') {
      var n1 = R.int(2, 9), p1 = R.int(2, 25), n2 = R.int(2, 9), p2 = R.int(2, 25);
      var paid = Math.ceil((n1 * p1 + n2 * p2) / 10) * 10 + R.pick([0, 10, 20]);
      return num(name + ' buys ' + n1 + ' items at ' + MC.money(p1) + ' each and ' + n2 + ' items at ' +
        MC.money(p2) + ' each, paying with ' + MC.money(paid) + '. How much change, in dollars?',
        paid - (n1 * p1 + n2 * p2),
        ['First group: ' + n1 + ' \\times ' + p1 + ' = ' + MC.money(n1 * p1) + '.',
         'Second group: ' + n2 + ' \\times ' + p2 + ' = ' + MC.money(n2 * p2) + '.',
         'Total spent: ' + MC.money(n1 * p1 + n2 * p2) + '.',
         'Change: ' + MC.money(paid) + ' - ' + MC.money(n1 * p1 + n2 * p2) + ' = **' +
           MC.money(paid - n1 * p1 - n2 * p2) + '**.'],
        { unit: 'dollars', tol: 0.005 });
    }
    if (k === 'travel') {
      var speed = R.int(40, 90), h1 = R.int(2, 5), extra = R.int(20, 200);
      return num('A van drives at ' + speed + ' km/h for ' + h1 + ' hours, then a further ' + extra +
        ' km. How far in total, in km?', speed * h1 + extra,
        ['First leg: ' + speed + ' \\times ' + h1 + ' = ' + (speed * h1) + ' km.',
         'Add the second leg: ' + (speed * h1) + ' + ' + extra + ' = **' + (speed * h1 + extra) + '** km.']);
    }
    var rate = R.int(14, 40), hours = R.int(20, 45), deduct = R.int(50, 400);
    return num(name + ' earns ' + MC.money(rate) + ' per hour for ' + hours + ' hours, then ' +
      MC.money(deduct) + ' is deducted. What is the take-home pay, in dollars?', rate * hours - deduct,
      ['Gross pay: ' + rate + ' \\times ' + hours + ' = ' + MC.money(rate * hours) + '.',
       'Subtract the deduction: ' + MC.money(rate * hours) + ' - ' + MC.money(deduct) + ' = **' +
         MC.money(rate * hours - deduct) + '**.'],
      { unit: 'dollars', tol: 0.005 });
  });

  g('reasonableness', function (R, d) {
    var a = R.int(18, 49), b = R.int(18, 49);
    var right = a * b;
    var wrongs = [right * 10, Math.round(right / 10), right + R.int(100, 400)];
    var all = [right].concat(wrongs).map(function (v) { return '~' + MC.commas(v) + '~'; });
    var sh = shuffleChoices(R, all, 0);
    return mc('Without calculating exactly: which of these is the only reasonable value for ~' + a +
      ' \\times ' + b + '~?', sh.choices, sh.answer,
      ['Round to friendly numbers: about ' + Math.round(a / 10) * 10 + ' \\times ' + Math.round(b / 10) * 10 +
        ' = ' + (Math.round(a / 10) * 10 * Math.round(b / 10) * 10) + '.',
       'Only **' + MC.commas(right) + '** is anywhere near that size.',
       'An estimate will not give you the answer, but it reliably tells you which answers are impossible.']);
  });

  /* =====================================================================
     LEVEL 2 — FRACTIONS, DECIMALS, PERCENTS
     ===================================================================== */

  function fracStr(f) { return f.d === 1 ? String(f.n) : '\\f{' + f.n + '}{' + f.d + '}'; }

  g('fraction-meaning', function (R, d) {
    var den = R.int(2, d === 1 ? 8 : 12), nm = R.int(1, den - 1);
    var mode = R.pick(['shaded', 'division', 'line']);
    if (mode === 'division') {
      return num('A fraction is also a division. What is ~' + fracStr(F(nm, den)) + '~ as a decimal? ' +
        'Round to 3 decimal places if it does not stop.', nm / den,
        ['~' + fracStr(F(nm, den)) + '~ means ' + nm + ' \\div ' + den + '.',
         nm + ' \\div ' + den + ' = **' + MC.fmt(nm / den, 3) + '**.',
         'Reading the bar as "divide" is the single most useful habit with fractions.'], { tol: 0.0006 });
    }
    if (mode === 'line') {
      var total = den, k = nm;
      return frac('A number line from ~0~ to ~1~ is cut into ~' + total + '~ equal pieces. ' +
        'What fraction is the ' + MC.ordinal(k) + ' mark?', F(k, total),
        ['Each piece is ~' + fracStr(F(1, total)) + '~ of the whole.',
         'The ' + MC.ordinal(k) + ' mark is ' + k + ' pieces along: ~' + fracStr(F(k, total)) + '~' +
           (MC.gcd(k, total) > 1 ? ', which reduces to ~' + fracStr(F(k, total)) + '~.' : '.'),
         'Answer: **' + Frac.str(F(k, total)) + '**.']);
    }
    var parts = den, shaded = nm;
    return frac('A shape is divided into ~' + parts + '~ equal parts and ~' + shaded +
      '~ of them are shaded. What fraction is shaded? Give it in lowest terms.', F(shaded, parts),
      ['The denominator counts the equal parts (' + parts + '); the numerator counts the shaded ones (' + shaded + ').',
       'That is ~' + fracStr(F(shaded, parts)) + '~' +
         (MC.gcd(shaded, parts) > 1 ? ', and dividing both by ' + MC.gcd(shaded, parts) + ' gives ' : ', which is already lowest terms: ') +
         '**' + Frac.str(F(shaded, parts)) + '**.',
       'The parts must be equal for the fraction to mean anything.']);
  });

  g('equivalent-fractions', function (R, d) {
    var den = R.int(2, 9), nm = R.int(1, den - 1), k = R.int(2, d === 1 ? 5 : 12);
    if (R.bool(0.5)) {
      return num('Fill in the missing number: ~\\f{' + nm + '}{' + den + '} = \\f{\\square}{' + (den * k) + '}~', nm * k,
        ['The denominator was multiplied by ' + k + ' (' + den + ' \\to ' + (den * k) + ').',
         'Do the same to the top: ' + nm + ' \\times ' + k + ' = **' + (nm * k) + '**.',
         'Multiplying top and bottom by the same number is multiplying by ~\\f{' + k + '}{' + k + '} = 1~, which cannot change the value.']);
    }
    return num('Fill in the missing number: ~\\f{' + (nm * k) + '}{' + (den * k) + '} = \\f{' + nm + '}{\\square}~', den,
      ['Going from ' + (nm * k) + ' down to ' + nm + ' means dividing the top by ' + k + '.',
       'So divide the bottom by ' + k + ' too: ' + (den * k) + ' \\div ' + k + ' = **' + den + '**.']);
  });

  g('simplify-fractions', function (R, d) {
    var base = F(R.int(1, 11), R.int(2, 12));
    while (base.n === 0 || base.n === base.d) base = F(R.int(1, 11), R.int(2, 12));
    var k = R.int(2, d === 1 ? 4 : 9);
    var n = base.n * k, den = base.d * k;
    return frac('Write ~\\f{' + n + '}{' + den + '}~ in lowest terms.', base,
      ['The greatest common factor of ' + n + ' and ' + den + ' is ' + MC.gcd(n, den) + '.',
       'Divide both by ' + MC.gcd(n, den) + ': ~\\f{' + n + ' \\div ' + MC.gcd(n, den) + '}{' + den +
         ' \\div ' + MC.gcd(n, den) + '} = ~ **' + Frac.str(base) + '**.',
       'Dividing by the GCF finishes the job in one step; dividing by any smaller common factor means going round again.']);
  });

  g('improper-mixed', function (R, d) {
    var den = R.int(2, d === 1 ? 6 : 12), whole = R.int(1, d === 1 ? 4 : 9), rem = R.int(1, den - 1);
    var improper = whole * den + rem;
    if (R.bool(0.5)) {
      return { prompt: 'Write ~\\f{' + improper + '}{' + den + '}~ as a mixed number, like `2 3/4`.',
        kind: 'text', answer: whole + ' ' + rem + '/' + den, normaliseTime: false,
        answerAlt: [whole + ' ' + rem + ' / ' + den],
        solution: ['Divide: ' + improper + ' \\div ' + den + ' = ' + whole + ' remainder ' + rem + '.',
          'The quotient is the whole part and the remainder stays over the same denominator: **' +
            whole + ' ' + rem + '/' + den + '**.'] };
    }
    return frac('Write ~' + whole + '\;\\f{' + rem + '}{' + den + '}~ as an improper fraction.', F(improper, den),
      ['The ' + whole + ' whole' + (whole > 1 ? 's' : '') + ' is ' + whole + ' \\times ' + den + ' = ' + (whole * den) +
        ' ' + den + 'ths.',
       'Add the extra ' + rem + ': ' + (whole * den) + ' + ' + rem + ' = ' + improper + ' over ' + den + '.',
       'Answer: **' + improper + '/' + den + '**.']);
  });

  g('compare-fractions', function (R, d) {
    var a = F(R.int(1, 9), R.int(2, 12)), b = F(R.int(1, 9), R.int(2, 12));
    while (Frac.eq(a, b) || a.n >= a.d || b.n >= b.d) {
      a = F(R.int(1, 9), R.int(2, 12)); b = F(R.int(1, 9), R.int(2, 12));
    }
    var bigger = Frac.cmp(a, b) > 0 ? a : b;
    var sh = shuffleChoices(R, ['~' + fracStr(a) + '~', '~' + fracStr(b) + '~'], Frac.cmp(a, b) > 0 ? 0 : 1);
    var l = MC.lcm(a.d, b.d);
    return mc('Which fraction is larger?', sh.choices, sh.answer,
      ['Rewrite both over a common denominator of ' + l + ': ~' + fracStr(a) + ' = \\f{' + (a.n * l / a.d) + '}{' + l +
        '}~ and ~' + fracStr(b) + ' = \\f{' + (b.n * l / b.d) + '}{' + l + '}~.',
       'Comparing numerators, **' + Frac.str(bigger) + '** is larger.',
       'Cross-multiplying is the same test done faster: ' + a.n + '\\times' + b.d + ' = ' + (a.n * b.d) +
         ' against ' + b.n + '\\times' + a.d + ' = ' + (b.n * a.d) + '.']);
  });

  g('add-sub-like', function (R, d) {
    var den = R.int(3, d === 1 ? 10 : 20);
    var a = R.int(1, den - 1), b = R.int(1, den - 1);
    var sub = R.bool(0.4);
    if (sub && b > a) { var t = a; a = b; b = t; }
    var res = sub ? F(a - b, den) : F(a + b, den);
    return frac('~\\f{' + a + '}{' + den + '} ' + (sub ? '-' : '+') + ' \\f{' + b + '}{' + den + '} = ?~ ' +
      'Give your answer in lowest terms.', res,
      ['The denominators already match, so ' + (sub ? 'subtract' : 'add') + ' the numerators and keep the denominator: ' +
        a + ' ' + (sub ? '-' : '+') + ' ' + b + ' = ' + (sub ? a - b : a + b) + '.',
       '~\\f{' + (sub ? a - b : a + b) + '}{' + den + '}~' +
         (MC.gcd(sub ? a - b : a + b, den) > 1 ? ' reduces to ' : ' is already in lowest terms: ') +
         '**' + Frac.str(res) + '**.',
       'The denominator names the size of the pieces. Adding pieces of the same size does not change their size.']);
  });

  g('add-sub-unlike', function (R, d) {
    var d1 = R.int(2, d === 1 ? 6 : 12), d2 = R.int(2, d === 1 ? 6 : 12);
    while (d2 === d1) d2 = R.int(2, d === 1 ? 6 : 12);
    var n1 = R.int(1, d1 - 1), n2 = R.int(1, d2 - 1);
    var a = F(n1, d1), b = F(n2, d2);
    var sub = R.bool(0.45);
    if (sub && Frac.cmp(a, b) < 0) { var t = a; a = b; b = t; }
    var res = sub ? Frac.sub(a, b) : Frac.add(a, b);
    var l = MC.lcm(a.d, b.d);
    return frac('~' + fracStr(a) + ' ' + (sub ? '-' : '+') + ' ' + fracStr(b) + ' = ?~ Give your answer in lowest terms.', res,
      ['The least common denominator of ' + a.d + ' and ' + b.d + ' is ' + l + '.',
       'Rewrite both: ~' + fracStr(a) + ' = \\f{' + (a.n * l / a.d) + '}{' + l + '}~ and ~' + fracStr(b) +
         ' = \\f{' + (b.n * l / b.d) + '}{' + l + '}~.',
       (sub ? 'Subtract' : 'Add') + ' the numerators: ' + (a.n * l / a.d) + ' ' + (sub ? '-' : '+') + ' ' +
         (b.n * l / b.d) + ' = ' + (sub ? a.n * l / a.d - b.n * l / b.d : a.n * l / a.d + b.n * l / b.d) +
         ' over ' + l + '.',
       'In lowest terms: **' + Frac.str(res) + '**.']);
  });

  g('add-sub-mixed', function (R, d) {
    var d1 = R.int(2, 8), d2 = R.int(2, 8);
    while (d2 === d1) d2 = R.int(2, 8);
    var w1 = R.int(1, 6), w2 = R.int(1, 5);
    var a = Frac.add(F(w1), F(R.int(1, d1 - 1), d1));
    var b = Frac.add(F(w2), F(R.int(1, d2 - 1), d2));
    var sub = R.bool(0.5);
    if (sub && Frac.cmp(a, b) < 0) { var t = a; a = b; b = t; }
    var res = sub ? Frac.sub(a, b) : Frac.add(a, b);
    var borrow = sub && (Frac.sub(F(a.n % a.d, a.d), F(b.n % b.d, b.d)).n < 0);
    return { prompt: '~' + Frac.mixed(a) + ' ' + (sub ? '-' : '+') + ' ' + Frac.mixed(b) +
        ' = ?~ Give your answer as a mixed number in lowest terms, like `2 3/4`.',
      kind: 'text', answer: Frac.mixed(res), answerAlt: [Frac.str(res), String(MC.fmt(Frac.val(res), 6))],
      solution: ['Turn both into improper fractions: ~' + Frac.mixed(a) + ' = ' + fracStr(a) + '~ and ~' +
          Frac.mixed(b) + ' = ' + fracStr(b) + '~.',
        'Common denominator ' + MC.lcm(a.d, b.d) + ', then ' + (sub ? 'subtract' : 'add') + ': the result is ~' + fracStr(res) + '~.',
        'As a mixed number: **' + Frac.mixed(res) + '**.',
        borrow ? 'Done in mixed form this one needs a borrow, because the fraction parts alone give a negative. Converting to improper fractions first avoids that entirely.'
               : 'Converting first is slower to write but far harder to get wrong than juggling whole and fraction parts.'] };
  });

  g('mult-fractions', function (R, d) {
    var a = F(R.int(1, 9), R.int(2, 12)), b = F(R.int(1, 9), R.int(2, 12));
    var res = Frac.mul(a, b);
    if (d >= 2 && R.bool(0.35)) {
      var whole = R.int(2, 12) * b.d;
      var r2 = Frac.mul(b, F(whole));
      return num('What is ~' + fracStr(b) + '~ of ~' + whole + '~?', Frac.val(r2),
        ['"Of" means multiply: ~' + fracStr(b) + ' \\times ' + whole + '~.',
         'Divide by ' + b.d + ' then multiply by ' + b.n + ': ' + whole + ' \\div ' + b.d + ' = ' + (whole / b.d) +
           ', and ' + (whole / b.d) + ' \\times ' + b.n + ' = **' + MC.fmt(Frac.val(r2)) + '**.'], { tol: 0.0005 });
    }
    return frac('~' + fracStr(a) + ' \\times ' + fracStr(b) + ' = ?~ Give your answer in lowest terms.', res,
      ['Multiply straight across: ~\\f{' + a.n + ' \\times ' + b.n + '}{' + a.d + ' \\times ' + b.d + '} = \\f{' +
        (a.n * b.n) + '}{' + (a.d * b.d) + '}~.',
       'In lowest terms: **' + Frac.str(res) + '**.',
       'Cancelling common factors before multiplying keeps the numbers small and gives the same answer.']);
  });

  g('div-fractions', function (R, d) {
    var a = F(R.int(1, 9), R.int(2, 10)), b = F(R.int(1, 9), R.int(2, 10));
    var res = Frac.div(a, b);
    return frac('~' + fracStr(a) + ' \\div ' + fracStr(b) + ' = ?~ Give your answer in lowest terms.', res,
      ['Dividing by a fraction is multiplying by its reciprocal: flip ~' + fracStr(b) + '~ to ~\\f{' + b.d + '}{' + b.n + '}~.',
       '~' + fracStr(a) + ' \\times \\f{' + b.d + '}{' + b.n + '} = \\f{' + (a.n * b.d) + '}{' + (a.d * b.n) + '}~.',
       'In lowest terms: **' + Frac.str(res) + '**.',
       'The answer counts how many ~' + fracStr(b) + '~ pieces fit into ~' + fracStr(a) + '~ — which is why dividing by a number below 1 makes the answer bigger.']);
  });

  g('fraction-of-quantity', function (R, d) {
    var den = R.int(2, 9), nm = R.int(1, den - 1);
    var whole = den * R.int(2, d === 1 ? 10 : 40);
    if (R.bool(0.45)) {
      var part = whole * nm / den;
      return num('If ~' + fracStr(F(nm, den)) + '~ of a number is ~' + part + '~, what is the number?', whole,
        ['If ' + nm + ' parts out of ' + den + ' come to ' + part + ', then one part is ' + part + ' \\div ' + nm + ' = ' + (part / nm) + '.',
         'The whole is ' + den + ' parts: ' + (part / nm) + ' \\times ' + den + ' = **' + whole + '**.',
         'Working back to the whole means dividing by the fraction: ' + part + ' \\div ' + fracStr(F(nm, den)) + ' = ' + whole + '.']);
    }
    return num('What is ~' + fracStr(F(nm, den)) + '~ of ~' + whole + '~?', whole * nm / den,
      ['Divide by the denominator: ' + whole + ' \\div ' + den + ' = ' + (whole / den) + '.',
       'Multiply by the numerator: ' + (whole / den) + ' \\times ' + nm + ' = **' + (whole * nm / den) + '**.']);
  });

  g('complex-fractions', function (R, d) {
    var a = F(R.int(1, 7), R.int(2, 9)), b = F(R.int(1, 7), R.int(2, 9));
    var res = Frac.div(a, b);
    return frac('Simplify ~\\f{' + fracStr(a) + '}{' + fracStr(b) + '}~. Give your answer in lowest terms.', res,
      ['A fraction bar means divide, so this is ~' + fracStr(a) + ' \\div ' + fracStr(b) + '~.',
       'Multiply by the reciprocal: ~' + fracStr(a) + ' \\times \\f{' + b.d + '}{' + b.n + '} = \\f{' + (a.n * b.d) +
         '}{' + (a.d * b.n) + '}~.',
       'In lowest terms: **' + Frac.str(res) + '**.']);
  });

  g('decimal-place-value', function (R, d) {
    var places = d === 1 ? 2 : (d === 2 ? 3 : 4);
    var whole = R.int(1, 999);
    var fracDigits = [];
    for (var i = 0; i < places; i++) fracDigits.push(R.int(0, 9));
    if (fracDigits[places - 1] === 0) fracDigits[places - 1] = R.int(1, 9);
    var str = whole + '.' + fracDigits.join('');
    var pos = R.int(0, places - 1);
    var names = ['tenths', 'hundredths', 'thousandths', 'ten-thousandths'];
    var digit = fracDigits[pos];
    var value = digit / Math.pow(10, pos + 1);
    if (R.bool(0.5)) {
      return num('In ~' + str + '~, the digit ~' + digit + '~ is in the ' + names[pos] +
        ' place. What is it worth, as a decimal?', value,
        ['One ' + names[pos].replace(/s~/, '') + ' is ' + (1 / Math.pow(10, pos + 1)) + '.',
         digit + ' of them is **' + MC.fmt(value, 6) + '**.'], { tol: 1e-9 });
    }
    var other = whole + '.' + fracDigits.slice(0, places - 1).join('') + R.int(0, 9);
    var sh = shuffleChoices(R, ['~' + str + '~', '~' + other + '~'], parseFloat(str) >= parseFloat(other) ? 0 : 1);
    if (parseFloat(str) === parseFloat(other)) {
      return num('Write ~' + str + '~ with the digits of its ' + names[pos] + ' place doubled... ' +
        'Actually, simpler: what is ~' + str + '~ rounded to ' + (pos + 1) + ' decimal place' + (pos ? 's' : '') + '?',
        Math.round(parseFloat(str) * Math.pow(10, pos + 1)) / Math.pow(10, pos + 1),
        ['Look at the digit after the ' + names[pos] + ' place.',
         'Rounded: **' + MC.fmt(Math.round(parseFloat(str) * Math.pow(10, pos + 1)) / Math.pow(10, pos + 1), 6) + '**.'],
        { tol: 1e-9 });
    }
    return mc('Which decimal is larger?', sh.choices, sh.answer,
      ['Compare place by place from the left, not by how many digits there are.',
       'A longer decimal is not automatically larger: 0.4 beats 0.3999.',
       '**' + (parseFloat(str) > parseFloat(other) ? str : other) + '** is larger.']);
  });

  g('round-decimals', function (R, d) {
    var places = d === 1 ? 1 : R.int(1, 3);
    /* Build the number digit by digit so the digit that decides the rounding
       always exists and is never 0 — otherwise the question rounds nothing. */
    var whole = R.int(1, 999), digits = [];
    for (var i = 0; i < places; i++) digits.push(R.int(0, 9));
    digits.push(R.int(1, 9));                    /* the deciding digit */
    digits.push(R.int(0, 9));
    var text = whole + '.' + digits.join('');
    var raw = parseFloat(text);
    var p = Math.pow(10, places);
    var rounded = Math.round(raw * p) / p;
    var decider = digits[places];
    return num('Round ~' + text + '~ to ' + places + ' decimal place' + (places > 1 ? 's' : '') + '.',
      rounded,
      ['Keep ' + places + ' digit' + (places > 1 ? 's' : '') + ' after the point and look at the next one.',
       'That digit is ' + decider + ', so round ' + (decider >= 5 ? 'up' : 'down') + '.',
       'Answer: **' + MC.fmt(rounded, 4) + '**.',
       'Only the very next digit decides. ' + (decider < 5 ? 'What follows it cannot push the rounding up.'
         : 'There is no need to look further along.')], { tol: 1e-9 });
  });

  g('add-sub-decimals', function (R, d) {
    var dp = d === 1 ? 1 : 2;
    var a = R.int(10, 9999) / Math.pow(10, dp), b = R.int(10, 9999) / Math.pow(10, dp);
    var sub = R.bool(0.45);
    if (sub && b > a) { var t = a; a = b; b = t; }
    var res = sub ? a - b : a + b;
    res = Math.round(res * Math.pow(10, dp)) / Math.pow(10, dp);
    return num('~' + MC.fmt(a, dp) + ' ' + (sub ? '-' : '+') + ' ' + MC.fmt(b, dp) + ' = ?~', res,
      ['Write them with the decimal points lined up, filling empty places with zeros.',
       'Then ' + (sub ? 'subtract' : 'add') + ' as with whole numbers and bring the point straight down.',
       'Answer: **' + MC.fmt(res, dp + 1) + '**.'], { tol: 1e-9 });
  });

  g('mult-decimals', function (R, d) {
    var ad = d === 1 ? 1 : R.int(1, 2), bd = d === 1 ? 1 : R.int(1, 2);
    var ai = R.int(11, d === 1 ? 99 : 999), bi = R.int(11, 99);
    var a = ai / Math.pow(10, ad), b = bi / Math.pow(10, bd);
    var res = ai * bi / Math.pow(10, ad + bd);
    return num('~' + MC.fmt(a, ad) + ' \\times ' + MC.fmt(b, bd) + ' = ?~', res,
      ['Ignore the points and multiply the whole numbers: ' + ai + ' \\times ' + bi + ' = ' + MC.commas(ai * bi) + '.',
       'Count the decimal places in the question: ' + ad + ' + ' + bd + ' = ' + (ad + bd) + '.',
       'Put ' + (ad + bd) + ' decimal place' + (ad + bd > 1 ? 's' : '') + ' into the answer: **' + MC.fmt(res, 6) + '**.'],
      { tol: 1e-9 });
  });

  g('div-decimals', function (R, d) {
    var q = R.int(2, 99), bd = d === 1 ? 1 : R.int(1, 2);
    var b = R.int(11, 99) / Math.pow(10, bd);
    var a = Math.round(q * b * 1000) / 1000;
    return num('~' + MC.fmt(a, 4) + ' \\div ' + MC.fmt(b, bd) + ' = ?~', q,
      ['Shift both numbers ' + bd + ' place' + (bd > 1 ? 's' : '') + ' right so the divisor becomes the whole number ' +
        Math.round(b * Math.pow(10, bd)) + ': the problem becomes ' + MC.fmt(a * Math.pow(10, bd), 4) + ' \\div ' +
        Math.round(b * Math.pow(10, bd)) + '.',
       'A division is unchanged if both numbers are scaled by the same factor.',
       'Answer: **' + q + '**.'], { tol: 0.0005 });
  });

  g('fraction-decimal-convert', function (R, d) {
    /* A denominator built only from 2s and 5s terminates; anything else repeats. */
    var terminating = d === 1 ? [[1,2],[1,4],[3,4],[1,5],[2,5],[1,10],[3,10],[1,20]]
                              : [[1,8],[3,8],[5,8],[7,8],[1,16],[1,40],[7,20],[9,25],[3,50],[1,32]];
    var repeating = [[1,3],[2,3],[1,6],[5,6],[1,9],[2,9],[1,12],[5,12],[1,7],[1,11]];
    var toDecimal = R.bool(0.5);

    if (toDecimal) {
      var pr = R.pick(d === 1 ? terminating : (R.bool(0.5) ? terminating : repeating));
      var f = F(pr[0], pr[1]);
      var val = Frac.val(f);
      var den = f.d;
      while (den % 2 === 0) den /= 2;
      while (den % 5 === 0) den /= 5;
      var repeats = den !== 1;
      return num('Write ~' + fracStr(f) + '~ as a decimal.' + (repeats ? ' Round to 4 decimal places.' : ''),
        repeats ? Math.round(val * 10000) / 10000 : val,
        ['The bar means divide: ' + f.n + ' \\div ' + f.d + '.',
         repeats ? 'This denominator has a factor other than 2 and 5, so the decimal repeats: ' +
             MC.fmt(val, 8) + '...  To 4 places that is **' + MC.fmt(Math.round(val * 10000) / 10000, 4) + '**.'
           : 'The denominator is built only from 2s and 5s, so it stops exactly: **' + MC.fmt(val, 6) + '**.'],
        { tol: 0.00006 });
    }

    /* decimal -> fraction, always from a terminating decimal so the answer is exact */
    var pr2 = R.pick(terminating);
    var f2 = F(pr2[0], pr2[1]);
    var dec = Frac.val(f2);
    var decStr = MC.fmt(dec, 6);
    var dp = (decStr.split('.')[1] || '').length;
    var scaled = Math.round(dec * Math.pow(10, dp));
    var placeName = ['tenths', 'hundredths', 'thousandths', 'ten-thousandths', 'hundred-thousandths', 'millionths'][dp - 1];
    return frac('Write ~' + decStr + '~ as a fraction in lowest terms.', f2,
      ['Read the last decimal place: ' + decStr + ' is ' + scaled + ' ' + placeName + ', or ~\\f{' + scaled +
        '}{' + Math.pow(10, dp) + '}~.',
       'Reduce by the GCF of ' + MC.gcd(scaled, Math.pow(10, dp)) + ': **' + Frac.str(f2) + '**.',
       'Every terminating decimal is a fraction over a power of ten. That is all a decimal ever was.']);
  });

  g('terminating-repeating', function (R, d) {
    var dens = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 20, 25, 30, 32, 40, 50, 64];
    var den = R.pick(dens), nm = R.int(1, den - 1);
    var f = F(nm, den);
    var red = f.d;
    var test = red;
    while (test % 2 === 0) test /= 2;
    while (test % 5 === 0) test /= 5;
    var terminates = test === 1;
    var sh = shuffleChoices(R, ['It terminates', 'It repeats forever'], terminates ? 0 : 1);
    return mc('Does ~' + fracStr(f) + '~ give a terminating decimal or a repeating one?', sh.choices, sh.answer,
      ['First reduce: ~' + fracStr(f) + '~ in lowest terms has denominator ' + f.d + '.',
       'Strip every factor of 2 and 5 from ' + f.d + ': you are left with ' + test + '.',
       terminates ? 'Nothing else remains, so it **terminates** (' + MC.fmt(Frac.val(f), 6) + ').'
                  : 'A factor of ' + test + ' remains, so it **repeats** (' + MC.fmt(Frac.val(f), 6) + '...).',
       'Our decimals are base ten, and ten factorises as 2 \\times 5. Only denominators built from 2s and 5s can land exactly.']);
  });

  g('percent-meaning', function (R, d) {
    var kinds = ['toDecimal', 'toPercent', 'toFraction'];
    var k = R.pick(kinds);
    if (k === 'toDecimal') {
      var p = R.int(1, 400);
      if (d > 1 && R.bool(0.3)) p = p + 0.5;
      return num('Write ~' + p + '\\%~ as a decimal.', p / 100,
        ['Percent means per hundred, so divide by 100.',
         p + ' \\div 100 = **' + MC.fmt(p / 100, 6) + '**.',
         'Dividing by 100 moves the point two places left.'], { tol: 1e-9 });
    }
    if (k === 'toPercent') {
      var dec = R.int(1, 250) / 100;
      if (d > 1 && R.bool(0.3)) dec = R.int(1, 999) / 1000;
      return num('Write ~' + MC.fmt(dec, 4) + '~ as a percent. Enter just the number.', dec * 100,
        ['Multiply by 100 to convert a decimal to a percent.',
         MC.fmt(dec, 4) + ' \\times 100 = **' + MC.fmt(dec * 100, 4) + '**, so ' + MC.fmt(dec * 100, 4) + '%.'],
        { tol: 1e-7 });
    }
    var pool = [[25, 1, 4], [50, 1, 2], [75, 3, 4], [20, 1, 5], [40, 2, 5], [10, 1, 10], [60, 3, 5],
                [80, 4, 5], [125, 5, 4], [12.5, 1, 8], [37.5, 3, 8], [66.666, 2, 3]];
    var pr = R.pick(pool);
    if (pr[0] === 66.666) {
      return frac('Write ~66\\f{2}{3}\\%~ as a fraction in lowest terms.', F(2, 3),
        ['~66\\f{2}{3}\\% = \\f{200}{3}\\% = \\f{200}{3} \\div 100~.',
         'That is ~\\f{200}{300} = ~ **2/3**.',
         'This one is worth memorising: it turns up constantly in percent problems.']);
    }
    return frac('Write ~' + pr[0] + '\\%~ as a fraction in lowest terms.', F(pr[1], pr[2]),
      ['~' + pr[0] + '\\% = \\f{' + pr[0] + '}{100}~.',
       'Reduced: **' + pr[1] + '/' + pr[2] + '**.']);
  });

  g('percent-of', function (R, d) {
    var p = d === 1 ? R.pick([10, 20, 25, 50, 75]) : R.pick([5, 8, 12, 15, 18, 30, 35, 45, 60, 85, 120, 150]);
    var whole = d === 1 ? R.int(2, 40) * 10 : R.int(20, 2000);
    var val = p * whole / 100;
    return num('What is ~' + p + '\\%~ of ~' + MC.commas(whole) + '~?', val,
      ['10% of ' + MC.commas(whole) + ' is ' + MC.fmt(whole / 10, 4) + ', and 1% is ' + MC.fmt(whole / 100, 4) + '.',
       'Build ' + p + '% from those: ' + p + '% of ' + MC.commas(whole) + ' = ' + MC.fmt(whole / 100, 6) + ' \\times ' + p + '.',
       'Answer: **' + MC.fmt(val, 4) + '**.'], { tol: 0.0005 });
  });

  g('percent-missing', function (R, d) {
    var p = R.pick([5, 10, 12, 15, 20, 25, 30, 40, 50, 60, 75, 80]);
    var whole = R.int(4, 50) * 20;
    var part = p * whole / 100;
    var which = R.int(0, 2);
    if (which === 0) {
      return num('What is ~' + p + '\\%~ of ~' + MC.commas(whole) + '~?', part,
        ['Part = rate \\times whole.',
         (p / 100) + ' \\times ' + whole + ' = **' + MC.fmt(part, 4) + '**.'], { tol: 0.0005 });
    }
    if (which === 1) {
      return num('~' + MC.fmt(part, 4) + '~ is what percent of ~' + MC.commas(whole) + '~? Enter just the number.',
        p,
        ['Rate = part \\div whole.',
         MC.fmt(part, 4) + ' \\div ' + whole + ' = ' + MC.fmt(part / whole, 6) + '.',
         'As a percent: **' + p + '**%.'], { tol: 0.01 });
    }
    return num('~' + MC.fmt(part, 4) + '~ is ~' + p + '\\%~ of what number?', whole,
      ['Whole = part \\div rate.',
       MC.fmt(part, 4) + ' \\div ' + (p / 100) + ' = **' + MC.commas(whole) + '**.',
       'Dividing by a rate below 1 makes the answer larger, which is the check that you divided the right way round.'],
      { tol: 0.01 });
  });

  g('percent-change', function (R, d) {
    var start = R.int(2, 50) * 20;
    var pct = R.pick([5, 10, 12, 15, 20, 25, 30, 40, 50]);
    var up = R.bool();
    var end = Math.round(start * (1 + (up ? 1 : -1) * pct / 100) * 100) / 100;
    if (R.bool(0.5)) {
      return num('A price goes from ' + MC.money(start) + ' to ' + MC.money(end) +
        '. What is the percent ' + (up ? 'increase' : 'decrease') + '? Enter just the number.', pct,
        ['Change = ' + MC.money(Math.abs(end - start)) + '.',
         'Divide by the **original** amount: ' + MC.fmt(Math.abs(end - start), 2) + ' \\div ' + start + ' = ' +
           MC.fmt(Math.abs(end - start) / start, 6) + '.',
         'As a percent: **' + pct + '**%.',
         'Dividing by the new amount instead is the single most common error here.'], { tol: 0.05 });
    }
    return num(MC.money(start) + ' ' + (up ? 'rises' : 'falls') + ' by ~' + pct +
      '\\%~. What is the new amount, in dollars?', end,
      [pct + '% of ' + MC.money(start) + ' is ' + MC.money(start * pct / 100) + '.',
       (up ? 'Add' : 'Subtract') + ' it: **' + MC.money(end) + '**.',
       'Faster: multiply by ' + MC.fmt(1 + (up ? 1 : -1) * pct / 100, 4) + ' in one step.'],
      { unit: 'dollars', tol: 0.005 });
  });

  g('percent-reverse', function (R, d) {
    var pct = R.pick([10, 15, 20, 25, 30, 40]);
    var original = R.int(5, 60) * 20;
    var up = R.bool();
    var factor = 1 + (up ? 1 : -1) * pct / 100;
    var after = Math.round(original * factor * 100) / 100;
    return num('After a ~' + pct + '\\%~ ' + (up ? 'increase' : 'discount') + ', the price is ' + MC.money(after) +
      '. What was the original price, in dollars?', original,
      ['The new price is ' + MC.fmt(factor, 4) + ' times the original, because ' +
        (up ? '100% + ' + pct + '% = ' + (100 + pct) + '%' : '100% - ' + pct + '% = ' + (100 - pct) + '%') + '.',
       'So divide, do not take ' + pct + '% off the new price: ' + MC.fmt(after, 2) + ' \\div ' + MC.fmt(factor, 4) +
         ' = **' + MC.money(original) + '**.',
       'Taking ' + pct + '% off ' + MC.money(after) + ' would give ' +
         MC.money(Math.round(after * (1 - pct / 100) * 100) / 100) + ', which is wrong: the percentage was of the original, not of the new price.'],
      { unit: 'dollars', tol: 0.02 });
  });

  g('percent-traps', function (R, d) {
    var p1 = R.pick([10, 20, 25, 30, 50]), p2 = R.pick([10, 20, 25, 30, 50]);
    var start = R.int(5, 50) * 20;
    var mode = R.pick(['upDown', 'successive']);
    if (mode === 'upDown') {
      var after = start * (1 + p1 / 100) * (1 - p1 / 100);
      after = Math.round(after * 100) / 100;
      return num('A price of ' + MC.money(start) + ' rises by ~' + p1 + '\\%~ and then falls by ~' + p1 +
        '\\%~. What is the final price, in dollars?', after,
        ['After the rise: ' + MC.money(start) + ' \\times ' + MC.fmt(1 + p1 / 100, 2) + ' = ' +
          MC.money(Math.round(start * (1 + p1 / 100) * 100) / 100) + '.',
         'The fall is ' + p1 + '% of that larger amount, not of the original: \\times ' + MC.fmt(1 - p1 / 100, 2) + '.',
         'Final: **' + MC.money(after) + '**, which is *less* than the ' + MC.money(start) + ' you started with.',
         'Percent changes multiply; they do not add. Up ' + p1 + '% then down ' + p1 + '% always loses money.'],
        { unit: 'dollars', tol: 0.02 });
    }
    var after2 = Math.round(start * (1 - p1 / 100) * (1 - p2 / 100) * 100) / 100;
    var naive = Math.round(start * (1 - (p1 + p2) / 100) * 100) / 100;
    return num('A coat costs ' + MC.money(start) + '. It is discounted ~' + p1 + '\\%~, then a further ~' + p2 +
      '\\%~ off the reduced price. What do you pay, in dollars?', after2,
      ['First discount: ' + MC.money(start) + ' \\times ' + MC.fmt(1 - p1 / 100, 2) + ' = ' +
        MC.money(Math.round(start * (1 - p1 / 100) * 100) / 100) + '.',
       'Second discount applies to that: \\times ' + MC.fmt(1 - p2 / 100, 2) + ' = **' + MC.money(after2) + '**.',
       'Adding the discounts to ' + (p1 + p2) + '% would give ' + MC.money(naive) +
         ', which is too low. Successive percentages are never added.'],
      { unit: 'dollars', tol: 0.02 });
  });

  g('discount-tax-tip', function (R, d) {
    var price = R.int(10, 200) + R.pick([0, 0.5, 0.95, 0.99]);
    price = Math.round(price * 100) / 100;
    var mode = R.pick(['tax', 'tip', 'discountThenTax', 'markup']);
    if (mode === 'tax') {
      var rate = R.pick([5, 6, 7, 8.25, 9]);
      var tot = Math.round(price * (1 + rate / 100) * 100) / 100;
      return num('An item costs ' + MC.money(price) + ' before tax. With ~' + rate +
        '\\%~ sales tax, what is the total, in dollars?', tot,
        ['Tax: ' + MC.money(price) + ' \\times ' + MC.fmt(rate / 100, 4) + ' = ' +
          MC.money(Math.round(price * rate) / 100) + '.',
         'Total: **' + MC.money(tot) + '**, or in one step \\times ' + MC.fmt(1 + rate / 100, 4) + '.'],
        { unit: 'dollars', tol: 0.02 });
    }
    if (mode === 'tip') {
      var tip = R.pick([15, 18, 20, 25]);
      var tot2 = Math.round(price * (1 + tip / 100) * 100) / 100;
      return num('A meal costs ' + MC.money(price) + '. You leave a ~' + tip +
        '\\%~ tip. What do you pay in total, in dollars?', tot2,
        ['10% is ' + MC.money(Math.round(price * 10) / 100) + ', so 5% is ' + MC.money(Math.round(price * 5) / 100) + '.',
         tip + '% = ' + MC.money(Math.round(price * tip) / 100) + '.',
         'Total: **' + MC.money(tot2) + '**.'], { unit: 'dollars', tol: 0.02 });
    }
    if (mode === 'markup') {
      var cost = R.int(5, 90), mk = R.pick([20, 25, 40, 50, 60, 100]);
      var sell = Math.round(cost * (1 + mk / 100) * 100) / 100;
      return num('A shop buys an item for ' + MC.money(cost) + ' and marks it up ~' + mk +
        '\\%~. What is the selling price, in dollars?', sell,
        ['Markup is calculated on the cost: ' + MC.money(cost) + ' \\times ' + MC.fmt(mk / 100, 2) + ' = ' +
          MC.money(Math.round(cost * mk) / 100) + '.',
         'Selling price: **' + MC.money(sell) + '**.',
         'Note that a ' + mk + '% markup on cost is *not* a ' + mk + '% profit margin on the selling price.'],
        { unit: 'dollars', tol: 0.02 });
    }
    var disc = R.pick([10, 15, 20, 25, 30]), tx = R.pick([5, 7, 8]);
    var fin = Math.round(price * (1 - disc / 100) * (1 + tx / 100) * 100) / 100;
    return num('A ' + MC.money(price) + ' item is ~' + disc + '\\%~ off, then ~' + tx +
      '\\%~ tax is added. What is the final price, in dollars?', fin,
      ['Discount first: \\times ' + MC.fmt(1 - disc / 100, 2) + ' gives ' +
        MC.money(Math.round(price * (1 - disc / 100) * 100) / 100) + '.',
       'Tax on the discounted price: \\times ' + MC.fmt(1 + tx / 100, 4) + '.',
       'Final: **' + MC.money(fin) + '**.',
       'Tax is charged on what you actually pay, so the discount comes first.'],
      { unit: 'dollars', tol: 0.02 });
  });

  g('ratio-meaning', function (R, d) {
    var k = R.int(2, 9);
    var a = R.int(1, 8), b = R.int(1, 8);
    while (MC.gcd(a, b) !== 1) { a = R.int(1, 8); b = R.int(1, 8); }
    var mode = R.pick(['simplify', 'toFraction', 'scale']);
    if (mode === 'simplify') {
      return { prompt: 'Simplify the ratio ~' + (a * k) + ' : ' + (b * k) + '~. Enter it as `a:b`.',
        kind: 'text', answer: a + ':' + b, answerAlt: [a + ' : ' + b],
        solution: ['Both parts share a factor of ' + MC.gcd(a * k, b * k) + '.',
          'Divide both: **' + a + ':' + b + '**.',
          'A ratio behaves like a fraction — scaling both parts leaves it unchanged.'] };
    }
    if (mode === 'toFraction') {
      return frac('In a group the ratio of cats to dogs is ~' + a + ' : ' + b +
        '~. What fraction of the animals are cats? Give it in lowest terms.', F(a, a + b),
        ['The ratio splits the group into ' + a + ' + ' + b + ' = ' + (a + b) + ' parts.',
         'Cats take ' + a + ' of those ' + (a + b) + ' parts: **' + Frac.str(F(a, a + b)) + '**.',
         'A ratio compares parts to each other; a fraction compares a part to the whole. Mixing them up is the classic ratio error.']);
    }
    var scaled = R.int(2, 12);
    return num('The ratio of flour to sugar is ~' + a + ' : ' + b + '~. If you use ~' + (a * scaled) +
      '~ g of flour, how much sugar do you need, in grams?', b * scaled,
      ['The flour was scaled from ' + a + ' to ' + (a * scaled) + ', a factor of ' + scaled + '.',
       'Scale the sugar by the same factor: ' + b + ' \\times ' + scaled + ' = **' + (b * scaled) + '** g.']);
  });

  g('ratio-share', function (R, d) {
    var a = R.int(1, 7), b = R.int(1, 7);
    var c = d === 3 ? R.int(1, 5) : 0;
    var parts = a + b + c;
    var unit = R.int(3, 40);
    var total = parts * unit;
    var names = R.shuffle(NAMES).slice(0, c ? 3 : 2);
    var ratio = c ? a + ' : ' + b + ' : ' + c : a + ' : ' + b;
    return num(MC.commas(total) + ' is shared between ' + names.join(', ') + ' in the ratio ~' + ratio +
      '~. How much does ' + names[0] + ' get?', a * unit,
      ['Total parts: ' + (c ? a + ' + ' + b + ' + ' + c : a + ' + ' + b) + ' = ' + parts + '.',
       'One part is ' + MC.commas(total) + ' \\div ' + parts + ' = ' + MC.commas(unit) + '.',
       names[0] + ' gets ' + a + ' part' + (a > 1 ? 's' : '') + ': ' + a + ' \\times ' + MC.commas(unit) +
         ' = **' + MC.commas(a * unit) + '**.',
       'Check: the shares add to ' + MC.commas(total) + '.']);
  });

  g('unit-rate', function (R, d) {
    var mode = R.pick(['perOne', 'compare', 'speed']);
    if (mode === 'perOne') {
      var qty = R.int(2, 12), cost = Math.round(qty * (R.int(50, 900) / 100) * 100) / 100;
      return num(qty + ' items cost ' + MC.money(cost) + '. What is the cost per item, in dollars?',
        Math.round(cost / qty * 10000) / 10000,
        ['Per one means divide by the number of items: ' + MC.fmt(cost, 2) + ' \\div ' + qty + '.',
         'Unit price: **' + MC.money(cost / qty) + '** per item.'], { unit: 'dollars', tol: 0.006 });
    }
    if (mode === 'compare') {
      var q1 = R.int(4, 12), c1 = Math.round(q1 * R.int(80, 200)) / 100;
      var q2 = R.int(4, 20), c2 = Math.round(q2 * R.int(80, 200)) / 100;
      var u1 = c1 / q1, u2 = c2 / q2;
      while (Math.abs(u1 - u2) < 0.05) { q2 = R.int(4, 20); c2 = Math.round(q2 * R.int(80, 200)) / 100; u2 = c2 / q2; }
      var sh = shuffleChoices(R, ['Pack A: ' + q1 + ' for ' + MC.money(c1), 'Pack B: ' + q2 + ' for ' + MC.money(c2)],
        u1 < u2 ? 0 : 1);
      return mc('Which pack is better value?', sh.choices, sh.answer,
        ['Pack A: ' + MC.fmt(c1, 2) + ' \\div ' + q1 + ' = ' + MC.money(u1) + ' each.',
         'Pack B: ' + MC.fmt(c2, 2) + ' \\div ' + q2 + ' = ' + MC.money(u2) + ' each.',
         '**' + (u1 < u2 ? 'Pack A' : 'Pack B') + '** is cheaper per item.',
         'Comparing totals tells you nothing; comparing per-unit prices always settles it.']);
    }
    var dist = R.int(2, 60) * 10, hours = R.int(2, 8);
    return num('A car covers ' + MC.commas(dist * hours) + ' km in ' + hours +
      ' hours. What is its average speed, in km per hour?', dist,
      ['Speed is distance per unit time: ' + MC.commas(dist * hours) + ' \\div ' + hours + '.',
       '**' + MC.commas(dist) + '** km/h.',
       'The word "per" is a division sign in words.']);
  });

  g('proportion-solve', function (R, d) {
    var a = R.int(2, 12), b = R.int(2, 12), k = R.int(2, 12);
    var c = a * k, x = b * k;
    var pos = R.int(0, 3);
    var labels = ['a', 'b', 'c', 'd'];
    var vals = [a, b, c, x];
    var unknown = vals[pos];
    var shown = vals.map(function (v, i) { return i === pos ? 'x' : v; });
    return num('Solve for ~x~: ~\\f{' + shown[0] + '}{' + shown[1] + '} = \\f{' + shown[2] + '}{' + shown[3] + '}~',
      unknown,
      ['Cross-multiply: ' + shown[0] + ' \\times ' + shown[3] + ' = ' + shown[1] + ' \\times ' + shown[2] + '.',
       'That gives ' + (pos === 0 || pos === 3 ? 'x \\times ' + (pos === 0 ? vals[3] : vals[0]) : vals[0] + ' \\times ' + vals[3]) +
         ' = ' + (pos === 1 || pos === 2 ? 'x \\times ' + (pos === 1 ? vals[2] : vals[1]) : vals[1] + ' \\times ' + vals[2]) + '.',
       'So ~x = ~ **' + unknown + '**.',
       'Check by looking for the scale factor between the two fractions — here it is ' + k + '.'], { tol: 0.005 });
  });

  g('direct-inverse', function (R, d) {
    var mode = R.pick(['direct', 'inverse', 'identify']);
    if (mode === 'identify') {
      var sets = [
        { s: 'the number of workers and the time to finish a fixed job', ans: 'Inverse' },
        { s: 'hours worked and pay at a fixed hourly rate', ans: 'Direct' },
        { s: 'speed and the time for a fixed journey', ans: 'Inverse' },
        { s: 'litres of petrol bought and the amount paid', ans: 'Direct' },
        { s: 'the number of people sharing a fixed bill and each share', ans: 'Inverse' },
        { s: 'the side of a square and its perimeter', ans: 'Direct' }
      ];
      var st = R.pick(sets);
      var sh = shuffleChoices(R, ['Direct', 'Inverse'], st.ans === 'Direct' ? 0 : 1);
      return mc('Is the relationship between ' + st.s + ' direct or inverse?', sh.choices, sh.answer,
        ['Ask what happens when the first quantity doubles.',
         st.ans === 'Direct' ? 'The second doubles too, so it is **direct**: the ratio stays constant.'
                             : 'The second halves, so it is **inverse**: the product stays constant.',
         'Direct means ~\\f{y}{x}~ is fixed. Inverse means ~xy~ is fixed.']);
    }
    if (mode === 'direct') {
      var rate = R.int(2, 15), x1 = R.int(2, 12), x2 = R.int(2, 20);
      return num('~y~ varies directly with ~x~. When ~x = ' + x1 + '~, ~y = ' + (rate * x1) +
        '~. What is ~y~ when ~x = ' + x2 + '~?', rate * x2,
        ['Direct variation means ~y = kx~ for a fixed ~k~.',
         'Find ~k~: ' + (rate * x1) + ' \\div ' + x1 + ' = ' + rate + '.',
         'Then ~y = ' + rate + ' \\times ' + x2 + ' = ~ **' + (rate * x2) + '**.'], { tol: 0.005 });
    }
    var prod = R.int(2, 12) * R.int(6, 20), x1b = R.pick(MC.divisors(prod).filter(function (v) { return v > 1 && v < prod; }));
    var x2b = R.pick(MC.divisors(prod).filter(function (v) { return v > 1 && v < prod && v !== x1b; }));
    if (x2b === undefined) x2b = x1b;
    return num('~y~ varies inversely with ~x~. When ~x = ' + x1b + '~, ~y = ' + (prod / x1b) +
      '~. What is ~y~ when ~x = ' + x2b + '~?', prod / x2b,
      ['Inverse variation means ~xy = k~ for a fixed ~k~.',
       'Find ~k~: ' + x1b + ' \\times ' + (prod / x1b) + ' = ' + prod + '.',
       'Then ~y = ' + prod + ' \\div ' + x2b + ' = ~ **' + MC.fmt(prod / x2b, 4) + '**.'], { tol: 0.005 });
  });

  g('scale-drawings', function (R, d) {
    var scale = R.pick([2, 5, 10, 20, 25, 50, 100]);
    var mode = R.pick(['length', 'area', 'map']);
    if (mode === 'area') {
      var k = R.int(2, 5), a1 = R.int(2, 12) * R.int(2, 12);
      return num('Two similar rectangles have a scale factor of ~' + k + '~ on their lengths. ' +
        'The smaller has area ~' + a1 + '~ cm². What is the area of the larger, in cm²?', a1 * k * k,
        ['Lengths scale by ' + k + ', so areas scale by ' + k + '^{2} = ' + (k * k) + '.',
         a1 + ' \\times ' + (k * k) + ' = **' + MC.commas(a1 * k * k) + '** cm².',
         'A scale factor of ' + k + ' on length is ' + (k * k) + ' on area and ' + (k * k * k) + ' on volume. This catches people constantly.']);
    }
    if (mode === 'map') {
      var mapCm = R.int(2, 30);
      return num('A map has scale ~1 : ' + MC.commas(scale * 1000) + '~. Two towns are ~' + mapCm +
        '~ cm apart on the map. How far apart are they in real life, in kilometres?',
        mapCm * scale * 1000 / 100000,
        ['1 cm on the map is ' + MC.commas(scale * 1000) + ' cm in reality.',
         mapCm + ' \\times ' + MC.commas(scale * 1000) + ' = ' + MC.commas(mapCm * scale * 1000) + ' cm.',
         'Convert: ' + MC.commas(mapCm * scale * 1000) + ' cm \\div 100000 = **' +
           MC.fmt(mapCm * scale * 1000 / 100000, 4) + '** km.'], { tol: 0.005 });
    }
    var real = R.int(2, 40), f = R.int(2, 8);
    return num('A model is built to a scale of ~1 : ' + f + '~. A part that is ~' + (real * f) +
      '~ cm on the real object measures how many cm on the model?', real,
      ['The model is ' + f + ' times smaller, so divide.',
       (real * f) + ' \\div ' + f + ' = **' + real + '** cm.']);
  });

  g('metric-convert', function (R, d) {
    var chains = [
      { from: 'm', to: 'cm', f: 100 }, { from: 'cm', to: 'mm', f: 10 }, { from: 'km', to: 'm', f: 1000 },
      { from: 'kg', to: 'g', f: 1000 }, { from: 'g', to: 'mg', f: 1000 }, { from: 'L', to: 'mL', f: 1000 },
      { from: 'tonne', to: 'kg', f: 1000 }
    ];
    var c = R.pick(chains);
    var v = d === 1 ? R.int(2, 40) : R.int(2, 9999) / (R.bool(0.5) ? 10 : 1);
    if (R.bool(0.5)) {
      return num('Convert ~' + MC.fmt(v, 4) + '~ ' + c.from + ' to ' + c.to + '.', v * c.f,
        ['1 ' + c.from + ' = ' + MC.commas(c.f) + ' ' + c.to + '.',
         'Going to a smaller unit means more of them, so multiply: ' + MC.fmt(v, 4) + ' \\times ' +
           MC.commas(c.f) + ' = **' + MC.commas(MC.fmt(v * c.f, 4)) + '** ' + c.to + '.'], { tol: 1e-6 });
    }
    var big = v * c.f;
    return num('Convert ~' + MC.commas(MC.fmt(big, 4)) + '~ ' + c.to + ' to ' + c.from + '.', v,
      ['1 ' + c.from + ' = ' + MC.commas(c.f) + ' ' + c.to + '.',
       'Going to a larger unit means fewer of them, so divide: ' + MC.fmt(big, 4) + ' \\div ' +
         MC.commas(c.f) + ' = **' + MC.fmt(v, 4) + '** ' + c.from + '.',
       'If you cannot remember which way, ask whether the answer should be a bigger or smaller number.'], { tol: 1e-6 });
  });

  g('imperial-convert', function (R, d) {
    var chains = [
      { from: 'feet', to: 'inches', f: 12 }, { from: 'yards', to: 'feet', f: 3 },
      { from: 'pounds', to: 'ounces', f: 16 }, { from: 'gallons', to: 'quarts', f: 4 },
      { from: 'quarts', to: 'pints', f: 2 }, { from: 'miles', to: 'feet', f: 5280 },
      { from: 'tons', to: 'pounds', f: 2000 }
    ];
    var c = R.pick(chains);
    var v = R.int(2, d === 1 ? 12 : 40);
    if (R.bool(0.6)) {
      return num('Convert ~' + v + '~ ' + c.from + ' to ' + c.to + '.', v * c.f,
        ['1 ' + c.from.replace(/s~/, '') + ' = ' + MC.commas(c.f) + ' ' + c.to + '.',
         v + ' \\times ' + MC.commas(c.f) + ' = **' + MC.commas(v * c.f) + '** ' + c.to + '.']);
    }
    return multi('Convert ~' + (v * c.f + R.int(1, c.f - 1)) + '~ ' + c.to + ' to ' + c.from + ' and ' + c.to + '.',
      (function () {
        var rem = R.int(1, c.f - 1);
        var total = v * c.f + rem;
        return [{ label: c.from, answer: Math.floor(total / c.f) }, { label: c.to + ' left over', answer: total % c.f }];
      })(),
      ['Divide by ' + c.f + ': the quotient is the number of ' + c.from + ' and the remainder is the leftover ' + c.to + '.',
       'Imperial units do not scale by tens, so each conversion factor has to be known.']);
  });

  g('dimensional-analysis', function (R, d) {
    var mode = R.pick(['speed', 'rate', 'currency']);
    if (mode === 'speed') {
      var kmh = R.int(20, 130);
      return num('Convert ~' + kmh + '~ km/h to metres per second. Round to 2 decimal places.',
        Math.round(kmh * 1000 / 3600 * 100) / 100,
        ['Multiply by fractions equal to 1, chosen so unwanted units cancel:',
         '~' + kmh + '\;\\f{km}{h} \\times \\f{1000\;m}{1\;km} \\times \\f{1\;h}{3600\;s}~ — km and h both cancel.',
         (kmh * 1000) + ' \\div 3600 = **' + MC.fmt(kmh * 1000 / 3600, 2) + '** m/s.',
         'Writing the units into the calculation is what tells you whether to multiply or divide.'], { tol: 0.011 });
    }
    if (mode === 'rate') {
      var perHour = R.int(5, 60), hours = R.int(2, 12);
      return num('A machine makes ~' + perHour + '~ parts per hour. How many parts in ~' + hours +
        '~ hours and ~30~ minutes?', Math.round(perHour * (hours + 0.5) * 100) / 100,
        [hours + ' h 30 min = ' + MC.fmt(hours + 0.5, 1) + ' h.',
         '~' + perHour + '\;\\f{parts}{h} \\times ' + MC.fmt(hours + 0.5, 1) + '\;h = ~ **' +
           MC.fmt(perHour * (hours + 0.5), 2) + '** parts — the hours cancel, leaving parts.'], { tol: 0.011 });
    }
    var rate = R.int(80, 140) / 100, amount = R.int(20, 900);
    return num('If ~1~ euro buys ~' + MC.fmt(rate, 2) + '~ dollars, how many dollars do you get for ~' +
      amount + '~ euros? Round to 2 decimal places.', Math.round(amount * rate * 100) / 100,
      ['~' + amount + '\;euro \\times \\f{' + MC.fmt(rate, 2) + '\;dollars}{1\;euro}~ — euros cancel.',
       'Answer: **' + MC.money(Math.round(amount * rate * 100) / 100) + '**.',
       'Had you divided instead, the units would have come out as euro² per dollar, which is nonsense. The units are the check.'],
      { tol: 0.011 });
  });

  g('area-volume-units', function (R, d) {
    var mode = R.pick(['area', 'volume']);
    if (mode === 'area') {
      var m2 = R.int(2, 40);
      return num('Convert ~' + m2 + '~ m² to cm².', m2 * 10000,
        ['1 m = 100 cm, so 1 m² = ~100 \\times 100 = 10000~ cm².',
         m2 + ' \\times 10000 = **' + MC.commas(m2 * 10000) + '** cm².',
         'The conversion factor gets squared too. Using 100 instead of 10000 is the standard mistake.']);
    }
    var m3 = R.int(2, 20);
    return num('Convert ~' + m3 + '~ m³ to litres. (1 litre = 1000 cm³.)', m3 * 1000,
      ['1 m³ = ~100^{3} = 1{,}000{,}000~ cm³.',
       MC.commas(m3 * 1000000) + ' cm³ \\div 1000 = **' + MC.commas(m3 * 1000) + '** litres.',
       'For volume the factor is cubed: 1 m³ is a million cm³, not a hundred.']);
  });

  g('simple-interest', function (R, d) {
    var P = R.int(5, 100) * 100, r = R.pick([2, 3, 4, 5, 6, 7.5, 8, 10]), t = R.int(1, 10);
    var which = R.int(0, 2);
    var I = P * r / 100 * t;
    if (which === 0) {
      return num('Find the simple interest on ' + MC.money(P) + ' at ~' + r + '\\%~ per year for ~' + t +
        '~ years, in dollars.', Math.round(I * 100) / 100,
        ['~I = Prt~ with ~P = ' + P + '~, ~r = ' + MC.fmt(r / 100, 4) + '~, ~t = ' + t + '~.',
         P + ' \\times ' + MC.fmt(r / 100, 4) + ' \\times ' + t + ' = **' + MC.money(I) + '**.',
         'Simple interest is paid on the original amount only — the interest itself never earns interest.'],
        { unit: 'dollars', tol: 0.02 });
    }
    if (which === 1) {
      return num(MC.money(P) + ' earns ' + MC.money(I) + ' of simple interest over ~' + t +
        '~ years. What is the annual rate, as a percent? Enter just the number.', r,
        ['Rearrange ~I = Prt~ to ~r = \\f{I}{Pt}~.',
         MC.fmt(I, 2) + ' \\div (' + P + ' \\times ' + t + ') = ' + MC.fmt(I / (P * t), 6) + '.',
         'As a percent: **' + MC.fmt(r, 4) + '**%.'], { tol: 0.02 });
    }
    return num('How many years does it take ' + MC.money(P) + ' at ~' + r +
      '\\%~ simple interest to earn ' + MC.money(I) + '? ', t,
      ['Rearrange to ~t = \\f{I}{Pr}~.',
       MC.fmt(I, 2) + ' \\div (' + P + ' \\times ' + MC.fmt(r / 100, 4) + ') = **' + t + '** years.'],
      { tol: 0.02 });
  });

  g('compound-interest-intro', function (R, d) {
    var P = R.int(5, 60) * 100, r = R.pick([3, 4, 5, 6, 8, 10]), t = R.int(2, d === 1 ? 5 : 20);
    var n = d >= 2 ? R.pick([1, 2, 4, 12]) : 1;
    var A = P * Math.pow(1 + r / 100 / n, n * t);
    var simple = P + P * r / 100 * t;
    return num(MC.money(P) + ' is invested at ~' + r + '\\%~ per year, compounded ' +
      (n === 1 ? 'annually' : n === 2 ? 'twice a year' : n === 4 ? 'quarterly' : 'monthly') +
      ', for ~' + t + '~ years. What is it worth, in dollars? Round to the cent.',
      Math.round(A * 100) / 100,
      ['~A = P(1 + \\f{r}{n})^{nt}~ with ~P = ' + P + '~, ~r = ' + MC.fmt(r / 100, 4) + ', n = ' + n + ', t = ' + t + '~.',
       'Each period multiplies by ' + MC.fmt(1 + r / 100 / n, 6) + ', and there are ' + (n * t) + ' periods.',
       P + ' \\times ' + MC.fmt(Math.pow(1 + r / 100 / n, n * t), 6) + ' = **' + MC.money(A) + '**.',
       'Simple interest would have given ' + MC.money(simple) + '. The gap is interest earning interest, and it widens with time.'],
      { unit: 'dollars', tol: 0.05 });
  });

  g('percent-finance-words', function (R, d) {
    var mode = R.pick(['commission', 'margin', 'unitPrice', 'payment']);
    if (mode === 'commission') {
      var sales = R.int(10, 400) * 100, rate = R.pick([2, 3, 5, 7.5, 10]);
      return num('A salesperson earns ~' + rate + '\\%~ commission on ' + MC.money(sales) +
        ' of sales. How much commission, in dollars?', Math.round(sales * rate) / 100,
        ['Commission is a percent of sales: ' + sales + ' \\times ' + MC.fmt(rate / 100, 4) + '.',
         '**' + MC.money(sales * rate / 100) + '**.'], { unit: 'dollars', tol: 0.02 });
    }
    if (mode === 'margin') {
      var cost = R.int(10, 200), sell = cost + R.int(5, 150);
      var margin = (sell - cost) / sell * 100;
      return num('An item costs ' + MC.money(cost) + ' and sells for ' + MC.money(sell) +
        '. What is the profit margin as a percent of the selling price? Round to 1 decimal place.',
        Math.round(margin * 10) / 10,
        ['Profit: ' + MC.money(sell - cost) + '.',
         'Margin divides profit by the **selling price**: ' + (sell - cost) + ' \\div ' + sell + ' = ' +
           MC.fmt((sell - cost) / sell, 5) + '.',
         'That is **' + MC.fmt(margin, 1) + '**%.',
         'Markup divides by cost instead and gives ' + MC.fmt((sell - cost) / cost * 100, 1) +
           '%. Same profit, two different percentages — always check which one is meant.'], { tol: 0.06 });
    }
    if (mode === 'unitPrice') {
      var sizeA = R.int(300, 900), priceA = Math.round(R.int(200, 600)) / 100;
      var sizeB = R.int(900, 2000), priceB = Math.round(R.int(500, 1400)) / 100;
      var ua = priceA / sizeA * 100, ub = priceB / sizeB * 100;
      while (Math.abs(ua - ub) < 0.02) { priceB = Math.round(R.int(500, 1400)) / 100; ub = priceB / sizeB * 100; }
      var sh = shuffleChoices(R, [sizeA + ' g for ' + MC.money(priceA), sizeB + ' g for ' + MC.money(priceB)],
        ua < ub ? 0 : 1);
      return mc('Which is better value?', sh.choices, sh.answer,
        ['Price per 100 g, A: ' + MC.money(ua) + '.',
         'Price per 100 g, B: ' + MC.money(ub) + '.',
         '**' + (ua < ub ? sizeA + ' g for ' + MC.money(priceA) : sizeB + ' g for ' + MC.money(priceB)) + '** is cheaper per gram.']);
    }
    var loan = R.int(5, 40) * 1000, months = R.pick([12, 24, 36, 48, 60]), flat = R.pick([5, 6, 8, 10]);
    var total = loan * (1 + flat / 100 * months / 12);
    return num('A ' + MC.money(loan) + ' loan charges ~' + flat + '\\%~ simple interest per year for ~' +
      months + '~ months. What is the monthly payment, in dollars? Round to the cent.',
      Math.round(total / months * 100) / 100,
      ['Interest: ' + loan + ' \\times ' + MC.fmt(flat / 100, 4) + ' \\times ' + MC.fmt(months / 12, 4) +
        ' = ' + MC.money(total - loan) + '.',
       'Total repayable: ' + MC.money(total) + '.',
       'Divide by ' + months + ' months: **' + MC.money(total / months) + '** per month.'],
      { unit: 'dollars', tol: 0.05 });
  });

  /* =====================================================================
     LEVEL 3 — PRE-ALGEBRA
     ===================================================================== */

  /* render a signed term, e.g. (3, 'x') -> "3x",  (-1,'x') -> "-x" */
  function term(c, v) {
    if (c === 0) return '';
    if (!v) return String(c);
    if (c === 1) return v;
    if (c === -1) return '-' + v;
    return c + v;
  }
  /* join terms into a tidy expression: [[3,'x'],[-4,'']] -> "3x - 4" */
  function poly(parts) {
    var out = '';
    parts.forEach(function (p) {
      var c = p[0], v = p[1] || '';
      if (c === 0) return;
      var t = term(Math.abs(c), v);
      if (!out) out = (c < 0 ? '-' : '') + t;
      else out += (c < 0 ? ' - ' : ' + ') + t;
    });
    return out || '0';
  }

  g('variable-meaning', function (R, d) {
    var sets = [
      { q: 'In ~5n + 3~, what is ~n~?', opts: ['A variable — a number that can change', 'A constant',
          'A coefficient', 'A unit of measurement'], right: 0,
        s: ['A letter standing for a quantity that may take different values is a variable.',
            'The ~5~ in front of it is the coefficient, and the ~3~ is a constant.'] },
      { q: 'In ~5n + 3~, what is the ~3~?', opts: ['A constant', 'A variable', 'A coefficient', 'An exponent'], right: 0,
        s: ['It never changes, whatever ~n~ is, so it is a constant.'] },
      { q: 'In ~7y~, what is the ~7~?', opts: ['The coefficient', 'A constant term', 'An exponent', 'A variable'], right: 0,
        s: ['A number multiplying a variable is called its coefficient.'] },
      { q: 'A shop sells pens at ~p~ dollars each. What does ~4p~ mean?', opts: ['The cost of 4 pens',
          'Four dollars', '4 added to the price', 'The price of a pen called 4'], right: 0,
        s: ['A number written against a letter means multiply.', '~4p~ is 4 lots of the price, so the cost of 4 pens.'] }
    ];
    var st = R.pick(sets);
    var sh = choiceSet(R, st.opts[st.right], st.opts.filter(function (_, i) { return i !== st.right; }));
    return mc(st.q, sh.choices, sh.answer, st.s.concat(['Answer: **' + st.opts[st.right] + '**.']));
  });

  g('translate-expressions', function (R, d) {
    var n = R.int(2, 12);
    var cases = [
      { w: n + ' more than ~x~', a: 'x+' + n },
      { w: n + ' less than ~x~', a: 'x-' + n },
      { w: 'the product of ' + n + ' and ~x~', a: n + '*x' },
      { w: '~x~ divided by ' + n, a: 'x/' + n },
      { w: n + ' divided by ~x~', a: n + '/x' },
      { w: 'twice ~x~, then add ' + n, a: '2*x+' + n },
      { w: n + ' subtracted from ~x~', a: 'x-' + n },
      { w: '~x~ subtracted from ' + n, a: n + '-x' },
      { w: 'the sum of ~x~ and ' + n + ', all doubled', a: '2*(x+' + n + ')' },
      { w: n + ' times the quantity ~x~ plus 1', a: n + '*(x+1)' }
    ];
    var c = R.pick(d === 1 ? cases.slice(0, 5) : cases);
    var tricky = /subtracted from|divided by ~x~|all doubled|the quantity/.test(c.w);
    return expr('Write an algebraic expression for: **' + c.w + '**\n\nUse ~x~ as the variable.', c.a,
      ['Read the phrase slowly and note which quantity comes first in the operation.',
       tricky ? 'This is one of the phrases that reverses the order: "' + c.w.replace(/~/g, '') +
           '" does not translate left to right.'
         : 'Here the wording follows the order of the symbols.',
       'The expression is **' + c.a.replace(/\*/g, '') + '**.']);
  });

  g('evaluate-expressions', function (R, d) {
    var a = R.nonzero(d === 1 ? 1 : -9, 9), b = R.nonzero(d === 1 ? 1 : -9, 9);
    var x = R.nonzero(d === 1 ? 1 : -8, 8);
    var forms = [
      { e: poly([[a, 'x'], [b, '']]), f: function (v) { return a * v + b; }, src: a + '*x+' + b },
      { e: poly([[a, 'x^{2}'], [b, '']]), f: function (v) { return a * v * v + b; }, src: a + '*x^2+' + b },
      { e: a + '(x ' + (b < 0 ? '- ' + Math.abs(b) : '+ ' + b) + ')', f: function (v) { return a * (v + b); },
        src: a + '*(x+' + b + ')' },
      { e: poly([[a, 'x'], [b, 'y']]), f: null, src: a + '*x+' + b + '*y' }
    ];
    var form = R.pick(d === 1 ? forms.slice(0, 2) : forms);
    if (form.f === null) {
      var y = R.nonzero(-8, 8);
      return num('Evaluate ~' + form.e + '~ when ~x = ' + x + '~ and ~y = ' + y + '~.', a * x + b * y,
        ['Substitute both values, keeping brackets around negatives: ' + a + '(' + x + ') + ' + b + '(' + y + ').',
         a + ' \\times ' + x + ' = ' + (a * x) + ' and ' + b + ' \\times ' + y + ' = ' + (b * y) + '.',
         'Add: **' + (a * x + b * y) + '**.']);
    }
    return num('Evaluate ~' + form.e + '~ when ~x = ' + x + '~.', form.f(x),
      ['Replace every ~x~ with (' + x + ') — brackets first, so a negative cannot lose its sign.',
       'Then follow the order of operations.',
       'The value is **' + form.f(x) + '**.']);
  });

  g('terms-coefficients', function (R, d) {
    var a = R.nonzero(-9, 9), b = R.nonzero(-9, 9), c = R.nonzero(-9, 9);
    var e = poly([[a, 'x^{2}'], [b, 'x'], [c, '']]);
    var which = R.int(0, 2);
    if (which === 0) {
      return num('In ~' + e + '~, what is the coefficient of ~x~?', b,
        ['The coefficient of ~x~ is the number multiplying ~x~, with its sign.',
         'That is **' + b + '**.',
         'The sign belongs to the coefficient. Dropping it is the commonest slip in algebra.']);
    }
    if (which === 1) {
      return num('In ~' + e + '~, what is the constant term?', c,
        ['The constant is the term with no variable in it.',
         'Here that is **' + c + '**.']);
    }
    return num('How many terms does ~' + e + '~ have?', 3,
      ['Terms are separated by + and - signs at the top level.',
       '~' + e + '~ splits into ' + poly([[a, 'x^{2}']]) + ', ' + poly([[b, 'x']]) + ' and ' + c + '.',
       'That is **3** terms.']);
  });

  g('commutative-associative', function (R, d) {
    var a = R.int(2, 12), b = R.int(2, 12), c = R.int(2, 12);
    var sets = [
      { q: 'Is ~' + a + ' + ' + b + ' = ' + b + ' + ' + a + '~ always true?', yes: true,
        s: ['Addition is commutative: order does not matter.'] },
      { q: 'Is ~' + a + ' - ' + b + ' = ' + b + ' - ' + a + '~ always true?', yes: false,
        s: ['Subtraction is not commutative: ' + a + ' - ' + b + ' = ' + (a - b) + ' but ' + b + ' - ' + a +
            ' = ' + (b - a) + '.', 'They agree only when the two numbers are equal.'] },
      { q: 'Is ~' + a + ' \\times (' + b + ' \\times ' + c + ') = (' + a + ' \\times ' + b + ') \\times ' + c + '~ always true?',
        yes: true, s: ['Multiplication is associative: the grouping does not matter.'] },
      { q: 'Is ~' + a + ' \\div (' + b + ' \\div ' + c + ') = (' + a + ' \\div ' + b + ') \\div ' + c + '~ always true?',
        yes: false, s: ['Division is not associative. With ' + a + ', ' + b + ', ' + c + ': left side ' +
            MC.fmt(a / (b / c), 4) + ', right side ' + MC.fmt(a / b / c, 4) + '.'] }
    ];
    var st = R.pick(sets);
    var sh = shuffleChoices(R, ['Yes, always', 'No, not always'], st.yes ? 0 : 1);
    return mc(st.q, sh.choices, sh.answer, st.s.concat(['Answer: **' + (st.yes ? 'yes, always' : 'no, not always') + '**.']));
  });

  g('distributive', function (R, d) {
    var a = R.nonzero(d === 1 ? 2 : -9, 9), b = R.nonzero(-9, 9), c = R.nonzero(-9, 9);
    if (R.bool(0.55)) {
      var inner = poly([[b, 'x'], [c, '']]);
      var ans = poly([[a * b, 'x'], [a * c, '']]);
      return expr('Expand: ~' + (a === 1 ? '' : a === -1 ? '-' : a) + '(' + inner + ')~',
        (a * b) + '*x+' + (a * c),
        ['Multiply every term inside the bracket by ' + a + '.',
         a + ' \\times ' + term(b, 'x') + ' = ' + term(a * b, 'x') + ' and ' + a + ' \\times (' + c + ') = ' + (a * c) + '.',
         'So the answer is **' + ans + '**.',
         a < 0 ? 'A negative multiplier flips the sign of every term inside, including the second one.'
               : 'Every term inside gets multiplied — missing the second one is the usual error.']);
    }
    var k = R.int(2, 9);
    var e1 = poly([[k * b, 'x'], [k * c, '']]);
    return expr('Factor out the greatest common factor: ~' + e1 + '~',
      k + '*(' + b + '*x+' + c + ')',
      ['The terms ' + term(k * b, 'x') + ' and ' + (k * c) + ' share a factor of ' + k + '.',
       'Take it outside: ' + k + '(' + poly([[b, 'x'], [c, '']]) + ').',
       'Check by expanding: ' + k + ' \\times ' + term(b, 'x') + ' = ' + term(k * b, 'x') + '. **' +
         k + '(' + poly([[b, 'x'], [c, '']]) + ')**'],
      { requireFactored: true });
  });

  g('like-terms', function (R, d) {
    var a = R.nonzero(-9, 9), b = R.nonzero(-9, 9), c = R.nonzero(-9, 9), e = R.nonzero(-9, 9);
    if (d === 1) {
      var shown = poly([[a, 'x'], [c, ''], [b, 'x'], [e, '']]);
      return expr('Simplify by collecting like terms: ~' + shown + '~', (a + b) + '*x+' + (c + e),
        ['The ~x~ terms combine: ' + term(a, 'x') + ' and ' + term(b, 'x') + ' give ' + term(a + b, 'x') + '.',
         'The constants combine: ' + c + ' and ' + e + ' give ' + (c + e) + '.',
         'Result: **' + poly([[a + b, 'x'], [c + e, '']]) + '**.']);
    }
    var f = R.nonzero(-9, 9);
    var shown2 = poly([[a, 'x^{2}'], [b, 'x'], [c, 'x^{2}'], [e, 'x'], [f, '']]);
    return expr('Simplify: ~' + shown2 + '~', (a + c) + '*x^2+' + (b + e) + '*x+' + f,
      ['Only terms with exactly the same variable part combine.',
       '~x^{2}~ terms: ' + term(a, 'x^{2}') + ' and ' + term(c, 'x^{2}') + ' give ' + term(a + c, 'x^{2}') + '.',
       '~x~ terms: ' + term(b, 'x') + ' and ' + term(e, 'x') + ' give ' + term(b + e, 'x') + '.',
       'Result: **' + poly([[a + c, 'x^{2}'], [b + e, 'x'], [f, '']]) + '**.',
       '~x^{2}~ and ~x~ are not like terms and never combine, however tempting it looks.']);
  });

  g('simplify-expressions', function (R, d) {
    var a = R.nonzero(2, 7), b = R.nonzero(-8, 8), c = R.nonzero(2, 7), e = R.nonzero(-8, 8);
    var sign = R.bool(0.4) ? -1 : 1;
    var coefX = a * 1 + sign * c * 1;
    /* a(x + b) ± c(x + e) */
    var xc = a + sign * c, k = a * b + sign * c * e;
    var shown = a + '(x ' + (b < 0 ? '- ' + Math.abs(b) : '+ ' + b) + ') ' + (sign < 0 ? '-' : '+') + ' ' +
      c + '(x ' + (e < 0 ? '- ' + Math.abs(e) : '+ ' + e) + ')';
    return expr('Simplify fully: ~' + shown + '~', xc + '*x+' + k,
      ['Distribute both brackets: ' + poly([[a, 'x'], [a * b, '']]) + ' and ' + (sign < 0 ? 'minus ' : '') +
        '(' + poly([[c, 'x'], [c * e, '']]) + ').',
       sign < 0 ? 'The minus in front flips both signs of the second bracket: ' + poly([[-c, 'x'], [-c * e, '']]) + '.'
                : 'Now collect like terms.',
       'Collecting: ' + term(xc, 'x') + ' and ' + k + '.',
       'Answer: **' + poly([[xc, 'x'], [k, '']]) + '**.']);
  });

  g('one-step-equations', function (R, d) {
    var x = R.nonzero(d === 1 ? 1 : -12, 12), k = R.nonzero(d === 1 ? 1 : -12, 12);
    var op = R.pick(['add', 'sub', 'mul', 'div']);
    var shown, steps;
    if (op === 'add') {
      shown = 'x + ' + Math.abs(k) + ' = ' + (x + Math.abs(k));
      steps = ['Undo the ~+ ' + Math.abs(k) + '~ by subtracting ' + Math.abs(k) + ' from both sides.',
        'x = ' + (x + Math.abs(k)) + ' - ' + Math.abs(k) + ' = **' + x + '**.'];
    } else if (op === 'sub') {
      shown = 'x - ' + Math.abs(k) + ' = ' + (x - Math.abs(k));
      steps = ['Undo the ~- ' + Math.abs(k) + '~ by adding ' + Math.abs(k) + ' to both sides.',
        'x = ' + (x - Math.abs(k)) + ' + ' + Math.abs(k) + ' = **' + x + '**.'];
    } else if (op === 'mul') {
      var m = R.nonzero(2, 9);
      shown = term(m, 'x') + ' = ' + (m * x);
      steps = ['~' + term(m, 'x') + '~ means ' + m + ' times ~x~, so divide both sides by ' + m + '.',
        'x = ' + (m * x) + ' \\div ' + m + ' = **' + x + '**.'];
    } else {
      var dv = R.nonzero(2, 9);
      shown = '\\f{x}{' + dv + '} = ' + x;
      steps = ['~x~ is divided by ' + dv + ', so multiply both sides by ' + dv + '.',
        'x = ' + x + ' \\times ' + dv + ' = **' + (x * dv) + '**.'];
      return num('Solve for ~x~: ~' + shown + '~', x * dv, steps);
    }
    return num('Solve for ~x~: ~' + shown + '~', x, steps.concat(
      ['Check by substituting: the equation balances.']));
  });

  g('two-step-equations', function (R, d) {
    var a = R.nonzero(2, d === 1 ? 6 : 12), x = R.nonzero(d === 1 ? 1 : -10, 10), b = R.nonzero(-15, 15);
    var rhs = a * x + b;
    var shown = poly([[a, 'x'], [b, '']]) + ' = ' + rhs;
    return num('Solve for ~x~: ~' + shown + '~', x,
      ['Undo the constant first: ' + (b < 0 ? 'add ' + Math.abs(b) : 'subtract ' + b) + ' on both sides, giving ' +
        term(a, 'x') + ' = ' + (rhs - b) + '.',
       'Now divide both sides by ' + a + ': ~x = ' + (rhs - b) + ' \\div ' + a + '~.',
       '~x = ~**' + x + '**.',
       'Work backwards through the order of operations: the thing done last is undone first.']);
  });

  g('multi-step-equations', function (R, d) {
    var a = R.nonzero(2, 8), x = R.nonzero(-9, 9), b = R.nonzero(-9, 9), c = R.nonzero(2, 6);
    /* c(ax + b) = rhs */
    var rhs = c * (a * x + b);
    var shown = c + '(' + poly([[a, 'x'], [b, '']]) + ') = ' + rhs;
    return num('Solve for ~x~: ~' + shown + '~', x,
      ['Divide both sides by ' + c + ' first — it is the cheapest move here: ' + poly([[a, 'x'], [b, '']]) +
        ' = ' + (rhs / c) + '.',
       (b < 0 ? 'Add ' + Math.abs(b) : 'Subtract ' + b) + ': ' + term(a, 'x') + ' = ' + (rhs / c - b) + '.',
       'Divide by ' + a + ': ~x = ~**' + x + '**.',
       'Expanding the bracket first also works and gives the same answer; it is just more arithmetic.']);
  });

  g('variables-both-sides', function (R, d) {
    var a = R.nonzero(2, 9), c = R.nonzero(2, 9);
    while (a === c) c = R.nonzero(2, 9);
    var x = R.nonzero(-10, 10), b = R.nonzero(-12, 12);
    var dd = (a * x + b) - c * x;
    var shown = poly([[a, 'x'], [b, '']]) + ' = ' + poly([[c, 'x'], [dd, '']]);
    return num('Solve for ~x~: ~' + shown + '~', x,
      ['Collect the ~x~ terms on one side: subtract ' + term(c, 'x') + ' from both sides, giving ' +
        term(a - c, 'x') + ' + ' + b + ' = ' + dd + '.',
       'Then ' + (b < 0 ? 'add ' + Math.abs(b) : 'subtract ' + b) + ': ' + term(a - c, 'x') + ' = ' + (dd - b) + '.',
       'Divide by ' + (a - c) + ': ~x = ~**' + x + '**.',
       'Moving the smaller ~x~ coefficient keeps the number positive and reduces sign errors.']);
  });

  g('equations-fractions', function (R, d) {
    var den = R.int(2, 6), den2 = R.int(2, 6);
    while (den2 === den) den2 = R.int(2, 6);
    var l = MC.lcm(den, den2);
    var x = R.nonzero(-9, 9) * l;
    /* x/den + x/den2 = rhs */
    var rhs = x / den + x / den2;
    var shown = '\\f{x}{' + den + '} + \\f{x}{' + den2 + '} = ' + MC.fmt(rhs, 4);
    return num('Solve for ~x~: ~' + shown + '~', x,
      ['Multiply every term by the least common denominator, ' + l + ', to clear the fractions.',
       'That gives ' + (l / den) + 'x + ' + (l / den2) + 'x = ' + MC.fmt(rhs * l, 4) + ', so ' +
         (l / den + l / den2) + 'x = ' + MC.fmt(rhs * l, 4) + '.',
       'Divide: ~x = ~**' + x + '**.',
       'Clearing denominators at the start is almost always faster than carrying fractions through.'],
      { tol: 0.005 });
  });

  g('special-solutions', function (R, d) {
    var a = R.nonzero(2, 8), b = R.nonzero(-9, 9), c = R.nonzero(-9, 9);
    var kind = R.pick(['none', 'all', 'one']);
    var shown, right, why;
    if (kind === 'none') {
      shown = poly([[a, 'x'], [b, '']]) + ' = ' + poly([[a, 'x'], [b + R.nonzero(1, 6), '']]);
      right = 'No solution';
      why = ['Subtract ' + term(a, 'x') + ' from both sides and the ~x~ disappears.',
        'You are left with a false statement — two different constants claimed to be equal.',
        'A contradiction means **no solution**: no value of ~x~ can make it true.'];
    } else if (kind === 'all') {
      shown = poly([[a, 'x'], [b, '']]) + ' = ' + a + '(x ' + (b / a >= 0 ? '+' : '-') + ' ' +
        Math.abs(b / a) + ')';
      if (b % a !== 0) {
        var bb = a * R.nonzero(1, 4);
        shown = poly([[a, 'x'], [bb, '']]) + ' = ' + a + '(x ' + (bb / a >= 0 ? '+ ' + (bb / a) : '- ' + Math.abs(bb / a)) + ')';
      }
      right = 'Every number is a solution';
      why = ['Expand the right-hand side and it becomes identical to the left.',
        'The statement is true whatever ~x~ is — an identity.',
        'So **every number is a solution**.'];
    } else {
      shown = poly([[a, 'x'], [b, '']]) + ' = ' + poly([[a + R.nonzero(1, 4), 'x'], [c, '']]);
      right = 'Exactly one solution';
      why = ['The ~x~ coefficients differ, so the ~x~ terms do not cancel.',
        'You can collect and divide, landing on a single value.',
        'So there is **exactly one solution**.'];
    }
    var sh = choiceSet(R, right, ['No solution', 'Every number is a solution', 'Exactly one solution']
      .filter(function (o) { return o !== right; }));
    return mc('How many solutions does ~' + shown + '~ have?', sh.choices, sh.answer, why);
  });

  g('equation-word-problems', function (R, d) {
    var kinds = ['consecutive', 'perimeter', 'phone', 'splitBill'];
    var k = R.pick(kinds);
    if (k === 'consecutive') {
      var n = R.int(5, 60);
      var count = R.pick([2, 3]);
      var sum = count === 2 ? n + (n + 1) : n + (n + 1) + (n + 2);
      return num('The sum of ' + (count === 2 ? 'two' : 'three') + ' consecutive whole numbers is ' + sum +
        '. What is the smallest of them?', n,
        ['Call the smallest ~x~. The others are ~x + 1~' + (count === 3 ? ' and ~x + 2~' : '') + '.',
         'The equation is ' + (count === 2 ? '~2x + 1 = ' + sum + '~' : '~3x + 3 = ' + sum + '~') + '.',
         'Solving gives ~x = ~**' + n + '**.',
         'Defining the variable in one clear sentence is most of the work in a word problem.']);
    }
    if (k === 'perimeter') {
      var w = R.int(3, 30), extra = R.int(2, 15);
      var per = 2 * w + 2 * (w + extra);
      return num('A rectangle is ' + extra + ' cm longer than it is wide, and its perimeter is ' + per +
        ' cm. How wide is it, in cm?', w,
        ['Let the width be ~x~, so the length is ~x + ' + extra + '~.',
         'Perimeter: ~2x + 2(x + ' + extra + ') = ' + per + '~, which is ~4x + ' + (2 * extra) + ' = ' + per + '~.',
         '~4x = ' + (per - 2 * extra) + '~, so ~x = ~**' + w + '** cm.',
         'Check: width ' + w + ', length ' + (w + extra) + ', perimeter ' + per + '.']);
    }
    if (k === 'phone') {
      var base = R.int(10, 40), rate = R.pick([0.05, 0.1, 0.15, 0.2]), mins = R.int(20, 300);
      var bill = Math.round((base + rate * mins) * 100) / 100;
      return num('A phone plan costs ' + MC.money(base) + ' per month plus ' + MC.money(rate) +
        ' per minute. The bill is ' + MC.money(bill) + '. How many minutes were used?', mins,
        ['Let ~m~ be the minutes: ~' + base + ' + ' + rate + 'm = ' + MC.fmt(bill, 2) + '~.',
         'Subtract the fixed charge: ~' + rate + 'm = ' + MC.fmt(bill - base, 2) + '~.',
         'Divide by ' + rate + ': ~m = ~**' + mins + '** minutes.'], { tol: 0.02 });
    }
    var people = R.int(3, 12), each = R.int(5, 40), tipTotal = R.int(5, 30);
    var total = people * each + tipTotal;
    return num(people + ' people split a bill of ' + MC.money(total) + ' after adding a ' + MC.money(tipTotal) +
      ' tip. How much does each pay before the tip was added, in dollars?', each,
      ['Let ~e~ be each share of the food: ~' + people + 'e + ' + tipTotal + ' = ' + total + '~.',
       'Subtract the tip: ~' + people + 'e = ' + (total - tipTotal) + '~.',
       'Divide by ' + people + ': ~e = ~**' + MC.money(each) + '**.'], { unit: 'dollars', tol: 0.02 });
  });

  g('inequality-meaning', function (R, d) {
    var k = R.nonzero(-12, 12);
    var op = R.pick(['<', '>', '<=', '>=']);
    var words = { '<': 'less than', '>': 'greater than', '<=': 'less than or equal to', '>=': 'greater than or equal to' };
    var closed = op === '<=' || op === '>=';
    if (R.bool(0.5)) {
      var opts = ['An open circle at ' + k + ', shaded ' + (op === '<' || op === '<=' ? 'left' : 'right'),
                  'A closed circle at ' + k + ', shaded ' + (op === '<' || op === '<=' ? 'left' : 'right'),
                  'An open circle at ' + k + ', shaded ' + (op === '<' || op === '<=' ? 'right' : 'left'),
                  'A closed circle at ' + k + ', shaded ' + (op === '<' || op === '<=' ? 'right' : 'left')];
      var rightIdx = closed ? 1 : 0;
      var sh = choiceSet(R, opts[rightIdx], opts.filter(function (_, i) { return i !== rightIdx; }));
      return mc('How is ~x ' + op + ' ' + k + '~ drawn on a number line?', sh.choices, sh.answer,
        ['The circle marks whether ' + k + ' itself counts: ' + (closed ? 'it does, so the circle is filled in.'
          : 'it does not, so the circle is hollow.'),
         'The shading goes toward the values that satisfy the statement, here the ones ' + words[op] + ' ' + k + '.',
         'So: **' + opts[rightIdx].toLowerCase() + '**.']);
    }
    var interval = { '<': '(-\\inf, ' + k + ')', '>': '(' + k + ', \\inf)',
                     '<=': '(-\\inf, ' + k + ']', '>=': '[' + k + ', \\inf)' }[op];
    var optsI = ['(-\\inf, ' + k + ')', '(' + k + ', \\inf)', '(-\\inf, ' + k + ']', '[' + k + ', \\inf)'];
    var sh2 = choiceSet(R, '~' + interval + '~', optsI.filter(function (o) { return o !== interval; })
      .map(function (o) { return '~' + o + '~'; }));
    return mc('Write ~x ' + op + ' ' + k + '~ in interval notation.', sh2.choices, sh2.answer,
      ['A round bracket excludes the endpoint; a square bracket includes it.',
       'A bracket at infinity is always round, because infinity is never reached.',
       'Answer: **' + interval.replace(/\\inf/g, 'infinity') + '**.']);
  });

  g('solve-inequalities', function (R, d) {
    var a = R.nonzero(d === 1 ? 2 : -9, 9);
    while (a === 0 || a === 1) a = R.nonzero(d === 1 ? 2 : -9, 9);
    var x = R.nonzero(-10, 10), b = R.nonzero(-12, 12);
    var rhs = a * x + b;
    var op = R.pick(['<', '>', '<=', '>=']);
    var flipped = { '<': '>', '>': '<', '<=': '>=', '>=': '<=' }[op];
    var finalOp = a < 0 ? flipped : op;
    return multi('Solve ~' + poly([[a, 'x'], [b, '']]) + ' ' + op + ' ' + rhs +
      '~. Give the boundary value and the direction.',
      [{ label: 'Boundary value of x', answer: x },
       { label: 'Direction (type < or > or <= or >=)', kind: 'text', answer: finalOp }],
      [(b < 0 ? 'Add ' + Math.abs(b) : 'Subtract ' + b) + ' on both sides: ' + term(a, 'x') + ' ' + op + ' ' + (rhs - b) + '.',
       'Divide both sides by ' + a + '.',
       a < 0 ? 'Dividing by a negative **reverses** the inequality sign: it becomes ~' + finalOp + '~.'
             : 'Dividing by a positive leaves the sign alone.',
       'Answer: ~x ' + finalOp + ' ' + x + '~.',
       a < 0 ? 'Test a value to be sure. That reversal is the one rule that separates inequalities from equations.'
             : 'Testing one value from your solution set is a cheap check.']);
  });

  g('compound-inequalities', function (R, d) {
    var lo = R.int(-9, 4), hi = lo + R.int(2, 10);
    var a = R.int(2, 6), b = R.nonzero(-9, 9);
    var loB = a * lo + b, hiB = a * hi + b;
    return multi('Solve the compound inequality ~' + loB + ' ' + '\\le ' + poly([[a, 'x'], [b, '']]) +
      ' \\le ' + hiB + '~. Give the lower and upper bounds for ~x~.',
      [{ label: 'Lower bound', answer: lo }, { label: 'Upper bound', answer: hi }],
      ['Whatever you do, do it to all three parts.',
       (b < 0 ? 'Add ' + Math.abs(b) : 'Subtract ' + b) + ' throughout: ' + (loB - b) + ' \\le ' + term(a, 'x') +
         ' \\le ' + (hiB - b) + '.',
       'Divide all three parts by ' + a + ': **' + lo + ' \\le x \\le ' + hi + '**.',
       'This is an "and" statement: ~x~ must satisfy both ends at once, so the solution is the overlap.']);
  });

  g('inequality-words', function (R, d) {
    var n = R.int(5, 80);
    var cases = [
      { w: '~x~ is at least ' + n, a: '>=', s: '"At least" means it can equal ' + n + ' or be more.' },
      { w: '~x~ is at most ' + n, a: '<=', s: '"At most" means it can equal ' + n + ' or be less.' },
      { w: '~x~ is no more than ' + n, a: '<=', s: '"No more than" is the same as at most.' },
      { w: '~x~ is more than ' + n, a: '>', s: '"More than" excludes ' + n + ' itself.' },
      { w: '~x~ exceeds ' + n, a: '>', s: '"Exceeds" means strictly greater.' },
      { w: '~x~ is fewer than ' + n, a: '<', s: '"Fewer than" excludes ' + n + '.' },
      { w: '~x~ is a minimum of ' + n, a: '>=', s: 'A minimum is a floor the value can sit on.' },
      { w: '~x~ cannot exceed ' + n, a: '<=', s: '"Cannot exceed" allows equality.' }
    ];
    var c = R.pick(cases);
    var sh = choiceSet(R, '~x ' + c.a + ' ' + n + '~',
      ['>=', '<=', '>', '<'].filter(function (o) { return o !== c.a; }).map(function (o) { return '~x ' + o + ' ' + n + '~'; }));
    return mc('Write this as an inequality: **' + c.w.replace(/~/g, '') + '**', sh.choices, sh.answer,
      [c.s,
       'The question is always whether the boundary value itself is allowed.',
       'Answer: ~x ' + c.a + ' ' + n + '~.']);
  });

  g('use-formulas', function (R, d) {
    var cases = [
      { f: 'A = lw', q: function () { var l = R.int(3, 30), w = R.int(3, 30);
          return { p: 'A rectangle has length ' + l + ' cm and width ' + w + ' cm. Find its area in cm².',
            a: l * w, s: ['~A = lw = ' + l + ' \\times ' + w + '~.', 'Area = **' + (l * w) + '** cm².'] }; } },
      { f: 'P = 2l + 2w', q: function () { var l = R.int(3, 30), w = R.int(3, 30);
          return { p: 'A rectangle is ' + l + ' cm by ' + w + ' cm. Find its perimeter in cm.',
            a: 2 * l + 2 * w, s: ['~P = 2l + 2w = 2(' + l + ') + 2(' + w + ')~.',
              'Perimeter = **' + (2 * l + 2 * w) + '** cm.'] }; } },
      { f: 'd = rt', q: function () { var r = R.int(20, 110), t = R.int(2, 9);
          return { p: 'A car travels at ' + r + ' km/h for ' + t + ' hours. How far does it go, in km?',
            a: r * t, s: ['~d = rt = ' + r + ' \\times ' + t + '~.', 'Distance = **' + MC.commas(r * t) + '** km.'] }; } },
      { f: 'C = 2\\pi r', q: function () { var r = R.int(2, 20);
          return { p: 'A circle has radius ' + r + ' cm. Find its circumference in cm, to 2 decimal places.',
            a: Math.round(2 * Math.PI * r * 100) / 100, tol: 0.02,
            s: ['~C = 2\\pi r = 2\\pi(' + r + ')~.', 'C = **' + MC.fmt(2 * Math.PI * r, 2) + '** cm.'] }; } },
      { f: 'F = \\f{9}{5}C + 32', q: function () { var c = R.int(-30, 45);
          return { p: 'Convert ' + c + ' degrees Celsius to Fahrenheit.',
            a: Math.round((9 / 5 * c + 32) * 100) / 100, tol: 0.02,
            s: ['~F = \\f{9}{5}C + 32 = \\f{9}{5}(' + c + ') + 32~.',
              '~\\f{9}{5} \\times ' + c + ' = ' + MC.fmt(9 / 5 * c, 2) + '~, then add 32.',
              '**' + MC.fmt(9 / 5 * c + 32, 2) + '** degrees Fahrenheit.'] }; } }
    ];
    var c = R.pick(cases);
    var inst = c.q();
    return num('Using ~' + c.f + '~: ' + inst.p, inst.a, inst.s, { tol: inst.tol });
  });

  g('rearrange-formulas', function (R, d) {
    var cases = [
      { shown: 'A = lw', solveFor: 'l', ans: 'A/w',
        s: ['~l~ is multiplied by ~w~, so divide both sides by ~w~.', '~l = \\f{A}{w}~'] },
      { shown: 'd = rt', solveFor: 't', ans: 'd/r',
        s: ['Divide both sides by ~r~.', '~t = \\f{d}{r}~'] },
      { shown: 'P = 2l + 2w', solveFor: 'w', ans: '(P-2*l)/2',
        s: ['Subtract ~2l~ from both sides: ~P - 2l = 2w~.', 'Divide by 2: ~w = \\f{P - 2l}{2}~'] },
      { shown: 'y = mx + b', solveFor: 'x', ans: '(y-b)/m',
        s: ['Subtract ~b~: ~y - b = mx~.', 'Divide by ~m~: ~x = \\f{y - b}{m}~'] },
      { shown: 'I = Prt', solveFor: 'r', ans: 'I/(P*t)',
        s: ['~r~ is multiplied by both ~P~ and ~t~, so divide by both.', '~r = \\f{I}{Pt}~'] },
      { shown: 'C = 2*pi*r', solveFor: 'r', ans: 'C/(2*pi)',
        s: ['Divide both sides by ~2\\pi~.', '~r = \\f{C}{2\\pi}~'] },
      { shown: 'V = lwh', solveFor: 'h', ans: 'V/(l*w)',
        s: ['Divide both sides by ~lw~.', '~h = \\f{V}{lw}~'] }
    ];
    var c = R.pick(cases);
    return expr('Rearrange ~' + c.shown.replace(/\*/g, '') + '~ to solve for ~' + c.solveFor + '~.', c.ans,
      ['Treat every other letter as if it were a number.'].concat(c.s,
      ['Answer: **' + c.ans.replace(/\*/g, '') + '**. The rules are exactly those for solving a numerical equation.']));
  });

  g('formula-build', function (R, d) {
    var cases = [
      { w: 'A taxi charges a ~' + 4 + '~ dollar flag fall plus ~2~ dollars per kilometre. Write a formula for the cost ~C~ for ~k~ kilometres.',
        a: '4+2*k', s: ['A fixed charge is a constant; a per-unit charge multiplies the variable.', '~C = 4 + 2k~'] },
      { w: 'A gym charges ~30~ dollars to join plus ~15~ dollars a month. Write a formula for the total ~T~ after ~m~ months.',
        a: '30+15*m', s: ['One-off fee plus a monthly rate.', '~T = 30 + 15m~'] },
      { w: 'A tank holds ~500~ litres and drains ~12~ litres per minute. Write a formula for the volume ~V~ left after ~t~ minutes.',
        a: '500-12*t', s: ['Draining reduces the amount, so the rate is subtracted.', '~V = 500 - 12t~'] },
      { w: 'A worker earns ~18~ dollars an hour and gets a ~50~ dollar bonus. Write a formula for pay ~P~ after ~h~ hours.',
        a: '18*h+50', s: ['Hourly rate times hours, plus the fixed bonus.', '~P = 18h + 50~'] }
    ];
    var c = R.pick(cases);
    return expr(c.w.replace(/~/g, ''), c.a, c.s.concat(['Answer: **' + c.a.replace(/\*/g, '') + '**.']));
  });

  g('plot-points', function (R, d) {
    var x = R.nonzero(-9, 9), y = R.nonzero(-9, 9);
    if (R.bool(0.5)) {
      var quad = (x > 0 && y > 0) ? 1 : (x < 0 && y > 0) ? 2 : (x < 0 && y < 0) ? 3 : 4;
      var sh = choiceSet(R, 'Quadrant ' + quad, ['Quadrant 1', 'Quadrant 2', 'Quadrant 3', 'Quadrant 4']
        .filter(function (o) { return o !== 'Quadrant ' + quad; }));
      return mc('Which quadrant contains the point ~(' + x + ', ' + y + ')~?', sh.choices, sh.answer,
        ['The signs decide: ~x~ is ' + (x > 0 ? 'positive' : 'negative') + ' and ~y~ is ' +
          (y > 0 ? 'positive' : 'negative') + '.',
         'Quadrants are numbered anticlockwise from the top right: ~(+,+), (-,+), (-,-), (+,-)~.',
         'So it is in **Quadrant ' + quad + '**.']);
    }
    return multi('A point is ' + Math.abs(x) + ' unit' + (Math.abs(x) === 1 ? '' : 's') + ' to the ' +
      (x > 0 ? 'right' : 'left') + ' of the origin and ' + Math.abs(y) + ' unit' + (Math.abs(y) === 1 ? '' : 's') + ' ' +
      (y > 0 ? 'up' : 'down') + '. Give its coordinates.',
      [{ label: 'x', answer: x }, { label: 'y', answer: y }],
      ['The first coordinate is horizontal: ' + (x > 0 ? 'right is positive' : 'left is negative') + ', so ~x = ' + x + '~.',
       'The second is vertical: ' + (y > 0 ? 'up is positive' : 'down is negative') + ', so ~y = ' + y + '~.',
       'The point is **(' + x + ', ' + y + ')**. Order matters — ~(a, b)~ and ~(b, a)~ are different points.']);
  });

  g('distance-midpoint', function (R, d) {
    var triples = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [7, 24, 25]];
    var t = R.pick(triples);
    var x1 = R.int(-8, 8), y1 = R.int(-8, 8);
    var sx = R.bool() ? 1 : -1, sy = R.bool() ? 1 : -1;
    var x2 = x1 + sx * t[0], y2 = y1 + sy * t[1];
    if (R.bool(0.5)) {
      return num('Find the distance between ~(' + x1 + ', ' + y1 + ')~ and ~(' + x2 + ', ' + y2 + ')~.', t[2],
        ['Horizontal gap: ~' + x2 + ' - (' + x1 + ') = ' + (x2 - x1) + '~. Vertical gap: ~' + y2 + ' - (' + y1 +
          ') = ' + (y2 - y1) + '~.',
         'Distance ~= sqrt{(' + (x2 - x1) + ')^{2} + (' + (y2 - y1) + ')^{2}} = sqrt{' + (t[0] * t[0]) + ' + ' +
           (t[1] * t[1]) + '} = sqrt{' + (t[2] * t[2]) + '}~.',
         'Distance = **' + t[2] + '**.',
         'The distance formula is the Pythagorean theorem written in coordinates.']);
    }
    var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    return multi('Find the midpoint of ~(' + x1 + ', ' + y1 + ')~ and ~(' + x2 + ', ' + y2 + ')~.',
      [{ label: 'x', answer: mx, tol: 0.001 }, { label: 'y', answer: my, tol: 0.001 }],
      ['The midpoint averages each coordinate separately.',
       '~x~: ~(' + x1 + ' + ' + x2 + ') \\div 2 = ' + MC.fmt(mx, 2) + '~.',
       '~y~: ~(' + y1 + ' + ' + y2 + ') \\div 2 = ' + MC.fmt(my, 2) + '~.',
       'Midpoint = **(' + MC.fmt(mx, 2) + ', ' + MC.fmt(my, 2) + ')**.']);
  });

  g('tables-to-graphs', function (R, d) {
    var m = R.nonzero(-5, 5), b = R.nonzero(-9, 9);
    var xs = [0, 1, 2, 3];
    var ys = xs.map(function (x) { return m * x + b; });
    var mode = R.pick(['rate', 'next', 'intercept']);
    if (mode === 'rate') {
      return num('A table shows ~x~ = ' + xs.join(', ') + ' and ~y~ = ' + ys.join(', ') +
        '. How much does ~y~ change each time ~x~ goes up by 1?', m,
        ['Look at consecutive ~y~ values: ' + ys[0] + ' \\to ' + ys[1] + ' is a change of ' + m + '.',
         'The change is the same every step, so the relationship is linear with rate **' + m + '**.',
         'A constant difference means a straight line. A constant *ratio* would mean exponential instead.']);
    }
    if (mode === 'next') {
      return num('A table shows ~x~ = ' + xs.join(', ') + ' and ~y~ = ' + ys.join(', ') +
        '. What is ~y~ when ~x = ' + 6 + '~?', m * 6 + b,
        ['The rate of change is ' + m + ' per step, and at ~x = 0~ the value is ' + b + '.',
         'So ~y = ' + m + 'x + ' + b + '~.',
         'At ~x = 6~: ~' + m + '(6) + ' + b + ' = ~**' + (m * 6 + b) + '**.']);
    }
    return num('A table shows ~x~ = ' + xs.join(', ') + ' and ~y~ = ' + ys.join(', ') +
      '. What is the value of ~y~ when ~x = 0~?', b,
      ['It is the first entry in the table: **' + b + '**.',
       'On a graph this is where the line crosses the vertical axis — the ~y~-intercept.']);
  });

  g('read-graphs', function (R, d) {
    var start = R.int(0, 40), rate = R.int(2, 25), hours = R.int(3, 9);
    var mode = R.pick(['value', 'rate', 'when']);
    var story = 'A tank starts with ' + start + ' litres and a graph shows the volume rising steadily to ' +
      (start + rate * hours) + ' litres after ' + hours + ' hours.';
    if (mode === 'value') {
      var t = R.int(1, hours);
      return num(story + ' How many litres after ' + t + ' hour' + (t > 1 ? 's' : '') + '?', start + rate * t,
        ['Total rise: ' + (rate * hours) + ' litres over ' + hours + ' hours, so ' + rate + ' litres per hour.',
         'After ' + t + ' hour' + (t > 1 ? 's' : '') + ': ' + start + ' + ' + rate + '(' + t + ') = **' +
           (start + rate * t) + '** litres.']);
    }
    if (mode === 'rate') {
      return num(story + ' What is the rate of filling, in litres per hour?', rate,
        ['Rate is the slope: rise divided by run.',
         '(' + (start + rate * hours) + ' - ' + start + ') \\div ' + hours + ' = **' + rate + '** litres per hour.',
         'On any graph of a quantity against time, the steepness *is* the rate.']);
    }
    var target = start + rate * R.int(1, hours);
    return num(story + ' After how many hours does it reach ' + target + ' litres?', (target - start) / rate,
      ['It needs to gain ' + (target - start) + ' litres at ' + rate + ' litres per hour.',
       (target - start) + ' \\div ' + rate + ' = **' + MC.fmt((target - start) / rate, 2) + '** hours.'],
      { tol: 0.005 });
  });

  g('exponent-rules', function (R, d) {
    var a = R.int(2, 9), m = R.int(2, 7), n = R.int(2, 7);
    var kinds = ['product', 'quotient', 'power', 'mixed'];
    var k = R.pick(d === 1 ? ['product', 'quotient'] : kinds);
    if (k === 'product') {
      return num('Simplify ~x^{' + m + '} \\cdot x^{' + n + '}~ and give the exponent of ~x~.', m + n,
        ['~x^{' + m + '}~ is ' + m + ' copies of ~x~ and ~x^{' + n + '}~ is ' + n + ' copies.',
         'Multiplied together that is ' + m + ' + ' + n + ' = ' + (m + n) + ' copies.',
         'So ~x^{' + m + '} \\cdot x^{' + n + '} = x^{' + (m + n) + '}~ — the exponent is **' + (m + n) + '**.',
         'Add the exponents when multiplying. You never multiply them here.']);
    }
    if (k === 'quotient') {
      var big = Math.max(m, n) + R.int(1, 4), small = Math.min(m, n);
      return num('Simplify ~\\f{x^{' + big + '}}{x^{' + small + '}}~ and give the exponent of ~x~.', big - small,
        ['Cancel ' + small + ' copies of ~x~ from top and bottom.',
         big + ' - ' + small + ' = ' + (big - small) + ' copies remain.',
         'The exponent is **' + (big - small) + '**.']);
    }
    if (k === 'power') {
      return num('Simplify ~(x^{' + m + '})^{' + n + '}~ and give the exponent of ~x~.', m * n,
        ['~(x^{' + m + '})^{' + n + '}~ means ' + n + ' copies of ~x^{' + m + '}~.',
         'That is ' + m + ' \\times ' + n + ' = ' + (m * n) + ' copies of ~x~.',
         'The exponent is **' + (m * n) + '**.',
         'A power of a power multiplies the exponents — this is the one case where they multiply.']);
    }
    var p = R.int(2, 5);
    return num('Simplify ~\\f{(x^{' + m + '})^{' + p + '}}{x^{' + n + '}}~ and give the exponent of ~x~.',
      m * p - n,
      ['Inside first: ~(x^{' + m + '})^{' + p + '} = x^{' + (m * p) + '}~.',
       'Then divide: ' + (m * p) + ' - ' + n + ' = ' + (m * p - n) + '.',
       'The exponent is **' + (m * p - n) + '**.' + (m * p - n < 0 ? ' A negative exponent means it belongs on the bottom.' : '')]);
  });

  g('zero-negative-exponents', function (R, d) {
    var a = R.int(2, 9), n = R.int(1, 4);
    var kind = R.pick(['zero', 'negative', 'negFrac']);
    if (kind === 'zero') {
      return num('What is ~' + a + '^{0}~?', 1,
        ['Use the division rule: ~\\f{' + a + '^{' + n + '}}{' + a + '^{' + n + '}} = ' + a + '^{' + n + ' - ' + n + '} = ' + a + '^{0}~.',
         'But any non-zero number divided by itself is 1.',
         'So ~' + a + '^{0} = ~**1**. It is forced by the rules, not an arbitrary convention.']);
    }
    if (kind === 'negative') {
      return num('What is ~' + a + '^{-' + n + '}~? Give your answer as a decimal to 6 places if needed.',
        1 / Math.pow(a, n),
        ['A negative exponent means the reciprocal: ~' + a + '^{-' + n + '} = \\f{1}{' + a + '^{' + n + '}}~.',
         '~' + a + '^{' + n + '} = ' + Math.pow(a, n) + '~, so the answer is ~\\f{1}{' + Math.pow(a, n) + '}~ = **' +
           MC.fmt(1 / Math.pow(a, n), 6) + '**.',
         'Counting down through the powers divides by ' + a + ' each step, and continuing past zero is what produces the reciprocal.'],
        { tol: 1e-7 });
    }
    var sh = choiceSet(R, '~\\f{1}{x^{' + n + '}}~', ['~-x^{' + n + '}~', '~x^{' + n + '}~', '~-\\f{1}{x^{' + n + '}}~']);
    return mc('Which of these equals ~x^{-' + n + '}~?', sh.choices, sh.answer,
      ['A negative exponent has nothing to do with a negative answer.',
       'It means reciprocal: ~x^{-' + n + '} = \\f{1}{x^{' + n + '}}~.',
       'Answer: **1 over x to the ' + n + '**.']);
  });

  g('scientific-notation', function (R, d) {
    var mant = R.int(100, 999) / 100;
    var e = R.int(d === 1 ? 2 : -8, d === 1 ? 6 : 12);
    while (e === 0) e = R.int(-8, 12);
    var val = mant * Math.pow(10, e);
    if (R.bool(0.5)) {
      return num('Write ~' + MC.fmt(mant, 2) + ' \\times 10^{' + e + '}~ as an ordinary number.', val,
        ['A positive exponent moves the point right; a negative one moves it left.',
         'Move the point ' + Math.abs(e) + ' place' + (Math.abs(e) > 1 ? 's' : '') + ' to the ' + (e > 0 ? 'right' : 'left') + '.',
         'Answer: **' + (Math.abs(val) >= 1 ? MC.commas(MC.fmt(val, 10)) : MC.fmt(val, 12)) + '**.'],
        { tol: Math.abs(val) * 1e-9 + 1e-15 });
    }
    return multi('Write ~' + (Math.abs(val) >= 1 ? MC.commas(MC.fmt(val, 10)) : MC.fmt(val, 12)) +
      '~ in scientific notation. Give the number part and the power of ten.',
      [{ label: 'Number part (between 1 and 10)', answer: mant, tol: 0.005 },
       { label: 'Power of ten', answer: e }],
      ['Scientific notation needs exactly one non-zero digit before the point.',
       'Shift the point to get ' + MC.fmt(mant, 2) + ', counting ' + Math.abs(e) + ' place' +
         (Math.abs(e) > 1 ? 's' : '') + '.',
       'Moving the point ' + (e > 0 ? 'left' : 'right') + ' means a ' + (e > 0 ? 'positive' : 'negative') + ' exponent.',
       'Answer: **' + MC.fmt(mant, 2) + ' \\times 10^{' + e + '}**.']);
  });

  g('sci-notation-arithmetic', function (R, d) {
    var m1 = R.int(10, 99) / 10, m2 = R.int(10, 99) / 10;
    var e1 = R.int(-6, 9), e2 = R.int(-6, 9);
    var mul = R.bool();
    var rawM = mul ? m1 * m2 : m1 / m2;
    var rawE = mul ? e1 + e2 : e1 - e2;
    /* normalise */
    var mant = rawM, e = rawE;
    while (Math.abs(mant) >= 10) { mant /= 10; e += 1; }
    while (Math.abs(mant) < 1) { mant *= 10; e -= 1; }
    return multi('Work out ~(' + MC.fmt(m1, 1) + ' \\times 10^{' + e1 + '}) ' + (mul ? '\\times' : '\\div') +
      ' (' + MC.fmt(m2, 1) + ' \\times 10^{' + e2 + '})~ in scientific notation. ' +
      'Give the number part to 3 decimal places and the power of ten.',
      [{ label: 'Number part', answer: Math.round(mant * 1000) / 1000, tol: 0.0015 },
       { label: 'Power of ten', answer: e }],
      ['Handle the number parts and the powers separately.',
       'Number parts: ' + MC.fmt(m1, 1) + ' ' + (mul ? '\\times' : '\\div') + ' ' + MC.fmt(m2, 1) + ' = ' + MC.fmt(rawM, 4) + '.',
       'Powers of ten: ' + (mul ? e1 + ' + ' + e2 : e1 + ' - (' + e2 + ')') + ' = ' + rawE + '.',
       (Math.abs(rawM) >= 10 || Math.abs(rawM) < 1)
         ? 'That number part is outside the range 1 to 10, so shift it and adjust the exponent: **' +
           MC.fmt(mant, 3) + ' \\times 10^{' + e + '}**.'
         : 'It is already between 1 and 10: **' + MC.fmt(mant, 3) + ' \\times 10^{' + e + '}**.']);
  });

  g('radicals-simplify', function (R, d) {
    var outside = R.int(2, d === 1 ? 5 : 9), inside = R.pick([2, 3, 5, 6, 7, 10, 11, 13, 14, 15]);
    var n = outside * outside * inside;
    return multi('Simplify ~sqrt{' + n + '}~ to the form ~a\\,sqrt{b}~. Give ~a~ and ~b~.',
      [{ label: 'a (outside the root)', answer: outside }, { label: 'b (inside the root)', answer: inside }],
      ['Find the largest perfect square that divides ' + n + ': it is ' + (outside * outside) + '.',
       '~sqrt{' + n + '} = sqrt{' + (outside * outside) + ' \\times ' + inside + '} = sqrt{' +
         (outside * outside) + '} \\times sqrt{' + inside + '}~.',
       '~sqrt{' + (outside * outside) + '} = ' + outside + '~, so the answer is **' + outside + 'sqrt{' + inside + '}**.',
       'Pulling out the largest square finishes in one pass; a smaller one means going round again.']);
  });

  g('rational-irrational', function (R, d) {
    var items = [
      { v: '0.75', r: true, why: 'A terminating decimal is a fraction: ~\\f{3}{4}~.' },
      { v: '\\f{7}{9}', r: true, why: 'Any ratio of whole numbers is rational by definition.' },
      { v: 'sqrt{16}', r: true, why: '~sqrt{16} = 4~, a whole number.' },
      { v: 'sqrt{2}', r: false, why: 'The square root of a non-square whole number is irrational.' },
      { v: 'sqrt{50}', r: false, why: '~sqrt{50} = 5sqrt{2}~, and ~sqrt{2}~ is irrational.' },
      { v: '\\pi', r: false, why: '~\\pi~ is irrational — its decimal never terminates and never repeats.' },
      { v: '0.333\\dots\\,(repeating)', r: true, why: 'A repeating decimal is rational: this one is ~\\f{1}{3}~.' },
      { v: '-12', r: true, why: 'Every integer is rational: ~-12 = \\f{-12}{1}~.' },
      { v: '2 + sqrt{3}', r: false, why: 'A rational plus an irrational is always irrational.' },
      { v: 'sqrt{9} + \\f{1}{2}', r: true, why: '~sqrt{9} = 3~, so this is ~3.5~.' }
    ];
    var it = R.pick(items);
    var sh = shuffleChoices(R, ['Rational', 'Irrational'], it.r ? 0 : 1);
    return mc('Is ~' + it.v + '~ rational or irrational?', sh.choices, sh.answer,
      ['Rational means it can be written as a ratio of two whole numbers.',
       it.why,
       'So it is **' + (it.r ? 'rational' : 'irrational') + '**.']);
  });

  g('mean-median-mode', function (R, d) {
    var n = d === 1 ? 5 : R.pick([6, 7, 8]);
    var data = [];
    for (var i = 0; i < n; i++) data.push(R.int(1, 30));
    /* guarantee a unique mode */
    data[0] = data[1];
    var which = R.pick(['mean', 'median', 'mode', 'range']);
    var sorted = data.slice().sort(function (a, b) { return a - b; });
    var sum = data.reduce(function (a, b) { return a + b; }, 0);
    if (which === 'mean') {
      return num('Find the mean of: ' + data.join(', '), sum / n,
        ['Add them: ' + data.join(' + ') + ' = ' + sum + '.',
         'Divide by how many there are: ' + sum + ' \\div ' + n + ' = **' + MC.fmt(sum / n, 4) + '**.'],
        { tol: 0.005 });
    }
    if (which === 'median') {
      var med = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
      return num('Find the median of: ' + data.join(', '), med,
        ['Sort them first: ' + sorted.join(', ') + '.',
         n % 2 ? 'With ' + n + ' values the middle one is the ' + MC.ordinal((n + 1) / 2) + ': **' + med + '**.'
               : 'With ' + n + ' values there are two in the middle, ' + sorted[n / 2 - 1] + ' and ' + sorted[n / 2] +
                 '. Average them: **' + MC.fmt(med, 2) + '**.',
         'Sorting first is not optional — the median of an unsorted list is meaningless.'], { tol: 0.005 });
    }
    if (which === 'mode') {
      var counts = {};
      data.forEach(function (v) { counts[v] = (counts[v] || 0) + 1; });
      var best = null, bestC = 0, tie = false;
      Object.keys(counts).forEach(function (k) {
        if (counts[k] > bestC) { best = +k; bestC = counts[k]; tie = false; }
        else if (counts[k] === bestC) tie = true;
      });
      return num('Find the mode of: ' + data.join(', '), best,
        ['The mode is the value appearing most often.',
         best + ' appears ' + bestC + ' times' + (tie ? ' (tied with another value — a set can have more than one mode)' : '') + '.',
         'Mode = **' + best + '**.']);
    }
    return num('Find the range of: ' + data.join(', '), sorted[n - 1] - sorted[0],
      ['Range is largest minus smallest: ' + sorted[n - 1] + ' - ' + sorted[0] + '.',
       'Range = **' + (sorted[n - 1] - sorted[0]) + '**.',
       'Range uses only two values, so one extreme reading changes it completely.']);
  });

  g('mean-reverse', function (R, d) {
    var n = R.int(4, 7), target = R.int(5, 90);
    var others = [];
    for (var i = 0; i < n - 1; i++) others.push(R.int(1, 100));
    var sumOthers = others.reduce(function (a, b) { return a + b; }, 0);
    var needed = target * n - sumOthers;
    return num('After ' + (n - 1) + ' tests scoring ' + others.join(', ') + ', what must the next score be ' +
      'for the mean of all ' + n + ' to be ' + target + '?', needed,
      ['For a mean of ' + target + ' across ' + n + ' tests, the total must be ' + target + ' \\times ' + n +
        ' = ' + (target * n) + '.',
       'So far the total is ' + sumOthers + '.',
       'The next score must be ' + (target * n) + ' - ' + sumOthers + ' = **' + needed + '**.',
       needed > 100 ? 'That is above 100, so with these scores the target mean is out of reach — a worthwhile check to make.'
         : 'Always reason through the total; the mean itself cannot be averaged in.']);
  });

  g('data-displays', function (R, d) {
    var cats = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    var vals = cats.map(function () { return R.int(2, 40); });
    var mode = R.pick(['largest', 'total', 'difference', 'twoWay']);
    if (mode === 'twoWay') {
      var a = R.int(10, 60), b = R.int(10, 60), c = R.int(10, 60), e = R.int(10, 60);
      var q = R.pick(['rowTotal', 'fractionOf']);
      if (q === 'rowTotal') {
        return num('A two-way table shows: adults who said yes ' + a + ', adults no ' + b + ', children yes ' +
          c + ', children no ' + e + '. How many people said yes altogether?', a + c,
          ['Add the "yes" entries down the column: ' + a + ' + ' + c + '.',
           '**' + (a + c) + '** said yes.']);
      }
      return num('A two-way table shows: adults yes ' + a + ', adults no ' + b + ', children yes ' + c +
        ', children no ' + e + '. Of the adults, what percent said yes? Round to 1 decimal place.',
        Math.round(a / (a + b) * 1000) / 10,
        ['The adults are the row total: ' + a + ' + ' + b + ' = ' + (a + b) + '.',
         'Of those, ' + a + ' said yes: ' + a + ' \\div ' + (a + b) + ' = ' + MC.fmt(a / (a + b), 4) + '.',
         '**' + MC.fmt(a / (a + b) * 100, 1) + '**%.',
         'Read carefully whether a percentage is of the row, the column, or the whole table — they are three different answers.'],
        { tol: 0.06 });
    }
    var text = 'A bar chart shows sales: ' + cats.map(function (c2, i) { return c2 + ' ' + vals[i]; }).join(', ') + '.';
    if (mode === 'largest') {
      var mx = Math.max.apply(null, vals), idx = vals.indexOf(mx);
      var sh = choiceSet(R, cats[idx], cats.filter(function (c3, i) { return i !== idx; }));
      return mc(text + ' Which day had the highest sales?', sh.choices, sh.answer,
        ['Compare the bar heights: the values are ' + vals.join(', ') + '.',
         'The largest is ' + mx + ', on **' + cats[idx] + '**.']);
    }
    if (mode === 'total') {
      var tot = vals.reduce(function (x, y) { return x + y; }, 0);
      return num(text + ' What were the total sales for the week?', tot,
        ['Add every bar: ' + vals.join(' + ') + '.',
         'Total = **' + tot + '**.']);
    }
    var hi = Math.max.apply(null, vals), lo = Math.min.apply(null, vals);
    return num(text + ' What is the difference between the highest and lowest day?', hi - lo,
      ['Highest ' + hi + ', lowest ' + lo + '.',
       hi + ' - ' + lo + ' = **' + (hi - lo) + '**.']);
  });

  g('outliers-spread', function (R, d) {
    var base = [];
    for (var i = 0; i < 6; i++) base.push(R.int(20, 40));
    var outlier = R.bool() ? R.int(150, 400) : R.int(1, 4);
    var data = base.concat([outlier]);
    var mode = R.pick(['identify', 'effect']);
    if (mode === 'identify') {
      var sh = choiceSet(R, String(outlier), base.slice(0, 3).map(String));
      return mc('Which value is the outlier in: ' + data.join(', ') + '?', sh.choices, sh.answer,
        ['Most values sit between ' + Math.min.apply(null, base) + ' and ' + Math.max.apply(null, base) + '.',
         outlier + ' sits far outside that cluster, so it is the outlier.',
         'Answer: **' + outlier + '**.',
         'An outlier is not automatically an error, but it is always worth asking where it came from.']);
    }
    var sorted = data.slice().sort(function (a, b) { return a - b; });
    var meanAll = data.reduce(function (a, b) { return a + b; }, 0) / data.length;
    var meanNo = base.reduce(function (a, b) { return a + b; }, 0) / base.length;
    var medAll = sorted[3];
    var sh2 = shuffleChoices(R, ['The mean', 'The median'], 0);
    return mc('In the data ' + data.join(', ') + ', which is pulled further by the value ' + outlier + '?',
      sh2.choices, sh2.answer,
      ['With the outlier the mean is ' + MC.fmt(meanAll, 2) + '; without it, ' + MC.fmt(meanNo, 2) +
        ' — a shift of ' + MC.fmt(Math.abs(meanAll - meanNo), 2) + '.',
       'The median only cares about position, so it barely moves: it stays at ' + medAll + '.',
       'The **mean** is dragged by extremes. That is why skewed data such as house prices or incomes are usually reported by median.']);
  });

  root.GENERATORS = GEN;
  if (typeof module !== 'undefined' && module.exports) module.exports = GEN;
})(typeof window !== 'undefined' ? window : globalThis);

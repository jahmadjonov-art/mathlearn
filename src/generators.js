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

  /* =====================================================================
     LEVEL 4 — ALGEBRA I
     ===================================================================== */

  /* y = mx + b written tidily, e.g. "y = -2x + 5", "y = x", "y = -3" */
  function lineEq(m, b) {
    if (m === 0) return 'y = ' + b;
    return 'y = ' + poly([[m, 'x'], [b, '']]);
  }
  /* a slope as a tidy string: integer or reduced fraction */
  function slopeStr(rise, run) {
    var f = F(rise, run);
    if (f.d === 1) return String(f.n);
    return (f.n < 0 ? '-' : '') + '\\f{' + Math.abs(f.n) + '}{' + f.d + '}';
  }

  g('function-definition', function (R, d) {
    var mode = R.pick(['table', 'pairs', 'vertical']);
    if (mode === 'table') {
      var isFn = R.bool();
      var xs = R.distinct(4, -5, 5);
      if (!isFn) xs[3] = xs[1];                  /* repeat an input */
      var ys = xs.map(function () { return R.int(-9, 9); });
      if (!isFn && ys[3] === ys[1]) ys[3] = ys[1] + R.nonzero(1, 4);
      var pairs = xs.map(function (x, i) { return '(' + x + ', ' + ys[i] + ')'; }).join(', ');
      var sh = shuffleChoices(R, ['Yes, it is a function', 'No, it is not a function'], isFn ? 0 : 1);
      return mc('Is this a function?\n\n' + pairs, sh.choices, sh.answer,
        ['A function gives each input exactly one output.',
         isFn ? 'Every ~x~ value here appears once, so each input has a single output. It is a function.'
              : 'The input ~' + xs[1] + '~ appears twice with different outputs (' + ys[1] + ' and ' + ys[3] +
                '), so one input has two outputs. It is not a function.',
         'Repeated *outputs* are fine — only repeated inputs with different outputs break it.']);
    }
    if (mode === 'pairs') {
      var same = R.bool();
      var x0 = R.int(-6, 6), y1 = R.int(-8, 8), y2 = same ? y1 : y1 + R.nonzero(1, 5);
      var sh2 = shuffleChoices(R, ['Yes', 'No'], same ? 0 : 1);
      return mc('A relation contains both ~(' + x0 + ', ' + y1 + ')~ and ~(' + x0 + ', ' + y2 +
        ')~. Can it be a function?', sh2.choices, sh2.answer,
        [same ? 'These are the same ordered pair written twice, so nothing is broken — it can still be a function.'
              : 'The same input ~' + x0 + '~ is paired with two different outputs, so no — it cannot be a function.',
         'The test is always: does any single input get more than one output?']);
    }
    var shapes = [
      { s: 'a straight line that is not vertical', fn: true, why: 'Any vertical line crosses it once.' },
      { s: 'a vertical line', fn: false, why: 'A vertical line lies on top of it, meeting it at infinitely many points — one input, endless outputs.' },
      { s: 'a parabola opening upward', fn: true, why: 'Every vertical line crosses it at most once.' },
      { s: 'a circle', fn: false, why: 'A vertical line through the middle crosses it twice, so one input has two outputs.' },
      { s: 'a horizontal line', fn: true, why: 'Every input gives the same single output, which is allowed.' },
      { s: 'a parabola opening to the right', fn: false, why: 'A vertical line crosses it twice.' }
    ];
    var sp = R.pick(shapes);
    var sh3 = shuffleChoices(R, ['It is a function', 'It is not a function'], sp.fn ? 0 : 1);
    return mc('Using the vertical line test: is the graph of ' + sp.s + ' a function?', sh3.choices, sh3.answer,
      ['The vertical line test asks whether any vertical line can cross the graph more than once.',
       sp.why,
       'So it **' + (sp.fn ? 'is' : 'is not') + '** a function.']);
  });

  g('function-notation', function (R, d) {
    var a = R.nonzero(-6, 6), b = R.nonzero(-9, 9);
    var mode = R.pick(d === 1 ? ['evaluate', 'solve'] : ['evaluate', 'solve', 'shifted', 'quadratic']);
    if (mode === 'evaluate') {
      var x = R.nonzero(-7, 7);
      return num('If ~f(x) = ' + poly([[a, 'x'], [b, '']]) + '~, find ~f(' + x + ')~.', a * x + b,
        ['~f(' + x + ')~ means substitute ' + x + ' for ~x~.',
         a + '(' + x + ') ' + (b < 0 ? '- ' + Math.abs(b) : '+ ' + b) + ' = ' + (a * x) +
           (b < 0 ? ' - ' + Math.abs(b) : ' + ' + b) + ' = **' + (a * x + b) + '**.',
         '~f(' + x + ')~ is not ~f~ times ' + x + '. The brackets mean "the value of the function at", not multiplication.']);
    }
    if (mode === 'solve') {
      var target = a * R.nonzero(-6, 6) + b;
      return num('If ~f(x) = ' + poly([[a, 'x'], [b, '']]) + '~, for what ~x~ does ~f(x) = ' + target + '~?',
        (target - b) / a,
        ['Set the rule equal to ' + target + ': ~' + poly([[a, 'x'], [b, '']]) + ' = ' + target + '~.',
         (b < 0 ? 'Add ' + Math.abs(b) : 'Subtract ' + b) + ': ~' + term(a, 'x') + ' = ' + (target - b) + '~.',
         'Divide by ' + a + ': ~x = ~**' + ((target - b) / a) + '**.',
         'Evaluating goes input to output; this question runs it backwards.'], { tol: 0.005 });
    }
    if (mode === 'shifted') {
      var k = R.nonzero(1, 5);
      return expr('If ~f(x) = ' + poly([[a, 'x'], [b, '']]) + '~, write ~f(x + ' + k + ')~ in simplest form.',
        a + '*x+' + (a * k + b),
        ['Replace every ~x~ with ~(x + ' + k + ')~: ~' + a + '(x + ' + k + ')' +
          (b < 0 ? ' - ' + Math.abs(b) : ' + ' + b) + '~.',
         'Distribute: ~' + term(a, 'x') + ' + ' + (a * k) + (b < 0 ? ' - ' + Math.abs(b) : ' + ' + b) + '~.',
         'Collect: **' + poly([[a, 'x'], [a * k + b, '']]) + '**.',
         'The input is whatever sits inside the brackets, however complicated it looks.']);
    }
    var c = R.nonzero(-5, 5), xq = R.nonzero(-5, 5);
    return num('If ~g(x) = x^{2} ' + (c < 0 ? '- ' + Math.abs(c) : '+ ' + c) + '~, find ~g(' + xq + ')~.',
      xq * xq + c,
      ['Substitute, keeping brackets round the negative: ~(' + xq + ')^{2} ' +
        (c < 0 ? '- ' + Math.abs(c) : '+ ' + c) + '~.',
       '~(' + xq + ')^{2} = ' + (xq * xq) + '~, so the value is ' + (xq * xq) +
         (c < 0 ? ' - ' + Math.abs(c) : ' + ' + c) + ' = **' + (xq * xq + c) + '**.',
       xq < 0 ? 'Squaring a negative gives a positive. Without the brackets you would get the wrong sign.'
              : 'Brackets round the substituted value are a habit worth keeping even when it is positive.']);
  });

  g('domain-range', function (R, d) {
    var mode = R.pick(d === 1 ? ['listed', 'linear'] : ['listed', 'linear', 'sqrt', 'rational', 'quadratic']);
    if (mode === 'listed') {
      var xs = R.distinct(4, -8, 8).sort(function (a, b) { return a - b; });
      var ys = xs.map(function () { return R.int(-6, 6); });
      var want = R.bool();
      var set = want ? xs : ys.slice().sort(function (a, b) { return a - b; });
      var uniq = [];
      set.forEach(function (v) { if (uniq.indexOf(v) === -1) uniq.push(v); });
      return { prompt: 'A function is given by the pairs ' +
          xs.map(function (x, i) { return '(' + x + ', ' + ys[i] + ')'; }).join(', ') +
          '. List its ' + (want ? 'domain' : 'range') + ', smallest first, separated by commas.',
        kind: 'text', answer: uniq.join(','), normaliseList: true,
        solution: [want ? 'The domain is the set of inputs — the first number in each pair.'
                        : 'The range is the set of outputs — the second number in each pair.',
          'Collected and sorted: **' + uniq.join(', ') + '**.',
          'A value repeated in the list is written once; a set does not count duplicates.'] };
    }
    if (mode === 'linear') {
      var sh = choiceSet(R, 'All real numbers', ['Only positive numbers', 'All numbers except 0', 'Only whole numbers']);
      return mc('What is the domain of ~f(x) = ' + poly([[R.nonzero(-5, 5), 'x'], [R.nonzero(-8, 8), '']]) + '~?',
        sh.choices, sh.answer,
        ['Ask what inputs would break the rule: a division by zero, or a square root of a negative.',
         'This rule only multiplies and adds, which is safe for every number.',
         'So the domain is **all real numbers**.']);
    }
    if (mode === 'sqrt') {
      var k = R.int(1, 12);
      return num('The function ~f(x) = sqrt{x - ' + k + '}~ is defined for ~x \\ge~ what number?', k,
        ['A square root needs a non-negative inside.',
         'So ~x - ' + k + ' \\ge 0~, giving ~x \\ge ' + k + '~.',
         'The domain starts at **' + k + '**.']);
    }
    if (mode === 'rational') {
      var e = R.nonzero(-9, 9);
      return num('For ~f(x) = \\f{1}{x ' + (e < 0 ? '- ' + Math.abs(e) : '+ ' + e) + '}~, which single value of ~x~ ' +
        'must be excluded from the domain?', -e,
        ['Division by zero is *undefined*, so the bottom must not be zero.',
         'Solve ~x ' + (e < 0 ? '- ' + Math.abs(e) : '+ ' + e) + ' = 0~: ~x = ' + (-e) + '~.',
         'So exclude **' + (-e) + '**; every other number is allowed.']);
    }
    var vk = R.nonzero(-8, 8), up = R.bool();
    return num('What is the smallest value ~f(x) = ' + (up ? '' : '-') + 'x^{2} ' +
      (vk < 0 ? '- ' + Math.abs(vk) : '+ ' + vk) + '~ ' + (up ? 'can take' : 'can take, or if it has none, enter ' + vk) + '?',
      vk,
      [up ? '~x^{2}~ is never negative and is 0 at ~x = 0~, so the smallest the whole expression gets is ' + vk + '.'
          : 'With the minus sign the parabola opens downward, so ' + vk + ' is actually its *largest* value.',
       'The turning value is **' + vk + '**.',
       'The range of an upward parabola runs from its minimum upward; a downward one runs from its maximum downward.']);
  });

  g('function-from-context', function (R, d) {
    var base = R.int(10, 60), rate = R.int(2, 20);
    var mode = R.pick(['value', 'intercept', 'slope-meaning', 'solve']);
    var story = 'A plumber charges a ' + MC.money(base) + ' call-out fee plus ' + MC.money(rate) +
      ' per hour, so the cost of a job lasting ~h~ hours is ~C(h) = ' + base + ' + ' + rate + 'h~.';
    if (mode === 'value') {
      var h = R.int(2, 9);
      return num(story + ' What does a ' + h + '-hour job cost, in dollars?', base + rate * h,
        ['Substitute ~h = ' + h + '~: ~' + base + ' + ' + rate + '(' + h + ')~.',
         base + ' + ' + (rate * h) + ' = **' + MC.money(base + rate * h) + '**.'],
        { unit: 'dollars', tol: 0.02 });
    }
    if (mode === 'intercept') {
      return num(story + ' What does ~C(0) = ' + base + '~ represent, in dollars?', base,
        ['~h = 0~ means no hours worked at all.',
         'The cost is still ' + MC.money(base) + ' — the call-out fee.',
         'So the intercept is **' + MC.money(base) + '**: the fixed charge before any work happens.']);
    }
    if (mode === 'slope-meaning') {
      var sh = choiceSet(R, 'The cost of each extra hour',
        ['The total cost of the job', 'The call-out fee', 'The number of hours worked']);
      return mc(story + ' What does the ' + rate + ' represent?', sh.choices, sh.answer,
        ['The number multiplying the variable is the rate of change.',
         'Each extra hour adds ' + MC.money(rate) + ' to the bill.',
         'So it is **the cost of each extra hour**, not the total.']);
    }
    var total = base + rate * R.int(2, 10);
    return num(story + ' A bill came to ' + MC.money(total) + '. How many hours was the job?',
      (total - base) / rate,
      ['Set the rule equal to the bill: ~' + base + ' + ' + rate + 'h = ' + total + '~.',
       'Subtract the fee: ~' + rate + 'h = ' + (total - base) + '~.',
       'Divide: ~h = ~**' + ((total - base) / rate) + '** hours.'], { tol: 0.005 });
  });

  g('slope-from-points', function (R, d) {
    var x1 = R.int(-8, 8), y1 = R.int(-9, 9);
    var run = R.nonzero(1, d === 1 ? 4 : 6), rise = R.nonzero(-9, 9);
    if (d === 1) { rise = R.nonzero(-5, 5) * run; }      /* keep early slopes whole */
    var x2 = x1 + run, y2 = y1 + rise;
    var mode = R.pick(['compute', 'describe', 'missing']);
    if (mode === 'describe') {
      var kind = rise === 0 ? 'zero' : (rise > 0) === (run > 0) ? 'positive' : 'negative';
      var sh = choiceSet(R, kind.charAt(0).toUpperCase() + kind.slice(1),
        ['Positive', 'Negative', 'Zero', 'Undefined'].filter(function (o) { return o.toLowerCase() !== kind; }));
      return mc('A line passes through ~(' + x1 + ', ' + y1 + ')~ and ~(' + x2 + ', ' + y2 +
        ')~. Is its slope positive, negative, zero or *undefined*?', sh.choices, sh.answer,
        ['Slope is rise over run: ~\\f{' + y2 + ' - (' + y1 + ')}{' + x2 + ' - (' + x1 + ')} = \\f{' +
          rise + '}{' + run + '}~.',
         'That is **' + kind + '**.',
         'An *undefined* slope means a vertical line, where the run is zero and you would be dividing by nothing.']);
    }
    if (mode === 'missing') {
      var m = F(rise, run);
      if (m.d !== 1) { run = 1; rise = R.nonzero(-6, 6); x2 = x1 + run; y2 = y1 + rise; m = F(rise, run); }
      return num('A line through ~(' + x1 + ', ' + y1 + ')~ has slope ~' + Frac.str(m) +
        '~. What is the ~y~ coordinate of the point on it where ~x = ' + x2 + '~?', y2,
        ['Going from ~x = ' + x1 + '~ to ~x = ' + x2 + '~ is a run of ' + run + '.',
         'Rise = slope \\times run = ' + Frac.str(m) + ' \\times ' + run + ' = ' + rise + '.',
         y1 + ' + (' + rise + ') = **' + y2 + '**.']);
    }
    return num('Find the slope of the line through ~(' + x1 + ', ' + y1 + ')~ and ~(' + x2 + ', ' + y2 + ')~. ' +
      'Enter it as a decimal or a fraction.', rise / run,
      ['Slope ~= \\f{y_{2} - y_{1}}{x_{2} - x_{1}} = \\f{' + y2 + ' - (' + y1 + ')}{' + x2 + ' - (' + x1 + ')}~.',
       '~= \\f{' + rise + '}{' + run + '}~ = **' + (F(rise, run).d === 1 ? String(F(rise, run).n) : Frac.str(F(rise, run))) + '**.',
       'Subtract the coordinates in the *same order* on top and bottom. Swapping one gives the wrong sign.'],
      { tol: 0.005 });
  });

  g('slope-intercept', function (R, d) {
    var m = R.nonzero(-6, 6), b = R.nonzero(-9, 9);
    var mode = R.pick(['readOff', 'evaluate', 'fromGraph', 'rearrange']);
    if (mode === 'readOff') {
      return multi('For the line ~' + lineEq(m, b) + '~, give the slope and the ~y~-intercept.',
        [{ label: 'Slope', answer: m }, { label: 'y-intercept', answer: b }],
        ['In ~y = mx + b~, the number multiplying ~x~ is the slope and the lone number is the ~y~-intercept.',
         'Slope **' + m + '**, ~y~-intercept **' + b + '**.',
         'The sign travels with the number: in ~' + lineEq(m, b) + '~ the intercept is ' + b + '.']);
    }
    if (mode === 'evaluate') {
      var x = R.nonzero(-6, 6);
      return num('The line ~' + lineEq(m, b) + '~ passes through the point where ~x = ' + x +
        '~. What is ~y~ there?', m * x + b,
        ['Substitute ~x = ' + x + '~: ~y = ' + m + '(' + x + ')' + (b < 0 ? ' - ' + Math.abs(b) : ' + ' + b) + '~.',
         '~y = ' + (m * x) + (b < 0 ? ' - ' + Math.abs(b) : ' + ' + b) + ' = ~**' + (m * x + b) + '**.']);
    }
    if (mode === 'fromGraph') {
      var x1 = 0, y1 = b, run = R.nonzero(1, 4), x2 = run, y2 = b + m * run;
      return expr('A line crosses the ~y~-axis at ~' + b + '~ and also passes through ~(' + x2 + ', ' + y2 +
        ')~. Write its equation in the form ~y = mx + b~ (enter the right-hand side only).',
        m + '*x+' + b,
        ['The ~y~-intercept is given: ~b = ' + b + '~.',
         'Slope from the two points: ~\\f{' + y2 + ' - ' + b + '}{' + x2 + ' - 0} = \\f{' + (m * run) + '}{' + run +
           '} = ' + m + '~.',
         'So the rule is **' + poly([[m, 'x'], [b, '']]) + '**.']);
    }
    var A = R.nonzero(1, 6), B = R.nonzero(1, 6), Cc = R.nonzero(-12, 12);
    return expr('Rearrange ~' + poly([[A, 'x'], [B, 'y']]) + ' = ' + Cc +
      '~ into the form ~y = mx + b~ (enter the right-hand side only).',
      '(' + Cc + '-' + A + '*x)/' + B,
      ['Isolate the ~y~ term: ~' + term(B, 'y') + ' = ' + poly([[-A, 'x'], [Cc, '']]) + '~.',
       'Divide every term by ' + B + ': ~y = \\f{' + (-A) + '}{' + B + '}x + \\f{' + Cc + '}{' + B + '}~.',
       'So the slope is ~' + slopeStr(-A, B) + '~ and the intercept is ~' + Frac.str(F(Cc, B)) + '~.']);
  });

  g('point-slope', function (R, d) {
    var m = R.nonzero(-6, 6), x1 = R.nonzero(-7, 7), y1 = R.nonzero(-9, 9);
    var mode = R.pick(['build', 'toSlopeIntercept', 'twoPoints']);
    if (mode === 'build') {
      return num('A line has slope ~' + m + '~ and passes through ~(' + x1 + ', ' + y1 +
        ')~. Written as ~y = mx + b~, what is ~b~?', y1 - m * x1,
        ['Start from point-slope form: ~y - (' + y1 + ') = ' + m + '(x - (' + x1 + '))~.',
         'Expand: ~y = ' + term(m, 'x') + ' - ' + (m * x1) + ' + ' + y1 + '~ — careful with both minus signs.',
         'So ~b = ' + y1 + ' - ' + m + '(' + x1 + ') = ~**' + (y1 - m * x1) + '**.'],
        { tol: 0.005 });
    }
    if (mode === 'toSlopeIntercept') {
      return expr('Write ~y - ' + y1 + ' = ' + m + '(x - ' + x1 + ')~ in the form ~y = mx + b~ ' +
        '(enter the right-hand side only).', m + '*x+' + (y1 - m * x1),
        ['Distribute the slope: ~y - ' + y1 + ' = ' + term(m, 'x') + ' - ' + (m * x1) + '~.',
         'Add ' + y1 + ' to both sides: ~y = ' + poly([[m, 'x'], [y1 - m * x1, '']]) + '~.',
         'Answer: **' + poly([[m, 'x'], [y1 - m * x1, '']]) + '**.']);
    }
    var run = R.nonzero(1, 4), x2 = x1 + run, y2 = y1 + m * run;
    return expr('Write the equation of the line through ~(' + x1 + ', ' + y1 + ')~ and ~(' + x2 + ', ' + y2 +
      ')~ in the form ~y = mx + b~ (enter the right-hand side only).', m + '*x+' + (y1 - m * x1),
      ['Slope first: ~\\f{' + y2 + ' - (' + y1 + ')}{' + x2 + ' - (' + x1 + ')} = ' + m + '~.',
       'Use either point in point-slope form: ~y - (' + y1 + ') = ' + m + '(x - (' + x1 + '))~.',
       'Simplify: **' + poly([[m, 'x'], [y1 - m * x1, '']]) + '**.',
       'Both points give the same line, so use whichever has the friendlier numbers.']);
  });

  g('standard-form', function (R, d) {
    var A = R.nonzero(1, 7), B = R.nonzero(1, 7), Cc = A * R.nonzero(-5, 5) + B * R.nonzero(-5, 5);
    var mode = R.pick(['intercepts', 'xIntercept', 'toStandard']);
    if (mode === 'intercepts') {
      return multi('For ~' + poly([[A, 'x'], [B, 'y']]) + ' = ' + Cc + '~, find both intercepts.',
        [{ label: 'x-intercept (where y = 0)', answer: Cc / A, tol: 0.005 },
         { label: 'y-intercept (where x = 0)', answer: Cc / B, tol: 0.005 }],
        ['Standard form makes intercepts quick: set the other variable to zero.',
         'Set ~y = 0~: ~' + term(A, 'x') + ' = ' + Cc + '~, so ~x = ' + MC.fmt(Cc / A, 4) + '~.',
         'Set ~x = 0~: ~' + term(B, 'y') + ' = ' + Cc + '~, so ~y = ' + MC.fmt(Cc / B, 4) + '~.',
         'This is why standard form is the convenient one for sketching a line from two points.']);
    }
    if (mode === 'xIntercept') {
      return num('Where does ~' + poly([[A, 'x'], [B, 'y']]) + ' = ' + Cc + '~ cross the ~x~-axis?',
        Cc / A,
        ['On the ~x~-axis, ~y = 0~.',
         'That leaves ~' + term(A, 'x') + ' = ' + Cc + '~, so ~x = ~**' + MC.fmt(Cc / A, 4) + '**.'],
        { tol: 0.005 });
    }
    var m = R.nonzero(-5, 5), b = R.nonzero(-9, 9);
    return multi('Write ~' + lineEq(m, b) + '~ in standard form ~Ax + By = C~ with ~A~ positive and ' +
      'as small as possible. Give ~A~, ~B~ and ~C~.',
      [{ label: 'A', answer: -m > 0 ? -m : m }, { label: 'B', answer: -m > 0 ? 1 : -1 },
       { label: 'C', answer: -m > 0 ? b : -b }],
      ['Move the ~x~ term across: ~' + term(-m, 'x') + ' + y = ' + b + '~.',
       -m > 0 ? 'The coefficient of ~x~ is already positive, so this is it.'
              : 'The coefficient of ~x~ is negative, so multiply the whole equation by -1: ~' +
                term(m, 'x') + ' - y = ' + (-b) + '~.',
       'So ~A = ' + (-m > 0 ? -m : m) + '~, ~B = ' + (-m > 0 ? 1 : -1) + '~, ~C = ' + (-m > 0 ? b : -b) + '~.']);
  });

  g('parallel-perpendicular', function (R, d) {
    var m = R.nonzero(-6, 6), b = R.nonzero(-9, 9);
    var mode = R.pick(['identify', 'parallelThrough', 'perpSlope', 'perpThrough']);
    if (mode === 'identify') {
      var m2 = R.pick([m, -1 / m, m + R.nonzero(1, 3)]);
      var rel = m2 === m ? 'Parallel' : (Math.abs(m2 * m + 1) < 1e-9 ? 'Perpendicular' : 'Neither');
      var sh = choiceSet(R, rel, ['Parallel', 'Perpendicular', 'Neither'].filter(function (o) { return o !== rel; }));
      return mc('One line has slope ~' + m + '~ and another has slope ~' + MC.fmt(m2, 4) +
        '~. How are they related?', sh.choices, sh.answer,
        ['Equal slopes mean parallel. Slopes multiplying to -1 mean perpendicular.',
         'Here ' + m + ' \\times ' + MC.fmt(m2, 4) + ' = ' + MC.fmt(m * m2, 4) +
           (rel === 'Perpendicular' ? ', which is -1.' : (rel === 'Parallel' ? ', and the slopes are equal.' : ', which is neither -1 nor are the slopes equal.')),
         'So they are **' + rel.toLowerCase() + '**.']);
    }
    if (mode === 'parallelThrough') {
      var px = R.nonzero(-6, 6), py = R.nonzero(-9, 9);
      return expr('Write the line parallel to ~' + lineEq(m, b) + '~ through ~(' + px + ', ' + py +
        ')~, in the form ~y = mx + b~ (right-hand side only).', m + '*x+' + (py - m * px),
        ['Parallel means the same slope, ~' + m + '~.',
         'Through ~(' + px + ', ' + py + ')~: ~b = ' + py + ' - ' + m + '(' + px + ') = ' + (py - m * px) + '~.',
         'Answer: **' + poly([[m, 'x'], [py - m * px, '']]) + '**.']);
    }
    if (mode === 'perpSlope') {
      var num_ = R.nonzero(1, 6), den = R.nonzero(1, 6);
      var f = F(num_, den), pf = F(-den, num_);
      return num('A line has slope ~' + Frac.str(f) + '~. What is the slope of any line perpendicular to it? ' +
        'Enter a decimal or a fraction.', Frac.val(pf),
        ['Perpendicular slopes are negative reciprocals: flip the fraction and change the sign.',
         '~' + Frac.str(f) + ' \\to ' + Frac.str(pf) + '~.',
         'Check: ~' + Frac.str(f) + ' \\times ' + Frac.str(pf) + ' = -1~. Answer **' + Frac.str(pf) + '**.'],
        { tol: 0.005 });
    }
    var qx = R.nonzero(-6, 6), qy = R.nonzero(-9, 9);
    var pm = -1 / m;
    return num('A line perpendicular to ~' + lineEq(m, b) + '~ passes through ~(' + qx + ', ' + qy +
      ')~. In ~y = mx + b~ form, what is ~b~? Enter a decimal or a fraction.', qy - pm * qx,
      ['Perpendicular slope is the negative reciprocal of ' + m + ': ~' + Frac.str(F(-1, m)) + '~.',
       '~b = y - mx = ' + qy + ' - (' + Frac.str(F(-1, m)) + ')(' + qx + ')~.',
       '~b = ~**' + MC.fmt(qy - pm * qx, 4) + '**.'], { tol: 0.005 });
  });

  g('linear-modelling', function (R, d) {
    var start = R.int(20, 500), rate = R.nonzero(-25, 25);
    var noun = R.pick(['litres of water in a tank', 'pages left to read', 'dollars in a savings jar',
                       'members of a club', 'kilometres from home']);
    var up = rate > 0;
    var mode = R.pick(['value', 'whenZero', 'interpret', 'build']);
    var story = 'A quantity starts at ' + start + ' ' + noun + ' and changes by ' +
      (up ? '+' : '') + rate + ' each week.';
    if (mode === 'value') {
      var w = R.int(2, 12);
      return num(story + ' How much after ' + w + ' weeks?', start + rate * w,
        ['The model is ~y = ' + start + ' + ' + rate + 'w~ — a starting amount plus a rate times time.',
         'At ~w = ' + w + '~: ' + start + ' + (' + rate + ')(' + w + ') = **' + (start + rate * w) + '**.']);
    }
    if (mode === 'whenZero') {
      if (rate > 0) rate = -rate;
      var weeks = start / Math.abs(rate);
      return num(story.replace('+' + Math.abs(rate), String(rate)) +
        ' After how many weeks does it reach zero? Round to 2 decimal places if needed.', weeks,
        ['Set the model to zero: ~' + start + ' + (' + rate + ')w = 0~.',
         'So ~w = \\f{' + start + '}{' + Math.abs(rate) + '} = ~**' + MC.fmt(weeks, 2) + '** weeks.',
         'This is the ~x~-intercept of the model, and in context it is when the quantity runs out.'],
        { tol: 0.011 });
    }
    if (mode === 'interpret') {
      var sh = choiceSet(R, 'The amount at the start, before any weeks passed',
        ['The weekly change', 'The total after one week', 'The number of weeks']);
      return mc(story + ' In the model ~y = ' + start + ' + ' + rate + 'w~, what does the ' + start +
        ' mean?', sh.choices, sh.answer,
        ['Put ~w = 0~ into the model: the rate term vanishes.',
         'What is left is ' + start + ', the value before any time has passed.',
         'So it is **the amount at the start**. The ' + rate + ' is the weekly change.']);
    }
    return num(story + ' Write the model as ~y = ' + start + ' + mw~. What is ~m~?', rate,
      ['The rate of change per week is the number multiplying ~w~.',
       'It changes by ' + rate + ' each week, so ~m = ~**' + rate + '**.',
       up ? 'A positive rate means growth.' : 'A negative rate means decline — the sign carries that information.']);
  });

  g('line-of-best-fit', function (R, d) {
    var m = R.nonzero(1, 8) * (R.bool() ? 1 : -1), b = R.int(5, 60);
    var mode = R.pick(['predict', 'slopeMeaning', 'strength']);
    if (mode === 'predict') {
      var x = R.int(2, 20);
      return num('A scatterplot of study hours against test score has line of best fit ~y = ' +
        poly([[m, 'x'], [b, '']]) + '~. What score does it predict for ' + x + ' hours?', m * x + b,
        ['A line of best fit is used exactly like any other line: substitute.',
         '~y = ' + m + '(' + x + ')' + (b < 0 ? ' - ' + Math.abs(b) : ' + ' + b) + ' = ~**' + (m * x + b) + '**.',
         'It is a prediction, not a measurement. Real points sit above and below the line.']);
    }
    if (mode === 'slopeMeaning') {
      var sh = choiceSet(R, 'Each extra hour is associated with ' + (m > 0 ? 'a rise' : 'a fall') +
        ' of about ' + Math.abs(m) + ' marks',
        ['The test is out of ' + Math.abs(m) + ' marks', 'Studying causes a gain of ' + Math.abs(m) + ' marks every time',
         'About ' + Math.abs(m) + ' students were surveyed']);
      return mc('For the fit ~y = ' + poly([[m, 'x'], [b, '']]) + '~ of score against study hours, what does ' +
        'the slope ' + m + ' tell you?', sh.choices, sh.answer,
        ['The slope is the change in the predicted output per one unit of input.',
         'So each extra hour is associated with about ' + Math.abs(m) + ' marks ' + (m > 0 ? 'more' : 'fewer') + '.',
         '**Associated with**, not *causes*. A line through data describes a pattern; it does not establish that one thing produces the other.']);
    }
    var rs = R.pick([0.05, 0.2, 0.45, 0.7, 0.9, 0.98]);
    var word = rs >= 0.8 ? 'Strong' : rs >= 0.4 ? 'Moderate' : 'Weak';
    var sh2 = choiceSet(R, word, ['Strong', 'Moderate', 'Weak'].filter(function (o) { return o !== word; }));
    return mc('Two variables have correlation coefficient ~r = ' + rs + '~. How strong is the linear relationship?',
      sh2.choices, sh2.answer,
      ['~r~ runs from -1 to 1; the closer to either end, the tighter the points hug a straight line.',
       '~r = ' + rs + '~ counts as a **' + word.toLowerCase() + '** linear relationship.',
       'A high ~r~ still says nothing about cause, and it can be high for data that is not really straight at all.']);
  });

  g('system-graphing', function (R, d) {
    var x = R.nonzero(-6, 6), y = R.nonzero(-6, 6);
    var m1 = R.nonzero(-4, 4), m2 = R.nonzero(-4, 4);
    while (m2 === m1) m2 = R.nonzero(-4, 4);
    var b1 = y - m1 * x, b2 = y - m2 * x;
    var mode = R.pick(['solve', 'count']);
    if (mode === 'count') {
      var kind = R.pick(['one', 'none', 'infinite']);
      var eq2;
      if (kind === 'one') eq2 = lineEq(m2, b2);
      else if (kind === 'none') eq2 = lineEq(m1, b1 + R.nonzero(1, 6));
      else eq2 = lineEq(m1, b1);
      var right = kind === 'one' ? 'Exactly one' : kind === 'none' ? 'None' : 'Infinitely many';
      var sh = choiceSet(R, right, ['Exactly one', 'None', 'Infinitely many'].filter(function (o) { return o !== right; }));
      return mc('How many solutions does this system have?\n\n~' + lineEq(m1, b1) + '~\n\n~' + eq2 + '~',
        sh.choices, sh.answer,
        ['Compare slopes and intercepts.',
         kind === 'one' ? 'Different slopes (' + m1 + ' and ' + m2 + '), so the lines cross once.'
           : kind === 'none' ? 'Same slope ' + m1 + ' but different intercepts, so they are parallel and never meet.'
           : 'Same slope and same intercept — it is the same line twice, so every point on it is a solution.',
         'Answer: **' + right.toLowerCase() + '**.']);
    }
    return multi('Solve by finding where the lines cross:\n\n~' + lineEq(m1, b1) + '~\n\n~' + lineEq(m2, b2) + '~',
      [{ label: 'x', answer: x }, { label: 'y', answer: y }],
      ['At the crossing point both rules give the same ~y~, so set them equal: ~' +
        poly([[m1, 'x'], [b1, '']]) + ' = ' + poly([[m2, 'x'], [b2, '']]) + '~.',
       'Collect: ~' + term(m1 - m2, 'x') + ' = ' + (b2 - b1) + '~, so ~x = ' + x + '~.',
       'Substitute back into either equation: ~y = ' + y + '~.',
       'Solution **(' + x + ', ' + y + ')**. Check it in *both* equations — a point on only one line is not a solution.']);
  });

  g('system-substitution', function (R, d) {
    var x = R.nonzero(-7, 7), y = R.nonzero(-7, 7);
    var m = R.nonzero(-5, 5), b = y - m * x;
    var A = R.nonzero(1, 5), B = R.nonzero(1, 5), Cc = A * x + B * y;
    return multi('Solve by substitution:\n\n~y = ' + poly([[m, 'x'], [b, '']]) + '~\n\n~' +
      poly([[A, 'x'], [B, 'y']]) + ' = ' + Cc + '~',
      [{ label: 'x', answer: x }, { label: 'y', answer: y }],
      ['The first equation already gives ~y~, so put that expression into the second in place of ~y~.',
       '~' + term(A, 'x') + ' + ' + B + '(' + poly([[m, 'x'], [b, '']]) + ') = ' + Cc + '~.',
       'Expand and collect: ~' + term(A + B * m, 'x') + ' = ' + (Cc - B * b) + '~, so ~x = ' + x + '~.',
       'Back-substitute: ~y = ' + m + '(' + x + ')' + (b < 0 ? ' - ' + Math.abs(b) : ' + ' + b) + ' = ' + y + '~.',
       'Solution **(' + x + ', ' + y + ')**. Substitution is cheapest when one variable is already alone.']);
  });

  g('system-elimination', function (R, d) {
    var x = R.nonzero(-7, 7), y = R.nonzero(-7, 7);
    var a1 = R.nonzero(1, 6), b1 = R.nonzero(1, 6);
    var a2 = R.nonzero(1, 6), b2 = R.nonzero(1, 6);
    while (a1 * b2 - a2 * b1 === 0) { a2 = R.nonzero(1, 6); b2 = R.nonzero(1, 6); }
    var c1 = a1 * x + b1 * y, c2 = a2 * x + b2 * y;
    var L = MC.lcm(Math.abs(b1), Math.abs(b2));
    return multi('Solve by elimination:\n\n~' + poly([[a1, 'x'], [b1, 'y']]) + ' = ' + c1 + '~\n\n~' +
      poly([[a2, 'x'], [b2, 'y']]) + ' = ' + c2 + '~',
      [{ label: 'x', answer: x }, { label: 'y', answer: y }],
      ['To cancel ~y~, scale each equation so the ~y~ coefficients match in size: use ' + L + '.',
       'Multiply the first by ' + (L / Math.abs(b1)) + ' and the second by ' + (L / Math.abs(b2)) +
         ', then ' + ((b1 > 0) === (b2 > 0) ? 'subtract' : 'add') + ' to remove ~y~.',
       'That leaves one equation in ~x~ alone, giving ~x = ' + x + '~.',
       'Substitute back: ~y = ' + y + '~.',
       'Solution **(' + x + ', ' + y + ')**. Elimination is cheapest when neither variable is already isolated.']);
  });

  g('system-special', function (R, d) {
    var a = R.nonzero(1, 5), b = R.nonzero(1, 5), c = R.nonzero(-10, 10);
    var k = R.int(2, 4);
    var kind = R.pick(['none', 'infinite', 'one']);
    var eq1 = poly([[a, 'x'], [b, 'y']]) + ' = ' + c;
    var eq2, right, why;
    if (kind === 'none') {
      eq2 = poly([[a * k, 'x'], [b * k, 'y']]) + ' = ' + (c * k + R.nonzero(1, 5));
      right = 'No solution';
      why = ['Multiply the first equation by ' + k + ' and the left sides match exactly, but the right sides do not.',
        'That is a contradiction: the same quantity cannot equal two different numbers.',
        'Graphically the lines are **parallel** — same slope, different intercept — so there is **no solution**.'];
    } else if (kind === 'infinite') {
      eq2 = poly([[a * k, 'x'], [b * k, 'y']]) + ' = ' + (c * k);
      right = 'Infinitely many solutions';
      why = ['The second equation is exactly ' + k + ' times the first, so they carry the same information.',
        'It is one line written twice, and every point on it satisfies both.',
        'So there are **infinitely many solutions**.'];
    } else {
      eq2 = poly([[a * k + R.nonzero(1, 3), 'x'], [b * k, 'y']]) + ' = ' + (c * k);
      right = 'Exactly one solution';
      why = ['Try to scale one equation into the other: the ~x~ and ~y~ coefficients do not scale by the same factor.',
        'So the lines have different slopes and must cross exactly once.',
        'Answer: **exactly one solution**.'];
    }
    var sh = choiceSet(R, right, ['No solution', 'Infinitely many solutions', 'Exactly one solution']
      .filter(function (o) { return o !== right; }));
    return mc('How many solutions does this system have?\n\n~' + eq1 + '~\n\n~' + eq2 + '~', sh.choices, sh.answer, why);
  });

  g('system-word-problems', function (R, d) {
    var kind = R.pick(['tickets', 'coins', 'twoItems']);
    if (kind === 'tickets') {
      var adultP = R.int(8, 20), childP = R.int(3, adultP - 2);
      var adults = R.int(5, 60), children = R.int(5, 60);
      var people = adults + children, money = adults * adultP + children * childP;
      return multi('Adult tickets cost ' + MC.money(adultP) + ' and child tickets ' + MC.money(childP) +
        '. ' + people + ' tickets were sold for ' + MC.money(money) +
        ' in total. How many of each were sold?',
        [{ label: 'Adult tickets', answer: adults }, { label: 'Child tickets', answer: children }],
        ['Two unknowns need two equations. Let ~a~ be adult tickets and ~c~ child tickets.',
         'Count: ~a + c = ' + people + '~. Money: ~' + adultP + 'a + ' + childP + 'c = ' + money + '~.',
         'Substitute ~c = ' + people + ' - a~ into the money equation and solve: ~a = ' + adults + '~.',
         'Then ~c = ' + people + ' - ' + adults + ' = ' + children + '~.',
         '**' + adults + ' adult and ' + children + ' child tickets.** Check both equations, not just one.']);
    }
    if (kind === 'coins') {
      var nickels = R.int(4, 40), dimes = R.int(4, 40);
      var count = nickels + dimes, value = nickels * 5 + dimes * 10;
      return multi('A jar holds only nickels (5 cents) and dimes (10 cents). There are ' + count +
        ' coins worth ' + MC.money(value / 100) + ' in total. How many of each?',
        [{ label: 'Nickels', answer: nickels }, { label: 'Dimes', answer: dimes }],
        ['Let ~n~ be nickels and ~d~ dimes.',
         'Count: ~n + d = ' + count + '~. Value in cents: ~5n + 10d = ' + value + '~.',
         'From the first, ~n = ' + count + ' - d~. Substituting gives ~d = ' + dimes + '~.',
         'So ~n = ' + nickels + '~. **' + nickels + ' nickels and ' + dimes + ' dimes.**',
         'Keep every term in the same unit. Mixing dollars and cents in one equation is the usual error here.']);
    }
    var pA = R.int(2, 9), pB = R.int(2, 9);
    while (pB === pA) pB = R.int(2, 9);
    var nA = R.int(2, 12), nB = R.int(2, 12);
    var tot1 = nA * pA + nB * pB;
    var mA = nA + R.int(1, 5), mB = nB + R.int(1, 5);
    var tot2 = mA * pA + mB * pB;
    return multi('Buying ' + nA + ' pens and ' + nB + ' pencils costs ' + MC.money(tot1) + '. Buying ' +
      mA + ' pens and ' + mB + ' pencils costs ' + MC.money(tot2) +
      '. Find the price of each, in dollars.',
      [{ label: 'Price of a pen', answer: pA, tol: 0.02 }, { label: 'Price of a pencil', answer: pB, tol: 0.02 }],
      ['Let ~p~ be the pen price and ~q~ the pencil price.',
       '~' + nA + 'p + ' + nB + 'q = ' + tot1 + '~ and ~' + mA + 'p + ' + mB + 'q = ' + tot2 + '~.',
       'Eliminate one variable by scaling both equations, then solve.',
       'Pen **' + MC.money(pA) + '**, pencil **' + MC.money(pB) + '**.']);
  });

  g('system-inequalities', function (R, d) {
    var m1 = R.nonzero(-4, 4), b1 = R.nonzero(-8, 8);
    var m2 = R.nonzero(-4, 4), b2 = R.nonzero(-8, 8);
    var px = R.nonzero(-6, 6), py = R.nonzero(-9, 9);
    var op1 = R.pick(['<', '>', '<=', '>=']);
    var op2 = R.pick(['<', '>', '<=', '>=']);
    function holds(op, lhs, rhs) {
      if (op === '<') return lhs < rhs;
      if (op === '>') return lhs > rhs;
      if (op === '<=') return lhs <= rhs;
      return lhs >= rhs;
    }
    var v1 = m1 * px + b1, v2 = m2 * px + b2;
    var ok1 = holds(op1, py, v1), ok2 = holds(op2, py, v2);
    var both = ok1 && ok2;
    var sh = shuffleChoices(R, ['Yes, it satisfies both', 'No, it fails at least one'], both ? 0 : 1);
    return mc('Is ~(' + px + ', ' + py + ')~ a solution of this system?\n\n~y ' + op1 + ' ' +
      poly([[m1, 'x'], [b1, '']]) + '~\n\n~y ' + op2 + ' ' + poly([[m2, 'x'], [b2, '']]) + '~',
      sh.choices, sh.answer,
      ['Test the point in each inequality separately — a solution must satisfy every one.',
       'First: ~' + py + ' ' + op1 + ' ' + MC.fmt(v1, 4) + '~ is ' + (ok1 ? 'true' : 'false') + '.',
       'Second: ~' + py + ' ' + op2 + ' ' + MC.fmt(v2, 4) + '~ is ' + (ok2 ? 'true' : 'false') + '.',
       'So the point **' + (both ? 'is' : 'is not') + '** a solution.',
       'Graphically the solution set is where the two shaded regions overlap; a point in only one region does not count.']);
  });

  g('abs-equations', function (R, d) {
    var inner_m = R.nonzero(1, 4), inner_b = R.nonzero(-8, 8);
    var k = R.int(1, 12);
    var mode = R.pick(d === 1 ? ['simple', 'nosol'] : ['simple', 'nosol', 'shifted', 'count']);
    if (mode === 'simple') {
      var sols = [k, -k];
      return multi('Solve ~|x| = ' + k + '~. Give both solutions, smaller first.',
        [{ label: 'Smaller solution', answer: -k }, { label: 'Larger solution', answer: k }],
        ['Absolute value is distance from zero, so two numbers sit ' + k + ' away.',
         'Those are ~-' + k + '~ and ~' + k + '~.',
         'Solutions **-' + k + '** and **' + k + '**.']);
    }
    if (mode === 'nosol') {
      var neg = -R.int(1, 9);
      var sh = choiceSet(R, 'No solution', ['Two solutions', 'One solution', 'Infinitely many solutions']);
      return mc('How many solutions does ~|x ' + (inner_b < 0 ? '- ' + Math.abs(inner_b) : '+ ' + inner_b) +
        '| = ' + neg + '~ have?', sh.choices, sh.answer,
        ['Absolute value measures distance, and distance is never negative.',
         'Nothing can have absolute value ' + neg + '.',
         'So there is **no solution** — and you can see that before doing any algebra.']);
    }
    if (mode === 'shifted') {
      var s1 = (k - inner_b) / inner_m, s2 = (-k - inner_b) / inner_m;
      var lo = Math.min(s1, s2), hi = Math.max(s1, s2);
      return multi('Solve ~|' + poly([[inner_m, 'x'], [inner_b, '']]) + '| = ' + k +
        '~. Give both solutions, smaller first.',
        [{ label: 'Smaller solution', answer: lo, tol: 0.005 }, { label: 'Larger solution', answer: hi, tol: 0.005 }],
        ['Split into two cases: the inside equals ' + k + ', or the inside equals ~-' + k + '~.',
         'Case 1: ~' + poly([[inner_m, 'x'], [inner_b, '']]) + ' = ' + k + '~ gives ~x = ' + MC.fmt(s1, 4) + '~.',
         'Case 2: ~' + poly([[inner_m, 'x'], [inner_b, '']]) + ' = ' + (-k) + '~ gives ~x = ' + MC.fmt(s2, 4) + '~.',
         'Solutions **' + MC.fmt(lo, 4) + '** and **' + MC.fmt(hi, 4) + '**. Always put both back in to check.']);
    }
    var rhs = R.pick([0, R.int(1, 9)]);
    var right = rhs === 0 ? 'One solution' : 'Two solutions';
    var sh2 = choiceSet(R, right, ['One solution', 'Two solutions', 'No solution']
      .filter(function (o) { return o !== right; }));
    return mc('How many solutions does ~|' + poly([[inner_m, 'x'], [inner_b, '']]) + '| = ' + rhs + '~ have?',
      sh2.choices, sh2.answer,
      [rhs === 0 ? 'Only zero has absolute value zero, so the inside must be exactly 0 — a single equation, a single answer.'
                 : 'A positive right-hand side gives two cases, inside ~= ' + rhs + '~ and inside ~= -' + rhs + '~.',
       'Answer: **' + right.toLowerCase() + '**.',
       'Three cases worth knowing on sight: positive gives two, zero gives one, negative gives none.']);
  });

  g('abs-inequalities', function (R, d) {
    var k = R.int(2, 12), c = R.nonzero(-8, 8);
    var less = R.bool();
    if (less) {
      return multi('Solve ~|x ' + (c < 0 ? '- ' + Math.abs(c) : '+ ' + c) + '| < ' + k +
        '~. Give the lower and upper bounds for ~x~.',
        [{ label: 'Lower bound', answer: -k - c }, { label: 'Upper bound', answer: k - c }],
        ['"Less than" means the inside is within ' + k + ' of zero, so it is trapped between ~-' + k +
          '~ and ~' + k + '~.',
         'Write it as one chain: ~-' + k + ' < x ' + (c < 0 ? '- ' + Math.abs(c) : '+ ' + c) + ' < ' + k + '~.',
         (c < 0 ? 'Add ' + Math.abs(c) : 'Subtract ' + c) + ' throughout: ~' + (-k - c) + ' < x < ' + (k - c) + '~.',
         'So ~x~ runs from **' + (-k - c) + '** to **' + (k - c) + '**. Less-than gives one interval, an "and".']);
    }
    return multi('Solve ~|x ' + (c < 0 ? '- ' + Math.abs(c) : '+ ' + c) + '| > ' + k +
      '~. Give the two boundary values, smaller first.',
      [{ label: 'x is less than', answer: -k - c }, { label: 'or x is greater than', answer: k - c }],
      ['"Greater than" means the inside is further than ' + k + ' from zero — in either direction.',
       'Two separate cases: ~x ' + (c < 0 ? '- ' + Math.abs(c) : '+ ' + c) + ' > ' + k + '~ or ~x ' +
         (c < 0 ? '- ' + Math.abs(c) : '+ ' + c) + ' < -' + k + '~.',
       'Solving each: ~x > ' + (k - c) + '~ or ~x < ' + (-k - c) + '~.',
       'So **x < ' + (-k - c) + ' or x > ' + (k - c) + '**. Greater-than gives two pieces, an "or" — never one interval.']);
  });

  g('abs-graphs', function (R, d) {
    var a = R.pick([1, -1, 2, -2, 3, -3]), h = R.nonzero(-6, 6), k = R.nonzero(-8, 8);
    var mode = R.pick(['vertex', 'direction', 'value']);
    var eqn = 'y = ' + (a === 1 ? '' : a === -1 ? '-' : a) + '|x ' + (h < 0 ? '+ ' + Math.abs(h) : '- ' + h) +
      '| ' + (k < 0 ? '- ' + Math.abs(k) : '+ ' + k);
    if (mode === 'vertex') {
      return multi('Find the vertex of ~' + eqn + '~.',
        [{ label: 'x', answer: h }, { label: 'y', answer: k }],
        ['In ~y = a|x - h| + k~ the corner sits at ~(h, k)~.',
         'Here the bracket reads ~x ' + (h < 0 ? '+ ' + Math.abs(h) : '- ' + h) + '~, which is ~x - (' + h +
           ')~, so ~h = ' + h + '~. And ~k = ' + k + '~.',
         'Vertex **(' + h + ', ' + k + ')**.',
         'The sign inside the bars flips: ~|x + 3|~ has its corner at ~x = -3~.']);
    }
    if (mode === 'direction') {
      var sh = shuffleChoices(R, ['Opens upward (the vertex is a minimum)', 'Opens downward (the vertex is a maximum)'],
        a > 0 ? 0 : 1);
      return mc('Does the graph of ~' + eqn + '~ open upward or downward?', sh.choices, sh.answer,
        ['The sign of the number in front of the bars decides it.',
         'Here it is ' + a + ', which is ' + (a > 0 ? 'positive, so the V opens upward' : 'negative, so the V is flipped and opens downward') + '.',
         'So it **opens ' + (a > 0 ? 'upward' : 'downward') + '**, and the vertex is a ' + (a > 0 ? 'minimum' : 'maximum') + '.']);
    }
    var x = R.nonzero(-8, 8);
    return num('For ~' + eqn + '~, find ~y~ when ~x = ' + x + '~.', a * Math.abs(x - h) + k,
      ['Work inside the bars first: ~' + x + ' - (' + h + ') = ' + (x - h) + '~.',
       'Take the absolute value: ~|' + (x - h) + '| = ' + Math.abs(x - h) + '~.',
       'Then ~y = ' + a + '(' + Math.abs(x - h) + ')' + (k < 0 ? ' - ' + Math.abs(k) : ' + ' + k) + ' = ~**' +
         (a * Math.abs(x - h) + k) + '**.']);
  });

  /* quadratic ax^2+bx+c as tidy display text */
  function quad(a, b, c) { return poly([[a, 'x^{2}'], [b, 'x'], [c, '']]); }
  /* an expression string the grader can parse */
  function quadSrc(a, b, c) { return a + '*x^2+' + b + '*x+' + c; }

  g('poly-vocabulary', function (R, d) {
    var a = R.nonzero(-7, 7), b = R.nonzero(-7, 7), c = R.nonzero(-7, 7);
    var deg = R.pick([2, 3, 4]);
    var shown = poly([[a, 'x^{' + deg + '}'], [b, 'x'], [c, '']]);
    var mode = R.pick(['degree', 'leading', 'classify', 'standard']);
    if (mode === 'degree') {
      return num('What is the degree of ~' + shown + '~?', deg,
        ['The degree is the highest power of the variable.',
         'The powers here are ' + deg + ', 1 and 0, so the degree is **' + deg + '**.',
         'The degree controls the shape: it caps how many times the graph can cross the ~x~-axis.']);
    }
    if (mode === 'leading') {
      return num('What is the leading coefficient of ~' + shown + '~?', a,
        ['The leading coefficient is the number on the highest-power term, with its sign.',
         'The highest power is ~x^{' + deg + '}~ and its coefficient is **' + a + '**.',
         'It is "leading" because standard form puts that term first — not because it is the biggest number.']);
    }
    if (mode === 'classify') {
      var names = { 1: 'Linear', 2: 'Quadratic', 3: 'Cubic', 4: 'Quartic' };
      var sh = choiceSet(R, names[deg], ['Linear', 'Quadratic', 'Cubic', 'Quartic']
        .filter(function (o) { return o !== names[deg]; }));
      return mc('What kind of polynomial is ~' + shown + '~?', sh.choices, sh.answer,
        ['Polynomials are named by their degree.',
         'The degree is ' + deg + ', so it is **' + names[deg].toLowerCase() + '**.',
         'Degree 1 linear, 2 quadratic, 3 cubic, 4 quartic.']);
    }
    var scrambled = poly([[c, ''], [a, 'x^{' + deg + '}'], [b, 'x']]);
    var sh2 = choiceSet(R, '~' + shown + '~',
      ['~' + poly([[b, 'x'], [a, 'x^{' + deg + '}'], [c, '']]) + '~',
       '~' + poly([[c, ''], [b, 'x'], [a, 'x^{' + deg + '}']]) + '~']);
    return mc('Which of these is ~' + scrambled + '~ written in standard form?', sh2.choices, sh2.answer,
      ['Standard form orders the terms from the highest power down to the constant.',
       'Highest power first: ~' + shown + '~.',
       'The order does not change the value — it is a convention that makes degree and leading coefficient readable at a glance.']);
  });

  g('poly-add-sub', function (R, d) {
    var a1 = R.nonzero(-8, 8), b1 = R.nonzero(-8, 8), c1 = R.nonzero(-8, 8);
    var a2 = R.nonzero(-8, 8), b2 = R.nonzero(-8, 8), c2 = R.nonzero(-8, 8);
    var sub = R.bool(0.5);
    var sign = sub ? -1 : 1;
    var ra = a1 + sign * a2, rb = b1 + sign * b2, rc = c1 + sign * c2;
    return expr('Simplify: ~(' + quad(a1, b1, c1) + ') ' + (sub ? '-' : '+') + ' (' + quad(a2, b2, c2) + ')~',
      quadSrc(ra, rb, rc),
      [sub ? 'Subtracting a bracket flips the sign of every term inside it: ~' + quad(-a2, -b2, -c2) + '~.'
           : 'Adding brackets changes nothing, so drop them and collect.',
       'Collect ~x^{2}~: ' + a1 + ' ' + (sign < 0 ? '-' : '+') + ' ' + Math.abs(a2) * (a2 < 0 ? -1 : 1) + ' = ' + ra + '.',
       'Collect ~x~: ' + rb + '. Collect constants: ' + rc + '.',
       'Answer: **' + quad(ra, rb, rc) + '**.',
       sub ? 'Distributing the minus over *every* term is where nearly all the marks are lost.'
           : 'Only terms with the same power combine.']);
  });

  g('poly-multiply', function (R, d) {
    var mode = R.pick(d === 1 ? ['monomial', 'binomials'] : ['monomial', 'binomials', 'trinomial']);
    if (mode === 'monomial') {
      var k = R.nonzero(-7, 7), p = R.int(1, 3);
      var b = R.nonzero(-8, 8), c = R.nonzero(-8, 8);
      return expr('Expand: ~' + term(k, 'x^{' + p + '}') + '(' + poly([[b, 'x'], [c, '']]) + ')~',
        k + '*x^' + p + '*(' + b + '*x+' + c + ')',
        ['Multiply the outside term by each term inside.',
         term(k, 'x^{' + p + '}') + ' \\times ' + term(b, 'x') + ' = ' + term(k * b, 'x^{' + (p + 1) + '}') +
           ' — multiply the numbers, add the powers.',
         term(k, 'x^{' + p + '}') + ' \\times (' + c + ') = ' + term(k * c, 'x^{' + p + '}') + '.',
         'Answer: **' + poly([[k * b, 'x^{' + (p + 1) + '}'], [k * c, 'x^{' + p + '}']]) + '**.']);
    }
    if (mode === 'binomials') {
      var p1 = R.nonzero(1, 5), q1 = R.nonzero(-9, 9), p2 = R.nonzero(1, 5), q2 = R.nonzero(-9, 9);
      var A = p1 * p2, B = p1 * q2 + q1 * p2, C = q1 * q2;
      return expr('Expand and simplify: ~(' + poly([[p1, 'x'], [q1, '']]) + ')(' + poly([[p2, 'x'], [q2, '']]) + ')~',
        quadSrc(A, B, C),
        ['Every term in the first bracket multiplies every term in the second — four products.',
         term(p1, 'x') + ' \\times ' + term(p2, 'x') + ' = ' + term(A, 'x^{2}') + ';  ' +
           term(p1, 'x') + ' \\times (' + q2 + ') = ' + term(p1 * q2, 'x') + '.',
         '(' + q1 + ') \\times ' + term(p2, 'x') + ' = ' + term(q1 * p2, 'x') + ';  (' + q1 + ')(' + q2 + ') = ' + C + '.',
         'The two middle terms combine: ' + (p1 * q2) + ' + ' + (q1 * p2) + ' = ' + B + '.',
         'Answer: **' + quad(A, B, C) + '**.']);
    }
    var m = R.nonzero(1, 4), n = R.nonzero(-7, 7);
    var ta = R.nonzero(1, 4), tb = R.nonzero(-7, 7), tc = R.nonzero(-7, 7);
    var c3 = m * ta, c2 = m * tb + n * ta, c1 = m * tc + n * tb, c0 = n * tc;
    return expr('Expand and simplify: ~(' + poly([[m, 'x'], [n, '']]) + ')(' + quad(ta, tb, tc) + ')~',
      c3 + '*x^3+' + c2 + '*x^2+' + c1 + '*x+' + c0,
      ['Multiply each term of the binomial through the trinomial — six products in all.',
       term(m, 'x') + ' across: ' + poly([[m * ta, 'x^{3}'], [m * tb, 'x^{2}'], [m * tc, 'x']]) + '.',
       '(' + n + ') across: ' + poly([[n * ta, 'x^{2}'], [n * tb, 'x'], [n * tc, '']]) + '.',
       'Add and collect like powers: **' + poly([[c3, 'x^{3}'], [c2, 'x^{2}'], [c1, 'x'], [c0, '']]) + '**.',
       'Lining the partial products up by power makes the collecting step hard to get wrong.']);
  });

  g('special-products', function (R, d) {
    var k = R.nonzero(1, 6), c = R.int(1, 9);
    var kind = R.pick(['square-plus', 'square-minus', 'difference', 'recognise']);
    if (kind === 'square-plus' || kind === 'square-minus') {
      var sgn = kind === 'square-plus' ? 1 : -1;
      return expr('Expand using the square rule: ~(' + poly([[k, 'x'], [sgn * c, '']]) + ')^{2}~',
        quadSrc(k * k, 2 * k * sgn * c, c * c),
        ['~(a ' + (sgn > 0 ? '+' : '-') + ' b)^{2} = a^{2} ' + (sgn > 0 ? '+' : '-') + ' 2ab + b^{2}~.',
         'Here ~a = ' + term(k, 'x') + '~ and ~b = ' + c + '~.',
         '~a^{2} = ' + (k * k) + 'x^{2}~, ~2ab = ' + Math.abs(2 * k * c) + 'x~ (with sign ' +
           (sgn > 0 ? '+' : '-') + '), ~b^{2} = ' + (c * c) + '~.',
         'Answer: **' + quad(k * k, 2 * k * sgn * c, c * c) + '**.',
         'The middle term is the one people forget: ~(x ' + (sgn > 0 ? '+' : '-') + ' ' + c +
           ')^{2}~ is *not* ~x^{2} ' + (sgn > 0 ? '+' : '-') + ' ' + (c * c) + '~.']);
    }
    if (kind === 'difference') {
      return expr('Expand: ~(' + poly([[k, 'x'], [c, '']]) + ')(' + poly([[k, 'x'], [-c, '']]) + ')~',
        (k * k) + '*x^2-' + (c * c),
        ['This is ~(a + b)(a - b)~, which collapses to ~a^{2} - b^{2}~.',
         'The two middle terms cancel: ~' + term(-k * c, 'x') + '~ and ~' + term(k * c, 'x') + '~.',
         'Left with ~(' + term(k, 'x') + ')^{2} - (' + c + ')^{2} = ~**' +
           poly([[k * k, 'x^{2}'], [-c * c, '']]) + '**.',
         'Spotting this pattern backwards is what makes difference-of-squares factoring quick.']);
    }
    var right = '~' + poly([[k * k, 'x^{2}'], [-c * c, '']]) + '~';
    var sh = choiceSet(R, right, ['~' + quad(k * k, 2 * k * c, c * c) + '~',
      '~' + quad(k * k, -2 * k * c, c * c) + '~', '~' + poly([[k * k, 'x^{2}'], [c * c, '']]) + '~']);
    return mc('Which expansion belongs to ~(' + poly([[k, 'x'], [c, '']]) + ')(' +
      poly([[k, 'x'], [-c, '']]) + ')~?', sh.choices, sh.answer,
      ['Opposite signs in otherwise identical brackets is the difference of squares.',
       'The middle terms cancel, leaving ~a^{2} - b^{2}~.',
       'Answer: **' + poly([[k * k, 'x^{2}'], [-c * c, '']]) + '**. No middle term survives.']);
  });

  g('poly-divide', function (R, d) {
    var mode = R.pick(d === 1 ? ['monomial'] : ['monomial', 'binomial']);
    if (mode === 'monomial') {
      var k = R.nonzero(2, 6), p = R.int(1, 2);
      var a = k * R.nonzero(1, 6), b = k * R.nonzero(1, 6);
      return expr('Divide: ~\\f{' + poly([[a, 'x^{' + (p + 2) + '}'], [b, 'x^{' + (p + 1) + '}']]) + '}{' +
        term(k, 'x^{' + p + '}') + '}~',
        (a / k) + '*x^2+' + (b / k) + '*x',
        ['Divide each term on top by the bottom separately.',
         term(a, 'x^{' + (p + 2) + '}') + ' \\div ' + term(k, 'x^{' + p + '}') + ' = ' +
           term(a / k, 'x^{2}') + ' — divide the numbers, subtract the powers.',
         term(b, 'x^{' + (p + 1) + '}') + ' \\div ' + term(k, 'x^{' + p + '}') + ' = ' + term(b / k, 'x') + '.',
         'Answer: **' + poly([[a / k, 'x^{2}'], [b / k, 'x']]) + '**.']);
    }
    /* build (x + r)(ax + b) so the division is exact */
    var r = R.nonzero(-7, 7), aa = R.nonzero(1, 5), bb = R.nonzero(-8, 8);
    var A = aa, B = aa * r + bb, C = bb * r;
    return expr('Divide: ~\\f{' + quad(A, B, C) + '}{x ' + (r < 0 ? '- ' + Math.abs(r) : '+ ' + r) + '}~',
      aa + '*x+' + bb,
      ['Ask what the first term of the answer must be: ~' + term(A, 'x^{2}') + ' \\div x = ' +
        term(aa, 'x') + '~.',
       'Multiply back and subtract: ~' + term(aa, 'x') + '(x ' + (r < 0 ? '- ' + Math.abs(r) : '+ ' + r) + ') = ' +
         poly([[A, 'x^{2}'], [aa * r, 'x']]) + '~, leaving ~' + poly([[bb, 'x'], [C, '']]) + '~.',
       'Repeat: ~' + term(bb, 'x') + ' \\div x = ' + bb + '~, and ' + bb + '(x ' +
         (r < 0 ? '- ' + Math.abs(r) : '+ ' + r) + ') takes the rest exactly, remainder 0.',
       'Answer: **' + poly([[aa, 'x'], [bb, '']]) + '**.',
       'A remainder of zero means the divisor was a factor — which is the factor theorem in action.']);
  });

  g('factor-gcf', function (R, d) {
    var k = R.int(2, 9), p = R.int(0, 2);
    var a = R.nonzero(1, 7), b = R.nonzero(-9, 9), c = R.nonzero(-9, 9);
    while (MC.gcd(MC.gcd(a, Math.abs(b)), Math.abs(c)) !== 1) { a = R.nonzero(1, 7); b = R.nonzero(-9, 9); c = R.nonzero(-9, 9); }
    var inner = poly([[a, 'x^{2}'], [b, 'x'], [c, '']]);
    var shown = poly([[k * a, 'x^{' + (p + 2) + '}'], [k * b, p + 1 === 1 ? 'x' : 'x^{' + (p + 1) + '}'],
                      [k * c, p === 0 ? '' : (p === 1 ? 'x' : 'x^{' + p + '}')]]);
    var pw = p === 1 ? 'x' : 'x^{' + p + '}';
    var outside = p === 0 ? String(k) : term(k, pw);
    var srcOut = p === 0 ? String(k) : k + '*x' + (p === 1 ? '' : '^' + p);
    return expr('Factor out the greatest common factor: ~' + shown + '~',
      srcOut + '*(' + a + '*x^2+' + b + '*x+' + c + ')',
      ['Look for the largest number dividing every coefficient: ' + MC.gcd(MC.gcd(k * a, Math.abs(k * b)), Math.abs(k * c)) + '.',
       p > 0 ? 'Every term also carries at least ~x^{' + p + '}~, so that comes out too.'
             : 'No power of ~x~ is common to all three terms, so only the number comes out.',
       'Outside: ~' + outside + '~. Inside: ~' + inner + '~.',
       'Answer: **' + outside + '(' + inner + ')**. Expand it back to check nothing was dropped.'],
      { requireFactored: true });
  });

  g('factor-trinomial-1', function (R, d) {
    var p = R.nonzero(-9, 9), q = R.nonzero(-9, 9);
    var b = p + q, c = p * q;
    return expr('Factor: ~' + quad(1, b, c) + '~',
      '(x+' + p + ')*(x+' + q + ')',
      ['You need two numbers that multiply to ' + c + ' and add to ' + b + '.',
       'Those are ' + p + ' and ' + q + ': ' + p + ' \\times ' + q + ' = ' + c + ' and ' + p + ' + ' + q + ' = ' + b + '.',
       'So it factors as **(x ' + (p < 0 ? '- ' + Math.abs(p) : '+ ' + p) + ')(x ' +
         (q < 0 ? '- ' + Math.abs(q) : '+ ' + q) + ')**.',
       c > 0 ? 'A positive constant means both numbers share a sign — the sign of the middle term.'
             : 'A negative constant means the two numbers have opposite signs.'],
      { requireFactored: true });
  });

  g('factor-trinomial-a', function (R, d) {
    var m = R.nonzero(2, 5), n = R.nonzero(-7, 7), p = R.nonzero(1, 4), q = R.nonzero(-7, 7);
    while (MC.gcd(MC.gcd(m * p, Math.abs(m * q + n * p)), Math.abs(n * q)) !== 1) {
      m = R.nonzero(2, 5); n = R.nonzero(-7, 7); p = R.nonzero(1, 4); q = R.nonzero(-7, 7);
    }
    var A = m * p, B = m * q + n * p, C = n * q;
    return expr('Factor: ~' + quad(A, B, C) + '~',
      '(' + m + '*x+' + n + ')*(' + p + '*x+' + q + ')',
      ['With a leading coefficient, use the AC method: multiply ~a \\times c = ' + A + ' \\times ' + C +
        ' = ' + (A * C) + '~.',
       'Find two numbers multiplying to ' + (A * C) + ' and adding to ' + B + ': they are ' + (m * q) +
         ' and ' + (n * p) + '.',
       'Split the middle term and group: ~' + poly([[A, 'x^{2}'], [m * q, 'x']]) + '~ and ~' +
         poly([[n * p, 'x'], [C, '']]) + '~.',
       'Factor each pair and the common bracket appears.',
       'Answer: **(' + poly([[m, 'x'], [n, '']]) + ')(' + poly([[p, 'x'], [q, '']]) + ')**.'],
      { requireFactored: true });
  });

  g('factor-difference-squares', function (R, d) {
    var k = R.pick([1, 2, 3, 4, 5, 6, 7, 9, 10]), c = R.int(1, 12);
    var mode = R.pick(d === 1 ? ['plain'] : ['plain', 'notDiff']);
    if (mode === 'notDiff') {
      var sh = choiceSet(R, 'It does not factor over the integers',
        ['~(' + poly([[k, 'x'], [c, '']]) + ')^{2}~', '~(' + poly([[k, 'x'], [c, '']]) + ')(' +
          poly([[k, 'x'], [-c, '']]) + ')~', '~(' + poly([[k, 'x'], [c, '']]) + ')(' +
          poly([[k, 'x'], [c, '']]) + ')~']);
      return mc('How does ~' + poly([[k * k, 'x^{2}'], [c * c, '']]) + '~ factor over the integers?',
        sh.choices, sh.answer,
        ['This is a *sum* of squares, not a difference.',
         'The difference-of-squares rule needs a minus sign: ~a^{2} - b^{2} = (a+b)(a-b)~. There is no matching rule for ~a^{2} + b^{2}~.',
         'So **it does not factor over the integers**. Only the difference version factors.']);
    }
    return expr('Factor: ~' + poly([[k * k, 'x^{2}'], [-c * c, '']]) + '~',
      '(' + k + '*x+' + c + ')*(' + k + '*x-' + c + ')',
      ['Both terms are perfect squares and they are subtracted: ~(' + term(k, 'x') + ')^{2} - (' + c + ')^{2}~.',
       'Apply ~a^{2} - b^{2} = (a + b)(a - b)~ with ~a = ' + term(k, 'x') + '~ and ~b = ' + c + '~.',
       'Answer: **(' + poly([[k, 'x'], [c, '']]) + ')(' + poly([[k, 'x'], [-c, '']]) + ')**.',
       'Check by expanding: the middle terms cancel, which is the signature of this pattern.'],
      { requireFactored: true });
  });

  g('factor-grouping', function (R, d) {
    var a = R.nonzero(1, 5), b = R.nonzero(-7, 7), c = R.nonzero(1, 5), e = R.nonzero(-7, 7);
    /* (ax + b)(cx^2 + e) expanded has four terms that group cleanly */
    var t3 = a * c, t2 = b * c, t1 = a * e, t0 = b * e;
    return expr('Factor by grouping: ~' + poly([[t3, 'x^{3}'], [t2, 'x^{2}'], [t1, 'x'], [t0, '']]) + '~',
      '(' + a + '*x+' + b + ')*(' + c + '*x^2+' + e + ')',
      ['Split into two pairs: ~(' + poly([[t3, 'x^{3}'], [t2, 'x^{2}']]) + ')~ and ~(' +
        poly([[t1, 'x'], [t0, '']]) + ')~.',
       'Factor each pair: ~' + term(c, 'x^{2}') + '(' + poly([[a, 'x'], [b, '']]) + ')~ and ~' +
         e + '(' + poly([[a, 'x'], [b, '']]) + ')~.',
       'Both now share the bracket ~(' + poly([[a, 'x'], [b, '']]) + ')~, so take it out.',
       'Answer: **(' + poly([[a, 'x'], [b, '']]) + ')(' + poly([[c, 'x^{2}'], [e, '']]) + ')**.',
       'If the two brackets do not come out identical, try pairing the terms differently before giving up.'],
      { requireFactored: true });
  });

  g('factor-strategy', function (R, d) {
    var kinds = [
      { q: function () { var k = R.int(2, 8), a = R.nonzero(1, 5), b = R.nonzero(-7, 7);
          return { e: poly([[k * a, 'x^{2}'], [k * b, 'x']]), ans: 'Common factor first' }; } },
      { q: function () { var k = R.int(1, 8), c = R.int(1, 9);
          return { e: poly([[k * k, 'x^{2}'], [-c * c, '']]), ans: 'Difference of squares' }; } },
      { q: function () { var p = R.nonzero(-8, 8), r = R.nonzero(-8, 8);
          return { e: quad(1, p + r, p * r), ans: 'Trinomial with leading coefficient 1' }; } },
      { q: function () { var a = R.nonzero(2, 5), b = R.nonzero(-6, 6), c = R.nonzero(1, 4), e = R.nonzero(-6, 6);
          return { e: poly([[a * c, 'x^{3}'], [b * c, 'x^{2}'], [a * e, 'x'], [b * e, '']]), ans: 'Grouping (four terms)' }; } }
    ];
    var pick = R.pick(kinds).q();
    var all = ['Common factor first', 'Difference of squares', 'Trinomial with leading coefficient 1', 'Grouping (four terms)'];
    var sh = choiceSet(R, pick.ans, all.filter(function (o) { return o !== pick.ans; }));
    return mc('Which method would you reach for first to factor ~' + pick.e + '~?', sh.choices, sh.answer,
      ['Look at the number of terms and whether anything is common to all of them.',
       'Here the right first move is **' + pick.ans.toLowerCase() + '**.',
       'The order is always: common factor first, then count the terms — two suggests a difference of squares, three a trinomial, four grouping.']);
  });

  g('quad-zero-product', function (R, d) {
    var p = R.nonzero(-9, 9), q = R.nonzero(-9, 9);
    var lo = Math.min(-p, -q), hi = Math.max(-p, -q);
    var mode = R.pick(['factored', 'toFactor']);
    if (mode === 'factored') {
      return multi('Solve ~(x ' + (p < 0 ? '- ' + Math.abs(p) : '+ ' + p) + ')(x ' +
        (q < 0 ? '- ' + Math.abs(q) : '+ ' + q) + ') = 0~. Give both roots, smaller first.',
        [{ label: 'Smaller root', answer: lo }, { label: 'Larger root', answer: hi }],
        ['If a product is zero, at least one factor must be zero. That is the zero product property.',
         'So ~x ' + (p < 0 ? '- ' + Math.abs(p) : '+ ' + p) + ' = 0~ giving ~x = ' + (-p) +
           '~, or ~x ' + (q < 0 ? '- ' + Math.abs(q) : '+ ' + q) + ' = 0~ giving ~x = ' + (-q) + '~.',
         'Roots **' + lo + '** and **' + hi + '**.',
         'The property only works against zero. If the product equalled 6 you could not split it like this.']);
    }
    var b = -(p + q) * -1, c = p * q;
    return multi('Solve ~' + quad(1, p + q, p * q) + ' = 0~ by factoring. Give both roots, smaller first.',
      [{ label: 'Smaller root', answer: lo }, { label: 'Larger root', answer: hi }],
      ['Factor first: two numbers multiplying to ' + (p * q) + ' and adding to ' + (p + q) +
        ' are ' + p + ' and ' + q + '.',
       'So ~(x ' + (p < 0 ? '- ' + Math.abs(p) : '+ ' + p) + ')(x ' +
         (q < 0 ? '- ' + Math.abs(q) : '+ ' + q) + ') = 0~.',
       'Set each factor to zero: ~x = ' + (-p) + '~ or ~x = ' + (-q) + '~.',
       'Roots **' + lo + '** and **' + hi + '**.',
       'Get everything onto one side equal to zero *before* factoring — that step is not optional.']);
  });

  g('quad-square-root', function (R, d) {
    var mode = R.pick(['plain', 'shifted', 'noReal']);
    if (mode === 'plain') {
      var a = R.pick([1, 2, 3, 4, 5]), r = R.int(1, 12);
      var c = a * r * r;
      return multi('Solve ~' + a + 'x^{2} - ' + c + ' = 0~. Give both solutions, smaller first.',
        [{ label: 'Smaller solution', answer: -r }, { label: 'Larger solution', answer: r }],
        ['Isolate the square: ~' + a + 'x^{2} = ' + c + '~, so ~x^{2} = ' + (c / a) + '~.',
         'Take the square root of both sides — and keep **both** signs: ~x = \\pm' + r + '~.',
         'Solutions **-' + r + '** and **' + r + '**.',
         'Writing only the positive root loses half the answer. The ~\\pm~ is the whole point of this method.']);
    }
    if (mode === 'shifted') {
      var h = R.nonzero(-7, 7), k = R.int(1, 10);
      var sq = k * k;
      return multi('Solve ~(x ' + (h < 0 ? '- ' + Math.abs(h) : '+ ' + h) + ')^{2} = ' + sq +
        '~. Give both solutions, smaller first.',
        [{ label: 'Smaller solution', answer: Math.min(-h - k, -h + k) },
         { label: 'Larger solution', answer: Math.max(-h - k, -h + k) }],
        ['Take the root of both sides, keeping both signs: ~x ' + (h < 0 ? '- ' + Math.abs(h) : '+ ' + h) +
          ' = \\pm' + k + '~.',
         'Two equations follow: ~x = ' + (-h) + ' + ' + k + '~ and ~x = ' + (-h) + ' - ' + k + '~.',
         'Solutions **' + Math.min(-h - k, -h + k) + '** and **' + Math.max(-h - k, -h + k) + '**.',
         'This is exactly how completing the square finishes, so it is worth being fluent here.']);
    }
    var cc = R.int(1, 20);
    var sh = choiceSet(R, 'No real solutions', ['Two real solutions', 'One real solution', 'Infinitely many']);
    return mc('How many real solutions does ~x^{2} + ' + cc + ' = 0~ have?', sh.choices, sh.answer,
      ['Rearranged, this says ~x^{2} = -' + cc + '~.',
       'A square of a real number is never negative, so nothing real works.',
       '**No real solutions.** There are two complex ones, which come later.']);
  });

  g('quad-complete-square', function (R, d) {
    var b = R.nonzero(-8, 8) * 2;          /* even, so the halving stays whole */
    var k = R.nonzero(-9, 9);
    var half = b / 2;
    var c = half * half + k;
    var mode = R.pick(['vertexForm', 'solve']);
    if (mode === 'vertexForm') {
      return multi('Write ~' + quad(1, b, c) + '~ in the form ~(x + p)^{2} + q~. Give ~p~ and ~q~.',
        [{ label: 'p', answer: half }, { label: 'q', answer: k }],
        ['Halve the coefficient of ~x~: ' + b + ' \\div 2 = ' + half + '. That is ~p~.',
         '~(x ' + (half < 0 ? '- ' + Math.abs(half) : '+ ' + half) + ')^{2}~ expands to ~' +
           quad(1, b, half * half) + '~, which overshoots the constant by ' + (half * half - c) + '.',
         'Correct it: ~q = ' + c + ' - ' + (half * half) + ' = ' + k + '~.',
         'So it is **(x ' + (half < 0 ? '- ' + Math.abs(half) : '+ ' + half) + ')^{2} ' +
           (k < 0 ? '- ' + Math.abs(k) : '+ ' + k) + '**.',
         'This form hands you the vertex directly, at ~(' + (-half) + ', ' + k + ')~.']);
    }
    /* make the solve case come out exactly */
    var kk = -R.int(1, 10);
    var sq = -kk;
    var root = Math.sqrt(sq);
    if (!Number.isInteger(root)) { kk = -(R.int(1, 6) ** 2); sq = -kk; root = Math.sqrt(sq); }
    var cc2 = half * half + kk;
    return multi('Solve ~' + quad(1, b, cc2) + ' = 0~ by completing the square. Give both roots, smaller first.',
      [{ label: 'Smaller root', answer: Math.min(-half - root, -half + root), tol: 0.005 },
       { label: 'Larger root', answer: Math.max(-half - root, -half + root), tol: 0.005 }],
      ['Half of ' + b + ' is ' + half + ', and ~' + half + '^{2} = ' + (half * half) + '~.',
       'Rewrite: ~(x ' + (half < 0 ? '- ' + Math.abs(half) : '+ ' + half) + ')^{2} ' +
         (kk < 0 ? '- ' + Math.abs(kk) : '+ ' + kk) + ' = 0~.',
       'So ~(x ' + (half < 0 ? '- ' + Math.abs(half) : '+ ' + half) + ')^{2} = ' + sq +
         '~, giving ~x ' + (half < 0 ? '- ' + Math.abs(half) : '+ ' + half) + ' = \\pm' + root + '~.',
       'Roots **' + Math.min(-half - root, -half + root) + '** and **' +
         Math.max(-half - root, -half + root) + '**.',
       'Completing the square always works, even when factoring does not — which is how the quadratic formula is derived.']);
  });

  g('quad-formula', function (R, d) {
    var a = R.nonzero(1, 4), p = R.nonzero(-7, 7), q = R.nonzero(-7, 7);
    var A = a, B = a * (p + q) * -1, C = a * p * q;
    /* a(x-p)(x-q) = a x^2 - a(p+q) x + a p q */
    var lo = Math.min(p, q), hi = Math.max(p, q);
    var disc = B * B - 4 * A * C;
    return multi('Solve ~' + quad(A, B, C) + ' = 0~ using the quadratic formula. Give both roots, smaller first.',
      [{ label: 'Smaller root', answer: lo, tol: 0.005 }, { label: 'Larger root', answer: hi, tol: 0.005 }],
      ['Identify ~a = ' + A + '~, ~b = ' + B + '~, ~c = ' + C + '~.',
       'Discriminant: ~b^{2} - 4ac = ' + (B * B) + ' - 4(' + A + ')(' + C + ') = ' + disc + '~.',
       '~sqrt{' + disc + '} = ' + Math.sqrt(disc) + '~, so ~x = \\f{' + (-B) + ' \\pm ' + Math.sqrt(disc) +
         '}{' + (2 * A) + '}~.',
       'Roots **' + lo + '** and **' + hi + '**.',
       'Note ~-b~, not ~b~: if ~b~ is negative, ~-b~ is positive. That sign is the most common slip in the whole formula.']);
  });

  g('discriminant', function (R, d) {
    var a = R.nonzero(1, 4);
    var kind = R.pick(['two', 'one', 'none']);
    var b, c, disc;
    if (kind === 'two') { b = R.nonzero(-9, 9); c = -R.int(1, 9); disc = b * b - 4 * a * c; }
    else if (kind === 'one') { var h = R.nonzero(1, 5); b = 2 * a * h; c = a * h * h; disc = 0; }
    else { b = R.nonzero(-4, 4); c = R.int(1, 9) + Math.ceil(b * b / (4 * a)); disc = b * b - 4 * a * c; }
    var right = disc > 0 ? 'Two different real roots' : disc === 0 ? 'Exactly one real root' : 'No real roots';
    var sh = choiceSet(R, right, ['Two different real roots', 'Exactly one real root', 'No real roots']
      .filter(function (o) { return o !== right; }));
    return mc('Without solving, how many real roots does ~' + quad(a, b, c) + ' = 0~ have?',
      sh.choices, sh.answer,
      ['The discriminant ~b^{2} - 4ac~ decides it.',
       '~' + (b * b) + ' - 4(' + a + ')(' + c + ') = ' + disc + '~.',
       disc > 0 ? 'Positive, so the square root is a real non-zero number and the ~\\pm~ gives two distinct roots.'
         : disc === 0 ? 'Zero, so the ~\\pm~ adds nothing and both roots coincide — the graph just touches the axis.'
         : 'Negative, so the square root is not real and the parabola never reaches the ~x~-axis.',
       'Answer: **' + right.toLowerCase() + '**.']);
  });

  g('quad-word-problems', function (R, d) {
    var kind = R.pick(['projectile', 'area', 'consecutive']);
    if (kind === 'projectile') {
      var v = R.pick([16, 32, 48, 64, 80]), h0 = R.pick([0, 16, 32, 48]);
      /* h = -16t^2 + vt + h0; ask for time to hit the ground */
      var disc = v * v + 64 * h0;
      var t = (v + Math.sqrt(disc)) / 32;
      return num('A ball is thrown upward from a height of ' + h0 + ' feet at ' + v +
        ' feet per second, so its height is ~h = -16t^{2} + ' + v + 't + ' + h0 +
        '~. After how many seconds does it hit the ground? Round to 2 decimal places.',
        Math.round(t * 100) / 100,
        ['Hitting the ground means ~h = 0~: ~-16t^{2} + ' + v + 't + ' + h0 + ' = 0~.',
         'Quadratic formula with ~a = -16~, ~b = ' + v + '~, ~c = ' + h0 + '~: discriminant ' + disc + '.',
         'The two roots are ' + MC.fmt((v + Math.sqrt(disc)) / 32, 3) + ' and ' +
           MC.fmt((v - Math.sqrt(disc)) / 32, 3) + '.',
         '**' + MC.fmt(t, 2) + ' seconds.** The other root is ' +
           (h0 > 0 ? 'negative, which would be before the throw' : 'zero, the moment it left the ground') +
           ' — discard it, because a quadratic model can produce roots the situation does not allow.'],
        { tol: 0.015 });
    }
    if (kind === 'area') {
      var w = R.int(3, 25), extra = R.int(1, 12);
      var area = w * (w + extra);
      return num('A rectangle is ' + extra + ' cm longer than it is wide and has area ' + area +
        ' cm². How wide is it, in cm?', w,
        ['Let the width be ~x~, so the length is ~x + ' + extra + '~.',
         'Area: ~x(x + ' + extra + ') = ' + area + '~, which expands to ~x^{2} + ' + extra + 'x - ' + area + ' = 0~.',
         'Factoring gives roots ' + w + ' and ' + (-(w + extra)) + '.',
         'A width cannot be negative, so the answer is **' + w + ' cm**.',
         'Checking which root the situation allows is part of the problem, not an afterthought.']);
    }
    var n = R.int(2, 20);
    var prod = n * (n + 1);
    return num('Two consecutive positive whole numbers multiply to ' + prod +
      '. What is the smaller one?', n,
      ['Let them be ~x~ and ~x + 1~: ~x(x + 1) = ' + prod + '~.',
       'So ~x^{2} + x - ' + prod + ' = 0~, which factors to ~(x - ' + n + ')(x + ' + (n + 1) + ') = 0~.',
       'Roots ' + n + ' and ' + (-(n + 1)) + '; only the positive one fits "positive whole numbers".',
       'Smaller number: **' + n + '**.']);
  });

  g('parabola-vertex', function (R, d) {
    var a = R.nonzero(-4, 4), h = R.nonzero(-7, 7), k = R.nonzero(-9, 9);
    var mode = R.pick(['fromVertexForm', 'fromStandard', 'axis']);
    if (mode === 'fromVertexForm') {
      return multi('Find the vertex of ~y = ' + (a === 1 ? '' : a === -1 ? '-' : a) + '(x ' +
        (h < 0 ? '+ ' + Math.abs(h) : '- ' + h) + ')^{2} ' + (k < 0 ? '- ' + Math.abs(k) : '+ ' + k) + '~.',
        [{ label: 'x', answer: h }, { label: 'y', answer: k }],
        ['Vertex form is ~y = a(x - h)^{2} + k~ with the vertex at ~(h, k)~.',
         'The bracket reads ~x ' + (h < 0 ? '+ ' + Math.abs(h) : '- ' + h) + '~, which is ~x - (' + h +
           ')~, so ~h = ' + h + '~.',
         'Vertex **(' + h + ', ' + k + ')**.',
         'The sign inside the bracket flips — that catch is worth checking every single time.']);
    }
    if (mode === 'fromStandard') {
      var B = -2 * a * h, C = a * h * h + k;
      return multi('Find the vertex of ~y = ' + quad(a, B, C) + '~.',
        [{ label: 'x', answer: h, tol: 0.005 }, { label: 'y', answer: k, tol: 0.005 }],
        ['The vertex sits on the axis of symmetry, at ~x = -\\f{b}{2a}~.',
         '~x = -\\f{' + B + '}{2(' + a + ')} = ' + h + '~.',
         'Substitute back for ~y~: ~y = ' + k + '~.',
         'Vertex **(' + h + ', ' + k + ')**.']);
    }
    var B2 = -2 * a * h, C2 = a * h * h + k;
    return num('What is the axis of symmetry of ~y = ' + quad(a, B2, C2) + '~? Give the value of ~x~.', h,
      ['The axis of symmetry is the vertical line through the vertex: ~x = -\\f{b}{2a}~.',
       '~x = -\\f{' + B2 + '}{2(' + a + ')} = ~**' + h + '**.',
       'The two roots, when they exist, sit at equal distances either side of this line.'], { tol: 0.005 });
  });

  g('parabola-graph', function (R, d) {
    var p = R.nonzero(-7, 7), q = R.nonzero(-7, 7);
    while (q === p) q = R.nonzero(-7, 7);
    var a = R.pick([1, -1, 2, -2]);
    var B = -a * (p + q), C = a * p * q;
    var mode = R.pick(['roots', 'yIntercept', 'direction']);
    if (mode === 'roots') {
      var lo = Math.min(p, q), hi = Math.max(p, q);
      return multi('Where does ~y = ' + quad(a, B, C) + '~ cross the ~x~-axis? Give both values, smaller first.',
        [{ label: 'Smaller x', answer: lo }, { label: 'Larger x', answer: hi }],
        ['Crossing the ~x~-axis means ~y = 0~, so solve ~' + quad(a, B, C) + ' = 0~.',
         'Taking out ' + a + ' and factoring gives ~(x ' + (-p < 0 ? '- ' + Math.abs(p) : '+ ' + (-p)) +
           ')(x ' + (-q < 0 ? '- ' + Math.abs(q) : '+ ' + (-q)) + ') = 0~.',
         'Crossings at **' + lo + '** and **' + hi + '**.',
         'The vertex sits halfway between them, at ~x = ' + MC.fmt((p + q) / 2, 4) + '~ — a free extra point for the sketch.']);
    }
    if (mode === 'yIntercept') {
      return num('Where does ~y = ' + quad(a, B, C) + '~ cross the ~y~-axis? Give the value of ~y~.', C,
        ['On the ~y~-axis, ~x = 0~.',
         'Every term with an ~x~ vanishes, leaving the constant: **' + C + '**.',
         'The ~y~-intercept of any polynomial in standard form is just its constant term.']);
    }
    var sh = shuffleChoices(R, ['Upward, so the vertex is the lowest point',
      'Downward, so the vertex is the highest point'], a > 0 ? 0 : 1);
    return mc('Does ~y = ' + quad(a, B, C) + '~ open upward or downward?', sh.choices, sh.answer,
      ['The sign of the ~x^{2}~ coefficient decides it.',
       'Here it is ' + a + ', which is ' + (a > 0 ? 'positive' : 'negative') + '.',
       'So it opens **' + (a > 0 ? 'upward' : 'downward') + '**, and the vertex is the ' +
         (a > 0 ? 'minimum' : 'maximum') + '.']);
  });

  g('parabola-transformations', function (R, d) {
    var a = R.pick([1, -1, 2, -2, 3]), h = R.nonzero(-6, 6), k = R.nonzero(-8, 8);
    var mode = R.pick(['describe', 'build', 'width']);
    if (mode === 'describe') {
      var right = (h > 0 ? 'right ' + h : 'left ' + Math.abs(h)) + ', ' +
        (k > 0 ? 'up ' + k : 'down ' + Math.abs(k));
      var wrong = [(h > 0 ? 'left ' + h : 'right ' + Math.abs(h)) + ', ' + (k > 0 ? 'up ' + k : 'down ' + Math.abs(k)),
        (h > 0 ? 'right ' + h : 'left ' + Math.abs(h)) + ', ' + (k > 0 ? 'down ' + k : 'up ' + Math.abs(k)),
        (h > 0 ? 'left ' + h : 'right ' + Math.abs(h)) + ', ' + (k > 0 ? 'down ' + k : 'up ' + Math.abs(k))];
      var sh = choiceSet(R, right, wrong);
      return mc('How has ~y = x^{2}~ been moved to give ~y = (x ' +
        (h < 0 ? '+ ' + Math.abs(h) : '- ' + h) + ')^{2} ' + (k < 0 ? '- ' + Math.abs(k) : '+ ' + k) + '~?',
        sh.choices, sh.answer,
        ['Inside the bracket moves the graph horizontally, and *against* the sign you see: ~(x - 3)^{2}~ goes right 3.',
         'Outside, added at the end, moves it vertically and with the sign you see.',
         'So: **' + right + '**.',
         'Horizontal shifts feeling backwards is normal — the bracket asks what input makes it zero.']);
    }
    if (mode === 'build') {
      return expr('Starting from ~y = x^{2}~, shift ' + (h > 0 ? 'right ' + h : 'left ' + Math.abs(h)) +
        ' and ' + (k > 0 ? 'up ' + k : 'down ' + Math.abs(k)) +
        '. Write the result (enter the right-hand side only).',
        '(x-' + h + ')^2+' + k,
        ['A shift of ' + h + ' horizontally means ~(x - ' + h + ')~ inside the bracket.',
         'A shift of ' + k + ' vertically means ~+ (' + k + ')~ on the end.',
         'Answer: **(x ' + (h < 0 ? '+ ' + Math.abs(h) : '- ' + h) + ')^{2} ' +
           (k < 0 ? '- ' + Math.abs(k) : '+ ' + k) + '**.']);
    }
    var sh2 = shuffleChoices(R, [Math.abs(a) > 1 ? 'Narrower than ~y = x^{2}~' : 'The same width as ~y = x^{2}~',
      Math.abs(a) > 1 ? 'Wider than ~y = x^{2}~' : 'Narrower than ~y = x^{2}~'], 0);
    return mc('Compared with ~y = x^{2}~, is the graph of ~y = ' + (a === 1 ? '' : a === -1 ? '-' : a) +
      'x^{2}~ narrower, wider, or the same?', sh2.choices, sh2.answer,
      ['The size of the coefficient controls the stretch; its sign only flips the graph over.',
       '~|' + a + '| = ' + Math.abs(a) + '~, which is ' + (Math.abs(a) > 1 ? 'greater than 1, so the graph is stretched vertically and looks narrower' : 'equal to 1, so the width is unchanged') + '.',
       'Answer: **' + (Math.abs(a) > 1 ? 'narrower' : 'the same width') + '**.',
       'A coefficient between 0 and 1 would make it wider.']);
  });

  g('max-min-quadratic', function (R, d) {
    var kind = R.pick(['revenue', 'fence', 'height']);
    if (kind === 'revenue') {
      var p0 = R.int(10, 40), drop = R.int(1, 5), q0 = R.int(40, 200);
      /* quantity = q0 - drop*(p - p0); revenue = p * quantity, maximise */
      var bestP = (q0 + drop * p0) / (2 * drop);
      var bestPr = Math.round(bestP * 100) / 100;
      return num('At ' + MC.money(p0) + ' a shop sells ' + q0 + ' units a week, and every ' +
        MC.money(1) + ' price rise loses ' + drop + ' sales. What price maximises revenue, in dollars? ' +
        'Round to 2 decimal places.', bestPr,
        ['Let ~p~ be the price. Sales are ~' + q0 + ' - ' + drop + '(p - ' + p0 + ')~, so revenue is ~R = p(' +
          (q0 + drop * p0) + ' - ' + drop + 'p)~.',
         'Expanded: ~R = -' + drop + 'p^{2} + ' + (q0 + drop * p0) + 'p~ — a downward parabola, so its vertex is the maximum.',
         'Vertex at ~p = -\\f{b}{2a} = \\f{' + (q0 + drop * p0) + '}{' + (2 * drop) + '} = ' + MC.fmt(bestP, 4) + '~.',
         'Best price **' + MC.money(bestPr) + '**.',
         'Revenue problems are quadratic because price multiplies quantity and quantity itself falls with price.'],
        { unit: 'dollars', tol: 0.02 });
    }
    if (kind === 'fence') {
      var perim = R.int(5, 60) * 4;
      var side = perim / 4, area = side * side;
      return num('You have ' + perim + ' m of fencing for a rectangular pen. What is the largest area ' +
        'you can enclose, in square metres?', area,
        ['With perimeter ' + perim + ', if one side is ~x~ the other is ~' + (perim / 2) + ' - x~.',
         'Area ~A = x(' + (perim / 2) + ' - x) = -x^{2} + ' + (perim / 2) + 'x~, a downward parabola.',
         'Vertex at ~x = \\f{' + (perim / 2) + '}{2} = ' + side + '~, so both sides are ' + side + ' — a square.',
         'Largest area **' + MC.commas(area) + ' m²**.',
         'For a fixed perimeter the square always wins. The algebra confirms what the symmetry suggests.']);
    }
    var v = R.pick([32, 48, 64, 80, 96]), h0 = R.pick([0, 8, 16, 32]);
    var tTop = v / 32, hTop = -16 * tTop * tTop + v * tTop + h0;
    return num('A ball thrown upward from ' + h0 + ' feet has height ~h = -16t^{2} + ' + v + 't + ' + h0 +
      '~. What is its greatest height, in feet?', hTop,
      ['The maximum is at the vertex: ~t = -\\f{b}{2a} = \\f{' + v + '}{32} = ' + MC.fmt(tTop, 4) + '~ seconds.',
       'Substitute that time back into the height rule.',
       'Greatest height **' + MC.fmt(hTop, 4) + ' feet**.',
       'The vertex gives *when* and *how high* — the question asks which, so read it carefully.'],
      { tol: 0.02 });
  });

  g('rational-simplify', function (R, d) {
    var p = R.nonzero(-8, 8), q = R.nonzero(-8, 8);
    while (q === p) q = R.nonzero(-8, 8);
    var mode = R.pick(['cancelFactor', 'excluded']);
    var topF = '(x ' + (p < 0 ? '- ' + Math.abs(p) : '+ ' + p) + ')(x ' + (q < 0 ? '- ' + Math.abs(q) : '+ ' + q) + ')';
    if (mode === 'excluded') {
      var lo = Math.min(-p, -q), hi = Math.max(-p, -q);
      return multi('For ~\\f{x + 1}{' + topF + '}~, which values of ~x~ must be excluded? ' +
        'Give both, smaller first.',
        [{ label: 'Smaller excluded value', answer: lo }, { label: 'Larger excluded value', answer: hi }],
        ['A rational expression is *undefined* wherever its denominator is zero.',
         'Set each factor to zero: ~x = ' + (-p) + '~ and ~x = ' + (-q) + '~.',
         'Excluded: **' + lo + '** and **' + hi + '**.',
         'Find the exclusions from the *original* denominator, before any cancelling — a cancelled factor still breaks the expression.']);
    }
    var r = R.nonzero(-8, 8);
    while (r === p || r === q) r = R.nonzero(-8, 8);
    /* (x+p)(x+q) / (x+p)(x+r) cancels to (x+q)/(x+r) */
    return expr('Simplify ~\\f{' + quad(1, p + q, p * q) + '}{' + quad(1, p + r, p * r) + '}~',
      '(x+' + q + ')/(x+' + r + ')',
      ['Factor top and bottom: ~\\f{(x ' + (p < 0 ? '- ' + Math.abs(p) : '+ ' + p) + ')(x ' +
        (q < 0 ? '- ' + Math.abs(q) : '+ ' + q) + ')}{(x ' + (p < 0 ? '- ' + Math.abs(p) : '+ ' + p) +
        ')(x ' + (r < 0 ? '- ' + Math.abs(r) : '+ ' + r) + ')}~.',
       'The factor ~(x ' + (p < 0 ? '- ' + Math.abs(p) : '+ ' + p) + ')~ appears top and bottom, so it cancels.',
       'Answer: **~\\f{x ' + (q < 0 ? '- ' + Math.abs(q) : '+ ' + q) + '}{x ' +
         (r < 0 ? '- ' + Math.abs(r) : '+ ' + r) + '}~**, with ~x \\ne ' + (-p) + '~ still excluded.',
       'You may only cancel *factors*, never individual terms. Crossing out an ~x~ from a sum is the classic error.']);
  });

  g('rational-mult-div', function (R, d) {
    var a = R.nonzero(-7, 7), b = R.nonzero(-7, 7), c = R.nonzero(-7, 7);
    while (b === a) b = R.nonzero(-7, 7);
    while (c === a || c === b) c = R.nonzero(-7, 7);
    var divide = R.bool();
    function fac(k) { return 'x ' + (k < 0 ? '- ' + Math.abs(k) : '+ ' + k); }
    if (divide) {
      return expr('Simplify ~\\f{' + fac(a) + '}{' + fac(b) + '} \\div \\f{' + fac(c) + '}{' + fac(b) + '}~',
        '(x+' + a + ')/(x+' + c + ')',
        ['Dividing by a fraction means multiplying by its reciprocal — flip the second one.',
         '~\\f{' + fac(a) + '}{' + fac(b) + '} \\times \\f{' + fac(b) + '}{' + fac(c) + '}~.',
         'Now ~' + fac(b) + '~ appears both top and bottom and cancels.',
         'Answer: **~\\f{' + fac(a) + '}{' + fac(c) + '}~**.']);
    }
    return expr('Simplify ~\\f{' + fac(a) + '}{' + fac(b) + '} \\times \\f{' + fac(b) + '}{' + fac(c) + '}~',
      '(x+' + a + ')/(x+' + c + ')',
      ['Multiply straight across, but look for common factors first — cancelling early keeps it small.',
       '~' + fac(b) + '~ is on the top of one and the bottom of the other, so it cancels.',
       'Answer: **~\\f{' + fac(a) + '}{' + fac(c) + '}~**.',
       'Factoring everything before multiplying is what makes these quick rather than grim.']);
  });

  g('rational-add-sub', function (R, d) {
    var a = R.nonzero(1, 9), b = R.nonzero(1, 9), k = R.nonzero(-7, 7);
    var mode = R.pick(['numberDen', 'linearDen']);
    if (mode === 'numberDen') {
      var L = MC.lcm(a, b);
      var sub = R.bool(0.4);
      var n1 = L / a, n2 = L / b;
      var topCoef = n1 + (sub ? -1 : 1) * n2;
      return expr('Combine into a single fraction: ~\\f{x}{' + a + '} ' + (sub ? '-' : '+') +
        ' \\f{x}{' + b + '}~', '(' + topCoef + '*x)/' + L,
        ['The least common denominator of ' + a + ' and ' + b + ' is ' + L + '.',
         'Rewrite: ~\\f{' + n1 + 'x}{' + L + '} ' + (sub ? '-' : '+') + ' \\f{' + n2 + 'x}{' + L + '}~.',
         (sub ? 'Subtract' : 'Add') + ' the numerators: ~\\f{' + topCoef + 'x}{' + L + '}~.',
         'Answer: **~\\f{' + topCoef + 'x}{' + L + '}~**.']);
    }
    /* 1/(x+k) + 1/x  ->  (2x+k)/(x(x+k)) */
    return expr('Combine into a single fraction: ~\\f{1}{x ' + (k < 0 ? '- ' + Math.abs(k) : '+ ' + k) +
      '} + \\f{1}{x}~', '(2*x+' + k + ')/(x*(x+' + k + '))',
      ['The denominators share nothing, so the common denominator is their product: ~x(x ' +
        (k < 0 ? '- ' + Math.abs(k) : '+ ' + k) + ')~.',
       'Rewrite each: ~\\f{x}{x(x ' + (k < 0 ? '- ' + Math.abs(k) : '+ ' + k) + ')} + \\f{x ' +
         (k < 0 ? '- ' + Math.abs(k) : '+ ' + k) + '}{x(x ' + (k < 0 ? '- ' + Math.abs(k) : '+ ' + k) + ')}~.',
       'Add the numerators: ~x + x ' + (k < 0 ? '- ' + Math.abs(k) : '+ ' + k) + ' = ' +
         poly([[2, 'x'], [k, '']]) + '~.',
       'Answer: **~\\f{' + poly([[2, 'x'], [k, '']]) + '}{x(x ' +
         (k < 0 ? '- ' + Math.abs(k) : '+ ' + k) + ')}~**.',
       'Adding denominators is never a step. ~\\f{1}{a} + \\f{1}{b}~ is not ~\\f{1}{a+b}~ — test it with numbers if you doubt it.']);
  });

  g('rational-equations', function (R, d) {
    var mode = R.pick(['proportion', 'extraneous']);
    if (mode === 'proportion') {
      var k = R.nonzero(-8, 8), a = R.nonzero(1, 7), b = R.nonzero(1, 7);
      /* a/(x+k) = b  ->  x = a/b - k */
      var x = R.nonzero(-8, 8);
      while (x + k === 0) x = R.nonzero(-8, 8);
      var num_ = b * (x + k);
      return num('Solve ~\\f{' + num_ + '}{x ' + (k < 0 ? '- ' + Math.abs(k) : '+ ' + k) + '} = ' + b + '~',
        x,
        ['Multiply both sides by the denominator: ~' + num_ + ' = ' + b + '(x ' +
          (k < 0 ? '- ' + Math.abs(k) : '+ ' + k) + ')~.',
         'Expand and solve: ~' + num_ + ' = ' + term(b, 'x') + ' + ' + (b * k) + '~, so ~x = ' + x + '~.',
         '~x = ~**' + x + '**. It does not make the denominator zero, so it is valid.'],
        { tol: 0.005 });
    }
    /* x^2/(x-a) = a^2/(x-a) style trap: the only algebraic solution is excluded */
    var a2 = R.nonzero(2, 9);
    var sh = choiceSet(R, 'No solution', ['~x = ' + a2 + '~', '~x = ' + (-a2) + '~', '~x = 0~']);
    return mc('Solve ~\\f{x}{x - ' + a2 + '} = \\f{' + a2 + '}{x - ' + a2 + '}~', sh.choices, sh.answer,
      ['The denominators match, so the numerators must be equal: ~x = ' + a2 + '~.',
       'But check it against the original: at ~x = ' + a2 + '~ the denominator ~x - ' + a2 +
         '~ becomes zero, and division by zero is *undefined*.',
       'So ~x = ' + a2 + '~ is an **extraneous solution** and the equation has **no solution**.',
       'Multiplying by an expression containing the variable can introduce answers that do not belong. Checking every candidate in the original equation is not optional.']);
  });

  g('radical-operations', function (R, d) {
    var mode = R.pick(d === 1 ? ['combine', 'simplifyMult'] : ['combine', 'simplifyMult', 'rationalise']);
    if (mode === 'combine') {
      var k = R.pick([2, 3, 5, 6, 7, 10, 11]);
      var c1 = R.nonzero(1, 7), c2 = R.nonzero(1, 7);
      var sub = R.bool(0.4);
      var res = c1 + (sub ? -1 : 1) * c2;
      return num('Simplify ~' + c1 + 'sqrt{' + k + '} ' + (sub ? '-' : '+') + ' ' + c2 + 'sqrt{' + k +
        '}~. Enter the number in front of ~sqrt{' + k + '}~.', res,
        ['Like radicals combine the same way like terms do — the ~sqrt{' + k + '}~ is just a common factor.',
         c1 + ' ' + (sub ? '-' : '+') + ' ' + c2 + ' = ' + res + '.',
         'So the answer is **' + res + '**~sqrt{' + k + '}~.',
         'Only identical radicals combine: ~sqrt{2} + sqrt{3}~ cannot be simplified at all.']);
    }
    if (mode === 'simplifyMult') {
      var a = R.pick([2, 3, 5, 6, 7]), b = R.pick([2, 3, 5, 6, 7]);
      var prod = a * b, out = Math.sqrt(MC.squareFactor(prod)), inside = prod / (out * out);
      return multi('Simplify ~sqrt{' + a + '} \\times sqrt{' + b + '}~ to the form ~a\\,sqrt{b}~. Give ~a~ and ~b~.',
        [{ label: 'a (outside)', answer: out }, { label: 'b (inside)', answer: inside }],
        ['Roots multiply under one sign: ~sqrt{' + a + '} \\times sqrt{' + b + '} = sqrt{' + prod + '}~.',
         out > 1 ? 'Now pull out the largest square factor: ~' + prod + ' = ' + (out * out) + ' \\times ' +
             inside + '~, so ~sqrt{' + prod + '} = ' + out + 'sqrt{' + inside + '}~.'
           : 'There is no square factor to pull out, so it stays as ~sqrt{' + prod + '}~ (outside is 1).',
         'Answer: **' + out + 'sqrt{' + inside + '}**.']);
    }
    var den = R.pick([2, 3, 5, 6, 7, 10]), top = R.nonzero(1, 9);
    var g0 = MC.gcd(top, den);
    return multi('Rationalise the denominator of ~\\f{' + top + '}{sqrt{' + den +
      '}}~ and write it as ~\\f{a\\,sqrt{' + den + '}}{b}~. Give ~a~ and ~b~.',
      [{ label: 'a (numerator coefficient)', answer: top / g0 }, { label: 'b (denominator)', answer: den / g0 }],
      ['Multiply top and bottom by ~sqrt{' + den + '}~ — that is multiplying by 1, so the value is unchanged.',
       '~\\f{' + top + '}{sqrt{' + den + '}} \\times \\f{sqrt{' + den + '}}{sqrt{' + den + '}} = \\f{' +
         top + 'sqrt{' + den + '}}{' + den + '}~.',
       g0 > 1 ? 'Reduce by ' + g0 + ': ~\\f{' + (top / g0) + 'sqrt{' + den + '}}{' + (den / g0) + '}~.'
              : 'Nothing reduces, so that is the answer.',
       'Answer: **~\\f{' + (top / g0) + 'sqrt{' + den + '}}{' + (den / g0) + '}~**.',
       'A radical in the denominator is not *wrong*, but the rationalised form is the standard one and makes answers comparable.']);
  });

  g('radical-equations', function (R, d) {
    var mode = R.pick(['solve', 'extraneous']);
    if (mode === 'solve') {
      var k = R.nonzero(-9, 9), r = R.int(1, 10);
      /* sqrt(x + k) = r  ->  x = r^2 - k */
      return num('Solve ~sqrt{x ' + (k < 0 ? '- ' + Math.abs(k) : '+ ' + k) + '} = ' + r + '~',
        r * r - k,
        ['Square both sides to clear the root: ~x ' + (k < 0 ? '- ' + Math.abs(k) : '+ ' + k) + ' = ' + (r * r) + '~.',
         'Solve: ~x = ' + (r * r) + (k < 0 ? ' + ' + Math.abs(k) : ' - ' + k) + ' = ' + (r * r - k) + '~.',
         'Check it in the original: ~sqrt{' + (r * r) + '} = ' + r + '~ ✓. So ~x = ~**' + (r * r - k) + '**.',
         'Squaring can create false solutions, so the check is part of the method rather than good manners.']);
    }
    var a = R.int(1, 8), neg = -R.int(1, 9);
    var sh = choiceSet(R, 'No solution', ['~x = ' + (neg * neg - a) + '~', '~x = ' + (a - neg * neg) + '~', '~x = 0~']);
    return mc('Solve ~sqrt{x + ' + a + '} = ' + neg + '~', sh.choices, sh.answer,
      ['Squaring would give ~x + ' + a + ' = ' + (neg * neg) + '~ and an apparently fine answer.',
       'But the radical sign means the *positive* square root, which can never equal ' + neg + '.',
       'So there is **no solution**, and you can see that before squaring anything.',
       'Any candidate from squaring must be checked against the original equation — that is where extraneous solutions get caught.']);
  });

  g('rational-exponents', function (R, d) {
    var mode = R.pick(['toRadical', 'evaluate', 'simplify']);
    if (mode === 'toRadical') {
      var n = R.int(2, 5), m = R.int(1, 4);
      var sh = choiceSet(R, '~sqrt{x^{' + m + '}}~ with index ' + n + ' (the ' + n + 'th root of ~x^{' + m + '}~)',
        ['The ' + m + 'th root of ~x^{' + n + '}~', '~x^{' + (m * n) + '}~', '~' + n + 'x^{' + m + '}~']);
      return mc('What does ~x^{' + m + '/' + n + '}~ mean?', sh.choices, sh.answer,
        ['In a fractional exponent, the bottom is the root and the top is the power.',
         'So ~x^{' + m + '/' + n + '}~ is the ' + n + 'th root of ~x^{' + m + '}~.',
         'Remembering which is which: the denominator *denominates* the root.']);
    }
    if (mode === 'evaluate') {
      var base = R.pick([4, 8, 9, 16, 25, 27, 32, 36, 64, 81, 100, 125]);
      var roots = { 4: [2, 2], 8: [3, 2], 9: [2, 3], 16: [2, 4], 25: [2, 5], 27: [3, 3], 32: [5, 2],
                    36: [2, 6], 64: [2, 8], 81: [2, 9], 100: [2, 10], 125: [3, 5] };
      var rt = roots[base][0], val = roots[base][1];
      var pw = R.int(1, 3);
      return num('Evaluate ~' + base + '^{' + pw + '/' + rt + '}~', Math.pow(val, pw),
        ['Take the ' + rt + 'th root first, because it keeps the numbers small: ~' + base + '^{1/' + rt +
          '} = ' + val + '~.',
         'Then raise to the power ' + pw + ': ~' + val + '^{' + pw + '} = ' + Math.pow(val, pw) + '~.',
         'Answer: **' + Math.pow(val, pw) + '**.',
         'Rooting before powering is almost always easier than powering first.']);
    }
    var p1 = R.int(1, 5), q1 = R.int(2, 5), p2 = R.int(1, 5), q2 = R.int(2, 5);
    var sum = Frac.add(F(p1, q1), F(p2, q2));
    return { prompt: 'Simplify ~x^{' + p1 + '/' + q1 + '} \\cdot x^{' + p2 + '/' + q2 +
        '}~ and give the resulting exponent as a fraction in lowest terms.',
      kind: 'frac', answer: { n: sum.n, d: sum.d }, lowest: true,
      solution: ['Multiplying powers of the same base adds the exponents — fractions included.',
        '~\\f{' + p1 + '}{' + q1 + '} + \\f{' + p2 + '}{' + q2 + '} = ' + Frac.str(sum) + '~.',
        'So the result is ~x^{' + Frac.str(sum) + '}~, exponent **' + Frac.str(sum) + '**.',
        'The exponent rules do not change when the exponents stop being whole numbers.'] };
  });

  g('arithmetic-sequences', function (R, d) {
    var a1 = R.nonzero(-20, 30), diff = R.nonzero(-9, 9);
    var mode = R.pick(['nextTerm', 'nthTerm', 'findN', 'rule']);
    var terms = [a1, a1 + diff, a1 + 2 * diff, a1 + 3 * diff];
    if (mode === 'nextTerm') {
      return num('Find the next term: ~' + terms.join(',\; ') + ',\; ?~', a1 + 4 * diff,
        ['Check the differences: each step adds ' + diff + ', the same every time, so it is arithmetic.',
         terms[3] + ' + (' + diff + ') = **' + (a1 + 4 * diff) + '**.']);
    }
    if (mode === 'nthTerm') {
      var n = R.int(8, 40);
      return num('An arithmetic sequence starts ~' + terms.join(',\; ') + '~. What is the ' +
        MC.ordinal(n) + ' term?', a1 + (n - 1) * diff,
        ['The rule is ~a_{n} = a_{1} + (n - 1)d~ with ~a_{1} = ' + a1 + '~ and ~d = ' + diff + '~.',
         'At ~n = ' + n + '~: ~' + a1 + ' + ' + (n - 1) + '(' + diff + ') = ' + (a1 + (n - 1) * diff) + '~.',
         'Answer: **' + (a1 + (n - 1) * diff) + '**.',
         'It is ~n - 1~, not ~n~, because the first term has had no steps added to it yet.']);
    }
    if (mode === 'findN') {
      var k = R.int(6, 30), target = a1 + (k - 1) * diff;
      return num('In the sequence ~' + terms.join(',\; ') + '~, which term equals ' + target + '?', k,
        ['Set the rule equal to the target: ~' + a1 + ' + (n - 1)(' + diff + ') = ' + target + '~.',
         '~(n - 1)(' + diff + ') = ' + (target - a1) + '~, so ~n - 1 = ' + (k - 1) + '~.',
         'So it is term number **' + k + '**.']);
    }
    return num('For the sequence ~' + terms.join(',\; ') + '~, written as ~a_{n} = ' + a1 +
      ' + (n - 1)d~, what is ~d~?', diff,
      ['~d~ is the common difference: subtract any term from the one after it.',
       terms[1] + ' - (' + terms[0] + ') = **' + diff + '**.',
       'A constant difference is what makes a sequence arithmetic, and it is the slope of the straight line through its terms.']);
  });

  g('geometric-sequences', function (R, d) {
    var a1 = R.nonzero(1, 12), r = R.pick([2, 3, -2, -3, 5, 10]);
    var mode = R.pick(['nextTerm', 'nthTerm', 'ratio']);
    var terms = [a1, a1 * r, a1 * r * r, a1 * r * r * r];
    if (mode === 'nextTerm') {
      return num('Find the next term: ~' + terms.join(',\; ') + ',\; ?~', a1 * Math.pow(r, 4),
        ['The differences are not constant, so check the ratios: ' + terms[1] + ' \\div ' + terms[0] +
          ' = ' + r + ', and the same each step.',
         terms[3] + ' \\times (' + r + ') = **' + (a1 * Math.pow(r, 4)) + '**.',
         'A constant *ratio* means geometric; a constant *difference* would mean arithmetic.']);
    }
    if (mode === 'nthTerm') {
      var n = R.int(5, 9);
      return num('A geometric sequence starts ~' + terms.join(',\; ') + '~. What is the ' +
        MC.ordinal(n) + ' term?', a1 * Math.pow(r, n - 1),
        ['The rule is ~a_{n} = a_{1}r^{n-1}~ with ~a_{1} = ' + a1 + '~ and ~r = ' + r + '~.',
         'At ~n = ' + n + '~: ~' + a1 + ' \\times (' + r + ')^{' + (n - 1) + '} = ' +
           (a1 * Math.pow(r, n - 1)) + '~.',
         'Answer: **' + (a1 * Math.pow(r, n - 1)) + '**.',
         Math.abs(r) > 1 ? 'Geometric growth outruns arithmetic growth very quickly — this is the shape of compound interest.'
                         : 'Terms shrink toward zero when the ratio is between -1 and 1.']);
    }
    return num('For the sequence ~' + terms.join(',\; ') + '~, what is the common ratio?', r,
      ['Divide any term by the one before it.',
       terms[1] + ' \\div (' + terms[0] + ') = **' + r + '**.',
       r < 0 ? 'A negative ratio makes the terms alternate in sign.' :
         'Check it against another pair to be sure the ratio really is constant.'], { tol: 0.005 });
  });

  g('exponential-growth', function (R, d) {
    var P = R.int(2, 40) * 50, rate = R.pick([5, 8, 10, 12, 15, 20, 25]);
    var decay = R.bool(0.4);
    var t = R.int(2, 12);
    var factor = decay ? 1 - rate / 100 : 1 + rate / 100;
    var val = P * Math.pow(factor, t);
    var mode = R.pick(['value', 'readRate', 'compare']);
    if (mode === 'value') {
      return num('A quantity starts at ' + MC.commas(P) + ' and ' + (decay ? 'falls' : 'grows') + ' by ~' +
        rate + '\\%~ each year. What is it after ' + t + ' years? Round to 2 decimal places.',
        Math.round(val * 100) / 100,
        ['Each year multiplies by ~1 ' + (decay ? '-' : '+') + ' ' + MC.fmt(rate / 100, 4) + ' = ' +
          MC.fmt(factor, 4) + '~, so the model is ~y = ' + P + '(' + MC.fmt(factor, 4) + ')^{t}~.',
         'After ' + t + ' years: ~' + P + ' \\times ' + MC.fmt(factor, 4) + '^{' + t + '} = ' +
           MC.fmt(val, 2) + '~.',
         'Answer: **' + MC.fmt(Math.round(val * 100) / 100, 2) + '**.',
         'The percentage applies to the *current* amount each year, which is why it compounds rather than adding the same amount repeatedly.'],
        { tol: 0.05 });
    }
    if (mode === 'readRate') {
      return num('A model is ~y = ' + P + '(' + MC.fmt(factor, 4) + ')^{t}~. What is the yearly percentage ' +
        (decay ? 'decrease' : 'increase') + '? Enter just the number.', rate,
        ['Compare the base with 1: ~' + MC.fmt(factor, 4) + (decay ? ' = 1 - ' : ' = 1 + ') +
          MC.fmt(rate / 100, 4) + '~.',
         'So the rate is ' + MC.fmt(rate / 100, 4) + ', which is **' + rate + '**%.',
         'A base above 1 means growth; below 1 means decay. The base is never the percentage itself.'],
        { tol: 0.05 });
    }
    var linRate = Math.round(P * rate / 100);
    var yrs = R.int(10, 25);
    var expVal = P * Math.pow(1 + rate / 100, yrs), linVal = P + linRate * yrs;
    var sh = shuffleChoices(R, ['The one growing by ~' + rate + '\\%~ each year',
      'The one growing by ' + MC.commas(linRate) + ' each year'], 0);
    return mc('Two quantities both start at ' + MC.commas(P) + '. One grows by ~' + rate +
      '\\%~ a year, the other by ' + MC.commas(linRate) + ' a year — the same amount as the first year’s growth. ' +
      'Which is larger after ' + yrs + ' years?', sh.choices, sh.answer,
      ['They match after one year, but the percentage one then takes its percentage of a bigger number.',
       'After ' + yrs + ' years: percentage growth gives about ' + MC.commas(Math.round(expVal)) +
         ', steady growth gives ' + MC.commas(linVal) + '.',
       'The **percentage** one is larger — exponential growth always overtakes linear growth eventually, whatever the starting rates.']);
  });

  g('linear-vs-exponential', function (R, d) {
    var mode = R.pick(['fromTable', 'fromWords']);
    if (mode === 'fromTable') {
      var isLinear = R.bool();
      var a = R.int(2, 10), step = R.nonzero(2, 9), ratio = R.pick([2, 3, 5]);
      var ys = isLinear ? [a, a + step, a + 2 * step, a + 3 * step]
                        : [a, a * ratio, a * ratio * ratio, a * ratio * ratio * ratio];
      var right = isLinear ? 'Linear' : 'Exponential';
      var sh = shuffleChoices(R, ['Linear', 'Exponential'], isLinear ? 0 : 1);
      return mc('For ~x = 0, 1, 2, 3~ the outputs are ' + ys.join(', ') +
        '. Is the relationship linear or exponential?', sh.choices, sh.answer,
        ['Test the differences, then the ratios.',
         isLinear ? 'Differences: each step adds ' + step + ' — constant, so it is **linear**.'
                  : 'Differences change, but each term is ' + ratio + ' times the one before — a constant ratio, so it is **exponential**.',
         'Constant difference means linear; constant ratio means exponential. Check differences first, because they are quicker.']);
    }
    var cases = [
      { s: 'a salary rising by ' + MC.money(2000) + ' a year', ans: 'Linear' },
      { s: 'a salary rising by 3% a year', ans: 'Exponential' },
      { s: 'a population doubling every decade', ans: 'Exponential' },
      { s: 'a tank draining 5 litres a minute', ans: 'Linear' },
      { s: 'a car losing 15% of its value each year', ans: 'Exponential' },
      { s: 'a phone plan charging ' + MC.money(0.1) + ' per minute', ans: 'Linear' },
      { s: 'a bacterial colony tripling every hour', ans: 'Exponential' }
    ];
    var c = R.pick(cases);
    var sh2 = shuffleChoices(R, ['Linear', 'Exponential'], c.ans === 'Linear' ? 0 : 1);
    return mc('Would you model ' + c.s + ' as linear or exponential?', sh2.choices, sh2.answer,
      ['Ask whether the change is a fixed *amount* or a fixed *percentage* each period.',
       c.ans === 'Linear' ? 'This adds the same amount each time, so it is **linear**.'
                          : 'This multiplies by the same factor each time, so it is **exponential**.',
       'The giveaway words: "per" and a fixed amount point to linear; a percentage, "doubling" or "tripling" point to exponential.']);
  });

  g('distance-rate-time', function (R, d) {
    var kind = R.pick(['meeting', 'catchUp', 'roundTrip']);
    if (kind === 'meeting') {
      var s1 = R.int(30, 80), s2 = R.int(30, 80), hrs = R.int(2, 6);
      var dist = (s1 + s2) * hrs;
      return num('Two cars leave the same point in opposite directions at ' + s1 + ' km/h and ' + s2 +
        ' km/h. After how many hours are they ' + MC.commas(dist) + ' km apart?', hrs,
        ['Moving apart, the gap grows at the sum of the speeds: ' + s1 + ' + ' + s2 + ' = ' + (s1 + s2) + ' km/h.',
         'Time = distance \\div combined speed = ' + dist + ' \\div ' + (s1 + s2) + '.',
         '**' + hrs + ' hours.**',
         'Adding the speeds works because each car contributes its own distance to the same gap.'],
        { tol: 0.005 });
    }
    if (kind === 'catchUp') {
      var slow = R.int(40, 70), fast = slow + R.int(10, 40), head = R.int(1, 4);
      var tCatch = slow * head / (fast - slow);
      return num('A truck leaves at ' + slow + ' km/h. ' + head + ' hour' + (head > 1 ? 's' : '') +
        ' later a car leaves from the same place at ' + fast +
        ' km/h. How many hours does the car take to catch up? Round to 2 decimal places.',
        Math.round(tCatch * 100) / 100,
        ['The truck has a head start of ' + slow + ' \\times ' + head + ' = ' + (slow * head) + ' km.',
         'The car closes the gap at ' + fast + ' - ' + slow + ' = ' + (fast - slow) + ' km/h.',
         'Time = ' + (slow * head) + ' \\div ' + (fast - slow) + ' = **' + MC.fmt(tCatch, 2) + ' hours**.',
         'Catching up uses the *difference* of the speeds; moving apart uses the sum.'],
        { tol: 0.015 });
    }
    var out = R.int(40, 70), back = out + R.int(10, 30), dd = R.int(2, 15) * 10;
    var total = dd / out + dd / back;
    return num('A cyclist rides ' + dd + ' km out at ' + out + ' km/h and returns at ' + back +
      ' km/h. What is the total time in hours? Round to 2 decimal places.',
      Math.round(total * 100) / 100,
      ['Work out each leg separately: ' + dd + ' \\div ' + out + ' = ' + MC.fmt(dd / out, 3) +
        ' h and ' + dd + ' \\div ' + back + ' = ' + MC.fmt(dd / back, 3) + ' h.',
       'Add them: **' + MC.fmt(total, 2) + ' hours**.',
       'The average speed for the trip is *not* the average of the two speeds — it is total distance over total time, which is always lower.'],
      { tol: 0.015 });
  });

  g('work-rate', function (R, d) {
    var kind = R.pick(['together', 'oneLeft']);
    var a = R.int(2, 12), b = R.int(2, 12);
    if (kind === 'together') {
      var t = 1 / (1 / a + 1 / b);
      return num('One painter takes ' + a + ' hours to paint a room and another takes ' + b +
        ' hours. Working together, how many hours do they take? Round to 2 decimal places.',
        Math.round(t * 100) / 100,
        ['Work with rates, not times: the first does ~\\f{1}{' + a + '}~ of the room per hour, the second ~\\f{1}{' + b + '}~.',
         'Together: ~\\f{1}{' + a + '} + \\f{1}{' + b + '} = ' + MC.fmt(1 / a + 1 / b, 5) + '~ of the room per hour.',
         'Time is one whole room divided by that rate: **' + MC.fmt(t, 2) + ' hours**.',
         'Adding the *times* is always wrong — two people cannot take longer together than either alone.'],
        { tol: 0.015 });
    }
    var worked = R.int(1, a - 1);
    var remain = (1 - worked / a) * b;
    return num('A tap fills a tank in ' + a + ' hours. It runs for ' + worked + ' hour' +
      (worked > 1 ? 's' : '') + ' and is then replaced by a tap that fills the whole tank in ' + b +
      ' hours. How many more hours to finish? Round to 2 decimal places.',
      Math.round(remain * 100) / 100,
      ['In ' + worked + ' hour' + (worked > 1 ? 's' : '') + ' the first tap fills ~\\f{' + worked + '}{' + a +
        '}~ of the tank, leaving ~' + MC.fmt(1 - worked / a, 4) + '~ to go.',
       'The second tap fills ~\\f{1}{' + b + '}~ per hour, so it needs ~' + MC.fmt(1 - worked / a, 4) +
         ' \\div \\f{1}{' + b + '} = ' + MC.fmt(remain, 3) + '~ hours.',
       '**' + MC.fmt(remain, 2) + ' hours.**'],
      { tol: 0.015 });
  });

  g('mixture-problems', function (R, d) {
    var kind = R.pick(['concentration', 'value']);
    if (kind === 'concentration') {
      var c1 = R.pick([10, 20, 25, 30, 40]), c2 = R.pick([50, 60, 70, 80, 90]);
      var v1 = R.int(2, 20) * 5, v2 = R.int(2, 20) * 5;
      var finalC = (c1 * v1 + c2 * v2) / (v1 + v2);
      return num(v1 + ' litres of a ~' + c1 + '\\%~ solution is mixed with ' + v2 + ' litres of a ~' + c2 +
        '\\%~ solution. What percentage is the mixture? Round to 2 decimal places.',
        Math.round(finalC * 100) / 100,
        ['Track the pure substance, not the percentages: ~' + c1 + '\\%~ of ' + v1 + ' is ' +
          MC.fmt(c1 * v1 / 100, 2) + ' litres, and ~' + c2 + '\\%~ of ' + v2 + ' is ' +
          MC.fmt(c2 * v2 / 100, 2) + ' litres.',
         'Total pure: ' + MC.fmt((c1 * v1 + c2 * v2) / 100, 2) + ' litres in ' + (v1 + v2) + ' litres of mixture.',
         'Concentration = ' + MC.fmt((c1 * v1 + c2 * v2) / 100, 2) + ' \\div ' + (v1 + v2) + ' = **' +
           MC.fmt(finalC, 2) + '%**.',
         'Averaging the two percentages only works when the volumes are equal — otherwise the bigger batch pulls harder.'],
        { tol: 0.02 });
    }
    var p1 = R.int(2, 9), p2 = p1 + R.int(2, 10);
    var k1 = R.int(2, 20), k2 = R.int(2, 20);
    var blend = (p1 * k1 + p2 * k2) / (k1 + k2);
    return num(k1 + ' kg of coffee at ' + MC.money(p1) + '/kg is blended with ' + k2 + ' kg at ' +
      MC.money(p2) + '/kg. What is the blend worth per kg, in dollars? Round to 2 decimal places.',
      Math.round(blend * 100) / 100,
      ['Total value: ' + k1 + ' \\times ' + p1 + ' + ' + k2 + ' \\times ' + p2 + ' = ' +
        MC.money(p1 * k1 + p2 * k2) + '.',
       'Total weight: ' + (k1 + k2) + ' kg.',
       'Price per kg = ' + MC.fmt(p1 * k1 + p2 * k2, 2) + ' \\div ' + (k1 + k2) + ' = **' +
         MC.money(blend) + '**.',
       'This is a weighted average, and it always lands between the two prices, nearer the larger batch.'],
      { unit: 'dollars', tol: 0.02 });
  });

  g('age-consecutive', function (R, d) {
    var kind = R.pick(['ages', 'consecutiveOdd', 'relation']);
    if (kind === 'ages') {
      var childNow = R.int(4, 20), mult = R.int(2, 5), yrs = R.int(2, 12);
      /* parent is mult times child's age now; in yrs years parent = k times child */
      var parentNow = childNow * mult;
      return num('A parent is ' + mult + ' times as old as their child. In ' + yrs + ' years the parent will be ' +
        parentNow + ' + ' + yrs + ' = ' + (parentNow + yrs) + ' and the child ' + (childNow + yrs) +
        '. How old is the child now?', childNow,
        ['Let the child be ~x~ now, so the parent is ~' + mult + 'x~.',
         'In ' + yrs + ' years they are ~x + ' + yrs + '~ and ~' + mult + 'x + ' + yrs + '~.',
         'The stated future parent age gives ~' + mult + 'x + ' + yrs + ' = ' + (parentNow + yrs) +
           '~, so ~x = ' + childNow + '~.',
         'Child is **' + childNow + '** now.',
         'Add the same number of years to *every* person. Ages change together, which is what makes these solvable.']);
    }
    if (kind === 'consecutiveOdd') {
      var n = R.int(1, 30) * 2 + 1;
      var sum = n + (n + 2) + (n + 4);
      return num('Three consecutive odd numbers add to ' + sum + '. What is the smallest?', n,
        ['Consecutive odd numbers are 2 apart, so call them ~x~, ~x + 2~, ~x + 4~.',
         'Sum: ~3x + 6 = ' + sum + '~, so ~3x = ' + (sum - 6) + '~ and ~x = ' + n + '~.',
         'Smallest: **' + n + '**. Check: ' + n + ' + ' + (n + 2) + ' + ' + (n + 4) + ' = ' + sum + '.',
         'Consecutive *integers* step by 1; consecutive odds or evens step by 2. Using the wrong step is the usual error.']);
    }
    var small = R.int(3, 30), gap = R.int(2, 15);
    var big = small + gap, tot = small + big;
    return num('Two numbers add to ' + tot + ' and differ by ' + gap + '. What is the smaller one?', small,
      ['Let the smaller be ~x~; the larger is ~x + ' + gap + '~.',
       'Sum: ~2x + ' + gap + ' = ' + tot + '~, so ~2x = ' + (tot - gap) + '~ and ~x = ' + small + '~.',
       'Smaller number: **' + small + '**. Check: ' + small + ' + ' + big + ' = ' + tot + ' and ' +
         big + ' - ' + small + ' = ' + gap + '.',
       'Checking both conditions, not just one, is what catches an arithmetic slip here.']);
  });

  root.GENERATORS = GEN;
  if (typeof module !== 'undefined' && module.exports) module.exports = GEN;
})(typeof window !== 'undefined' ? window : globalThis);

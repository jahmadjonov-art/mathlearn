/* mathcore.js — numbers, fractions, expression parsing, and math typesetting.
   No dependencies. Loaded as a plain script; exposes window.MC (and module.exports
   under node so the test harness can check every generator).

   Everything that decides whether a learner's answer is right lives here, so it is
   tested directly in tests/ rather than trusted. */
(function (root) {
  'use strict';

  /* ---------- randomness: seeded so a problem can be replayed ---------- */
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a += 0x6D2B79F5;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeRandom(seed) {
    var r = rng(seed);
    var api = {
      next: r,
      int: function (lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); },
      pick: function (arr) { return arr[Math.floor(r() * arr.length)]; },
      sign: function () { return r() < 0.5 ? -1 : 1; },
      bool: function (p) { return r() < (p === undefined ? 0.5 : p); },
      shuffle: function (arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
          var j = Math.floor(r() * (i + 1));
          var t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
      },
      /* an int in [lo,hi] that is not 0 */
      nonzero: function (lo, hi) {
        var v = 0;
        do { v = api.int(lo, hi); } while (v === 0);
        return v;
      },
      /* distinct ints */
      distinct: function (n, lo, hi) {
        var out = [], guard = 0;
        while (out.length < n && guard++ < 500) {
          var v = api.int(lo, hi);
          if (out.indexOf(v) === -1) out.push(v);
        }
        return out;
      }
    };
    return api;
  }

  /* ---------- integer helpers ---------- */
  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = b; b = a % b; a = t; }
    return a;
  }
  function lcm(a, b) { if (a === 0 || b === 0) return 0; return Math.abs(a * b) / gcd(a, b); }
  function isPrime(n) {
    if (!Number.isInteger(n) || n < 2) return false;
    if (n % 2 === 0) return n === 2;
    for (var i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
    return true;
  }
  function primesUpTo(n) {
    var sieve = new Array(n + 1).fill(true), out = [];
    for (var i = 2; i <= n; i++) {
      if (sieve[i]) { out.push(i); for (var j = i * i; j <= n; j += i) sieve[j] = false; }
    }
    return out;
  }
  function primeFactors(n) {
    n = Math.abs(n);
    var out = [];
    for (var p = 2; p * p <= n; p++) { while (n % p === 0) { out.push(p); n /= p; } }
    if (n > 1) out.push(n);
    return out;
  }
  function factorPairs(n) {
    n = Math.abs(n);
    var out = [];
    for (var i = 1; i * i <= n; i++) if (n % i === 0) out.push([i, n / i]);
    return out;
  }
  function divisors(n) {
    var out = [];
    factorPairs(n).forEach(function (p) { out.push(p[0]); if (p[0] !== p[1]) out.push(p[1]); });
    return out.sort(function (a, b) { return a - b; });
  }
  /* largest perfect square dividing n — for simplifying radicals */
  function squareFactor(n) {
    n = Math.abs(n);
    var best = 1;
    for (var i = 2; i * i <= n; i++) if (n % (i * i) === 0) best = i * i;
    return best;
  }
  function isPerfectSquare(n) { return n >= 0 && Number.isInteger(Math.sqrt(n)); }

  /* ---------- fractions ---------- */
  function F(n, d) {
    if (d === undefined) d = 1;
    if (d === 0) throw new Error('zero denominator');
    if (!Number.isInteger(n) || !Number.isInteger(d)) {
      /* accept a decimal by scaling — keeps generators simple */
      var scale = 1;
      while ((!Number.isInteger(n * scale) || !Number.isInteger(d * scale)) && scale < 1e9) scale *= 10;
      n = Math.round(n * scale); d = Math.round(d * scale);
    }
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d) || 1;
    return { n: n / g, d: d / g, __frac: true };
  }
  var Frac = {
    make: F,
    add: function (a, b) { return F(a.n * b.d + b.n * a.d, a.d * b.d); },
    sub: function (a, b) { return F(a.n * b.d - b.n * a.d, a.d * b.d); },
    mul: function (a, b) { return F(a.n * b.n, a.d * b.d); },
    div: function (a, b) { if (b.n === 0) throw new Error('divide by zero'); return F(a.n * b.d, a.d * b.n); },
    neg: function (a) { return F(-a.n, a.d); },
    pow: function (a, k) {
      if (k >= 0) return F(Math.pow(a.n, k), Math.pow(a.d, k));
      return F(Math.pow(a.d, -k), Math.pow(a.n, -k));
    },
    cmp: function (a, b) { return a.n * b.d - b.n * a.d; },
    eq: function (a, b) { return a.n * b.d === b.n * a.d; },
    val: function (a) { return a.n / a.d; },
    isInt: function (a) { return a.d === 1; },
    /* "3/4", "-5/8", "2" */
    str: function (a) { return a.d === 1 ? String(a.n) : a.n + '/' + a.d; },
    /* "1 3/4" mixed form */
    mixed: function (a) {
      if (a.d === 1) return String(a.n);
      var s = a.n < 0 ? -1 : 1, n = Math.abs(a.n);
      var w = Math.floor(n / a.d), r = n % a.d;
      if (w === 0) return (s < 0 ? '-' : '') + r + '/' + a.d;
      return (s < 0 ? '-' : '') + w + ' ' + r + '/' + a.d;
    }
  };

  /* ---------- number formatting ---------- */
  function fmt(x, places) {
    if (typeof x === 'object' && x && x.__frac) return Frac.str(x);
    if (!isFinite(x)) return String(x);
    if (Number.isInteger(x)) return String(x);
    var p = places === undefined ? 4 : places;
    var s = Number(x.toFixed(p)).toString();
    return s;
  }
  function commas(n) {
    var parts = String(n).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }
  function money(x) {
    var neg = x < 0;
    var s = '$' + commas(Math.abs(x).toFixed(2));
    return neg ? '-' + s : s;
  }
  function ordinal(n) {
    var s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  function plural(n, one, many) { return n === 1 ? one : (many || one + 's'); }

  /* ---------- a tiny expression language ----------
     Supports + - * / ^ ( ), unary minus, implicit multiplication (2x, 3(x+1), xy),
     variables, decimals, and the functions sqrt abs ln log exp sin cos tan
     and constants pi e. Used for two jobs: grading an algebraic answer by
     sampling, and evaluating generator-authored formulas in tests. */
  var FUNCS = {
    sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: function (x) { return Math.log(x) / Math.LN10; },
    exp: Math.exp, sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan, cbrt: Math.cbrt
  };
  var CONSTS = { pi: Math.PI, e: Math.E };

  function tokenize(src) {
    var s = String(src).replace(/\s+/g, '');
    s = s.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/')
         .replace(/√/g, 'sqrt').replace(/π/g, 'pi').replace(/\*\*/g, '^');
    var toks = [], i = 0;
    while (i < s.length) {
      var c = s[i];
      if (/[0-9.]/.test(c)) {
        var j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++;
        var numTxt = s.slice(i, j);
        if ((numTxt.match(/\./g) || []).length > 1) throw new Error('bad number: ' + numTxt);
        toks.push({ t: 'num', v: parseFloat(numTxt) }); i = j; continue;
      }
      if (/[a-zA-Z]/.test(c)) {
        var k = i; while (k < s.length && /[a-zA-Z_]/.test(s[k])) k++;
        var word = s.slice(i, k);
        /* a known function or constant consumes the whole word; otherwise each
           letter is its own variable so that "xy" means x*y */
        if (FUNCS[word.toLowerCase()]) { toks.push({ t: 'fn', v: word.toLowerCase() }); i = k; continue; }
        if (CONSTS[word.toLowerCase()] && word.length > 1) { toks.push({ t: 'num', v: CONSTS[word.toLowerCase()] }); i = k; continue; }
        toks.push({ t: 'var', v: word[0] }); i = i + 1; continue;
      }
      if ('+-*/^(),'.indexOf(c) !== -1) { toks.push({ t: c }); i++; continue; }
      if (c === '[') { toks.push({ t: '(' }); i++; continue; }
      if (c === ']') { toks.push({ t: ')' }); i++; continue; }
      throw new Error('unexpected character: ' + c);
    }
    /* insert implicit multiplication */
    var out = [];
    for (var m = 0; m < toks.length; m++) {
      var prev = out[out.length - 1], cur = toks[m];
      if (prev) {
        var prevEnds = prev.t === 'num' || prev.t === 'var' || prev.t === ')';
        var curStarts = cur.t === 'num' || cur.t === 'var' || cur.t === '(' || cur.t === 'fn';
        if (prevEnds && curStarts) out.push({ t: '*' });
      }
      out.push(cur);
    }
    return out;
  }

  function parse(src) {
    var toks = tokenize(src), pos = 0;
    function peek() { return toks[pos]; }
    function eat(t) {
      if (toks[pos] && toks[pos].t === t) return toks[pos++];
      throw new Error('expected ' + t);
    }
    function parseExpr() {
      var node = parseTerm();
      while (peek() && (peek().t === '+' || peek().t === '-')) {
        var op = toks[pos++].t;
        node = { op: op, a: node, b: parseTerm() };
      }
      return node;
    }
    function parseTerm() {
      var node = parseUnary();
      while (peek() && (peek().t === '*' || peek().t === '/')) {
        var op = toks[pos++].t;
        node = { op: op, a: node, b: parseUnary() };
      }
      return node;
    }
    function parseUnary() {
      if (peek() && peek().t === '-') { pos++; return { op: 'neg', a: parseUnary() }; }
      if (peek() && peek().t === '+') { pos++; return parseUnary(); }
      return parsePower();
    }
    function parsePower() {
      var base = parseAtom();
      if (peek() && peek().t === '^') { pos++; return { op: '^', a: base, b: parseUnary() }; }
      return base;
    }
    function parseAtom() {
      var tk = peek();
      if (!tk) throw new Error('unexpected end');
      if (tk.t === 'num') { pos++; return { op: 'num', v: tk.v }; }
      if (tk.t === 'var') { pos++; return { op: 'var', v: tk.v }; }
      if (tk.t === 'fn') { pos++; eat('('); var arg = parseExpr(); eat(')'); return { op: 'fn', fn: tk.v, a: arg }; }
      if (tk.t === '(') { pos++; var e = parseExpr(); eat(')'); return e; }
      throw new Error('unexpected token ' + tk.t);
    }
    var ast = parseExpr();
    if (pos !== toks.length) throw new Error('trailing input');
    return ast;
  }

  function evalAst(ast, env) {
    switch (ast.op) {
      case 'num': return ast.v;
      case 'var':
        if (env && Object.prototype.hasOwnProperty.call(env, ast.v)) return env[ast.v];
        if (CONSTS[ast.v]) return CONSTS[ast.v];
        throw new Error('unknown variable ' + ast.v);
      case 'neg': return -evalAst(ast.a, env);
      case '+': return evalAst(ast.a, env) + evalAst(ast.b, env);
      case '-': return evalAst(ast.a, env) - evalAst(ast.b, env);
      case '*': return evalAst(ast.a, env) * evalAst(ast.b, env);
      case '/': return evalAst(ast.a, env) / evalAst(ast.b, env);
      case '^': return Math.pow(evalAst(ast.a, env), evalAst(ast.b, env));
      case 'fn': return FUNCS[ast.fn](evalAst(ast.a, env));
    }
    throw new Error('bad node');
  }
  function evaluate(src, env) { return evalAst(parse(src), env); }
  function varsIn(src) {
    var seen = {};
    (function walk(n) {
      if (!n) return;
      if (n.op === 'var') seen[n.v] = true;
      walk(n.a); walk(n.b);
    })(parse(src));
    return Object.keys(seen).sort();
  }

  /* Are two expressions the same function? Sample at pseudo-random points.
     This is what lets "simplify" and "factor" questions be graded without
     asking the learner to match a specific spelling. */
  function sameExpression(a, b, opts) {
    opts = opts || {};
    var astA, astB;
    try { astA = parse(a); astB = parse(b); } catch (e) { return false; }
    var vars = {};
    [a, b].forEach(function (s) { varsIn(s).forEach(function (v) { vars[v] = true; }); });
    var names = Object.keys(vars).filter(function (v) { return !CONSTS[v]; });
    if (names.length > 4) return false;
    var r = makeRandom(opts.seed || 20260101);
    var hits = 0, tries = 0;
    for (var i = 0; i < 60 && hits < 12; i++) {
      var env = {};
      names.forEach(function (v) { env[v] = (opts.domain === 'pos' ? 0.37 : -2.73) + r.next() * 5.11; });
      var va, vb;
      try { va = evalAst(astA, env); vb = evalAst(astB, env); } catch (e) { continue; }
      if (!isFinite(va) || !isFinite(vb)) continue;
      tries++;
      var scale = Math.max(1, Math.abs(va), Math.abs(vb));
      if (Math.abs(va - vb) > 1e-7 * scale) return false;
      hits++;
    }
    return hits >= 3;
  }

  /* ---------- reading what a learner typed ---------- */
  /* Accepts: 12, -3.5, 3/4, -3/4, 1 1/2, 1.2e3, 45%, $1,200.50, 7 1/2%, (3) */
  function parseNumber(input) {
    if (input === null || input === undefined) return null;
    var s = String(input).trim();
    if (!s) return null;
    s = s.replace(/[$,\s]+$/, '').replace(/^\$/, '').replace(/,/g, '');
    s = s.replace(/−/g, '-').replace(/½/g, '1/2').replace(/¼/g, '1/4').replace(/¾/g, '3/4');
    var pct = false;
    if (/%$/.test(s)) { pct = true; s = s.replace(/%$/, '').trim(); }
    var neg = false;
    if (/^\((.*)\)$/.test(s)) { neg = true; s = s.replace(/^\(|\)$/g, '').trim(); }
    var val = null;
    var mixed = s.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
    var frac = s.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
    if (mixed) {
      var w = parseInt(mixed[1], 10), nn = parseInt(mixed[2], 10), dd = parseInt(mixed[3], 10);
      if (dd === 0) return null;
      var sign = w < 0 ? -1 : 1;
      val = sign * (Math.abs(w) + nn / dd);
    } else if (frac) {
      var d2 = parseFloat(frac[2]);
      if (d2 === 0) return null;
      val = parseFloat(frac[1]) / d2;
    } else if (/^-?\d*\.?\d+(e-?\d+)?$/i.test(s)) {
      val = parseFloat(s);
    } else {
      /* last resort: a pure arithmetic expression like 3*4+1 or sqrt(16) */
      try {
        var v = evaluate(s, {});
        if (isFinite(v)) val = v;
      } catch (e) { return null; }
    }
    if (val === null || !isFinite(val)) return null;
    if (pct) val = val / 100;
    if (neg) val = -val;
    return val;
  }
  /* Did the learner type a fraction in lowest terms? Used only where the
     question explicitly asks for one. */
  function parseFractionParts(input) {
    var s = String(input == null ? '' : input).trim().replace(/\s+/g, ' ');
    var mixed = s.match(/^(-?\d+) (\d+)\s*\/\s*(\d+)$/);
    if (mixed) {
      var w = parseInt(mixed[1], 10), n = parseInt(mixed[2], 10), d = parseInt(mixed[3], 10);
      if (!d) return null;
      var sg = w < 0 ? -1 : 1;
      return { n: sg * (Math.abs(w) * d + n), d: d, wasMixed: true };
    }
    var m = s.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
    if (m) {
      var d2 = parseInt(m[2], 10);
      if (!d2) return null;
      return { n: parseInt(m[1], 10), d: d2, wasMixed: false };
    }
    var i = s.match(/^(-?\d+)$/);
    if (i) return { n: parseInt(i[1], 10), d: 1, wasMixed: false };
    return null;
  }

  /* ---------- math typesetting ----------
     Lesson and problem text carries math between $...$. Inside, a small
     notation is rendered to HTML: no external font or library, so it renders
     identically for every viewer and in both themes.
       \f{a}{b}  stacked fraction        ^{...} superscript
       _{...}    subscript               sqrt{...} radical with overbar
       <= >= != -> <-> +- ...            * -> times,  deg, pi, theta, inf, sum, int
       |x|       absolute value bars kept as-is                                  */
  var SYMBOLS = [
    [/<->/g, '↔'], [/->/g, '→'], [/<=/g, '≤'], [/>=/g, '≥'],
    [/!=/g, '≠'], [/\+-/g, '±'], [/~=/g, '≈'], [/\*/g, '×'],
    [/\bdeg\b/g, '°'], [/\bpi\b/g, 'π'], [/\btheta\b/g, 'θ'],
    [/\balpha\b/g, 'α'], [/\bbeta\b/g, 'β'], [/\bmu\b/g, 'μ'],
    [/\bsigma\b/g, 'σ'], [/\blambda\b/g, 'λ'], [/\bDelta\b/g, 'Δ']
  ];
  /* Words that would collide with ordinary English ("in", "or", "sum") are
     written with a leading backslash in lesson source: $x \in A$. */
  var WORD_SYMBOLS = {
    inf: '∞', sum: 'Σ', prod: '∏', int: '∫', 'in': '∈',
    notin: '∉', 'not': '¬', and: '∧', or: '∨',
    forall: '∀', exists: '∃', implies: '⇒', iff: '⇔',
    cdot: '·', times: '×', div: '÷', subset: '⊆',
    union: '∪', inter: '∩', empty: '∅', approx: '≈',
    le: '≤', ge: '≥', ne: '≠', pm: '±', to: '→',
    deg: '°', dots: '…', therefore: '∴', angle: '∠',
    perp: '⊥', parallel: '∥', tri: '△', cong: '≅',
    sim: '∼', bar: '̄', prime: '′', Sigma: 'Σ',
    sqrtsym: '√', Delta: 'Δ', nabla: '∇', partial: '∂'
  };
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  /* read a {...} group starting at i (which points at '{'); returns [inner, nextIndex] */
  function group(src, i) {
    if (src[i] !== '{') {
      return [src[i] || '', i + 1];
    }
    var depth = 0, j = i;
    for (; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') { depth--; if (!depth) break; }
    }
    return [src.slice(i + 1, j), j + 1];
  }
  function tex(src) {
    var s = String(src), out = '', i = 0;
    while (i < s.length) {
      if (s.startsWith('\\f{', i)) {
        var a = group(s, i + 2), b = group(s, a[1]);
        out += '<span class="mfrac"><span class="mnum">' + tex(a[0]) + '</span>' +
               '<span class="mden">' + tex(b[0]) + '</span></span>';
        i = b[1]; continue;
      }
      if (s[i] === '\\') {
        var w = s.slice(i + 1).match(/^[a-zA-Z]+/);
        if (w && WORD_SYMBOLS[w[0]]) { out += WORD_SYMBOLS[w[0]]; i += 1 + w[0].length; continue; }
        if (w) { out += esc(w[0]); i += 1 + w[0].length; continue; }
        i += 1; continue;
      }
      if (s.startsWith('sqrt', i)) {
        var g = group(s, i + 4);
        out += '<span class="mroot"><span class="mrad">√</span><span class="mrtc">' + tex(g[0]) + '</span></span>';
        i = g[1]; continue;
      }
      if (s[i] === '^') {
        var g2 = group(s, i + 1);
        out += '<sup>' + tex(g2[0]) + '</sup>';
        i = g2[1]; continue;
      }
      if (s[i] === '_') {
        var g3 = group(s, i + 1);
        out += '<sub>' + tex(g3[0]) + '</sub>';
        i = g3[1]; continue;
      }
      /* plain run up to the next special character */
      var j2 = i;
      while (j2 < s.length && !/[\\^_]/.test(s[j2]) && !s.startsWith('sqrt', j2)) j2++;
      if (j2 === i) j2 = i + 1;
      var chunk = s.slice(i, j2);
      /* symbols first, so that "<=" becomes a glyph instead of being escaped */
      SYMBOLS.forEach(function (p) { chunk = chunk.replace(p[0], p[1]); });
      out += esc(chunk);
      i = j2;
    }
    return out;
  }
  /* Plain text may still contain \f{a}{b} written outside a ~math~ segment. Typeset
     those in place, and escape everything around them. */
  function plainWithFractions(raw) {
    var out = '', i = 0;
    while (i < raw.length) {
      var at = raw.indexOf('\\f{', i);
      if (at === -1) { out += esc(raw.slice(i)); break; }
      out += esc(raw.slice(i, at));
      var a = group(raw, at + 2), b = group(raw, a[1]);
      out += '<span class="math">' + tex('\\f{' + a[0] + '}{' + b[0] + '}') + '</span>';
      i = b[1];
    }
    return out;
  }

  /* Render a whole string. Math is delimited by ~tildes~ rather than dollars,
     because prices are everywhere in this material and "$12.50" must survive as
     text. Also handles **bold**, *italic* and `code`. */
  function rich(src) {
    if (src === null || src === undefined) return '';
    var parts = String(src).split('~');
    var out = '';
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 1) { out += '<span class="math">' + tex(parts[i]) + '</span>'; continue; }
      var t = plainWithFractions(parts[i]);
      /* Operator words such as \times and \div are written with a backslash in
         source, and are as likely to appear in running text as inside a formula.
         Translate them here too, or the learner sees the raw source. */
      t = t.replace(/\\([a-zA-Z]+)/g, function (m, w) {
        return Object.prototype.hasOwnProperty.call(WORD_SYMBOLS, w) ? WORD_SYMBOLS[w] : m;
      });
      t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
      t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      t = t.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
      t = t.replace(/\n\n/g, '<br><br>');
      out += t;
    }
    return out;
  }

  var MC = {
    makeRandom: makeRandom, rng: rng,
    gcd: gcd, lcm: lcm, isPrime: isPrime, primesUpTo: primesUpTo, primeFactors: primeFactors,
    factorPairs: factorPairs, divisors: divisors, squareFactor: squareFactor,
    isPerfectSquare: isPerfectSquare,
    F: F, Frac: Frac,
    fmt: fmt, commas: commas, money: money, ordinal: ordinal, plural: plural,
    parse: parse, evaluate: evaluate, varsIn: varsIn, sameExpression: sameExpression,
    parseNumber: parseNumber, parseFractionParts: parseFractionParts,
    tex: tex, rich: rich, esc: esc
  };

  root.MC = MC;
  if (typeof module !== 'undefined' && module.exports) module.exports = MC;
})(typeof window !== 'undefined' ? window : globalThis);

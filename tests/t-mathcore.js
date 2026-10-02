const MC = require('../src/mathcore.js');
let fails = 0, n = 0;
function ok(cond, label) { n++; if (!cond) { fails++; console.log('FAIL: ' + label); } }
function eq(a, b, label) { n++; if (a !== b) { fails++; console.log('FAIL: ' + label + ' got ' + JSON.stringify(a) + ' want ' + JSON.stringify(b)); } }

// fractions
eq(MC.Frac.str(MC.Frac.add(MC.F(1,2), MC.F(1,3))), '5/6', 'add halves thirds');
eq(MC.Frac.str(MC.Frac.sub(MC.F(3,4), MC.F(5,6))), '-1/12', 'sub');
eq(MC.Frac.str(MC.Frac.mul(MC.F(2,3), MC.F(9,4))), '3/2', 'mul reduces');
eq(MC.Frac.str(MC.Frac.div(MC.F(2,3), MC.F(4,9))), '3/2', 'div');
eq(MC.Frac.mixed(MC.F(7,4)), '1 3/4', 'mixed');
eq(MC.Frac.mixed(MC.F(-7,4)), '-1 3/4', 'mixed neg');
eq(MC.Frac.str(MC.F(-4,-8)), '1/2', 'sign normalise');
eq(MC.Frac.str(MC.F(0,5)), '0', 'zero');
eq(MC.Frac.str(MC.Frac.pow(MC.F(2,3), -2)), '9/4', 'negative power');

// integers
eq(MC.gcd(84, 36), 12, 'gcd'); eq(MC.lcm(4, 6), 12, 'lcm');
eq(MC.primeFactors(360).join('*'), '2*2*2*3*3*5', 'prime factors');
eq(MC.squareFactor(72), 36, 'square factor'); eq(MC.squareFactor(50), 25, 'square factor 50');
eq(MC.divisors(28).join(','), '1,2,4,7,14,28', 'divisors');
ok(MC.isPrime(97) && !MC.isPrime(91) && !MC.isPrime(1), 'primality');

// parsing learner input
eq(MC.parseNumber('3/4'), 0.75, 'frac input');
eq(MC.parseNumber('1 1/2'), 1.5, 'mixed input');
eq(MC.parseNumber('-2 3/4'), -2.75, 'neg mixed input');
eq(MC.parseNumber('45%'), 0.45, 'percent input');
eq(MC.parseNumber('$1,200.50'), 1200.5, 'money input');
eq(MC.parseNumber('(3)'), -3, 'accounting negative');
eq(MC.parseNumber('2*3+4'), 10, 'arithmetic input');
eq(MC.parseNumber(''), null, 'blank is null');
eq(MC.parseNumber('abc'), null, 'junk is null');
eq(MC.parseNumber('1/0'), null, 'div zero is null');

// fraction-parts parsing (lowest-terms checks)
eq(JSON.stringify(MC.parseFractionParts('6/8')), JSON.stringify({n:6,d:8,wasMixed:false}), 'frac parts raw');
eq(MC.parseFractionParts('1 1/2').n, 3, 'mixed to improper');

// expression engine
eq(MC.evaluate('2+3*4'), 14, 'precedence');
eq(MC.evaluate('(2+3)*4'), 20, 'parens');
eq(MC.evaluate('2^3^2'), 512, 'right-assoc power');
eq(MC.evaluate('-3^2'), -9, 'unary minus binds loose');
eq(MC.evaluate('2x', {x: 5}), 10, 'implicit mult');
eq(MC.evaluate('3(x+1)', {x: 2}), 9, 'implicit mult parens');
eq(MC.evaluate('xy', {x: 3, y: 4}), 12, 'xy means x*y');
eq(MC.evaluate('sqrt(16)'), 4, 'sqrt');
eq(MC.evaluate('2pi') > 6.28 && MC.evaluate('2pi') < 6.29, true, 'pi const');
eq(MC.varsIn('3a+2b-c').join(''), 'abc', 'varsIn');

// grading by equivalence
ok(MC.sameExpression('(x+2)(x+3)', 'x^2+5x+6'), 'expand equivalence');
ok(MC.sameExpression('2(x-4)', '2x-8'), 'distribute equivalence');
ok(!MC.sameExpression('2(x-4)', '2x-4'), 'rejects wrong');
ok(MC.sameExpression('x/2', '0.5x'), 'decimal vs fraction form');
ok(!MC.sameExpression('x^2', 'x*2'), 'power vs product');
ok(MC.sameExpression('(x+1)/(x-1)', '(x+1)/(x-1)'), 'rational identity');
ok(!MC.sameExpression('sqrt(x)', 'x'), 'sqrt not identity');
ok(MC.sameExpression('3y+2y', '5y'), 'like terms');

// typesetting
ok(MC.tex('\\f{1}{2}').indexOf('mfrac') > -1, 'fraction markup');
ok(MC.tex('x^{2}').indexOf('<sup>2</sup>') > -1, 'superscript');
ok(MC.tex('sqrt{9}').indexOf('√') > -1, 'radical glyph');
eq(MC.tex('a <= b'), 'a ≤ b', 'leq symbol');
eq(MC.tex('3 * 4'), '3 × 4', 'times symbol');
ok(MC.rich('say ~x^{2}~ now').indexOf('<sup>2</sup>') > -1, 'rich math segment');
// a price must survive as text, which is why the delimiter is a tilde
ok(MC.rich('it costs $12.50 today').indexOf('$12.50') > -1, 'currency passes through rich()');
ok(MC.rich('~\\f{1}{2}~ of $80.00').indexOf('mfrac') > -1, 'math and currency together');
ok(MC.rich('**bold**').indexOf('<strong>') > -1, 'rich bold');
ok(MC.rich('<script>').indexOf('&lt;script&gt;') > -1, 'escapes html');

// formatting
eq(MC.commas(1234567), '1,234,567', 'commas');
eq(MC.money(-1234.5), '-$1,234.50', 'money');
eq(MC.ordinal(21), '21st', 'ordinal');
eq(MC.fmt(0.333333333), '0.3333', 'fmt rounds');

console.log(fails ? fails + ' of ' + n + ' checks FAILED' : 'all ' + n + ' mathcore checks passed');
process.exit(fails ? 1 : 0);

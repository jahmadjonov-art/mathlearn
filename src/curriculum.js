/* curriculum.js — the whole map, from counting to quantitative finance.
   Skill ids are stable, human-readable strings and are never renumbered: progress
   is stored against them, so inserting a skill must never shift another one's id.
   A skill is practisable when generators.js has an entry under its id, and has a
   written lesson when lessons/<module>.json carries one. The map lists the whole
   route regardless, so nothing is quietly missing. */
(function (root) {
  'use strict';
  function L(id, title, blurb, modules) { return { id: id, title: title, blurb: blurb, modules: modules }; }
  function M(id, title, aim, skills) { return { id: id, title: title, aim: aim, skills: skills }; }
  function S(id, t, goal) { return { id: id, t: t, goal: goal }; }

  var LEVELS = [

  /* ============================== LEVEL 0 ============================== */
  L('L0', 'Number Sense', 'What numbers are, how they are written, and the facts worth knowing by heart.', [
    M('M0.1', 'Counting and the number line', 'Place any whole number in order and on a line.', [
      S('count-sequence', 'Counting forwards and backwards', 'Continue a count from any starting point, in ones, twos, fives and tens.'),
      S('number-line-place', 'Reading a number line', 'Find what number an unlabelled tick mark stands for.'),
      S('compare-whole', 'Comparing whole numbers', 'Decide which of two numbers is larger, and say why using place value.'),
      S('order-whole', 'Ordering a set of numbers', 'Put a list of whole numbers in order, smallest to largest.'),
      S('ordinal-position', 'Position words', 'Tell the difference between how many and which one (third, tenth, twenty-first).')
    ]),
    M('M0.2', 'Place value', 'Read, write and round any whole number.', [
      S('place-value-name', 'Naming places', 'Say which place a digit sits in and what it is worth there.'),
      S('expanded-form', 'Expanded form', 'Break a number into the sum of what each digit is worth, and rebuild it.'),
      S('read-write-large', 'Reading large numbers aloud', 'Read and write numbers up to the billions using commas correctly.'),
      S('round-whole', 'Rounding whole numbers', 'Round to any place, and know which way a 5 goes.'),
      S('estimate-sums', 'Estimating before you calculate', 'Use rounding to predict an answer and catch a wrong one.')
    ]),
    M('M0.3', 'Addition and subtraction facts', 'Add and subtract small numbers without counting on fingers.', [
      S('make-ten', 'Making ten', 'Split a number to reach a ten, the move behind all mental addition.'),
      S('add-facts', 'Addition facts to 20', 'Recall single-digit sums quickly and reliably.'),
      S('sub-facts', 'Subtraction facts to 20', 'Recall single-digit differences, and see subtraction as the missing addend.'),
      S('add-sub-relation', 'The two are one operation', 'Turn any subtraction into an addition with a hole in it, and back.'),
      S('mental-add-strategies', 'Mental strategies', 'Add and subtract two-digit numbers in your head by compensating.')
    ]),
    M('M0.4', 'Multiplication and division facts', 'Know the tables and what they mean.', [
      S('mult-meaning', 'What multiplication is', 'Read a product as equal groups, as a rectangle, and as repeated addition.'),
      S('times-tables', 'Times tables to 12', 'Recall any product up to 12 x 12 quickly.'),
      S('div-meaning', 'What division is', 'Read a quotient as sharing, as grouping, and as the inverse of multiplying.'),
      S('div-facts', 'Division facts', 'Recall quotients from the tables, including the awkward ones.'),
      S('mult-div-relation', 'Multiplication and division together', 'Write the four facts in a multiplication family and use them to solve for a missing number.'),
      S('zero-one-rules', 'Zero, one, and why dividing by zero is barred', 'Apply the rules for 0 and 1 and explain what goes wrong at division by zero.')
    ]),
    M('M0.5', 'Everyday quantities', 'Handle money, time and measurement without second thought.', [
      S('money-count', 'Counting money', 'Add coins and notes, and make change the way a till does.'),
      S('time-read', 'Telling time', 'Read analogue and 24-hour time and convert between them.'),
      S('time-elapsed', 'Elapsed time', 'Work out how long something took across an hour or a day boundary.'),
      S('measure-units', 'Measuring with units', 'Pick a sensible unit, read a scale, and never drop the unit from an answer.')
    ])
  ]),

  /* ============================== LEVEL 1 ============================== */
  L('L1', 'Whole-Number Arithmetic', 'The written methods, the structure of numbers, and signed numbers.', [
    M('M1.1', 'Adding and subtracting on paper', 'Handle any size of whole number by hand.', [
      S('add-multidigit', 'Column addition with carrying', 'Add multi-digit numbers reliably, including several at once.'),
      S('sub-multidigit', 'Column subtraction with borrowing', 'Subtract across zeros without losing track.'),
      S('add-sub-checks', 'Checking your own arithmetic', 'Verify an answer by inverse operation and by digit sums.')
    ]),
    M('M1.2', 'Multiplying on paper', 'Multiply any two whole numbers by hand.', [
      S('mult-by-ten', 'Multiplying by powers of ten', 'Shift digits instead of multiplying, and say why it works.'),
      S('mult-area-model', 'The area model', 'Split a product into parts you already know.'),
      S('mult-standard', 'The standard algorithm', 'Multiply multi-digit numbers in columns, lining up place value.'),
      S('mult-mental-tricks', 'Fast mental products', 'Use doubling, halving and near-multiples to multiply in your head.')
    ]),
    M('M1.3', 'Dividing on paper', 'Divide by hand and read the remainder correctly.', [
      S('div-short', 'Short division', 'Divide by a one-digit number, carrying remainders along.'),
      S('div-long', 'Long division', 'Divide by a two- or three-digit number with a written layout.'),
      S('div-remainder-meaning', 'What to do with the remainder', 'Decide whether a problem wants the quotient, the remainder, a rounded-up answer, or a fraction.')
    ]),
    M('M1.4', 'Order of operations', 'Read any arithmetic expression the way everyone else reads it.', [
      S('order-ops-basic', 'The order of operations', 'Evaluate expressions with brackets, powers, products and sums in the right order.'),
      S('order-ops-nested', 'Nested brackets and fraction bars', 'Work outward through nested grouping, including a fraction bar as a grouping symbol.'),
      S('order-ops-traps', 'Where people go wrong', 'Avoid the classic errors: left-to-right for same-rank operations, and minus signs.')
    ]),
    M('M1.5', 'The structure of whole numbers', 'See a number by what divides it.', [
      S('factors-multiples', 'Factors and multiples', 'List the factors of a number and the multiples of another, and tell them apart.'),
      S('divisibility-rules', 'Divisibility rules', 'Test divisibility by 2, 3, 4, 5, 6, 8, 9, 10 and 11 without dividing.'),
      S('primes-composites', 'Primes and composites', 'Decide whether a number is prime, efficiently.'),
      S('prime-factorisation', 'Prime factorisation', 'Write any number as a product of primes, uniquely.'),
      S('gcf', 'Greatest common factor', 'Find the GCF by prime factors and by the Euclidean method.'),
      S('lcm', 'Least common multiple', 'Find the LCM, and know when a problem calls for LCM rather than GCF.')
    ]),
    M('M1.6', 'Negative numbers', 'Work on the whole number line, not just the right half.', [
      S('integers-line', 'Integers on the line', 'Place, compare and order negative numbers.'),
      S('absolute-value', 'Absolute value', 'Read |x| as distance from zero, and solve simple statements about it.'),
      S('add-sub-integers', 'Adding and subtracting integers', 'Combine signed numbers, and read subtraction as adding the opposite.'),
      S('mult-div-integers', 'Multiplying and dividing integers', 'Apply the sign rules and explain why two negatives make a positive.'),
      S('integer-word-problems', 'Signed quantities in context', 'Model temperature, debt, elevation and profit with signed numbers.')
    ]),
    M('M1.7', 'Exponents and roots', 'Repeated multiplication, and undoing it.', [
      S('exponent-meaning', 'What an exponent means', 'Expand and evaluate powers, and avoid confusing ~x^{2}~ with ~2x~.'),
      S('perfect-squares-cubes', 'Squares and cubes worth knowing', 'Recall squares to 25 and cubes to 10, and recognise them in problems.'),
      S('square-roots-exact', 'Square roots', 'Evaluate exact roots and estimate the rest between two whole numbers.'),
      S('powers-of-ten', 'Powers of ten', 'Multiply and divide by powers of ten, including negative powers.')
    ]),
    M('M1.8', 'Turning words into arithmetic', 'Decide what to calculate before calculating.', [
      S('one-step-words', 'One-step word problems', 'Choose the right operation from the wording.'),
      S('multi-step-words', 'Multi-step word problems', 'Plan a route through a problem that needs several operations.'),
      S('reasonableness', 'Is this answer sensible?', 'Check a result against the size and units the situation demands.')
    ])
  ]),

  /* ============================== LEVEL 2 ============================== */
  L('L2', 'Fractions, Decimals, Percents', 'Parts of a whole, three ways, and the proportional reasoning that runs through all later maths.', [
    M('M2.1', 'What a fraction is', 'Read, draw and compare fractions with confidence.', [
      S('fraction-meaning', 'Numerator and denominator', 'Read a fraction as parts of a whole, as division, and as a point on a line.'),
      S('equivalent-fractions', 'Equivalent fractions', 'Generate equal fractions and explain why multiplying top and bottom is legal.'),
      S('simplify-fractions', 'Lowest terms', 'Reduce a fraction fully in one step using the GCF.'),
      S('improper-mixed', 'Improper fractions and mixed numbers', 'Convert both ways and know which form a context wants.'),
      S('compare-fractions', 'Comparing fractions', 'Order fractions by common denominator, by cross-multiplying, and by benchmarks.')
    ]),
    M('M2.2', 'Fraction arithmetic', 'Add, subtract, multiply and divide fractions, and know why each rule is what it is.', [
      S('add-sub-like', 'Adding with the same denominator', 'Add and subtract when the parts already match.'),
      S('add-sub-unlike', 'Adding with different denominators', 'Find a common denominator and combine.'),
      S('add-sub-mixed', 'Mixed numbers', 'Add and subtract mixed numbers, including borrowing from the whole.'),
      S('mult-fractions', 'Multiplying fractions', 'Multiply across, cancel first, and read "of" as multiply.'),
      S('div-fractions', 'Dividing fractions', 'Multiply by the reciprocal, and explain what the answer counts.'),
      S('fraction-of-quantity', 'A fraction of a quantity', 'Take a fraction of a number, and find the whole from a part.'),
      S('complex-fractions', 'Fractions inside fractions', 'Simplify a fraction whose parts are themselves fractions.')
    ]),
    M('M2.3', 'Decimals', 'Place value past the point, and arithmetic that keeps it straight.', [
      S('decimal-place-value', 'Decimal place value', 'Name and compare decimal places, and read decimals correctly aloud.'),
      S('round-decimals', 'Rounding decimals', 'Round to a given place or a number of significant figures.'),
      S('add-sub-decimals', 'Adding and subtracting decimals', 'Line up the point and combine.'),
      S('mult-decimals', 'Multiplying decimals', 'Multiply and place the point by counting decimal places.'),
      S('div-decimals', 'Dividing decimals', 'Divide by shifting both numbers to a whole-number divisor.'),
      S('fraction-decimal-convert', 'Converting fractions and decimals', 'Convert both ways, including repeating decimals.'),
      S('terminating-repeating', 'Which fractions terminate', 'Predict from the denominator whether a decimal stops or repeats.')
    ]),
    M('M2.4', 'Percent', 'The language business and tests speak.', [
      S('percent-meaning', 'Percent as per hundred', 'Convert freely between percents, decimals and fractions.'),
      S('percent-of', 'Finding a percent of a number', 'Compute a percentage, mentally where possible.'),
      S('percent-missing', 'The three percent questions', 'Solve for the part, the whole, or the rate.'),
      S('percent-change', 'Percent increase and decrease', 'Compute change as a percentage of the original.'),
      S('percent-reverse', 'Working backwards from a percent', 'Recover the original amount after a rise or a discount.'),
      S('percent-traps', 'Why percents do not add up', 'Handle successive changes, and see why +10% then -10% loses money.'),
      S('discount-tax-tip', 'Discounts, tax, tips and markup', 'Chain real-world percentage adjustments in the right order.')
    ]),
    M('M2.5', 'Ratio and proportion', 'The single most useful idea in school mathematics.', [
      S('ratio-meaning', 'Reading a ratio', 'Interpret a ratio, scale it, and convert between ratio and fraction.'),
      S('ratio-share', 'Sharing in a ratio', 'Divide a quantity into parts given a ratio.'),
      S('unit-rate', 'Rates and unit rates', 'Compute a rate per one unit and use it to compare options.'),
      S('proportion-solve', 'Solving a proportion', 'Set up and solve a proportion, cross-multiplying safely.'),
      S('direct-inverse', 'Direct and inverse variation', 'Tell the two apart from a table or a sentence, and model each.'),
      S('scale-drawings', 'Scale and similar figures', 'Use a scale factor on lengths, and know what it does to area.')
    ]),
    M('M2.6', 'Units and measurement', 'Never lose a unit or a factor of a thousand again.', [
      S('metric-convert', 'Converting metric units', 'Move between metric units by powers of ten.'),
      S('imperial-convert', 'Converting customary units', 'Convert feet, inches, pounds, ounces, gallons and miles.'),
      S('dimensional-analysis', 'Dimensional analysis', 'Convert any compound unit by multiplying by one, and let the units cancel.'),
      S('area-volume-units', 'Units of area and volume', 'Convert squared and cubed units without dropping the power.')
    ]),
    M('M2.7', 'Money over time', 'Where percentages become finance.', [
      S('simple-interest', 'Simple interest', 'Apply ~I = Prt~ and rearrange it for any unknown.'),
      S('compound-interest-intro', 'Compound interest', 'Apply the compound formula and see why it beats simple interest.'),
      S('percent-finance-words', 'Everyday money problems', 'Handle commission, profit margin, unit pricing and loan payments.')
    ])
  ]),

  /* ============================== LEVEL 3 ============================== */
  L('L3', 'Pre-Algebra', 'Letters standing for numbers, and the rules for moving them around.', [
    M('M3.1', 'Expressions with letters', 'Read and build algebraic expressions.', [
      S('variable-meaning', 'What a variable is', 'Say what a letter stands for, and tell a variable from a constant and from a unit.'),
      S('translate-expressions', 'Turning words into expressions', 'Translate phrases into algebra, including the ones that reverse the order.'),
      S('evaluate-expressions', 'Evaluating an expression', 'Substitute values and evaluate, including negative inputs.'),
      S('terms-coefficients', 'Terms, coefficients and factors', 'Name the parts of an expression precisely.')
    ]),
    M('M3.2', 'The laws of algebra', 'The four moves everything else is built from.', [
      S('commutative-associative', 'Commutative and associative laws', 'Reorder and regroup safely, and know where you may not.'),
      S('distributive', 'The distributive law', 'Expand and factor a common factor, with negatives handled correctly.'),
      S('like-terms', 'Combining like terms', 'Simplify by collecting terms that match.'),
      S('simplify-expressions', 'Simplifying fully', 'Combine distribution and collection in one clean pass.')
    ]),
    M('M3.3', 'Solving linear equations', 'Find the number the letter stands for.', [
      S('one-step-equations', 'One-step equations', 'Undo a single operation, keeping the equation balanced.'),
      S('two-step-equations', 'Two-step equations', 'Undo operations in the reverse of the order they were applied.'),
      S('multi-step-equations', 'Multi-step equations', 'Simplify each side first, then solve.'),
      S('variables-both-sides', 'Variables on both sides', 'Collect the unknown on one side and solve.'),
      S('equations-fractions', 'Equations with fractions and decimals', 'Clear denominators first and solve cleanly.'),
      S('special-solutions', 'No solution and all solutions', 'Recognise identities and contradictions and say what they mean.'),
      S('equation-word-problems', 'Word problems with one unknown', 'Define a variable, write an equation, solve it, and answer the question asked.')
    ]),
    M('M3.4', 'Inequalities', 'Ranges of answers rather than single ones.', [
      S('inequality-meaning', 'Reading an inequality', 'Graph a solution set on a line and write it in interval notation.'),
      S('solve-inequalities', 'Solving linear inequalities', 'Solve, and flip the sign when multiplying or dividing by a negative.'),
      S('compound-inequalities', 'And / or inequalities', 'Solve and graph compound inequalities.'),
      S('inequality-words', 'Inequalities from words', 'Turn at least, at most, no more than and between into symbols.')
    ]),
    M('M3.5', 'Formulas', 'Rearranging a rule to answer a different question.', [
      S('use-formulas', 'Using a formula', 'Substitute into a given formula and evaluate with units.'),
      S('rearrange-formulas', 'Solving for a variable', 'Isolate any letter in a formula, treating the others as numbers.'),
      S('formula-build', 'Writing your own formula', 'Build a formula from a described relationship.')
    ]),
    M('M3.6', 'The coordinate plane', 'Where algebra becomes a picture.', [
      S('plot-points', 'Plotting points', 'Plot and read ordered pairs, and name quadrants and axes.'),
      S('distance-midpoint', 'Distance and midpoint', 'Compute the distance between two points and the midpoint of a segment.'),
      S('tables-to-graphs', 'From table to graph', 'Plot a relationship from a table and describe its shape in words.'),
      S('read-graphs', 'Reading information off a graph', 'Extract values, rates and trends from a plotted relationship.')
    ]),
    M('M3.7', 'Exponents and scientific notation', 'Big and small numbers, handled properly.', [
      S('exponent-rules', 'The exponent laws', 'Apply product, quotient and power rules, and derive them rather than memorise.'),
      S('zero-negative-exponents', 'Zero and negative exponents', 'Interpret ~x^{0}~ and ~x^{-n}~ and explain why they must mean what they mean.'),
      S('scientific-notation', 'Scientific notation', 'Convert to and from scientific notation and compare magnitudes.'),
      S('sci-notation-arithmetic', 'Calculating in scientific notation', 'Multiply, divide, add and subtract numbers in scientific notation.'),
      S('radicals-simplify', 'Simplifying radicals', 'Pull perfect squares out of a root and combine like radicals.'),
      S('rational-irrational', 'Rational and irrational numbers', 'Classify a number and justify the classification.')
    ]),
    M('M3.8', 'First look at statistics', 'Summarising a set of numbers honestly.', [
      S('mean-median-mode', 'Mean, median, mode and range', 'Compute each, and choose which one describes a data set fairly.'),
      S('mean-reverse', 'Working backwards from an average', 'Find a missing value given a required mean.'),
      S('data-displays', 'Reading data displays', 'Read bar charts, line graphs, histograms, box plots and two-way tables.'),
      S('outliers-spread', 'Spread and outliers', 'Describe spread, identify outliers, and say how each statistic responds to them.')
    ])
  ]),

  /* ============================== LEVEL 4 ============================== */
  L('L4', 'Algebra I', 'Functions, lines, systems and quadratics — the core of every later subject.', [
    M('M4.1', 'Functions', 'The central object of modern mathematics.', [
      S('function-definition', 'What a function is', 'Decide whether a relation is a function, from a table, a graph or a rule.'),
      S('function-notation', 'Function notation', 'Read and use ~f(x)~, including ~f(3)~, ~f(a+1)~ and solving ~f(x)=k~.'),
      S('domain-range', 'Domain and range', 'State the domain and range from a graph, a table and a formula.'),
      S('function-from-context', 'Functions in context', 'Interpret inputs, outputs, intercepts and rates in a real situation.')
    ]),
    M('M4.2', 'Linear functions', 'Constant rate of change, in every form.', [
      S('slope-from-points', 'Slope', 'Compute slope from two points, a graph or a table, and read its sign and size.'),
      S('slope-intercept', 'Slope-intercept form', 'Graph from ~y = mx + b~ and write the equation from a graph.'),
      S('point-slope', 'Point-slope form', 'Write a line through a point with a given slope and convert between forms.'),
      S('standard-form', 'Standard form and intercepts', 'Find both intercepts fast and convert between standard and slope-intercept form.'),
      S('parallel-perpendicular', 'Parallel and perpendicular lines', 'Use slope relationships to write equations of related lines.'),
      S('linear-modelling', 'Linear models', 'Build a linear model from a description and interpret slope and intercept in context.'),
      S('line-of-best-fit', 'Scatterplots and fit', 'Read a line of best fit, estimate slope, and interpolate or extrapolate.')
    ]),
    M('M4.3', 'Systems of equations', 'Two conditions at once.', [
      S('system-graphing', 'Solving by graphing', 'Find the intersection and recognise when lines are parallel or identical.'),
      S('system-substitution', 'Substitution', 'Solve a system by substitution, choosing the cheapest variable to isolate.'),
      S('system-elimination', 'Elimination', 'Solve by elimination, scaling equations when needed.'),
      S('system-special', 'No solution and infinitely many', 'Identify inconsistent and dependent systems algebraically.'),
      S('system-word-problems', 'Systems from words', 'Model two-unknown situations: mixtures, tickets, rates, coins.'),
      S('system-inequalities', 'Systems of inequalities', 'Graph a feasible region and test whether a point satisfies all constraints.')
    ]),
    M('M4.4', 'Absolute value', 'Distance as an equation.', [
      S('abs-equations', 'Absolute value equations', 'Solve by splitting into cases and reject false solutions.'),
      S('abs-inequalities', 'Absolute value inequalities', 'Solve less-than and greater-than cases and graph the result.'),
      S('abs-graphs', 'Graphs of absolute value functions', 'Graph ~y = a|x-h|+k~ and read the vertex off the equation.')
    ]),
    M('M4.5', 'Polynomials', 'Arithmetic with expressions.', [
      S('poly-vocabulary', 'Degree, leading term, standard form', 'Classify a polynomial and write it in standard form.'),
      S('poly-add-sub', 'Adding and subtracting polynomials', 'Combine polynomials, distributing a subtraction correctly.'),
      S('poly-multiply', 'Multiplying polynomials', 'Multiply binomials and larger products, with every term accounted for.'),
      S('special-products', 'Special products', 'Use ~(a+b)^{2}~, ~(a-b)^{2}~ and ~(a+b)(a-b)~ as shortcuts and recognise them backwards.'),
      S('poly-divide', 'Dividing polynomials', 'Divide by a monomial and by a binomial using long division.')
    ]),
    M('M4.6', 'Factoring', 'Turning a sum into a product — the key to solving.', [
      S('factor-gcf', 'Common factor first', 'Pull out the greatest common factor, including a negative one.'),
      S('factor-trinomial-1', 'Trinomials with leading coefficient 1', 'Factor ~x^{2}+bx+c~ by finding the pair that multiplies and adds.'),
      S('factor-trinomial-a', 'Trinomials with a leading coefficient', 'Factor ~ax^{2}+bx+c~ by grouping or the AC method.'),
      S('factor-difference-squares', 'Difference of squares', 'Recognise and factor it, including repeated application.'),
      S('factor-grouping', 'Factoring by grouping', 'Factor four-term polynomials and disguised quadratics.'),
      S('factor-strategy', 'Choosing a method', 'Look at a polynomial and know which technique applies.')
    ]),
    M('M4.7', 'Quadratic equations', 'Four methods, and when each is quickest.', [
      S('quad-zero-product', 'Solving by factoring', 'Use the zero product property and state both roots.'),
      S('quad-square-root', 'Solving by taking roots', 'Solve ~ax^{2}+c=0~ forms, keeping both signs.'),
      S('quad-complete-square', 'Completing the square', 'Complete the square to solve and to rewrite in vertex form.'),
      S('quad-formula', 'The quadratic formula', 'Apply the formula accurately and simplify the result.'),
      S('discriminant', 'The discriminant', 'Predict the number and type of roots before solving.'),
      S('quad-word-problems', 'Quadratic models', 'Solve projectile, area and revenue problems and discard impossible roots.')
    ]),
    M('M4.8', 'Parabolas', 'The shape of a quadratic.', [
      S('parabola-vertex', 'Vertex and axis of symmetry', 'Find the vertex from standard form and from vertex form.'),
      S('parabola-graph', 'Graphing a parabola', 'Graph from intercepts, vertex and direction of opening.'),
      S('parabola-transformations', 'Transformations of ~y = x^{2}~', 'Predict the graph of ~y = a(x-h)^{2}+k~ from the parameters.'),
      S('max-min-quadratic', 'Maximum and minimum values', 'Use the vertex to answer optimisation questions.')
    ]),
    M('M4.9', 'Rational and radical expressions', 'Algebra with division and roots.', [
      S('rational-simplify', 'Simplifying rational expressions', 'Factor and cancel, and state the excluded values.'),
      S('rational-mult-div', 'Multiplying and dividing', 'Multiply and divide rational expressions in factored form.'),
      S('rational-add-sub', 'Adding and subtracting', 'Find the least common denominator and combine.'),
      S('rational-equations', 'Rational equations', 'Solve and check for extraneous solutions.'),
      S('radical-operations', 'Operations with radicals', 'Add, multiply and rationalise expressions containing roots.'),
      S('radical-equations', 'Radical equations', 'Solve by squaring and test every candidate solution.'),
      S('rational-exponents', 'Rational exponents', 'Convert between radical and exponent form and compute with both.')
    ]),
    M('M4.10', 'Growth and sequences', 'Change that multiplies rather than adds.', [
      S('arithmetic-sequences', 'Arithmetic sequences', 'Find any term and the rule from a pattern.'),
      S('geometric-sequences', 'Geometric sequences', 'Find any term and the common ratio, explicit and recursive.'),
      S('exponential-growth', 'Exponential growth and decay', 'Model with ~y = a(1+r)^{t}~ and read the rate off the base.'),
      S('linear-vs-exponential', 'Linear or exponential?', 'Decide from a table or a description which model fits, and why it matters.')
    ]),
    M('M4.11', 'Classic word problems', 'The problem types that recur everywhere.', [
      S('distance-rate-time', 'Distance, rate and time', 'Solve meeting, catching-up and round-trip problems.'),
      S('work-rate', 'Work rate problems', 'Combine rates of work to find a joint completion time.'),
      S('mixture-problems', 'Mixture and concentration', 'Set up a value or concentration equation and solve it.'),
      S('age-consecutive', 'Age and consecutive integers', 'Translate relational statements into equations.')
    ])
  ]),

  /* ============================== LEVEL 5 ============================== */
  L('L5', 'Geometry', 'Shape, measurement, trigonometry and the discipline of proof.', [
    M('M5.1', 'Lines and angles', 'The vocabulary everything else is written in.', [
      S('angle-basics', 'Measuring and naming angles', 'Classify angles and use a protractor correctly.'),
      S('angle-pairs', 'Angle pairs', 'Use complementary, supplementary, vertical and adjacent angle relationships.'),
      S('parallel-transversal', 'Parallel lines and a transversal', 'Apply corresponding, alternate and co-interior angle rules.'),
      S('angle-algebra', 'Angles with algebra', 'Set up and solve equations from an angle diagram.')
    ]),
    M('M5.2', 'Triangles', 'The most useful shape there is.', [
      S('triangle-angle-sum', 'Angle sum and exterior angles', 'Use the 180-degree sum and the exterior angle theorem.'),
      S('triangle-classify', 'Classifying triangles', 'Classify by sides and angles and use isosceles properties.'),
      S('triangle-inequality', 'The triangle inequality', 'Decide whether three lengths can form a triangle.'),
      S('triangle-centres', 'Medians, altitudes and bisectors', 'Identify the special lines and points of a triangle.')
    ]),
    M('M5.3', 'Congruence and similarity', 'When two figures are the same, and when they are merely the same shape.', [
      S('congruence-criteria', 'Congruence criteria', 'Apply SSS, SAS, ASA, AAS and HL, and know why SSA fails.'),
      S('cpctc', 'Using congruence', 'Deduce equal parts from congruent triangles in a short proof.'),
      S('similarity-criteria', 'Similarity criteria', 'Apply AA, SSS and SAS similarity tests to prove two figures similar.'),
      S('similar-side-lengths', 'Finding lengths with similarity', 'Set up proportions from similar figures, including shadow and mirror problems.'),
      S('scale-factor-area-volume', 'Scale factor on area and volume', 'Apply the squared and cubed effects of a linear scale factor.')
    ]),
    M('M5.4', 'Right triangles', 'Where geometry becomes computational.', [
      S('pythagoras', 'The Pythagorean theorem', 'Find a missing side and recognise Pythagorean triples.'),
      S('pythagoras-converse', 'Testing for a right angle', 'Use the converse to classify a triangle by its sides.'),
      S('special-right-triangles', '45-45-90 and 30-60-90', 'Use the exact side ratios without a calculator.'),
      S('trig-ratios', 'Sine, cosine and tangent', 'Set up SOH CAH TOA and solve for a side.'),
      S('inverse-trig-angles', 'Finding an angle', 'Use inverse trig functions to find an unknown angle.'),
      S('elevation-depression', 'Angles of elevation and depression', 'Model and solve real height-and-distance problems.')
    ]),
    M('M5.5', 'Polygons and quadrilaterals', 'Properties worth knowing by heart.', [
      S('polygon-angles', 'Interior and exterior angles', 'Compute angle sums and individual angles for any polygon.'),
      S('quadrilateral-properties', 'The quadrilateral family', 'Use the properties of parallelograms, rectangles, rhombuses, squares, trapeziums and kites.'),
      S('quadrilateral-proofs', 'Proving a quadrilateral type', 'Decide which properties are enough to establish a type.')
    ]),
    M('M5.6', 'Perimeter and area', 'Measuring flat figures, including awkward ones.', [
      S('area-basic-figures', 'Area of standard figures', 'Compute area of triangles, parallelograms, trapeziums and regular polygons.'),
      S('composite-area', 'Composite and shaded regions', 'Add and subtract areas to measure an irregular region.'),
      S('perimeter-problems', 'Perimeter and fencing problems', 'Work backwards from perimeter and solve constrained-dimension problems.')
    ]),
    M('M5.7', 'Circles', 'The richest single figure in school geometry.', [
      S('circle-parts', 'Parts of a circle', 'Name radius, diameter, chord, secant, tangent, arc and sector correctly.'),
      S('circumference-area', 'Circumference and area', 'Compute both, forwards and backwards, exactly and to a decimal.'),
      S('arcs-sectors', 'Arc length and sector area', 'Compute arc length and sector area in degrees and radians.'),
      S('circle-angles', 'Angles in circles', 'Apply central, inscribed, tangent-chord and intersecting-chord angle rules.'),
      S('chords-tangents', 'Chords, tangents and secants', 'Apply the segment length relationships.'),
      S('circle-equation', 'The equation of a circle', 'Write and read the equation, completing the square when needed.')
    ]),
    M('M5.8', 'Solids', 'Surface area, volume and cross-sections.', [
      S('volume-prisms-cylinders', 'Prisms and cylinders', 'Compute volume and surface area, forwards and backwards.'),
      S('volume-pyramids-cones', 'Pyramids and cones', 'Use the one-third factor and the slant height correctly.'),
      S('volume-spheres', 'Spheres', 'Compute volume and surface area of a sphere and a hemisphere.'),
      S('cross-sections', 'Cross-sections and rotations', 'Identify the shape produced by slicing or spinning a solid.'),
      S('density-volume-problems', 'Density and capacity', 'Combine volume with density, mass and unit conversion.')
    ]),
    M('M5.9', 'Coordinate geometry', 'Geometry proved with algebra.', [
      S('coord-distance-midpoint', 'Distance and midpoint revisited', 'Apply both formulas to classify figures on the plane.'),
      S('coord-prove-shapes', 'Proving a shape by coordinates', 'Use slope and distance to prove a quadrilateral or triangle type.'),
      S('coord-partition', 'Partitioning a segment', 'Find a point dividing a segment in a given ratio.'),
      S('coord-area', 'Area on the coordinate plane', 'Find the area of a polygon from its vertices.')
    ]),
    M('M5.10', 'Transformations', 'Moving figures without changing what matters.', [
      S('translations-reflections', 'Translations and reflections', 'Apply and describe both, with coordinate rules.'),
      S('rotations', 'Rotations', 'Rotate about the origin and about another point.'),
      S('dilations', 'Dilations', 'Apply a scale factor from a centre and describe the effect.'),
      S('compositions-symmetry', 'Compositions and symmetry', 'Combine transformations and identify symmetry in a figure.'),
      S('rigid-motion-congruence', 'Rigid motions and congruence', 'Explain congruence and similarity through transformations.')
    ]),
    M('M5.11', 'Logic and proof', 'How mathematics knows things.', [
      S('conditional-statements', 'Conditional statements', 'Write converse, inverse and contrapositive and judge their truth.'),
      S('deductive-reasoning', 'Deductive reasoning', 'Chain given facts to a conclusion and name the rule used at each step.'),
      S('two-column-proof', 'Writing a proof', 'Produce a short two-column or paragraph proof with justified steps.'),
      S('counterexamples', 'Counterexamples', 'Disprove a general claim with a single well-chosen case.')
    ])
  ]),

  /* ============================== LEVEL 6 ============================== */
  L('L6', 'Algebra II and Trigonometry', 'The full function toolkit, logarithms, the unit circle, vectors and matrices.', [
    M('M6.1', 'The function toolkit', 'Nine parent functions and what you can do to them.', [
      S('parent-functions', 'Parent functions', 'Recognise and sketch the standard parent graphs from memory.'),
      S('transformations-general', 'Shifts, stretches and reflections', 'Predict the graph of ~af(b(x-h))+k~ and read parameters off a graph.'),
      S('even-odd-symmetry', 'Even and odd functions', 'Test algebraically and read symmetry off a graph.'),
      S('composition', 'Composing functions', 'Compute ~f(g(x))~, find its domain, and decompose a composite.'),
      S('inverse-functions', 'Inverse functions', 'Find an inverse, restrict a domain to make one exist, and verify a pair.'),
      S('piecewise-functions', 'Piecewise functions', 'Evaluate, graph and build piecewise definitions, including step functions.')
    ]),
    M('M6.2', 'Polynomial functions', 'Beyond the quadratic.', [
      S('poly-end-behaviour', 'End behaviour and degree', 'Predict end behaviour from degree and leading coefficient.'),
      S('poly-zeros-multiplicity', 'Zeros and multiplicity', 'Find zeros, state multiplicity, and sketch the behaviour at each.'),
      S('synthetic-division', 'Synthetic division', 'Divide quickly by a linear factor and read the remainder.'),
      S('remainder-factor-theorem', 'Remainder and factor theorems', 'Test factors by evaluation and build a polynomial from its roots.'),
      S('rational-root-theorem', 'The rational root theorem', 'List candidate roots and find the actual ones efficiently.'),
      S('poly-graph-sketch', 'Sketching a polynomial', 'Produce a complete sketch from zeros, multiplicity and end behaviour.'),
      S('poly-inequalities', 'Polynomial inequalities', 'Solve using sign analysis on a number line.')
    ]),
    M('M6.3', 'Rational functions', 'Where the graph breaks.', [
      S('rational-asymptotes', 'Vertical, horizontal and slant asymptotes', 'Find every asymptote and justify each.'),
      S('rational-holes', 'Holes', 'Distinguish a removable discontinuity from a vertical asymptote.'),
      S('rational-graph-sketch', 'Sketching a rational function', 'Combine intercepts, asymptotes and sign analysis into a sketch.'),
      S('rational-inequalities', 'Rational inequalities', 'Solve with a sign chart, respecting excluded values.')
    ]),
    M('M6.4', 'Exponentials and logarithms', 'The arithmetic of growth, and its inverse.', [
      S('exponential-functions', 'Exponential functions', 'Graph, transform and interpret exponential models, including base ~e~.'),
      S('log-definition', 'What a logarithm is', 'Convert between exponential and logarithmic form and evaluate simple logs.'),
      S('log-laws', 'Laws of logarithms', 'Expand and condense log expressions and apply the change of base.'),
      S('solve-exponential', 'Solving exponential equations', 'Solve by common base and by taking logs of both sides.'),
      S('solve-log', 'Solving logarithmic equations', 'Solve and reject solutions outside the domain.'),
      S('log-applications', 'Growth, decay and scales', 'Model compound interest, half-life, cooling, pH, decibels and the Richter scale.')
    ]),
    M('M6.5', 'Complex numbers', 'Finishing the number system.', [
      S('imaginary-unit', 'The imaginary unit', 'Simplify powers of ~i~ and square roots of negatives.'),
      S('complex-arithmetic', 'Arithmetic with complex numbers', 'Add, multiply and divide using conjugates.'),
      S('complex-plane', 'The complex plane', 'Plot a complex number, find its modulus and argument.'),
      S('complex-roots', 'Complex roots of polynomials', 'Use conjugate pairs to build and solve polynomials.')
    ]),
    M('M6.6', 'Sequences and series', 'Adding up patterns.', [
      S('sequence-notation', 'Explicit and recursive definitions', 'Translate between the two and generate terms.'),
      S('arithmetic-series', 'Arithmetic series', 'Sum an arithmetic series and derive the formula.'),
      S('geometric-series', 'Geometric series', 'Sum a finite geometric series and apply it to annuities.'),
      S('infinite-geometric', 'Infinite geometric series', 'Decide convergence and sum when ~|r| < 1~.'),
      S('sigma-notation', 'Sigma notation', 'Read, write and manipulate sums in sigma notation.')
    ]),
    M('M6.7', 'Trigonometry', 'Angles, circles and periodic behaviour.', [
      S('radians-degrees', 'Radians', 'Convert between degrees and radians and work in radians by default.'),
      S('unit-circle', 'The unit circle', 'Produce exact values for every standard angle without a calculator.'),
      S('trig-any-angle', 'Trig functions of any angle', 'Use reference angles and signs by quadrant.'),
      S('trig-graphs', 'Graphs of sine and cosine', 'Graph with amplitude, period, phase shift and midline, and read them off a graph.'),
      S('tan-reciprocal-graphs', 'Tangent and reciprocal graphs', 'Graph tangent, cotangent, secant and cosecant with asymptotes.'),
      S('trig-modelling', 'Modelling periodic data', 'Fit a sinusoid to tides, daylight, temperature or a wheel.'),
      S('inverse-trig-functions', 'Inverse trigonometric functions', 'Evaluate with correct principal ranges.'),
      S('trig-identities-basic', 'Fundamental identities', 'Use Pythagorean, reciprocal and quotient identities to simplify and prove.'),
      S('trig-sum-difference', 'Sum, difference and double angle', 'Apply the compound angle identities in both directions.'),
      S('trig-equations', 'Solving trigonometric equations', 'Solve over an interval and give the general solution.'),
      S('law-sines-cosines', 'Laws of sines and cosines', 'Solve any triangle, handling the ambiguous case.'),
      S('triangle-area-trig', 'Area with trigonometry', 'Use ~\\f{1}{2}ab\\sin C~ and Heron formula.')
    ]),
    M('M6.8', 'Vectors and matrices', 'Mathematics with more than one number at a time.', [
      S('vector-basics', 'Vectors', 'Add, subtract and scale vectors in component and magnitude-direction form.'),
      S('dot-product', 'The dot product', 'Compute it, use it for angles, and test perpendicularity.'),
      S('vector-applications', 'Vectors in context', 'Resolve forces, velocities and displacements.'),
      S('matrix-operations', 'Matrix operations', 'Add, scale and multiply matrices, and know when the product is undefined.'),
      S('determinant-inverse', 'Determinants and inverses', 'Compute 2x2 and 3x3 determinants and invert a 2x2 matrix.'),
      S('matrix-solve-systems', 'Solving systems with matrices', 'Solve a system by inverse matrix and by Cramer rule.')
    ]),
    M('M6.9', 'Conics, polar and parametric', 'Curves beyond the function graph.', [
      S('conic-identify', 'Identifying a conic', 'Classify from the equation and convert to standard form.'),
      S('parabola-conic', 'Parabolas as conics', 'Use focus and directrix form.'),
      S('ellipse', 'Ellipses', 'Find centre, axes, vertices and foci, and graph.'),
      S('hyperbola', 'Hyperbolas', 'Find centre, vertices, foci and asymptotes, and graph.'),
      S('polar-coordinates', 'Polar coordinates', 'Convert between polar and rectangular and graph simple polar curves.'),
      S('parametric-equations', 'Parametric equations', 'Eliminate the parameter and describe motion along a curve.')
    ]),
    M('M6.10', 'Counting and probability', 'Before statistics proper.', [
      S('counting-principle', 'The multiplication principle', 'Count arrangements by stages, with and without repetition.'),
      S('permutations-combinations', 'Permutations and combinations', 'Choose the right tool and compute it, including repeated objects.'),
      S('binomial-theorem', 'The binomial theorem', 'Expand a binomial power and find a specific term.'),
      S('probability-rules', 'Probability rules', 'Apply addition and multiplication rules and complements.'),
      S('conditional-probability-intro', 'Conditional probability', 'Compute conditional probabilities and test independence.')
    ]),
    M('M6.11', 'First look at calculus', 'The two questions calculus answers.', [
      S('limits-intuitive', 'Limits informally', 'Evaluate limits from a graph and a table, and recognise when one fails to exist.'),
      S('continuity-intro', 'Continuity', 'Classify discontinuities and state what continuity requires.'),
      S('average-rate-change', 'Average rate of change', 'Compute it on an interval and read it as a secant slope.'),
      S('instantaneous-intro', 'Towards the instantaneous rate', 'See the derivative coming as a limit of average rates.')
    ])
  ]),

  /* ============================== LEVEL 7 ============================== */
  L('L7', 'SAT and ACT Mastery', 'Everything above, re-aimed at the specific tests, with timing and method.', [
    M('M7.1', 'How the tests work', 'Know the machine you are beating.', [
      S('test-formats', 'Format and scoring', 'Explain section structure, timing, adaptive modules and how a raw score becomes a scaled one.'),
      S('scoring-strategy', 'Scoring strategy', 'Decide where your points are and what a target score requires per section.'),
      S('calculator-policy', 'Calculator rules', 'Know what is allowed on each test and when the calculator costs you time.')
    ]),
    M('M7.2', 'Algebra, test-style', 'The largest scoring block on the SAT.', [
      S('sat-linear-equations', 'Linear equations and expressions', 'Solve test-form linear problems quickly, including literal rearrangement.'),
      S('sat-systems', 'Systems in test form', 'Solve systems fast and handle the no-solution and infinite-solution question types.'),
      S('sat-inequalities', 'Inequalities and absolute value', 'Handle inequality and absolute-value questions under time pressure.'),
      S('sat-linear-words', 'Linear word problems', 'Translate dense test wording into equations without misreading.')
    ]),
    M('M7.3', 'Problem solving and data analysis', 'Ratios, percents, units and statistics as the tests ask them.', [
      S('sat-ratios-rates', 'Ratios, rates and proportions', 'Handle unit rates, scaling and conversions at test speed.'),
      S('sat-percents', 'Percent questions', 'Solve percent change, reverse percent and successive change problems.'),
      S('sat-units', 'Unit conversion questions', 'Convert compound units and catch unit traps in the answer choices.'),
      S('sat-data-graphs', 'Tables, graphs and scatterplots', 'Read and compare data displays and lines of best fit.'),
      S('sat-statistics', 'Statistics questions', 'Compare means, medians and spread, and reason about samples and margins of error.'),
      S('sat-probability-tables', 'Probability from tables', 'Compute conditional and joint probabilities from a two-way table.')
    ]),
    M('M7.4', 'Advanced math, test-style', 'The hardest third of the test.', [
      S('sat-quadratics', 'Quadratics in test form', 'Move fluently between forms and use the form the question rewards.'),
      S('sat-polynomials', 'Polynomials and factoring', 'Handle remainder, factor and zero questions efficiently.'),
      S('sat-exponentials', 'Exponential and radical equations', 'Solve exponent, radical and rational-exponent questions.'),
      S('sat-rational-expressions', 'Rational expressions and equations', 'Simplify and solve, watching for excluded values.'),
      S('sat-function-notation', 'Function notation puzzles', 'Handle nested, transformed and tabulated function questions.'),
      S('sat-nonlinear-systems', 'Nonlinear systems', 'Solve a line-and-curve system and count intersections.')
    ]),
    M('M7.5', 'Geometry and trigonometry on the tests', 'A smaller block, but free points when prepared.', [
      S('sat-angles-triangles', 'Angles, triangles and similarity', 'Apply angle and similarity facts to test figures, including unmarked ones.'),
      S('sat-circles', 'Circles, arcs and radians', 'Handle arc, sector, equation-of-circle and radian questions.'),
      S('sat-volume', 'Volume and surface area', 'Use the provided reference formulas quickly and correctly.'),
      S('sat-trig', 'Right-triangle trigonometry', 'Solve test trig questions, including complementary-angle identities.')
    ]),
    M('M7.6', 'ACT-only topics', 'What the ACT asks and the SAT does not.', [
      S('act-logs-matrices', 'Logarithms and matrices', 'Handle ACT log and matrix questions.'),
      S('act-conics-sequences', 'Conics and sequences', 'Handle ellipse, hyperbola and sequence questions at ACT level.'),
      S('act-trig-identities', 'Trig identities and the unit circle', 'Use identities and exact values under ACT time limits.'),
      S('act-misc', 'Logic, counting and oddities', 'Handle the ACT grab-bag: patterns, logic, imaginary numbers, vectors.')
    ]),
    M('M7.7', 'Method and timing', 'The part most students never train.', [
      S('plug-in-numbers', 'Plugging in numbers', 'Replace variables with chosen values to test answer choices safely.'),
      S('backsolving', 'Backsolving from the answers', 'Work from the choices when it is faster than solving forwards.'),
      S('estimation-elimination', 'Estimation and elimination', 'Eliminate impossible answers and estimate to the right one.'),
      S('time-budget', 'Time budgeting', 'Allocate seconds per question, skip deliberately, and come back.'),
      S('grid-in-rules', 'Student-produced responses', 'Enter answers in the required format without losing earned points.'),
      S('careless-error-audit', 'Killing careless errors', 'Run an error log, classify every mistake, and stop repeating it.'),
      S('desmos-strategy', 'Graphing calculator strategy', 'Use the on-screen graphing calculator to solve algebra visually.')
    ]),
    M('M7.8', 'Timed practice', 'Rehearsal under real conditions.', [
      S('timed-module-drill', 'Timed module drills', 'Complete a mixed timed set at target pace and accuracy.'),
      S('mixed-review-exam', 'Full mixed exam', 'Sustain accuracy across a full-length mixed section.')
    ])
  ]),

  /* ============================== LEVEL 8 ============================== */
  L('L8', 'Calculus', 'Rates of change and accumulation — single variable through a first look at several.', [
    M('M8.1', 'Limits and continuity', 'The idea that makes calculus rigorous.', [
      S('limit-algebraic', 'Computing limits algebraically', 'Evaluate limits by substitution, factoring, conjugates and common denominators.'),
      S('limit-one-sided', 'One-sided and infinite limits', 'Evaluate one-sided limits and limits at infinity, and locate asymptotes.'),
      S('squeeze-theorem', 'The squeeze theorem', 'Bound a function to force a limit, including ~\\f{\\sin x}{x}~.'),
      S('continuity-formal', 'Continuity and the IVT', 'Apply the three-part definition and use the intermediate value theorem.')
    ]),
    M('M8.2', 'The derivative', 'Instantaneous rate of change.', [
      S('derivative-definition', 'The definition of the derivative', 'Compute a derivative from the limit of a difference quotient.'),
      S('power-rule', 'Power, sum and constant rules', 'Differentiate polynomials and rational powers quickly.'),
      S('product-quotient-rule', 'Product and quotient rules', 'Differentiate products and quotients without sign errors.'),
      S('chain-rule', 'The chain rule', 'Differentiate composites, including nested ones.'),
      S('trig-exp-log-derivatives', 'Derivatives of trig, exponential and log functions', 'Differentiate the standard library of functions.'),
      S('implicit-differentiation', 'Implicit differentiation', 'Differentiate an implicit relation and find a tangent slope.'),
      S('higher-derivatives', 'Higher derivatives', 'Compute second and higher derivatives and interpret them.')
    ]),
    M('M8.3', 'Using the derivative', 'What a rate tells you.', [
      S('tangent-normal-lines', 'Tangent and normal lines', 'Write the equation of a tangent or normal at a point.'),
      S('related-rates', 'Related rates', 'Relate rates through a geometric or physical equation.'),
      S('linearisation', 'Linear approximation and differentials', 'Approximate a value and estimate the error.'),
      S('lhopital', 'L’Hopital rule', 'Resolve indeterminate forms correctly.'),
      S('motion-derivatives', 'Position, velocity and acceleration', 'Analyse motion on a line from any one of the three.')
    ]),
    M('M8.4', 'Curve analysis and optimisation', 'Finding the best value.', [
      S('critical-points', 'Critical points and extrema', 'Find and classify critical points and apply the extreme value theorem.'),
      S('mvt', 'The mean value theorem', 'State the hypotheses and apply the conclusion.'),
      S('concavity-inflection', 'Concavity and inflection', 'Use the second derivative to describe shape.'),
      S('curve-sketching', 'Full curve sketching', 'Combine every tool into an accurate sketch.'),
      S('optimisation', 'Optimisation problems', 'Set up a model, reduce it to one variable, and justify the optimum.')
    ]),
    M('M8.5', 'Integration', 'Accumulation, and the theorem that ties it to derivatives.', [
      S('antiderivatives', 'Antiderivatives', 'Reverse the basic derivative rules and include the constant.'),
      S('riemann-sums', 'Riemann sums', 'Approximate an area with left, right, midpoint and trapezoid sums.'),
      S('definite-integral', 'The definite integral', 'Interpret it as signed area and use its properties.'),
      S('ftc', 'The fundamental theorem of calculus', 'Apply both parts, including differentiating an integral.'),
      S('u-substitution', 'Substitution', 'Integrate by substitution, adjusting limits where needed.'),
      S('integration-by-parts', 'Integration by parts', 'Choose parts well and handle repeated application.'),
      S('partial-fractions-integration', 'Partial fractions', 'Decompose a rational function and integrate it.'),
      S('trig-integrals-substitution', 'Trigonometric integrals and substitution', 'Integrate trig powers and use trigonometric substitution.'),
      S('improper-integrals', 'Improper integrals', 'Evaluate using limits and decide convergence.')
    ]),
    M('M8.6', 'Applications of integration', 'What an integral measures.', [
      S('area-between-curves', 'Area between curves', 'Set up and evaluate, integrating with respect to the better variable.'),
      S('volumes-revolution', 'Volumes of revolution', 'Use disks, washers and shells.'),
      S('average-value', 'Average value and accumulation', 'Compute an average value and interpret an accumulation function.'),
      S('arc-length-surface', 'Arc length and surface area', 'Set up and evaluate both integrals.'),
      S('integration-applications-science', 'Work, flow and density', 'Apply integration to work, fluid flow and variable density.')
    ]),
    M('M8.7', 'Differential equations', 'Equations about change itself.', [
      S('separable-de', 'Separable equations', 'Solve by separating variables and applying an initial condition.'),
      S('slope-fields', 'Slope fields', 'Sketch and read a slope field and match it to an equation.'),
      S('exponential-logistic', 'Exponential and logistic models', 'Solve and interpret both growth models.'),
      S('euler-method', 'Euler method', 'Approximate a solution numerically and judge the error.')
    ]),
    M('M8.8', 'Series', 'Infinitely many terms, finitely useful.', [
      S('series-convergence-tests', 'Convergence tests', 'Apply nth-term, integral, comparison, ratio, root and alternating tests.'),
      S('power-series', 'Power series and radius of convergence', 'Find the interval of convergence.'),
      S('taylor-maclaurin', 'Taylor and Maclaurin series', 'Build a series for a function and bound the remainder.'),
      S('series-applications', 'Using series', 'Approximate values and integrals with a truncated series.')
    ]),
    M('M8.9', 'Parametric, polar and vector calculus', 'Calculus off the function graph.', [
      S('parametric-calculus', 'Calculus with parametric equations', 'Differentiate and find arc length for a parametric curve.'),
      S('polar-calculus', 'Calculus in polar coordinates', 'Find slopes and areas for polar curves.'),
      S('vector-valued-functions', 'Vector-valued functions', 'Differentiate and integrate to analyse motion in the plane.')
    ]),
    M('M8.10', 'Several variables', 'The first step into multivariable calculus.', [
      S('partial-derivatives', 'Partial derivatives', 'Differentiate with respect to one variable at a time and read the meaning.'),
      S('gradient-directional', 'Gradient and directional derivatives', 'Compute the gradient and use it to find steepest ascent.'),
      S('multivariable-chain', 'The multivariable chain rule', 'Differentiate through several intermediate variables.'),
      S('double-integrals', 'Double integrals', 'Set up and evaluate over rectangular and general regions.'),
      S('lagrange-multipliers', 'Constrained optimisation', 'Optimise subject to a constraint with Lagrange multipliers.')
    ])
  ]),

  /* ============================== LEVEL 9 ============================== */
  L('L9', 'Discrete Mathematics and the Maths of Computing', 'Logic, proof, counting, number theory, binary, graphs and complexity — the mathematics programming actually runs on.', [
    M('M9.1', 'Logic', 'Statements that are definitely true or definitely false.', [
      S('propositional-logic', 'Propositions and connectives', 'Translate statements into symbols and evaluate them.'),
      S('truth-tables', 'Truth tables', 'Build a truth table and classify a statement as tautology, contradiction or neither.'),
      S('logical-equivalence', 'Logical equivalence', 'Prove equivalences, including De Morgan laws, and simplify conditions.'),
      S('quantifiers', 'Quantifiers', 'Read, write and negate statements with for-all and there-exists.'),
      S('logic-in-code', 'Logic in code', 'Simplify a compound boolean condition and explain short-circuit evaluation.')
    ]),
    M('M9.2', 'Sets, relations and functions', 'The language all of mathematics is written in.', [
      S('set-operations', 'Set operations', 'Compute unions, intersections, differences and complements, with Venn diagrams.'),
      S('set-identities', 'Set identities and proofs', 'Prove a set identity by element chasing or by algebra of sets.'),
      S('cartesian-power-sets', 'Cartesian products and power sets', 'Construct both and count their elements.'),
      S('relations-properties', 'Relations', 'Test reflexivity, symmetry, transitivity, and identify equivalence relations and partial orders.'),
      S('function-types-counting', 'Injections, surjections, bijections', 'Classify a function and count how many of each type exist.'),
      S('cardinality-infinite', 'Counting the infinite', 'Explain countability and the diagonal argument.')
    ]),
    M('M9.3', 'Proof', 'How a claim becomes knowledge.', [
      S('direct-proof', 'Direct proof', 'Prove a straightforward implication cleanly.'),
      S('contrapositive-contradiction', 'Contrapositive and contradiction', 'Choose and execute the indirect methods, including irrationality of root two.'),
      S('proof-by-cases', 'Proof by cases', 'Split exhaustively and prove each case.'),
      S('induction', 'Mathematical induction', 'Prove a statement for all naturals, with a correct base case and inductive step.'),
      S('strong-induction', 'Strong induction and well-ordering', 'Use the stronger hypothesis where ordinary induction stalls.'),
      S('invariants', 'Invariants', 'Find a quantity that never changes and use it to prove impossibility, including loop invariants.')
    ]),
    M('M9.4', 'Combinatorics', 'Counting without listing.', [
      S('counting-rules', 'Sum and product rules', 'Decompose a counting problem into stages and alternatives.'),
      S('permutations-advanced', 'Permutations with constraints', 'Count arrangements with restrictions, repetition and circular symmetry.'),
      S('combinations-advanced', 'Combinations and binomial coefficients', 'Count selections and prove identities on Pascal triangle.'),
      S('inclusion-exclusion', 'Inclusion-exclusion', 'Count unions of overlapping sets correctly.'),
      S('pigeonhole', 'The pigeonhole principle', 'Prove existence by counting containers.'),
      S('stars-and-bars', 'Distributions', 'Count ways to distribute identical and distinct objects into boxes.'),
      S('recurrence-counting', 'Counting with recurrences', 'Set up a recurrence for a counting problem and solve it.')
    ]),
    M('M9.5', 'Number theory', 'The mathematics behind cryptography.', [
      S('divisibility-proofs', 'Divisibility', 'Prove divisibility statements and use the division algorithm.'),
      S('euclidean-algorithm', 'The Euclidean algorithm', 'Compute a GCD fast and run it backwards for Bezout coefficients.'),
      S('modular-arithmetic', 'Modular arithmetic', 'Compute in a modulus, including fast exponentiation.'),
      S('modular-inverse', 'Modular inverses and linear congruences', 'Solve congruences and find inverses where they exist.'),
      S('crt', 'The Chinese remainder theorem', 'Solve simultaneous congruences.'),
      S('fermat-euler', 'Fermat and Euler theorems', 'Apply them to reduce enormous exponents.'),
      S('rsa-idea', 'How RSA works', 'Explain and execute a toy RSA encryption and decryption.'),
      S('hashing-mod', 'Modular arithmetic in code', 'Use modulus for hashing, cycling indices and overflow-safe arithmetic.')
    ]),
    M('M9.6', 'Number bases and bits', 'How a machine actually stores a number.', [
      S('binary-conversion', 'Binary, hex and octal', 'Convert between bases in both directions, fluently.'),
      S('binary-arithmetic', 'Arithmetic in binary', 'Add, subtract and multiply in binary and hex.'),
      S('twos-complement', 'Negative numbers in binary', 'Represent and interpret signed integers in two complement, and explain overflow.'),
      S('bitwise-operations', 'Bitwise operations', 'Use AND, OR, XOR, NOT, shifts and masks to read and set bits.'),
      S('bit-tricks', 'Bit tricks worth knowing', 'Test parity, count bits, swap values and use powers of two.'),
      S('floating-point', 'Floating point', 'Explain why ~0.1 + 0.2 \\ne 0.3~, and when to compare with a tolerance.'),
      S('numerical-error', 'Numerical error', 'Recognise rounding, truncation and catastrophic cancellation.')
    ]),
    M('M9.7', 'Boolean algebra and digital logic', 'Arithmetic with true and false.', [
      S('boolean-algebra', 'Boolean algebra', 'Simplify boolean expressions with the laws.'),
      S('logic-gates', 'Gates and circuits', 'Translate between expressions, truth tables and gate diagrams.'),
      S('normal-forms-karnaugh', 'Normal forms and minimisation', 'Build sum-of-products form and minimise with a Karnaugh map.')
    ]),
    M('M9.8', 'Recursion and recurrences', 'Definitions that refer to themselves.', [
      S('recursive-definitions', 'Recursive definitions', 'Define sequences, structures and functions recursively and unfold them.'),
      S('solve-recurrences', 'Solving recurrences', 'Solve linear recurrences by iteration and by characteristic equation.'),
      S('master-theorem', 'Divide and conquer recurrences', 'Apply the master theorem to predict running time.'),
      S('recursion-to-iteration', 'Recursion, memoisation and dynamic programming', 'Convert a recurrence into an efficient computation and count the work saved.')
    ]),
    M('M9.9', 'Algorithm analysis', 'How to say how fast a program is.', [
      S('big-o-definition', 'Big-O, Omega and Theta', 'Define each precisely and prove a simple bound.'),
      S('growth-rates', 'Comparing growth rates', 'Order functions by growth and know the standard hierarchy.'),
      S('counting-operations', 'Counting operations in code', 'Derive a running time from loops and nesting, using summation formulas.'),
      S('logs-in-algorithms', 'Why logarithms appear', 'Explain where a log comes from in halving and tree-shaped algorithms.'),
      S('amortised-analysis', 'Amortised analysis', 'Average cost over a sequence of operations, as in a growing array.'),
      S('space-complexity', 'Space complexity', 'Analyse memory use, including recursion depth.')
    ]),
    M('M9.10', 'Graphs', 'Dots and connections, and the algorithms on them.', [
      S('graph-vocabulary', 'Graph vocabulary', 'Use degree, path, cycle, connectedness and the handshake lemma.'),
      S('graph-representations', 'Representing a graph', 'Convert between adjacency matrix, adjacency list and edge list, and compare costs.'),
      S('trees', 'Trees', 'Use tree properties, count edges, and work with rooted trees and traversals.'),
      S('traversal-shortest-path', 'Traversal and shortest paths', 'Trace breadth-first, depth-first and Dijkstra by hand.'),
      S('euler-hamilton', 'Euler and Hamilton paths', 'Decide existence from degrees and reason about the difference in difficulty.'),
      S('graph-colouring', 'Colouring and bipartite graphs', 'Colour a graph, detect bipartiteness, and apply both to scheduling.'),
      S('dags-topological', 'Directed acyclic graphs', 'Topologically sort a DAG and use it for dependency order.'),
      S('spanning-trees', 'Minimum spanning trees', 'Trace Kruskal and Prim and argue why they work.')
    ]),
    M('M9.11', 'Discrete probability for computing', 'Randomness inside algorithms.', [
      S('discrete-prob-basics', 'Discrete probability', 'Compute probabilities over finite sample spaces.'),
      S('expected-value-algorithms', 'Expected value in algorithms', 'Compute expected running time and expected counts by linearity.'),
      S('hashing-collisions', 'Collisions and the birthday problem', 'Estimate collision probability and load factor.'),
      S('randomised-algorithms', 'Randomised algorithms', 'Analyse a random choice, as in quicksort pivots or reservoir sampling.'),
      S('markov-chains-intro', 'Markov chains', 'Set up a transition matrix and find a steady state.')
    ]),
    M('M9.12', 'From mathematics to code', 'The translation table, in both directions.', [
      S('variables-vs-unknowns', 'A variable in algebra is not a variable in code', 'Explain the difference between an unknown, a parameter and a mutable binding.'),
      S('functions-math-vs-code', 'Functions in mathematics and in code', 'Compare purity, side effects, domain and type signatures.'),
      S('sigma-to-loops', 'Sigma notation is a for loop', 'Convert between summation, product notation and loops, both ways.'),
      S('sequences-to-arrays', 'Sequences, vectors and arrays', 'Convert index conventions and avoid off-by-one errors.'),
      S('piecewise-to-conditionals', 'Piecewise definitions are if-statements', 'Translate a piecewise function into branching code and back.'),
      S('integer-vs-float-division', 'Integer division, modulo and rounding in code', 'Predict what a language does with division, negatives and rounding.'),
      S('math-to-algorithm', 'Turning a formula into an algorithm', 'Take a formula and write it as a correct, efficient procedure.')
    ]),
    M('M9.13', 'Numerical methods', 'When there is no closed form.', [
      S('bisection', 'Bisection', 'Bracket a root and halve the interval to a required accuracy.'),
      S('newton-method', 'Newton method', 'Iterate to a root, and recognise where it fails.'),
      S('fixed-point-iteration', 'Fixed-point iteration', 'Rearrange to an iteration and test convergence.'),
      S('numerical-integration', 'Numerical integration', 'Apply trapezoid and Simpson rules and estimate the error.'),
      S('interpolation', 'Interpolation and curve fitting', 'Fit a line or polynomial through given points.')
    ])
  ]),

  /* ============================== LEVEL 10 ============================= */
  L('L10', 'Linear Algebra', 'Vectors, matrices and the geometry of data — the mathematics of machine learning and portfolios.', [
    M('M10.1', 'Vectors and spaces', 'The objects.', [
      S('vectors-rn', 'Vectors in n dimensions', 'Add, scale and measure vectors in any dimension.'),
      S('linear-combinations-span', 'Linear combinations and span', 'Decide what a set of vectors can reach.'),
      S('linear-independence', 'Linear independence', 'Test independence and interpret dependence geometrically.'),
      S('basis-dimension', 'Basis and dimension', 'Find a basis and state the dimension of a space.'),
      S('subspaces', 'Subspaces', 'Verify a subspace and identify the standard examples.')
    ]),
    M('M10.2', 'Matrices and systems', 'Solving many equations at once.', [
      S('matrix-as-transformation', 'A matrix is a transformation', 'Read a matrix as a map and predict its effect on the plane.'),
      S('matrix-multiplication-meaning', 'Matrix multiplication as composition', 'Multiply matrices and explain the order.'),
      S('gaussian-elimination', 'Gaussian elimination', 'Row reduce to echelon and reduced echelon form.'),
      S('rank-nullity', 'Rank, pivots and free variables', 'Read the solution structure off the reduced form.'),
      S('null-column-space', 'Null space and column space', 'Find bases for both and state the rank-nullity relationship.'),
      S('matrix-inverse-methods', 'Inverses', 'Invert a matrix by elimination and know when it is impossible.'),
      S('lu-factorisation', 'Factorising a matrix', 'Produce an LU factorisation and use it to solve repeatedly.')
    ]),
    M('M10.3', 'Determinants and geometry', 'Volume, orientation and invertibility.', [
      S('determinant-compute', 'Computing determinants', 'Compute by expansion and by row reduction.'),
      S('determinant-geometry', 'What a determinant means', 'Interpret it as signed area or volume scaling.'),
      S('cross-product', 'Cross product and triple product', 'Compute and interpret both in three dimensions.')
    ]),
    M('M10.4', 'Eigenvalues', 'The directions a transformation leaves alone.', [
      S('eigen-compute', 'Eigenvalues and eigenvectors', 'Find them from the characteristic polynomial.'),
      S('diagonalisation', 'Diagonalisation', 'Diagonalise a matrix and use it to take powers.'),
      S('eigen-applications', 'Applications of eigenvalues', 'Apply to Markov chains, population models and stability.')
    ]),
    M('M10.5', 'Orthogonality and least squares', 'The engine inside regression.', [
      S('dot-product-projection', 'Projections', 'Project one vector onto another and onto a subspace.'),
      S('orthogonal-bases', 'Orthogonal bases and Gram-Schmidt', 'Build an orthonormal basis and produce a QR factorisation.'),
      S('least-squares', 'Least squares', 'Derive and solve the normal equations, and recognise linear regression inside them.'),
      S('quadratic-forms', 'Quadratic forms and definiteness', 'Classify a quadratic form and test positive definiteness.'),
      S('svd-pca', 'SVD and principal components', 'Explain the decomposition and what PCA extracts from a covariance matrix.')
    ]),
    M('M10.6', 'Applications', 'Where this shows up.', [
      S('linalg-graphics', 'Transformations in graphics', 'Build rotation, scaling and translation matrices in homogeneous coordinates.'),
      S('linalg-graphs', 'Adjacency matrices', 'Use matrix powers to count walks in a graph.'),
      S('linalg-portfolios', 'Covariance matrices and portfolios', 'Compute portfolio variance from weights and a covariance matrix.'),
      S('linalg-ml', 'Linear algebra in machine learning', 'Express a linear model, its loss and its gradient in matrix form.')
    ])
  ]),

  /* ============================== LEVEL 11 ============================= */
  L('L11', 'Probability and Statistics', 'Reasoning under uncertainty, and the traps that make most statistics wrong.', [
    M('M11.1', 'Probability foundations', 'The rules.', [
      S('sample-spaces', 'Sample spaces and events', 'Build a sample space and compute probabilities by counting.'),
      S('probability-axioms', 'Axioms and consequences', 'Apply the axioms, complements and the general addition rule.'),
      S('independence', 'Independence', 'Test independence and avoid assuming it.'),
      S('conditional-probability', 'Conditional probability', 'Compute conditional probabilities and use trees.'),
      S('bayes-theorem', 'Bayes theorem', 'Update a probability on evidence, and handle base rates correctly.'),
      S('false-positive-paradox', 'Why a positive test often means little', 'Compute the posterior for a rare condition and explain the result.')
    ]),
    M('M11.2', 'Random variables', 'Numbers that come out of a random process.', [
      S('random-variable-basics', 'Random variables and distributions', 'Distinguish discrete from continuous and read a PMF, PDF and CDF.'),
      S('expectation', 'Expected value', 'Compute expectation and apply linearity.'),
      S('variance-sd', 'Variance and standard deviation', 'Compute both and use the shortcut formula.'),
      S('transformations-rv', 'Transforming a random variable', 'Find the mean and variance of a linear transformation and of a sum.'),
      S('joint-distributions', 'Joint distributions', 'Work with joint, marginal and conditional distributions.'),
      S('covariance-correlation', 'Covariance and correlation', 'Compute both, interpret the sign and size, and state what correlation cannot tell you.')
    ]),
    M('M11.3', 'The standard distributions', 'The handful you actually need.', [
      S('bernoulli-binomial', 'Bernoulli and binomial', 'Identify the setting and compute probabilities, mean and variance.'),
      S('geometric-negbinomial', 'Geometric and negative binomial', 'Model waiting times in trials.'),
      S('poisson', 'Poisson', 'Model counts in an interval and use the approximation to the binomial.'),
      S('uniform-exponential', 'Uniform and exponential', 'Compute probabilities and explain memorylessness.'),
      S('normal-distribution', 'The normal distribution', 'Standardise, use z-scores and read the empirical rule.'),
      S('lognormal', 'The lognormal distribution', 'Explain why multiplicative growth produces it, as in asset prices.'),
      S('t-chisq-f', 'Student t, chi-square and F', 'Say what each is for and when it replaces the normal.')
    ]),
    M('M11.4', 'From sample to population', 'Why a sample tells you anything at all.', [
      S('sampling-methods', 'Sampling', 'Distinguish sampling methods and identify the bias each invites.'),
      S('lln-clt', 'Law of large numbers and central limit theorem', 'State both precisely and apply the CLT to a sample mean.'),
      S('sampling-distribution', 'Sampling distributions and standard error', 'Compute the standard error and explain how it shrinks.'),
      S('confidence-intervals', 'Confidence intervals', 'Construct and interpret intervals for a mean and a proportion.'),
      S('sample-size', 'Choosing a sample size', 'Compute the size needed for a target margin of error.')
    ]),
    M('M11.5', 'Inference', 'Deciding what the data supports.', [
      S('hypothesis-testing-logic', 'The logic of a hypothesis test', 'State hypotheses, compute a test statistic, and interpret a p-value honestly.'),
      S('type-errors-power', 'Errors and power', 'Distinguish the two error types and reason about power and effect size.'),
      S('t-tests', 't-tests', 'Run one-sample, two-sample and paired tests and check their assumptions.'),
      S('proportion-tests', 'Tests for proportions', 'Run one- and two-proportion tests.'),
      S('chi-square-tests', 'Chi-square tests', 'Test goodness of fit and independence from a contingency table.'),
      S('anova-intro', 'ANOVA', 'Compare several means and interpret the F statistic.'),
      S('multiple-testing', 'Multiple testing', 'Explain why twenty tests produce a false positive, and correct for it.')
    ]),
    M('M11.6', 'Regression', 'Fitting a relationship to data.', [
      S('simple-regression', 'Simple linear regression', 'Fit a line, interpret slope and intercept, and compute residuals.'),
      S('regression-quality', 'How good is the fit', 'Interpret ~R^{2}~, residual plots and standard error of the estimate.'),
      S('multiple-regression', 'Multiple regression', 'Interpret coefficients while holding other variables constant.'),
      S('regression-assumptions', 'Assumptions and diagnostics', 'Check linearity, independence, homoscedasticity and normality of residuals.'),
      S('overfitting', 'Overfitting and validation', 'Explain overfitting and use a holdout or cross-validation to detect it.'),
      S('logistic-regression-intro', 'Logistic regression', 'Model a binary outcome and read odds ratios.')
    ]),
    M('M11.7', 'Bayesian and computational statistics', 'Two modern tools.', [
      S('bayesian-updating', 'Priors and posteriors', 'Update a prior with data and interpret a credible interval.'),
      S('monte-carlo', 'Monte Carlo simulation', 'Estimate a probability or an integral by simulation and quantify the error.'),
      S('bootstrap', 'The bootstrap', 'Resample to estimate a sampling distribution without a formula.')
    ]),
    M('M11.8', 'How statistics goes wrong', 'The module that protects every result you will ever produce.', [
      S('correlation-causation', 'Correlation and causation', 'Identify confounding and explain what would establish causation.'),
      S('selection-survivorship', 'Selection and survivorship bias', 'Spot a sample that excludes the cases that matter.'),
      S('data-snooping', 'Data snooping and p-hacking', 'Explain why a result found by searching needs out-of-sample confirmation.'),
      S('simpsons-paradox', 'Simpson paradox', 'Construct a case where a trend reverses on aggregation.'),
      S('regression-to-mean', 'Regression to the mean', 'Recognise it and avoid crediting an intervention for it.'),
      S('base-rate-misreading', 'Misreading risk', 'Convert between relative and absolute risk and read a misleading claim correctly.')
    ])
  ]),

  /* ============================== LEVEL 12 ============================= */
  L('L12', 'Applied Tracks', 'The same mathematics aimed at money, markets, data and code. Take any track in any order.', [
    M('M12.1', 'Money mathematics and accounting', 'Finance, bookkeeping and the CPA arithmetic.', [
      S('time-value-money', 'Time value of money', 'Move a single amount between present and future value.'),
      S('annuities', 'Annuities and perpetuities', 'Value a stream of equal payments, ordinary and due.'),
      S('loan-amortisation', 'Loan amortisation', 'Compute a payment and build an amortisation schedule.'),
      S('npv-irr', 'NPV and IRR', 'Appraise a project and explain where IRR misleads.'),
      S('nominal-effective-rates', 'Nominal, effective and continuous rates', 'Convert between quoted and effective rates at any compounding frequency.'),
      S('depreciation', 'Depreciation', 'Apply straight-line, declining-balance and units-of-production methods.'),
      S('break-even-margin', 'Break-even and contribution margin', 'Compute break-even in units and revenue, and apply a margin of safety.'),
      S('financial-ratios', 'Financial ratio analysis', 'Compute liquidity, leverage, efficiency and profitability ratios and read them.'),
      S('variance-analysis', 'Budget variance analysis', 'Split a variance into price and quantity components.'),
      S('bond-pricing', 'Bond pricing and yields', 'Price a bond, compute current yield and yield to maturity, and explain duration.'),
      S('payroll-tax-arithmetic', 'Payroll, tax and invoice arithmetic', 'Compute gross to net pay, marginal versus effective tax, and sales tax.')
    ]),
    M('M12.2', 'Trading and quantitative mathematics', 'The arithmetic of risk and return.', [
      S('returns-arithmetic-log', 'Simple and log returns', 'Compute both, know when each is additive, and convert between them.'),
      S('compounding-cagr', 'Compounding and CAGR', 'Annualise a return and explain why the average return overstates growth.'),
      S('volatility-annualisation', 'Volatility', 'Compute return standard deviation and annualise it by the square root of time.'),
      S('sharpe-sortino', 'Risk-adjusted return', 'Compute Sharpe and Sortino ratios and state their assumptions.'),
      S('drawdown', 'Drawdown', 'Compute maximum drawdown and the gain needed to recover.'),
      S('expectancy', 'Expectancy', 'Compute expected value per trade from win rate and payoff ratio.'),
      S('position-sizing', 'Position sizing', 'Size a position from account risk, stop distance and contract value.'),
      S('kelly-criterion', 'The Kelly criterion', 'Compute the Kelly fraction and explain why practitioners use a fraction of it.'),
      S('risk-of-ruin', 'Risk of ruin', 'Estimate the probability of losing a given fraction of capital.'),
      S('correlation-diversification', 'Correlation and diversification', 'Compute portfolio variance from two assets and show what correlation buys.'),
      S('beta-hedging', 'Beta and hedge ratios', 'Compute beta and the hedge size it implies.'),
      S('option-payoffs', 'Option payoff mathematics', 'Build payoff and profit diagrams for calls, puts and spreads at expiry.'),
      S('put-call-parity', 'Put-call parity', 'Apply parity to price a put from a call and spot an arbitrage.'),
      S('black-scholes-structure', 'The Black-Scholes formula', 'Read what each input does and interpret the greeks as derivatives.'),
      S('implied-volatility', 'Implied volatility', 'Explain what implied volatility is and how it is backed out.'),
      S('monte-carlo-pricing', 'Monte Carlo for prices', 'Simulate a price path from a lognormal model and price a payoff.'),
      S('backtest-statistics', 'Backtest statistics', 'Compute the statistics a backtest must report and name the ways they lie.')
    ]),
    M('M12.3', 'Data science and machine learning mathematics', 'What is under the libraries.', [
      S('features-vectors', 'Data as vectors and matrices', 'Represent a dataset as a design matrix and interpret its shape.'),
      S('loss-functions', 'Loss functions', 'Compute squared error, absolute error and cross-entropy by hand.'),
      S('gradient-descent', 'Gradient descent', 'Run iterations by hand and explain the learning rate.'),
      S('logistic-sigmoid', 'The sigmoid and logistic model', 'Compute predicted probabilities and interpret coefficients.'),
      S('regularisation', 'Regularisation', 'Explain what L1 and L2 penalties do to coefficients.'),
      S('bias-variance', 'Bias and variance', 'Decompose error and diagnose underfitting against overfitting.'),
      S('cross-validation-math', 'Cross-validation', 'Compute a k-fold estimate and state what it does and does not protect against.'),
      S('entropy-information', 'Entropy and information gain', 'Compute entropy and the gain from a split.'),
      S('distance-metrics', 'Distance and similarity', 'Compute Euclidean, Manhattan and cosine measures and pick between them.'),
      S('neural-forward-backward', 'A neural network by hand', 'Run a forward pass and one backpropagation step on a tiny network.')
    ]),
    M('M12.4', 'Optimisation', 'Finding the best answer subject to constraints.', [
      S('linear-programming', 'Linear programming', 'Formulate a problem and solve it graphically.'),
      S('simplex-intuition', 'How simplex works', 'Explain movement between vertices and read a tableau.'),
      S('duality', 'Duality and shadow prices', 'Build the dual and interpret its values.'),
      S('convexity', 'Convexity', 'Test convexity and explain why it guarantees a global optimum.'),
      S('constrained-optimisation', 'Constrained optimisation', 'Solve with substitution and with Lagrange multipliers.'),
      S('integer-programming', 'Integer and combinatorial optimisation', 'Formulate assignment and knapsack problems and explain the difficulty.'),
      S('queueing-basics', 'Queueing', 'Apply Little law and basic queue results.')
    ]),
    M('M12.5', 'Mathematics for programming interviews', 'The quantitative half of technical interviews.', [
      S('complexity-estimation', 'Estimating complexity on sight', 'Give the time and space complexity of a described algorithm, with justification.'),
      S('modular-tricks', 'Modular arithmetic in practice', 'Apply modular identities for hashing, cycling and big-number arithmetic.'),
      S('combinatorics-grids', 'Counting paths and arrangements', 'Count lattice paths and arrangements with constraints.'),
      S('dp-recurrences', 'Dynamic programming recurrences', 'Write the recurrence and state its complexity before coding.'),
      S('probability-interview', 'Probability puzzles', 'Solve the standard interview probability and expected-value questions.'),
      S('estimation-fermi', 'Estimation questions', 'Produce a defensible order-of-magnitude estimate from stated assumptions.')
    ])
  ])
  ];

  root.CURRICULUM = { version: 1, levels: LEVELS };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.CURRICULUM;
})(typeof window !== 'undefined' ? window : globalThis);

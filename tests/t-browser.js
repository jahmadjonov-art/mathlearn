/* Drives the real page in Chromium: first run, placement, a practice session,
   answering right and wrong, review scheduling, and the course map. Fails on any
   console error or page exception. */
const { chromium } = require('playwright');
const path = require('path');
const http = require('http');
const fs = require('fs');

/* Serve src/ over HTTP so relative fetches behave as they do when published. */
const ROOT = path.resolve(__dirname, '../src');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('not found');
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
let BASE = '';


/* Open a geometry skill and report on its diagram as the learner sees it. */
async function openGeometry(page) {
  await page.click('[data-tab="map"]');
  await page.waitForSelector('details.lvl');
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('[data-act]')]
      .find(e => e.getAttribute('data-act') === 'teach:pythagoras');
    if (b) b.click();
  });
  await page.waitForSelector('.steps li', { timeout: 5000 });
  return page.evaluate(() => {
    const f = document.querySelector('svg.fig');
    if (!f) return null;
    const r = f.getBoundingClientRect();
    return { w: r.width, h: r.height, right: r.right, vw: window.innerWidth,
             ink: getComputedStyle(f).color, card: getComputedStyle(f.closest('.card')).backgroundColor };
  });
}
function rgbDiff(a, b) {
  const p = t => (String(t).match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  const x = p(a), y = p(b);
  return Math.abs(x[0] - y[0]) + Math.abs(x[1] - y[1]) + Math.abs(x[2] - y[2]);
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  BASE = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const issues = [], log = [];
  function say(s) { log.push(s); console.log(s); }

  for (const scheme of ['light', 'dark']) {
    const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 400, height: 900 } });
    const page = await ctx.newPage();
    /* The sandbox proxy blocks fonts.googleapis.com, which is environmental and
       not a page bug; everything else is reported. */
    const benign = /ERR_CERT_AUTHORITY_INVALID|fonts\.(googleapis|gstatic)|favicon\.ico/;
    page.on('console', m => {
      if (m.type() !== 'error') return;
      /* the message text for a failed request does not name the URL, so check
         where the message came from as well */
      const where = (m.location() && m.location().url) || '';
      if (benign.test(m.text()) || benign.test(where)) return;
      issues.push(scheme + ' console: ' + m.text() + (where ? '  <' + where + '>' : ''));
    });
    page.on('pageerror', e => issues.push(scheme + ' pageerror: ' + e.message));
    await page.goto(BASE + '/index.html');
    await page.waitForSelector('text=Mathematics from the beginning', { timeout: 8000 });
    say(scheme + ': first-run screen rendered');

    /* no horizontal overflow at phone width */
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 1) issues.push(scheme + ': page scrolls sideways by ' + over + 'px');

    /* theme tokens actually resolve to a painted background */
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    if (!bg || bg === 'rgba(0, 0, 0, 0)') issues.push(scheme + ': body has no background colour');
    say(scheme + ': body background ' + bg);

    if (scheme === 'light') {
      /* ---- learn, then practise ---- */
      await page.click('text=Start at the beginning');
      await page.waitForSelector('.steps li');
      const stepCount = await page.locator('.steps li').count();
      if (stepCount < 2) issues.push('worked example had ' + stepCount + ' steps');
      say('worked example shown with ' + stepCount + ' steps');

      /* the written lesson for this module must load and render */
      await page.waitForFunction(() => /\b(why|Counting in steps|number line)\b/i.test(document.body.innerText) &&
        document.querySelectorAll('.prose').length > 0, null, { timeout: 5000 }).catch(() => {});
      const proseLen = await page.evaluate(() => {
        const ps = [...document.querySelectorAll('.prose')].map(e => e.innerText).join(' ');
        return ps.length;
      });
      if (proseLen < 120) issues.push('lesson prose did not load (' + proseLen + ' chars)');
      else say('lesson prose loaded (' + proseLen + ' chars)');
      const hasTrap = await page.locator('text=Where people go wrong').count();
      if (!hasTrap) issues.push('traps section missing from the lesson');

      await page.click('text=Your turn');
      await page.waitForSelector('.qtext');
      say('practice session started');

      /* answer eight questions, deliberately wrong on the first */
      let answered = 0, sawCorrect = false, sawWrong = false;
      for (let i = 0; i < 10; i++) {
        if (await page.locator('.verdict').count()) {
          const next = page.locator('[data-act="next-q"]');
          if (!(await next.count())) break;
          await next.click();
          await page.waitForTimeout(60);
          continue;
        }
        const mc = await page.locator('[data-choice]').count();
        if (mc) {
          await page.locator('[data-choice]').nth(answered === 0 ? Math.max(0, mc - 1) : 0).click();
        } else {
          /* read the right answer out of the page's own state, then type it or a wrong value */
          const info = await page.evaluate(() => {
            const st = window.__peek && window.__peek();
            return st;
          });
          const fields = await page.locator('.fields .field input').count();
          if (fields) {
            for (let f = 0; f < fields; f++) {
              await page.locator('.fields .field input').nth(f).fill(answered === 0 ? '999999' : String(info.fields[f]));
            }
          } else {
            await page.fill('#ans0', answered === 0 ? '999999' : info.answer);
          }
          await page.click('[data-act="check"]');
        }
        await page.waitForSelector('.verdict', { timeout: 4000 });
        const cls = await page.locator('.verdict').first().getAttribute('class');
        if (cls.includes('ok')) sawCorrect = true; else sawWrong = true;
        answered++;
        if (answered >= 4) break;
      }
      if (!sawWrong) issues.push('never produced a wrong verdict');
      if (!sawCorrect) issues.push('never produced a correct verdict');
      say('answered ' + answered + ' questions; saw correct and wrong verdicts');

      /* a wrong answer must show the full working */
      const solShown = await page.locator('.verdict .steps li').count();
      if (!solShown) issues.push('no worked solution in the verdict');

      /* progress persisted to localStorage */
      const stored = await page.evaluate(() => {
        try { return JSON.parse(localStorage.getItem('mathacademy.progress.v2')); } catch (e) { return null; }
      });
      if (!stored || !Object.keys(stored.skills || {}).length) issues.push('progress not saved locally');
      else say('progress saved: ' + Object.keys(stored.skills).length + ' skill(s) touched, ' +
        Object.values(stored.skills).reduce((a, s) => a + s.a, 0) + ' answers');

      /* ---- navigate every tab ---- */
      for (const tab of ['map', 'review', 'stats', 'about', 'today']) {
        await page.click('[data-tab="' + tab + '"]');
        await page.waitForTimeout(120);
        const txt = await page.locator('#view').innerText();
        if (!txt || txt.length < 40) issues.push('tab ' + tab + ' rendered almost nothing');
        if (/undefined|NaN|\[object/.test(txt)) issues.push('tab ' + tab + ' shows a stray value: ' +
          txt.slice(0, 160).replace(/\n/g, ' '));
      }
      say('all tabs render');

      /* ---- the course map opens and lists every level ---- */
      await page.click('[data-tab="map"]');
      await page.waitForSelector('details.lvl');
      const levels = await page.locator('details.lvl').count();
      if (levels !== 13) issues.push('course map shows ' + levels + ' levels, expected 13');
      await page.locator('details.lvl').first().locator('summary').click();
      await page.waitForTimeout(150);
      const skills = await page.locator('details.lvl').first().locator('.skill').count();
      if (skills < 5) issues.push('level 0 shows ' + skills + ' skills');
      say('course map: ' + levels + ' levels, first level lists ' + skills + ' skills');

      /* ---- a level-4 skill end to end: the algebra answer path ---- */
      await page.click('[data-tab="map"]');
      await page.waitForSelector('details.lvl');
      const l4 = page.locator('details.lvl[data-level="L4"]');
      await l4.locator('summary').click();
      await page.waitForTimeout(150);
      const openAnyway = l4.locator('[data-act="open-level:L4"]');
      if (await openAnyway.count()) { await openAnyway.click(); await page.waitForTimeout(200); }
      /* factoring is an expr question graded by equivalence — the newest path in the UI */
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('[data-act]')]
          .find(e => e.getAttribute('data-act') === 'teach:factor-trinomial-1');
        if (b) b.click();
      });
      await page.waitForSelector('.steps li', { timeout: 5000 });
      const l4prose = await page.evaluate(() =>
        [...document.querySelectorAll('.prose')].map(e => e.innerText).join(' ').length);
      if (l4prose < 120) issues.push('level 4 lesson prose did not load (' + l4prose + ' chars)');
      else say('level 4 lesson loaded (' + l4prose + ' chars)');

      await page.click('text=Your turn');
      await page.waitForSelector('.qtext');
      const exprInfo = await page.evaluate(() => window.__peek && window.__peek());
      if (!exprInfo || exprInfo.kind !== 'expr') {
        issues.push('expected an expression question, got ' + (exprInfo && exprInfo.kind));
      } else {
        /* type the answer the way a learner would, without the explicit * signs */
        await page.fill('#ans0', exprInfo.answer.replace(/\*/g, ''));
        await page.click('[data-act="check"]');
        await page.waitForSelector('.verdict');
        const cls = await page.locator('.verdict').first().getAttribute('class');
        if (!cls.includes('ok')) issues.push('a correct factored answer was marked wrong: ' + exprInfo.answer);
        else say('algebra answer accepted without explicit multiplication signs');
      }

      /* a geometry skill: the diagram must render, fit a phone, and appear in practice too */
      const fig = await openGeometry(page);
      if (!fig) issues.push('light: a geometry skill showed no diagram in its worked example');
      else {
        if (fig.right > fig.vw + 1 || fig.w < 120) issues.push('light: the diagram does not fit the phone width ' + JSON.stringify(fig));
        else say('light: geometry diagram renders ' + Math.round(fig.w) + 'px wide inside a ' + fig.vw + 'px screen');
        if (rgbDiff(fig.ink, fig.card) < 250) issues.push('light: diagram lines have too little contrast with their card');
      }
      await page.click('text=Your turn');
      await page.waitForSelector('.qtext');
      if (!(await page.locator('svg.fig').count())) issues.push('light: a geometry question showed no diagram while practising');
      else say('light: the diagram also appears while practising');

      /* the About page must state the build status without a stale hardcoded range */
      await page.click('[data-tab="about"]');
      await page.waitForTimeout(150);
      const about = await page.locator('#view').innerText();
      if (!/Levels 0 to 5/.test(about)) issues.push('About page does not report levels 0 to 5 as built: ' +
        (about.match(/Levels[^.]*\./) || ['(no match)'])[0]);
      else say('About page reports the built range correctly');

      /* reload keeps progress */
      await page.reload();
      await page.waitForTimeout(900);
      const after = await page.locator('#chip-today').innerText();
      if (!/[1-9]/.test(after)) issues.push('answer count lost on reload (' + after + ')');
      say('after reload the day counter reads "' + after + '"');
    }
    if (scheme === 'dark') {
      const fig = await openGeometry(page);
      if (!fig) issues.push('dark: a geometry skill showed no diagram');
      else {
        if (rgbDiff(fig.ink, fig.card) < 250) issues.push('dark: diagram lines blend into the card: ink ' + fig.ink + ' on ' + fig.card);
        else say('dark: diagram contrast is fine (' + fig.ink + ' on ' + fig.card + ')');
      }
    }
    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log('');
  if (issues.length) { console.log(issues.length + ' ISSUE(S):'); issues.forEach(i => console.log(' - ' + i)); process.exit(1); }
  console.log('browser run clean');
})();

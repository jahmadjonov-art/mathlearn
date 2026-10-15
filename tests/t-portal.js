const { chromium } = require('playwright');
const path = require('path');
const http = require('http');
const fs = require('fs');

/* Serve dist/, the site exactly as it is uploaded (run tools/build-site.sh first). */
const ROOT = path.resolve(__dirname, '../dist');
const HAS_ENGLISH = fs.existsSync(path.join(ROOT, 'english/index.html'));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('not found');
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  /* The cloud build environment keeps Chromium at a fixed path; elsewhere Playwright finds its own. */
  const CLOUD_CHROMIUM = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(fs.existsSync(CLOUD_CHROMIUM) ? { executablePath: CLOUD_CHROMIUM } : {});
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const base = 'http://127.0.0.1:' + server.address().port;

  await page.goto(base + '/');
  await page.waitForSelector('.course-card[data-course="sql"]');
  if (await page.locator('.course-card').count() !== 3) throw new Error('The hub should show three starter subjects');
  if (await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) > 1) throw new Error('The mobile hub overflows horizontally');

  await page.click('[data-filter="technology"]');
  if (await page.locator('.course-card:not([hidden])').count() !== 1) throw new Error('Technology filter did not isolate SQL');
  await page.click('[data-filter="all"]');
  await page.fill('#class-search', 'fractions');
  if (await page.locator('.course-card:not([hidden])').count() !== 1) throw new Error('Search did not find the math course');
  await page.fill('#class-search', '');

  if (HAS_ENGLISH) {
    /* The card's numbers must match the course it opens, or the hub is telling learners something untrue. */
    const counts = (() => {
      let stages = new Set(), lessons = 0;
      global.ASCEND = { defineCurriculum(c) { c.units.forEach(u => { stages.add(u.stage); lessons += u.lessons.length; }); } };
      require(path.join(ROOT, 'english/content/curriculum.js'));
      return { stages: stages.size, lessons };
    })();
    const meta = await page.locator('.course-card[data-course="english"] .course-meta').innerText();
    if (!meta.includes(counts.stages + ' stages') || !meta.includes(counts.lessons + ' lessons'))
      throw new Error('English card says "' + meta.replace(/\s+/g, ' ') + '" but the course has ' + counts.stages + ' stages and ' + counts.lessons + ' lessons');

    await page.click('.course-card[data-course="english"] .course-link');
    await page.waitForSelector('#main h1');
    if (!(await page.title()).includes('Ascend')) throw new Error('The English card did not open the full English course');
    if (await page.locator('#topbar a[href="/"]').count() !== 1) throw new Error('The English course has no link back to all classes');
    if (await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) > 1) throw new Error('The English course overflows on a phone');

    /* A lesson loads its unit file on demand, which only works if the copied paths are right. */
    await page.goto(base + '/english/index.html#/lesson/s3u03l06');
    await page.waitForFunction(() => /agree/i.test(document.querySelector('#main').innerText), null, { timeout: 10000 });

    await page.goto(base + '/course.html?course=english');
    await page.waitForURL(/\/english\/index\.html/);
  } else {
    console.log('  (no dist/english: the English course was not found when the site was built, so its checks were skipped)');
  }

  await page.goto(base + '/course.html?course=sql');
  await page.waitForSelector('.lesson-content');
  await page.click('[data-answer="1"]');
  if (!(await page.locator('#quiz-feedback').innerText()).includes('highlighted answer is correct')) throw new Error('SQL incorrect-answer guidance was missing');
  await page.click('[data-lesson="1"]');
  await page.click('[data-answer="0"]');
  if (!(await page.locator('#quiz-feedback').innerText()).includes('WHERE filters rows')) throw new Error('SQL lesson explanation was missing');
  if (!(await page.locator('.course-progress').innerText()).includes('1 of 2')) throw new Error('SQL lesson completion did not update');
  await page.reload();
  await page.waitForSelector('.lesson-content');
  if (await page.locator('.lesson-pick.is-complete').count() !== 1) throw new Error('SQL lesson progress did not persist');

  await page.goto(base + '/src/index.html');
  await page.waitForSelector('.hub-link');
  if (!(await page.title()).includes('Open Study')) throw new Error('Math course did not carry the learning hub title');

  await browser.close();
  server.close();
  if (errors.length) throw new Error('Browser errors: ' + errors.join('; '));
  console.log('portal browser checks passed: catalog, filters, search, ' + (HAS_ENGLISH ? 'the full English course, ' : '') + 'SQL lessons, progress, and math link');
})().catch(error => {
  server.close();
  console.error(error.stack || error);
  process.exit(1);
});

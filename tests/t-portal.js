const { chromium } = require('playwright');
const path = require('path');
const http = require('http');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
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

  await page.click('.course-card[data-course="english"] .course-link');
  await page.waitForSelector('.lesson-content');
  if (!(await page.locator('.lesson-content').innerText()).includes('Build a clear sentence')) throw new Error('English starter lesson did not load');
  await page.click('[data-answer="1"]');
  if (!(await page.locator('#quiz-feedback').innerText()).includes('The curious student')) throw new Error('English answer feedback was missing');
  if (!(await page.locator('.course-progress').innerText()).includes('1 of 2')) throw new Error('English lesson completion did not update');
  await page.click('[data-lesson="1"]');
  await page.click('[data-answer="1"]');
  if (!(await page.locator('.course-progress').innerText()).includes('2 of 2')) throw new Error('English course completion did not update');
  await page.reload();
  if (await page.locator('.lesson-pick.is-complete').count() !== 2) throw new Error('English lesson progress did not persist');

  await page.goto(base + '/course.html?course=sql');
  await page.waitForSelector('.lesson-content');
  await page.click('[data-answer="1"]');
  if (!(await page.locator('#quiz-feedback').innerText()).includes('highlighted answer is correct')) throw new Error('SQL incorrect-answer guidance was missing');
  await page.click('[data-lesson="1"]');
  await page.click('[data-answer="0"]');
  if (!(await page.locator('#quiz-feedback').innerText()).includes('WHERE filters rows')) throw new Error('SQL lesson explanation was missing');

  await page.goto(base + '/src/index.html');
  await page.waitForSelector('.hub-link');
  if (!(await page.title()).includes('Open Study')) throw new Error('Math course did not carry the learning hub title');

  await browser.close();
  server.close();
  if (errors.length) throw new Error('Browser errors: ' + errors.join('; '));
  console.log('portal browser checks passed: catalog, filters, search, English and SQL lessons, progress, and math link');
})().catch(error => {
  server.close();
  console.error(error.stack || error);
  process.exit(1);
});

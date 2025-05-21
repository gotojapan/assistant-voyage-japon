const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath,
    headless: chromium.headless
  });
  const page = await browser.newPage();
  await page.goto('https://example.com');
  await browser.close();
})();
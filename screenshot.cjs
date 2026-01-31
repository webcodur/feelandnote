const puppeteer = require('puppeteer');

async function takeScreenshots() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  await page.goto('http://localhost:3000/lab', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  // 3번 탭 (랜딩 일러스트) 클릭
  await page.click('button:nth-of-type(3)');
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'screenshot-tab3.png', fullPage: true });
  console.log('Tab 3 screenshot saved');

  // 4번 탭 (코린트 양식) 클릭
  await page.click('button:nth-of-type(4)');
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'screenshot-tab4.png', fullPage: true });
  console.log('Tab 4 screenshot saved');

  await browser.close();
}

takeScreenshots().catch(console.error);

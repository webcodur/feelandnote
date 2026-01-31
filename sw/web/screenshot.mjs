import { chromium } from 'playwright';

async function takeScreenshots() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto('http://localhost:3000/lab');
  await page.waitForTimeout(2000);

  // 3번 탭 (랜딩 일러스트) 클릭
  await page.click('button:has-text("랜딩 일러스트")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot-tab3.png', fullPage: true });
  console.log('Tab 3 screenshot saved');

  // 4번 탭 (코린트 양식) 클릭
  await page.click('button:has-text("코린트 양식")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshot-tab4.png', fullPage: true });
  console.log('Tab 4 screenshot saved');

  await browser.close();
}

takeScreenshots().catch(console.error);

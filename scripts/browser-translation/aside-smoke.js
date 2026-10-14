// Run through aside repl; this uses the browser's real Translator, never a mock.
const labUrl = __LAB_URL__;
const labPage = await openTab(labUrl);
console.log((await snapshot(labPage)).tree);
const labResults = [];
const labStarted = Date.now();
for (const labTarget of ['zh', 'es', 'ja', 'zh-Hant', 'fr', 'de', 'pt', 'it']) {
  if (Date.now() - labStarted > 100000) break;
  await labPage.locator('#language').selectOption(labTarget);
  let labReady = false;
  for (let check = 0; check < 40; check += 1) {
    labReady = await labPage.evaluate(() => !document.querySelector('#start').disabled);
    if (labReady) break;
    await sleep(100);
  }
  if (!labReady) {
    labResults.push({ target: labTarget, status: 'unavailable' });
    continue;
  }
  const languageStart = Date.now();
  await labPage.locator('#start').click();
  let resultState = '';
  for (let poll = 0; poll < 200; poll += 1) {
    resultState = await labPage.evaluate(() => document.querySelector('#intro').dataset.state);
    if (['translated', 'failed'].includes(resultState)) break;
    await sleep(100);
  }
  const nativeResult = await labPage.evaluate(() => ({
    state: document.querySelector('#intro').dataset.state,
    text: document.querySelector('#intro').textContent,
    metrics: { ...window.translationLab.engine.metrics },
  }));
  labResults.push({ target: labTarget, milliseconds: Date.now() - languageStart, ...nativeResult });
  console.log(JSON.stringify(labResults[labResults.length - 1]));
}
if (await labPage.evaluate(() => document.querySelector('#intro').dataset.state === 'translated')) {
  await labPage.locator('#open').click();
  for (let poll = 0; poll < 100; poll += 1) {
    if (await labPage.evaluate(() => document.querySelector('#review').dataset.state === 'translated')) break;
    await sleep(100);
  }
  const firstReview = await labPage.evaluate(() => document.querySelector('#review').textContent);
  await labPage.locator('#next').click();
  for (let poll = 0; poll < 100; poll += 1) {
    if (await labPage.evaluate(() => document.querySelector('#review').dataset.state === 'translated')) break;
    await sleep(100);
  }
  const secondReview = await labPage.evaluate(() => document.querySelector('#review').textContent);
  await labPage.locator('#close').click();
  const beforeReopen = await labPage.evaluate(() => ({ ...window.translationLab.engine.metrics }));
  await labPage.locator('#open').click();
  await sleep(300);
  const reopenResult = await labPage.evaluate(() => ({ state: document.querySelector('#review').dataset.state,
    text: document.querySelector('#review').textContent, metrics: { ...window.translationLab.engine.metrics } }));
  await labPage.locator('#next').click();
  for (let poll = 0; poll < 100; poll += 1) {
    if (await labPage.evaluate(() => document.querySelector('#review').dataset.state === 'translated')) break;
    await sleep(100);
  }
  const longReview = await labPage.evaluate(() => ({ state: document.querySelector('#review').dataset.state,
    paragraphs: document.querySelector('#review').textContent.split('\n\n').length,
    text: document.querySelector('#review').textContent }));
  await labPage.locator('#modal-original').click();
  const restored = await labPage.evaluate(() =>
    document.querySelector('#intro').textContent === window.translationLab.sources.intro &&
    document.querySelector('#review').textContent === window.translationLab.sources.reviews[2]);
  await labPage.locator('#close').click();
  console.log(JSON.stringify({ modal: { firstReview, secondReview, beforeReopen, reopenResult, longReview }, restored }));
}
console.log((await snapshot(labPage)).tree);
await closeTab(labPage);

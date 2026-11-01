import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { getKSTDateKey } from "@/lib/game/date-seed";

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve("tsx"))("esbuild");
const appDir = fileURLToPath(new URL("../../../../", import.meta.url));

async function fixture(component: "BirthYearSliderCore" | "BirthYearFilterCore" = "BirthYearSliderCore", locale = "ko") {
  const output = await build({
    absWorkingDir: appDir, tsconfig: `${appDir}/tsconfig.json`, write: false,
    bundle: true, platform: "browser", format: "iife", jsx: "automatic",
    stdin: { resolveDir: appDir, loader: "tsx", contents: `
      import { StrictMode } from 'react';
      import { createRoot } from 'react-dom/client';
      import { ${component} as FilterComponent } from './src/components/features/home/CelebBirthYearFilter';
      import { useCelebDetailDraft } from './src/components/features/home/useCelebDetailDraft';
      window.commits = []; window.applied = [];
      function CelebDetailFiltersModal() {
        const draft = useCelebDetailDraft({ profession: 'actor', nationality: 'KR', contentType: 'BOOK', gender: 'female',
          realityValue: 'real', birthYearMin: 1978, birthYearMax: 2030,
          handleDetailFiltersApply: value => window.applied.push(value) } as any);
        return <><output id="draft">{JSON.stringify({ min: draft.birthYearMin, max: draft.birthYearMax })}</output>
          <FilterComponent min={draft.birthYearMin} max={draft.birthYearMax} onChange={(min, max) => {
            window.commits.push({ min, max }); draft.handleBirthYearChange(min, max);
          }} />
          <button id="clear" onClick={() => draft.handleBirthYearChange(undefined, undefined)}>clear</button>
          <button id="apply" onClick={draft.apply}>apply</button></>;
      }
      createRoot(document.getElementById('root')).render(<StrictMode><CelebDetailFiltersModal/></StrictMode>);
    ` },
    plugins: [{ name: "birth-year-fixture", setup(builder: {
      onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void;
      onLoad: (options: { filter: RegExp; namespace: string }, callback: () => unknown) => void;
    }) {
      builder.onResolve({ filter: /^next-intl$/ }, () => ({ path: "intl", namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: `export const useLocale = () => '${locale}'; export const useTranslations = () => (key, values) => values ? JSON.stringify(values) : key;`, loader: "js" }));
      builder.onResolve({ filter: /^@\/components\/ui\/(Button|Modal)$/ }, () => ({ path: "ui", namespace: "stub" }));
      builder.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "export default () => null; export const ModalFooter = () => null;", loader: "js" }));
    } }],
  });
  return output.outputFiles[0].text;
}

test("birth year drag and keyboard changes notify the draft once outside render", async () => {
  const bundle = await fixture();
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", error => errors.push(String(error)));
    await page.setContent('<html><head><style>.relative {position:relative;width:600px;height:8px;margin:30px} [role=slider] {position:absolute;width:20px;height:20px;top:0}</style></head><body><div id="root"></div></body></html>');
    await page.addScriptTag({ content: bundle });
    await page.waitForSelector('[role="slider"]');
    const range = () => page.$eval("#draft", element => JSON.parse(element.textContent!));
    const commitCount = () => page.evaluate(() => (window as unknown as { commits: unknown[] }).commits.length);
    await page.focus('[role="slider"][aria-label="minLabel"]');
    await page.keyboard.press("ArrowRight");
    await page.keyboard.down("Shift"); await page.keyboard.press("ArrowLeft"); await page.keyboard.up("Shift");
    assert.deepEqual(errors, [], "keyboard changes must not update the parent while the slider renders");
    assert.deepEqual(await range(), { min: 1969, max: 2030 });
    assert.equal(await commitCount(), 2, "one parent notification per key event");
    const thumb = await page.$('[role="slider"][aria-label="minLabel"]');
    const box = (await thumb!.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x - 80, box.y + box.height / 2, { steps: 4 });
    assert.equal(await commitCount(), 2, "drag previews stay inside the slider until release");
    await page.mouse.up();
    assert.equal(await commitCount(), 3);
    assert.ok((await range()).min < 1969);
    await page.click("#clear");
    assert.deepEqual(await range(), {});
    assert.equal(await page.$eval('[role="slider"][aria-label="minLabel"]', el => el.getAttribute("aria-valuenow")), "-6000");
    await page.focus('[role="slider"][aria-label="minLabel"]'); await page.keyboard.press("ArrowRight");
    await page.click("#apply");
    const applied = await page.evaluate(() => (window as unknown as { applied: { birthYearMin: number; nationality: string }[] }).applied);
    assert.equal(applied.length, 1);
    assert.equal(applied[0].birthYearMin, -5999);
    assert.equal(applied[0].nationality, "KR");
    assert.deepEqual(errors, [], "slider events must not update its parent during render");
  } finally {
    await browser.close();
  }
});

test("age mode supports upper, lower, and two-sided limits before applying the modal", async () => {
  const bundle = await fixture("BirthYearFilterCore");
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", error => errors.push(String(error)));
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({ content: bundle });
    await page.waitForSelector('[aria-label="mode"]');
    const clickText = (text: string) => page.$$eval("button", (buttons, label) => buttons.find(button => button.textContent === label)!.click(), text);
    const range = () => page.$eval("#draft", element => JSON.parse(element.textContent!));
    const year = Number(getKSTDateKey().slice(0, 4));
    await clickText("ageMode");
    assert.deepEqual(await page.$$eval('[aria-label="selection"] input, [aria-label="selection"] select', elements => elements.map(element => element.tagName)), ["INPUT", "SELECT"]);
    const typeAge = async (index: number, value: string) => {
      const inputs = await page.$$('input[type="number"]');
      await inputs[index].click({ clickCount: 3 });
      await page.keyboard.press("Backspace"); await page.keyboard.type(value); await page.keyboard.press("Enter");
    };
    await typeAge(0, "30");
    assert.deepEqual(await range(), { min: year - 30 });
    await page.select('select[aria-label="selection"]', "atLeast");
    assert.deepEqual(await range(), { max: year - 30 });
    await page.select('select[aria-label="selection"]', "range");
    await typeAge(1, "50");
    assert.deepEqual(await range(), { min: year - 50, max: year - 30 });
    const pending = await page.evaluate(() => (window as unknown as { applied: unknown[] }).applied.length);
    assert.equal(pending, 0, "editing age must remain a modal draft");
    await clickText("yearMode");
    assert.equal(await page.$eval('[role="slider"][aria-label="minLabel"]', element => element.getAttribute("aria-valuenow")), String(year - 50));
    await clickText("ageMode");
    const maximumInput = (await page.$$('input[type="number"]'))[1];
    await maximumInput.click({ clickCount: 3 });
    await page.keyboard.press("Backspace"); await page.keyboard.type("55");
    await page.click("#apply");
    const applied = await page.evaluate(() => (window as unknown as { applied: { birthYearMin: number; birthYearMax: number; nationality: string }[] }).applied);
    assert.deepEqual({ min: applied[0].birthYearMin, max: applied[0].birthYearMax }, { min: year - 55, max: year - 30 });
    assert.equal(applied[0].nationality, "KR");
    await clickText("clear");
    assert.deepEqual(await range(), {});
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test("English age controls place the condition before the values", async () => {
  const bundle = await fixture("BirthYearFilterCore", "en");
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({ content: bundle });
    await page.waitForSelector('[aria-label="mode"]');
    await page.$$eval("button", buttons => buttons.find(button => button.textContent === "ageMode")!.click());
    const order = () => page.$$eval('[aria-label="selection"] input, [aria-label="selection"] select', elements => elements.map(element => element.tagName));
    assert.deepEqual(await order(), ["SELECT", "INPUT"]);
    await page.select('select[aria-label="selection"]', "range");
    assert.deepEqual(await order(), ["SELECT", "INPUT", "INPUT"]);
  } finally {
    await browser.close();
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import puppeteer, { type Page } from "puppeteer";
import { EXPLORE_PREFERENCES_KEY } from "@/lib/explorePreferences";

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve("tsx"))("esbuild");
const appDir = fileURLToPath(new URL("../../../../", import.meta.url));

async function fixture() {
  const output = await build({
    absWorkingDir: appDir, tsconfig: `${appDir}/tsconfig.json`, write: false,
    bundle: true, platform: "browser", format: "iife", jsx: "automatic",
    stdin: { resolveDir: appDir, loader: "tsx", contents: `
      import { StrictMode } from 'react';
      import { createRoot } from 'react-dom/client';
      import { useCelebFilters } from './src/components/features/home/useCelebFilters';
      import { useCelebDetailConditions } from './src/components/features/home/useCelebDetailConditions';
      window.requests = [];
      function Harness() {
        const f = useCelebFilters({ initialCelebs: [], initialTotal: 1, initialTotalPages: 1,
          initialTrendCountry: 'KR', professionCounts: [], nationalityCounts: [], contentTypeCounts: {}, genderCounts: [], syncToUrl: true });
        const state = { contentType: f.contentType, contentPresence: f.contentPresence, profession: f.profession,
          nationality: f.nationality, gender: f.gender, sortBy: f.sortBy, pageSize: f.pageSize,
          cardImage: f.cardImage, reality: f.realityValue, byMin: f.birthYearMin, byMax: f.birthYearMax,
          page: f.currentPage, search: f.search, loading: f.isLoading, error: f.listingError, total: f.total };
        const conditions = useCelebDetailConditions(f);
        return <><output id="state">{JSON.stringify(state)}</output>
          <output id="history">{JSON.stringify(f.recentFilters)}</output>
          {f.recentFilters.map((entry, index) => <span key={entry}><button data-entry={entry} id={'recent-' + index} onClick={() => f.handleRecentFilterApply(entry)}>apply</button><button data-remove-entry={entry} id={'remove-recent-' + index} onClick={() => f.removeRecentFilter(entry)}>remove</button></span>)}
          {conditions.map(condition => <button key={condition.key} id={'condition-' + condition.key} onClick={condition.clear}>{condition.label}</button>)}
          <input id="query" value={f.search} onChange={event => f.handleSearchInput(event.target.value)} />
          <button id="search" onClick={f.handleSearchSubmit}>search</button>
          {['all', 'real', 'fiction', 'mixed'].map(value => <button key={value} id={'reality-' + value} onClick={() => f.handleRealityChange(value)}>{value}</button>)}
          <button id="photo" onClick={() => f.handleCardImageChange(f.cardImage === 'avatar' ? 'portrait' : 'avatar')}>photo</button>
          <button id="country-us" onClick={() => f.handleNationalityChange('US')}>US</button>
          <button id="all" onClick={() => f.handleContentTypeChange('all')}>all</button>
          <button id="book" onClick={() => f.handleContentTypeChange('BOOK')}>book</button>
          <button id="custom" onClick={() => f.handleDetailFiltersApply({ profession: 'actor', nationality: 'KR', contentType: 'MUSIC', gender: 'female', realityValue: 'fiction', birthYearMin: -400, birthYearMax: 2000 })}>custom</button>
          <button id="sort" onClick={() => f.handleSortChange('name_asc')}>sort</button>
          <button id="size" onClick={() => f.handlePageSizeChange(48)}>size</button>
          <button id="page" onClick={() => f.handlePageChange(2)}>page</button>
        </>;
      }
      createRoot(document.getElementById('root')).render(<StrictMode><Harness/></StrictMode>);`,
    },
    plugins: [{ name: "explore-fixture", setup(builder: {
      onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void;
      onLoad: (options: { filter: RegExp; namespace: string }, callback: (args: { path: string }) => unknown) => void;
    }) {
      const mocks: Record<string, string> = {
        "next-intl": "export const useTranslations = () => key => key;",
        "./useFilterLabels-fixture": "export const useProfessionLabel = () => v => v; export const useNationalityLabel = () => v => v; export const useContentTypeLabel = () => v => v; export const useGenderLabel = () => v => v;",
        "next/navigation": "export const useSearchParams = () => new URLSearchParams(window.location.search);",
        "@/i18n/navigation": "export const usePathname = () => window.location.pathname;",
        "@feelandnote/shared/hooks/use-professions": "export const useProfessions = () => ({ filters: [] });",
        "@/actions/home/getCelebs": `export async function getCelebs(params) {
          window.requests.push(params);
          await new Promise(resolve => setTimeout(resolve, 10));
          return { celebs: [], total: 7, totalPages: 3, page: params.page, error: null };
        }`,
      };
      builder.onResolve({ filter: /^@\/hooks\/useFilterLabels$/ }, () => ({ path: "./useFilterLabels-fixture", namespace: "fixture" }));
      builder.onResolve({ filter: /^(next-intl|next\/navigation|@\/i18n\/navigation|@feelandnote\/shared\/hooks\/use-professions|@\/actions\/home\/getCelebs)$/ }, args => ({ path: args.path, namespace: "fixture" }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "js" }));
    } }],
  });
  return output.outputFiles[0].text;
}

async function state(page: Page) {
  await page.waitForFunction(() => {
    const value = document.getElementById("state")?.textContent;
    return value && !JSON.parse(value).loading;
  });
  return page.$eval("#state", element => JSON.parse(element.textContent!));
}

test("browser remembers exploration and photo mode across visits, including StrictMode replay", async () => {
  const bundle = await fixture();
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(String(error)));
    await page.setRequestInterception(true);
    page.on("request", request => { void request.respond({ contentType: "text/html", body: '<html><body><div id="root"></div></body></html>' }); });
    const visit = async (query = "", path = "/ko/explore") => {
      await page.goto(`http://explore.test${path}${query}`);
      await page.addScriptTag({ content: bundle });
      await state(page);
    };
    await visit();
    assert.equal((await state(page)).contentType, "BOOK");
    assert.equal((await state(page)).contentPresence, "with");
    await page.click("#all");
    await state(page);
    assert.equal(new URL(page.url()).searchParams.get("contentType"), "all");
    await page.click("#photo");
    assert.equal((await state(page)).cardImage, "portrait");
    await visit();
    assert.equal((await state(page)).contentType, "all");
    assert.equal((await state(page)).cardImage, "portrait");
    assert.equal((await state(page)).total, 7, "restored list request must survive StrictMode cleanup");
    await page.click("#book");
    await state(page);
    assert.equal(new URL(page.url()).searchParams.has("contentType"), false);
    await page.click("#custom"); await state(page);
    await page.click("#sort"); await state(page);
    await page.click("#size"); await state(page);
    await page.click("#page"); await state(page);
    await visit("", "/en/explore");
    const restored = await state(page);
    assert.deepEqual({ ...restored, loading: undefined, error: undefined }, {
      contentType: "MUSIC", contentPresence: "with", profession: "actor", nationality: "KR", gender: "female",
      sortBy: "name_asc", pageSize: 48, cardImage: "portrait", reality: "fiction", byMin: -400, byMax: 2000,
      page: 1, search: "", total: 7, loading: undefined, error: undefined,
    });
    await visit("?contentType=VIDEO&contentPresence=all");
    assert.equal((await state(page)).contentType, "VIDEO");
    assert.equal((await state(page)).contentPresence, "all");
    assert.equal((await state(page)).profession, "all");
    assert.equal((await state(page)).cardImage, "portrait");
    await page.evaluate(key => localStorage.setItem(key, "{broken"), EXPLORE_PREFERENCES_KEY);
    await visit();
    assert.equal((await state(page)).contentType, "BOOK");
    assert.equal((await state(page)).cardImage, "avatar");
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test("recent individual filters add and remove one choice without replacing other conditions", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", request => { void request.respond({ contentType: "text/html", body: '<html><body><div id="root"></div></body></html>' }); });
    const bundle = await fixture();
    await page.goto("http://explore.test/ko/explore?contentPresence=all");
    await page.addScriptTag({ content: bundle }); await state(page);
    const history = () => page.$eval("#history", element => JSON.parse(element.textContent!) as string[]);
    assert.equal((await history()).length, 0, "initial defaults must not fill the shortcuts");
    await page.click("#custom"); await state(page);
    assert.ok((await history()).includes("nationality=KR"));
    await page.click("#country-us"); await state(page);
    const before = await history();
    await page.click("#sort"); await state(page);
    await page.click("#size"); await state(page);
    await page.click("#photo"); await state(page);
    await page.click("#page"); await state(page);
    await page.type("#query", "제우스"); await page.click("#search"); await state(page);
    assert.deepEqual(await history(), before, "view changes and search must not alter recent choices");
    await page.click('button[data-entry="nationality=KR"]');
    const applied = await state(page);
    assert.equal(applied.nationality, "KR,US");
    assert.equal(applied.profession, "actor");
    assert.equal(applied.contentType, "MUSIC");
    assert.equal(applied.reality, "fiction");
    assert.equal(applied.gender, "female");
    assert.equal(applied.pageSize, 48);
    assert.equal(applied.cardImage, "portrait");
    assert.equal(applied.search, "제우스");
    assert.equal(applied.page, 1);
    const request = await page.evaluate(() => (window as unknown as { requests: { search: string; nationality: string; profession: string; limit: number }[] }).requests.at(-1));
    assert.equal(request?.nationality, "KR,US");
    assert.equal(request?.profession, "actor");
    assert.equal(request?.search, "제우스");
    assert.equal(request?.limit, 48);
    await page.click('button[data-entry="nationality=KR"]'); await state(page);
    assert.equal((await state(page)).nationality, "US");
    await page.click("#book"); await state(page);
    await page.click('button[data-entry="contentType=MUSIC"]'); await state(page);
    assert.equal((await state(page)).contentType, "MUSIC");
    assert.equal((await state(page)).nationality, "US");
    assert.equal((await state(page)).profession, "actor");
    await page.click('button[data-remove-entry="nationality=KR"]');
    assert.equal((await history()).includes("nationality=KR"), false);
    await page.reload(); await page.addScriptTag({ content: bundle }); await state(page);
    assert.equal((await history()).includes("nationality=KR"), false);
  } finally {
    await browser.close();
  }
});

test("reality restriction is visible, removable, and stays removed through search and reload", async () => {
  const bundle = await fixture();
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("request", request => { void request.respond({ contentType: "text/html", body: '<html><body><div id="root"></div></body></html>' }); });
    await page.goto("http://explore.test/ko/explore?contentPresence=all&contentType=all");
    await page.addScriptTag({ content: bundle });
    assert.equal((await state(page)).reality, "real");
    assert.ok(await page.$("#condition-reality"), "the default REAL/BOTH restriction must be visible");
    await page.click("#condition-reality");
    assert.equal((await state(page)).reality, "all");
    assert.equal(await page.$("#condition-reality"), null);
    await page.type("#query", "제우스");
    await page.click("#search");
    await state(page);
    const request = await page.evaluate(() => (window as unknown as { requests: { realities: string[]; search: string }[] }).requests.at(-1));
    assert.deepEqual(request?.realities, ["REAL", "BOTH", "FICTION"]);
    assert.equal(request?.search, "제우스");
    assert.equal(new URL(page.url()).searchParams.get("reality"), "REAL,BOTH,FICTION");
    await page.reload();
    await page.addScriptTag({ content: bundle });
    assert.equal((await state(page)).reality, "all");
    for (const [value, expected] of [["real", ["REAL", "BOTH"]], ["fiction", ["FICTION", "BOTH"]], ["mixed", ["BOTH"]]] as const) {
      await page.click(`#reality-${value}`);
      assert.equal((await state(page)).reality, value);
      const realities = await page.evaluate(() => (window as unknown as { requests: { realities: string[] }[] }).requests.at(-1)?.realities);
      assert.deepEqual(realities, [...expected]);
      await page.click("#condition-reality");
      assert.equal((await state(page)).reality, "all");
    }
  } finally {
    await browser.close();
  }
});

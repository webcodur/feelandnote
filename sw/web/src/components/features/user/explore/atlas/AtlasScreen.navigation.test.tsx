import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve("tsx"))("esbuild");
const appDir = fileURLToPath(new URL("../../../../../../", import.meta.url));

async function fixture() {
  const output = await build({
    absWorkingDir: appDir, tsconfig: `${appDir}/tsconfig.json`, outdir: "fixture", write: false,
    bundle: true, platform: "browser", format: "iife", jsx: "automatic",
    stdin: { resolveDir: appDir, loader: "tsx", contents: `
      import { StrictMode } from 'react';
      import { createRoot } from 'react-dom/client';
      import Screen from './src/components/features/user/explore/atlas/AtlasScreen';
      const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#6c655b"/></svg>');
      const people = Array.from({ length: 16 }, (_, i) => ({ id: 'p' + i, name: 'Person ' + i, title: 'Title', slug: 'p' + i,
        appearances: [], avatarUrl: image + '#avatar', portraitUrl: i < 14 ? image : null, imageUrl: null, mythIds: ['entry'], sourceIds: [], images: [] }));
      const groups = [{ id: 'a', name: 'Group A', description: 'Overview A', personIds: people.slice(0, 14).map(p => p.id) },
        { id: 'b', name: 'Group B', description: 'Overview B', personIds: people.slice(14).map(p => p.id) }];
      const grouped = !location.search.includes('ungrouped');
      const entry = { id: 'entry', slug: 'entry', name: 'Entry', isPublished: true, regionId: 'region', images: [],
        personIds: people.map(p => p.id), leadPersonIds: [], groups: grouped ? groups : [] };
      const data = { regions: [{ id: 'region', slug: 'region', name: 'Region', mythIds: ['entry'] }], myths: [entry], people, works: [] };
      const mode = location.pathname.includes('faction') ? 'faction' : 'myth';
      const navigation = { themeId: 'region',
        navigationTree: [{ id: 'region', name: 'Region', entries: [{ ...entry, count: people.length, groups: entry.groups.map(g => ({ ...g, count: g.personIds.length })) }] }],
      };
      createRoot(document.getElementById('root')).render(<StrictMode><Screen data={data} mode={mode} {...navigation} /></StrictMode>);`,
    },
    plugins: [{ name: "navigation-fixture", setup(builder: {
      onResolve: (options: { filter: RegExp }, callback: (args: { path: string }) => unknown) => void;
      onLoad: (options: { filter: RegExp; namespace: string }, callback: (args: { path: string }) => unknown) => void;
    }) {
      const empty = "export default function Empty() { return null; }";
      const mocks: Record<string, string> = {
        "next-intl": "export const useLocale = () => 'en'; export const useTranslations = () => (key, values) => values?.count ?? key;",
        "next/navigation": "export const useSearchParams = () => new URLSearchParams(location.search);",
        "@/i18n/navigation": "export const usePathname = () => location.pathname; export const useRouter = () => ({ push() {} }); export const Link = 'a';",
        "@/hooks/useRecentAtlas": "export const useRecentAtlas = () => {};",
        "@/contexts/FactionMusicContext": "export const useRegisterFactionMusic = () => {};",
        "@/lib/atlas-navigation": `export const buildMythNavigation = data => data.regions.map(r => ({ ...r, entries: data.myths.map(m => ({ ...m, count: m.personIds.length, groups: m.groups.map(g => ({ ...g, count: g.personIds.length })) })) }));`,
        "@/lib/recent-atlas": "export const recentAtlasHref = href => href;",
        "@/components/shared/HubSection": `import React from 'react'; export default function Section(p) { return <section id={p.id} tabIndex={p.tabIndex} className={p.className} style={{scrollMarginTop:80}}><div data-hub-header><h2>{p.title}</h2>{p.headerActions}{p.headerFooter}</div>{p.children}</section>; }`,
        "@/components/shared/atlasNav/AtlasNavSections": empty,
        "@/components/features/commerce/DeveloperCommerceFallback": empty,
        "@/components/features/engagement/FactionParticipation": empty,
        "@/components/ui/ContentTextModal": "import React from 'react'; export default function Modal(p) { return <div role='dialog'>{p.text}<button onClick={p.onClose}>close</button></div>; }",
        "../myth/AtlasPicker": empty,
        "./AtlasPersonDetail": empty, "./AtlasOverview": empty, "./AtlasOverviewReading": empty, "./AtlasWorkShelf": empty, "../myth/SceneCompletionBadge": empty,
      };
      builder.onResolve({ filter: /.*/ }, args => args.path in mocks ? { path: args.path, namespace: "fixture" } : undefined);
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: appDir }));
    } }],
  });
  return output.outputFiles.find((file: { path: string }) => file.path.endsWith(".js")).text;
}

test("both modes share group navigation, reset expansion, and preserve description view", async () => {
  const bundle = await fixture();
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(String(error)));
    await page.setRequestInterception(true);
    page.on("request", request => { void request.respond({ contentType: "text/html", body: '<html><head><style>body{margin:0;padding:0 16px}#atlas-selection{height:700px}#atlas-members{overflow-anchor:none}#atlas-shelf{height:1000px}[data-person-layout=portrait]>button{display:block;width:100%;height:560px}[data-person-layout=compact]{display:grid;grid-template-columns:repeat(3,1fr)}[data-person-layout=compact]>button{height:130px}[data-member-group-footer]{padding:32px 0}button{min-width:44px;min-height:44px}</style></head><body><div id="root"></div></body></html>' }); });
    const visit = async (path: string, query = "?group=a") => {
      await page.goto(`http://atlas.test/explore/${path}/entry${query}`);
      await page.addScriptTag({ content: bundle });
      await page.waitForSelector("#atlas-members");
    };
    const footer = "[data-member-group-footer]";
    for (const { path, width } of [
      { path: "myth", width: 390 }, { path: "faction", width: 390 },
      { path: "myth", width: 1440 }, { path: "faction", width: 1440 },
    ]) {
      await page.setViewport({ width, height: 844 });
      await visit(path);
      await page.click('[data-member-description-toggle]');
      await page.click('[data-member-view="portrait"]');
      assert.equal(await page.$$('[data-person-id]').then(items => items.length), 12);
      await page.click('[aria-expanded="false"]:not([data-member-group-overview])');
      assert.equal(await page.$$('[data-person-id]').then(items => items.length), 14);

      assert.equal(await page.$$(footer).then(items => items.length), 1);
      const groupRow = width < 768 ? `${footer} [data-atlas-level="2"]` : '[data-atlas-level="2"]';
      await page.$eval(`${groupRow} > button:last-child`, element => (element as HTMLButtonElement).click());
      await page.waitForFunction(() => location.search.includes("group=b"));
      if (width < 768) assert.equal(await page.evaluate(() => document.activeElement?.id), "atlas-members");
      assert.equal(await page.$$('[data-person-id]').then(items => items.length), 2);
      assert.match(await page.$eval('#atlas-members [data-atlas-value]', element => element.textContent!), /Group B/);
      assert.equal(await page.$eval('[data-atlas-member-count]', element => element.textContent), "2");
      assert.equal(await page.$eval('[data-member-group-overview]', element => (element as HTMLButtonElement).disabled), false);
      await page.click('[data-member-group-overview]');
      assert.match(await page.$eval('[role="dialog"]', element => element.textContent!), /Overview B/);
      await page.$eval('[role="dialog"] button', element => (element as HTMLElement).click());
      await page.waitForSelector('[role="dialog"]', { hidden: true });
      await page.$eval(`${groupRow} > button:first-child`, element => (element as HTMLButtonElement).click());
      await page.waitForFunction(() => location.search.includes("group=a"));
      assert.equal(await page.$$('[data-person-id]').then(items => items.length), 12);
      await page.$eval(`${groupRow} > button:first-child`, element => (element as HTMLButtonElement).click());
      await page.waitForFunction(() => !new URLSearchParams(location.search).has("group"));
      assert.match(await page.$eval('#atlas-members [data-atlas-value]', element => element.textContent!), /allMembers/);
      assert.equal(await page.$eval('[data-atlas-member-count]', element => element.textContent), "16");
      assert.equal(await page.$eval('[data-member-group-overview]', element => (element as HTMLButtonElement).disabled), true);
      await visit(path, "?ungrouped=1");
      assert.equal(await page.$$(footer).then(items => items.length), 0);
      assert.equal(await page.$eval('[data-atlas-level="2"] > button:first-child', element => (element as HTMLButtonElement).disabled), true);
      assert.equal(await page.$$('[data-member-description-view]').then(items => items.length), 1);
      await page.click('[data-member-view="avatar"]');
      assert.equal(await page.$$('[data-member-description-view]').then(items => items.length), 1);
      assert.equal(await page.$eval('[data-member-description-toggle]', e => e.getAttribute("aria-checked")), "true");
      assert.equal(await page.$eval('[data-person-description]', e => e.getAttribute("data-member-image")), "avatar");
      await page.click('[data-member-description-toggle]');
      assert.equal(await page.$$('[data-person-layout="compact"]').then(items => items.length), 1);
      assert.equal(await page.$eval('[data-member-view="avatar"]', e => e.getAttribute("aria-pressed")), "true");
      await page.click('[data-member-view="portrait"]');
      assert.equal(await page.$$('[data-member-description-view]').then(items => items.length), 0);
      await page.click('[data-member-description-toggle]');
      assert.equal(await page.$eval('[data-person-description]', e => e.getAttribute("data-member-image")), "portrait");

    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

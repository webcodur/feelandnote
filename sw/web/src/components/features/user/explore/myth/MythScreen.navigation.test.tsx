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
      import Screen from './src/components/features/user/explore/myth/MythScreen';
      const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#6c655b"/></svg>');
      const people = Array.from({ length: 16 }, (_, i) => ({ id: 'p' + i, name: 'Person ' + i, title: 'Title', slug: 'p' + i,
        appearances: [], avatarUrl: image + '#avatar', portraitUrl: i < 14 ? image : null, imageUrl: null, mythIds: ['entry'], sourceIds: [], images: [] }));
      const groups = [{ id: 'a', name: 'Group A', description: 'Overview A', personIds: people.slice(0, 14).map(p => p.id) },
        { id: 'b', name: 'Group B', description: 'Overview B', personIds: people.slice(14).map(p => p.id) }];
      const grouped = !location.search.includes('ungrouped');
      const entry = { id: 'entry', slug: 'entry', name: 'Entry', isPublished: true, regionId: 'region', images: [],
        personIds: people.map(p => p.id), leadPersonIds: [], groups: grouped ? groups : [] };
      const data = { regions: [{ id: 'region', slug: 'region', name: 'Region', mythIds: ['entry'] }], myths: [entry], people, works: [] };
      const faction = location.pathname.includes('faction') ? { themeId: 'region', title: 'Faction', shelfTitle: 'Books',
        navigationTree: [{ id: 'region', name: 'Region', entries: [{ ...entry, count: people.length, groups: entry.groups.map(g => ({ ...g, count: g.personIds.length })) }] }],
        renderPerson: () => null, renderWorks: () => null } : undefined;
      createRoot(document.getElementById('root')).render(<StrictMode><Screen data={data} faction={faction} indexHeading="All" indexGroups={[]} /></StrictMode>);`,
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
        "./AtlasNavigation": empty, "./AtlasPicker": empty, "./AtlasIndex": empty,
        "./MythPersonDetail": empty, "./MythOverview": empty, "./MythWorkShelf": empty, "./SceneCompletionBadge": empty,
      };
      builder.onResolve({ filter: /.*/ }, args => args.path in mocks ? { path: args.path, namespace: "fixture" } : undefined);
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: mocks[args.path], loader: "tsx", resolveDir: appDir }));
    } }],
  });
  return output.outputFiles.find((file: { path: string }) => file.path.endsWith(".js")).text;
}

test("myth and faction list footers change groups, reset expansion, and return to the group heading", async () => {
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
      await page.click('[aria-label="cardImage.label: cardImage.modes.portrait"]');
      assert.equal(await page.$$('[data-person-id]').then(items => items.length), 12);
      await page.click('[aria-expanded="false"]:not([data-member-group-overview])');
      assert.equal(await page.$$('[data-person-id]').then(items => items.length), 14);
      assert.equal(await page.$eval(footer, element => element.previousElementSibling?.querySelector('button[aria-expanded="true"]') !== null), true);
      await page.$eval(`${footer} [data-member-group-next]`, element => element.scrollIntoView({ block: "center" }));
      const before = await page.evaluate(() => scrollY);
      await page.click(`${footer} [data-member-group-next]`);
      await page.waitForFunction(() => location.search.includes("group=b"));
      assert.equal(await page.$$('[data-person-id]').then(items => items.length), 2);
      const after = await page.evaluate(() => ({ y: scrollY, top: document.getElementById("atlas-members")!.getBoundingClientRect().top, focused: document.activeElement?.id }));
      assert.ok(after.y < before - 1000);
      assert.ok(Math.abs(after.top - 80) < 2);
      assert.equal(after.focused, "atlas-members");
      await page.click(`${footer} [data-member-group-overview]`);
      assert.match(await page.$eval('[role="dialog"]', element => element.textContent!), /Overview B/);
      await page.$eval('[role="dialog"] button', element => (element as HTMLElement).click());
      await page.click(`${footer} [data-member-group-prev]`);
      await page.waitForFunction(() => location.search.includes("group=a"));
      assert.equal(await page.$$('[data-person-id]').then(items => items.length), 12, "new group returns to collapsed state");
      await page.click(`${footer} [data-member-group-prev]`);
      await page.waitForFunction(() => !new URLSearchParams(location.search).has("group"));
      assert.match(await page.$eval("#atlas-members h2", element => element.textContent!), /memberList/);
      await visit(path, "?ungrouped=1");
      assert.equal(await page.$$(footer).then(items => items.length), 0);
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

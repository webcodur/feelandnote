import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const uuid = "00000000-0000-4000-8000-000000000099";
type Props = { params: Promise<{ locale: string; contentId: string }> };
type PageApi = {
  default: (props: Props) => Promise<{ props: Record<string, unknown> }>;
  generateMetadata: (props: Props) => Promise<Record<string, unknown>>;
};

function loadPage(read: (id: string, locale: string) => Promise<unknown>): PageApi {
  const compiled = ts.transpileModule(readFileSync(new URL("./page.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const noop = () => null;
  const mocks: Record<string, unknown> = {
    "react": { cache: (fn: unknown) => fn },
    "next-intl/server": { setRequestLocale: noop, getTranslations: async () => (key: string) => key },
    "@/actions/contents/getContentDetail": { getInitialPublicContentInfo: read },
    "@/actions/contents/getBookBannerTheme": { getBookBannerTheme: async () => "library" },
    "@/lib/seo": {
      getAlternates: (path: string, locale: string) => ({ canonical: `https://feelandnote.com${locale === "en" ? "/en" : ""}${path}` }),
      getSeoImageUrl: () => "https://feelandnote.com/seo-image/content/test",
      normalizeSeoText: (value: string) => value,
    },
    "@/lib/seoSentences": { appendWithinSnippet: (head: string) => head },
    "@/lib/jsonLd": {},
    "@/components/features/content/ContentDetailPage": { default: noop },
    "@/components/ui/pending/Lane": { default: noop },
    "./ContentDetailPending": { default: noop },
    "./ExternalContentDetailFallback": { default: noop },
    "./ContentDetailSections": {},
  };
  const loaded = { exports: {} };
  new Function("require", "module", "exports", compiled)(
    (key: string) => mocks[key] ?? require(key), loaded, loaded.exports,
  );
  return loaded.exports as PageApi;
}

const props = (contentId: string, locale = "ko"): Props => ({ params: Promise.resolve({ contentId, locale }) });
const is404 = (error: unknown) => error instanceof Error && "digest" in error && error.digest === "NEXT_HTTP_ERROR_FALLBACK;404";

test("missing saved UUID returns notFound from metadata and before the streaming body in either locale", async () => {
  const page = loadPage(async () => null);
  for (const locale of ["ko", "en"]) {
    await assert.rejects(page.generateMetadata(props(uuid, locale)), is404);
    await assert.rejects(page.default(props(uuid, locale)), is404);
  }
});

test("external search IDs retain the client fallback and noindex metadata", async () => {
  const page = loadPage(async () => null);
  for (const externalId of ["9780143115267", "movie-550", "12345678"]) {
    const rendered = await page.default(props(externalId));
    const body = rendered.props.children as { props: { contentId: string } };
    assert.equal(body.props.contentId, externalId);
    assert.deepEqual((await page.generateMetadata(props(externalId))).robots, { index: false, follow: true });
  }
});

test("stored UUID content still renders its title and intentional noindex metadata", async () => {
  const page = loadPage(async () => ({ id: uuid, title: "Saved book", creator: "Author", type: "BOOK" }));
  assert.ok(await page.default(props(uuid)));
  const meta = await page.generateMetadata(props(uuid));
  assert.equal(meta.title, "Saved book");
  assert.deepEqual(meta.robots, { index: false, follow: true });
});

test("database failure propagates instead of becoming a missing content response", async () => {
  const failure = new Error("database unavailable");
  const page = loadPage(async () => { throw failure; });
  await assert.rejects(page.default(props(uuid)), (error: unknown) => error === failure);
  await assert.rejects(page.generateMetadata(props(uuid)), (error: unknown) => error === failure);
});

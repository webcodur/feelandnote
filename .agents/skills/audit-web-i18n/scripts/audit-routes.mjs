#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      parsed[rawKey] = inlineValue;
    } else if (argv[index + 1] && !argv[index + 1].startsWith("--")) {
      parsed[rawKey] = argv[index + 1];
      index += 1;
    } else {
      parsed[rawKey] = true;
    }
  }
  return parsed;
}

function findRepoRoot(start) {
  let current = path.resolve(start);
  while (true) {
    if (
      fs.existsSync(path.join(current, "sw", "web", "package.json"))
      && fs.existsSync(path.join(current, "sw", "web", "messages"))
    ) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(
        "Could not find the Feel&Note repository root. Run this inside the repository.",
      );
    }
    current = parent;
  }
}

const options = parseArgs(process.argv.slice(2));
const baseUrl = String(options["base-url"] || "http://localhost:3000").replace(/\/+$/, "");
const slugs = String(options.slugs || options.slug || "stanley-kubrick")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const strict = Boolean(options.strict);
const jsonOutput = Boolean(options.json);
const screenshotRoot = options.screenshots
  ? path.resolve(String(options.screenshots))
  : null;
const navigationTimeout = Number(options.timeout || 45000);

const repoRoot = findRepoRoot(process.cwd() || scriptDir);
const webRoot = path.join(repoRoot, "sw", "web");
const requireFromWeb = createRequire(path.join(webRoot, "package.json"));
const puppeteer = requireFromWeb("puppeteer");

const locales = [
  { locale: "ko", prefix: "", expectedLang: "ko" },
  { locale: "en", prefix: "/en", expectedLang: "en" },
];
const viewports = [
  { name: "desktop", width: 1440, height: 1000, deviceScaleFactor: 1 },
  { name: "mobile", width: 390, height: 844, deviceScaleFactor: 1 },
];
const findings = {
  errors: [],
  warnings: [],
  info: [],
};
const routeResults = [];

function add(severity, code, message, context = {}) {
  findings[severity].push({ code, message, ...context });
}

function normalizeUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}

function productionUrl(pathname) {
  return `https://feelandnote.com${pathname}`;
}

async function inspectPage(page) {
  return page.evaluate(() => {
    const content = (selector, attribute = "content") => (
      document.querySelector(selector)?.getAttribute(attribute) || ""
    );
    const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const isVisible = (element) => {
      if (!element) return false;
      if (typeof element.checkVisibility === "function") {
        return element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        });
      }
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity) !== 0
        && rect.width > 0
        && rect.height > 0
      );
    };
    const shortSelector = (element) => {
      if (element.id) return `#${CSS.escape(element.id)}`;
      const testId = element.getAttribute("data-testid");
      if (testId) return `[data-testid="${testId}"]`;
      const className = typeof element.className === "string"
        ? element.className.trim().split(/\s+/).slice(0, 2).join(".")
        : "";
      return `${element.tagName.toLowerCase()}${className ? `.${className}` : ""}`;
    };

    const idCounts = new Map();
    for (const element of document.querySelectorAll("[id]")) {
      const id = element.id;
      if (!id) continue;
      idCounts.set(id, (idCounts.get(id) || 0) + 1);
    }
    const duplicateIds = [...idCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([id, count]) => ({ id, count }));

    const brokenAnchors = [];
    for (const anchor of document.querySelectorAll('a[href^="#"]')) {
      const href = anchor.getAttribute("href");
      if (!href || href === "#") continue;
      let target = "";
      try {
        target = decodeURIComponent(href.slice(1));
      } catch {
        target = href.slice(1);
      }
      if (!document.getElementById(target)) {
        brokenAnchors.push({
          href,
          text: normalize(anchor.textContent).slice(0, 100),
        });
      }
    }

    const clippedControls = [];
    const controlSelector = [
      "button",
      "[role='button']",
      "[role='tab']",
      "a",
      "h1",
      "h2",
      "h3",
      "[data-i18n-check]",
    ].join(",");
    for (const element of document.querySelectorAll(controlSelector)) {
      if (!isVisible(element)) continue;
      const text = normalize(element.textContent);
      if (!text) continue;
      const style = getComputedStyle(element);
      const horizontallyClipped = element.scrollWidth > element.clientWidth + 2;
      const verticallyClipped = element.scrollHeight > element.clientHeight + 2;
      const clipsOverflow = (
        ["hidden", "clip"].includes(style.overflow)
        || ["hidden", "clip"].includes(style.overflowX)
        || ["hidden", "clip"].includes(style.overflowY)
      );
      if ((horizontallyClipped || verticallyClipped) && clipsOverflow) {
        clippedControls.push({
          selector: shortSelector(element),
          text: text.slice(0, 120),
          client: `${element.clientWidth}x${element.clientHeight}`,
          scroll: `${element.scrollWidth}x${element.scrollHeight}`,
        });
      }
      if (clippedControls.length >= 40) break;
    }

    const hangulSnippets = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const textNode = walker.currentNode;
      const text = normalize(textNode.nodeValue);
      if (!/[\uAC00-\uD7A3]/.test(text)) continue;
      const parent = textNode.parentElement;
      if (!parent || !isVisible(parent)) continue;
      if (parent.closest("script,style,noscript,[data-i18n-fallback]")) continue;
      if (["한국어"].includes(text)) continue;
      hangulSnippets.add(text.slice(0, 160));
      if (hangulSnippets.size >= 40) break;
    }

    const overflowElements = [];
    for (const element of document.querySelectorAll("body *")) {
      if (!isVisible(element)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.right <= window.innerWidth + 2 && rect.left >= -2) continue;
      const style = getComputedStyle(element);
      if (style.position === "fixed" && rect.width <= 2) continue;
      overflowElements.push({
        selector: shortSelector(element),
        text: normalize(element.textContent).slice(0, 100),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      });
      if (overflowElements.length >= 30) break;
    }

    const alternateLinks = {};
    for (const link of document.querySelectorAll('link[rel="alternate"][hreflang]')) {
      alternateLinks[link.getAttribute("hreflang")] = link.href;
    }

    const jsonLd = [];
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        jsonLd.push(JSON.parse(script.textContent || "null"));
      } catch (error) {
        jsonLd.push({ __parseError: String(error) });
      }
    }
    const flattenJsonLd = (value, target = []) => {
      if (!value || typeof value !== "object") return target;
      if (Array.isArray(value)) {
        for (const item of value) flattenJsonLd(item, target);
        return target;
      }
      target.push(value);
      if (Array.isArray(value["@graph"])) flattenJsonLd(value["@graph"], target);
      return target;
    };
    const jsonLdNodes = flattenJsonLd(jsonLd);
    const personNodes = jsonLdNodes.filter((value) => {
      const type = value?.["@type"];
      return type === "Person" || (Array.isArray(type) && type.includes("Person"));
    });

    return {
      lang: document.documentElement.lang,
      title: document.title,
      description: content('meta[name="description"]'),
      canonical: content('link[rel="canonical"]', "href"),
      alternates: alternateLinks,
      ogUrl: content('meta[property="og:url"]'),
      ogLocale: content('meta[property="og:locale"]'),
      ogImageAlt: content('meta[property="og:image:alt"]'),
      duplicateIds,
      brokenAnchors,
      viewport: {
        innerWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
      },
      overflowElements,
      clippedControls,
      hangulSnippets: [...hangulSnippets],
      jsonLdParseErrors: jsonLdNodes
        .filter((value) => value?.__parseError)
        .map((value) => value.__parseError),
      personUrls: personNodes
        .map((value) => value.url || value["@id"])
        .filter(Boolean),
      personNames: personNodes
        .map((value) => value.name)
        .filter(Boolean),
      visibleTextLength: normalize(document.body?.innerText).length,
    };
  });
}

function validateResult(result) {
  const context = {
    slug: result.slug,
    locale: result.locale,
    viewport: result.viewport,
    url: result.url,
  };
  const expectedPath = `${result.prefix}/celeb/${result.slug}`;
  const expectedCanonical = normalizeUrl(productionUrl(expectedPath));

  if (result.status < 200 || result.status >= 400) {
    add("errors", "ROUTE_STATUS", `Route returned HTTP ${result.status}.`, context);
  }
  if (!result.data.title) {
    add("errors", "META_TITLE_MISSING", "Document title is missing.", context);
  }
  if (!result.data.description) {
    add("warnings", "META_DESCRIPTION_MISSING", "Meta description is missing.", context);
  }
  if (!result.data.lang.toLowerCase().startsWith(result.expectedLang)) {
    add(
      "errors",
      "HTML_LANG_MISMATCH",
      `Expected html lang '${result.expectedLang}', received '${result.data.lang || "(empty)"}'.`,
      context,
    );
  }
  if (normalizeUrl(result.data.canonical) !== expectedCanonical) {
    add(
      "errors",
      "CANONICAL_MISMATCH",
      `Expected '${expectedCanonical}', received '${result.data.canonical || "(empty)"}'.`,
      context,
    );
  }
  if (normalizeUrl(result.data.ogUrl) !== expectedCanonical) {
    add(
      "errors",
      "OG_URL_MISMATCH",
      `Expected '${expectedCanonical}', received '${result.data.ogUrl || "(empty)"}'.`,
      context,
    );
  }

  const expectedAlternates = {
    ko: productionUrl(`/celeb/${result.slug}`),
    en: productionUrl(`/en/celeb/${result.slug}`),
    "x-default": productionUrl(`/celeb/${result.slug}`),
  };
  for (const [language, expected] of Object.entries(expectedAlternates)) {
    if (normalizeUrl(result.data.alternates[language]) !== normalizeUrl(expected)) {
      add(
        "errors",
        "HREFLANG_MISMATCH",
        `${language} alternate should be '${expected}', received '${result.data.alternates[language] || "(empty)"}'.`,
        context,
      );
    }
  }

  for (const duplicate of result.data.duplicateIds) {
    add(
      "errors",
      "DUPLICATE_DOM_ID",
      `DOM id '${duplicate.id}' appears ${duplicate.count} times.`,
      context,
    );
  }
  for (const anchor of result.data.brokenAnchors) {
    add(
      "errors",
      "BROKEN_SECTION_ANCHOR",
      `Anchor '${anchor.href}' has no matching DOM id.`,
      { ...context, snippet: anchor.text },
    );
  }
  if (
    result.data.viewport.documentWidth > result.data.viewport.innerWidth + 2
    || result.data.viewport.bodyWidth > result.data.viewport.innerWidth + 2
  ) {
    add(
      "errors",
      "HORIZONTAL_OVERFLOW",
      `Page width is ${Math.max(
        result.data.viewport.documentWidth,
        result.data.viewport.bodyWidth,
      )}px for a ${result.data.viewport.innerWidth}px viewport.`,
      {
        ...context,
        snippets: result.data.overflowElements.map((element) => (
          `${element.selector} [${element.left}..${element.right}, ${element.width}px]`
          + `${element.text ? ` ${element.text}` : ""}`
        )),
      },
    );
  }
  for (const clipped of result.data.clippedControls) {
    add(
      "warnings",
      "POSSIBLE_TEXT_CLIPPING",
      `${clipped.selector} (${clipped.client} -> ${clipped.scroll}) may clip '${clipped.text}'.`,
      context,
    );
  }
  for (const error of result.data.jsonLdParseErrors) {
    add("errors", "JSON_LD_INVALID", error, context);
  }
  if (result.data.personUrls.length === 0) {
    add(
      "warnings",
      "PERSON_JSON_LD_MISSING",
      "No Person JSON-LD node was found.",
      context,
    );
  } else if (
    !result.data.personUrls.some((value) => normalizeUrl(value) === expectedCanonical)
  ) {
    add(
      "errors",
      "PERSON_JSON_LD_URL_MISMATCH",
      `Person JSON-LD URLs do not include '${expectedCanonical}'.`,
      context,
    );
  }
  if (result.locale === "en" && result.data.hangulSnippets.length > 0) {
    add(
      "warnings",
      "VISIBLE_HANGUL_IN_EN",
      `${result.data.hangulSnippets.length} visible Korean snippet(s) require semantic review.`,
      {
        ...context,
        snippets: result.data.hangulSnippets,
      },
    );
  }
  if (result.consoleErrors.length > 0) {
    add(
      "warnings",
      "BROWSER_CONSOLE_ERROR",
      `${result.consoleErrors.length} console error(s) occurred.`,
      { ...context, snippets: result.consoleErrors.slice(0, 10) },
    );
  }
  if (result.pageErrors.length > 0) {
    add(
      "errors",
      "BROWSER_PAGE_ERROR",
      `${result.pageErrors.length} uncaught page error(s) occurred.`,
      { ...context, snippets: result.pageErrors.slice(0, 10) },
    );
  }
}

function printFindings() {
  const groups = [
    ["ERROR", findings.errors],
    ["WARN", findings.warnings],
    ["INFO", findings.info],
  ];
  for (const [label, entries] of groups) {
    if (entries.length === 0) continue;
    console.log(`\n${label} (${entries.length})`);
    for (const finding of entries.slice(0, 300)) {
      const where = [finding.slug, finding.locale, finding.viewport]
        .filter(Boolean)
        .join("/");
      console.log(`- [${finding.code}]${where ? ` ${where}` : ""} ${finding.message}`);
      for (const snippet of finding.snippets?.slice(0, 8) ?? []) {
        console.log(`  > ${String(snippet).slice(0, 240)}`);
      }
      if (finding.snippet) console.log(`  > ${finding.snippet}`);
    }
    if (entries.length > 300) console.log(`- ... ${entries.length - 300} more`);
  }
}

if (screenshotRoot) fs.mkdirSync(screenshotRoot, { recursive: true });

let browser;
try {
  browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  for (const slug of slugs) {
    for (const localeConfig of locales) {
      for (const viewport of viewports) {
        const page = await browser.newPage();
        await page.setViewport(viewport);
        const pathname = `${localeConfig.prefix}/celeb/${slug}`;
        const url = `${baseUrl}${pathname}`;
        const consoleErrors = [];
        const pageErrors = [];
        page.on("console", (message) => {
          if (message.type() === "error") consoleErrors.push(message.text());
        });
        page.on("pageerror", (error) => pageErrors.push(String(error)));

        let status = 0;
        let data;
        try {
          const response = await page.goto(url, {
            waitUntil: "networkidle2",
            timeout: navigationTimeout,
          });
          status = response?.status() || 0;
          data = await inspectPage(page);
          if (screenshotRoot) {
            const screenshotPath = path.join(
              screenshotRoot,
              `${slug}-${localeConfig.locale}-${viewport.name}.png`,
            );
            await page.screenshot({
              path: screenshotPath,
              fullPage: true,
            });
          }
        } catch (error) {
          add(
            "errors",
            "ROUTE_INSPECTION_FAILED",
            String(error),
            {
              slug,
              locale: localeConfig.locale,
              viewport: viewport.name,
              url,
            },
          );
          await page.close();
          continue;
        }

        const result = {
          slug,
          locale: localeConfig.locale,
          prefix: localeConfig.prefix,
          expectedLang: localeConfig.expectedLang,
          viewport: viewport.name,
          url,
          status,
          data,
          consoleErrors,
          pageErrors,
        };
        routeResults.push(result);
        validateResult(result);
        await page.close();
      }
    }
  }
} catch (error) {
  add("errors", "BROWSER_LAUNCH_FAILED", String(error));
} finally {
  await browser?.close();
}

add(
  "info",
  "ROUTE_AUDIT_SUMMARY",
  `Inspected ${routeResults.length} rendered pages (${slugs.length} slug(s), 2 locales, 2 viewports).`,
);

const summary = {
  slugs,
  baseUrl,
  renderedPages: routeResults.length,
  errors: findings.errors.length,
  warnings: findings.warnings.length,
  strict,
  passed: findings.errors.length === 0 && (!strict || findings.warnings.length === 0),
};

if (jsonOutput) {
  console.log(JSON.stringify({ summary, findings, routes: routeResults }, null, 2));
} else {
  console.log("Feel&Note web i18n route audit");
  console.log(`- base URL: ${baseUrl}`);
  console.log(`- slugs: ${slugs.join(", ")}`);
  printFindings();
  console.log(
    `\nRESULT: ${summary.passed ? "PASS" : "FAIL"}`
    + ` (errors=${summary.errors}, warnings=${summary.warnings}${strict ? ", strict" : ""})`,
  );
  if (screenshotRoot) console.log(`- screenshots: ${screenshotRoot}`);
}

process.exitCode = summary.passed ? 0 : 1;

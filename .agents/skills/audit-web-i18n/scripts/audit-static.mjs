#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const args = new Set(process.argv.slice(2));
const strict = args.has("--strict");
const jsonOutput = args.has("--json");
const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function findRepoRoot(start) {
  let current = path.resolve(start);
  while (true) {
    if (
      fs.existsSync(path.join(current, "sw", "web", "messages", "ko"))
      && fs.existsSync(path.join(current, "sw", "web", "src"))
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

const repoRoot = findRepoRoot(process.cwd() || scriptDir);
const webRoot = path.join(repoRoot, "sw", "web");
const messagesRoot = path.join(webRoot, "messages");
const sourceRoot = path.join(webRoot, "src");
const requireFromWeb = createRequire(path.join(webRoot, "package.json"));
const ts = requireFromWeb("typescript");

const findings = {
  errors: [],
  warnings: [],
  info: [],
};

function add(severity, code, message, file = null, line = null, snippet = null) {
  findings[severity].push({
    code,
    message,
    ...(file ? { file: path.relative(repoRoot, file).replaceAll("\\", "/") } : {}),
    ...(line ? { line } : {}),
    ...(snippet ? { snippet } : {}),
  });
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    add("errors", "MESSAGE_JSON_INVALID", error.message, file);
    return null;
  }
}

function valueType(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function collectLeaves(value, prefix = "", target = new Map()) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      collectLeaves(child, prefix ? `${prefix}.${key}` : key, target);
    }
    return target;
  }
  target.set(prefix, { type: valueType(value), value });
  return target;
}

function extractIcuVariables(value) {
  if (typeof value !== "string") return [];
  const variables = new Set();
  const pattern = /\{\s*([A-Za-z_][\w.-]*)\s*(?:,|\})/g;
  for (const match of value.matchAll(pattern)) variables.add(match[1]);
  return [...variables].sort();
}

function listJsonFiles(locale) {
  const dir = path.join(messagesRoot, locale);
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort();
}

function auditMessages() {
  const koFiles = listJsonFiles("ko");
  const enFiles = listJsonFiles("en");
  const koSet = new Set(koFiles);
  const enSet = new Set(enFiles);

  for (const file of koFiles) {
    if (!enSet.has(file)) {
      add("errors", "MESSAGE_BUNDLE_MISSING_EN", `English message bundle is missing: ${file}`);
    }
  }
  for (const file of enFiles) {
    if (!koSet.has(file)) {
      add("errors", "MESSAGE_BUNDLE_MISSING_KO", `Korean message bundle is missing: ${file}`);
    }
  }

  const merged = { ko: {}, en: {} };
  const topLevelOwners = { ko: new Map(), en: new Map() };

  for (const locale of ["ko", "en"]) {
    for (const file of listJsonFiles(locale)) {
      const fullPath = path.join(messagesRoot, locale, file);
      const data = readJson(fullPath);
      if (!data) continue;
      for (const key of Object.keys(data)) {
        const previous = topLevelOwners[locale].get(key);
        if (previous) {
          add(
            "errors",
            "MESSAGE_NAMESPACE_COLLISION",
            `${locale} top-level key '${key}' is defined in both ${previous} and ${file}.`,
            fullPath,
          );
        } else {
          topLevelOwners[locale].set(key, file);
        }
      }
      Object.assign(merged[locale], data);
    }
  }

  const koLeaves = collectLeaves(merged.ko);
  const enLeaves = collectLeaves(merged.en);

  for (const [key, koEntry] of koLeaves) {
    const enEntry = enLeaves.get(key);
    if (!enEntry) {
      add("errors", "MESSAGE_KEY_MISSING_EN", `English message key is missing: ${key}`);
      continue;
    }
    if (koEntry.type !== enEntry.type) {
      add(
        "errors",
        "MESSAGE_TYPE_MISMATCH",
        `${key}: ko=${koEntry.type}, en=${enEntry.type}`,
      );
      continue;
    }
    if (koEntry.type === "string") {
      const koVars = extractIcuVariables(koEntry.value);
      const enVars = extractIcuVariables(enEntry.value);
      if (koVars.join("|") !== enVars.join("|")) {
        add(
          "errors",
          "MESSAGE_ICU_VARIABLE_MISMATCH",
          `${key}: ko={${koVars.join(", ")}}, en={${enVars.join(", ")}}`,
        );
      }
    }
  }

  for (const key of enLeaves.keys()) {
    if (!koLeaves.has(key)) {
      add("errors", "MESSAGE_KEY_MISSING_KO", `Korean message key is missing: ${key}`);
    }
  }

  const requestFile = path.join(sourceRoot, "i18n", "request.ts");
  if (fs.existsSync(requestFile)) {
    const requestSource = fs.readFileSync(requestFile, "utf8");
    for (const file of koFiles) {
      const namespace = path.basename(file, ".json");
      const namespacePattern = new RegExp(`['"]${namespace}['"]`);
      if (!namespacePattern.test(requestSource)) {
        add(
          "errors",
          "MESSAGE_BUNDLE_NOT_REGISTERED",
          `${file} is not registered in src/i18n/request.ts NAMESPACES.`,
          requestFile,
        );
      }
    }
  }

  return {
    merged,
    counts: { ko: koLeaves.size, en: enLeaves.size },
  };
}

function walkFiles(root, predicate, result = []) {
  if (!fs.existsSync(root)) return result;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "dist", "coverage"].includes(entry.name)) continue;
      walkFiles(fullPath, predicate, result);
    } else if (predicate(fullPath)) {
      result.push(fullPath);
    }
  }
  return result;
}

function unwrapExpression(node) {
  let current = node;
  while (
    current
    && (ts.isAwaitExpression(current)
      || ts.isParenthesizedExpression(current)
      || ts.isAsExpression(current)
      || ts.isSatisfiesExpression?.(current))
  ) {
    current = current.expression;
  }
  return current;
}

function literalText(node) {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return null;
}

function translationNamespaceFromInitializer(initializer) {
  if (!initializer) return undefined;
  const init = unwrapExpression(initializer);
  if (!init || !ts.isCallExpression(init) || !ts.isIdentifier(init.expression)) {
    return undefined;
  }
  const callee = init.expression.text;
  if (callee !== "useTranslations" && callee !== "getTranslations") return undefined;

  const directNamespace = literalText(init.arguments[0]);
  if (directNamespace) return directNamespace;

  const firstArgument = init.arguments[0];
  if (firstArgument && ts.isObjectLiteralExpression(firstArgument)) {
    for (const property of firstArgument.properties) {
      if (
        ts.isPropertyAssignment(property)
        && ts.isIdentifier(property.name)
        && property.name.text === "namespace"
      ) {
        return literalText(property.initializer) ?? undefined;
      }
    }
  }
  return undefined;
}

function declarationForName(statements, name) {
  for (const statement of statements ?? []) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
        return {
          found: true,
          namespace: translationNamespaceFromInitializer(declaration.initializer) ?? null,
        };
      }
    }
  }
  return { found: false, namespace: null };
}

function resolveTranslationNamespace(identifier) {
  const name = identifier.text;
  let current = identifier.parent;

  while (current) {
    if (ts.isFunctionLike(current)) {
      for (const parameter of current.parameters ?? []) {
        if (ts.isIdentifier(parameter.name) && parameter.name.text === name) {
          return null;
        }
      }
    }

    if (ts.isBlock(current) || ts.isSourceFile(current)) {
      const declaration = declarationForName(current.statements, name);
      if (declaration.found) return declaration.namespace;
    }
    current = current.parent;
  }
  return undefined;
}

function hasMessagePath(object, dottedPath) {
  const parts = dottedPath.split(".");
  let current = object;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) return false;
    current = current[part];
  }
  return true;
}

function sourceLocation(sourceFile, node) {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return line + 1;
}

function sameLineIgnored(sourceFile, node) {
  const line = sourceFile.text.split(/\r?\n/)[sourceLocation(sourceFile, node) - 1] ?? "";
  return line.includes("i18n-audit-ignore");
}

const neutralText = new Set([
  "Feel&Note",
  "FEEL & NOTE",
  "YouTube",
  "Wikidata",
  "BC",
  "URL",
  "API",
  "JSON-LD",
  "가",
  "A",
  "DAWN",
  "LABYRINTH",
  "HEGEMONY",
  "CHEONDO",
]);

function isHumanText(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized || neutralText.has(normalized)) return false;
  if (/^[\d\s.,:;!?/+\-–—()[\]{}'"&|%#@]+$/.test(normalized)) return false;
  return /[\uAC00-\uD7A3A-Za-z]/.test(normalized);
}

function isLikelyEnglishPhrase(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!/[A-Za-z]/.test(normalized)) return false;
  if (neutralText.has(normalized)) return false;
  if (/^(?:https?:\/\/|mailto:)/i.test(normalized) || /\S+@\S+\.\S+/.test(normalized)) {
    return false;
  }
  if (/^[a-z]{2}_[A-Z]{2}$/.test(normalized)) return false;
  if (/^[a-z]{1,6}-(?:\[[^\]]+\]|[\w.:/%-]+)$/i.test(normalized)) return false;
  const words = normalized.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
  return words.length >= 2 && normalized !== normalized.toUpperCase();
}

function isTranslatablePhrase(text) {
  return /[\uAC00-\uD7A3]/.test(text) || isLikelyEnglishPhrase(text);
}

function isStyleOrCodeLiteral(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (
    /[{};]/.test(normalized)
    || /^#[0-9a-f]{3,8}$/i.test(normalized)
    || /(?:^|\s)(?:text|bg|font|border|leading|rounded|shadow|ring|outline|grid|flex|items|justify|gap|p[trblxy]?|m[trblxy]?|w|h|min|max|opacity|overflow|transition|hover|focus|md|lg|xl)-/.test(normalized)
  ) {
    return true;
  }
  return false;
}

function jsxTagName(attribute) {
  const parent = attribute.parent;
  if (!parent || !ts.isJsxAttributes(parent)) return "";
  const opening = parent.parent;
  if (!opening || (!ts.isJsxOpeningElement(opening) && !ts.isJsxSelfClosingElement(opening))) {
    return "";
  }
  return opening.tagName.getText().toLowerCase();
}

const UI_OBJECT_PROPERTY_NAMES = new Set([
  "label",
  "desc",
  "description",
  "title",
  "placeholder",
  "text",
  "hint",
  "footerText",
  "emptyMessage",
  "ariaLabel",
]);

function propertyNameText(property) {
  if (!property?.name) return null;
  if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) {
    return property.name.text;
  }
  return null;
}

function isUiCallArgument(node) {
  const parent = node.parent;
  if (!parent || !ts.isCallExpression(parent)) return false;
  const callee = parent.expression.getText();
  return [
    "alert",
    "confirm",
    "prompt",
    "setError",
    "setDeleteError",
    "showToast",
  ].includes(callee);
}

function auditSource(mergedMessages) {
  const files = walkFiles(
    sourceRoot,
    (file) => /\.(ts|tsx)$/.test(file) && !file.endsWith(".d.ts"),
  );
  let staticTranslationCalls = 0;
  let dynamicTranslationCalls = 0;

  for (const file of files) {
    const sourceText = fs.readFileSync(file, "utf8");
    const sourceFile = ts.createSourceFile(
      file,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    const relative = path.relative(sourceRoot, file).replaceAll("\\", "/");
    const localizedRoute = relative.includes("app/[locale]/");
    const excludedVisualArea = (
      relative.includes("app/[locale]/lab/")
      || relative.includes("components/lab/")
      || relative.endsWith("ClashArenaStudio.tsx")
      || relative.endsWith("DuelDevStudio.tsx")
      || relative === "constants/lab.tsx"
      || relative === "constants/navigation.tsx"
    );
    const translationAware = (
      sourceText.includes("useTranslations")
      || sourceText.includes("getTranslations")
      || sourceText.includes("useLocale")
    );
    const inspectUiLiterals = file.endsWith(".tsx")
      && !excludedVisualArea;

    function inspect(node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const namespace = resolveTranslationNamespace(node.expression);
        if (typeof namespace === "string") {
          const key = literalText(node.arguments[0]);
          if (key) {
            staticTranslationCalls += 1;
            const fullKey = namespace ? `${namespace}.${key}` : key;
            if (
              !hasMessagePath(mergedMessages.ko, fullKey)
              || !hasMessagePath(mergedMessages.en, fullKey)
            ) {
              add(
                "errors",
                "TRANSLATION_KEY_UNKNOWN",
                `Translation key does not exist in both KO and EN messages: ${fullKey}`,
                file,
                sourceLocation(sourceFile, node),
              );
            }
          } else {
            dynamicTranslationCalls += 1;
          }
        }
      }

      if (inspectUiLiterals && !sameLineIgnored(sourceFile, node)) {
        if (ts.isJsxText(node)) {
          const text = node.getText(sourceFile).replace(/\s+/g, " ").trim();
          if (/[\uAC00-\uD7A3]/.test(text)) {
            add(
              "warnings",
              "UI_LITERAL_KO",
              "Korean text is hard-coded in a locale-aware JSX tree.",
              file,
              sourceLocation(sourceFile, node),
              text.slice(0, 100),
            );
          } else if (translationAware && isLikelyEnglishPhrase(text)) {
            add(
              "warnings",
              "UI_LITERAL_EN",
              "English text is hard-coded in a translation-aware JSX tree.",
              file,
              sourceLocation(sourceFile, node),
              text.slice(0, 100),
            );
          }
        }

        if (ts.isJsxAttribute(node)) {
          const attributeName = node.name.getText(sourceFile);
          const tagName = jsxTagName(node);
          const inspectAttribute = attributeName === "aria-label"
            || attributeName === "title"
            || (
              attributeName === "placeholder"
              && ["input", "textarea"].includes(tagName)
            );
          if (inspectAttribute) {
            let text = null;
            if (node.initializer && ts.isStringLiteral(node.initializer)) {
              text = node.initializer.text;
            } else if (
              node.initializer
              && ts.isJsxExpression(node.initializer)
              && node.initializer.expression
            ) {
              text = literalText(node.initializer.expression);
            }
            if (text && isHumanText(text)) {
              add(
                "warnings",
                "UI_ATTRIBUTE_LITERAL",
                `${attributeName} contains a literal instead of a translation key.`,
                file,
                sourceLocation(sourceFile, node),
                text.slice(0, 100),
              );
            }
          }
        }

        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
          const text = node.text.trim();
          const parent = node.parent;
          const uiObjectValue = ts.isPropertyAssignment(parent)
            && UI_OBJECT_PROPERTY_NAMES.has(propertyNameText(parent));
          const uiExpression = ts.isJsxExpression(parent);
          if (
            text
            && (uiObjectValue || uiExpression || isUiCallArgument(node))
            && !neutralText.has(text)
            && !isStyleOrCodeLiteral(text)
            && (
              isTranslatablePhrase(text)
              || (/^[A-Z][A-Z ]{2,}$/.test(text) && !neutralText.has(text))
            )
          ) {
            add(
              "warnings",
              /[\uAC00-\uD7A3]/.test(text) ? "UI_EXPRESSION_LITERAL_KO" : "UI_EXPRESSION_LITERAL_EN",
              "UI-facing string literal should use a locale message key.",
              file,
              sourceLocation(sourceFile, node),
              text.slice(0, 120),
            );
          }
        }

        if (ts.isConditionalExpression(node)) {
          const condition = node.condition.getText(sourceFile);
          const whenTrue = literalText(node.whenTrue);
          const whenFalse = literalText(node.whenFalse);
          if (
            /locale|isEn|isKorean/.test(condition)
            && whenTrue
            && whenFalse
            && (isTranslatablePhrase(whenTrue) || isTranslatablePhrase(whenFalse))
          ) {
            add(
              "warnings",
              "INLINE_LOCALE_PAIR",
              "Move the inline locale branch into the message bundles.",
              file,
              sourceLocation(sourceFile, node),
              `${whenTrue} | ${whenFalse}`.slice(0, 140),
            );
          }
        }
      }

      ts.forEachChild(node, inspect);
    }
    inspect(sourceFile);

    if (localizedRoute && sourceText.includes("navigator.language")) {
      add(
        "warnings",
        "BROWSER_LOCALE_IN_ROUTE",
        "This localized route reads navigator.language instead of the route locale.",
        file,
      );
    }
    if (/router\.push\(\s*`\/\$\{locale\}\//.test(sourceText)) {
      add(
        "warnings",
        "MANUAL_LOCALE_ROUTE",
        "Use @/i18n/navigation instead of manually composing a locale prefix.",
        file,
      );
    }
    if (localizedRoute && /\bgetCountryName\s*\(/.test(sourceText)) {
      add(
        "warnings",
        "KOREAN_ONLY_COUNTRY_NAME",
        "Use getCountryNameByLocale instead of the Korean-only getCountryName.",
        file,
      );
    }
  }

  add(
    "info",
    "TRANSLATION_CALL_SUMMARY",
    `Checked ${staticTranslationCalls} static translation calls; ${dynamicTranslationCalls} dynamic calls require review.`,
  );
}

function printFindings() {
  const all = [
    ["ERROR", findings.errors],
    ["WARN", findings.warnings],
    ["INFO", findings.info],
  ];
  for (const [label, entries] of all) {
    if (entries.length === 0) continue;
    console.log(`\n${label} (${entries.length})`);
    for (const entry of entries.slice(0, 300)) {
      const location = entry.file
        ? ` ${entry.file}${entry.line ? `:${entry.line}` : ""}`
        : "";
      console.log(`- [${entry.code}]${location} ${entry.message}`);
      if (entry.snippet) console.log(`  > ${entry.snippet}`);
    }
    if (entries.length > 300) {
      console.log(`- ... ${entries.length - 300} more`);
    }
  }
}

const messageAudit = auditMessages();
auditSource(messageAudit.merged);

const summary = {
  messageKeys: messageAudit.counts,
  errors: findings.errors.length,
  warnings: findings.warnings.length,
  strict,
  passed: findings.errors.length === 0 && (!strict || findings.warnings.length === 0),
};

if (jsonOutput) {
  console.log(JSON.stringify({ summary, findings }, null, 2));
} else {
  console.log("Feel&Note web i18n static audit");
  console.log(`- message keys: ko=${summary.messageKeys.ko}, en=${summary.messageKeys.en}`);
  printFindings();
  console.log(
    `\nRESULT: ${summary.passed ? "PASS" : "FAIL"}`
    + ` (errors=${summary.errors}, warnings=${summary.warnings}${strict ? ", strict" : ""})`,
  );
}

process.exitCode = summary.passed ? 0 : 1;

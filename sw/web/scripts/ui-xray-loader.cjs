const path = require("node:path");
const ts = require("typescript");

const XRAY_ATTRIBUTE = "data-ui-component";
const EXCLUDED_COMPONENTS = new Set([
  "LocaleLayout",
  "RootLayout",
  "UiXray",
  "UiXrayOverlay",
]);

function isComponentName(name) {
  return /^[A-Z][A-Za-z0-9_$]*$/.test(name) && !EXCLUDED_COMPONENTS.has(name);
}

function isIntrinsicTag(tagName) {
  return ts.isIdentifier(tagName) && /^[a-z]/.test(tagName.text);
}

function fallbackComponentName(resourcePath) {
  const basename = path.basename(resourcePath, path.extname(resourcePath));
  return basename
    .split(/[^A-Za-z0-9_$]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function hasXrayAttribute(attributes, sourceFile) {
  return attributes.properties.some(
    (property) =>
      ts.isJsxAttribute(property) && property.name.getText(sourceFile) === XRAY_ATTRIBUTE,
  );
}

function collectReturnedRoots(expression, componentName, sourceFile, insertions) {
  if (
    ts.isParenthesizedExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression)
  ) {
    collectReturnedRoots(expression.expression, componentName, sourceFile, insertions);
    return;
  }

  if (ts.isJsxElement(expression) && isIntrinsicTag(expression.openingElement.tagName)) {
    const attributes = expression.openingElement.attributes;
    if (!hasXrayAttribute(attributes, sourceFile)) insertions.set(attributes.end, componentName);
    return;
  }

  if (ts.isJsxSelfClosingElement(expression) && isIntrinsicTag(expression.tagName)) {
    if (!hasXrayAttribute(expression.attributes, sourceFile)) {
      insertions.set(expression.attributes.end, componentName);
    }
    return;
  }

  if (ts.isJsxFragment(expression)) {
    for (const child of expression.children) {
      if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) || ts.isJsxFragment(child)) {
        collectReturnedRoots(child, componentName, sourceFile, insertions);
      } else if (ts.isJsxExpression(child) && child.expression) {
        collectReturnedRoots(child.expression, componentName, sourceFile, insertions);
      }
    }
    return;
  }

  if (ts.isConditionalExpression(expression)) {
    collectReturnedRoots(expression.whenTrue, componentName, sourceFile, insertions);
    collectReturnedRoots(expression.whenFalse, componentName, sourceFile, insertions);
    return;
  }

  if (ts.isBinaryExpression(expression)) {
    collectReturnedRoots(expression.left, componentName, sourceFile, insertions);
    collectReturnedRoots(expression.right, componentName, sourceFile, insertions);
  }
}

function inspectComponentFunction(node, componentName, sourceFile, insertions) {
  if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) {
    collectReturnedRoots(node.body, componentName, sourceFile, insertions);
    return;
  }

  const visitOwnedNode = (child) => {
    if (ts.isFunctionLike(child)) return;

    if (ts.isReturnStatement(child) && child.expression) {
      collectReturnedRoots(child.expression, componentName, sourceFile, insertions);
      return;
    }

    ts.forEachChild(child, visitOwnedNode);
  };

  if (node.body) ts.forEachChild(node.body, visitOwnedNode);
}

function collectInsertions(sourceFile, resourcePath) {
  const insertions = new Map();
  const fallbackName = fallbackComponentName(resourcePath);

  const visit = (node) => {
    if (ts.isFunctionDeclaration(node) && node.name && isComponentName(node.name.text)) {
      inspectComponentFunction(node, node.name.text, sourceFile, insertions);
      return;
    }

    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      isComponentName(node.name.text) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      inspectComponentFunction(node.initializer, node.name.text, sourceFile, insertions);
      return;
    }

    if (
      ts.isExportAssignment(node) &&
      isComponentName(fallbackName) &&
      (ts.isArrowFunction(node.expression) || ts.isFunctionExpression(node.expression))
    ) {
      inspectComponentFunction(node.expression, fallbackName, sourceFile, insertions);
      return;
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return insertions;
}

module.exports = function uiXrayLoader(source) {
  this.cacheable?.();

  const sourceText = String(source);
  const sourceFile = ts.createSourceFile(
    this.resourcePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const insertions = Array.from(collectInsertions(sourceFile, this.resourcePath).entries()).sort(
    ([positionA], [positionB]) => positionB - positionA,
  );

  let output = sourceText;
  for (const [position, componentName] of insertions) {
    output = `${output.slice(0, position)} ${XRAY_ATTRIBUTE}="${componentName}"${output.slice(position)}`;
  }
  return output;
};

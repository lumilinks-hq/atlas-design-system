import { readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { lintAtlasSources } from "eslint-plugin-atlas";
import { buildAtlasLintOptions } from "eslint-plugin-atlas/options";
import { resolveManifest } from "./design-catalog.mjs";
import { parseArgs, rootDir } from "./lib.mjs";
import { collectScreenSources } from "./screen-sources.mjs";

const manifestPath = "experiments/account-management/manifest.json";
const designContract = resolveManifest(manifestPath);
const experimentManifest = JSON.parse(readFileSync(resolve(rootDir, manifestPath), "utf8"));
const requiredStates = experimentManifest.requiredStates;
const exampleResource = designContract.resources.find((resource) => resource.uri.includes("/examples/"));
if (!exampleResource) throw new Error(`${manifestPath}: 契約にexampleがありません`);
const accountManagementExample = JSON.parse(readFileSync(resolve(rootDir, exampleResource.path), "utf8"));
const expectedTableUsage = accountManagementExample.componentUsage["component.table"];
const expectedBackNavigationUsage = accountManagementExample.componentUsage["component.link"];

const designTokens = JSON.parse(readFileSync(resolve(rootDir, "design", "tokens.json"), "utf8"));
const tokenRoots = new Set(Object.keys(designTokens));

// 契約のlayout値（token参照・rem・px・%リテラル）をpx数値へ解決する。%はそのまま返す
function resolveContractLength(value) {
  if (typeof value !== "string") return undefined;
  let raw = value;
  if (value.includes(".") && tokenRoots.has(value.split(".")[0])) {
    let current = designTokens;
    for (const segment of value.split(".")) {
      if (current === null || typeof current !== "object" || !(segment in current)) return undefined;
      current = current[segment];
    }
    raw = current;
  }
  if (typeof raw !== "string") return undefined;
  if (raw.endsWith("rem")) return Number.parseFloat(raw) * 16;
  if (raw.endsWith("px")) return Number.parseFloat(raw);
  return raw;
}

const patternDataById = new Map(
  designContract.resources
    .filter((resource) => resource.uri.includes("/patterns/"))
    .map((resource) => [resource.id, JSON.parse(readFileSync(resolve(rootDir, resource.path), "utf8"))]),
);

function resolveVariantLayout(ref) {
  const [patternId, variantId] = ref.split("#");
  const variant = patternDataById.get(patternId)?.variants.find((item) => item.id === variantId);
  if (!variant?.layout) return undefined;
  return {
    classes: variant.layout.classes ?? [],
    values: Object.fromEntries(
      Object.entries(variant.layout.values ?? {}).map(([key, value]) => [key, resolveContractLength(value)]),
    ),
  };
}

const collectionScreen = designContract.screens.find((screen) => screen.pattern.endsWith("#collection-table"));
const detailScreen = designContract.screens.find((screen) => screen.pattern.endsWith("#single-one-column"));
const collectionLayout = collectionScreen ? resolveVariantLayout(collectionScreen.pattern) : undefined;
const detailLayout = detailScreen ? resolveVariantLayout(detailScreen.pattern) : undefined;
const drawerOverlay = detailScreen?.overlays?.find((overlay) => overlay.component === "component.drawer");
const drawerLayout = drawerOverlay ? resolveVariantLayout(drawerOverlay.pattern) : undefined;

// 評価器が参照する契約クラス。契約側のリネームに気づけるようlayout.classesとの一致を起動時に検査する
const layoutAnchors = {
  collectionRegion: ".collection-region",
  collectionToolbar: ".collection-toolbar",
  searchField: ".search-field",
  mobileList: ".collection-list-mobile",
  detailHeading: ".detail-page__heading",
  detailGrid: ".detail-grid",
  detailContent: ".detail-content",
  drawerForm: ".drawer-form",
};
for (const [key, className] of Object.entries(layoutAnchors)) {
  const pool =
    key === "drawerForm" ? drawerLayout?.classes : key.startsWith("detail") ? detailLayout?.classes : collectionLayout?.classes;
  if (pool && !pool.includes(className)) {
    throw new Error(`評価器のanchor ${className} が契約のlayout.classesにありません`);
  }
}
// lint 化したルール(method: lint)の判定条件。契約 JSON から組み、生成 workspace の HARNESS_LINT.json と同じ関数を通す
export const atlasLintOptions = buildAtlasLintOptions({
  componentsDir: resolve(rootDir, "design", "components"),
  examplePath: resolve(rootDir, exampleResource.path),
});

// @heroui/reactからimportしてよい識別子。exampleが参照する契約のimplementationとanatomyの和集合
export const approvedHeroUiImportNames = new Set(atlasLintOptions.approvedImports);

function result(id, status, evidence) {
  return { id, status, evidence };
}


function getJsxTagName(name) {
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isPropertyAccessExpression(name)) return `${getJsxTagName(name.expression)}.${name.name.text}`;
  return name.getText();
}

function findJsxOpenings(sourceFile, tagName) {
  const matches = [];
  const visit = (node) => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && getJsxTagName(node.tagName) === tagName) {
      matches.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return matches;
}

function findJsxElements(sourceFile, tagName) {
  const matches = [];
  const visit = (node) => {
    if (ts.isJsxElement(node) && getJsxTagName(node.openingElement.tagName) === tagName) matches.push(node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return matches;
}

function getJsxAttribute(opening, name) {
  return opening.attributes.properties.find(
    (property) => ts.isJsxAttribute(property) && property.name.getText() === name,
  );
}

function getJsxAttributeValue(attribute) {
  if (!attribute?.initializer) return attribute ? true : undefined;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (ts.isJsxExpression(attribute.initializer)) {
    const expression = attribute.initializer.expression;
    if (ts.isStringLiteral(expression)) return expression.text;
    if (ts.isIdentifier(expression)) return { identifier: expression.text };
  }
  return undefined;
}

function unwrapExpression(expression) {
  let current = expression;
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function getLiteralValue(expression) {
  const value = unwrapExpression(expression);
  if (ts.isStringLiteral(value) || ts.isNumericLiteral(value)) return value.text;
  if (value.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (value.kind === ts.SyntaxKind.FalseKeyword) return false;
  return undefined;
}

function readObjectLiteral(node) {
  if (!ts.isObjectLiteralExpression(node)) return undefined;
  const result = {};
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const key = property.name && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
      ? property.name.text
      : undefined;
    if (!key) continue;
    result[key] = getLiteralValue(property.initializer);
  }
  return result;
}

function findColumnDefinitions(sourceFile) {
  const definitions = [];
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const initializer = unwrapExpression(node.initializer);
      if (ts.isArrayLiteralExpression(initializer)) {
        const columns = initializer.elements.map(readObjectLiteral);
        if (columns.length > 0 && columns.every((column) => typeof column?.id === "string")) {
          definitions.push({ name: node.name.text, columns });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return definitions;
}

function findCanonicalColumnDefinitions(sourceFile) {
  const definitions = [];
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer?.getText(sourceFile).includes('accountManagementExample.componentUsage["component.table"].columns.map')
    ) {
      definitions.push({
        name: node.name.text,
        columns: expectedTableUsage.columns,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return definitions;
}

function findMapReferences(elements) {
  const references = [];
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "map" &&
      ts.isIdentifier(node.expression.expression)
    ) {
      references.push(node.expression.expression.text);
    }
    ts.forEachChild(node, visit);
  };
  for (const element of elements) visit(element);
  return references;
}

function normalizeColumn(column) {
  return {
    id: column.id,
    label: column.label,
    width: column.width,
    minWidth: Number(column.minWidth),
    align: column.align,
    isRowHeader: Boolean(column.isRowHeader),
    tabular: Boolean(column.tabular),
  };
}

function findAncestorClassNames(opening) {
  const classNames = [];
  let current = opening.parent?.parent;
  while (current) {
    if (ts.isJsxElement(current)) {
      const value = getJsxAttributeValue(getJsxAttribute(current.openingElement, "className"));
      if (typeof value === "string") classNames.push(...value.split(/\s+/).filter(Boolean));
    }
    current = current.parent;
  }
  return classNames;
}

function findAncestorJsxElement(opening, predicate) {
  let current = opening.parent;
  while (current) {
    if (ts.isJsxElement(current) && predicate(current)) return current;
    current = current.parent;
  }
  return undefined;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findSurfaceDecorations(styles, classNames) {
  const decorations = [];
  for (const match of styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const [, selector = "", declarations = ""] = match;
    for (const className of classNames) {
      if (!new RegExp(`\\.${escapeRegExp(className)}(?![\\w-])`).test(selector)) continue;
      for (const property of ["background", "background-color", "border-radius", "box-shadow"]) {
        if (new RegExp(`(?:^|[;\\s])${property}\\s*:`).test(declarations)) {
          decorations.push(`${className}: ${property}`);
        }
      }
      if (/@apply[^;}]*\bshadow(?:-|\b)/.test(declarations)) decorations.push(`${className}: shadow utility`);
    }
  }
  return [...new Set(decorations)];
}

function classUsesBaseRadius(styles, classNames) {
  return classNames.some((className) => {
    for (const match of styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const [, selector = "", declarations = ""] = match;
      if (!new RegExp(`\\.${escapeRegExp(className)}(?![\\w-])`).test(selector)) continue;
      if (/border-radius\s*:\s*var\(--dh-radius-base\)/.test(declarations)) return true;
    }
    return false;
  });
}

function findNegativeMargins(styles) {
  const findings = [];
  for (const match of styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1]?.trim();
    const declarations = match[2] ?? "";
    for (const margin of declarations.matchAll(/margin(?:-(?:block|inline)(?:-(?:start|end))?|-top|-right|-bottom|-left)?\s*:\s*([^;}]+)/g)) {
      const value = margin[1]?.trim() ?? "";
      if (/(?:^|[\s(])-[\d.]|\*\s*-[\d.]/.test(value)) findings.push(`${selector}: ${margin[0].trim()}`);
    }
  }
  return [...new Set(findings)];
}

function evaluateTableContract(app, styles) {
  const sourceFile = ts.createSourceFile("App.tsx", app, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const roots = [
    ...findJsxOpenings(sourceFile, "Table.Root"),
    ...findJsxOpenings(sourceFile, "Table"),
  ];
  const definitions = [
    ...findColumnDefinitions(sourceFile),
    ...findCanonicalColumnDefinitions(sourceFile),
  ];
  const expectedColumns = expectedTableUsage.columns.map(normalizeColumn);
  const definition = definitions.find((candidate) =>
    candidate.columns.some((column) => column.id === expectedColumns[0]?.id),
  );
  const actualColumns = definition?.columns.map(normalizeColumn) ?? [];
  const headerColumnRefs = findJsxOpenings(sourceFile, "Table.Header")
    .map((header) => getJsxAttributeValue(getJsxAttribute(header, "columns")))
    .filter((value) => value && typeof value === "object")
    .map((value) => value.identifier);
  headerColumnRefs.push(...findMapReferences(findJsxElements(sourceFile, "Table.Header")));
  const rowColumnRefs = findJsxOpenings(sourceFile, "Table.Row")
    .map((row) => getJsxAttributeValue(getJsxAttribute(row, "columns")))
    .filter((value) => value && typeof value === "object")
    .map((value) => value.identifier);
  rowColumnRefs.push(...findMapReferences(findJsxElements(sourceFile, "Table.Row")));
  const sharedColumns = Boolean(
    definition &&
    headerColumnRefs.length > 0 &&
    rowColumnRefs.length > 0 &&
    headerColumnRefs.every((name) => name === definition.name) &&
    rowColumnRefs.every((name) => name === definition.name),
  );
  const columnValuesMatch = JSON.stringify(actualColumns) === JSON.stringify(expectedColumns);
  const appliesTabular = /column\.tabular/.test(app) && /tabular/.test(app);
  const columnsMatch = columnValuesMatch && sharedColumns && appliesTabular;

  const ancestorClasses = roots.flatMap(findAncestorClassNames);
  const surfaceDecorations = findSurfaceDecorations(styles, ancestorClasses);
  const rootUtilityShadow = roots.some((root) => {
    const className = getJsxAttributeValue(getJsxAttribute(root, "className"));
    return typeof className === "string" && /(?:^|\s)shadow(?:-|\s|$)/.test(className);
  });
  const rootClasses = roots.flatMap((root) => {
    const className = getJsxAttributeValue(getJsxAttribute(root, "className"));
    return typeof className === "string" ? className.split(/\s+/).filter(Boolean) : [];
  });
  const usesSharedTableRadius = /\.table-root--primary[^{]*\{[^}]*border-radius\s*:\s*var\(--dh-radius-base\)/s.test(styles);
  const usesBaseRadius = roots.length > 0 && (classUsesBaseRadius(styles, rootClasses) || usesSharedTableRadius);
  const surfaceMatches = roots.length > 0 && !rootUtilityShadow && surfaceDecorations.length === 0 && usesBaseRadius;

  return {
    columns: result(
      "component.table.columns",
      columnsMatch ? "passed" : "failed",
      columnsMatch
        ? ["Exampleの列定義をHeaderとRowで共有"]
        : [
            columnValuesMatch ? "列の値は一致" : `期待する列順: ${expectedColumns.map((column) => column.id).join(" → ")}`,
            sharedColumns ? "HeaderとRowで列定義を共有" : "HeaderとRowが同じ列定義を参照していません",
            appliesTabular ? "tabular列の適用あり" : "tabular列の適用を確認できません",
          ],
    ),
    surface: result(
      "component.table.surface",
      surfaceMatches ? "passed" : "failed",
      surfaceMatches
        ? ["Tableへradius.baseを適用し、外側にsurface装飾なし"]
        : roots.length === 0
          ? ["Table.Rootを確認できません"]
          : rootUtilityShadow
            ? ["Table.Rootへshadow utilityが指定されています"]
            : [
                ...(!usesBaseRadius ? ["Table自身へのradius.base適用を確認できません"] : []),
                ...surfaceDecorations.map((decoration) => `外側の装飾: ${decoration}`),
              ],
    ),
  };
}

function parsePxValue(value) {
  if (typeof value !== "string") return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isNear(actual, expected, tolerance = 2) {
  return typeof actual === "number" && typeof expected === "number" && Math.abs(actual - expected) <= tolerance;
}

function findScreenMeasurement(measurements, screenId, viewport, state = "default") {
  return measurements.screens?.find(
    (entry) => entry.screenId === screenId && entry.viewport === viewport && (entry.state ?? "default") === state,
  );
}

function foundAnchor(entry, className) {
  const item = entry?.anchors?.[className];
  return item?.found ? item : undefined;
}

function describeGap(label, actual, expected) {
  return `${label}: 実測${actual ?? "不明"}px（契約${expected}px）`;
}

function evaluateNarrowMeasurements(measurements) {
  const evidence = [];
  let ok = true;
  const fail = (note) => {
    ok = false;
    evidence.push(note);
  };

  const tinyEntries = (measurements.screens ?? []).filter(
    (entry) => entry.viewport === "tiny" && (entry.state ?? "default") === "default",
  );
  if (tinyEntries.length === 0) fail("320pxの計測がありません");
  for (const entry of tinyEntries) {
    if (entry.error) fail(`${entry.route} 320px: 計測エラー（${entry.error}）`);
    else if (typeof entry.scrollWidth !== "number") fail(`${entry.route} 320px: scrollWidthを計測できません`);
    else if (entry.scrollWidth > entry.width) fail(`${entry.route} 320pxで横スクロール（scrollWidth ${entry.scrollWidth}px）`);
    else evidence.push(`${entry.route} 320px: scrollWidth ${entry.scrollWidth}px`);
  }

  const desktop = findScreenMeasurement(measurements, collectionScreen.id, "desktop");
  const mobile = findScreenMeasurement(measurements, collectionScreen.id, "mobile");
  if (!desktop || desktop.error) fail("一覧画面1440pxの計測がありません");
  else if (!desktop.elements?.table?.visible) fail("1440pxでTableを確認できません");
  if (!mobile || mobile.error) fail("一覧画面390pxの計測がありません");
  else {
    if (mobile.elements?.table?.visible) fail("390pxでTableが表示されたままです");
    const mobileList = foundAnchor(mobile, layoutAnchors.mobileList);
    if (!mobileList) fail(`契約クラス ${layoutAnchors.mobileList} が390pxのDOMにありません`);
    else if (!mobileList.visible) fail(`${layoutAnchors.mobileList} が390pxで非表示です`);
    else if (!mobile.elements?.table?.visible) evidence.push(`390px: Table非表示、${layoutAnchors.mobileList} 表示`);
  }
  return result("layout.narrow", ok ? "passed" : "failed", evidence);
}

function evaluateCollectionToolbarMeasurements(measurements) {
  const values = collectionLayout?.values ?? {};
  const evidence = [];
  let ok = true;
  const fail = (note) => {
    ok = false;
    evidence.push(note);
  };

  const desktop = findScreenMeasurement(measurements, collectionScreen.id, "desktop");
  if (!desktop || desktop.error) {
    const reason = desktop?.error ? `（${desktop.error}）` : "";
    return result("layout.collection-toolbar", "failed", [`一覧画面1440pxの計測がありません${reason}`]);
  }
  const region = foundAnchor(desktop, layoutAnchors.collectionRegion);
  const toolbar = foundAnchor(desktop, layoutAnchors.collectionToolbar);
  const search = foundAnchor(desktop, layoutAnchors.searchField);
  for (const [className, item] of [
    [layoutAnchors.collectionRegion, region],
    [layoutAnchors.collectionToolbar, toolbar],
    [layoutAnchors.searchField, search],
  ]) {
    if (!item) fail(`契約クラス ${className} が1440pxのDOMにありません`);
  }
  if (!toolbar && desktop.elements?.toolbar?.found) evidence.push("role=toolbarは検出（契約クラスなし）");
  if (!search && desktop.elements?.searchInput?.found) {
    evidence.push(`検索入力は検出（実測幅 ${Math.round(desktop.elements.searchInput.rect?.width ?? 0)}px）`);
  }
  if (region && toolbar && search) {
    const marginTop = parsePxValue(region.styles?.marginTop);
    if (isNear(marginTop, values.headingToCollectionGap)) {
      evidence.push(describeGap("見出し→一覧領域", marginTop, values.headingToCollectionGap));
    } else fail(describeGap(`${layoutAnchors.collectionRegion} margin-top`, marginTop, values.headingToCollectionGap));
    const rowGap = parsePxValue(region.styles?.rowGap);
    if (isNear(rowGap, values.toolbarGapBeforeTable)) {
      evidence.push(describeGap("Toolbar→Table", rowGap, values.toolbarGapBeforeTable));
    } else fail(describeGap(`${layoutAnchors.collectionRegion} row-gap`, rowGap, values.toolbarGapBeforeTable));
    const justify = toolbar.styles?.justifyContent;
    if (justify === "flex-end" || justify === "end" || justify === "right") evidence.push("Toolbarはflex末尾揃え");
    else fail(`Toolbarのjustify-contentが${justify ?? "不明"}です（契約はflex-end）`);
    if (isNear(search.rect?.width, values.searchDesktopWidth)) {
      evidence.push(`SearchField幅 実測${search.rect.width}px（契約${values.searchDesktopWidth}px）`);
    } else fail(`SearchField幅 実測${search.rect?.width ?? "不明"}px（契約${values.searchDesktopWidth}px）`);
    const table = desktop.elements?.table;
    if (table?.visible && toolbar.rect && table.rect && toolbar.rect.y + toolbar.rect.height <= table.rect.y + 2) {
      evidence.push("ToolbarはTable直前");
    } else fail("ToolbarがTableの直前にありません");
  }

  const mobile = findScreenMeasurement(measurements, collectionScreen.id, "mobile");
  if (!mobile || mobile.error) fail("一覧画面390pxの計測がありません");
  else {
    const toolbarMobile = foundAnchor(mobile, layoutAnchors.collectionToolbar);
    const searchMobile = foundAnchor(mobile, layoutAnchors.searchField);
    if (!toolbarMobile || !searchMobile) {
      fail(`契約クラス ${layoutAnchors.collectionToolbar} / ${layoutAnchors.searchField} が390pxのDOMにありません`);
    } else if (isNear(searchMobile.rect?.width, toolbarMobile.rect?.width)) {
      evidence.push(`390px: SearchField幅 ${searchMobile.rect.width}px = Toolbar幅（契約100%）`);
    } else {
      fail(
        `390pxのSearchField幅 ${searchMobile.rect?.width ?? "不明"}px がToolbar幅 ${toolbarMobile.rect?.width ?? "不明"}px と一致しません（契約100%）`,
      );
    }
  }
  return result("layout.collection-toolbar", ok ? "passed" : "failed", evidence);
}

function evaluateBackNavigationMeasurements(measurements) {
  const values = detailLayout?.values ?? {};
  const entry = findScreenMeasurement(measurements, detailScreen.id, "desktop");
  if (!entry || entry.error) {
    const reason = entry?.error ? `（${entry.error}）` : "";
    return result("layout.back-navigation", "failed", [`詳細画面1440pxの計測がありません${reason}`]);
  }
  const evidence = [];
  let ok = true;
  const fail = (note) => {
    ok = false;
    evidence.push(note);
  };
  const backLink = entry.elements?.backLink;
  const heading = entry.elements?.heading;
  if (
    backLink?.found &&
    heading?.found &&
    backLink.rect &&
    heading.rect &&
    backLink.rect.y + backLink.rect.height <= heading.rect.y
  ) {
    evidence.push("戻るLinkがページ見出しより前");
  } else fail(backLink?.found ? "戻るLinkがページ見出しの前にありません" : "戻るLinkを確認できません");
  const group = foundAnchor(entry, layoutAnchors.detailHeading);
  if (!group) fail(`契約クラス ${layoutAnchors.detailHeading} がDOMにありません`);
  else {
    const rowGap = parsePxValue(group.styles?.rowGap);
    if (isNear(rowGap, values.backNavigationGap)) evidence.push(describeGap("戻るLink→見出し", rowGap, values.backNavigationGap));
    else fail(describeGap(`${layoutAnchors.detailHeading} row-gap`, rowGap, values.backNavigationGap));
    const marginBottom = parsePxValue(group.styles?.marginBottom);
    if (isNear(marginBottom, values.headingToContentGap)) {
      evidence.push(describeGap("見出し→詳細コンテンツ", marginBottom, values.headingToContentGap));
    } else fail(describeGap(`${layoutAnchors.detailHeading} margin-bottom`, marginBottom, values.headingToContentGap));
  }
  return result("layout.back-navigation", ok ? "passed" : "failed", evidence);
}

function evaluateGroupingMeasurements(measurements, negativeMargins) {
  const values = detailLayout?.values ?? {};
  const evidence = [];
  let ok = true;
  const fail = (note) => {
    ok = false;
    evidence.push(note);
  };
  if (negativeMargins.length > 0) {
    ok = false;
    evidence.push("要素の重なりを起こしやすい負のmarginがあります", ...negativeMargins);
  }
  const entry = findScreenMeasurement(measurements, detailScreen.id, "desktop");
  if (!entry || entry.error) fail(`詳細画面1440pxの計測がありません${entry?.error ? `（${entry.error}）` : ""}`);
  else {
    const grid = foundAnchor(entry, layoutAnchors.detailGrid);
    if (!grid) fail(`契約クラス ${layoutAnchors.detailGrid} がDOMにありません`);
    else {
      const rowGap = parsePxValue(grid.styles?.rowGap);
      if (isNear(rowGap, values.sectionGap)) evidence.push(describeGap("セクション間", rowGap, values.sectionGap));
      else fail(describeGap(`${layoutAnchors.detailGrid} row-gap`, rowGap, values.sectionGap));
    }
    const content = foundAnchor(entry, layoutAnchors.detailContent);
    if (!content) fail(`契約クラス ${layoutAnchors.detailContent} がDOMにありません`);
    else {
      const rowGap = parsePxValue(content.styles?.rowGap);
      if (isNear(rowGap, values.groupGap)) evidence.push(describeGap("グループ間", rowGap, values.groupGap));
      else fail(describeGap(`${layoutAnchors.detailContent} row-gap`, rowGap, values.groupGap));
    }
  }
  if (drawerOverlay && drawerLayout) {
    const drawerEntry = findScreenMeasurement(measurements, detailScreen.id, "desktop", "drawer-open");
    if (!drawerEntry || drawerEntry.error) fail("drawer-openの計測がありません");
    else if (!drawerEntry.elements?.dialog?.found) fail("drawer-openでrole=dialogを確認できません");
    else {
      const form = foundAnchor(drawerEntry, layoutAnchors.drawerForm);
      if (!form) fail(`契約クラス ${layoutAnchors.drawerForm} がDrawer内にありません`);
      else {
        const rowGap = parsePxValue(form.styles?.rowGap);
        if (isNear(rowGap, drawerLayout.values.formGap)) {
          evidence.push(describeGap("Drawerフォームgap", rowGap, drawerLayout.values.formGap));
        } else fail(describeGap(`${layoutAnchors.drawerForm} row-gap`, rowGap, drawerLayout.values.formGap));
      }
    }
  }
  return result("layout.grouping", ok ? "passed" : "failed", evidence);
}

export function evaluateSource({ app, styles, fixtures = "", componentTheme = "", measurements, tsxFiles }) {
  const source = `${app}\n${fixtures}\n${styles}`;
  const effectiveStyles = `${styles}\n${componentTheme}`;
  const sourceFile = ts.createSourceFile("App.tsx", app, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const missingStates = requiredStates.filter((state) => !source.includes(state));
  const hasCustomerNameGuard = /companyName/.test(app) && /(required|isRequired)/.test(app);
  const hasLoadingGuard = /(isSaving|isLoading|saving)/.test(app) && /(disabled|isDisabled|isPending)/.test(app);
  const hasRetry = /(failure|失敗)/i.test(app) && /(retry|再試行)/i.test(app);
  const hasMobileList = /className=[^\n]*mobile-list/.test(app);
  const hasVerticalMobileList =
    /\.mobile-list\s*\{[^}]*flex-direction:\s*column/s.test(styles) ||
    (
      /\.mobile-list\s*\{[^}]*display:\s*(?:block|grid)/s.test(styles) &&
      /\.(?:customer-list|mobile-list)\s*\{[^}]*display:\s*grid/s.test(styles)
    );
  const mobileListCardBlock = styles.match(/\.(?:mobile-list-card|customer-list__item)\s*\{([^}]*)\}/s)?.[1] ?? "";
  const hasFlexibleMobileCards =
    /(height:\s*auto|min-height:)/.test(mobileListCardBlock) &&
    /white-space:\s*normal/.test(mobileListCardBlock);
  const hasNarrowLayout =
    /@media[^{]*(max-width|max-inline-size)/.test(styles) &&
    /(overflow-x|grid-template-columns|display:\s*none)/.test(styles) &&
    (!hasMobileList || (hasVerticalMobileList && hasFlexibleMobileCards));
  const hasRecoveryCopy = /(failure|失敗|エラー|できません)/i.test(app) && /(再試行|保持|確認)/.test(app);
  const hasStatusCopy = /(商談中|利用中|休眠|success|failure)/.test(app);
  const hasCustomerRoutes =
    /["'`]\/customers["'`]/.test(app) &&
    /["'`]\/customers\/:customerId["'`]/.test(app) &&
    /(顧客一覧へ戻る|navigate\(["'`]\/customers|to=["'`]\/customers)/.test(app);
  const navigationLinks = [
    ...findJsxElements(sourceFile, "Link"),
    ...findJsxElements(sourceFile, "RouterLink"),
  ];
  const hasNavigationTarget = (element) =>
    Boolean(
      getJsxAttribute(element.openingElement, "href") ||
      getJsxAttribute(element.openingElement, "to"),
    );
  const backLinkElement = navigationLinks.find((element) =>
    hasNavigationTarget(element) && /顧客一覧(?:へ|に)戻る/.test(element.getText(sourceFile)),
  );
  const detailHeadingGroup = backLinkElement
    ? findAncestorJsxElement(backLinkElement.openingElement, (element) => {
        const className = getJsxAttributeValue(getJsxAttribute(element.openingElement, "className"));
        return typeof className === "string" && className.split(/\s+/).includes("detail-page__heading");
      })
    : undefined;
  const backNavigation = backLinkElement
    ? findAncestorJsxElement(backLinkElement.openingElement, (element) =>
        getJsxTagName(element.openingElement.tagName) === "nav",
      )
    : undefined;
  const detailPageHeading = detailHeadingGroup
    ? findJsxOpenings(sourceFile, "PageHeading").find((opening) =>
        findAncestorJsxElement(opening, (element) => element === detailHeadingGroup),
      )
    : undefined;
  const detailPageHeadingIndex = detailPageHeading?.getStart(sourceFile) ?? -1;
  const detailContentIndex = detailPageHeadingIndex >= 0
    ? app.indexOf('className="detail-grid"', detailPageHeadingIndex)
    : -1;
  const detailHeadingGroupStyles = styles.match(/\.detail-page__heading\s*\{([^}]*)\}/s)?.[1] ?? "";
  const gapToPageHeading = expectedBackNavigationUsage.gapToPageHeading.replace(".", "-");
  const gapAfterPageHeading = expectedBackNavigationUsage.gapAfterPageHeading.replace(".", "-");
  const hasBackNavigationLayout =
    expectedBackNavigationUsage.placement === "before-page-heading" &&
    Boolean(detailHeadingGroup) &&
    Boolean(backNavigation) &&
    detailPageHeadingIndex > (backLinkElement?.getStart(sourceFile) ?? -1) &&
    detailContentIndex > detailPageHeadingIndex &&
    /display\s*:\s*grid/.test(detailHeadingGroupStyles) &&
    new RegExp(`gap\\s*:\\s*var\\(--dh-${gapToPageHeading}\\)`).test(detailHeadingGroupStyles) &&
    new RegExp(`margin-bottom\\s*:\\s*var\\(--dh-${gapAfterPageHeading}\\)`).test(detailHeadingGroupStyles) &&
    !/className=["'][^"']*\bdetail-actions\b/.test(app);
  const hasSplitCustomerScreens =
    /(CustomerListPage|CustomersPage)/.test(app) &&
    /(CustomerDetailPage|CustomerPage)/.test(app);
  const hasCustomerReadModels =
    /CustomerSummary/.test(source) &&
    /CustomerDetail/.test(source) &&
    /(listCustomerSummaries|getCustomerSummaries)/.test(source) &&
    /getCustomerDetail/.test(source);
  const tableContract = evaluateTableContract(app, effectiveStyles);
  const lint = lintAtlasSources({ app, styles, options: atlasLintOptions, tsxFiles });
  const lintMessages = (ruleName) => lint.messagesByRule.get(ruleName) ?? [];
  // 画面を複数ファイルに分けた run では、App.tsx 以外の由来ファイル名を先頭に付ける
  const describeMessages = (messages) =>
    messages.map((message) => {
      const location = `${message.line}:${message.column} ${message.message}`;
      return message.filename && message.filename !== "src/App.tsx" && message.filename !== "src/styles.css"
        ? `${message.filename} ${location}`
        : location;
    });
  // 構文エラーで lint が走れなかったときは、lint 由来の rule をすべて failed にして原因を残す
  const fatalEvidence = lint.fatal.length > 0 ? describeMessages(lint.fatal).map((text) => `構文エラー: ${text}`) : undefined;
  const lintResult = (id, ruleName, passedEvidence, failedEvidence = describeMessages) => {
    if (fatalEvidence) return result(id, "failed", fatalEvidence);
    const messages = lintMessages(ruleName);
    return messages.length === 0
      ? result(id, "passed", [passedEvidence])
      : result(id, "failed", failedEvidence(messages));
  };
  const hasRadiusAdapter =
    /--radius\s*:\s*calc\(var\(--dh-radius-base\)\s*\/\s*3\)/.test(componentTheme) &&
    /\.table-root--primary[^{]*\{[^}]*border-radius\s*:\s*var\(--dh-radius-base\)/s.test(componentTheme);
  const negativeMargins = findNegativeMargins(styles);
  const searchField = findJsxElements(sourceFile, "SearchField").find((element) =>
    getJsxAttributeValue(getJsxAttribute(element.openingElement, "aria-label")) === "企業名で検索",
  );
  const collectionToolbar = findJsxElements(sourceFile, "Toolbar").find((element) =>
    searchField ? element.getText(sourceFile).includes(searchField.getText(sourceFile)) : false,
  );
  const toolbarMarkup = collectionToolbar?.getText(sourceFile) ?? "";
  const searchFieldMarkup = searchField?.getText(sourceFile) ?? "";
  const toolbarClass = collectionToolbar
    ? getJsxAttributeValue(getJsxAttribute(collectionToolbar.openingElement, "className"))
    : undefined;
  const toolbarClassName = typeof toolbarClass === "string" ? toolbarClass : "";
  const searchFieldClass = searchField
    ? getJsxAttributeValue(getJsxAttribute(searchField.openingElement, "className"))
    : undefined;
  const searchFieldClassName = typeof searchFieldClass === "string" ? searchFieldClass : "";
  const collectionRegionStyles = styles.match(/\.customer-collection\s*\{([^}]*)\}/s)?.[1] ?? "";
  const escapedToolbarClassName = toolbarClassName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const toolbarStyles = escapedToolbarClassName
    ? styles.match(new RegExp(`\\.${escapedToolbarClassName}\\s*\\{([^}]*)\\}`, "s"))?.[1] ?? ""
    : "";
  const escapedSearchFieldClassName = searchFieldClassName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const searchFieldStyles = escapedSearchFieldClassName
    ? styles.match(new RegExp(`\\.${escapedSearchFieldClassName}\\s*\\{([^}]*)\\}`, "s"))?.[1] ?? ""
    : "";
  const hasSearchFieldAnatomy =
    /<SearchField\.Group(?:\s|>)/.test(searchFieldMarkup) &&
    /<SearchField\.SearchIcon(?:\s|\/?>)/.test(searchFieldMarkup) &&
    /<SearchField\.Input\b[^>]*placeholder=["']企業名で検索["']/.test(searchFieldMarkup) &&
    /<SearchField\.ClearButton\b[^>]*aria-label=["'][^"']+["']/.test(searchFieldMarkup);
  const hasToolbarPlacement =
    Boolean(collectionToolbar) &&
    getJsxAttributeValue(getJsxAttribute(collectionToolbar.openingElement, "aria-label")) === "顧客一覧の操作" &&
    toolbarMarkup.includes(searchFieldMarkup) &&
    app.indexOf(toolbarMarkup) < app.indexOf('className="customer-table-wrap"');
  const hasToolbarSpacing =
    /margin-top\s*:\s*var\(--dh-space-6\)/.test(collectionRegionStyles) &&
    (
      /gap\s*:\s*var\(--dh-space-3\)/.test(collectionRegionStyles) ||
      /margin-bottom\s*:\s*var\(--dh-space-3\)/.test(toolbarStyles)
    ) &&
    /width\s*:\s*100%/.test(toolbarStyles) &&
    /display\s*:\s*flex/.test(toolbarStyles) &&
    /justify-content\s*:\s*flex-end/.test(toolbarStyles);
  const hasResponsiveSearchWidth =
    /(?:width\s*:\s*(?:16rem|min\(100%,\s*16rem\))|max-width\s*:\s*16rem)/.test(searchFieldStyles) &&
    new RegExp(`@media[\\s\\S]*\\.${escapedSearchFieldClassName}\\s*\\{[^}]*width\\s*:\\s*100%`, "s").test(styles);
  const usesTextFieldForSearch = findJsxElements(sourceFile, "TextField")
    .some((element) => /会社名で検索|企業名で検索/.test(element.getText(sourceFile)));
  const hasCollectionToolbarLayout =
    Boolean(searchField) &&
    getJsxAttributeValue(getJsxAttribute(searchField.openingElement, "aria-label")) === "企業名で検索" &&
    hasSearchFieldAnatomy &&
    hasToolbarPlacement &&
    hasToolbarSpacing &&
    hasResponsiveSearchWidth &&
    !usesTextFieldForSearch;

  // 動的なvariantしか指摘がなければ機械判定不能としてreviewへ回す
  const variantMessages = lintMessages("component-variants");
  const variantInvalid = variantMessages.filter((message) => message.messageId !== "dynamic");
  const componentVariantsResult = fatalEvidence
    ? result("component.variants", "failed", fatalEvidence)
    : variantInvalid.length > 0
      ? result("component.variants", "failed", describeMessages(variantMessages))
      : variantMessages.length > 0
        ? result("component.variants", "review", describeMessages(variantMessages))
        : result("component.variants", "passed", ["静的に指定されたvariantはAtlas契約内"]);
  const importsComponentTheme = !fatalEvidence && lintMessages("component-theme-import").length === 0;
  const tokenRadiusResult = result(
    "token.radius",
    importsComponentTheme && hasRadiusAdapter ? "passed" : "failed",
    fatalEvidence ?? [
      importsComponentTheme && hasRadiusAdapter
        ? "AtlasのHeroUI theme adapterを読み込み"
        : "design/component-theme.cssの読み込みまたはradius adapterを確認できません",
    ],
  );

  const measuredLayout =
    measurements && collectionScreen && detailScreen
      ? {
          narrow: evaluateNarrowMeasurements(measurements),
          collectionToolbar: evaluateCollectionToolbarMeasurements(measurements),
          backNavigation: evaluateBackNavigationMeasurements(measurements),
          grouping: evaluateGroupingMeasurements(measurements, negativeMargins),
        }
      : undefined;

  return [
    lintResult("component.approved", "component-approved", "契約対象の独自HTML部品は検出されませんでした"),
    lintResult("component.usage", "component-usage", "exampleのcomponentUsageが求める部品はすべて実装に現れています"),
    componentVariantsResult,
    lintResult("component.table.variant", "table-variant", `Table.Rootは${expectedTableUsage.variant} variant`),
    tableContract.columns,
    tableContract.surface,
    tokenRadiusResult,
    lintResult("token.no-raw-color", "no-raw-color", "raw colorなし", (messages) => [`raw color: ${messages.length}件`]),
    result("a11y.control-name", "review", ["実ブラウザのaccessibility treeで確認する"]),
    lintResult("a11y.collection-item-name", "collection-item-name", "複合表示のListBox.ItemにtextValueあり"),
    lintResult("a11y.form-label", "form-label", "視覚ラベルまたはaria-labelあり"),
    // 文言の有無しか見ていないため合否は決めず、所見だけを残してレビューへ回す
    result("a11y.error-recovery", "review", [
      hasRecoveryCopy ? "参考: 原因または回復方法の文言を検出" : "参考: 回復方法の文言を検出できず",
      "文言の実際の伝わり方はAIレビューと人の確認で判定する",
    ]),
    result("a11y.color-only", "review", [
      hasStatusCopy ? "参考: 状態名の文字表示を検出" : "参考: 状態を示す文字を検出できず",
      "色以外の手掛かりが実画面で読めるかはAIレビューと人の確認で判定する",
    ]),
    result("business.customer-name", hasCustomerNameGuard ? "passed" : "failed", [hasCustomerNameGuard ? "顧客名の必須制御あり" : "顧客名の必須制御を確認できません"]),
    lintResult("business.contact-email", "contact-email", "メール形式の入力制御あり"),
    result(
      "navigation.customer-routes",
      hasCustomerRoutes && hasSplitCustomerScreens ? "passed" : "failed",
      [
        hasCustomerRoutes && hasSplitCustomerScreens
          ? "/customersと/customers/:customerIdを独立した画面として実装"
          : "顧客一覧、顧客詳細、一覧へ戻る経路の分離を確認できません",
      ],
    ),
    lintResult("navigation.link-semantics", "link-semantics", "Tableのオブジェクト名、モバイル詳細導線、一覧へ戻る導線をLinkとして実装"),
    result(
      "architecture.customer-read-models",
      hasCustomerReadModels ? "passed" : "failed",
      [
        hasCustomerReadModels
          ? "CustomerSummaryとCustomerDetailの取得経路を分離"
          : "一覧用CustomerSummaryと詳細用CustomerDetailの分離を確認できません",
      ],
    ),
    result("state.complete", missingStates.length === 0 ? "passed" : "failed", [missingStates.length === 0 ? `必須${requiredStates.length}状態あり` : `不足: ${missingStates.join(", ")}`]),
    measuredLayout?.grouping ??
      result(
        "layout.grouping",
        negativeMargins.length > 0 ? "failed" : "review",
        negativeMargins.length > 0
          ? ["要素の重なりを起こしやすい負のmarginがあります", ...negativeMargins]
          : ["スクリーンショットをblind reviewする"],
      ),
    measuredLayout?.collectionToolbar ??
      result(
        "layout.collection-toolbar",
        hasCollectionToolbarLayout ? "passed" : "failed",
        [
          hasCollectionToolbarLayout
            ? "Toolbar内のSearchFieldをTable直前の末尾側へ配置し、16remから狭幅100%へ再配置"
            : "customer-collectionにmargin-top: var(--dh-space-6)を指定し、ToolbarをTable直前に置いてください。Toolbarルートはwidth:100%、display:flex、justify-content:flex-endを指定し、SearchFieldは16rem、狭幅100%としてGroup、SearchIcon、Input、ClearButtonを使います",
        ],
      ),
    measuredLayout?.backNavigation ??
      result(
        "layout.back-navigation",
        hasBackNavigationLayout ? "passed" : "failed",
        [
          hasBackNavigationLayout
            ? "BackNavigation、PageHeadingの順に同じ見出しグループへ置き、space.4とspace.8で間隔を固定"
            : "詳細画面にdetail-page__headingを作り、その中へ戻るLinkを含むnavとPageHeadingをこの順で置いてください。グループはdisplay:grid、gap:var(--dh-space-4)、margin-bottom:var(--dh-space-8)とし、detail-actionsは削除します",
        ],
      ),
    measuredLayout?.narrow ??
      result(
        "layout.narrow",
        hasNarrowLayout ? "passed" : "failed",
        [
          hasNarrowLayout
            ? "狭幅向けmedia queryと再配置あり"
            : hasMobileList && !hasVerticalMobileList
              ? "モバイル一覧のコンテナ.mobile-listにflex-direction: columnがありません"
              : hasMobileList && !hasFlexibleMobileCards
                ? "HeroUI Buttonを使う.mobile-list-cardにheight: autoまたはmin-heightとwhite-space: normalがありません"
              : "狭幅向け再配置を確認できません",
        ],
      ),
    result("state.loading", hasLoadingGuard ? "passed" : "failed", [hasLoadingGuard ? "保存中のdisabled制御あり" : "二重送信防止を確認できません"]),
    // 再試行の文言を検出しても実際に再試行できるかまでは分からないため、合否は決めない
    result("state.failure", "review", [
      hasRetry ? "参考: 失敗と再試行の文言を検出" : "参考: 再試行の文言を検出できず",
      "失敗後に再試行できるかはAIレビューと人の確認で判定する",
    ]),
    result("color.semantic", "review", ["semantic colorの意味はblind reviewする"]),
    lintResult("action.confirmation", "action-confirmation", "AlertDialog.Triggerから確認画面を開き、起点はHeroUI Button"),
    lintResult("a11y.focus-management", "focus-management", "Drawer.Triggerの視覚スタイルとアイコンのみのCloseTriggerあり"),
  ];
}

function toMarkdown(evaluation, rulesById) {
  const lines = [
    "# Design validation",
    "",
    `自動判定: ${evaluation.summary.passed} passed / ${evaluation.summary.failed} failed / ${evaluation.summary.review} review`,
    "",
  ];
  for (const finding of evaluation.rules.filter((item) => item.status === "failed")) {
    const rule = rulesById.get(finding.id);
    lines.push(`## FAIL ${finding.id}: ${rule?.title ?? finding.id}`, "", ...finding.evidence.map((item) => `- ${item}`));
    if (rule?.fix) lines.push(`- 修正: ${rule.fix}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

export async function evaluateRun({ pairId, mode, outDir }) {
  const workspaceDir = resolve(rootDir, ".runs", "account-management", pairId, mode);
  const outputDir = outDir ? resolve(outDir) : resolve(rootDir, "experiments", "account-management", "runs", pairId, mode);
  // App.tsx から import で辿れる画面ファイルをまとめて評価する(単一ファイル前提を置かない)
  const [{ app, fixtures, styles, tsxFiles }, componentTheme, rulesDocument] = await Promise.all([
    collectScreenSources(resolve(workspaceDir, "src")),
    readFile(resolve(rootDir, "design", "component-theme.css"), "utf8"),
    readFile(resolve(rootDir, "design", "rules.json"), "utf8").then(JSON.parse),
  ]);
  // measurements.jsonが無ければ静的判定へフォールバック（baseline初回評価など）
  const measurementsPath = resolve(outputDir, "measurements.json");
  const measurements = existsSync(measurementsPath)
    ? JSON.parse(await readFile(measurementsPath, "utf8"))
    : undefined;
  const rules = evaluateSource({ app, fixtures, styles, componentTheme, measurements, tsxFiles });
  const summary = {
    passed: rules.filter((item) => item.status === "passed").length,
    failed: rules.filter((item) => item.status === "failed").length,
    review: rules.filter((item) => item.status === "review").length,
  };
  const evaluation = { pairId, mode, summary, rules };
  const rulesById = new Map(rulesDocument.rules.map((rule) => [rule.id, rule]));
  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, "design-evaluation.json"), `${JSON.stringify(evaluation, null, 2)}\n`);
  await writeFile(resolve(outDir ? outputDir : workspaceDir, "VALIDATION.md"), toMarkdown(evaluation, rulesById));

  if (!outDir) {
    const runPath = resolve(outputDir, "run.json");
    const run = JSON.parse(await readFile(runPath, "utf8"));
    run.checks = run.checks.filter((check) => check.name !== "design-rules");
    run.checks.push({ name: "design-rules", status: summary.failed === 0 ? "passed" : "failed", exitCode: summary.failed === 0 ? 0 : 1 });
    if (!run.artifacts.includes("design-evaluation.json")) run.artifacts.push("design-evaluation.json");
    await writeFile(runPath, `${JSON.stringify(run, null, 2)}\n`);
  }
  return evaluation;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (typeof args.pair !== "string" || typeof args.mode !== "string") throw new Error("--pairと--modeを指定してください");
  const outDir = typeof args.out === "string" ? resolve(args.out, args.mode) : undefined;
  const evaluation = await evaluateRun({ pairId: args.pair, mode: args.mode, outDir });
  console.log(`${args.mode}: ${evaluation.summary.passed} passed / ${evaluation.summary.failed} failed / ${evaluation.summary.review} review`);
}

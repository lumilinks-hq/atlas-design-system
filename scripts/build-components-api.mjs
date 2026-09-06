import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { rootDir } from "./lib.mjs";

export const componentsApiRelativePath = "design/components-api.md";

const require_ = createRequire(import.meta.url);

/** 承認済みコンポーネント契約を id 順で読む */
export function readApprovedComponents() {
  const dir = resolve(rootDir, "design", "components");
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(join(dir, name), "utf8")))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function heroUiPackageDir() {
  return dirname(require_.resolve("@heroui/react/package.json"));
}

export function heroUiVersion() {
  return JSON.parse(readFileSync(join(heroUiPackageDir(), "package.json"), "utf8")).version;
}

function readDts(...segments) {
  return readFileSync(join(heroUiPackageDir(), "dist", "components", ...segments), "utf8");
}

/**
 * prop 名の実在確認に使う型テキスト。@heroui/react の生成物では react-aria 側の prop を
 * 拾えないため、react-aria-components とその react-aria/react-stately 依存まで辿って連結する
 */
let corpusCache;
export function heroUiTypeCorpus() {
  if (corpusCache !== undefined) return corpusCache;
  const packages = new Map();
  const requireFrom = new Map();
  const addPackage = (packageJsonPath) => {
    const dir = dirname(packageJsonPath);
    if (packages.has(dir)) return false;
    packages.set(dir, JSON.parse(readFileSync(packageJsonPath, "utf8")));
    requireFrom.set(dir, createRequire(packageJsonPath));
    return true;
  };

  const heroUiRequire = createRequire(join(heroUiPackageDir(), "package.json"));
  const rootPackageJson = heroUiRequire.resolve("react-aria-components/package.json");
  addPackage(rootPackageJson);
  const queue = [dirname(rootPackageJson)];
  while (queue.length > 0) {
    const dir = queue.shift();
    const packageRequire = requireFrom.get(dir);
    for (const dependency of Object.keys(packages.get(dir).dependencies ?? {})) {
      if (!/^(?:@react-(?:aria|stately|types)\/|react-aria$|react-stately$)/.test(dependency)) continue;
      let resolved;
      try {
        resolved = packageRequire.resolve(`${dependency}/package.json`);
      } catch {
        continue;
      }
      if (addPackage(resolved)) queue.push(dirname(resolved));
    }
  }

  const walk = (dir, out = []) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") walk(path, out);
      } else if (entry.name.endsWith(".d.ts")) out.push(path);
    }
    return out;
  };

  const parts = [readDtsTreeForAllComponents()];
  for (const dir of [...packages.keys()].sort()) {
    for (const file of walk(dir).sort()) parts.push(readFileSync(file, "utf8"));
  }
  corpusCache = parts.join("\n");
  return corpusCache;
}

function readDtsTreeForAllComponents() {
  const dir = join(heroUiPackageDir(), "dist", "components");
  const parts = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    for (const file of readdirSync(join(dir, entry.name)).sort()) {
      if (file.endsWith(".d.ts")) parts.push(readFileSync(join(dir, entry.name, file), "utf8"));
    }
  }
  return parts.join("\n");
}

/** tailwind-variants の d.ts から variant/size の候補値を取り出す */
function readStyleUnion(stylesDir, key) {
  const stylesPackage = dirname(require_.resolve("@heroui/styles/package.json"));
  const path = join(stylesPackage, "dist", "components", stylesDir, `${stylesDir}.styles.d.ts`);
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
  const block = text.match(new RegExp(`\\n {4}${key}: \\{([\\s\\S]*?)\\n {4}\\}`));
  if (!block) return undefined;
  return [...block[1].matchAll(/\n {8}"?([\w-]+)"?:/g)].map((match) => match[1]);
}

/** 部品名は export type の <Name>Props キーと、宣言オブジェクトの深さ1のキーを合わせる */
function readSubComponents(dir, implementation) {
  const text = readDts(dir, "index.d.ts");
  const names = new Set();
  const typeBlock = text.match(new RegExp(`export type ${implementation}(?:<[^>]*>)? = \\{([\\s\\S]*?)\\n\\};`));
  if (typeBlock) {
    for (const match of typeBlock[1].matchAll(/\n {4}(\w+)Props:/g)) {
      if (match[1] !== "") names.add(match[1]);
    }
  }
  const constStart = text.indexOf(`export declare const ${implementation}:`);
  if (constStart >= 0) {
    const constEnd = text.indexOf("\n};", constStart);
    const constBlock = text.slice(constStart, constEnd < 0 ? undefined : constEnd);
    for (const match of constBlock.matchAll(/\n {4}(\w+):/g)) {
      if (match[1] !== "displayName") names.add(match[1]);
    }
  }
  names.delete("");
  return [...names].filter((name) => name !== "Props");
}

/**
 * 手当てしたキー prop と最小例。create-01 の harness が node_modules を掘って探した
 * ものを優先して載せる。prop 名は heroUiTypeCorpus() で実在を検証する
 */
export const componentApiSpecs = {
  "component.alert": {
    dir: "alert",
    variant: { mode: "union", prop: "status", stylesKey: "status" },
    size: { mode: "none", reason: "HeroUI に size prop は無い" },
    props: [
      ["status", '"default" | "accent" | "success" | "warning" | "danger"', "Atlas の variant はこの prop に対応する"],
      ["className", "string", "レイアウト調整のみ"],
    ],
    example: `<Alert status="danger">
  <Alert.Indicator />
  <Alert.Content>
    <Alert.Title>保存できませんでした</Alert.Title>
    <Alert.Description>通信に失敗しました。時間をおいて再試行してください。</Alert.Description>
  </Alert.Content>
</Alert>`,
    notes: ["色だけで状態を示さない。必ず文言を添える"],
  },
  "component.alert-dialog": {
    dir: "alert-dialog",
    variant: { mode: "union", prop: "variant", stylesKey: "variant", on: "AlertDialog.Backdrop" },
    size: { mode: "union", stylesKey: "size", on: "AlertDialog.Container" },
    props: [
      ["isOpen", "boolean", "Root。制御する場合に渡す"],
      ["defaultOpen", "boolean", "Root。非制御の初期状態"],
      ["onOpenChange", "(isOpen: boolean) => void", "Root。開閉の通知"],
      ["isDismissable", "boolean", "Backdrop。既定 false（明示操作を要求する）"],
      ["isKeyboardDismissDisabled", "boolean", "Backdrop。既定 true"],
    ],
    example: `<AlertDialog isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
  <AlertDialog.Trigger><Button variant="danger-soft">顧客を削除</Button></AlertDialog.Trigger>
  <AlertDialog.Backdrop variant="blur"><AlertDialog.Container size="sm"><AlertDialog.Dialog>
    <AlertDialog.Header><AlertDialog.Icon status="danger" /><AlertDialog.Heading>顧客の削除</AlertDialog.Heading></AlertDialog.Header>
    <AlertDialog.Body>削除すると元に戻せません。</AlertDialog.Body>
    <AlertDialog.Footer>
      <Button variant="tertiary" onPress={() => setIsDeleteOpen(false)}>キャンセル</Button>
      <Button variant="danger" isPending={isDeleting} onPress={handleDelete}>削除する</Button>
    </AlertDialog.Footer>
  </AlertDialog.Dialog></AlertDialog.Container></AlertDialog.Backdrop>
</AlertDialog>`,
    notes: [
      "variant は Backdrop、size は Container。起点は Trigger の内側に Button を置き、Footer は素の Button と onPress で閉じる",
    ],
  },
  "component.button": {
    dir: "button",
    variant: { mode: "union", prop: "variant", stylesKey: "variant" },
    size: { mode: "union", stylesKey: "size" },
    props: [
      ["onPress", "(event: PressEvent) => void", "押下。onClick ではなくこれを使う"],
      ["type", '"button" | "submit" | "reset"', "Form 送信は type=\"submit\""],
      ["form", "string", "Form の外に置いた送信ボタンを form の id で結ぶ"],
      ["isDisabled", "boolean", "無効化"],
      ["isPending", "boolean", "非同期処理中。二重送信を止める"],
      ["aria-label", "string", "アイコンだけのとき必須"],
      ["isIconOnly", "boolean", "アイコンだけの見た目"],
      ["fullWidth", "boolean", "横幅いっぱい"],
    ],
    example: `<Button variant="primary" onPress={handleSave}>保存する</Button>`,
    notes: ["主要操作は 1 つの領域に 1 つまで", "画面遷移は Button ではなく Link"],
  },
  "component.card": {
    dir: "card",
    variant: { mode: "union", prop: "variant", stylesKey: "variant" },
    size: { mode: "none", reason: "HeroUI に size prop は無い" },
    props: [["variant", '"default" | "secondary" | "tertiary" | "transparent"', "面の役割"]],
    example: `<Card variant="default">
  <Card.Header><Card.Title>連絡先</Card.Title></Card.Header>
  <Card.Content>...</Card.Content>
</Card>`,
    notes: ["外側に独自の背景、角丸、影を重ねない"],
  },
  "component.chip": {
    dir: "chip",
    variant: { mode: "union", prop: "variant", stylesKey: "variant" },
    size: { mode: "union", stylesKey: "size" },
    props: [
      ["variant", '"primary" | "secondary" | "tertiary" | "soft"', "見た目"],
      ["size", '"sm" | "md" | "lg"', "大きさ"],
    ],
    example: `<Chip variant="soft" size="sm"><Chip.Label>商談中</Chip.Label></Chip>`,
    notes: ["状態を色だけで示さない。ラベル文言を必ず持たせる"],
  },
  "component.drawer": {
    dir: "drawer",
    variant: { mode: "union", prop: "variant", stylesKey: "variant", on: "Drawer.Backdrop" },
    size: {
      mode: "none",
      atlasSizes: ["md", "lg"],
      reason: "HeroUI に size prop は無い。幅は Atlas 契約の layout.width を className で当てる",
    },
    props: [
      ["isOpen", "boolean", "Root。制御する場合に渡す"],
      ["onOpenChange", "(isOpen: boolean) => void", "Root。開閉の通知"],
      ["isDismissable", "boolean", "Backdrop。既定 true"],
      ["placement", '"top" | "bottom" | "left" | "right"', "Content"],
    ],
    example: `<Drawer isOpen={isOpen} onOpenChange={setIsOpen}>
  <Drawer.Trigger className={primaryButtonClass}>顧客を追加</Drawer.Trigger>
  <Drawer.Backdrop variant="blur"><Drawer.Content placement="right"><Drawer.Dialog>
    <Drawer.CloseTrigger aria-label="閉じる" /><Form validationBehavior="aria" onSubmit={handleSubmit}>
      <Drawer.Header><Drawer.Heading>顧客を追加</Drawer.Heading></Drawer.Header><Drawer.Body>...</Drawer.Body>
      <Drawer.Footer>
        <Button variant="tertiary" onPress={() => setIsOpen(false)}>キャンセル</Button>
        <Button type="submit" variant="primary" isPending={isSaving}>保存する</Button>
      </Drawer.Footer></Form>
  </Drawer.Dialog></Drawer.Content></Drawer.Backdrop>
</Drawer>`,
    notes: [
      "Drawer.Trigger は必須。内側に Button を入れず、自前の主要 Button と同じ見た目の className とラベルを Trigger へ直接置く",
      "Drawer.CloseTrigger は aria-label だけのアイコン枠。表示テキストを入れない",
    ],
  },
  "component.form": {
    dir: "form",
    variant: { mode: "none", reason: "見た目の variant を持たない" },
    size: { mode: "none", reason: "HeroUI に size prop は無い" },
    props: [
      ["onSubmit", "(event: FormEvent<HTMLFormElement>) => void", "送信。event.preventDefault() を呼ぶ"],
      ["validationBehavior", '"native" | "aria"', "aria にするとブラウザ標準の吹き出しを止めて画面内に出せる"],
      ["id", "string", "外に置いた送信ボタンと form={id} で結ぶ"],
    ],
    example: `<Form id="customer-form" validationBehavior="aria" onSubmit={handleSubmit}>
  <TextField name="companyName" isRequired>...</TextField>
</Form>`,
    notes: ["エラーは各フィールドの FieldError に出し、送信ボタンの近くに要約も置く"],
  },
  "component.link": {
    dir: "link",
    variant: { mode: "none", reason: "見た目の variant を持たない" },
    size: { mode: "none", reason: "HeroUI に size prop は無い" },
    props: [
      ["href", "string", "遷移先。react-router では useNavigate ではなくこれを使う"],
      ["onPress", "(event: PressEvent) => void", "押下"],
      ["isDisabled", "boolean", "無効化"],
    ],
    example: `<Link href="#/customers">顧客一覧へ戻る</Link>`,
    notes: ["画面遷移は Link。Button で遷移させない"],
  },
  "component.search-field": {
    dir: "search-field",
    variant: { mode: "union", prop: "variant", stylesKey: "variant" },
    size: { mode: "none", reason: "HeroUI に size prop は無い" },
    props: [
      ["value", "string", "制御する場合の値"],
      ["onChange", "(value: string) => void", "入力。event ではなく値が来る"],
      ["aria-label", "string", "見出しラベルを置かないとき必須"],
      ["fullWidth", "boolean", "横幅いっぱい"],
    ],
    example: `<SearchField aria-label="企業名で検索" value={query} onChange={setQuery}>
  <SearchField.Group>
    <SearchField.SearchIcon />
    <SearchField.Input placeholder="企業名で検索" />
    <SearchField.ClearButton />
  </SearchField.Group>
</SearchField>`,
    notes: ["placeholder はラベルの代わりにしない"],
  },
  "component.select": {
    dir: "select",
    variant: { mode: "union", prop: "variant", stylesKey: "variant" },
    size: { mode: "none", reason: "HeroUI に size prop は無い" },
    props: [
      ["selectedKey", "Key | null", "制御する場合の選択値"],
      ["onSelectionChange", "(key: Key | null) => void", "選択の変更"],
      ["items", "Iterable<T>", "動的な選択肢"],
      ["isRequired", "boolean", "必須"],
      ["isInvalid", "boolean", "エラー表示"],
      ["placeholder", "string", "未選択時の表示"],
    ],
    example: `<Select selectedKey={status} onSelectionChange={setStatus}>
  <Label>ステータス</Label>
  <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
  <Select.Popover>
    <ListBox>{options.map((o) => <ListBoxItem key={o} id={o}>{o}</ListBoxItem>)}</ListBox>
  </Select.Popover>
</Select>`,
    notes: ["選択肢は ListBox と ListBoxItem で並べる"],
  },
  "component.surface": {
    dir: "surface",
    variant: { mode: "union", prop: "variant", stylesKey: "variant" },
    size: { mode: "none", reason: "HeroUI に size prop は無い" },
    props: [["variant", '"default" | "secondary" | "tertiary" | "transparent"', "面の役割"]],
    example: `<Surface variant="secondary">...</Surface>`,
    notes: ["面の重なりは Surface が持つ。div に背景色を直書きしない"],
  },
  "component.table": {
    dir: "table",
    variant: { mode: "union", prop: "variant", stylesKey: "variant" },
    size: { mode: "none", reason: "HeroUI に size prop は無い" },
    props: [
      ["isRowHeader", "boolean", "Column。行の識別子になる列に付ける"],
      ["id", "Key", "Column と Row の識別子"],
      ["width", "string | number", "Column の幅"],
      ["items", "Iterable<T>", "Body。行データ"],
      ["renderEmptyState", "() => ReactNode", "Body。空状態"],
      ["href", "string", "Row。行全体を遷移させる場合"],
      ["aria-label", "string", "Content。表の名前"],
    ],
    example: `<Table variant="primary">
  <Table.ScrollContainer><Table.Content aria-label="顧客一覧">
    <Table.Header><Table.Column id="companyName" isRowHeader width="38%">企業名</Table.Column></Table.Header>
    <Table.Body items={customers} renderEmptyState={() => <p>顧客がまだありません</p>}>
      {(customer) => <Table.Row id={customer.id}><Table.Cell><Link to={\`/customers/\${customer.id}\`}>{customer.companyName}</Link></Table.Cell></Table.Row>}
    </Table.Body>
  </Table.Content></Table.ScrollContainer>
</Table>`,
    notes: [
      "Root、ScrollContainer、Content の順に組む。外側に背景、角丸、影を重ねない",
      "オブジェクト名の Cell は Link にする。Cell へ直接書く（別関数へ切り出すと lint が見つけられない）",
    ],
  },
  "component.text-field": {
    dir: "textfield",
    variant: { mode: "inline", prop: "variant" },
    size: { mode: "none", reason: "HeroUI に size prop は無い" },
    props: [
      ["value", "string", "制御する場合の値"],
      ["onChange", "(value: string) => void", "入力。event ではなく値が来る"],
      ["name", "string", "Form 送信時のキー"],
      ["type", '"text" | "email" | "tel" | "url" | "password"', "Input ではなく TextField に渡す"],
      ["isRequired", "boolean", "必須"],
      ["isInvalid", "boolean", "エラー表示"],
      ["validate", "(value: string) => string | null", "個別の検証"],
    ],
    example: `<TextField name="email" type="email" isRequired isInvalid={Boolean(error)}>
  <Label>メールアドレス</Label>
  <Input />
  <FieldError>{error}</FieldError>
</TextField>`,
    notes: ["Label、Input、Description、FieldError を子として組む。placeholder をラベルの代わりにしない"],
  },
  "component.toast": {
    dir: "toast",
    variant: { mode: "union", prop: "variant", stylesKey: "variant" },
    size: { mode: "none", reason: "HeroUI に size prop は無い" },
    props: [
      ["placement", "string", "Provider。表示位置"],
      ["maxVisibleToasts", "number", "Provider。同時表示数"],
      ["variant", '"default" | "accent" | "success" | "warning" | "danger"', "個々の Toast"],
    ],
    example: `import { Toast, toast } from "@heroui/react";
// アプリの外側に一度だけ置く
<Toast.Provider />
// 呼び出し側
toast.success("顧客を保存しました");
toast.danger("保存できませんでした");`,
    notes: ["Toast.Provider を置かないと toast() は何も出さない", "成否は文言で伝える。色だけに頼らない"],
  },
  "component.toolbar": {
    dir: "toolbar",
    variant: { mode: "boolean", prop: "isAttached", map: { default: "false", attached: "true" } },
    size: { mode: "none", reason: "HeroUI に size prop は無い" },
    props: [
      ["isAttached", "boolean", "Atlas の attached variant。既定（default）は付けない"],
      ["orientation", '"horizontal" | "vertical"', "並び"],
      ["aria-label", "string", "ツールバーの名前"],
    ],
    example: `<Toolbar aria-label="顧客一覧の操作">
  <SearchField aria-label="企業名で検索">...</SearchField>
</Toolbar>`,
    notes: ["Atlas の variant default は isAttached を付けない状態を指す"],
  },
};

/** 表のセルに素の | を置くと列が割れる */
function escapeCell(value) {
  return value.replaceAll("|", "\\|");
}

function assertSubset(id, label, actual, allowed) {
  const missing = actual.filter((value) => !allowed.includes(value));
  if (missing.length > 0) {
    throw new Error(
      `${id}: Atlas の ${label} が HeroUI ${heroUiVersion()} に存在しません: ${missing.join(", ")}（HeroUI 側: ${allowed.join(", ")}）`,
    );
  }
}

function resolveVariantLine(component, spec) {
  const { variants, defaults } = component;
  const rule = spec.variant;
  if (rule.mode === "none") {
    if (variants.length !== 1 || variants[0] !== "default") {
      throw new Error(`${component.id}: variant prop が無いのに Atlas が ${variants.join(", ")} を宣言しています`);
    }
    return `- variant: なし（${rule.reason}）`;
  }
  if (rule.mode === "boolean") {
    const mapped = Object.keys(rule.map);
    if (JSON.stringify([...variants].sort()) !== JSON.stringify(mapped.sort())) {
      throw new Error(`${component.id}: Atlas の variant ${variants.join(", ")} が ${rule.prop} の対応表と一致しません`);
    }
    const pairs = variants.map((value) => `${value} → \`${rule.prop}={${rule.map[value]}}\``);
    return `- variant: ${pairs.join(" / ")}（既定 ${defaults.variant}）`;
  }
  const allowed =
    rule.mode === "inline"
      ? [...(readDts(spec.dir, `${spec.dir}.d.ts`).match(/variant\?: ((?:"[\w-]+"(?: \| )?)+);/)?.[1] ?? "").matchAll(/"([\w-]+)"/g)].map((match) => match[1])
      : (readStyleUnion(spec.dir, rule.stylesKey) ?? []);
  if (allowed.length === 0) throw new Error(`${component.id}: HeroUI 側の ${rule.prop} 候補を読み取れません`);
  assertSubset(component.id, `variants`, variants, allowed);
  const target = rule.on ? `${rule.on} の ` : "";
  return `- variant: ${target}\`${rule.prop}\` = ${variants.join(" | ")}（既定 ${defaults.variant}）`;
}

function resolveSizeLine(component, spec) {
  const rule = spec.size;
  if (rule.mode === "none") {
    // HeroUI に size prop が無い場合、Atlas の sizes は論理値でしかない。
    // 契約側が値を増やしたらここで気付けるよう、想定する集合を明示して突き合わせる
    const expected = rule.atlasSizes ?? ["md"];
    if (JSON.stringify(component.sizes) !== JSON.stringify(expected)) {
      throw new Error(
        `${component.id}: HeroUI に size prop が無いのに Atlas が ${component.sizes.join(", ")} を宣言しています（想定 ${expected.join(", ")}）`,
      );
    }
    return `- size: なし（${rule.reason}）`;
  }
  const allowed = readStyleUnion(spec.dir, rule.stylesKey) ?? [];
  if (allowed.length === 0) throw new Error(`${component.id}: HeroUI 側の size 候補を読み取れません`);
  assertSubset(component.id, "sizes", component.sizes, allowed);
  const target = rule.on ? `${rule.on} の ` : "";
  return `- size: ${target}\`size\` = ${component.sizes.join(" | ")}（既定 ${component.defaults.size}）`;
}

/**
 * design/components/*.json と @heroui/react の型定義から API シートを組み立てる。
 * overrides はテスト専用で、契約と HeroUI がずれたときに失敗することを確かめる
 */
export function buildComponentsApiMarkdown({ overrides = {} } = {}) {
  const version = heroUiVersion();
  for (const experiment of ["account-management", "invoice-management"]) {
    const starter = JSON.parse(
      readFileSync(resolve(rootDir, "experiments", experiment, "starter", "package.json"), "utf8"),
    );
    const pinned = starter.dependencies?.["@heroui/react"];
    if (pinned !== version) {
      throw new Error(`${experiment} の starter は @heroui/react ${pinned} を固定していますが、解決したのは ${version} です`);
    }
  }

  const corpus = heroUiTypeCorpus();
  const components = readApprovedComponents();
  const lines = [
    "# HeroUI API シート（Atlas 承認コンポーネント）",
    "",
    `@heroui/react ${version} の型定義から生成した。手で編集せず \`node scripts/build-components-api.mjs\` で作り直す。`,
    "",
    "API を調べる目的で `node_modules` を開かない。ここに載る prop で契約は満たせる。className、id、children、aria-* などの標準属性はどの部品でも使える。",
    "Atlas が許す variant と size はここに書いたものだけで、HeroUI が持つ他の値は使えない。",
    "",
  ];

  for (const component of components) {
    const spec = componentApiSpecs[component.id];
    if (!spec) throw new Error(`${component.id}: componentApiSpecs に定義がありません`);
    const merged = { ...component, ...(overrides[component.id] ?? {}) };
    const subComponents = readSubComponents(spec.dir, component.implementation);

    for (const [name] of spec.props) {
      const bare = name.replace(/\?$/, "");
      if (!corpus.includes(bare)) {
        throw new Error(`${component.id}: prop ${bare} が HeroUI ${version} の型定義に見当たりません`);
      }
    }

    lines.push(
      `## ${component.name}`,
      `- import: \`import { ${component.implementation} } from "${component.import}";\``,
      `- 下位: ${subComponents.length > 0 ? subComponents.map((name) => `\`${component.implementation}.${name}\``).join(", ") : "なし"}`,
      resolveVariantLine(merged, spec),
      resolveSizeLine(merged, spec),
      "",
      "| prop | 型 | 用途 |",
      "| --- | --- | --- |",
      ...spec.props.map(([name, type, use]) => `| \`${name}\` | \`${escapeCell(type)}\` | ${escapeCell(use)} |`),
      "",
      "```tsx",
      spec.example,
      "```",
      "",
      ...spec.notes.map((note) => `- ${note}`),
      "",
    );
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const { writeFileSync } = await import("node:fs");
  const target = resolve(rootDir, componentsApiRelativePath);
  writeFileSync(target, buildComponentsApiMarkdown());
  process.stdout.write(`Wrote ${componentsApiRelativePath}\n`);
}

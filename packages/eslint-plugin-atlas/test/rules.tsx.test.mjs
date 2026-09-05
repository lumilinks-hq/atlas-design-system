import { tsxTester } from "./setup.mjs";
import { rules } from "../src/index.mjs";

const approved = {
  approvedImports: ["Button", "Table", "Link", "Label"],
  forbiddenText: ["Atlas CRM", "契約管理"],
};

tsxTester.run("component-approved", rules["component-approved"], {
  valid: [
    { code: `import { Button } from "@heroui/react"; export const A = () => <Button>保存</Button>;`, options: [approved] },
    { code: `import type { Spinner } from "@heroui/react"; export const A = () => <div />;`, options: [approved] },
    { code: `import { Button as B } from "@heroui/react"; export const A = () => <B />;`, options: [approved] },
  ],
  invalid: [
    { code: `export const A = () => <button>x</button>;`, options: [approved], errors: [{ messageId: "native", data: { name: "button" } }] },
    { code: `export const A = () => <div role="dialog" />;`, options: [approved], errors: [{ messageId: "native", data: { name: "custom dialog" } }] },
    { code: `import { Spinner } from "@heroui/react"; export const A = () => <div />;`, options: [approved], errors: [{ messageId: "unapprovedImport", data: { name: "Spinner" } }] },
    { code: `export const A = () => <h1>Atlas CRM</h1>;`, options: [approved], errors: [{ messageId: "forbiddenText", data: { text: "Atlas CRM" } }] },
  ],
});

const usage = { componentUsage: [{ name: "Toolbar", implementation: "Toolbar" }, { name: "Table", implementation: "Table" }] };
tsxTester.run("component-usage", rules["component-usage"], {
  valid: [{ code: `export const A = () => <><Toolbar.Root /><Table.Root /></>;`, options: [usage] }],
  invalid: [
    { code: `import { Toolbar } from "@heroui/react"; export const A = () => <Table.Root />;`, options: [usage], errors: [{ messageId: "missing", data: { name: "Toolbar" } }] },
  ],
});

const variants = { variants: { Button: { name: "Button", variants: ["primary", "secondary"] }, Chip: { name: "Chip", variants: ["soft"] } } };
tsxTester.run("component-variants", rules["component-variants"], {
  valid: [
    { code: `export const A = () => <Button variant="primary" />;`, options: [variants] },
    { code: `export const A = () => <Other variant="anything" />;`, options: [variants] },
  ],
  invalid: [
    { code: `export const A = () => <Button variant="link" />;`, options: [variants], errors: [{ messageId: "invalid", data: { name: "Button", value: "link" } }] },
    { code: `export const A = () => <Chip variant={tone} />;`, options: [variants], errors: [{ messageId: "dynamic" }] },
  ],
});

tsxTester.run("table-variant", rules["table-variant"], {
  valid: [
    { code: `export const A = () => <Table.Root variant="primary" />;`, options: [{ variant: "primary" }] },
    { code: `export const A = () => <Table.Root />;`, options: [{ variant: "primary" }] },
  ],
  invalid: [
    { code: `export const A = () => <Table.Root variant="secondary" />;`, options: [{ variant: "primary" }], errors: [{ messageId: "mismatch" }] },
    { code: `export const A = () => <div />;`, options: [{ variant: "primary" }], errors: [{ messageId: "missing" }] },
  ],
});

tsxTester.run("collection-item-name", rules["collection-item-name"], {
  valid: [
    { code: `export const A = () => <ListBox.Item textValue="A"><b>A</b></ListBox.Item>;` },
    { code: `export const A = () => <ListBox.Item>A</ListBox.Item>;` },
  ],
  invalid: [{ code: `export const A = () => <ListBox.Item><b>A</b></ListBox.Item>;`, errors: [{ messageId: "missingTextValue" }] }],
});

tsxTester.run("form-label", rules["form-label"], {
  valid: [
    { code: `export const A = () => <TextField><Label>名前</Label><Input /></TextField>;` },
    { code: `export const A = () => <SearchField aria-label="検索" />;` },
  ],
  invalid: [{ code: `export const A = () => <Input placeholder="名前" />;`, errors: [{ messageId: "missing" }] }],
});

// 形式検証を求める type は example の lint.requiredInputType から渡す。
// 題材が変われば求める type も変わるので、両方の値で判定が動くことを固定する
const emailType = [{ type: "email" }];
const dateType = [{ type: "date" }];
tsxTester.run("contact-email", rules["contact-email"], {
  valid: [
    { code: `export const A = () => <Input type="email" />;`, options: emailType },
    { code: `export const A = () => <TextField type="email"><Input /></TextField>;`, options: emailType },
    { code: `export const A = () => <Input type="date" />;`, options: dateType },
  ],
  invalid: [
    { code: `export const A = () => <Input type="text" />;`, options: emailType, errors: [{ messageId: "missing" }] },
    // email しか持たない画面は、date を求める題材では通さない
    { code: `export const A = () => <Input type="email" />;`, options: dateType, errors: [{ messageId: "missing" }] },
  ],
});

const link = {
  objectNameExpression: "customer.companyName",
  backLinkPattern: "顧客一覧(?:へ|に)戻る",
  mobileListClass: "collection-list-mobile",
  navigationTextPattern: "customer\\.companyName|顧客を確認|顧客一覧(?:へ|に)戻る",
};
const goodLinks = `export const A = () => <>
  <Table.Cell><Link href="/customers/1">{customer.companyName}</Link></Table.Cell>
  <ul className="collection-list-mobile"><li><Link href="/customers/1">顧客を確認</Link></li></ul>
  <Link to="/customers">顧客一覧へ戻る</Link>
</>;`;
tsxTester.run("link-semantics", rules["link-semantics"], {
  valid: [{ code: goodLinks, options: [link] }],
  invalid: [
    {
      code: `export const A = () => <><Table.Cell>{customer.companyName}</Table.Cell><Button onPress={go}>顧客一覧へ戻る</Button></>;`,
      options: [link],
      // RuleTester は位置順に並べる。Program 起点(1:1)の 2 件、Table.Cell、Button の順
      errors: [
        { messageId: "mobileDetailLink" },
        { messageId: "backLink" },
        { messageId: "objectNameLink" },
        { messageId: "navigationButton" },
      ],
    },
  ],
});

// options を渡さない構成では実験固有の語で判定しない(プラグインに既定値を置かない)
tsxTester.run("link-semantics-no-options", rules["link-semantics"], {
  valid: [
    { code: `export const A = () => <><Table.Cell>{customer.companyName}</Table.Cell><Button onPress={go}>顧客一覧へ戻る</Button></>;` },
  ],
  invalid: [],
});

// 取り消せない操作の語は example の lint.irreversibleActionPattern から渡す
const deleteAction = [{ pattern: "削除|delete|remove" }];
const voidAction = [{ pattern: "無効化|voidInvoice" }];
tsxTester.run("action-confirmation", rules["action-confirmation"], {
  valid: [
    { code: `export const A = () => <Button>保存</Button>;`, options: deleteAction },
    { code: `export const A = () => <AlertDialog.Root><AlertDialog.Trigger><Button>削除</Button></AlertDialog.Trigger></AlertDialog.Root>;`, options: deleteAction },
    // 題材の語を含まない画面には確認を求めない
    { code: `export const A = () => <Button onPress={remove}>削除</Button>;`, options: voidAction },
    { code: `export const A = () => <AlertDialog.Root><AlertDialog.Trigger><Button>無効化する</Button></AlertDialog.Trigger></AlertDialog.Root>;`, options: voidAction },
  ],
  invalid: [
    { code: `export const A = () => <Button onPress={remove}>削除</Button>;`, options: deleteAction, errors: [{ messageId: "noTrigger" }] },
    { code: `export const A = () => <AlertDialog.Root><AlertDialog.Trigger>削除</AlertDialog.Trigger></AlertDialog.Root>;`, options: deleteAction, errors: [{ messageId: "noButton" }] },
    { code: `export const A = () => <Button onPress={voidInvoice}>無効化する</Button>;`, options: voidAction, errors: [{ messageId: "noTrigger" }] },
  ],
});

const goodDrawer = `export const A = () => <Drawer.Root>
  <Drawer.Trigger className="button button--primary">編集</Drawer.Trigger>
  <Drawer.Backdrop><Drawer.CloseTrigger aria-label="閉じる"><XIcon /></Drawer.CloseTrigger></Drawer.Backdrop>
</Drawer.Root>;`;
tsxTester.run("focus-management", rules["focus-management"], {
  valid: [{ code: goodDrawer }],
  invalid: [
    { code: goodDrawer.replace("<Drawer.Trigger className=\"button button--primary\">編集</Drawer.Trigger>", "<Drawer.Trigger><Button>編集</Button></Drawer.Trigger>"), errors: [{ messageId: "triggerClassName" }, { messageId: "nestedButton" }] },
    { code: goodDrawer.replace("<XIcon />", "閉じる"), errors: [{ messageId: "closeTrigger" }] },
    { code: `export const A = () => <div />;`, errors: [{ messageId: "noDrawer" }, { messageId: "triggerClassName" }, { messageId: "noBackdrop" }, { messageId: "closeTrigger" }] },
  ],
});

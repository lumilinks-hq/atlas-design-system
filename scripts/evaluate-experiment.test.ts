import { describe, expect, it } from "vitest";
import { approvedHeroUiImportNames, evaluateSource, evaluationContext } from "./evaluate-experiment.mjs";

describe("evaluationContext", () => {
  it("実験名から判定条件を組み、同じ実験では同じインスタンスを返す", () => {
    const context = evaluationContext("account-management");

    expect(evaluationContext("account-management")).toBe(context);
    expect(context.name).toBe("account-management");
    expect(context.routes).toEqual(["/customers", "/customers/:customerId"]);
    expect(context.backLinkPattern).toBe("顧客一覧(?:へ|に)戻る");
    expect(context.statusValues).toEqual(["商談中", "利用中", "休眠"]);
    expect(context.requiredFieldName).toBe("companyName");
    expect(context.toolbarAriaLabel).toBe("顧客一覧の操作");
    expect(context.searchAriaLabel).toBe("企業名で検索");
    expect(context.screenComponents.collection).toContain("CustomerListPage");
    expect(context.readModels.summaryType).toContain("CustomerSummary");
  });

  it("存在しない実験名を拒否する", () => {
    expect(() => evaluationContext("no-such-experiment")).toThrow("実験が見つかりません");
  });
});

describe("evaluateSource", () => {
  it("detects design contract escapes", () => {
    const rules = evaluateSource({
      app: '<><button>削除</button><div role="dialog">確認</div></>',
      styles: ".panel { color: #123456; }",
    });
    const byId = new Map(rules.map((rule) => [rule.id, rule]));

    expect(byId.get("component.approved")?.status).toBe("failed");
    expect(byId.get("token.no-raw-color")?.evidence).toEqual(["raw color: 1件"]);
    expect(byId.get("action.confirmation")?.status).toBe("failed");
    expect(byId.get("a11y.focus-management")?.status).toBe("failed");
  });

  it("requires the AlertDialog trigger contract", () => {
    const withoutTrigger = evaluateSource({
      app: "<AlertDialog.Root><AlertDialog.Dialog />削除</AlertDialog.Root>",
      styles: "",
    });
    const withTrigger = evaluateSource({
      app: "<AlertDialog.Root><AlertDialog.Trigger><Button>削除</Button></AlertDialog.Trigger><AlertDialog.Dialog /></AlertDialog.Root>",
      styles: "",
    });

    expect(withoutTrigger.find((rule) => rule.id === "action.confirmation")?.status).toBe("failed");
    expect(withTrigger.find((rule) => rule.id === "action.confirmation")?.status).toBe("passed");
  });

  it("requires a HeroUI Button inside AlertDialog.Trigger", () => {
    const withoutButton = evaluateSource({
      app: "<AlertDialog.Root><AlertDialog.Trigger>顧客を削除</AlertDialog.Trigger><AlertDialog.Dialog /></AlertDialog.Root>",
      styles: "",
    });

    const rule = withoutButton.find((item) => item.id === "action.confirmation");
    expect(rule?.status).toBe("failed");
    expect(rule?.evidence.join(" ")).toContain("Button");
  });

  it("requires every state listed in the manifest", () => {
    const withoutDeleteConfirm = evaluateSource({
      app: '"default empty drawer-open invalid-email loading success failure"',
      styles: "",
    });
    const withAllStates = evaluateSource({
      app: '"default empty drawer-open invalid-email loading success failure delete-confirm"',
      styles: "",
    });

    const failedRule = withoutDeleteConfirm.find((item) => item.id === "state.complete");
    expect(failedRule?.status).toBe("failed");
    expect(failedRule?.evidence.join(" ")).toContain("delete-confirm");
    expect(withAllStates.find((item) => item.id === "state.complete")?.status).toBe("passed");
  });

  it("requires the Drawer trigger contract", () => {
    const withoutTrigger = evaluateSource({
      app: "<Drawer.Root><Drawer.Backdrop /></Drawer.Root>",
      styles: "",
    });
    const withTrigger = evaluateSource({
      app: '<Drawer.Root><Drawer.Trigger className="edit-trigger">開く</Drawer.Trigger><Drawer.Backdrop><Drawer.CloseTrigger aria-label="閉じる" /></Drawer.Backdrop></Drawer.Root>',
      styles: "",
    });

    expect(withoutTrigger.find((rule) => rule.id === "a11y.focus-management")?.status).toBe("failed");
    expect(withTrigger.find((rule) => rule.id === "a11y.focus-management")?.status).toBe("passed");
  });

  it("rejects visible text inside the narrow Drawer close trigger", () => {
    const rules = evaluateSource({
      app: '<Drawer.Root><Drawer.Trigger className="edit-trigger">開く</Drawer.Trigger><Drawer.Backdrop><Drawer.CloseTrigger aria-label="閉じる">閉じる</Drawer.CloseTrigger></Drawer.Backdrop></Drawer.Root>',
      styles: "",
    });

    const rule = rules.find((item) => item.id === "a11y.focus-management");
    expect(rule?.status).toBe("failed");
    expect(rule?.evidence.join(" ")).toContain("表示テキスト");
  });

  it("rejects a HeroUI Button nested inside the Drawer trigger", () => {
    const rules = evaluateSource({
      app: '<Drawer.Root><Drawer.Trigger className="button button--md button--primary"><Button variant="primary">開く</Button></Drawer.Trigger><Drawer.Backdrop><Drawer.CloseTrigger aria-label="閉じる" /></Drawer.Backdrop></Drawer.Root>',
      styles: "",
    });

    const rule = rules.find((item) => item.id === "a11y.focus-management");
    expect(rule?.status).toBe("failed");
    expect(rule?.evidence.join(" ")).toContain("入れ子");
  });

  it("accepts a saving state paired with disabled controls", () => {
    const rules = evaluateSource({
      app: '<Button isDisabled={saving}>{saving ? "保存中" : "保存"}</Button>',
      styles: "",
    });

    expect(rules.find((rule) => rule.id === "state.loading")?.status).toBe("passed");
  });

  it("accepts HeroUI v3 callable roots and pending state props", () => {
    const rules = evaluateSource({
      app: `
        <>
        <Table variant="primary" />
        <Drawer><Drawer.Trigger className="button button--primary">編集</Drawer.Trigger><Drawer.Backdrop><Drawer.CloseTrigger aria-label="閉じる" /></Drawer.Backdrop></Drawer>
        <Button isPending={isSaving}>保存</Button>
        </>
      `,
      styles: '@import "../design/component-theme.css";',
      componentTheme: ':root { --radius: calc(var(--dh-radius-base) / 3); } .table-root--primary { border-radius: var(--dh-radius-base); }',
    });

    expect(rules.find((rule) => rule.id === "component.table.variant")?.status).toBe("passed");
    expect(rules.find((rule) => rule.id === "state.loading")?.status).toBe("passed");
    expect(rules.find((rule) => rule.id === "a11y.focus-management")?.status).toBe("passed");
  });

  it("rejects UI outside the issue scope", () => {
    const rules = evaluateSource({
      app: "<header><p>Atlas CRM</p><p>営業ワークスペース</p></header>",
      styles: "",
    });

    expect(rules.find((rule) => rule.id === "component.approved")?.status).toBe("failed");
  });

  it("requires a mobile list to stack vertically", () => {
    const app = '<div className="mobile-list" />';
    const horizontal = evaluateSource({
      app,
      styles: "@media (max-width: 640px) { .workspace { grid-template-columns: 1fr; } }",
    });
    const vertical = evaluateSource({
      app,
      styles: ".mobile-list { flex-direction: column; } .mobile-list-card { height: auto; white-space: normal; } @media (max-width: 640px) { .workspace { grid-template-columns: 1fr; } }",
    });

    expect(horizontal.find((rule) => rule.id === "layout.narrow")?.status).toBe("failed");
    expect(vertical.find((rule) => rule.id === "layout.narrow")?.status).toBe("passed");
  });

  it("accepts a block wrapper with a vertical grid list on narrow screens", () => {
    const rules = evaluateSource({
      app: '<div className="mobile-list"><ul className="customer-list"><Button className="customer-list__item" /></ul></div>',
      styles: ".mobile-list { display: block; } .customer-list { display: grid; } .customer-list__item { min-height: auto; white-space: normal; } @media (max-width: 767px) { .desktop-table { display: none; } }",
    });

    expect(rules.find((rule) => rule.id === "layout.narrow")?.status).toBe("passed");
  });

  it("rejects negative margins that can overlap page regions", () => {
    const rules = evaluateSource({
      app: '<div className="detail-actions" />',
      styles: ".detail-actions { margin-top: calc(var(--dh-space-8) * -0.5); }",
    });

    const rule = rules.find((item) => item.id === "layout.grouping");
    expect(rule?.status).toBe("failed");
    expect(rule?.evidence.join(" ")).toContain(".detail-actions");
  });

  it("composes a responsive SearchField toolbar directly before the table", () => {
    const invalid = evaluateSource({
      app: '<Surface className="search-surface" variant="secondary"><TextField className="search-field" fullWidth><Label>会社名で検索</Label><Input variant="secondary" /></TextField></Surface>',
      styles: ".search-field { width: 100%; }",
    });
    const valid = evaluateSource({
      app: '<div className="collection-region"><Toolbar aria-label="顧客一覧の操作" className="customer-list-toolbar"><SearchField aria-label="企業名で検索" className="search-field"><SearchField.Group><SearchField.SearchIcon /><SearchField.Input placeholder="企業名で検索" /><SearchField.ClearButton aria-label="検索語をクリア" /></SearchField.Group></SearchField></Toolbar><div className="table-wrap"><Table.Root /></div></div>',
      styles: '.collection-region { display: grid; gap: var(--dh-space-3); margin-top: var(--dh-space-6); } .customer-list-toolbar { width: 100%; display: flex; justify-content: flex-end; } .search-field { width: min(100%, 16rem); } @media (max-width: 767px) { .search-field { width: 100%; } }',
    });

    expect(invalid.find((rule) => rule.id === "layout.collection-toolbar")?.status).toBe("failed");
    expect(valid.find((rule) => rule.id === "layout.collection-toolbar")?.status).toBe("passed");
  });

  it("TextFieldの検索は契約のaria-labelとplaceholderで判定する", () => {
    const toolbar = (search: string) =>
      `<div className="collection-region"><Toolbar aria-label="顧客一覧の操作" className="t"><SearchField aria-label="企業名で検索" className="s"><SearchField.Group><SearchField.SearchIcon /><SearchField.Input placeholder="企業名で検索" /><SearchField.ClearButton aria-label="検索語をクリア" /></SearchField.Group></SearchField></Toolbar>${search}<Table.Root /></div>`;
    const styles =
      ".collection-region { display: grid; gap: var(--dh-space-3); margin-top: var(--dh-space-6); } .t { width: 100%; display: flex; justify-content: flex-end; } .s { width: min(100%, 16rem); } @media (max-width: 767px) { .s { width: 100%; } }";
    const contractWording = evaluateSource({
      app: toolbar('<TextField><Label>企業名で検索</Label><Input /></TextField>'),
      styles,
    });
    const otherWording = evaluateSource({
      app: toolbar('<TextField><Label>担当者名で絞り込む</Label><Input /></TextField>'),
      styles,
    });

    expect(contractWording.find((rule) => rule.id === "layout.collection-toolbar")?.status).toBe("failed");
    expect(otherWording.find((rule) => rule.id === "layout.collection-toolbar")?.status).toBe("passed");
  });

  it("requires independent customer list and detail routes", () => {
    const combined = evaluateSource({
      app: `
        function CustomerListPage() { return <Link to="/customers/customer_northstar">顧客</Link>; }
        function CustomerDetailPage() { return <Link to="/customers">顧客一覧へ戻る</Link>; }
        <Route path="/customers" element={<CustomerListPage />} />
        <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
      `,
      styles: "",
    });
    const split = evaluateSource({
      app: `
        function CustomerListPage() { return <Link to="/customers/customer_northstar">顧客</Link>; }
        function CustomerDetailPage() { return <Link to="/customers">顧客一覧へ戻る</Link>; }
        <Route path="/customers" element={<CustomerListPage />} />
      `,
      styles: "",
    });

    expect(combined.find((rule) => rule.id === "navigation.customer-routes")?.status).toBe("passed");
    expect(split.find((rule) => rule.id === "navigation.customer-routes")?.status).toBe("failed");
  });

  it("uses links for navigation and buttons only for actions", () => {
    const invalid = evaluateSource({
      app: `
        <>
        <Table.Cell><Button onPress={() => openCustomer(customer.id)}>{customer.companyName}</Button></Table.Cell>
        <Button onPress={() => openCustomer(customer.id)}>顧客を確認</Button>
        <Button onPress={() => navigate("/customers")}>顧客一覧に戻る</Button>
        </>
      `,
      styles: "",
    });
    const valid = evaluateSource({
      app: `
        <>
        <Table.Cell><RouterLink className="link" to={\`/customers/\${customer.id}\`}>{customer.companyName}</RouterLink></Table.Cell>
        <div className="collection-list-mobile"><Card.Root><Card.Title><RouterLink className="collection-list-mobile__link" to={\`/customers/\${customer.id}\`}>{customer.companyName}</RouterLink></Card.Title></Card.Root></div>
        <RouterLink className="link" to="/customers">顧客一覧に戻る</RouterLink>
        <Button onPress={saveCustomer}>保存</Button>
        </>
      `,
      styles: "",
    });

    expect(invalid.find((rule) => rule.id === "navigation.link-semantics")?.status).toBe("failed");
    expect(valid.find((rule) => rule.id === "navigation.link-semantics")?.status).toBe("passed");
  });

  it("judges the mobile detail link by the contract container, not a hardcoded label", () => {
    const containerLinkWithoutLabel = evaluateSource({
      app: `
        <>
        <Table.Cell><Link className="table-link" href={\`/customers/\${customer.id}\`}>{customer.companyName}</Link></Table.Cell>
        <div className="collection-list-mobile"><Card.Root><Card.Title><Link className="table-link" href={\`/customers/\${customer.id}\`}>{customer.companyName}</Link></Card.Title></Card.Root></div>
        <Link className="back-link" href="/customers">顧客一覧に戻る</Link>
        <Button onPress={saveCustomer}>保存</Button>
        </>
      `,
      styles: "",
    });
    const labeledLinkOutsideContainer = evaluateSource({
      app: `
        <>
        <Table.Cell><Link className="table-link" href={\`/customers/\${customer.id}\`}>{customer.companyName}</Link></Table.Cell>
        <Link className="link" href={\`/customers/\${customer.id}\`}>顧客を確認</Link>
        <Link className="back-link" href="/customers">顧客一覧に戻る</Link>
        <Button onPress={saveCustomer}>保存</Button>
        </>
      `,
      styles: "",
    });

    expect(
      containerLinkWithoutLabel.find((rule) => rule.id === "navigation.link-semantics")?.status,
    ).toBe("passed");
    expect(
      labeledLinkOutsideContainer.find((rule) => rule.id === "navigation.link-semantics")?.status,
    ).toBe("failed");
  });

  it("places back navigation before the page heading with explicit group spacing", () => {
    const invalid = evaluateSource({
      app: `
        <PageHeading title="株式会社ノーススター" />
        <div className="detail-actions"><RouterLink className="link" to="/customers">顧客一覧に戻る</RouterLink></div>
        <section className="detail-grid" />
      `,
      styles: ".detail-actions { display: flex; }",
    });
    const valid = evaluateSource({
      app: `
        <div className="detail-page__heading">
          <nav aria-label="戻るナビゲーション">
            <RouterLink className="link" to="/customers">顧客一覧に戻る</RouterLink>
          </nav>
          <PageHeading title="株式会社ノーススター" />
        </div>
        <section className="detail-grid" />
      `,
      styles: ".detail-page__heading { display: grid; gap: var(--dh-space-4); margin-bottom: var(--dh-space-8); }",
    });

    expect(invalid.find((rule) => rule.id === "layout.back-navigation")?.status).toBe("failed");
    expect(valid.find((rule) => rule.id === "layout.back-navigation")?.status).toBe("passed");
  });

  it("requires separate customer summary and detail read models", () => {
    const rules = evaluateSource({
      app: "const list = listCustomerSummaries(); const detail = getCustomerDetail(customerId);",
      fixtures: "type CustomerSummary = {}; type CustomerDetail = {};",
      styles: "",
    });

    expect(rules.find((rule) => rule.id === "architecture.customer-read-models")?.status).toBe("passed");
  });

  it("accepts email type passed through a HeroUI field wrapper", () => {
    const rules = evaluateSource({
      app: `
        function CustomerTextField({ type }) { return <Input type={type} />; }
        <CustomerTextField type="email" />
      `,
      styles: "",
    });

    expect(rules.find((rule) => rule.id === "business.contact-email")?.status).toBe("passed");
  });

  it("accepts a Table that follows the canonical account-management contract", () => {
    const rules = evaluateSource({
      app: `
        const CUSTOMER_TABLE_COLUMNS = [
          { id: "companyName", label: "企業名", isRowHeader: true, width: "38%", minWidth: 240, align: "start" },
          { id: "contactName", label: "担当者", width: "22%", minWidth: 160, align: "start" },
          { id: "lastContactedAt", label: "最終対応日", width: "22%", minWidth: 160, align: "end", tabular: true },
          { id: "status", label: "ステータス", width: "18%", minWidth: 128, align: "start" },
        ] as const;
        <div className="table-region">
          <Table.Root className="customer-data-grid" variant="primary">
            <Table.ScrollContainer>
              <Table.Content>
                <Table.Header columns={CUSTOMER_TABLE_COLUMNS} />
                <Table.Body>
                  <Table.Row columns={CUSTOMER_TABLE_COLUMNS}>
                    {(column) => <Table.Cell className={column.tabular ? "tabular" : undefined} />}
                  </Table.Row>
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table.Root>
        </div>
      `,
      styles: ".table-region { overflow: hidden; } .customer-data-grid { border-radius: var(--dh-radius-base); } .tabular { font-variant-numeric: tabular-nums; }",
    });

    expect(rules.find((rule) => rule.id === "component.table.variant")?.status).toBe("passed");
    expect(rules.find((rule) => rule.id === "component.table.columns")?.status).toBe("passed");
    const surfaceRule = rules.find((rule) => rule.id === "component.table.surface");
    expect(surfaceRule?.status, surfaceRule?.evidence.join(" / ")).toBe("passed");
  });

  it("rejects secondary Table styling, contract drift, and an outer shadow", () => {
    const rules = evaluateSource({
      app: `
        const CUSTOMER_TABLE_COLUMNS = [
          { id: "companyName", label: "会社名", isRowHeader: true, width: "38%", minWidth: 240, align: "start" },
          { id: "contactName", label: "担当者", width: "22%", minWidth: 160, align: "start" },
          { id: "status", label: "ステータス", width: "18%", minWidth: 128, align: "start" },
          { id: "lastContactedAt", label: "最終対応日", width: "22%", minWidth: 160, align: "start" },
        ] as const;
        <div className="desktop-table">
          <Table.Root variant="secondary">
            <Table.Header columns={CUSTOMER_TABLE_COLUMNS} />
            <Table.Row columns={CUSTOMER_TABLE_COLUMNS} />
          </Table.Root>
        </div>
      `,
      styles: ".desktop-table { box-shadow: var(--dh-shadow-raised); }",
    });

    expect(rules.find((rule) => rule.id === "component.table.variant")?.status).toBe("failed");
    expect(rules.find((rule) => rule.id === "component.table.columns")?.status).toBe("failed");
    expect(rules.find((rule) => rule.id === "component.table.surface")?.status).toBe("failed");
  });

  it("accepts columns derived from the resolved Example and mapped by Header and Row", () => {
    const rules = evaluateSource({
      app: `
        const customerColumns = exampleContract.componentUsage["component.table"].columns.map((column) => ({ ...column }));
        <Table variant="primary">
          <Table.Header>{customerColumns.map((column) => <Table.Column id={column.id}>{column.label}</Table.Column>)}</Table.Header>
          <Table.Row>{customerColumns.map((column) => <Table.Cell className={column.tabular ? "tabular" : undefined} />)}</Table.Row>
        </Table>
      `,
      styles: ".tabular { font-variant-numeric: tabular-nums; }",
    });

    expect(rules.find((rule) => rule.id === "component.table.columns")?.status).toBe("passed");
  });

  it("rejects HeroUI variants outside the Atlas component contracts", () => {
    const rules = evaluateSource({
      app: '<><Button variant="link">保存</Button><Chip variant="default">利用中</Chip><Select variant="default" /></>',
      styles: '@import "../design/component-theme.css";',
    });

    const rule = rules.find((item) => item.id === "component.variants");
    expect(rule?.status).toBe("failed");
    expect(rule?.evidence.join(" ")).toContain("Button: link");
    expect(rule?.evidence.join(" ")).toContain("Chip: default");
    expect(rule?.evidence.join(" ")).toContain("Select: default");
  });

  it("accepts approved HeroUI variants and the shared radius adapter", () => {
    const rules = evaluateSource({
      app: '<><Button variant="outline">編集</Button><Chip variant="soft">利用中</Chip><Select variant="secondary" /></>',
      styles: '@import "../design/component-theme.css";',
      componentTheme: ":root { --radius: calc(var(--dh-radius-base) / 3); } .table-root--primary, .list-box-item { border-radius: var(--dh-radius-base); }",
    });

    expect(rules.find((item) => item.id === "component.variants")?.status).toBe("passed");
    expect(rules.find((item) => item.id === "token.radius")?.status).toBe("passed");
  });

  it("契約にないHeroUI importをcomponent.approvedで検出する", () => {
    const rules = evaluateSource({
      app: `
        import { Button, Spinner } from "@heroui/react";
        <Button variant="primary">保存</Button>
      `,
      styles: '@import "../design/component-theme.css";',
    });

    const rule = rules.find((item) => item.id === "component.approved");
    expect(rule?.status).toBe("failed");
    expect(rule?.evidence.join(" ")).toContain("Spinner");
  });

  it("契約内のHeroUI importだけならcomponent.approvedをpassedのままにする", () => {
    const rules = evaluateSource({
      app: `
        import { Button, Table, toast } from "@heroui/react";
        <Button variant="primary">保存</Button>
      `,
      styles: '@import "../design/component-theme.css";',
    });

    expect(rules.find((item) => item.id === "component.approved")?.status).toBe("passed");
  });

  it("型だけのimportとasの別名はimport許可リストの判定を惑わせない", () => {
    const rules = evaluateSource({
      app: `
        import type { ButtonProps } from "@heroui/react";
        import { type ChipProps, Button as AtlasButton } from "@heroui/react";
        <AtlasButton variant="primary">保存</AtlasButton>
      `,
      styles: '@import "../design/component-theme.css";',
    });

    expect(rules.find((item) => item.id === "component.approved")?.status).toBe("passed");
  });

  it("import許可セットはexampleが参照する契約のimplementationとanatomyの和集合", () => {
    expect([...approvedHeroUiImportNames].sort()).toEqual(
      [
        "Alert",
        "AlertDialog",
        "Button",
        "Card",
        "Chip",
        "Description",
        "Drawer",
        "FieldError",
        "Form",
        "Input",
        "Label",
        "Link",
        "ListBox",
        "SearchField",
        "Select",
        "Surface",
        "Table",
        "TextField",
        "Toast",
        "Toolbar",
        "toast",
      ].sort(),
    );
  });

  it("componentUsageが要求する部品がJSXに出ていればcomponent.usageをpassedにする", () => {
    const rules = evaluateSource({
      app: `
        <>
        <Toolbar.Root><Link href="/customers">顧客一覧</Link></Toolbar.Root>
        <Table.Root variant="primary" />
        <AlertDialog.Root><AlertDialog.Dialog /></AlertDialog.Root>
        </>
      `,
      styles: '@import "../design/component-theme.css";',
    });

    expect(rules.find((item) => item.id === "component.usage")?.status).toBe("passed");
  });

  it("importしただけでJSXに現れない部品はcomponent.usageをfailedにする", () => {
    const rules = evaluateSource({
      app: `
        import { AlertDialog, Link, Table, Toolbar } from "@heroui/react";
        <>
        <Toolbar.Root><Link href="/customers">顧客一覧</Link></Toolbar.Root>
        <Table.Root variant="primary" />
        </>
      `,
      styles: '@import "../design/component-theme.css";',
    });

    const rule = rules.find((item) => item.id === "component.usage");
    expect(rule?.status).toBe("failed");
    expect(rule?.evidence.join(" ")).toContain("AlertDialog");
  });

  it("未使用の部品名をcomponent.usageのevidenceに列挙する", () => {
    const rules = evaluateSource({
      app: '<Link href="/customers">顧客一覧</Link>',
      styles: '@import "../design/component-theme.css";',
    });

    const evidence = rules.find((item) => item.id === "component.usage")?.evidence.join(" ") ?? "";
    expect(evidence).toContain("Toolbar");
    expect(evidence).toContain("Table");
    expect(evidence).toContain("AlertDialog");
    expect(evidence).not.toContain("Link");
  });

  it("動的なvariantはcomponent.variantsをreviewにする", () => {
    const rules = evaluateSource({
      app: '<Button variant={isPrimary ? "primary" : "secondary"}>保存</Button>',
      styles: '@import "../design/component-theme.css";',
    });

    const rule = rules.find((item) => item.id === "component.variants");
    expect(rule?.status).toBe("review");
    expect(rule?.evidence.join(" ")).toContain("Button");
  });

  it("リテラルのvariantは動的判定の影響を受けない", () => {
    const rules = evaluateSource({
      app: '<Button variant="primary">保存</Button>',
      styles: '@import "../design/component-theme.css";',
    });

    expect(rules.find((item) => item.id === "component.variants")?.status).toBe("passed");
  });

  it("リテラルの契約違反は動的variantより優先してfailedにする", () => {
    const rules = evaluateSource({
      app: `
        <>
        <Button variant="link">保存</Button>
        <Chip variant={statusVariant}>利用中</Chip>
        </>
      `,
      styles: '@import "../design/component-theme.css";',
    });

    const rule = rules.find((item) => item.id === "component.variants");
    expect(rule?.status).toBe("failed");
    expect(rule?.evidence.join(" ")).toContain("Button: link");
    expect(rule?.evidence.join(" ")).toContain("Chip");
  });

  it("requires textValue when a ListBox item label is composed from JSX", () => {
    const invalid = evaluateSource({
      app: '<ListBox.Item id="active"><Label>利用中</Label></ListBox.Item>',
      styles: '@import "../design/component-theme.css";',
    });
    const valid = evaluateSource({
      app: '<ListBox.Item id="active" textValue="利用中"><Label>利用中</Label></ListBox.Item>',
      styles: '@import "../design/component-theme.css";',
    });

    expect(invalid.find((item) => item.id === "a11y.collection-item-name")?.status).toBe("failed");
    expect(valid.find((item) => item.id === "a11y.collection-item-name")?.status).toBe("passed");
  });
});

type Rect = { x: number; y: number; width: number; height: number };
type Probe = {
  found: boolean;
  visible?: boolean;
  rect?: Rect;
  styles?: Record<string, string>;
};
type ScreenMeasurement = {
  screenId: string;
  viewport: "desktop" | "mobile" | "tiny";
  width: number;
  height: number;
  state: string;
  route: string;
  scrollWidth?: number;
  error?: string;
  anchors: Record<string, Probe>;
  elements: Record<string, Probe>;
};
type Measurements = { screens: ScreenMeasurement[] };

function rect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}

function probe(overrides: Partial<Probe> = {}): Probe {
  return { found: true, visible: true, rect: rect(0, 0, 100, 100), styles: {}, ...overrides };
}

function buildMeasurements(): Measurements {
  return {
    screens: [
      {
        screenId: "collection",
        viewport: "desktop",
        width: 1440,
        height: 900,
        state: "default",
        route: "/customers",
        scrollWidth: 1440,
        anchors: {
          ".collection-region": probe({
            rect: rect(120, 160, 1200, 600),
            styles: { marginTop: "24px", rowGap: "12px" },
          }),
          ".collection-toolbar": probe({
            rect: rect(120, 160, 1200, 40),
            styles: { display: "flex", justifyContent: "flex-end" },
          }),
          ".search-field": probe({ rect: rect(1064, 160, 256, 40) }),
          ".collection-table-wrap": probe({ rect: rect(120, 212, 1200, 500) }),
          ".collection-list-mobile": probe({ visible: false, styles: { display: "none" } }),
        },
        elements: {
          table: probe({ rect: rect(120, 212, 1200, 500) }),
          toolbar: probe({ rect: rect(120, 160, 1200, 40) }),
          searchInput: probe({ rect: rect(1080, 168, 224, 24) }),
          heading: probe({ rect: rect(120, 64, 400, 40) }),
          backLink: { found: false },
          dialog: { found: false },
        },
      },
      {
        screenId: "collection",
        viewport: "mobile",
        width: 390,
        height: 844,
        state: "default",
        route: "/customers",
        scrollWidth: 390,
        anchors: {
          ".collection-region": probe({
            rect: rect(24, 140, 342, 600),
            styles: { marginTop: "24px", rowGap: "12px" },
          }),
          ".collection-toolbar": probe({ rect: rect(24, 140, 342, 40) }),
          ".search-field": probe({ rect: rect(24, 140, 342, 40) }),
          ".collection-table-wrap": probe({ visible: false, styles: { display: "none" } }),
          ".collection-list-mobile": probe({ rect: rect(24, 192, 342, 500) }),
        },
        elements: {
          table: probe({ visible: false }),
          toolbar: probe({ rect: rect(24, 140, 342, 40) }),
          searchInput: probe({ rect: rect(40, 148, 300, 24) }),
          heading: probe({ rect: rect(24, 64, 200, 32) }),
          backLink: { found: false },
          dialog: { found: false },
        },
      },
      {
        screenId: "collection",
        viewport: "tiny",
        width: 320,
        height: 568,
        state: "default",
        route: "/customers",
        scrollWidth: 320,
        anchors: {},
        elements: {},
      },
      {
        screenId: "detail",
        viewport: "desktop",
        width: 1440,
        height: 900,
        state: "default",
        route: "/customers/:customerId",
        scrollWidth: 1440,
        anchors: {
          ".detail-page__heading": probe({
            rect: rect(120, 64, 1200, 100),
            styles: { rowGap: "16px", marginBottom: "32px" },
          }),
          ".detail-grid": probe({ rect: rect(120, 196, 1200, 600), styles: { rowGap: "24px" } }),
          ".detail-content": probe({ rect: rect(144, 260, 600, 200), styles: { rowGap: "16px" } }),
        },
        elements: {
          table: { found: false },
          toolbar: { found: false },
          searchInput: { found: false },
          heading: probe({ rect: rect(120, 100, 400, 40) }),
          backLink: probe({ rect: rect(120, 64, 120, 20) }),
          dialog: { found: false },
        },
      },
      {
        screenId: "detail",
        viewport: "tiny",
        width: 320,
        height: 568,
        state: "default",
        route: "/customers/:customerId",
        scrollWidth: 320,
        anchors: {},
        elements: {},
      },
      {
        screenId: "detail",
        viewport: "desktop",
        width: 1440,
        height: 900,
        state: "drawer-open",
        route: "/customers/:customerId",
        scrollWidth: 1440,
        anchors: {
          ".drawer-form": probe({ rect: rect(1100, 120, 300, 500), styles: { rowGap: "24px" } }),
        },
        elements: {
          table: { found: false },
          toolbar: { found: false },
          searchInput: { found: false },
          heading: probe({ rect: rect(120, 100, 400, 40) }),
          backLink: probe({ rect: rect(120, 64, 120, 20) }),
          dialog: probe({ rect: rect(1060, 0, 380, 900) }),
        },
      },
    ],
  };
}

function screenAt(
  measurements: Measurements,
  screenId: string,
  viewport: ScreenMeasurement["viewport"],
  state = "default",
): ScreenMeasurement {
  const entry = measurements.screens.find(
    (screen) => screen.screenId === screenId && screen.viewport === viewport && screen.state === state,
  );
  if (!entry) throw new Error(`fixtureに ${screenId} ${viewport} ${state} がありません`);
  return entry;
}

describe("evaluateSource layout measurements", () => {
  const layoutRuleIds = ["layout.narrow", "layout.grouping", "layout.back-navigation", "layout.collection-toolbar"];

  function layoutResults(measurements: Measurements, styles = "") {
    const rules = evaluateSource({ app: "", styles, measurements });
    return new Map(rules.filter((rule) => layoutRuleIds.includes(rule.id)).map((rule) => [rule.id, rule]));
  }

  it("実測が契約値と一致すればlayout系4ルールをpassedにする", () => {
    const byId = layoutResults(buildMeasurements());
    for (const id of layoutRuleIds) {
      expect({ id, status: byId.get(id)?.status, evidence: byId.get(id)?.evidence }).toMatchObject({
        id,
        status: "passed",
      });
    }
  });

  it("320pxで横スクロールが発生したらlayout.narrowをfailedにする", () => {
    const measurements = buildMeasurements();
    screenAt(measurements, "collection", "tiny").scrollWidth = 480;
    const rule = layoutResults(measurements).get("layout.narrow");
    expect(rule?.status).toBe("failed");
    expect(rule?.evidence.join(" ")).toContain("480");
  });

  it("390pxでTableが表示されたままならlayout.narrowをfailedにする", () => {
    const measurements = buildMeasurements();
    screenAt(measurements, "collection", "mobile").elements.table = probe({ rect: rect(24, 192, 342, 500) });
    expect(layoutResults(measurements).get("layout.narrow")?.status).toBe("failed");
  });

  it("契約クラスがDOMになければlayout.back-navigationをfailedにする", () => {
    const measurements = buildMeasurements();
    screenAt(measurements, "detail", "desktop").anchors[".detail-page__heading"] = { found: false };
    const rule = layoutResults(measurements).get("layout.back-navigation");
    expect(rule?.status).toBe("failed");
    expect(rule?.evidence.join(" ")).toContain(".detail-page__heading");
  });

  it("戻るLinkと見出しのgapが契約値からずれたらlayout.back-navigationをfailedにする", () => {
    const measurements = buildMeasurements();
    screenAt(measurements, "detail", "desktop").anchors[".detail-page__heading"] = probe({
      rect: rect(120, 64, 1200, 100),
      styles: { rowGap: "24px", marginBottom: "32px" },
    });
    const rule = layoutResults(measurements).get("layout.back-navigation");
    expect(rule?.status).toBe("failed");
    expect(rule?.evidence.join(" ")).toContain("24");
  });

  it("Toolbarが末尾揃えでなければlayout.collection-toolbarをfailedにする", () => {
    const measurements = buildMeasurements();
    screenAt(measurements, "collection", "desktop").anchors[".collection-toolbar"] = probe({
      rect: rect(120, 160, 1200, 40),
      styles: { display: "flex", justifyContent: "flex-start" },
    });
    expect(layoutResults(measurements).get("layout.collection-toolbar")?.status).toBe("failed");
  });

  it("SearchFieldのデスクトップ幅が契約値からずれたらlayout.collection-toolbarをfailedにする", () => {
    const measurements = buildMeasurements();
    screenAt(measurements, "collection", "desktop").anchors[".search-field"] = probe({
      rect: rect(1000, 160, 320, 40),
    });
    const rule = layoutResults(measurements).get("layout.collection-toolbar");
    expect(rule?.status).toBe("failed");
    expect(rule?.evidence.join(" ")).toContain("320");
  });

  it("Drawerフォームのgapが契約値からずれたらlayout.groupingをfailedにする", () => {
    const measurements = buildMeasurements();
    screenAt(measurements, "detail", "desktop", "drawer-open").anchors[".drawer-form"] = probe({
      rect: rect(1100, 120, 300, 500),
      styles: { rowGap: "16px" },
    });
    const rule = layoutResults(measurements).get("layout.grouping");
    expect(rule?.status).toBe("failed");
    expect(rule?.evidence.join(" ")).toContain("16");
  });

  it("drawer-openの計測がなければlayout.groupingをfailedにする", () => {
    const measurements = buildMeasurements();
    measurements.screens = measurements.screens.filter((screen) => screen.state !== "drawer-open");
    expect(layoutResults(measurements).get("layout.grouping")?.status).toBe("failed");
  });

  it("実測がpassでもソースに負のmarginがあればlayout.groupingをfailedにする", () => {
    const rule = layoutResults(buildMeasurements(), ".stack { margin-top: -12px; }").get("layout.grouping");
    expect(rule?.status).toBe("failed");
  });

  it("計測エラーのscreenに依存するルールをfailedにする", () => {
    const measurements = buildMeasurements();
    const detail = screenAt(measurements, "detail", "desktop");
    detail.error = "net::ERR_CONNECTION_REFUSED";
    detail.anchors = {};
    detail.elements = {};
    const byId = layoutResults(measurements);
    expect(byId.get("layout.back-navigation")?.status).toBe("failed");
    expect(byId.get("layout.grouping")?.status).toBe("failed");
  });
});

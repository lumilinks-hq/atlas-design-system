# HeroUI API シート（Atlas 承認コンポーネント）

@heroui/react 3.2.4 の型定義から生成した。手で編集せず `node scripts/build-components-api.mjs` で作り直す。

API を調べる目的で `node_modules` を開かない。ここに載る prop で契約は満たせる。className、id、children、aria-* などの標準属性はどの部品でも使える。
Atlas が許す variant と size はここに書いたものだけで、HeroUI が持つ他の値は使えない。

## Alert
- import: `import { Alert } from "@heroui/react";`
- 下位: `Alert.Root`, `Alert.Indicator`, `Alert.Content`, `Alert.Title`, `Alert.Description`
- variant: `status` = default | accent | success | warning | danger（既定 default）
- size: なし（HeroUI に size prop は無い）

| prop | 型 | 用途 |
| --- | --- | --- |
| `status` | `"default" \| "accent" \| "success" \| "warning" \| "danger"` | Atlas の variant はこの prop に対応する |
| `className` | `string` | レイアウト調整のみ |

```tsx
<Alert status="danger">
  <Alert.Indicator />
  <Alert.Content>
    <Alert.Title>保存できませんでした</Alert.Title>
    <Alert.Description>通信に失敗しました。時間をおいて再試行してください。</Alert.Description>
  </Alert.Content>
</Alert>
```

- 色だけで状態を示さない。必ず文言を添える

## AlertDialog
- import: `import { AlertDialog } from "@heroui/react";`
- 下位: `AlertDialog.Root`, `AlertDialog.Trigger`, `AlertDialog.Backdrop`, `AlertDialog.Container`, `AlertDialog.Dialog`, `AlertDialog.Header`, `AlertDialog.Heading`, `AlertDialog.Body`, `AlertDialog.Footer`, `AlertDialog.Icon`, `AlertDialog.CloseTrigger`
- variant: AlertDialog.Backdrop の `variant` = opaque | blur | transparent（既定 opaque）
- size: AlertDialog.Container の `size` = xs | sm | md | lg | cover（既定 md）

| prop | 型 | 用途 |
| --- | --- | --- |
| `isOpen` | `boolean` | Root。制御する場合に渡す |
| `defaultOpen` | `boolean` | Root。非制御の初期状態 |
| `onOpenChange` | `(isOpen: boolean) => void` | Root。開閉の通知 |
| `isDismissable` | `boolean` | Backdrop。既定 false（明示操作を要求する） |
| `isKeyboardDismissDisabled` | `boolean` | Backdrop。既定 true |

```tsx
<AlertDialog isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
  <AlertDialog.Trigger><Button variant="danger-soft">顧客を削除</Button></AlertDialog.Trigger>
  <AlertDialog.Backdrop variant="blur"><AlertDialog.Container size="sm"><AlertDialog.Dialog>
    <AlertDialog.Header><AlertDialog.Icon status="danger" /><AlertDialog.Heading>顧客の削除</AlertDialog.Heading></AlertDialog.Header>
    <AlertDialog.Body>削除すると元に戻せません。</AlertDialog.Body>
    <AlertDialog.Footer>
      <Button variant="tertiary" onPress={() => setIsDeleteOpen(false)}>キャンセル</Button>
      <Button variant="danger" isPending={isDeleting} onPress={handleDelete}>削除する</Button>
    </AlertDialog.Footer>
  </AlertDialog.Dialog></AlertDialog.Container></AlertDialog.Backdrop>
</AlertDialog>
```

- variant は Backdrop、size は Container。起点は Trigger の内側に Button を置き、Footer は素の Button と onPress で閉じる

## Button
- import: `import { Button } from "@heroui/react";`
- 下位: `Button.Root`
- variant: `variant` = primary | secondary | tertiary | outline | ghost | danger | danger-soft（既定 primary）
- size: `size` = sm | md | lg（既定 md）

| prop | 型 | 用途 |
| --- | --- | --- |
| `onPress` | `(event: PressEvent) => void` | 押下。onClick ではなくこれを使う |
| `type` | `"button" \| "submit" \| "reset"` | Form 送信は type="submit" |
| `form` | `string` | Form の外に置いた送信ボタンを form の id で結ぶ |
| `isDisabled` | `boolean` | 無効化 |
| `isPending` | `boolean` | 非同期処理中。二重送信を止める |
| `aria-label` | `string` | アイコンだけのとき必須 |
| `isIconOnly` | `boolean` | アイコンだけの見た目 |
| `fullWidth` | `boolean` | 横幅いっぱい |

```tsx
<Button variant="primary" onPress={handleSave}>保存する</Button>
```

- 主要操作は 1 つの領域に 1 つまで
- 画面遷移は Button ではなく Link

## Card
- import: `import { Card } from "@heroui/react";`
- 下位: `Card.Root`, `Card.Header`, `Card.Title`, `Card.Description`, `Card.Content`, `Card.Footer`
- variant: `variant` = default | secondary | tertiary | transparent（既定 default）
- size: なし（HeroUI に size prop は無い）

| prop | 型 | 用途 |
| --- | --- | --- |
| `variant` | `"default" \| "secondary" \| "tertiary" \| "transparent"` | 面の役割 |

```tsx
<Card variant="default">
  <Card.Header><Card.Title>連絡先</Card.Title></Card.Header>
  <Card.Content>...</Card.Content>
</Card>
```

- 外側に独自の背景、角丸、影を重ねない

## Chip
- import: `import { Chip } from "@heroui/react";`
- 下位: `Chip.Root`, `Chip.Label`
- variant: `variant` = primary | secondary | tertiary | soft（既定 secondary）
- size: `size` = sm | md | lg（既定 md）

| prop | 型 | 用途 |
| --- | --- | --- |
| `variant` | `"primary" \| "secondary" \| "tertiary" \| "soft"` | 見た目 |
| `size` | `"sm" \| "md" \| "lg"` | 大きさ |

```tsx
<Chip variant="soft" size="sm"><Chip.Label>商談中</Chip.Label></Chip>
```

- 状態を色だけで示さない。ラベル文言を必ず持たせる

## Drawer
- import: `import { Drawer } from "@heroui/react";`
- 下位: `Drawer.Root`, `Drawer.Trigger`, `Drawer.Backdrop`, `Drawer.Content`, `Drawer.Dialog`, `Drawer.Header`, `Drawer.Heading`, `Drawer.Body`, `Drawer.Footer`, `Drawer.Handle`, `Drawer.CloseTrigger`
- variant: Drawer.Backdrop の `variant` = opaque | blur | transparent（既定 opaque）
- size: なし（HeroUI に size prop は無い。幅は Atlas 契約の layout.width を className で当てる）

| prop | 型 | 用途 |
| --- | --- | --- |
| `isOpen` | `boolean` | Root。制御する場合に渡す |
| `onOpenChange` | `(isOpen: boolean) => void` | Root。開閉の通知 |
| `isDismissable` | `boolean` | Backdrop。既定 true |
| `placement` | `"top" \| "bottom" \| "left" \| "right"` | Content |

```tsx
<Drawer isOpen={isOpen} onOpenChange={setIsOpen}>
  <Drawer.Trigger className={primaryButtonClass}>顧客を追加</Drawer.Trigger>
  <Drawer.Backdrop variant="blur"><Drawer.Content placement="right"><Drawer.Dialog>
    <Drawer.CloseTrigger aria-label="閉じる" /><Form validationBehavior="aria" onSubmit={handleSubmit}>
      <Drawer.Header><Drawer.Heading>顧客を追加</Drawer.Heading></Drawer.Header><Drawer.Body>...</Drawer.Body>
      <Drawer.Footer>
        <Button variant="tertiary" onPress={() => setIsOpen(false)}>キャンセル</Button>
        <Button type="submit" variant="primary" isPending={isSaving}>保存する</Button>
      </Drawer.Footer></Form>
  </Drawer.Dialog></Drawer.Content></Drawer.Backdrop>
</Drawer>
```

- Drawer.Trigger は必須。内側に Button を入れず、自前の主要 Button と同じ見た目の className とラベルを Trigger へ直接置く
- Drawer.CloseTrigger は aria-label だけのアイコン枠。表示テキストを入れない

## Form
- import: `import { Form } from "@heroui/react";`
- 下位: `Form.Root`
- variant: なし（見た目の variant を持たない）
- size: なし（HeroUI に size prop は無い）

| prop | 型 | 用途 |
| --- | --- | --- |
| `onSubmit` | `(event: FormEvent<HTMLFormElement>) => void` | 送信。event.preventDefault() を呼ぶ |
| `validationBehavior` | `"native" \| "aria"` | aria にするとブラウザ標準の吹き出しを止めて画面内に出せる |
| `id` | `string` | 外に置いた送信ボタンと form={id} で結ぶ |

```tsx
<Form id="customer-form" validationBehavior="aria" onSubmit={handleSubmit}>
  <TextField name="companyName" isRequired>...</TextField>
</Form>
```

- エラーは各フィールドの FieldError に出し、送信ボタンの近くに要約も置く

## Link
- import: `import { Link } from "@heroui/react";`
- 下位: `Link.Root`, `Link.Icon`
- variant: なし（見た目の variant を持たない）
- size: なし（HeroUI に size prop は無い）

| prop | 型 | 用途 |
| --- | --- | --- |
| `href` | `string` | 遷移先。react-router では useNavigate ではなくこれを使う |
| `onPress` | `(event: PressEvent) => void` | 押下 |
| `isDisabled` | `boolean` | 無効化 |

```tsx
<Link href="#/customers">顧客一覧へ戻る</Link>
```

- 画面遷移は Link。Button で遷移させない

## SearchField
- import: `import { SearchField } from "@heroui/react";`
- 下位: `SearchField.Root`, `SearchField.Group`, `SearchField.Input`, `SearchField.SearchIcon`, `SearchField.ClearButton`
- variant: `variant` = primary | secondary（既定 primary）
- size: なし（HeroUI に size prop は無い）

| prop | 型 | 用途 |
| --- | --- | --- |
| `value` | `string` | 制御する場合の値 |
| `onChange` | `(value: string) => void` | 入力。event ではなく値が来る |
| `aria-label` | `string` | 見出しラベルを置かないとき必須 |
| `fullWidth` | `boolean` | 横幅いっぱい |

```tsx
<SearchField aria-label="企業名で検索" value={query} onChange={setQuery}>
  <SearchField.Group>
    <SearchField.SearchIcon />
    <SearchField.Input placeholder="企業名で検索" />
    <SearchField.ClearButton />
  </SearchField.Group>
</SearchField>
```

- placeholder はラベルの代わりにしない

## Select
- import: `import { Select } from "@heroui/react";`
- 下位: `Select.Root`, `Select.Trigger`, `Select.Value`, `Select.Indicator`, `Select.Popover`
- variant: `variant` = primary | secondary（既定 primary）
- size: なし（HeroUI に size prop は無い）

| prop | 型 | 用途 |
| --- | --- | --- |
| `selectedKey` | `Key \| null` | 制御する場合の選択値 |
| `onSelectionChange` | `(key: Key \| null) => void` | 選択の変更 |
| `items` | `Iterable<T>` | 動的な選択肢 |
| `isRequired` | `boolean` | 必須 |
| `isInvalid` | `boolean` | エラー表示 |
| `placeholder` | `string` | 未選択時の表示 |

```tsx
<Select selectedKey={status} onSelectionChange={setStatus}>
  <Label>ステータス</Label>
  <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
  <Select.Popover>
    <ListBox>{options.map((o) => <ListBoxItem key={o} id={o}>{o}</ListBoxItem>)}</ListBox>
  </Select.Popover>
</Select>
```

- 選択肢は ListBox と ListBoxItem で並べる

## Surface
- import: `import { Surface } from "@heroui/react";`
- 下位: `Surface.Root`
- variant: `variant` = default | secondary | tertiary | transparent（既定 default）
- size: なし（HeroUI に size prop は無い）

| prop | 型 | 用途 |
| --- | --- | --- |
| `variant` | `"default" \| "secondary" \| "tertiary" \| "transparent"` | 面の役割 |

```tsx
<Surface variant="secondary">...</Surface>
```

- 面の重なりは Surface が持つ。div に背景色を直書きしない

## Table
- import: `import { Table } from "@heroui/react";`
- 下位: `Table.Root`, `Table.ScrollContainer`, `Table.Content`, `Table.Header`, `Table.Column`, `Table.ColumnResizer`, `Table.Body`, `Table.Row`, `Table.Cell`, `Table.Footer`, `Table.LoadMore`, `Table.LoadMoreContent`, `Table.ResizableContainer`, `Table.SortableColumnHeader`, `Table.Collection`
- variant: `variant` = primary（既定 primary）
- size: なし（HeroUI に size prop は無い）

| prop | 型 | 用途 |
| --- | --- | --- |
| `isRowHeader` | `boolean` | Column。行の識別子になる列に付ける |
| `id` | `Key` | Column と Row の識別子 |
| `width` | `string \| number` | Column の幅 |
| `items` | `Iterable<T>` | Body。行データ |
| `renderEmptyState` | `() => ReactNode` | Body。空状態 |
| `href` | `string` | Row。行全体を遷移させる場合 |
| `aria-label` | `string` | Content。表の名前 |

```tsx
<Table variant="primary">
  <Table.ScrollContainer><Table.Content aria-label="顧客一覧">
    <Table.Header><Table.Column id="companyName" isRowHeader width="38%">企業名</Table.Column></Table.Header>
    <Table.Body items={customers} renderEmptyState={() => <p>顧客がまだありません</p>}>
      {(customer) => <Table.Row id={customer.id}><Table.Cell><Link to={`/customers/${customer.id}`}>{customer.companyName}</Link></Table.Cell></Table.Row>}
    </Table.Body>
  </Table.Content></Table.ScrollContainer>
</Table>
```

- Root、ScrollContainer、Content の順に組む。外側に背景、角丸、影を重ねない
- オブジェクト名の Cell は Link にする。Cell へ直接書く（別関数へ切り出すと lint が見つけられない）

## TextField
- import: `import { TextField } from "@heroui/react";`
- 下位: `TextField.Root`
- variant: `variant` = primary | secondary（既定 primary）
- size: なし（HeroUI に size prop は無い）

| prop | 型 | 用途 |
| --- | --- | --- |
| `value` | `string` | 制御する場合の値 |
| `onChange` | `(value: string) => void` | 入力。event ではなく値が来る |
| `name` | `string` | Form 送信時のキー |
| `type` | `"text" \| "email" \| "tel" \| "url" \| "password"` | Input ではなく TextField に渡す |
| `isRequired` | `boolean` | 必須 |
| `isInvalid` | `boolean` | エラー表示 |
| `validate` | `(value: string) => string \| null` | 個別の検証 |

```tsx
<TextField name="email" type="email" isRequired isInvalid={Boolean(error)}>
  <Label>メールアドレス</Label>
  <Input />
  <FieldError>{error}</FieldError>
</TextField>
```

- Label、Input、Description、FieldError を子として組む。placeholder をラベルの代わりにしない

## Toast
- import: `import { Toast } from "@heroui/react";`
- 下位: `Toast.Provider`, `Toast.Content`, `Toast.Indicator`, `Toast.Title`, `Toast.Description`, `Toast.Action`, `Toast.CloseButton`, `Toast.ActionButton`, `Toast.Queue`, `Toast.toast`
- variant: `variant` = default | accent | success | warning | danger（既定 default）
- size: なし（HeroUI に size prop は無い）

| prop | 型 | 用途 |
| --- | --- | --- |
| `placement` | `string` | Provider。表示位置 |
| `maxVisibleToasts` | `number` | Provider。同時表示数 |
| `variant` | `"default" \| "accent" \| "success" \| "warning" \| "danger"` | 個々の Toast |

```tsx
import { Toast, toast } from "@heroui/react";
// アプリの外側に一度だけ置く
<Toast.Provider />
// 呼び出し側
toast.success("顧客を保存しました");
toast.danger("保存できませんでした");
```

- Toast.Provider を置かないと toast() は何も出さない
- 成否は文言で伝える。色だけに頼らない

## Toolbar
- import: `import { Toolbar } from "@heroui/react";`
- 下位: `Toolbar.Root`
- variant: default → `isAttached={false}` / attached → `isAttached={true}`（既定 default）
- size: なし（HeroUI に size prop は無い）

| prop | 型 | 用途 |
| --- | --- | --- |
| `isAttached` | `boolean` | Atlas の attached variant。既定（default）は付けない |
| `orientation` | `"horizontal" \| "vertical"` | 並び |
| `aria-label` | `string` | ツールバーの名前 |

```tsx
<Toolbar aria-label="顧客一覧の操作">
  <SearchField aria-label="企業名で検索">...</SearchField>
</Toolbar>
```

- Atlas の variant default は isAttached を付けない状態を指す

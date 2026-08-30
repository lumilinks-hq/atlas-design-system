import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertDialog,
  Button,
  Card,
  Chip,
  Description,
  Drawer,
  FieldError,
  Form,
  Label,
  ListBox,
  NumberField,
  Select,
  Surface,
  Table,
  useOverlayState,
} from "@heroui/react";
import { companyFixture, currentUserFixture, type UserRole } from "./fixtures";

type DemoState =
  | "default"
  | "drawer-open"
  | "invalid-seat-count"
  | "unauthorized"
  | "loading"
  | "success"
  | "failure";

type PlanId = "starter" | "business" | "enterprise";

type ContractDraft = {
  plan: PlanId;
  seats: number;
};

type BannerState = {
  status: "accent" | "success" | "warning" | "danger";
  title: string;
  description: string;
} | null;

type DemoPreset = {
  role: UserRole;
  contract: ContractDraft;
  draft: ContractDraft;
  banner: BannerState;
  isSaving: boolean;
};

const demoStates: DemoState[] = [
  "default",
  "drawer-open",
  "invalid-seat-count",
  "unauthorized",
  "loading",
  "success",
  "failure",
];

const plans: Array<{ id: PlanId; label: string }> = [
  { id: "starter", label: "Starter" },
  { id: "business", label: "Business" },
  { id: "enterprise", label: "Enterprise" },
];

const defaultDraft: ContractDraft = { plan: "business", seats: companyFixture.seats };
const successDraft: ContractDraft = { plan: "enterprise", seats: 60 };
const failureDraft: ContractDraft = { plan: "enterprise", seats: 48 };

function formatDateRange(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `${formatter.format(new Date(start))}から${formatter.format(new Date(end))}`;
}

function getStateFromQuery() {
  if (typeof window === "undefined") {
    return "default" satisfies DemoState;
  }

  const value = new URLSearchParams(window.location.search).get("state");
  return demoStates.includes(value as DemoState) ? (value as DemoState) : "default";
}

function getDemoPreset(state: DemoState): DemoPreset {
  switch (state) {
    case "invalid-seat-count":
      return {
        role: currentUserFixture.role,
        contract: defaultDraft,
        draft: { plan: "business", seats: 41 },
        banner: null,
        isSaving: false,
      };
    case "unauthorized":
      return {
        role: "viewer",
        contract: defaultDraft,
        draft: defaultDraft,
        banner: {
          status: "warning",
          title: "CS Viewerは契約を変更できません",
          description: "閲覧のみ可能です。契約変更が必要な場合はCS Managerへ依頼してください。",
        },
        isSaving: false,
      };
    case "loading":
      return {
        role: currentUserFixture.role,
        contract: defaultDraft,
        draft: failureDraft,
        banner: {
          status: "accent",
          title: "契約変更を保存しています",
          description: "保存完了まで、内容の変更と二重送信を停止しています。",
        },
        isSaving: true,
      };
    case "success":
      return {
        role: currentUserFixture.role,
        contract: successDraft,
        draft: successDraft,
        banner: {
          status: "success",
          title: "契約内容を更新しました",
          description: "プランをEnterprise、契約席数を60席へ反映済みです。",
        },
        isSaving: false,
      };
    case "failure":
      return {
        role: currentUserFixture.role,
        contract: defaultDraft,
        draft: failureDraft,
        banner: {
          status: "danger",
          title: "契約内容を更新できませんでした",
          description: "入力内容は保持しています。内容を確認して再試行してください。",
        },
        isSaving: false,
      };
    case "drawer-open":
    case "default":
    default:
      return {
        role: currentUserFixture.role,
        contract: defaultDraft,
        draft: defaultDraft,
        banner: null,
        isSaving: false,
      };
  }
}

function getPlanLabel(planId: PlanId) {
  return plans.find((plan) => plan.id === planId)?.label ?? planId;
}

export function App() {
  const [demoState, setDemoState] = useState<DemoState>(() => getStateFromQuery());
  const initialPreset = useMemo(() => getDemoPreset(demoState), [demoState]);
  const [role, setRole] = useState<UserRole>(initialPreset.role);
  const [contract, setContract] = useState<ContractDraft>(initialPreset.contract);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(initialPreset.draft.plan);
  const [seatCount, setSeatCount] = useState(initialPreset.draft.seats);
  const [banner, setBanner] = useState<BannerState>(initialPreset.banner);
  const [isSaving, setIsSaving] = useState(initialPreset.isSaving);
  const saveTimerRef = useRef<number | null>(null);

  const isDrawerOpen = ["drawer-open", "invalid-seat-count", "loading", "failure"].includes(demoState);
  const drawerState = useOverlayState({
    isOpen: isDrawerOpen,
    onOpenChange: (nextOpen) => {
      if (nextOpen) {
        if (!canEdit || isSaving) {
          return;
        }

        setSelectedPlan(contract.plan);
        setSeatCount(contract.seats);
        setBanner(null);
        setDemoState("drawer-open");
        return;
      }

      if (!isSaving) {
        setSelectedPlan(contract.plan);
        setSeatCount(contract.seats);
        setDemoState("default");
      }
    },
  });

  useEffect(() => {
    const preset = getDemoPreset(demoState);
    setRole(preset.role);
    setContract(preset.contract);
    setSelectedPlan(preset.draft.plan);
    setSeatCount(preset.draft.seats);
    setBanner(preset.banner);
    setIsSaving(preset.isSaving);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("state", demoState);
      window.history.replaceState({}, "", url);
    }
  }, [demoState]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const usedSeats = companyFixture.usedSeats;
  const remainingSeats = contract.seats - usedSeats;
  const isSeatCountInvalid = !Number.isInteger(seatCount) || seatCount < usedSeats;
  const canEdit = role === "manager";
  const pendingDraft: ContractDraft = {
    plan: selectedPlan,
    seats: seatCount,
  };
  const planLabel = getPlanLabel(contract.plan);
  const pendingPlanLabel = getPlanLabel(pendingDraft.plan);

  const applyStatePreset = (nextState: DemoState) => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    setDemoState(nextState);
  };

  const closeEditor = () => {
    if (isSaving) {
      return;
    }

    setSelectedPlan(contract.plan);
    setSeatCount(contract.seats);
    setDemoState("default");
  };

  const handleSeatCountChange = (value: number) => {
    setSeatCount(value);

    if (value < usedSeats) {
      setDemoState("invalid-seat-count");
      return;
    }

    if (demoState === "invalid-seat-count") {
      setDemoState("drawer-open");
    }
  };

  const handleConfirmSave = () => {
    if (isSaving || isSeatCountInvalid) {
      return;
    }

    setIsSaving(true);
    setBanner({
      status: "accent",
      title: "契約変更を保存しています",
      description: "保存完了まで、内容の変更と二重送信を停止しています。",
    });
    setDemoState("loading");

    saveTimerRef.current = window.setTimeout(() => {
      const shouldFail = pendingDraft.seats === failureDraft.seats || demoState === "failure";

      if (shouldFail) {
        setIsSaving(false);
        setBanner({
          status: "danger",
          title: "契約内容を更新できませんでした",
          description: "入力内容は保持しています。内容を確認して再試行してください。",
        });
        setDemoState("failure");
        return;
      }

      setContract(pendingDraft);
      setIsSaving(false);
      setBanner({
        status: "success",
        title: "契約内容を更新しました",
        description: `プランを${pendingPlanLabel}、契約席数を${pendingDraft.seats}席へ反映しました。`,
      });
      setDemoState("success");
    }, 700);
  };

  return (
    <main className="page-shell">
      <Surface className="page-surface">
        <section className="page-header">
          <div className="page-header__title">
            <p className="eyebrow">Customer Contract Management</p>
            <h1>{companyFixture.name}</h1>
            <div className="status-row">
              <Chip color="success" size="md" variant="soft">
                契約状態: {companyFixture.status}
              </Chip>
              <Chip color={canEdit ? "accent" : "warning"} size="md" variant="soft">
                利用者権限: {canEdit ? "CS Manager" : "CS Viewer"}
              </Chip>
            </div>
          </div>
          <div className="page-header__actions">
            <div className="state-switcher" aria-label="画面状態の切り替え">
              {demoStates.map((state) => (
                <Button
                  key={state}
                  size="sm"
                  variant={demoState === state ? "primary" : "secondary"}
                  onPress={() => applyStatePreset(state)}
                >
                  {state}
                </Button>
              ))}
            </div>
            {canEdit ? (
              <Drawer.Root state={drawerState}>
                <Drawer.Trigger className="button button--md button--primary">
                  契約を変更
                </Drawer.Trigger>
                <Drawer.Backdrop isDismissable={!isSaving}>
                  <Drawer.Content placement="right">
                    <Drawer.Dialog aria-label="契約変更">
                      <Drawer.Header className="drawer-header">
                        <Drawer.Heading>契約変更</Drawer.Heading>
                        <Button
                          size="sm"
                          variant="secondary"
                          aria-label="契約変更を閉じる"
                          isDisabled={isSaving}
                          onPress={closeEditor}
                        >
                          閉じる
                        </Button>
                      </Drawer.Header>

                      <Drawer.Body className="drawer-body">
                        <Form className="contract-form">
                          <div className="field-block">
                            <Select
                              aria-label="プラン"
                              selectedKey={selectedPlan}
                              isDisabled={!canEdit || isSaving}
                              onSelectionChange={(key) => setSelectedPlan(String(key) as PlanId)}
                            >
                              <Label>プラン</Label>
                              <Select.Trigger>
                                <Select.Value />
                                <Select.Indicator />
                              </Select.Trigger>
                              <Description>現在の契約条件に応じてプランを更新します。</Description>
                              <Select.Popover>
                                <ListBox items={plans}>
                                  {(item) => <ListBox.Item id={item.id}>{item.label}</ListBox.Item>}
                                </ListBox>
                              </Select.Popover>
                            </Select>
                          </div>

                          <div className="field-block">
                            <NumberField
                              aria-label="契約席数"
                              step={1}
                              value={seatCount}
                              isDisabled={!canEdit || isSaving}
                              isInvalid={isSeatCountInvalid}
                              onChange={handleSeatCountChange}
                            >
                              <Label>契約席数</Label>
                              <NumberField.Group>
                                <NumberField.DecrementButton>-</NumberField.DecrementButton>
                                <NumberField.Input />
                                <NumberField.IncrementButton>+</NumberField.IncrementButton>
                              </NumberField.Group>
                              <Description>
                                利用席数42席以上で設定してください。42未満は保存できません。
                              </Description>
                              <FieldError>
                                契約席数は現在の利用席数42席以上にしてください。42席以上へ戻すと保存できます。
                              </FieldError>
                              {isSeatCountInvalid ? (
                                <p className="field-error" role="alert">
                                  契約席数は現在の利用席数42席以上にしてください。42席以上へ戻すと保存できます。
                                </p>
                              ) : null}
                            </NumberField>
                          </div>
                        </Form>

                        <Surface className="review-surface">
                          <h2 className="review-title">変更内容の確認</h2>
                          <p className="review-copy">保存前に変更前後を確認します。</p>
                          <dl className="confirm-grid">
                            <div>
                              <dt>プラン</dt>
                              <dd>
                                {planLabel} → {pendingPlanLabel}
                              </dd>
                            </div>
                            <div>
                              <dt>契約席数</dt>
                              <dd>
                                {contract.seats}席 → {pendingDraft.seats}席
                              </dd>
                            </div>
                            <div>
                              <dt>利用席数</dt>
                              <dd>{usedSeats}席</dd>
                            </div>
                            <div>
                              <dt>保存後の残り席数</dt>
                              <dd>{pendingDraft.seats - usedSeats}席</dd>
                            </div>
                          </dl>
                        </Surface>

                        {banner?.status === "danger" ? (
                          <Alert status="danger">
                            <Alert.Content>
                              <Alert.Title>{banner.title}</Alert.Title>
                              <Alert.Description>
                                {banner.description} 契約席数を42席以上へ保ち、内容を確認して再試行してください。
                              </Alert.Description>
                            </Alert.Content>
                          </Alert>
                        ) : null}
                      </Drawer.Body>

                      <Drawer.Footer className="drawer-footer">
                        <Button variant="secondary" isDisabled={isSaving} onPress={closeEditor}>
                          キャンセル
                        </Button>
                        {!canEdit || isSaving || isSeatCountInvalid ? (
                          <Button variant="primary" isDisabled>
                            保存内容を確認
                          </Button>
                        ) : (
                          <AlertDialog.Root>
                            <AlertDialog.Trigger className="button button--md button--primary">
                              保存内容を確認
                            </AlertDialog.Trigger>
                            <AlertDialog.Backdrop>
                              <AlertDialog.Container size="md">
                                <AlertDialog.Dialog>
                                  <AlertDialog.Header>
                                    <AlertDialog.Heading>契約変更を確定しますか</AlertDialog.Heading>
                                  </AlertDialog.Header>
                                  <AlertDialog.Body>
                                    <p className="confirm-copy">
                                      変更前後を確認したうえで保存します。保存対象は契約プランと契約席数です。
                                    </p>
                                    <dl className="confirm-grid">
                                      <div>
                                        <dt>プラン</dt>
                                        <dd>
                                          {planLabel} → {pendingPlanLabel}
                                        </dd>
                                      </div>
                                      <div>
                                        <dt>契約席数</dt>
                                        <dd>
                                          {contract.seats}席 → {pendingDraft.seats}席
                                        </dd>
                                      </div>
                                    </dl>
                                  </AlertDialog.Body>
                                  <AlertDialog.Footer className="confirm-actions">
                                    <AlertDialog.CloseTrigger>戻る</AlertDialog.CloseTrigger>
                                    <AlertDialog.CloseTrigger isDisabled={isSaving} onPress={handleConfirmSave}>
                                      {isSaving ? "保存中..." : "保存する"}
                                    </AlertDialog.CloseTrigger>
                                  </AlertDialog.Footer>
                                </AlertDialog.Dialog>
                              </AlertDialog.Container>
                            </AlertDialog.Backdrop>
                          </AlertDialog.Root>
                        )}
                      </Drawer.Footer>
                    </Drawer.Dialog>
                  </Drawer.Content>
                </Drawer.Backdrop>
              </Drawer.Root>
            ) : (
              <p className="permission-note">
                CS Viewerは契約変更できません。契約変更が必要な場合はCS Managerへ依頼してください。
              </p>
            )}
          </div>
        </section>

        {banner ? (
          <Alert status={banner.status}>
            <Alert.Content>
              <Alert.Title>{banner.title}</Alert.Title>
              <Alert.Description>{banner.description}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <section className="content-grid">
          <Card>
            <Card.Header>
              <Card.Title>企業概要</Card.Title>
              <Card.Description>顧客企業の基本情報と契約期間です。</Card.Description>
            </Card.Header>
            <Card.Content>
              <dl className="details-grid">
                <div>
                  <dt>企業名</dt>
                  <dd>{companyFixture.name}</dd>
                </div>
                <div>
                  <dt>契約期間</dt>
                  <dd>{formatDateRange(companyFixture.contractStart, companyFixture.contractEnd)}</dd>
                </div>
                <div>
                  <dt>担当者</dt>
                  <dd>{currentUserFixture.name}</dd>
                </div>
                <div>
                  <dt>現在プラン</dt>
                  <dd>{planLabel}</dd>
                </div>
              </dl>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>契約と利用状況</Card.Title>
              <Card.Description>利用席数を下回る契約席数には変更できません。</Card.Description>
            </Card.Header>
            <Card.Content className="metric-grid">
              <Surface className="metric-card">
                <span>契約席数</span>
                <strong>{contract.seats}</strong>
                <small>変更可能</small>
              </Surface>
              <Surface className="metric-card">
                <span>利用席数</span>
                <strong>{usedSeats}</strong>
                <small>現在利用中</small>
              </Surface>
              <Surface className="metric-card">
                <span>残り席数</span>
                <strong>{remainingSeats}</strong>
                <small>追加利用可能</small>
              </Surface>
            </Card.Content>
          </Card>
        </section>

        <Card>
          <Card.Header>
            <Card.Title>メンバー一覧</Card.Title>
            <Card.Description>氏名、メールアドレス、ロール、状態を確認できます。</Card.Description>
          </Card.Header>
          <Card.Content>
            <Table.Root aria-label="メンバー一覧">
              <Table.ScrollContainer>
                <Table.Content aria-label="メンバー一覧">
                  <Table.Header>
                    <Table.Column isRowHeader>氏名</Table.Column>
                    <Table.Column>メールアドレス</Table.Column>
                    <Table.Column>ロール</Table.Column>
                    <Table.Column>状態</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {companyFixture.members.map((member) => (
                      <Table.Row key={member.id} id={member.id}>
                        <Table.Cell>{member.name}</Table.Cell>
                        <Table.Cell>{member.email}</Table.Cell>
                        <Table.Cell>{member.role}</Table.Cell>
                        <Table.Cell>
                          <Chip color={member.status === "利用中" ? "success" : "warning"} size="sm" variant="soft">
                            {member.status}
                          </Chip>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table.Root>
          </Card.Content>
        </Card>
      </Surface>

    </main>
  );
}

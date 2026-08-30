import { useEffect, useId, useState } from "react";
import { Alert, Button, Card, Chip, Spinner } from "@heroui/react";
import { availablePlans, companyFixture, currentUserFixture, type PlanName, type UserRole } from "./fixtures";

type DemoState = "default" | "drawer-open" | "invalid-seat-count" | "unauthorized" | "loading" | "success" | "failure";
type SaveStatus = "idle" | "loading" | "success" | "failure";
type CompanyState = {
  plan: PlanName;
  seats: number;
};
type DraftState = {
  plan: PlanName;
  seats: string;
};
type PresetState = {
  userRole: UserRole;
  company: CompanyState;
  draft: DraftState;
  drawerOpen: boolean;
  confirming: boolean;
  saveStatus: SaveStatus;
  saveMessage: string;
};

const demoStates: DemoState[] = [
  "default",
  "drawer-open",
  "invalid-seat-count",
  "unauthorized",
  "loading",
  "success",
  "failure"
];

const saveDelayMs = 700;

function getStateFromQuery(): DemoState {
  if (typeof window === "undefined") {
    return "default";
  }

  const state = new URLSearchParams(window.location.search).get("state");
  return demoStates.includes(state as DemoState) ? (state as DemoState) : "default";
}

function formatContractPeriod(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);

  return `${startDate.getFullYear()}年${startDate.getMonth() + 1}月${startDate.getDate()}日から${endDate.getFullYear()}年${
    endDate.getMonth() + 1
  }月${endDate.getDate()}日`;
}

function buildPreset(state: DemoState): PresetState {
  const baseDraft: DraftState = {
    plan: companyFixture.plan,
    seats: String(companyFixture.seats)
  };
  const baseCompany: CompanyState = {
    plan: companyFixture.plan,
    seats: companyFixture.seats
  };

  switch (state) {
    case "drawer-open":
      return {
        userRole: currentUserFixture.role,
        company: baseCompany,
        draft: { plan: "Enterprise", seats: "60" },
        drawerOpen: true,
        confirming: false,
        saveStatus: "idle" as SaveStatus,
        saveMessage: ""
      };
    case "invalid-seat-count":
      return {
        userRole: currentUserFixture.role,
        company: baseCompany,
        draft: { plan: companyFixture.plan, seats: "40" },
        drawerOpen: true,
        confirming: false,
        saveStatus: "idle" as SaveStatus,
        saveMessage: ""
      };
    case "unauthorized":
      return {
        userRole: "viewer" as UserRole,
        company: baseCompany,
        draft: baseDraft,
        drawerOpen: false,
        confirming: false,
        saveStatus: "idle" as SaveStatus,
        saveMessage: ""
      };
    case "loading":
      return {
        userRole: currentUserFixture.role,
        company: baseCompany,
        draft: { plan: "Enterprise", seats: "60" },
        drawerOpen: true,
        confirming: true,
        saveStatus: "loading" as SaveStatus,
        saveMessage: "変更を保存しています。"
      };
    case "success":
      return {
        userRole: currentUserFixture.role,
        company: { plan: "Enterprise", seats: 60 },
        draft: { plan: "Enterprise", seats: "60" },
        drawerOpen: false,
        confirming: false,
        saveStatus: "success" as SaveStatus,
        saveMessage: "契約内容を更新しました。"
      };
    case "failure":
      return {
        userRole: currentUserFixture.role,
        company: baseCompany,
        draft: { plan: "Enterprise", seats: "60" },
        drawerOpen: true,
        confirming: true,
        saveStatus: "failure" as SaveStatus,
        saveMessage: "保存に失敗しました。内容を保持したまま再試行できます。"
      };
    case "default":
    default:
      return {
        userRole: currentUserFixture.role,
        company: baseCompany,
        draft: baseDraft,
        drawerOpen: false,
        confirming: false,
        saveStatus: "idle" as SaveStatus,
        saveMessage: ""
      };
  }
}

function updateQueryState(state: DemoState) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("state", state);
  window.history.replaceState({}, "", `${url.pathname}?${url.searchParams.toString()}`);
}

export function App() {
  const initialState = getStateFromQuery();
  const [activeState, setActiveState] = useState<DemoState>(initialState);
  const [company, setCompany] = useState<CompanyState>(() => buildPreset(initialState).company);
  const [draft, setDraft] = useState<DraftState>(() => buildPreset(initialState).draft);
  const [drawerOpen, setDrawerOpen] = useState(() => buildPreset(initialState).drawerOpen);
  const [confirming, setConfirming] = useState(() => buildPreset(initialState).confirming);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(() => buildPreset(initialState).saveStatus);
  const [saveMessage, setSaveMessage] = useState(() => buildPreset(initialState).saveMessage);
  const [userRole, setUserRole] = useState<UserRole>(() => buildPreset(initialState).userRole);
  const seatInputId = useId();
  const remainingSeats = company.seats - companyFixture.usedSeats;
  const parsedSeatCount = Number.parseInt(draft.seats, 10);
  const isSeatCountValid = Number.isInteger(parsedSeatCount) && parsedSeatCount >= companyFixture.usedSeats;
  const validationMessage = isSeatCountValid ? "" : `契約席数は利用席数の${companyFixture.usedSeats}以上で設定してください。`;
  const isViewer = userRole === "viewer";
  const isSaving = saveStatus === "loading";
  const hasChanges = company.plan !== draft.plan || company.seats !== parsedSeatCount;

  useEffect(() => {
    const preset = buildPreset(activeState);
    setCompany(preset.company);
    setDraft(preset.draft);
    setDrawerOpen(preset.drawerOpen);
    setConfirming(preset.confirming);
    setSaveStatus(preset.saveStatus);
    setSaveMessage(preset.saveMessage);
    setUserRole(preset.userRole);
    updateQueryState(activeState);
  }, [activeState]);

  useEffect(() => {
    if (!isSaving) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (activeState === "failure") {
        setSaveStatus("failure");
        setSaveMessage("保存に失敗しました。内容を保持したまま再試行できます。");
        return;
      }

      setCompany({ plan: draft.plan, seats: parsedSeatCount });
      setDrawerOpen(false);
      setConfirming(false);
      setSaveStatus("success");
      setSaveMessage("契約内容を更新しました。");
      setActiveState("success");
    }, saveDelayMs);

    return () => window.clearTimeout(timer);
  }, [activeState, draft.plan, isSaving, parsedSeatCount]);

  const openDrawer = () => {
    if (isViewer) {
      return;
    }

    setDrawerOpen(true);
    setConfirming(false);
    setSaveStatus("idle");
    setSaveMessage("");
    setActiveState("drawer-open");
  };

  const closeDrawer = () => {
    if (isSaving) {
      return;
    }

    setDrawerOpen(false);
    setConfirming(false);
    setSaveStatus("idle");
    setSaveMessage("");
    setDraft({ plan: company.plan, seats: String(company.seats) });
    setActiveState(isViewer ? "unauthorized" : "default");
  };

  const startConfirmation = () => {
    if (isViewer || isSaving) {
      return;
    }

    if (!isSeatCountValid) {
      setConfirming(false);
      setSaveStatus("idle");
      setActiveState("invalid-seat-count");
      return;
    }

    setConfirming(true);
    setSaveStatus("idle");
    setSaveMessage("");
  };

  const handleSave = () => {
    if (isViewer || !isSeatCountValid || isSaving) {
      return;
    }

    setSaveStatus("loading");
    setSaveMessage("変更を保存しています。");
    setActiveState(activeState === "failure" ? "failure" : "loading");
  };

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Account Health</p>
          <h1>{companyFixture.name}</h1>
          <p className="hero-copy">契約情報、利用状況、メンバー状態を一画面で確認し、権限に応じて契約変更まで完結できます。</p>
        </div>

        <div className="hero-actions">
          <label className="state-switcher" htmlFor="demo-state">
            画面状態
            <select
              id="demo-state"
              value={activeState}
              onChange={(event) => setActiveState(event.target.value as DemoState)}
            >
              {demoStates.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </label>

          <Chip color={isViewer ? "warning" : "success"} variant="soft">
            {isViewer ? "CS Viewer" : "CS Manager"}
          </Chip>
        </div>
      </section>

      {saveMessage ? (
        <Alert
          className="status-banner"
          status={saveStatus === "failure" ? "danger" : saveStatus === "success" ? "success" : "accent"}
        >
          <Alert.Content>
            <Alert.Title>
              {saveStatus === "failure" ? "保存エラー" : saveStatus === "success" ? "保存完了" : "保存中"}
            </Alert.Title>
            <Alert.Description>{saveMessage}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <section className="content-grid">
        <Card className="overview-card">
          <Card.Header className="section-header">
            <div>
              <p className="section-label">契約概要</p>
              <Card.Title>契約と利用状況</Card.Title>
            </div>
            <Button isDisabled={isViewer} variant="primary" onPress={openDrawer}>
              契約変更
            </Button>
          </Card.Header>
          <Card.Content>
            <dl className="metric-grid">
              <div>
                <dt>契約状態</dt>
                <dd>{companyFixture.status}</dd>
              </div>
              <div>
                <dt>プラン</dt>
                <dd>{company.plan}</dd>
              </div>
              <div>
                <dt>契約期間</dt>
                <dd>{formatContractPeriod(companyFixture.contractStart, companyFixture.contractEnd)}</dd>
              </div>
              <div>
                <dt>契約席数</dt>
                <dd>{company.seats}</dd>
              </div>
              <div>
                <dt>利用席数</dt>
                <dd>{companyFixture.usedSeats}</dd>
              </div>
              <div>
                <dt>残り席数</dt>
                <dd>{remainingSeats}</dd>
              </div>
            </dl>

            {isViewer ? (
              <p className="inline-note">CS Viewerは閲覧のみ可能です。契約変更はCS Manager権限が必要です。</p>
            ) : null}
          </Card.Content>
        </Card>

        <Card className="overview-card">
          <Card.Header className="section-header">
            <div>
              <p className="section-label">メンバー一覧</p>
              <Card.Title>利用メンバー</Card.Title>
            </div>
            <Chip color="accent" variant="soft">
              {companyFixture.members.length}名
            </Chip>
          </Card.Header>
          <Card.Content>
            <div className="member-table-wrap">
              <table className="member-table">
                <thead>
                  <tr>
                    <th>氏名</th>
                    <th>メールアドレス</th>
                    <th>ロール</th>
                    <th>状態</th>
                  </tr>
                </thead>
                <tbody>
                  {companyFixture.members.map((member) => (
                    <tr key={member.id}>
                      <td>{member.name}</td>
                      <td>{member.email}</td>
                      <td>{member.role}</td>
                      <td>{member.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Content>
        </Card>
      </section>

      {drawerOpen ? (
        <div className="drawer-backdrop" data-testid="contract-drawer">
          <aside className="drawer-panel" aria-labelledby="drawer-title" aria-modal="true" role="dialog">
            <div className="drawer-header">
              <div>
                <p className="section-label">契約変更</p>
                <h2 id="drawer-title">プランと契約席数を更新</h2>
              </div>
              <Button isDisabled={isSaving} variant="ghost" onPress={closeDrawer}>
                閉じる
              </Button>
            </div>

            <div className="drawer-body">
              <div className="form-block">
                <span className="field-label">プラン</span>
                <div className="plan-options" role="radiogroup" aria-label="プラン">
                  {availablePlans.map((plan) => (
                    <button
                      key={plan}
                      aria-checked={draft.plan === plan}
                      className={`plan-pill${draft.plan === plan ? " is-selected" : ""}`}
                      disabled={isSaving}
                      role="radio"
                      type="button"
                      onClick={() => {
                        setDraft((current) => ({ ...current, plan }));
                        setSaveStatus("idle");
                        setSaveMessage("");
                      }}
                    >
                      {plan}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-block">
                <label className="field-label" htmlFor={seatInputId}>
                  契約席数
                </label>
                <input
                  aria-describedby="seat-help"
                  className={`seat-input${isSeatCountValid ? "" : " is-invalid"}`}
                  disabled={isSaving}
                  id={seatInputId}
                  inputMode="numeric"
                  min={companyFixture.usedSeats}
                  step={1}
                  type="number"
                  value={draft.seats}
                  onChange={(event) => {
                    setDraft((current) => ({ ...current, seats: event.target.value }));
                    setConfirming(false);
                    setSaveStatus("idle");
                    setSaveMessage("");
                  }}
                />
                <p className="field-help" id="seat-help">
                  利用席数は{companyFixture.usedSeats}です。これ未満には設定できません。
                </p>
                {!isSeatCountValid ? <p className="field-error">{validationMessage}</p> : null}
              </div>

              <Card className="confirmation-card">
                <Card.Header>
                  <Card.Title>変更内容の確認</Card.Title>
                </Card.Header>
                <Card.Content>
                  <dl className="confirmation-grid">
                    <div>
                      <dt>変更後プラン</dt>
                      <dd>{draft.plan}</dd>
                    </div>
                    <div>
                      <dt>変更後契約席数</dt>
                      <dd>{draft.seats || "-"}</dd>
                    </div>
                    <div>
                      <dt>変更後残り席数</dt>
                      <dd>{isSeatCountValid ? parsedSeatCount - companyFixture.usedSeats : "-"}</dd>
                    </div>
                  </dl>
                  {confirming ? (
                    <p className="inline-note">この内容で保存します。保存中は二重送信できません。</p>
                  ) : (
                    <p className="inline-note">保存前にここで変更内容を確認します。</p>
                  )}
                </Card.Content>
              </Card>
            </div>

            <div className="drawer-footer">
              <Button variant="ghost" onPress={closeDrawer}>
                キャンセル
              </Button>
              <Button isDisabled={!hasChanges || isSaving} variant="secondary" onPress={startConfirmation}>
                変更内容を確認
              </Button>
              <Button isDisabled={!confirming || !isSeatCountValid || isSaving} variant="primary" onPress={handleSave}>
                {isSaving ? <Spinner size="sm" /> : null}
                保存する
              </Button>
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}

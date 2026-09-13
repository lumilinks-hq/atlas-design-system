import { Button } from "@heroui/react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <main className="docs-main" id="main-content">
        <article className="doc-page">
          <header className="page-header">
            <h1>表示中にエラーが発生しました</h1>
            <p className="page-description">再読み込みしても直らない場合は、トップから開き直してください。</p>
          </header>
          <pre className="error-message">{error.message}</pre>
          <div className="error-actions">
            <Button variant="primary" onPress={() => window.location.reload()}>再読み込み</Button>
            <Link className="artifact-source" to="/" onClick={() => this.setState({ error: null })}>トップへ戻る</Link>
          </div>
        </article>
      </main>
    );
  }
}

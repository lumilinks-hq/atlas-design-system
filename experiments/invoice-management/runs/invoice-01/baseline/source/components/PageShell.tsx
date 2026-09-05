import type { ReactNode } from "react";

/** 一覧・詳細で共通の画面枠。 */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background-secondary">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}

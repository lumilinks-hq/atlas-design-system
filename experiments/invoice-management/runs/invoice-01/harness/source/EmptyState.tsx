/** 一覧に表示できる請求書がないときの空状態 */
export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      <p className="empty-state__description">{description}</p>
    </div>
  );
}

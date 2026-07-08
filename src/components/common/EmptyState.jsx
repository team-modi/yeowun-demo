/**
 * EmptyState — 빈 목록/결과 없음 표시.
 * props: { title, description?, icon?, action? }  action: ReactNode (버튼 등)
 */
export default function EmptyState({ title = "표시할 내용이 없어요", description, icon, action }) {
  return (
    <div className="state" role="status">
      {icon}
      <p className="state__title">{title}</p>
      {description && <p className="state__desc">{description}</p>}
      {action && <div className="state__action">{action}</div>}
    </div>
  );
}

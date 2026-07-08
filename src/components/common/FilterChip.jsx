/**
 * FilterChip — 필터/정렬 선택 칩.
 * props: { active?, onClick?, children, className?, ...rest }
 */
export default function FilterChip({ active = false, onClick, children, className = "", ...rest }) {
  const cls = ["chip", active && "is-active", className].filter(Boolean).join(" ");
  return (
    <button
      type="button"
      className={cls}
      aria-pressed={active}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}

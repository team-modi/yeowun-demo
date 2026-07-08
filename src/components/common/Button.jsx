/**
 * Button — 공통 버튼.
 * props:
 *   variant: "primary" | "secondary" | "ghost" | "danger"  (기본 primary)
 *   size: "md" | "sm"  (기본 md)
 *   block: boolean  — 가로 100%
 *   type, onClick, disabled, className, children, ...rest (button 속성 통과)
 */
export default function Button({
  variant = "primary",
  size = "md",
  block = false,
  type = "button",
  className = "",
  children,
  ...rest
}) {
  const cls = [
    "btn",
    `btn--${variant}`,
    size === "sm" && "btn--sm",
    block && "btn--block",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}

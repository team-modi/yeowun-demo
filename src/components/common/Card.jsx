/**
 * Card — 공통 카드 컨테이너.
 * props: { as?, pad?, className?, children, ...rest }
 *   pad=true 면 기본 내부 패딩 적용. as 로 태그 지정(기본 div).
 */
export default function Card({ as: Tag = "div", pad = false, className = "", children, ...rest }) {
  const cls = ["card", pad && "card--pad", className].filter(Boolean).join(" ");
  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  );
}

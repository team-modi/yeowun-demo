/**
 * Spinner — 로딩 인디케이터.
 * props: { className?, full? }  full=true 면 세로 여백을 넓게 잡아 페이지 로딩용.
 */
export default function Spinner({ className = "", full = false }) {
  return (
    <div
      className={`spinner-wrap ${className}`}
      style={full ? { minHeight: "40svh" } : undefined}
      role="status"
      aria-label="불러오는 중"
    >
      <span className="spinner" />
    </div>
  );
}

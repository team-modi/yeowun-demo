/**
 * [07] 리마인드 플로우 전용 인라인 SVG 아이콘. 모두 currentColor 사용 → CSS color 로 색 제어.
 * (공통 icons.jsx 는 수정 금지라 리마인드에서 필요한 아이콘만 여기 둔다 — record/icons.jsx 와 동일한 방침.)
 */
function Svg({ size = 16, strokeWidth = 1.7, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** 달력 — 인트로 날짜·장소 칩(관람일). */
export function CalendarIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
      <path d="M3.5 9h17" />
      <path d="M8 3v3M16 3v3" />
    </Svg>
  );
}

/** 핀 — 인트로 날짜·장소 칩(장소/지역). */
export function PinIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 21s-6.5-5.4-6.5-10.2A6.5 6.5 0 0 1 12 4.3a6.5 6.5 0 0 1 6.5 6.5C18.5 15.6 12 21 12 21z" />
      <circle cx="12" cy="10.6" r="2.3" />
    </Svg>
  );
}

/** 플러스 — "감정 다시 남기기" 접힘 알약 버튼. */
export function PlusIcon(props) {
  return (
    <Svg strokeWidth={2} {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

/**
 * [04] 기록 플로우 전용 인라인 SVG 아이콘. 모두 currentColor 사용 → CSS color 로 색 제어.
 * (공통 icons.jsx 는 수정 금지라 기록 플로우에서 필요한 아이콘만 여기 둔다.)
 */
function Svg({ size = 22, strokeWidth = 1.7, children, ...rest }) {
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

/** 달력 아이콘(관람일 필드). */
export function CalendarIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
      <path d="M3.5 9h17" />
      <path d="M8 3v3M16 3v3" />
    </Svg>
  );
}

/** 사진 추가(미디어 add 타일). 이미지 프레임 + 우상단 플러스 배지. */
export function ImagePlusIcon(props) {
  return (
    <Svg {...props}>
      <path d="M20.5 12.5V6.5a2 2 0 0 0-2-2h-13a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h9" />
      <circle cx="8.5" cy="9.5" r="1.4" />
      <path d="M3.8 16.5 8 12.5l3.2 3" />
      <path d="M18.5 15v5M16 17.5h5" />
    </Svg>
  );
}

/** 사진(이미지) 아이콘 — 미디어 시트 "사진선택". */
export function ImageIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4 17.5 9.5 12l4 3.5 3-2.5 4 4" />
    </Svg>
  );
}

/** 영상(캠코더) 아이콘 — 미디어 시트 "영상선택". */
export function VideoIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="6.5" width="12.5" height="11" rx="2.5" />
      <path d="M15.5 10.5 21 7.5v9l-5.5-3z" />
    </Svg>
  );
}

/** 재생 삼각형 — 영상 썸네일 오버레이. */
export function PlayIcon({ size = 22, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...rest}
    >
      <path d="M9 7.5v9l7-4.5z" />
    </svg>
  );
}

/** 플러스(감정 "+" 필 · 키워드 추가). */
export function PlusIcon(props) {
  return (
    <Svg strokeWidth={2} {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

/** 닫기(칩/미디어 삭제). */
export function CloseIcon(props) {
  return (
    <Svg strokeWidth={2} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

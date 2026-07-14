/**
 * 전시 탐색 전용 인라인 아이콘 — 검색/필터/펼침 셰브론.
 * (공통 icons 에 없는 것만 여기서 자체 정의. 모두 currentColor 사용.)
 */
function Svg({ size = 20, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

// 돋보기(검색)
export function SearchIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </Svg>
  );
}

// 필터(가로 슬라이더 + 노브) — 시안 02의 네이비 원형 버튼 내부 아이콘
export function FilterIcon(props) {
  return (
    <Svg {...props}>
      <path d="M4 7h2.8M11.2 7H20" />
      <circle cx="9" cy="7" r="2.2" />
      <path d="M4 12h8.8M17.2 12H20" />
      <circle cx="15" cy="12" r="2.2" />
      <path d="M4 17h4.8M13.2 17H20" />
      <circle cx="11" cy="17" r="2.2" />
    </Svg>
  );
}

// 새로고침(초기화) — 필터 시트 푸터 "초기화" 버튼용
export function RefreshIcon(props) {
  return (
    <Svg {...props}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
      <path d="M21 3v5h-5" />
    </Svg>
  );
}

// 아래 셰브론(드롭다운)
export function ChevronDownIcon(props) {
  return (
    <Svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

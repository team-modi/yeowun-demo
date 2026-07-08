/**
 * 아카이브 공용 포맷 헬퍼.
 */

/** LocalDate 문자열("2026-07-01") 또는 ISO 날짜/시각을 "2026.07.01" 로. */
export function formatDate(value) {
  if (!value) return "";
  // "2026-07-01" 또는 "2026-07-01T…" 앞 10자리만 사용
  const ymd = String(value).slice(0, 10);
  const parts = ymd.split("-");
  if (parts.length === 3) return `${parts[0]}.${parts[1]}.${parts[2]}`;
  return ymd;
}

/** 카드용 짧은 날짜 표기 "MM.DD" (연도 생략). */
export function formatShortDate(value) {
  if (!value) return "";
  const ymd = String(value).slice(0, 10);
  const parts = ymd.split("-");
  if (parts.length === 3) return `${parts[1]}.${parts[2]}`;
  return ymd;
}

/** 기간(시작~종료) 표기. 둘 다 없으면 "". */
export function formatPeriod(start, end) {
  const s = formatDate(start);
  const e = formatDate(end);
  if (s && e) return `${s} – ${e}`;
  return s || e || "";
}

/** WriteMode → 라벨. */
export function writeModeLabel(mode) {
  if (mode === "AI") return "AI 기록";
  if (mode === "DIRECT") return "직접 기록";
  return null;
}

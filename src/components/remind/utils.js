/**
 * remind 도메인 공용 헬퍼(내 소유 components/remind).
 */

// LocalDate("2026-07-03") · ZonedDateTime(ISO) → "2026.07.03"
export function fmtDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

// 인트로 날짜·장소 칩용 "2026. 07. 03" 표기(와이어프레임 정합).
export function fmtDateSpaced(value) {
  return fmtDate(value).replace(/\./g, ". ").trim();
}

// 리마인드 상세 안내문용 경과 표현. 관람일(viewedAt) → 리마인드 저장(createdAt) 간격을
// "1주"/"2주"/"1개월" 형태로. 파싱 불가 시 빈 문자열(안내문에서 경과 절 생략).
export function remindElapsedPhrase(viewedAt, createdAt) {
  const from = Date.parse(viewedAt);
  const to = Date.parse(createdAt);
  if (Number.isNaN(from) || Number.isNaN(to)) return "";
  const days = Math.max(0, Math.round((to - from) / (24 * 60 * 60 * 1000)));
  if (days < 25) return `${Math.max(1, Math.round(days / 7))}주`;
  return `${Math.max(1, Math.round(days / 30))}개월`;
}

// 인트로 문구용 짧은 경과 표현("1주일 전"/"오늘" 형태). "…기록" 접미사는 제거.
export function elapsedPhrase(candidate) {
  if (!candidate) return "";
  if (candidate.elapsedLabel) return candidate.elapsedLabel.replace(/\s*기록했?어?요?$/, "").trim();
  const d = candidate.daysAgo;
  if (typeof d === "number") {
    if (d >= 7 && d % 7 === 0) return `${d / 7}주일 전`;
    return `${d}일 전`;
  }
  return "";
}

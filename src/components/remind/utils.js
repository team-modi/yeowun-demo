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

// 인트로 문구용 짧은 경과 표현("1주일 전" 형태). "…기록" 접미사는 제거.
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

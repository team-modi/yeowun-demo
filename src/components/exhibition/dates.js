/**
 * 전시 기간/D-day 표시용 헬퍼.
 */

// "2026-07-01" ~ "2026-08-15" 형태의 기간 문자열
export const periodText = (startDate, endDate) => {
  if (!startDate && !endDate) return null;
  return `${startDate ?? ""} ~ ${endDate ?? ""}`.trim();
};

// 오늘부터 endDate 까지 남은 일수 → 숫자(양수=남음, 0=오늘, 음수=종료)
export const daysUntil = (endDate) => {
  if (!endDate) return null;
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end - today) / 86400000);
};

// D-day 라벨(카드 규칙과 동일): D-DAY / D-N / 종료
export const ddayLabel = (endDate) => {
  const d = daysUntil(endDate);
  if (d === null) return null;
  if (d < 0) return "종료";
  if (d === 0) return "D-DAY";
  return `D-${d}`;
};

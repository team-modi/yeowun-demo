/**
 * [04] 기록 플로우 정적 코드 · 헬퍼 모음.
 * 백엔드에 GET /emotion-keywords 엔드포인트가 없어(문서에만 존재) 프리셋을 프론트에 고정.
 * 감정 라벨은 저장 시 emotionCodes(각 ≤10자)로 그대로 전송된다.
 */

// 감정 프리셋(와이어프레임 톤). 커스텀 입력도 허용.
export const EMOTION_PRESETS = [
  "슬픈",
  "강렬한",
  "재미있는",
  "유쾌한",
  "서정적인",
  "화나는",
  "아름다운",
  "관심있는",
  "차분한",
  "고요한",
  "벅찬",
  "그리운",
  "위로받은",
  "몽환적인",
];

// 전시 형태 (ExhibitionDto.CustomCreateRequest.format). SOLO 선택 시 작가명 필수.
export const FORMAT_OPTIONS = [
  { code: "SOLO", label: "개인전" },
  { code: "GROUP", label: "단체전(2인 이상)" },
  { code: "CURATED", label: "기획전" },
  { code: "ART_FAIR", label: "아트페어" },
];

// 장르(매체) — 와이어프레임 칩 라벨. "전체"는 선택 해제(빈 값).
export const CATEGORY_OPTIONS = [
  { code: "PAINTING", label: "회화·드로잉" },
  { code: "PHOTO", label: "사진" },
  { code: "SCULPTURE", label: "조각·설치" },
  { code: "MEDIA", label: "미디어아트" },
  { code: "DESIGN", label: "디자인" },
  { code: "CRAFT", label: "공예" },
  { code: "ARCHITECTURE", label: "건축" },
  { code: "PERFORMANCE", label: "퍼포먼스" },
  { code: "ETC", label: "기타" },
];

export const MEDIA_TYPE_OPTIONS = [
  { code: "PHOTO", label: "사진" },
  { code: "VIDEO", label: "영상" },
];

export const MAX_MEDIA = 5;
export const MAX_CONTENT = 300;
export const MAX_EMOTION_LEN = 10;

const codeLabel = (opts, code) => opts.find((o) => o.code === code)?.label ?? "";
export const formatLabel = (code) => codeLabel(FORMAT_OPTIONS, code);
export const categoryLabel = (code) => codeLabel(CATEGORY_OPTIONS, code);

/** 백엔드 에러 봉투에서 사용자용 메시지 추출. */
export function errMessage(err, fallback = "요청을 처리하지 못했어요.") {
  return err?.response?.data?.meta?.message || fallback;
}

const pad2 = (n) => String(n).padStart(2, "0");

/** 오늘 날짜 YYYY-MM-DD (date input value용). */
export function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

/** "2026-07-01" → "2026년 07월 1일" */
export function isoToKorean(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${y}년 ${m}월 ${Number(d)}일`;
}

/** "2026-06-24" → "2026.06.24" */
export function isoToDot(iso) {
  return iso ? iso.replaceAll("-", ".") : "";
}

/** y,m(0-11),d → "YYYY-MM-DD" */
export function toISO(y, m, d) {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

/**
 * 전시 탐색/상세 공용 상수 — 지역 15종 · 장르 9종 · 정렬.
 * (백엔드 enum 코드 ↔ 한글 라벨 매핑. 화면 표시는 라벨, 요청은 코드 콤마 조인.)
 */

export const REGIONS = [
  { code: "SEOUL", label: "서울" },
  { code: "GYEONGGI", label: "경기" },
  { code: "INCHEON", label: "인천" },
  { code: "GANGWON", label: "강원" },
  { code: "DAEJEON", label: "대전" },
  { code: "SEJONG", label: "세종" },
  { code: "CHUNGNAM", label: "충남" },
  { code: "CHUNGBUK", label: "충북" },
  { code: "GWANGJU", label: "광주" },
  { code: "JEONNAM", label: "전남" },
  { code: "JEONBUK", label: "전북" },
  { code: "DAEGU", label: "대구" },
  { code: "GYEONGBUK", label: "경북" },
  { code: "BUSAN", label: "부산" },
  { code: "ULSAN", label: "울산" },
  { code: "GYEONGNAM", label: "경남" },
  { code: "JEJU", label: "제주" },
  { code: "ETC", label: "기타" },
];

/**
 * 지역 필터 그룹(디자인 병합 칩) — 서버 GET /exhibitions/region-groups 응답과 동일 구성.
 * 서버가 단일 소스이며, 이 상수는 엔드포인트 미배포/실패 시 폴백이다.
 */
export const REGION_GROUPS = [
  { code: "SEOUL", label: "서울", regions: ["SEOUL"] },
  { code: "GYEONGGI_INCHEON", label: "경기·인천", regions: ["GYEONGGI", "INCHEON"] },
  { code: "GANGWON", label: "강원", regions: ["GANGWON"] },
  {
    code: "DAEJEON_SEJONG_CHUNGCHEONG",
    label: "대전·세종·충청",
    regions: ["DAEJEON", "SEJONG", "CHUNGNAM", "CHUNGBUK"],
  },
  { code: "GWANGJU_JEOLLA", label: "광주·전라", regions: ["GWANGJU", "JEONNAM", "JEONBUK"] },
  { code: "DAEGU_GYEONGBUK", label: "대구·경북", regions: ["DAEGU", "GYEONGBUK"] },
  {
    code: "BUSAN_ULSAN_GYEONGNAM",
    label: "부산·울산·경남",
    regions: ["BUSAN", "ULSAN", "GYEONGNAM"],
  },
  { code: "JEJU", label: "제주", regions: ["JEJU"] },
  { code: "ETC", label: "기타", regions: ["ETC"] },
];

export const CATEGORIES = [
  { code: "PAINTING", label: "회화·드로잉" },
  { code: "PHOTO", label: "사진" },
  { code: "MEDIA", label: "미디어아트" },
  { code: "SCULPTURE", label: "조각·설치" },
  { code: "DESIGN", label: "디자인" },
  { code: "CRAFT", label: "공예" },
  { code: "ARCHITECTURE", label: "건축" },
  { code: "PERFORMANCE", label: "퍼포먼스" },
  { code: "ETC", label: "기타" },
];

export const SORTS = [
  { code: "latest", label: "최신순" },
  { code: "ending", label: "종료임박" },
  { code: "popular", label: "인기순" },
];

const REGION_LABEL = Object.fromEntries(REGIONS.map((r) => [r.code, r.label]));
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.code, c.label]));

export const regionLabel = (code) => REGION_LABEL[code] ?? code;
export const categoryLabel = (code) => CATEGORY_LABEL[code] ?? code;

export const MIN_KEYWORD = 2;

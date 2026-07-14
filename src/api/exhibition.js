import axiosInstance from "@utils/axiosInstance";

/**
 * 반환값은 ApiResponse 봉투: { meta, data }. (auth.js 상단 주석 참고)
 */

// 홈 배너 (최대 3) — data: {banners:[{exhibitionId,title,bannerImageUrl,startDate,endDate,place}]}
export const getBanners = async () => {
  const res = await axiosInstance.get("/exhibitions/banners");
  return res.data;
};

// 전시 목록/탐색 — params: {keyword,section,period,region,category,date,sort,lat,lng,cursor,size}
//   section: ending-soon|opening-this-month|free / sort: latest|ending|popular|distance
//   region·category 콤마 다중 / keyword 최소 2글자
//   → CursorResponse<ExhibitionListItem>
//   ExhibitionListItem: {exhibitionId,type,title,posterUrl,startDate,endDate,place,region,
//     category,artistSummary,dDay,free,bookmarked}
export const getList = async (params) => {
  const res = await axiosInstance.get("/exhibitions", { params });
  return res.data;
};

// 지역 필터 그룹(필터 시트 칩, 서버가 단일 소스) — data: {groups:[{code,label,regions[]}]}
//   검색 시 선택 그룹들의 regions를 콤마로 이어 region 파라미터에 넣는다.
export const getRegionGroups = async () => {
  const res = await axiosInstance.get("/exhibitions/region-groups");
  return res.data;
};

// 전시 상세 — data: {…,description,operatingHours,price,artists[],keywords[],serviceName,
//   detailUrl,gpsX,gpsY,address,imgUrl,phone,viewCount,sigungu,placeUrl,artistSummary,
//   free,bookmarked,recorded}
export const getDetail = async (exhibitionId) => {
  const res = await axiosInstance.get(`/exhibitions/${exhibitionId}`);
  return res.data;
};

// 직접 전시 등록 — body: {title,posterUrl,venueId?,place?,startDate,endDate,
//   format(SOLO|GROUP|CURATED|ART_FAIR),artist,region,category,
//   genreKeyword?(마스터 10종 중 1 — 회화·드로잉/사진/미디어아트/조각·설치/디자인/공예/건축/공연/현대미술/일러스트레이션.
//     미전송 시 서버 AI가 자동 분류)} → data: {exhibitionId}
export const createCustom = async (body) => {
  const res = await axiosInstance.post("/exhibitions/custom", body);
  return res.data;
};

// 장소(공연장) 검색 자동완성 — params: {keyword} → data: {venues:[{venueId,name,address,region}]}
export const searchVenues = async (keyword) => {
  const res = await axiosInstance.get("/venues", { params: { keyword } });
  return res.data;
};

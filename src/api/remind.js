import axiosInstance from "@utils/axiosInstance";

/**
 * 리마인드(오늘의 여운). 반환값은 ApiResponse 봉투: { meta, data }.
 * ※ 실제 필드는 백엔드 interfaces/remind/dto/RemindDto 기준으로 페이지 작업 시 재확인.
 */

// 오늘의 리마인드 후보(추천) 조회
export const getCandidate = async () => {
  const res = await axiosInstance.get("/reminds/candidate");
  return res.data;
};

// 리마인드 저장
export const saveRemind = async (body) => {
  const res = await axiosInstance.post("/reminds", body);
  return res.data;
};

// 저장한 리마인드 목록
export const getRemindList = async (params) => {
  const res = await axiosInstance.get("/reminds", { params });
  return res.data;
};

// 리마인드 상세
export const getRemindDetail = async (remindId) => {
  const res = await axiosInstance.get(`/reminds/${remindId}`);
  return res.data;
};

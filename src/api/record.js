import axiosInstance from "@utils/axiosInstance";

/**
 * 기록(그날의 여운). 반환값은 ApiResponse 봉투: { meta, data }.
 * ※ 실제 요청/응답 필드는 백엔드 interfaces/record/dto 기준으로 페이지 작업 시 재확인.
 */

// 기록 목록(아카이브) — params: {sort,cursor,size} 등
export const getRecordList = async (params) => {
  const res = await axiosInstance.get("/records", { params });
  return res.data;
};

// 기록 상세
export const getDetailRecord = async (recordId) => {
  const res = await axiosInstance.get(`/records/${recordId}`);
  return res.data;
};

// 기록 작성
export const createRecord = async (body) => {
  const res = await axiosInstance.post("/records", body);
  return res.data;
};

// 기록 수정
export const updateRecord = async (recordId, body) => {
  const res = await axiosInstance.put(`/records/${recordId}`, body);
  return res.data;
};

// 기록 삭제
export const deleteRecord = async (recordId) => {
  const res = await axiosInstance.delete(`/records/${recordId}`);
  return res.data;
};

// 기록 북마크
export const addRecordBookmark = async (recordId) => {
  const res = await axiosInstance.post(`/records/${recordId}/bookmark`);
  return res.data;
};

// 기록 북마크 해제
export const removeRecordBookmark = async (recordId) => {
  const res = await axiosInstance.delete(`/records/${recordId}/bookmark`);
  return res.data;
};

// 내가 기록한(다녀온) 전시 목록
export const getVisitedExhibitions = async (params) => {
  const res = await axiosInstance.get("/records/exhibitions/visited", { params });
  return res.data;
};

// AI 감정 질문 생성
export const getAiQuestions = async (body) => {
  const res = await axiosInstance.post("/records/ai/questions", body);
  return res.data;
};

// AI 기록 초안 작성
export const composeAiRecord = async (body) => {
  const res = await axiosInstance.post("/records/ai/compose", body);
  return res.data;
};

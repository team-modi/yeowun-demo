import axiosInstance from "@utils/axiosInstance";

/**
 * 전시 북마크(관심). 반환값은 ApiResponse 봉투: { meta, data }.
 * 목록 조회는 user.js 의 getMyBookmarks 참고.
 */

// 전시 북마크 추가 (멱등) → data: {exhibitionId, bookmarked:true}
export const addBookmark = async (exhibitionId) => {
  const res = await axiosInstance.post(`/exhibitions/${exhibitionId}/bookmark`);
  return res.data;
};

// 전시 북마크 해제 → data: {exhibitionId, bookmarked:false}
export const removeBookmark = async (exhibitionId) => {
  const res = await axiosInstance.delete(`/exhibitions/${exhibitionId}/bookmark`);
  return res.data;
};

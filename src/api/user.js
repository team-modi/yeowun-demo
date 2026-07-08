import axiosInstance from "@utils/axiosInstance";

/**
 * 반환값은 ApiResponse 봉투: { meta, data }. (auth.js 상단 주석 참고)
 */

// 내 프로필 조회 — data: {userId,provider,nickname,profileImageUrl,ageGroup,birthYear,
//   residenceRegion,residenceDistrict,tasteKeywords[],stats:{recordCount,exhibitionCount,bookmarkCount}}
export const getMe = async () => {
  const res = await axiosInstance.get("/users/me");
  return res.data;
};

// 내 프로필 수정 — body: {nickname,profileImageUrl,ageGroup,residenceRegion,residenceDistrict}
export const updateProfile = async (body) => {
  const res = await axiosInstance.put("/users/me/profile", body);
  return res.data;
};

// 알림 설정 조회 — data: {remindEnabled,noticeEnabled}
export const getNotificationSettings = async () => {
  const res = await axiosInstance.get("/users/me/notification-settings");
  return res.data;
};

// 알림 설정 수정 — body: {remindEnabled,noticeEnabled}
export const updateNotificationSettings = async (body) => {
  const res = await axiosInstance.put("/users/me/notification-settings", body);
  return res.data;
};

// 회원 탈퇴 (data null)
export const withdraw = async () => {
  const res = await axiosInstance.delete("/users/me");
  return res.data;
};

// 내 관심(북마크) 전시 목록 — params: {sort:"latest"|"ending", cursor, size} → CursorResponse<ExhibitionListItem>
export const getMyBookmarks = async (params) => {
  const res = await axiosInstance.get("/users/me/bookmarks", { params });
  return res.data;
};

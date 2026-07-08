import axiosInstance from "@utils/axiosInstance";

/**
 * 반환값은 ApiResponse 봉투: { meta, data }.
 */

// 알림 목록 — params: {cursor,size}
//   → CursorResponse<{notificationId,type(REMIND|NOTICE),title,body,targetId,read,createdAt}>
export const getNotifications = async (params) => {
  const res = await axiosInstance.get("/notifications", { params });
  return res.data;
};

// 알림 읽음 처리 → data: {notificationId, read:true}
export const markRead = async (notificationId) => {
  const res = await axiosInstance.put(`/notifications/${notificationId}/read`);
  return res.data;
};

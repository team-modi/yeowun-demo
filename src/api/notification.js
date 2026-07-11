import axiosInstance from "@utils/axiosInstance";

/**
 * 반환값은 ApiResponse 봉투: { meta, data }.
 */

// 알림 목록 — params: {type?,cursor,size}
//   type: REMIND | EXHIBITION | NOTICE — 미지정(undefined)이면 axios 가 파라미터를
//   보내지 않아 전체 조회가 된다.
//   → CursorResponse<{notificationId,type,title,body,targetId,imageUrl,read,createdAt}>
//     imageUrl=카드 썸네일용 전시 포스터(없으면 null → 플레이스홀더)
//     REMIND 의 targetId=recordId, EXHIBITION 의 targetId=exhibitionId.
export const getNotifications = async (params) => {
  const res = await axiosInstance.get("/notifications", { params });
  return res.data;
};

// 알림 읽음 처리 → data: {notificationId, read:true}
export const markRead = async (notificationId) => {
  const res = await axiosInstance.put(`/notifications/${notificationId}/read`);
  return res.data;
};

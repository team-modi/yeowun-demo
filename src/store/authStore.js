import { create } from "zustand";

/**
 * 인증 상태. 실제 인증은 쿠키(HttpOnly) 기반이므로 민감정보는 저장하지 않는다.
 * authed 는 getMe() 성공으로 확정된다. checked 는 앱 진입 시 세션 확인(getMe)이 1회 끝났는지 —
 * 익명 탐색을 허용하되(랜딩에서 로그인 강제 X), 로그인된 사용자는 조용히 인식하기 위한 부트스트랩 플래그.
 */
export const useAuthStore = create((set) => ({
  authed: false,
  user: null,
  checked: false,

  setAuthed: (authed) => set({ authed }),
  setUser: (user) => set({ user }),
  setChecked: (checked) => set({ checked }),
  clear: () => set({ authed: false, user: null }),
}));

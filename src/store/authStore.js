import { create } from "zustand";

/**
 * 인증 상태. 실제 인증은 쿠키(HttpOnly) 기반이므로 민감정보는 저장하지 않는다.
 * authed 는 getMe() 성공으로 확정된다(RequireAuth 참고).
 */
export const useAuthStore = create((set) => ({
  authed: false,
  user: null,

  setAuthed: (authed) => set({ authed }),
  setUser: (user) => set({ user }),
  clear: () => set({ authed: false, user: null }),
}));

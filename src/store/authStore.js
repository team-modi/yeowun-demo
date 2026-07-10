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
  // clear: 세션 확인은 끝난 상태(checked 유지)로 로그인만 해제 — 죽은 세션이 즉시 게이트로 전파된다.
  clear: () => set({ authed: false, user: null }),
  // reset: 인증 상태를 완전 초기화(checked 까지 리셋) — 다음 개인화 진입 시 getMe 부트스트랩을
  // 다시 돌려 서버 기준으로 재확정한다. 명시적 로그아웃/탈퇴에 사용.
  reset: () => set({ authed: false, user: null, checked: false }),
}));

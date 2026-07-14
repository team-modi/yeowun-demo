/**
 * Microsoft Clarity 커스텀 이벤트/태그 헬퍼.
 * 기본 스크립트는 index.html에 로드됨 — 여기서는 window.clarity 존재 시에만 안전 호출한다.
 * (Clarity 미로드·광고차단 환경에서도 앱 동작에 영향 없음)
 *
 * 이벤트 설계(베타 퍼널, PM 요청문 기준):
 *   record_started / record_saved / ai_draft_generated / archive_record_opened
 *   reminder_opened / reminder_reentry_started / reminder_reentry_saved / reminder_story_completed
 * A/B 필터 태그: reminder_variant=A|B, beta_test=yeoun_beta_v1
 */

export const trackClarityEvent = (eventName) => {
  if (typeof window !== "undefined" && typeof window.clarity === "function") {
    window.clarity("event", eventName);
  }
};

export const setClarityTag = (key, value) => {
  if (typeof window !== "undefined" && typeof window.clarity === "function") {
    window.clarity("set", key, value);
  }
};

const ONCE_PREFIX = "yeowun.clarity.once.";

/**
 * 세션당 1회만 전송(화면 진입류 이벤트 — record_started, reminder_opened 등).
 * React Strict Mode/리렌더 중복 방지 겸용. sessionStorage 차단 환경은 그냥 전송(중복 허용).
 */
export const trackClarityEventOnce = (eventName) => {
  try {
    const key = ONCE_PREFIX + eventName;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // sessionStorage 불가 — 중복 방지 없이 전송
  }
  trackClarityEvent(eventName);
};

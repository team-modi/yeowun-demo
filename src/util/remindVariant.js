/**
 * 리마인드 A/B 배정 결정(격리된 순수/저장 헬퍼).
 *
 * 배정 키 = 게스트 로그인에 쓴 "핸드폰 번호 끝자리"(짝수→A 요약형, 홀수→B 순차형).
 * 베타 설문폼도 같은 번호를 수집하므로, 분석 시 설문 응답과 앱 행동을 같은 번호로
 * 사후 매칭할 수 있다 — 그래서 백엔드에 그룹을 저장하지 않는다.
 *
 * variant: "A"(요약형) | "B"(순차형)
 */

export const VARIANT_KEY = "yeowun.remindVariant";

// 핸드폰 문자열에서 마지막 숫자를 뽑아 짝/홀로 배정. 숫자가 하나도 없으면 null.
export function variantFromPhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/[^0-9]/g, "");
  if (!digits) return null;
  const last = Number(digits[digits.length - 1]);
  return last % 2 === 0 ? "A" : "B";
}

// localStorage 는 SSR/프라이버시 차단 환경에서 던질 수 있어 항상 방어한다.
function readStored() {
  try {
    const v = localStorage.getItem(VARIANT_KEY);
    return v === "A" || v === "B" ? v : null;
  } catch {
    return null;
  }
}

export function setVariant(v) {
  if (v !== "A" && v !== "B") return;
  try {
    localStorage.setItem(VARIANT_KEY, v);
  } catch {
    // 저장 실패는 무시 — 이번 세션은 해석 결과로만 동작한다.
  }
}

// QA 강제 전환용 URL 파라미터(?rv=A|B). 존재하면 최우선.
function readOverride() {
  try {
    const rv = new URLSearchParams(window.location.search).get("rv");
    return rv === "A" || rv === "B" ? rv : null;
  } catch {
    return null;
  }
}

/**
 * 현재 사용자에게 노출할 variant 를 해석한다.
 * 우선순위:
 *   1) URL ?rv=A|B (QA 강제) — 캐시에도 기록해 이후 이동에도 유지
 *   2) localStorage 캐시(로그인 시 번호 끝자리로 저장된 값)
 *   3) userId 패리티 폴백(캐시 없는 예외 케이스) — 캐시 기록
 *   4) 기본 "B"(기존 동작)
 * ※ 3)은 이전 쿠키 세션이 localStorage 없이 /remind 에 진입하는 극소수 케이스 대비.
 *    분석 기준은 항상 "번호 끝자리"이며, 폴백은 소규모 베타에서 무시 가능한 비율이다.
 */
export function resolveVariant(opts = {}) {
  const override = readOverride();
  if (override) {
    setVariant(override);
    return override;
  }

  const stored = readStored();
  if (stored) return stored;

  const { userId } = opts;
  if (userId != null) {
    const n = Number(String(userId).replace(/[^0-9]/g, ""));
    if (Number.isFinite(n)) {
      const v = n % 2 === 0 ? "A" : "B";
      setVariant(v);
      return v;
    }
  }

  return "B";
}

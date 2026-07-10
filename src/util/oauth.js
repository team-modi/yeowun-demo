/**
 * 카카오 소셜 로그인 시작 헬퍼.
 *
 * 흐름: startKakaoLogin() 이 카카오 authorize 로 리다이렉트 →
 *   카카오가 redirect_uri(= 현재 오리진 + /login)로 인가 code 를 되돌려줌 →
 *   LoginPage 가 code 를 읽어 백엔드에 로그인 요청(auth.login) → 쿠키(access/refresh) 세팅.
 *
 * redirect_uri 는 배포 도메인마다 다르므로 현재 오리진에서 동적으로 만든다.
 *   로컬  : http://localhost:3000/login
 *   배포  : https://yeowun-demo.vercel.app/login
 * ⚠️ 이 값은 카카오 콘솔의 [카카오 로그인 리다이렉트 URI] 및 백엔드 app.oauth.allowed-redirect-uris
 *    화이트리스트와 정확히 일치해야 한다(두 오리진 모두 양쪽에 등록되어 있어야 함).
 */

// 카카오 REST API 키 — authorize URL 에 그대로 노출되는 공개성 값이라 기본값을 코드에 둔다.
// 테스트앱 "여운-TEST"(앱ID 1500036). 운영 앱으로 교체 시 env(VITE_KAKAO_CLIENT_ID)로 오버라이드.
const KAKAO_CLIENT_ID =
  import.meta.env.VITE_KAKAO_CLIENT_ID || "bba3e1d954ec548062bc3c13fd9f72bc";

// 구글 OAuth 클라이언트 ID — 배포 시 env(VITE_GOOGLE_CLIENT_ID)로 주입한다(카카오와 달리 코드 기본값 없음).
// 실제 동작하려면 구글 콘솔의 승인된 리디렉션 URI(= 현재 오리진 + /login)와 백엔드 google 클라이언트 설정이 필요하다.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const PROVIDER_KEY = "yeowun.oauth.provider";

/**
 * 백엔드/소셜 콘솔에 등록된 값과 일치해야 하는 redirect_uri. 카카오·구글 모두 현재 오리진 + /login 으로 통일한다.
 * (콜백에서 어떤 provider 인지는 sessionStorage 에 저장한 값으로 구분한다.)
 */
export const oauthRedirectUri = () =>
  import.meta.env.VITE_OAUTH_REDIRECT_URI ||
  import.meta.env.VITE_KAKAO_REDIRECT_URI ||
  `${window.location.origin}/login`;

/** 하위호환 별칭(기존 호출부 유지). */
export const kakaoRedirectUri = oauthRedirectUri;

/** 콜백에서 읽을 로그인 provider 를 저장/조회/정리한다(kakao | google). */
export const rememberProvider = (provider) => {
  try {
    sessionStorage.setItem(PROVIDER_KEY, provider);
  } catch {
    // sessionStorage 불가 환경은 무시(기본 kakao 로 폴백)
  }
};
export const takeProvider = () => {
  try {
    const p = sessionStorage.getItem(PROVIDER_KEY);
    sessionStorage.removeItem(PROVIDER_KEY);
    return p;
  } catch {
    return null;
  }
};

/** 카카오 인가 페이지로 이동한다. 성공 시 redirect_uri 로 ?code= 를 달고 돌아온다. */
export const startKakaoLogin = () => {
  rememberProvider("kakao");
  const params = new URLSearchParams({
    client_id: KAKAO_CLIENT_ID,
    redirect_uri: oauthRedirectUri(),
    response_type: "code",
  });
  window.location.href = `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
};

/** 구글 인가 페이지로 이동한다. 성공 시 redirect_uri 로 ?code= 를 달고 돌아온다. */
export const startGoogleLogin = () => {
  rememberProvider("google");
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: oauthRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

/** 구글 로그인 사용 가능 여부(클라이언트 ID 설정 시에만 버튼 활성). */
export const isGoogleConfigured = () => !!GOOGLE_CLIENT_ID;

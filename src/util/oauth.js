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

/** 백엔드/카카오 콘솔에 등록된 값과 일치해야 하는 redirect_uri. 기본은 현재 오리진 + /login. */
export const kakaoRedirectUri = () =>
  import.meta.env.VITE_KAKAO_REDIRECT_URI || `${window.location.origin}/login`;

/** 카카오 인가 페이지로 이동한다. 성공 시 redirect_uri 로 ?code= 를 달고 돌아온다. */
export const startKakaoLogin = () => {
  const params = new URLSearchParams({
    client_id: KAKAO_CLIENT_ID,
    redirect_uri: kakaoRedirectUri(),
    response_type: "code",
  });
  window.location.href = `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
};

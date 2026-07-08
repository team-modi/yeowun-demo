import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { guestLogin, login } from "@api/auth";
import { getMe } from "@api/user";
import { startKakaoLogin } from "@utils/oauth";
import { useAuthStore } from "@store/authStore";
import Button from "@components/common/Button";

/**
 * LoginPage — 여운 브랜딩 + 로그인 진입.
 * - 카카오: startKakaoLogin() → 카카오 인가 → /login?code= 로 복귀 → login("kakao", code)
 * - 게스트: guestLogin() 으로 소셜 인증 없이 임시 세션 생성
 * 두 경로 모두 성공 시 쿠키(access/refresh) 세팅 → getMe() 로 사용자 로드 → /yeowun 이동.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setAuthed, setUser } = useAuthStore();
  const [status, setStatus] = useState("idle"); // idle | loading | error

  // 로그인 성공 공통 마무리: 사용자 로드(실패해도 세션은 유효) → 홈 이동
  const finishLogin = async () => {
    try {
      const me = await getMe();
      if (me?.meta?.result === "SUCCESS") setUser(me.data);
    } catch {
      // getMe 실패해도 세션 쿠키는 유효하므로 진행
    }
    setAuthed(true);
    navigate("/yeowun", { replace: true });
  };

  // 카카오 리다이렉트 콜백: ?code= 가 붙어 돌아오면 백엔드에 로그인 요청
  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) return;
    (async () => {
      setStatus("loading");
      try {
        const res = await login("kakao", code);
        if (res?.meta?.result !== "SUCCESS") {
          setStatus("error");
          return;
        }
        setSearchParams({}, { replace: true }); // code 재사용 방지: URL 정리
        await finishLogin();
      } catch (err) {
        console.error("카카오 로그인 실패:", err);
        setStatus("error");
      }
    })();
    // 최초 마운트 시 1회만 콜백 처리
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGuest = async () => {
    setStatus("loading");
    try {
      const res = await guestLogin();
      if (res?.meta?.result !== "SUCCESS") {
        setStatus("error");
        return;
      }
      await finishLogin();
    } catch (err) {
      console.error("게스트 로그인 실패:", err);
      setStatus("error");
    }
  };

  const busy = status === "loading";

  return (
    <main className="login-page">
      <h1 className="login-page__brand">여운</h1>
      <p className="login-page__tagline">
        전시가 남긴 잔상과 감정을
        <br />
        조용히 기록하는 공간
      </p>

      {status === "error" && (
        <p className="login-page__error" role="alert">
          로그인에 실패했어요. 다시 시도해 주세요.
        </p>
      )}

      <div className="login-page__actions">
        <button
          type="button"
          className="btn btn--block"
          onClick={startKakaoLogin}
          disabled={busy}
          style={{
            backgroundColor: "#FEE500",
            color: "rgba(0, 0, 0, 0.85)",
            border: "none",
          }}
        >
          카카오로 로그인
        </button>
        <Button block variant="secondary" onClick={handleGuest} disabled={busy}>
          {busy ? "시작하는 중…" : "게스트로 둘러보기"}
        </Button>
      </div>
    </main>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { guestLogin, guestPhoneLogin, login } from "@api/auth";
import { getMe } from "@api/user";
import { startKakaoLogin, takeProvider } from "@utils/oauth";
import { useAuthStore } from "@store/authStore";
import { BackIcon } from "@components/common/icons";

/**
 * LoginPage — 소셜 로그인 진입(랜딩 플로우 B의 로그인 지점).
 * 랜딩·전시 탐색은 로그인 없이 가능하고, 기록 작성·프로필·북마크 등 개인화 시점에만 이 화면으로 온다.
 * - 카카오: startKakaoLogin() → 소셜 인가 → /login?code= 복귀 → login(provider, code)
 * - 게스트: guestLogin() 으로 소셜 없이 임시 세션(데모 편의)
 * 성공 시 쿠키(access/refresh) 세팅 → getMe() 로 사용자 로드 → redirect(원래 위치) 또는 /yeowun 이동.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setAuthed, setUser } = useAuthStore();
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [phone, setPhone] = useState(""); // 휴대폰 식별 로그인(베타) 입력값

  const redirectTo = searchParams.get("redirect");

  // 로그인 성공 공통 마무리: 사용자 로드(실패해도 세션은 유효) → 원래 위치/홈 이동
  const finishLogin = async () => {
    try {
      const me = await getMe();
      if (me?.meta?.result === "SUCCESS") setUser(me.data);
    } catch {
      // getMe 실패해도 세션 쿠키는 유효하므로 진행
    }
    setAuthed(true);
    const dest = redirectTo ? decodeURIComponent(redirectTo) : "/yeowun";
    navigate(dest, { replace: true });
  };

  // 소셜 리다이렉트 콜백: ?code= 로 돌아오면 저장해 둔 provider(kakao|google)로 로그인 요청
  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) return;
    const provider = takeProvider() || "kakao";
    (async () => {
      setStatus("loading");
      try {
        const res = await login(provider, code);
        if (res?.meta?.result !== "SUCCESS") {
          setStatus("error");
          return;
        }
        // code 재사용 방지: URL 에서 code 만 제거(redirect 는 유지)
        const next = new URLSearchParams(searchParams);
        next.delete("code");
        setSearchParams(next, { replace: true });
        await finishLogin();
      } catch (err) {
        console.error(`${provider} 로그인 실패:`, err);
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

  // 휴대폰 식별 로그인(베타 주 경로) — 같은 번호는 재방문 시 같은 계정으로 이어진다.
  const phoneDigits = phone.replace(/[^0-9]/g, "");
  const phoneValid = /^01[0-9]{8,9}$/.test(phoneDigits);
  const handlePhoneLogin = async () => {
    if (!phoneValid || busy) return;
    setStatus("loading");
    try {
      const res = await guestPhoneLogin(phoneDigits);
      if (res?.meta?.result !== "SUCCESS") {
        setStatus("error");
        return;
      }
      await finishLogin();
    } catch (err) {
      console.error("휴대폰 로그인 실패:", err);
      setStatus("error");
    }
  };

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/yeowun", { replace: true });
  };

  const busy = status === "loading";

  return (
    <main className="login-page">
      <button
        type="button"
        className="login-page__back"
        aria-label="뒤로"
        onClick={goBack}
      >
        <BackIcon size={22} />
      </button>

      <div className="login-page__center">
        <span className="login-page__logo" aria-hidden="true">
          여운
        </span>
        <p className="login-page__tagline">
          가입하고 나만의
          <br />
          여운을 남겨보세요
        </p>

        {status === "error" && (
          <p className="login-page__error" role="alert">
            로그인에 실패했어요. 다시 시도해 주세요.
          </p>
        )}

        <div className="login-page__actions">
          {/* 베타 주 경로: 휴대폰 번호 식별 로그인 — 같은 번호로 다시 오면 같은 계정으로 이어진다.
              (카카오는 테스트 앱 테스터 계정만 허용되는 베타 제약으로 보조 경로) */}
          <input
            type="tel"
            className="login-page__phone"
            placeholder="휴대폰 번호 (예: 010-1234-5678)"
            value={phone}
            maxLength={13}
            autoComplete="tel"
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePhoneLogin()}
            disabled={busy}
          />
          <button
            type="button"
            className="login-social login-social--phone"
            onClick={handlePhoneLogin}
            disabled={busy || !phoneValid}
          >
            {busy ? "시작하는 중…" : "휴대폰 번호로 시작하기"}
          </button>
          <button
            type="button"
            className="login-social login-social--kakao"
            onClick={startKakaoLogin}
            disabled={busy}
          >
            카카오로 계속하기
          </button>
          <button
            type="button"
            className="login-page__guest"
            onClick={handleGuest}
            disabled={busy}
          >
            게스트로 둘러보기
          </button>
        </div>
      </div>
    </main>
  );
}

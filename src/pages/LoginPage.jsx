import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { guestLogin } from "@api/auth";
import { getMe } from "@api/user";
import { useAuthStore } from "@store/authStore";
import Button from "@components/common/Button";

/**
 * LoginPage — 여운 브랜딩 + 게스트 시작 버튼.
 * guestLogin() 으로 쿠키 세팅 → getMe() 로 사용자 로드 → authStore 세팅 → /yeowun.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuthed, setUser } = useAuthStore();
  const [status, setStatus] = useState("idle"); // idle | loading | error

  const handleGuest = async () => {
    setStatus("loading");
    try {
      const res = await guestLogin();
      if (res?.meta?.result !== "SUCCESS") {
        setStatus("error");
        return;
      }
      // 쿠키 세팅 확인 겸 사용자 정보 로드
      try {
        const me = await getMe();
        if (me?.meta?.result === "SUCCESS") setUser(me.data);
      } catch {
        // getMe 실패해도 게스트 세션은 유효하므로 진행
      }
      setAuthed(true);
      navigate("/yeowun", { replace: true });
    } catch (err) {
      console.error("게스트 로그인 실패:", err);
      setStatus("error");
    }
  };

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
          시작하지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      )}

      <div className="login-page__actions">
        <Button block onClick={handleGuest} disabled={status === "loading"}>
          {status === "loading" ? "시작하는 중…" : "게스트로 시작하기"}
        </Button>
      </div>
    </main>
  );
}

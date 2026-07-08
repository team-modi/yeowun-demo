import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getMe } from "@api/user";
import { useAuthStore } from "@store/authStore";
import Spinner from "@components/common/Spinner";

/**
 * RequireAuth — 라우트 가드.
 * 마운트 시 getMe() 로 세션 검증(쿠키 기반). 성공 → authStore 세팅 후 자식 렌더,
 * 실패(401 등) → /login 리다이렉트. 이미 authed 면 재검증 없이 통과(자식이 사용).
 */
export default function RequireAuth() {
  const { authed, setAuthed, setUser } = useAuthStore();
  const [status, setStatus] = useState(authed ? "ok" : "checking");

  useEffect(() => {
    // authed 면 초기 status 가 이미 "ok" 이므로 재검증 생략
    if (authed) return;
    let alive = true;
    (async () => {
      try {
        const res = await getMe();
        if (!alive) return;
        if (res?.meta?.result === "SUCCESS") {
          setUser(res.data);
          setAuthed(true);
          setStatus("ok");
        } else {
          setStatus("fail");
        }
      } catch {
        if (alive) setStatus("fail");
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "checking") return <Spinner full />;
  if (status === "fail") return <Navigate to="/login" replace />;
  return <Outlet />;
}

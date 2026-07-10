import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@store/authStore";
import Spinner from "@components/common/Spinner";

/**
 * RequireAuth — 개인화 라우트 가드(기록·아카이브·프로필·리마인드·알림).
 * 세션 확인은 AppLayout 의 부트스트랩(getMe 1회)이 담당하고 authStore(checked/authed)에 반영한다.
 * - authed → 자식 렌더
 * - 아직 확인 전(checked=false) → 스피너
 * - 확인됐고 비로그인 → /login 으로 이동(로그인 후 원래 위치로 복귀하도록 redirect 전달)
 */
export default function RequireAuth() {
  const authed = useAuthStore((s) => s.authed);
  const checked = useAuthStore((s) => s.checked);
  const location = useLocation();

  if (authed) return <Outlet />;
  if (!checked) return <Spinner full />;

  const redirect = encodeURIComponent(location.pathname + location.search);
  return <Navigate to={`/login?redirect=${redirect}`} replace />;
}

import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { getMe } from "@api/user";
import { useAuthStore } from "@store/authStore";
import { setClarityTag } from "@utils/clarity";
import { resolveVariant } from "@utils/remindVariant";
import TopBar from "@components/common/TopBar";
import BottomNav from "@components/common/BottomNav";
import ToastHost from "@components/common/ToastHost";

/**
 * AppLayout — 모바일 셸: 상단바 + 컨텐츠(Outlet) + 하단 탭 + 토스트.
 * 상단바 제목/뒤로가기/종은 현재 경로 기준으로 결정한다(아래 resolveMeta).
 * 페이지는 컨텐츠만 렌더하면 되고, 필요 시 자체 TopBar 를 쓰려면 이 레이아웃 밖에서 구성.
 */
function resolveMeta(pathname, search) {
  if (pathname.startsWith("/exhibition/") && pathname !== "/exhibition") {
    return { title: "전시 상세", showBack: true, showBell: false };
  }
  // 기록 플로우의 "전시 직접 추가" 서브 단계(?step=add)는 와이어프레임 헤더 "전시 추가"를 쓴다.
  if (pathname === "/record" && new URLSearchParams(search).get("step") === "add") {
    return { title: "전시 추가", showBack: true, showBell: false, hideNav: true };
  }
  const map = {
    "/yeowun": { brand: "여운", title: "", showBack: false, showBell: true },
    "/exhibition": { title: "전시 탐색", showBack: false, showBell: true },
    "/record": { title: "기록 작성", showBack: true, showBell: false, hideNav: true },
    "/archive": { title: "아카이브", showBack: false, showBell: true },
    "/user": { title: "프로필", showBack: false, showBell: true },
    "/remind": { title: "오늘의 여운", showBack: true, showBell: false },
    "/notifications": { title: "알림", showBack: true, showBell: false },
  };
  return map[pathname] || { title: "여운", showBack: false, showBell: true };
}

export default function AppLayout() {
  const { pathname, search } = useLocation();
  const meta = resolveMeta(pathname, search);

  // 세션 부트스트랩(1회): 익명 탐색은 그대로 두되, 유효한 쿠키가 있으면 조용히 로그인 상태로 인식한다.
  // 실패(비로그인)해도 리다이렉트하지 않는다 — 강제 로그인은 RequireAuth(개인화 라우트)에서만.
  const checked = useAuthStore((s) => s.checked);
  const setAuthed = useAuthStore((s) => s.setAuthed);
  const setUser = useAuthStore((s) => s.setUser);
  const setChecked = useAuthStore((s) => s.setChecked);

  useEffect(() => {
    if (checked) return;
    let alive = true;
    (async () => {
      try {
        const me = await getMe();
        if (alive && me?.meta?.result === "SUCCESS") {
          setUser(me.data);
          setAuthed(true);
          // Clarity A/B 필터 태그 — 전화번호가 아닌 그룹 값만 전송(개인정보 미포함).
          setClarityTag("reminder_variant", resolveVariant({ userId: me.data?.userId }));
          setClarityTag("beta_test", "yeoun_beta_v1");
        }
      } catch {
        // 비로그인 — 익명으로 진행
      } finally {
        if (alive) setChecked(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [checked, setAuthed, setUser, setChecked]);

  return (
    <div className="app-layout">
      <TopBar
        title={meta.title}
        brand={meta.brand}
        showBack={meta.showBack}
        showBell={meta.showBell}
      />
      <main className={`app-layout__main ${meta.hideNav ? "app-layout__main--no-nav" : ""}`}>
        <Outlet />
      </main>
      {!meta.hideNav && <BottomNav />}
      <ToastHost />
    </div>
  );
}

import { Outlet, useLocation } from "react-router-dom";
import TopBar from "@components/common/TopBar";
import BottomNav from "@components/common/BottomNav";
import ToastHost from "@components/common/ToastHost";

/**
 * AppLayout — 모바일 셸: 상단바 + 컨텐츠(Outlet) + 하단 탭 + 토스트.
 * 상단바 제목/뒤로가기/종은 현재 경로 기준으로 결정한다(아래 resolveMeta).
 * 페이지는 컨텐츠만 렌더하면 되고, 필요 시 자체 TopBar 를 쓰려면 이 레이아웃 밖에서 구성.
 */
function resolveMeta(pathname) {
  if (pathname.startsWith("/exhibition/") && pathname !== "/exhibition") {
    return { title: "전시 상세", showBack: true, showBell: false };
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
  const { pathname } = useLocation();
  const meta = resolveMeta(pathname);

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

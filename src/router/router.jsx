import { createBrowserRouter, Navigate } from "react-router-dom";

import RequireAuth from "@router/RequireAuth";
import AppLayout from "@layout/AppLayout";

// pages
import LoginPage from "@pages/LoginPage";
import HomePage from "@pages/HomePage";
import ExhibitionPage from "@pages/ExhibitionPage";
import DetailExhibitionPage from "@pages/DetailExhibitionPage";
import RecordPage from "@pages/RecordPage";
import ArchivePage from "@pages/ArchivePage";
import UserPage from "@pages/UserPage";
import RemindPage from "@pages/RemindPage";
import NotificationPage from "@pages/NotificationPage";

// 랜딩 유저 플로우(B): 로그인 없이 홈·전시 탐색/상세를 둘러보고,
// 로그인은 기록 작성·아카이브·프로필·리마인드·알림 등 개인화 지점에서만 요구한다.
// AppLayout 이 모든 앱 화면을 감싸고(세션 부트스트랩·네비게이션 공유), RequireAuth 는 개인화 라우트만 가둔다.
export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/yeowun" replace /> },
  { path: "/login", element: <LoginPage /> },
  {
    element: <AppLayout />,
    children: [
      // 공개(익명 허용) — 랜딩·탐색
      { path: "/yeowun", element: <HomePage /> },
      { path: "/exhibition", element: <ExhibitionPage /> },
      { path: "/exhibition/:exhibitionId", element: <DetailExhibitionPage /> },
      // 로그인 필요 — 개인화
      {
        element: <RequireAuth />,
        children: [
          { path: "/record", element: <RecordPage /> },
          { path: "/archive", element: <ArchivePage /> },
          { path: "/user", element: <UserPage /> },
          { path: "/remind", element: <RemindPage /> },
          { path: "/notifications", element: <NotificationPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/yeowun" replace /> },
]);

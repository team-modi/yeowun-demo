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

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/yeowun" replace /> },
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/yeowun", element: <HomePage /> },
          { path: "/exhibition", element: <ExhibitionPage /> },
          { path: "/exhibition/:exhibitionId", element: <DetailExhibitionPage /> },
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

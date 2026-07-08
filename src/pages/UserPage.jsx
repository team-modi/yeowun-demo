import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "@styles/profile.css";

import { getMe, withdraw } from "@api/user";
import { logout } from "@api/auth";
import { useAuthStore } from "@store/authStore";
import { useUiStore } from "@store/uiStore";

import Spinner from "@components/common/Spinner";
import ErrorState from "@components/common/ErrorState";
import { BackIcon } from "@components/common/icons";

import ProfileHeader from "@components/profile/ProfileHeader";
import StorageCard from "@components/profile/StorageCard";
import KeywordsSection from "@components/profile/KeywordsSection";
import SettingsPanel from "@components/profile/SettingsPanel";
import ProfileEditForm from "@components/profile/ProfileEditForm";
import RecordsSection from "@components/profile/RecordsSection";
import BookmarksSection from "@components/profile/BookmarksSection";
import { GearIcon } from "@components/profile/icons";

/**
 * UserPage — [06] 프로필 (/user)
 * 라우터 하위경로 없이 인페이지 뷰 전환:
 *   main | settings | edit | records | bookmarks
 */
const SUBVIEWS = {
  settings: "설정",
  edit: "프로필 수정",
  records: "기록한 전시",
  bookmarks: "관심 전시",
};

export default function UserPage() {
  const navigate = useNavigate();
  const toast = useUiStore((st) => st.toast);
  const clear = useAuthStore((st) => st.clear);
  const setUser = useAuthStore((st) => st.setUser);

  const [me, setMe] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [view, setView] = useState("main");
  const [busy, setBusy] = useState(false);

  const loadMe = async () => {
    setStatus("loading");
    try {
      const res = await getMe();
      if (res?.meta?.result === "SUCCESS") {
        setMe(res.data);
        setUser(res.data);
        setStatus("ready");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) loadMe();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProfileUpdated = (data) => {
    // 응답 data는 stats/tasteKeywords 미포함일 수 있어 병합해 유지
    setMe((prev) => ({ ...prev, ...data }));
    setUser({ ...(me ?? {}), ...data });
    setView("main");
  };

  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await logout();
    } catch {
      // 서버 실패해도 클라 세션은 정리
    } finally {
      clear();
      navigate("/login", { replace: true });
    }
  };

  const handleWithdraw = async () => {
    if (busy) return;
    const ok = window.confirm(
      "정말 탈퇴하시겠어요?\n기록과 관심 전시가 모두 삭제되며 되돌릴 수 없어요.",
    );
    if (!ok) return;

    setBusy(true);
    try {
      const res = await withdraw();
      if (res?.meta?.result === "SUCCESS") {
        clear();
        navigate("/login", { replace: true });
      } else {
        toast(res?.meta?.message || "탈퇴에 실패했어요.", "error");
        setBusy(false);
      }
    } catch {
      toast("탈퇴에 실패했어요. 잠시 후 다시 시도해 주세요.", "error");
      setBusy(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="page">
        <Spinner full />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="page">
        <ErrorState title="프로필을 불러오지 못했어요" onRetry={loadMe} />
      </div>
    );
  }

  // ---- 하위 뷰(뒤로가기 서브헤더 포함) ----
  if (view !== "main") {
    return (
      <div className="page pf-page">
        <div className="pf-subhead">
          <button
            type="button"
            className="pf-subhead__back"
            aria-label="뒤로"
            onClick={() => setView("main")}
          >
            <BackIcon />
          </button>
          <h2 className="pf-subhead__title">{SUBVIEWS[view]}</h2>
          <span className="pf-subhead__spacer" aria-hidden="true" />
        </div>

        {view === "settings" && (
          <SettingsPanel
            onLogout={handleLogout}
            onWithdraw={handleWithdraw}
            busy={busy}
          />
        )}
        {view === "edit" && (
          <ProfileEditForm me={me} onUpdated={handleProfileUpdated} />
        )}
        {view === "records" && <RecordsSection />}
        {view === "bookmarks" && <BookmarksSection />}
      </div>
    );
  }

  // ---- 메인 뷰 ----
  return (
    <div className="page pf-page">
      <div className="pf-toolbar">
        <button
          type="button"
          className="pf-toolbar__gear"
          aria-label="설정"
          onClick={() => setView("settings")}
        >
          <GearIcon size={22} />
        </button>
      </div>

      <ProfileHeader me={me} onEdit={() => setView("edit")} />

      <StorageCard
        stats={me?.stats}
        onOpenRecords={() => setView("records")}
        onOpenBookmarks={() => setView("bookmarks")}
      />

      <KeywordsSection keywords={me?.tasteKeywords} />
    </div>
  );
}

import { useEffect, useState } from "react";

import {
  getNotificationSettings,
  updateNotificationSettings,
} from "@api/user";
import { useUiStore } from "@store/uiStore";
import Spinner from "@components/common/Spinner";
import ErrorState from "@components/common/ErrorState";
import ToggleSwitch from "@components/profile/ToggleSwitch";

/**
 * NotificationSettings — 알림 설정(리마인드/공지 토글).
 * GET/PUT /users/me/notification-settings
 */
export default function NotificationSettings() {
  const toast = useUiStore((st) => st.toast);
  const [settings, setSettings] = useState(null); // {remindEnabled, noticeEnabled}
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setStatus("loading");
    try {
      const res = await getNotificationSettings();
      if (res?.meta?.result === "SUCCESS") {
        setSettings(res.data);
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
      if (!cancelled) load();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = async (key, next) => {
    const prev = settings;
    const optimistic = { ...settings, [key]: next };
    setSettings(optimistic);
    setSaving(true);
    try {
      const res = await updateNotificationSettings({
        remindEnabled: optimistic.remindEnabled,
        noticeEnabled: optimistic.noticeEnabled,
      });
      if (res?.meta?.result === "SUCCESS") {
        setSettings(res.data);
        toast("알림 설정을 저장했어요.", "success");
      } else {
        setSettings(prev);
        toast("저장에 실패했어요.", "error");
      }
    } catch {
      setSettings(prev);
      toast("저장에 실패했어요. 다시 시도해 주세요.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading") return <Spinner />;
  if (status === "error" || !settings)
    return (
      <ErrorState title="알림 설정을 불러오지 못했어요" onRetry={load} />
    );

  return (
    <div className="pf-toggles">
      <ToggleSwitch
        label="리마인드 알림"
        description="다녀온 전시의 여운을 다시 꺼내볼 때 알려드려요."
        checked={!!settings.remindEnabled}
        disabled={saving}
        onChange={(next) => handleChange("remindEnabled", next)}
      />
      <ToggleSwitch
        label="공지 알림"
        description="서비스 소식과 공지를 받아요."
        checked={!!settings.noticeEnabled}
        disabled={saving}
        onChange={(next) => handleChange("noticeEnabled", next)}
      />
    </div>
  );
}

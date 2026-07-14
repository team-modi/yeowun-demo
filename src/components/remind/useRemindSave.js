import { useState } from "react";
import { saveRemind } from "@api/remind";
import { trackClarityEvent } from "@utils/clarity";
import { useUiStore } from "@store/uiStore";

/**
 * useRemindSave — 오늘의 여운 저장 로직(A·B 플로우 공용).
 * SaveRequest: { recordId(필수), emotionCodes(선택), reflection(필수, ≤300) }
 *
 * @param {object} candidate  CandidateResponse (recordId 사용)
 * @returns {{ saving: boolean, summary: object|null, save: (reflection: string, emotions: string[]) => Promise<void> }}
 */
export default function useRemindSave(candidate) {
  const toast = useUiStore((s) => s.toast);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState(null);

  const save = async (reflection, emotions) => {
    const text = (reflection || "").trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      const body = {
        recordId: candidate.recordId,
        emotionCodes: emotions || [],
        reflection: text,
      };
      const { data } = await saveRemind(body);
      trackClarityEvent("reminder_reentry_saved"); // Clarity: 저장 API 성공 후
      setSummary(data);
      toast("오늘의 여운을 남겼어요", "success");
    } catch (err) {
      const msg = err?.response?.data?.meta?.message || "저장에 실패했어요. 잠시 후 다시 시도해 주세요.";
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return { saving, summary, save };
}

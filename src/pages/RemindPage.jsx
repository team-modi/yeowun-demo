import { useCallback, useEffect, useState } from "react";
import { getCandidate, getRemindList } from "@api/remind";
import Spinner from "@components/common/Spinner";
import ErrorState from "@components/common/ErrorState";
import EmptyState from "@components/common/EmptyState";
import TodayRemind from "@components/remind/TodayRemind";
import RemindListItem from "@components/remind/RemindListItem";
import RemindDetailPanel from "@components/remind/RemindDetailPanel";
import "@styles/remind.css";

/**
 * RemindPage — [07] 리마인드 (/remind)
 * 진입 시 병렬 2콜: 오늘의 여운 후보(getCandidate) + 저장된 리마인드 목록(getRemindList).
 * 후보에 감정 다시 남기기 → saveRemind → 변화 요약. 목록 탭 → 상세 인페이지 시트.
 */
export default function RemindPage() {
  const [candidate, setCandidate] = useState(null);
  const [reminds, setReminds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null); // 상세 시트 대상 remindId

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [candRes, listRes] = await Promise.all([getCandidate(), getRemindList()]);
      setCandidate(candRes?.data ?? null);
      setReminds(listRes?.data?.content ?? []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 마이크로태스크로 지연시켜 effect 내 동기 setState 를 피한다.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  // 저장 성공 시 목록 갱신(최신 반영).
  const handleSaved = useCallback(async () => {
    try {
      const listRes = await getRemindList();
      setReminds(listRes?.data?.content ?? []);
    } catch {
      /* 목록 갱신 실패는 조용히 무시(저장 자체는 성공) */
    }
  }, []);

  if (loading) return <Spinner full />;
  if (error) return <ErrorState onRetry={load} />;

  return (
    <div className="remind">
      <section className="remind__section">
        <h2 className="remind__title">오늘의 여운</h2>
        {candidate ? (
          <TodayRemind candidate={candidate} onSaved={handleSaved} />
        ) : (
          <EmptyState
            title="오늘의 리마인드가 없어요"
            description="기록을 남기면 일주일 뒤, 다시 마주할 여운을 준비해 드려요."
          />
        )}
      </section>

      <section className="remind__section">
        <h2 className="remind__title">지나온 여운</h2>
        {reminds.length === 0 ? (
          <p className="remind__empty">아직 감정 변화를 저장한 여운이 없어요.</p>
        ) : (
          <ul className="remind-list">
            {reminds.map((item) => (
              <li key={item.remindId}>
                <RemindListItem item={item} onOpen={setOpenId} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {openId != null && (
        <RemindDetailPanel remindId={openId} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { getRemindDetail } from "@api/remind";
import Spinner from "@components/common/Spinner";
import ErrorState from "@components/common/ErrorState";
import RemindDetailView from "@components/remind/RemindDetailView";
import RemindEntrySheet from "@components/remind/RemindEntrySheet";

/**
 * RemindDetailPanel — 목록 탭 시 상세(SummaryResponse)를 인페이지 시트로 표시.
 * 라우트를 추가하지 않고 오버레이 패널로만 렌더.
 * 본문은 RemindDetailView(안내문 + 전시 카드 + 그날의 여운/다시 남긴 여운 카드),
 * 카드 탭 시 RemindEntrySheet(중첩 바텀시트)로 전문을 연다.
 * props: { remindId, onClose }
 */
export default function RemindDetailPanel({ remindId, onClose }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [entry, setEntry] = useState(null); // 중첩 시트 대상(그날의 여운/다시 남긴 여운)

  const fetchDetail = useCallback(() => {
    setLoading(true);
    setError(null);
    return getRemindDetail(remindId)
      .then((res) => setSummary(res.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [remindId]);

  // 마이크로태스크로 지연시켜 effect 내 동기 setState 를 피한다.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) fetchDetail();
    });
    return () => {
      cancelled = true;
    };
  }, [fetchDetail]);

  return (
    <>
      <div className="detail-overlay" role="dialog" aria-modal="true" onClick={onClose}>
        <div className="detail-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="detail-sheet__head">
            <p className="detail-sheet__title">리마인드 상세</p>
            <button
              type="button"
              className="detail-sheet__close"
              aria-label="닫기"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          <div className="detail-sheet__body">
            {loading && <Spinner />}
            {!loading && error && <ErrorState onRetry={fetchDetail} />}
            {!loading && !error && summary && (
              <RemindDetailView summary={summary} onOpenEntry={setEntry} />
            )}
          </div>
        </div>
      </div>

      {entry && (
        <RemindEntrySheet
          title={entry.title}
          metaLabel={entry.metaLabel}
          emotionCodes={entry.emotionCodes}
          text={entry.text}
          onClose={() => setEntry(null)}
        />
      )}
    </>
  );
}

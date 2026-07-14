import { fmtDate, fmtDateSpaced, remindElapsedPhrase } from "@components/remind/utils";

const MAX_CHIPS = 3; // 카드에 노출할 감정칩 수(초과분 +N)

/**
 * RemindDetailView — 리마인드 상세 본문(카드 레이아웃).
 * 안내문 + 전시 카드 + 그날의 여운 카드 + ↓ + 다시 남긴 여운 카드 (+ AI 요약, 있을 때만).
 * 두 감상 카드는 탭하면 onOpenEntry(entry) 로 중첩 시트를 연다.
 *
 * summary(SummaryResponse): {
 *   createdAt,
 *   exhibition: { title, posterUrl, place, viewedAt },
 *   before: { text, emotionCodes[] },  // 그날의 여운(원본 기록)
 *   after:  { text, emotionCodes[] },  // 다시 남긴 여운(리마인드 기록)
 *   aiSummary: string | null
 * }
 * props: { summary, onOpenEntry: (entry) => void }
 */
export default function RemindDetailView({ summary, onOpenEntry }) {
  const { exhibition, before, after, createdAt, aiSummary } = summary;
  const viewedAt = exhibition?.viewedAt;
  const elapsed = remindElapsedPhrase(viewedAt, createdAt);

  const beforeEntry = {
    title: "그날의 여운",
    metaLabel: `${fmtDate(viewedAt)} · 원본 기록`,
    emotionCodes: before?.emotionCodes,
    text: before?.text,
  };
  const afterEntry = {
    title: "다시 남긴 여운",
    metaLabel: `${fmtDate(createdAt)} · 리마인드 기록`,
    emotionCodes: after?.emotionCodes,
    text: after?.text,
  };

  return (
    <div className="remind-detail">
      <p className="remind-detail__lead">
        {elapsed ? (
          <>
            첫 기록을 남긴 지 {elapsed} 뒤,
            <br />
            다시 떠오른 여운을 기록했어요
          </>
        ) : (
          "다시 떠오른 여운을 기록했어요"
        )}
      </p>

      {/* 전시 카드(가로) */}
      <div className="remind-exh-card">
        <div className="remind-exh-card__poster">
          {exhibition?.posterUrl ? (
            <img src={exhibition.posterUrl} alt="" loading="lazy" />
          ) : (
            <span className="remind-exh-card__poster-empty">전시 포스터</span>
          )}
        </div>
        <div className="remind-exh-card__info">
          <p className="remind-exh-card__title">{exhibition?.title}</p>
          {viewedAt && <p className="remind-exh-card__date">{fmtDateSpaced(viewedAt)}</p>}
        </div>
      </div>

      {/* 그날의 여운(원본 기록) */}
      <EntryCard
        date={fmtDateSpaced(viewedAt)}
        title="그날의 여운"
        emotionCodes={before?.emotionCodes}
        preview={before?.text}
        onClick={() => onOpenEntry(beforeEntry)}
      />

      <div className="remind-detail__arrow" aria-hidden="true">
        ↓
      </div>

      {/* 다시 남긴 여운(리마인드 기록) */}
      <EntryCard
        date={fmtDateSpaced(createdAt)}
        title="다시 남긴 여운"
        emotionCodes={after?.emotionCodes}
        preview={after?.text}
        onClick={() => onOpenEntry(afterEntry)}
      />

      {/* AI 요약 — 실제 요약이 있을 때만 노출(없으면 목업처럼 생략) */}
      {aiSummary && (
        <div className="ai-summary">
          <p className="ai-summary__label">AI가 본 변화</p>
          <p className="ai-summary__text">{aiSummary}</p>
        </div>
      )}
    </div>
  );
}

// 감상 카드(탭 → 중첩 시트). 감정칩은 앞 3개 + "+N".
function EntryCard({ date, title, emotionCodes, preview, onClick }) {
  const codes = emotionCodes || [];
  const shown = codes.slice(0, MAX_CHIPS);
  const overflow = codes.length - shown.length;

  return (
    <button type="button" className="remind-entry-card" onClick={onClick}>
      {date && <p className="remind-entry-card__date">{date}</p>}
      <p className="remind-entry-card__title">{title}</p>
      {codes.length > 0 && (
        <ul className="remind-entry-card__chips">
          {shown.map((code, i) => (
            <li key={`${code}-${i}`} className="emotion-chip">
              {code}
            </li>
          ))}
          {overflow > 0 && <li className="emotion-chip emotion-chip--more">+{overflow}</li>}
        </ul>
      )}
      {preview && <p className="remind-entry-card__preview">{preview}</p>}
    </button>
  );
}

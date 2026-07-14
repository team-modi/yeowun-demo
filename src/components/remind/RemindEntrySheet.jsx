import EmotionChips from "@components/remind/EmotionChips";

/**
 * RemindEntrySheet — 리마인드 상세에서 카드를 탭했을 때 뜨는 중첩 바텀시트.
 * 그날의 여운(원본 기록) / 다시 남긴 여운(리마인드 기록)의 전문을 보여준다.
 *
 * props: {
 *   title: string,       // "그날의 여운" | "다시 남긴 여운"
 *   metaLabel: string,   // "2026.07.03 · 원본 기록"
 *   emotionCodes?: string[],
 *   text?: string,
 *   onClose: () => void
 * }
 */
export default function RemindEntrySheet({ title, metaLabel, emotionCodes, text, onClose }) {
  return (
    <div className="detail-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="entry-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="entry-sheet__handle" aria-hidden="true" />
        <div className="entry-sheet__body">
          <p className="entry-sheet__title">{title}</p>
          <p className="entry-sheet__meta">{metaLabel}</p>
          <EmotionChips codes={emotionCodes} tone="muted" />
          {text ? (
            <p className="entry-sheet__text">{text}</p>
          ) : (
            <p className="entry-sheet__text entry-sheet__text--empty">남긴 글이 없어요.</p>
          )}
        </div>
      </div>
    </div>
  );
}

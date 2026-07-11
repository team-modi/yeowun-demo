import EmotionChips from "@components/remind/EmotionChips";
import { fmtDate } from "@components/remind/utils";

/**
 * RemindListItem — 저장된 리마인드 목록 항목(ListItemResponse).
 * item: {
 *   remindId, recordId, createdAt, exhibitionTitle, posterUrl, place, viewedAt,
 *   reflectionPreview, emotionCodes[](=after), beforeEmotionCodes[](원본 기록 감정 —
 *   아카이브 리마인드 탭의 감정 변화 필터 판별용, 여기선 미표시), aiStatus, hasAiSummary
 * }
 * props: { item, onOpen: (remindId) => void }
 */
export default function RemindListItem({ item, onOpen }) {
  return (
    <button type="button" className="remind-item" onClick={() => onOpen(item.remindId)}>
      <div className="remind-item__poster">
        {item.posterUrl ? (
          <img src={item.posterUrl} alt="" loading="lazy" />
        ) : (
          <span className="remind-item__poster--empty">이미지 없음</span>
        )}
      </div>

      <div className="remind-item__body">
        <p className="remind-item__title">{item.exhibitionTitle}</p>
        <p className="remind-item__meta">
          {[item.place, item.viewedAt && `관람 ${fmtDate(item.viewedAt)}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {item.reflectionPreview && (
          <p className="remind-item__preview">{item.reflectionPreview}</p>
        )}
        <EmotionChips codes={item.emotionCodes} tone="accent" />
      </div>

      {item.hasAiSummary && <span className="remind-item__ai">AI 요약</span>}
    </button>
  );
}

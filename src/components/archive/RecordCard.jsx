import { formatShortDate } from "@components/archive/format";

/**
 * RecordCard — 아카이브 기록 그리드 카드(wf-13: 포스터 + 날짜 + 제목 + 감정칩).
 * props:
 *   item: RecordListItem {
 *     recordId, thumbnailUrl, exhibitionPosterUrl, exhibitionTitle,
 *     viewedAt, representativeEmotion, emotionCodes?[], bookmarked, ...
 *   }
 *   onOpen: (recordId) => void   — 카드 클릭 시 상세 열기
 *
 * ※ 목록 DTO(RecordListItemResponse)는 emotionCodes 배열이 없고 대표 감정
 *   (representativeEmotion) 단일 값만 준다. 배열이 오면 최대 3개, 아니면
 *   대표 감정 1개를 칩으로 노출한다.
 */
export default function RecordCard({ item, onOpen }) {
  if (!item) return null;
  const {
    recordId,
    thumbnailUrl,
    exhibitionPosterUrl,
    exhibitionTitle,
    viewedAt,
    emotionCodes,
    representativeEmotion,
    bookmarked,
  } = item;

  const image = thumbnailUrl || exhibitionPosterUrl || null;
  const emotions = Array.isArray(emotionCodes) && emotionCodes.length > 0
    ? emotionCodes.slice(0, 3)
    : representativeEmotion
      ? [representativeEmotion]
      : [];

  return (
    <button
      type="button"
      className="rec-card"
      onClick={() => onOpen?.(recordId)}
      aria-label={`${exhibitionTitle ?? "기록"} 상세 보기`}
    >
      <div className="rec-card__thumb-wrap">
        {image ? (
          <img className="rec-card__thumb" src={image} alt="" loading="lazy" />
        ) : (
          <div className="rec-card__thumb--empty">이미지 없음</div>
        )}
        {bookmarked && <span className="rec-card__mark" aria-hidden="true" />}
      </div>

      <div className="rec-card__body">
        {viewedAt && <p className="rec-card__date">{formatShortDate(viewedAt)}</p>}
        <p className="rec-card__title">{exhibitionTitle || "제목 없는 전시"}</p>
        {emotions.length > 0 && (
          <div className="rec-card__emotions">
            {emotions.map((e) => (
              <span key={e} className="rec-chip">
                {e}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

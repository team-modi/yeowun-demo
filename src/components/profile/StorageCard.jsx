import { TicketIcon, HeartIcon } from "@components/profile/icons";

/**
 * StorageCard — "내 전시 보관함" 두 타일(다녀온 전시 / 관심 전시).
 * props: { stats, onOpenRecords, onOpenBookmarks }
 *   stats = { recordCount, exhibitionCount, bookmarkCount }
 */
export default function StorageCard({
  stats,
  onOpenRecords,
  onOpenBookmarks,
}) {
  const s = stats ?? {};
  const visited = s.recordCount ?? s.exhibitionCount ?? 0;
  const bookmarks = s.bookmarkCount ?? 0;

  return (
    <section className="pf-storage">
      <h2 className="pf-storage__title">내 전시 보관함</h2>
      <div className="pf-storage__row">
        <button type="button" className="pf-tile" onClick={onOpenRecords}>
          <span className="pf-tile__icon" aria-hidden="true">
            <TicketIcon size={24} />
          </span>
          <span className="pf-tile__label">다녀온 전시</span>
          <span className="pf-tile__value">{visited}</span>
        </button>
        <button type="button" className="pf-tile" onClick={onOpenBookmarks}>
          <span className="pf-tile__icon pf-tile__icon--heart" aria-hidden="true">
            <HeartIcon size={24} filled />
          </span>
          <span className="pf-tile__label">관심 전시</span>
          <span className="pf-tile__value">{bookmarks}</span>
        </button>
      </div>
    </section>
  );
}

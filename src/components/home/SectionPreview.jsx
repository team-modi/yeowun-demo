import { Link } from "react-router-dom";
import ExhibitionCard from "@components/common/ExhibitionCard";

/**
 * SectionPreview — 홈 섹션 미리보기(카드 미리보기 + 전체보기).
 * props:
 *   title: string
 *   section: "ending-soon" | "opening-this-month" | "free"
 *   items: ExhibitionListItem[]
 *   onToggleBookmark: (item) => void
 *   variant: "list" | "grid"  — 카드 표현(가로 행 / 포스터 타일). 기본 "list".
 */
export default function SectionPreview({
  title,
  section,
  items = [],
  onToggleBookmark,
  variant = "list",
  showOpenDate = false,
}) {
  const shown = items.slice(0, 2);

  return (
    <section className="home-section">
      <div className="home-section__head">
        <h2 className="home-section__title">{title}</h2>
        <Link className="home-section__more" to={`/exhibition?section=${section}`}>
          전체보기
        </Link>
      </div>

      {shown.length === 0 ? (
        <p className="home-section__empty">아직 표시할 전시가 없어요.</p>
      ) : (
        <div className={variant === "grid" ? "grid-2" : "home-section__list"}>
          {shown.map((item) => (
            <ExhibitionCard
              key={item.exhibitionId}
              item={item}
              variant={variant}
              showOpenDate={showOpenDate}
              onToggleBookmark={onToggleBookmark}
            />
          ))}
        </div>
      )}
    </section>
  );
}

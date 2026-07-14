import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@store/authStore";
import { BookmarkIcon } from "@components/common/icons";

/**
 * ExhibitionCard — 전시 카드. 두 가지 변형(variant)을 지원한다.
 *
 * props:
 *   item: ExhibitionListItem
 *     { exhibitionId,title,posterUrl,place,startDate,endDate,artistSummary,dDay,free,bookmarked, ... }
 *   onToggleBookmark?: (item) => void  — 북마크 버튼 클릭 시 호출(카드 이동과 분리). 없으면 버튼 미표시.
 *   to?: string                        — 링크 대상(기본 /exhibition/{id}). null 이면 링크 없이 정적 카드.
 *   variant?: "grid" | "list"          — 기본 "grid".
 *     - "grid": 포스터 타일(큰 이미지 + 배지 오버레이 + 제목/장소 하단). wf-03 "이번 달"/wf-13 아카이브.
 *     - "list": 가로 행(좌측 80px 썸네일 + D-day·무료 배지 + 제목/작가/장소/기간). wf-03 "곧 끝나기"/wf-05.
 */
export default function ExhibitionCard({
  item,
  onToggleBookmark,
  to,
  variant = "grid",
  showOpenDate = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const authed = useAuthStore((s) => s.authed);

  if (!item) return null;
  const {
    exhibitionId,
    title,
    posterUrl,
    place,
    startDate,
    endDate,
    artistSummary,
    dDay,
    free,
    bookmarked,
  } = item;

  const href = to === undefined ? `/exhibition/${exhibitionId}` : to;

  // 마감 임박 배지 — 시안 01의 "N일 후 종료" 문구
  const ddayLabel =
    typeof dDay === "number"
      ? dDay === 0
        ? "오늘 종료"
        : dDay > 0
          ? `${dDay}일 후 종료`
          : "종료"
      : null;

  const fmtDate = (d) => (d ? String(d).slice(0, 10).replace(/-/g, ".") : "");
  const dateRange =
    startDate && endDate
      ? `${fmtDate(startDate)} ~ ${fmtDate(endDate)}`
      : fmtDate(startDate) || fmtDate(endDate);

  // "이번 달 새로 열리는 전시" 그리드 카드 전용 오픈 배지 — 시안 01의 "N일 후 오픈" 문구.
  // (이미 오픈했거나 날짜 계산이 불가하면 "M.D 오픈" 표기로 폴백)
  const openDateLabel = (() => {
    if (!showOpenDate || !startDate) return null;
    const parts = String(startDate).slice(0, 10).split("-");
    if (parts.length < 3) return null;
    const start = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2])
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((start - today) / 86400000);
    if (Number.isFinite(diff)) {
      if (diff > 0) return `${diff}일 후 오픈`;
      if (diff === 0) return "오늘 오픈";
    }
    return `${Number(parts[1])}.${Number(parts[2])} 오픈`;
  })();

  const bookmarkBtn = onToggleBookmark && (
    <button
      type="button"
      className={`exh-card__bookmark ${bookmarked ? "is-on" : ""}`}
      aria-pressed={!!bookmarked}
      aria-label={bookmarked ? "관심 해제" : "관심 등록"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // 관심 등록은 로그인 필요 — 비로그인은 로그인 화면으로 보내고 이후 원래 위치로 복귀.
        if (!authed) {
          const redirect = encodeURIComponent(location.pathname + location.search);
          navigate(`/login?redirect=${redirect}`);
          return;
        }
        onToggleBookmark(item);
      }}
    >
      <BookmarkIcon size={18} filled={!!bookmarked} />
    </button>
  );

  // "이번 달 새로 열리는 전시"(showOpenDate) 카드는 오픈일 배지만 쓰고 D-day 배지는 숨긴다(와이어프레임 미포함).
  const showDday = ddayLabel && !showOpenDate;
  const badges = (showDday || free) && (
    <div
      className={`exh-card__badges ${variant === "list" ? "exh-card__badges--inline" : ""}`}
    >
      {showDday && <span className="badge badge--dday">{ddayLabel}</span>}
      {free && <span className="badge badge--free">무료</span>}
    </div>
  );

  let inner;
  if (variant === "list") {
    inner = (
      <>
        <div className="exh-card__thumb">
          {posterUrl ? (
            <img
              className="exh-card__poster"
              src={posterUrl}
              alt=""
              loading="lazy"
            />
          ) : (
            <div className="exh-card__poster--empty">이미지 없음</div>
          )}
        </div>

        <div className="exh-card__row-body">
          <p className="exh-card__title">{title}</p>
          {artistSummary && (
            <p className="exh-card__meta">{artistSummary}</p>
          )}
          {place && <p className="exh-card__place">{place}</p>}
          {dateRange && <p className="exh-card__date">{dateRange}</p>}
          {badges}
        </div>

        {bookmarkBtn}
      </>
    );
  } else {
    inner = (
      <>
        <div className="exh-card__poster-wrap">
          {posterUrl ? (
            <img
              className="exh-card__poster"
              src={posterUrl}
              alt=""
              loading="lazy"
            />
          ) : (
            <div className="exh-card__poster--empty">이미지 없음</div>
          )}

          {badges}
          {bookmarkBtn}
        </div>

        <div className="exh-card__body">
          <p className="exh-card__title">{title}</p>
          {place && <p className="exh-card__place">{place}</p>}
          {dateRange && <p className="exh-card__date">{dateRange}</p>}
          {openDateLabel && (
            <span className="exh-card__open">{openDateLabel}</span>
          )}
        </div>
      </>
    );
  }

  const cls = `card exh-card exh-card--${variant}`;

  if (href) {
    return (
      <Link to={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}

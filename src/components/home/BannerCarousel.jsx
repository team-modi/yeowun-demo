import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * BannerCarousel — 홈 상단 배너(최대 3).
 * 5초마다 자동 전환(setInterval, 언마운트/개수변경 시 clear) + 수동 스와이프 + 도트.
 * props:
 *   banners: [{exhibitionId,title,bannerImageUrl,startDate,endDate,place}]
 * 비어 있으면 아무것도 렌더하지 않는다.
 * 탭 → /exhibition/{exhibitionId}
 */
const AUTO_MS = 5000;

function formatRange(startDate, endDate) {
  // "2026-05-28" | ISO → "05.28"
  const fmt = (d) => {
    if (!d) return "";
    const s = String(d).slice(0, 10);
    const parts = s.split("-");
    if (parts.length < 3) return s;
    return `${parts[1]}.${parts[2]}`;
  };
  const a = fmt(startDate);
  const b = fmt(endDate);
  if (a && b) return `${a} - ${b}`;
  return a || b || "";
}

export default function BannerCarousel({ banners = [] }) {
  const navigate = useNavigate();
  const list = banners.slice(0, 3);
  const count = list.length;

  const [index, setIndex] = useState(0);
  // 배너 수가 줄어들어도 안전하게 표시(effect 없이 파생).
  const active = count > 0 ? ((index % count) + count) % count : 0;

  // 5초 자동 전환 (배너 2개 이상일 때만).
  useEffect(() => {
    if (count <= 1) return undefined;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [count]);

  // 수동 스와이프.
  const startX = useRef(null);
  const draggedRef = useRef(false);

  const onTouchStart = useCallback((e) => {
    startX.current = e.touches[0].clientX;
    draggedRef.current = false;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (startX.current == null) return;
    if (Math.abs(e.touches[0].clientX - startX.current) > 10) {
      draggedRef.current = true;
    }
  }, []);

  const onTouchEnd = useCallback(
    (e) => {
      if (startX.current == null || count <= 1) return;
      const dx = e.changedTouches[0].clientX - startX.current;
      const threshold = 40;
      if (dx > threshold) setIndex((i) => (i - 1 + count) % count);
      else if (dx < -threshold) setIndex((i) => (i + 1) % count);
      startX.current = null;
    },
    [count],
  );

  // 스와이프 후 발생하는 유령 클릭이 이동을 트리거하지 않도록 캡처 단계에서 차단.
  const onClickCapture = useCallback((e) => {
    if (draggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      draggedRef.current = false;
    }
  }, []);

  if (count === 0) return null;

  return (
    <div className="banner-carousel" aria-label="추천 전시 배너" aria-roledescription="carousel">
      <div
        className="banner-track"
        style={{ transform: `translateX(-${active * 100}%)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClickCapture={onClickCapture}
      >
        {list.map((b, i) => {
          const range = formatRange(b.startDate, b.endDate);
          return (
            <button
              key={b.exhibitionId}
              type="button"
              className="banner-slide"
              aria-hidden={i !== active}
              tabIndex={i === active ? 0 : -1}
              onClick={() => navigate(`/exhibition/${b.exhibitionId}`)}
            >
              {b.bannerImageUrl ? (
                <img
                  className="banner-slide__img"
                  src={b.bannerImageUrl}
                  alt=""
                  loading={i === 0 ? "eager" : "lazy"}
                />
              ) : (
                <div className="banner-slide__img--empty">이미지 없음</div>
              )}
              <div className="banner-slide__overlay">
                <p className="banner-slide__title">{b.title}</p>
                {range && <p className="banner-slide__date">{range}</p>}
                {b.place && <p className="banner-slide__place">{b.place}</p>}
              </div>
            </button>
          );
        })}
      </div>

      {count > 1 && (
        <div className="banner-dots" role="tablist" aria-label="배너 선택">
          {list.map((b, i) => (
            <button
              key={b.exhibitionId}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`${i + 1}번째 배너`}
              className={`banner-dot ${i === active ? "is-active" : ""}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

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

/* 배너 메타(날짜/장소) 앞 작은 아이콘 — 흰색 라인, wf-03 정합 */
function CalendarGlyph() {
  return (
    <svg
      className="banner-slide__glyph"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 6.5h12M5.5 1.8v2.4M10.5 1.8v2.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function PinGlyph() {
  return (
    <svg
      className="banner-slide__glyph"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 14.5s5-4.13 5-8a5 5 0 0 0-10 0c0 3.87 5 8 5 8Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="6.3" r="1.8" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function formatRange(startDate, endDate) {
  // "2026-05-28" | ISO → "26.05.28" (시안 01: "26.06.26 ~ 26.09.30")
  const fmt = (d) => {
    if (!d) return "";
    const s = String(d).slice(0, 10);
    const parts = s.split("-");
    if (parts.length < 3) return s;
    return `${parts[0].slice(2)}.${parts[1]}.${parts[2]}`;
  };
  const a = fmt(startDate);
  const b = fmt(endDate);
  if (a && b) return `${a} ~ ${b}`;
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
  // active 를 의존성에 포함 → 슬라이드가 바뀔 때마다(자동/수동 무관) 인터벌을 걷어내고 새로 건다.
  // 덕분에 "수동으로 넘기면 5초 카운트다운이 처음부터" 가 자연히 만족된다(예: 4초에 넘겨도 다음 전환은 5초 뒤).
  useEffect(() => {
    if (count <= 1) return undefined;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [count, active]);

  // 수동 스와이프 — 포인터 이벤트로 마우스·터치·펜을 한 경로로 처리.
  const startX = useRef(null);
  const draggedRef = useRef(false);
  // pointerup 에서 탭 이동을 처리한 뒤 뒤따르는 합성 click 이 같은 곳으로 또 이동하는 것을 막는 플래그.
  const suppressClickRef = useRef(false);

  const onPointerDown = useCallback((e) => {
    // 마우스는 좌클릭(0)만. 터치·펜은 button===0 이라 통과.
    if (e.button != null && e.button !== 0) return;
    startX.current = e.clientX;
    draggedRef.current = false;
    // 포인터가 요소 밖으로 나가도 move/up 을 계속 받도록 캡처.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* 캡처 미지원 브라우저는 무시 */
    }
  }, []);

  const onPointerMove = useCallback((e) => {
    if (startX.current == null) return;
    if (Math.abs(e.clientX - startX.current) > 10) {
      draggedRef.current = true;
    }
  }, []);

  const onPointerEnd = useCallback(
    (e) => {
      if (startX.current == null) return;
      const dx = e.clientX - startX.current;
      startX.current = null;

      if (draggedRef.current) {
        // 스와이프 — 좌우 이동. (배너 1개면 넘길 곳이 없음)
        if (count <= 1) return;
        const threshold = 40;
        if (dx > threshold) setIndex((i) => (i - 1 + count) % count);
        else if (dx < -threshold) setIndex((i) => (i + 1) % count);
        return;
      }

      // 탭(드래그 아님) → 활성 배너 상세로 이동.
      // 트랙이 pointerdown 에서 setPointerCapture 를 걸어, 뒤따르는 click 이 내부 <button> 이 아니라
      // 트랙으로 리타깃되는 브라우저(Chrome 등)에선 버튼 onClick 이 뜨지 않는다 → 여기 pointerup 에서 직접 이동한다.
      const target = list[active];
      if (target) {
        suppressClickRef.current = true; // 뒤이어 오는 합성 click 의 중복 이동 방지
        navigate(`/exhibition/${target.exhibitionId}`);
      }
    },
    [count, active, list, navigate],
  );

  const onPointerCancel = useCallback(() => {
    startX.current = null;
  }, []);

  // 스와이프 후의 유령 클릭, 또는 pointerup 에서 이미 이동을 처리한 탭의 합성 클릭을 캡처 단계에서 차단.
  // (키보드 Enter/Space 로 인한 click 은 pointer 이벤트가 없어 두 플래그 모두 false → 버튼 onClick 정상 동작 = 접근성 유지)
  const onClickCapture = useCallback((e) => {
    if (draggedRef.current || suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      draggedRef.current = false;
      suppressClickRef.current = false;
    }
  }, []);

  if (count === 0) return null;

  return (
    <div className="banner-carousel" aria-label="추천 전시 배너" aria-roledescription="carousel">
      <div
        className="banner-track"
        style={{ transform: `translateX(-${active * 100}%)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerCancel}
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
                <div className="banner-slide__meta">
                  {b.place && (
                    <span className="banner-slide__meta-row">
                      <PinGlyph />
                      <span className="banner-slide__place">{b.place}</span>
                    </span>
                  )}
                  {range && (
                    <span className="banner-slide__meta-row">
                      <CalendarGlyph />
                      <span className="banner-slide__date">{range}</span>
                    </span>
                  )}
                </div>
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

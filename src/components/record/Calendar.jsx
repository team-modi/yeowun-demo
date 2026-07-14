import { useState } from "react";

import { toISO, todayISO } from "./constants";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * Calendar — 월 그리드(단일/범위 하이라이트). 순수 표시 + 날짜 클릭 콜백.
 * props: { start, end, onPick(iso) }
 *  - 단일 선택: start 만 전달(end=null) → start 강조
 *  - 범위 선택: start~end 강조(경계 채움, 사이 연결)
 * 범위 진행 로직(첫/둘째 클릭)은 상위에서 처리한다.
 */
export default function Calendar({ start = null, end = null, onPick }) {
  const [view, setView] = useState(() => {
    const base = start ? new Date(`${start}T00:00:00`) : new Date();
    return { y: base.getFullYear(), m: base.getMonth() };
  });
  const { y, m } = view;

  const firstWeekday = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  const prev = () => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  const next = () => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));

  const today = todayISO();

  const stateOf = (d) => {
    const cur = toISO(y, m, d);
    if (start && end) {
      if (cur === start || cur === end) return "edge";
      if (cur > start && cur < end) return "mid";
    } else if (start && cur === start) {
      return "edge";
    }
    return "";
  };

  return (
    <div className="rec-cal">
      <div className="rec-cal__head">
        <button type="button" className="rec-cal__nav" onClick={prev} aria-label="이전 달">
          ‹
        </button>
        <span className="rec-cal__title">
          {y}년 {m + 1}월
        </span>
        <button type="button" className="rec-cal__nav" onClick={next} aria-label="다음 달">
          ›
        </button>
      </div>
      <div className="rec-cal__row rec-cal__row--dow">
        {WEEK.map((w) => (
          <span key={w} className="rec-cal__dow">
            {w}
          </span>
        ))}
      </div>
      <div className="rec-cal__grid">
        {cells.map((d, i) =>
          d === null ? (
            <span key={`e${i}`} className="rec-cal__cell rec-cal__cell--empty" />
          ) : (
            <button
              key={toISO(y, m, d)}
              type="button"
              className={`rec-cal__cell ${stateOf(d) ? `is-${stateOf(d)}` : ""} ${
                toISO(y, m, d) === today ? "is-today" : ""
              }`}
              onClick={() => onPick(toISO(y, m, d))}
            >
              {d}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

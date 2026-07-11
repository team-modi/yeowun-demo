import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getRemindList } from "@api/remind";
import Spinner from "@components/common/Spinner";
import ErrorState from "@components/common/ErrorState";
import EmptyState from "@components/common/EmptyState";
import FilterChip from "@components/common/FilterChip";
import RemindListItem from "@components/remind/RemindListItem";
import RemindDetailPanel from "@components/remind/RemindDetailPanel";
import "@styles/remind.css";

/**
 * ArchiveRemindTab — 아카이브 '리마인드' 탭 (Remind-01 기획서 7·8절).
 * 베타 규모(리마인드 수십 건 수준)라 size=100 으로 1회 로드한 뒤
 * 정렬·필터는 전부 클라이언트에서 수행한다(서버 정렬/필터 파라미터 불요).
 * - 정렬: 최신 리마인드순(createdAt desc, 기본) / 과거 관람일순(viewedAt asc)
 * - 리마인드 주기 필터: 전체/1주일 전/1개월 전/3개월 전 (periodOf 참고)
 * - 감정 변화 필터: 전체/감정 유지/감정 반전 (changeOf 참고)
 * 항목 탭 → RemindDetailPanel(GET /reminds/{id}) 인페이지 시트.
 */
const SORTS = [
  { key: "latest", label: "최신 리마인드순" }, // createdAt desc (기본)
  { key: "viewed", label: "과거 관람일순" }, // viewedAt asc
];

const PERIODS = [
  { key: "all", label: "전체" },
  { key: "week", label: "1주일 전" },
  { key: "month", label: "1개월 전" },
  { key: "quarter", label: "3개월 전" },
];

const CHANGES = [
  { key: "all", label: "전체" },
  { key: "kept", label: "감정 유지" },
  { key: "flipped", label: "감정 반전" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

// 리마인드 주기 분류 — viewedAt(관람일) → createdAt(리마인드 저장 시점) 경과일 d 기준.
// 발송 주기는 1주/1개월/3개월이지만 실제 저장이 며칠 늦을 수 있어 경계에 여유를 둔다:
//   d ≤ 10        → "1주일 전"
//   10 < d ≤ 45   → "1개월 전"
//   d > 45        → "3개월 전"
// 날짜 파싱 불가 시 null → '전체'에서만 노출.
function periodOf(item) {
  const from = Date.parse(item.viewedAt);
  const to = Date.parse(item.createdAt);
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  const d = Math.floor((to - from) / DAY_MS);
  if (d <= 10) return "week";
  if (d <= 45) return "month";
  return "quarter";
}

// 감정 변화 분류 — 원본 기록(beforeEmotionCodes) vs 리마인드(emotionCodes=after).
//   교집합 있음 → 유지(kept)
//   양쪽 다 1개 이상인데 교집합 없음 → 반전(flipped)
//   한쪽이라도 비어 있으면 판별 불가(null) → '전체' 필터에서만 노출.
function changeOf(item) {
  const before = item.beforeEmotionCodes ?? [];
  const after = item.emotionCodes ?? [];
  if (before.length === 0 || after.length === 0) return null;
  const set = new Set(before);
  return after.some((code) => set.has(code)) ? "kept" : "flipped";
}

function ChevronDown({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function ArchiveRemindTab() {
  const [reminds, setReminds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [sortKey, setSortKey] = useState("latest");
  const [sortOpen, setSortOpen] = useState(false);
  const [period, setPeriod] = useState("all");
  const [change, setChange] = useState("all");
  const [openId, setOpenId] = useState(null); // 상세 시트 대상 remindId

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 베타 규모 — 1회 로드 후 클라이언트 정렬/필터(위 컴포넌트 주석 참고).
      const res = await getRemindList({ page: 0, size: 100 });
      setReminds(res?.data?.content ?? []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 마이크로태스크로 지연시켜 effect 내 동기 setState 를 피한다.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  // 정렬 드롭다운 바깥 클릭 시 닫기(기록 탭 정렬 패턴과 동일).
  const sortRef = useRef(null);
  useEffect(() => {
    if (!sortOpen) return;
    const onDoc = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [sortOpen]);

  const visible = useMemo(() => {
    const filtered = reminds.filter((item) => {
      if (period !== "all" && periodOf(item) !== period) return false;
      if (change !== "all" && changeOf(item) !== change) return false;
      return true;
    });
    const sorted = [...filtered];
    if (sortKey === "viewed") {
      // 과거 관람일순: 오래 전에 관람한 전시부터(asc)
      sorted.sort((a, b) => (Date.parse(a.viewedAt) || 0) - (Date.parse(b.viewedAt) || 0));
    } else {
      // 최신 리마인드순: 최근에 저장한 리마인드부터(desc)
      sorted.sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
    }
    return sorted;
  }, [reminds, period, change, sortKey]);

  const currentSort = SORTS.find((s) => s.key === sortKey) ?? SORTS[0];

  if (loading) return <Spinner full />;
  if (error) return <ErrorState onRetry={load} />;

  // 빈 상태 — 기획서 8절 온보딩 문구.
  if (reminds.length === 0) {
    return (
      <EmptyState
        title="아직 저장된 리마인드가 없어요"
        description="나만의 여운을 남기고, 시간이 흐른 뒤의 변화된 감정을 마주해 보세요."
      />
    );
  }

  return (
    <div className="archive-remind">
      <div className="archive__toolbar">
        <div className="archive__sort" ref={sortRef}>
          <button
            type="button"
            className="archive__sort-btn"
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
            onClick={() => setSortOpen((v) => !v)}
          >
            <span>{currentSort.label}</span>
            <span className={`archive__sort-caret ${sortOpen ? "is-open" : ""}`}>
              <ChevronDown />
            </span>
          </button>
          {sortOpen && (
            <ul className="archive__sort-menu" role="listbox" aria-label="리마인드 정렬">
              {SORTS.map((s) => (
                <li key={s.key} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={sortKey === s.key}
                    className={`archive__sort-item ${sortKey === s.key ? "is-active" : ""}`}
                    onClick={() => {
                      setSortOpen(false);
                      setSortKey(s.key);
                    }}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="remind-filters">
        <div className="remind-filters__row" role="group" aria-label="리마인드 주기">
          <span className="remind-filters__label">주기</span>
          {PERIODS.map((p) => (
            <FilterChip key={p.key} active={period === p.key} onClick={() => setPeriod(p.key)}>
              {p.label}
            </FilterChip>
          ))}
        </div>
        <div className="remind-filters__row" role="group" aria-label="감정 변화">
          <span className="remind-filters__label">감정 변화</span>
          {CHANGES.map((c) => (
            <FilterChip key={c.key} active={change === c.key} onClick={() => setChange(c.key)}>
              {c.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="remind__empty">조건에 맞는 리마인드가 없어요.</p>
      ) : (
        <ul className="remind-list">
          {visible.map((item) => (
            <li key={item.remindId}>
              <RemindListItem item={item} onOpen={setOpenId} />
            </li>
          ))}
        </ul>
      )}

      {openId != null && (
        <RemindDetailPanel remindId={openId} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}

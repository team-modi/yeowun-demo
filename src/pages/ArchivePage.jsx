import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getRecordList } from "@api/record";
import Spinner from "@components/common/Spinner";
import ErrorState from "@components/common/ErrorState";
import EmptyState from "@components/common/EmptyState";
import { ArchiveIcon } from "@components/common/icons";
import RecordCard from "@components/archive/RecordCard";
import RecordDetail from "@components/archive/RecordDetail";
import ArchiveRemindTab from "@components/archive/ArchiveRemindTab";
import "@styles/archive.css";

/**
 * ArchivePage — [05] 아카이브 (/archive)
 * 타이틀 아래 세그먼트 탭 [기록 | 리마인드]. ?tab=remind 딥링크(useSearchParams),
 * 기본은 기록 탭(기존 동작·디자인 무변경).
 * - 기록: 내 기록 그리드(GET /records, PageResponse=오프셋 페이징) + 정렬(최신/오래된순)
 *   + 무한 스크롤(page++) + 카드 클릭 상세(오버레이 패널).
 * - 리마인드: ArchiveRemindTab (Remind-01 기획서 — 정렬/주기·감정변화 필터/상세 시트).
 *
 * ※ 백엔드 GET /records 는 커서가 아닌 PageResponse(content,page,size,
 *   totalElements,totalPages,hasNext) 오프셋 페이징. 정렬은 Spring Pageable
 *   sort 파라미터(viewedAt,desc | viewedAt,asc)로 전달.
 */
const PAGE_SIZE = 20;

const TABS = [
  { key: "record", label: "기록" },
  { key: "remind", label: "리마인드" },
];
const SORTS = [
  { key: "latest", label: "최신순", sort: "viewedAt,desc" },
  { key: "oldest", label: "오래된순", sort: "viewedAt,asc" },
];

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

export default function ArchivePage() {
  // 탭 상태는 URL(?tab=remind)로 관리 — 완료 화면 "아카이브 보러가기" 등 딥링크 대상.
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "remind" ? "remind" : "record";
  const onTab = useCallback(
    (key) => {
      const next = new URLSearchParams(searchParams);
      if (key === "remind") next.set("tab", "remind");
      else next.delete("tab"); // 기본(기록)은 파라미터 없이
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const [sortKey, setSortKey] = useState("latest");
  const [records, setRecords] = useState([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  const [loading, setLoading] = useState(true); // 초기/정렬 변경 로딩
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const [selectedId, setSelectedId] = useState(null);
  const [sortOpen, setSortOpen] = useState(false);

  // 진행 중 요청 경합 방지용 토큰
  const reqRef = useRef(0);

  // sortKey 를 인자로 받아 이펙트 의존에서 분리(재실행 이펙트의 동기 setState 회피).
  const fetchPage = useCallback(async (nextPage, mode, sortKeyArg) => {
    const sortParam = SORTS.find((s) => s.key === sortKeyArg)?.sort;
    const token = ++reqRef.current;
    if (mode === "reset") setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const { data } = await getRecordList({
        page: nextPage,
        size: PAGE_SIZE,
        sort: sortParam,
      });
      if (token !== reqRef.current) return; // 최신 요청만 반영
      const content = data?.content ?? [];
      setRecords((prev) => (mode === "reset" ? content : [...prev, ...content]));
      setPage(nextPage);
      setHasNext(!!data?.hasNext);
    } catch (err) {
      if (token !== reqRef.current) return;
      setError(err);
    } finally {
      if (token === reqRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  // 최초 진입 시 1회 로드. fetchPage 는 deps [] 로 안정적 → 1회만 실행.
  // 정렬 변경은 onSort 핸들러가 처리(이펙트 재실행 없음).
  // 마운트 시 로딩 상태 진입은 의도된 표준 패턴 → set-state-in-effect 예외.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPage(0, "reset", "latest");
  }, [fetchPage]);

  const onSort = useCallback(
    (key) => {
      setSortOpen(false);
      if (key === sortKey) return;
      setSortKey(key);
      fetchPage(0, "reset", key);
    },
    [sortKey, fetchPage],
  );

  // 드롭다운 바깥 클릭 시 닫기
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

  // 무한 스크롤 sentinel
  const sentinelRef = useRef(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasNext &&
          !loading &&
          !loadingMore
        ) {
          fetchPage(page + 1, "append", sortKey);
        }
      },
      { rootMargin: "240px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNext, loading, loadingMore, page, sortKey, fetchPage]);

  // 상세에서 북마크 토글 시 목록 카드 동기화
  const handleBookmarkChange = useCallback((recordId, bookmarked) => {
    setRecords((prev) =>
      prev.map((r) => (r.recordId === recordId ? { ...r, bookmarked } : r)),
    );
  }, []);

  // 상세에서 삭제 시 목록에서 제거하고 상세를 닫는다.
  const handleDeleted = useCallback((recordId) => {
    setRecords((prev) => prev.filter((r) => r.recordId !== recordId));
    setSelectedId(null);
  }, []);

  const currentSort = SORTS.find((s) => s.key === sortKey) ?? SORTS[0];

  return (
    <div className="page archive">
      {/* 페이지 타이틀은 TopBar("아카이브")가 제공 — 중복 헤딩 없이 탭부터 시작 */}
      {/* 세그먼트 탭 [기록 | 리마인드] — 알림 탭과 톤 통일(50% 언더라인) */}
      <div className="archive__tabs" role="tablist" aria-label="아카이브 탭">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`archive__tabs-btn ${tab === t.key ? "is-active" : ""}`}
            onClick={() => onTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "remind" && <ArchiveRemindTab />}

      {/* ── 기록 탭(기존 동작·디자인 무변경). 기록 데이터는 마운트 시 1회 로드라
             remind 탭으로 들어와도 백그라운드에서 준비된다(베타 규모 — 허용). ── */}
      {tab === "record" && (
        <>
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
            <span
              className={`archive__sort-caret ${sortOpen ? "is-open" : ""}`}
            >
              <ChevronDown />
            </span>
          </button>
          {sortOpen && (
            <ul className="archive__sort-menu" role="listbox" aria-label="정렬">
              {SORTS.map((s) => (
                <li key={s.key} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={sortKey === s.key}
                    className={`archive__sort-item ${sortKey === s.key ? "is-active" : ""}`}
                    onClick={() => onSort(s.key)}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {loading && <Spinner full />}

      {!loading && error && records.length === 0 && (
        <ErrorState onRetry={() => fetchPage(0, "reset", sortKey)} />
      )}

      {!loading && !error && records.length === 0 && (
        <EmptyState
          icon={<ArchiveIcon size={36} />}
          title="아직 기록이 없어요"
          description="전시를 관람하고 그날의 여운을 남겨보세요."
        />
      )}

      {records.length > 0 && (
        <>
          <div className="archive__grid">
            {records.map((item) => (
              <RecordCard
                key={item.recordId}
                item={item}
                onOpen={setSelectedId}
              />
            ))}
          </div>

          {loadingMore && <Spinner />}

          {error && !loadingMore && (
            <div className="archive__more-error">
              <ErrorState
                title="더 불러오지 못했어요"
                description=""
                onRetry={() => fetchPage(page + 1, "append", sortKey)}
              />
            </div>
          )}

          {/* 무한 스크롤 감지 지점 */}
          <div ref={sentinelRef} className="archive__sentinel" aria-hidden="true" />
        </>
      )}

      {selectedId != null && (
        <RecordDetail
          recordId={selectedId}
          onClose={() => setSelectedId(null)}
          onBookmarkChange={handleBookmarkChange}
          onDeleted={handleDeleted}
        />
      )}
        </>
      )}
    </div>
  );
}

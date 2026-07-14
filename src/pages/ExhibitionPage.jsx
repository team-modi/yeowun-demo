import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { getList } from "@api/exhibition";
import { addBookmark, removeBookmark } from "@api/bookmark";
import { getCandidate } from "@api/remind";
import { useAuthStore } from "@store/authStore";
import { useUiStore } from "@store/uiStore";
import { elapsedPhrase } from "@components/remind/utils";

import ExhibitionCard from "@components/common/ExhibitionCard";
import { BackIcon, BookmarkIcon } from "@components/common/icons";
import EmptyState from "@components/common/EmptyState";
import ErrorState from "@components/common/ErrorState";
import Spinner from "@components/common/Spinner";
import Button from "@components/common/Button";
import useInfiniteCursor from "@components/common/useInfiniteCursor";

import { MIN_KEYWORD } from "@components/exhibition/constants";
import { SearchIcon, FilterIcon } from "@components/exhibition/icons";
import SortDropdown from "@components/exhibition/SortDropdown";
import FilterSheet from "@components/exhibition/FilterSheet";
import "@styles/exhibition.css";

const PAGE_SIZE = 20;

// 홈 "전체보기" 진입(?section=) 시 헤더 타이틀 — 시안 01_홈_*상세
const SECTION_TITLES = {
  "ending-soon": "곧 끝나기 전에 봐야 할 전시",
  "opening-this-month": "이번 달 새로 열리는 전시",
  free: "무료로 볼 수 있는 전시",
};

// "SEOUL,GYEONGGI" ↔ ["SEOUL","GYEONGGI"]
const splitCsv = (v) => (v ? v.split(",").filter(Boolean) : []);

export default function ExhibitionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useUiStore((s) => s.toast);
  const navigate = useNavigate();
  const authed = useAuthStore((s) => s.authed);
  const nickname = useAuthStore((s) => s.user?.nickname);

  // 오늘의 여운 후보(도착 배너, wf-07) — 로그인 상태에서만 조회, 실패는 조용히 무시.
  const [remindCand, setRemindCand] = useState(null);

  useEffect(() => {
    if (!authed) return undefined;
    let alive = true;
    getCandidate()
      .then((res) => {
        if (alive && res?.data) setRemindCand(res.data);
      })
      .catch(() => {
        /* 실패 무시 — 목록 로딩을 방해하지 않는다 */
      });
    return () => {
      alive = false;
    };
  }, [authed]);

  // ---- URL 쿼리에서 초기 필터 읽기 ----
  const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");
  const [draft, setDraft] = useState(searchParams.get("keyword") ?? "");
  const [regions, setRegions] = useState(splitCsv(searchParams.get("region")));
  const [categories, setCategories] = useState(
    splitCsv(searchParams.get("category")),
  );
  const [sort, setSort] = useState(searchParams.get("sort") ?? "latest");
  const section = searchParams.get("section") ?? undefined;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [keywordHint, setKeywordHint] = useState("");

  // ---- 요청 파라미터(값이 바뀌면 useInfiniteCursor 가 자동 리셋) ----
  const params = useMemo(() => {
    const p = { sort };
    if (section) p.section = section;
    if (keyword.length >= MIN_KEYWORD) p.keyword = keyword;
    if (regions.length) p.region = regions.join(",");
    if (categories.length) p.category = categories.join(",");
    return p;
  }, [sort, section, keyword, regions, categories]);

  // ApiResponse 봉투를 풀어 CursorResponse data 를 반환(총계는 훅이 세대 가드 안에서 관리).
  const fetchPage = useCallback(async (reqParams) => {
    const { data } = await getList(reqParams);
    return data;
  }, []);

  const { items, total: totalCount, loading, error, hasNext, loadMore, reset, setItems } =
    useInfiniteCursor(fetchPage, { params, size: PAGE_SIZE });

  // ---- 필터 상태를 URL 에 반영(공유/새로고침 유지, Home ?section= 유지) ----
  useEffect(() => {
    const next = {};
    if (keyword.length >= MIN_KEYWORD) next.keyword = keyword;
    if (section) next.section = section;
    if (regions.length) next.region = regions.join(",");
    if (categories.length) next.category = categories.join(",");
    if (sort && sort !== "latest") next.sort = sort;
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, regions, categories, sort]);

  // ---- 검색 제출(최소 2글자) ----
  const onSubmit = (e) => {
    e.preventDefault();
    const kw = draft.trim();
    if (kw.length === 1) {
      setKeywordHint("검색어는 2글자 이상 입력해 주세요.");
      return;
    }
    setKeywordHint("");
    setKeyword(kw); // 빈 문자열이면 keyword 제거되어 전체 목록 복원
  };

  const onClearKeyword = () => {
    setDraft("");
    setKeyword("");
    setKeywordHint("");
  };

  // ---- 북마크 토글(옵티미스틱) ----
  const onToggleBookmark = async (item) => {
    const nextOn = !item.bookmarked;
    setItems((prev) =>
      prev.map((x) =>
        x.exhibitionId === item.exhibitionId ? { ...x, bookmarked: nextOn } : x,
      ),
    );
    try {
      if (nextOn) await addBookmark(item.exhibitionId);
      else await removeBookmark(item.exhibitionId);
      toast(nextOn ? "관심 전시에 담았어요" : "관심을 해제했어요", "success");
    } catch {
      setItems((prev) =>
        prev.map((x) =>
          x.exhibitionId === item.exhibitionId
            ? { ...x, bookmarked: item.bookmarked }
            : x,
        ),
      );
      toast("잠시 후 다시 시도해 주세요", "error");
    }
  };

  const activeFilterCount = regions.length + categories.length;

  // ---- 필터 적용(바텀시트 → 목록) ----
  const applyFilters = (nextRegions, nextCategories) => {
    setRegions(nextRegions);
    setCategories(nextCategories);
    setFiltersOpen(false);
  };

  // ---- 무한 스크롤(IntersectionObserver) ----
  const sentinelRef = useRef(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNext && !loading) loadMore();
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNext, loading, loadMore]);

  const showEmpty = !loading && !error && items.length === 0;

  return (
    <div className="page exh-page">
      {/* 헤더 — 섹션 모드(시안 01_홈_*상세): 뒤로가기 + 중앙 타이틀 / 기본(시안 02): 좌 "전시탐색" · 우 북마크 */}
      {section ? (
        <header className="exh-head exh-head--section">
          <button
            type="button"
            className="exh-head__back"
            aria-label="뒤로가기"
            onClick={() => navigate(-1)}
          >
            <BackIcon size={24} />
          </button>
          <h1 className="exh-head__title exh-head__title--center">
            {SECTION_TITLES[section] ?? "전시"}
          </h1>
          <span className="exh-head__spacer" aria-hidden="true" />
        </header>
      ) : (
        <header className="exh-head">
          <h1 className="exh-head__title">전시탐색</h1>
          <button
            type="button"
            className="exh-head__bookmark"
            aria-label="관심 전시"
            onClick={() => navigate("/user")}
          >
            <BookmarkIcon size={24} />
          </button>
        </header>
      )}

      {/* 검색바 (Q 아이콘 · 2글자 이상) — 섹션 모드에선 시안대로 숨김 */}
      {section ? null : (
      <form className="exh-search" onSubmit={onSubmit} role="search">
        <button
          type="submit"
          className="exh-search__icon"
          aria-label="검색"
        >
          <SearchIcon size={19} />
        </button>
        <input
          className="exh-search__input"
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="전시명, 작가명, 장소를 검색해보세요"
          aria-label="전시 검색어"
        />
        {draft && (
          <button
            type="button"
            className="exh-search__clear"
            onClick={onClearKeyword}
            aria-label="검색어 지우기"
          >
            ×
          </button>
        )}
      </form>
      )}
      {!section && keywordHint && <p className="exh-hint">{keywordHint}</p>}

      {/* 오늘의 여운 도착 배너(wf-07) — "총 N개" 행 위 */}
      {remindCand && (
        <button type="button" className="rm-banner" onClick={() => navigate("/remind")}>
          <span className="rm-banner__thumb">
            {remindCand.posterUrl && <img src={remindCand.posterUrl} alt="" />}
          </span>
          <span className="rm-banner__body">
            <span className="rm-banner__badge">오늘의 여운</span>
            <span className="rm-banner__text">
              {[nickname && `${nickname}님,`, elapsedPhrase(remindCand)]
                .filter(Boolean)
                .join(" ")}{" "}
              기록한 전시가 있어요!
            </span>
          </span>
          <span className="rm-banner__arrow" aria-hidden="true">
            ›
          </span>
        </button>
      )}

      {/* 결과 수 · 정렬 · 필터 */}
      <div className="exh-toolbar">
        <p className="exh-total">
          전시
          {totalCount !== null && !error && (
            <span className="exh-total__num">{totalCount}</span>
          )}
        </p>
        <div className="exh-toolbar__ctrls">
          <SortDropdown value={sort} onChange={setSort} />
          <button
            type="button"
            className={`exh-filter-btn ${activeFilterCount > 0 ? "is-active" : ""}`}
            aria-label="필터"
            aria-haspopup="dialog"
            onClick={() => setFiltersOpen(true)}
          >
            <FilterIcon size={19} />
            {activeFilterCount > 0 && (
              <span className="exh-filter-btn__count">{activeFilterCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* 목록 */}
      {error && items.length === 0 ? (
        <ErrorState title="목록을 불러오지 못했어요" onRetry={reset} />
      ) : showEmpty ? (
        <EmptyState
          icon={<span className="exh-empty__img" aria-hidden="true" />}
          title="검색 결과가 없어요"
          description="다른 키워드로 검색해 보세요"
        />
      ) : (
        <>
          {/* 오픈 예정 섹션은 시안(01_홈_오픈 전시 상세)대로 2열 그리드, 그 외 리스트 */}
          <div
            className={
              section === "opening-this-month" ? "exh-grid" : "exh-list"
            }
          >
            {items.map((item) => (
              <ExhibitionCard
                key={item.exhibitionId}
                item={item}
                variant={section === "opening-this-month" ? "grid" : "list"}
                showOpenDate={section === "opening-this-month"}
                onToggleBookmark={onToggleBookmark}
              />
            ))}
          </div>

          {loading && <Spinner />}

          {/* 무한 스크롤 감지 지점 + 폴백 버튼 */}
          <div ref={sentinelRef} aria-hidden="true" />
          {!loading && hasNext && items.length > 0 && (
            <div className="exh-more">
              <Button variant="secondary" size="sm" onClick={loadMore}>
                더 보기
              </Button>
            </div>
          )}
        </>
      )}

      {/* 필터 바텀시트 */}
      {filtersOpen && (
        <FilterSheet
          regions={regions}
          categories={categories}
          keyword={keyword}
          sort={sort}
          section={section}
          onApply={applyFilters}
          onClose={() => setFiltersOpen(false)}
        />
      )}
    </div>
  );
}

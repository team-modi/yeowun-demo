import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { getList } from "@api/exhibition";
import { addBookmark, removeBookmark } from "@api/bookmark";
import { useUiStore } from "@store/uiStore";

import ExhibitionCard from "@components/common/ExhibitionCard";
import EmptyState from "@components/common/EmptyState";
import ErrorState from "@components/common/ErrorState";
import Spinner from "@components/common/Spinner";
import Button from "@components/common/Button";
import useInfiniteCursor from "@components/common/useInfiniteCursor";
import { BookmarkIcon } from "@components/common/icons";

import { MIN_KEYWORD } from "@components/exhibition/constants";
import { SearchIcon, FilterIcon } from "@components/exhibition/icons";
import SortDropdown from "@components/exhibition/SortDropdown";
import FilterSheet from "@components/exhibition/FilterSheet";
import "@styles/exhibition.css";

const PAGE_SIZE = 20;

// "SEOUL,GYEONGGI" ↔ ["SEOUL","GYEONGGI"]
const splitCsv = (v) => (v ? v.split(",").filter(Boolean) : []);

export default function ExhibitionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useUiStore((s) => s.toast);

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
  const [totalCount, setTotalCount] = useState(null);

  // ---- 요청 파라미터(값이 바뀌면 useInfiniteCursor 가 자동 리셋) ----
  const params = useMemo(() => {
    const p = { sort };
    if (section) p.section = section;
    if (keyword.length >= MIN_KEYWORD) p.keyword = keyword;
    if (regions.length) p.region = regions.join(",");
    if (categories.length) p.category = categories.join(",");
    return p;
  }, [sort, section, keyword, regions, categories]);

  // totalCount 를 곁들여 잡기 위한 래퍼
  const fetchPage = useCallback(async (reqParams) => {
    const { data } = await getList(reqParams);
    setTotalCount(data?.totalElements ?? data?.totalCount ?? 0);
    return data;
  }, []);

  const { items, loading, error, hasNext, loadMore, reset, setItems } =
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
      {/* 헤더: 우측 상단 북마크(관심 전시) */}
      <div className="exh-header">
        <Link to="/user" className="exh-header__bookmark" aria-label="관심 전시">
          <BookmarkIcon size={22} />
        </Link>
      </div>

      {/* 검색바 (Q 아이콘 · 2글자 이상) */}
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
          placeholder="전시 · 작가 검색 (2글자 이상)"
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
      {keywordHint && <p className="exh-hint">{keywordHint}</p>}

      {/* 결과 수 · 정렬 · 필터 */}
      <div className="exh-toolbar">
        <p className="exh-total">
          {totalCount !== null && !error ? `총 ${totalCount}개` : " "}
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
          title="조건에 맞는 전시가 없어요"
          description="검색어나 필터를 바꿔 다시 시도해 보세요."
        />
      ) : (
        <>
          <div className="exh-list">
            {items.map((item) => (
              <ExhibitionCard
                key={item.exhibitionId}
                item={item}
                variant="list"
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

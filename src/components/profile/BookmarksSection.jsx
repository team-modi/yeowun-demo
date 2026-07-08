import { useCallback, useState } from "react";

import { getMyBookmarks } from "@api/user";
import { addBookmark, removeBookmark } from "@api/bookmark";
import { useUiStore } from "@store/uiStore";
import useInfiniteCursor from "@components/common/useInfiniteCursor";
import ExhibitionCard from "@components/common/ExhibitionCard";
import Button from "@components/common/Button";
import Spinner from "@components/common/Spinner";
import EmptyState from "@components/common/EmptyState";
import ErrorState from "@components/common/ErrorState";
import { HeartIcon } from "@components/profile/icons";

const SORTS = [
  { value: "latest", label: "담은 순" },
  { value: "ending", label: "종료 임박순" },
];

/**
 * BookmarksSection — "관심 전시" 목록(정렬 + 커서 무한스크롤 + 북마크 토글).
 * GET /users/me/bookmarks?sort&size&cursor → CursorResponse<ExhibitionListItem>
 */
export default function BookmarksSection() {
  const [sort, setSort] = useState("latest");
  const [total, setTotal] = useState(null);
  const toast = useUiStore((st) => st.toast);

  const fetchPage = useCallback(
    (params) =>
      getMyBookmarks(params).then((res) => {
        const d = res.data;
        if (typeof d?.totalCount === "number") setTotal(d.totalCount);
        return d;
      }),
    [],
  );

  const { items, loading, error, hasNext, loadMore, reset, setItems } =
    useInfiniteCursor(fetchPage, { params: { sort }, size: 20 });

  const handleToggle = async (item) => {
    const id = item.exhibitionId;
    const wasOn = !!item.bookmarked;

    setItems((prev) =>
      prev.map((it) =>
        it.exhibitionId === id ? { ...it, bookmarked: !wasOn } : it,
      ),
    );

    try {
      if (wasOn) {
        await removeBookmark(id);
        toast("관심 전시에서 제외했어요.", "info");
      } else {
        await addBookmark(id);
        toast("관심 전시에 추가했어요.", "success");
      }
    } catch {
      setItems((prev) =>
        prev.map((it) =>
          it.exhibitionId === id ? { ...it, bookmarked: wasOn } : it,
        ),
      );
      toast("변경에 실패했어요. 다시 시도해 주세요.", "error");
    }
  };

  const count = total ?? items.length;

  return (
    <section className="pf-list-view">
      <div className="pf-list-head">
        <span className="pf-count">{count}개</span>
        <select
          className="pf-sort-select"
          value={sort}
          onChange={(e) => e.target.value !== sort && setSort(e.target.value)}
          aria-label="정렬"
        >
          {SORTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error && items.length === 0 ? (
        <ErrorState title="관심 전시를 불러오지 못했어요" onRetry={reset} />
      ) : items.length === 0 && loading ? (
        <Spinner full />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<HeartIcon size={30} />}
          title="아직 관심 전시가 없어요"
          description="마음에 드는 전시를 북마크해 보세요."
        />
      ) : (
        <>
          <div className="pf-list">
            {items.map((item) => (
              <ExhibitionCard
                key={item.exhibitionId}
                item={item}
                variant="list"
                onToggleBookmark={handleToggle}
              />
            ))}
          </div>

          {hasNext && (
            <div className="pf-more">
              <Button
                variant="secondary"
                size="sm"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? "불러오는 중…" : "더 보기"}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

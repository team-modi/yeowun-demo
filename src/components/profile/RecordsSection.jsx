import { useCallback, useEffect, useRef, useState } from "react";

import { getVisitedExhibitions } from "@api/record";
import ExhibitionCard from "@components/common/ExhibitionCard";
import Button from "@components/common/Button";
import Spinner from "@components/common/Spinner";
import EmptyState from "@components/common/EmptyState";
import ErrorState from "@components/common/ErrorState";
import { TicketIcon } from "@components/profile/icons";

const PAGE_SIZE = 20;
const SORTS = [
  { value: "latest", label: "최신순", sort: "viewedAt,desc" },
  { value: "oldest", label: "오래된순", sort: "viewedAt,asc" },
];

// RecordListItemResponse → ExhibitionCard(list) 아이템으로 변환.
function toCardItem(r) {
  return {
    exhibitionId: r.exhibitionId,
    title: r.exhibitionTitle,
    posterUrl: r.exhibitionPosterUrl || r.thumbnailUrl,
    place: r.exhibitionPlace,
    startDate: r.exhibitionStartDate,
    endDate: r.exhibitionEndDate,
    artistSummary: r.representativeEmotion || r.aiSummary,
  };
}

/**
 * RecordsSection — "기록한 전시"(내가 다녀온 전시) 목록.
 * GET /records/exhibitions/visited — PageResponse(오프셋 페이징) + 정렬(최신/오래된순).
 */
export default function RecordsSection() {
  const [sortKey, setSortKey] = useState("latest");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [total, setTotal] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [loadingMore, setLoadingMore] = useState(false);

  const reqRef = useRef(0);

  const fetchPage = useCallback(async (nextPage, mode, key) => {
    const sortParam = SORTS.find((s) => s.value === key)?.sort;
    const token = ++reqRef.current;
    if (mode === "reset") setStatus("loading");
    else setLoadingMore(true);
    try {
      const { data } = await getVisitedExhibitions({
        page: nextPage,
        size: PAGE_SIZE,
        sort: sortParam,
      });
      if (token !== reqRef.current) return;
      const content = data?.content ?? [];
      setItems((prev) => (mode === "reset" ? content : [...prev, ...content]));
      setPage(nextPage);
      setHasNext(!!data?.hasNext);
      if (typeof data?.totalElements === "number") setTotal(data.totalElements);
      setStatus("ready");
    } catch {
      if (token !== reqRef.current) return;
      if (mode === "reset") setStatus("error");
    } finally {
      if (token === reqRef.current) setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPage(0, "reset", "latest");
  }, [fetchPage]);

  const onSort = (key) => {
    if (key === sortKey) return;
    setSortKey(key);
    fetchPage(0, "reset", key);
  };

  const count = total ?? items.length;

  return (
    <section className="pf-list-view">
      <div className="pf-list-head">
        <span className="pf-count">{count}개</span>
        <select
          className="pf-sort-select"
          value={sortKey}
          onChange={(e) => onSort(e.target.value)}
          aria-label="정렬"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {status === "loading" ? (
        <Spinner full />
      ) : status === "error" ? (
        <ErrorState
          title="기록한 전시를 불러오지 못했어요"
          onRetry={() => fetchPage(0, "reset", sortKey)}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<TicketIcon size={30} />}
          title="아직 다녀온 전시가 없어요"
          description="전시를 관람하고 그날의 여운을 기록해 보세요."
        />
      ) : (
        <>
          <div className="pf-list">
            {items.map((r) => (
              <ExhibitionCard
                key={r.recordId ?? r.exhibitionId}
                item={toCardItem(r)}
                variant="list"
              />
            ))}
          </div>

          {loadingMore && <Spinner />}
          {!loadingMore && hasNext && (
            <div className="pf-more">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fetchPage(page + 1, "append", sortKey)}
              >
                더 보기
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

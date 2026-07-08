import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useInfiniteCursor — 무한 스크롤 페이지네이션 헬퍼 훅.
 *
 * 백엔드는 오프셋 페이징(page/size, 응답 {content, page, size, totalElements, totalPages, hasNext})을
 * 쓰므로 이 훅도 page 를 증가시키며 요청한다(과거 cursor 방식은 백엔드가 cursor 를 무시해 같은 페이지를
 * 반복 로드하는 버그가 있었음 → offset 으로 정정).
 *
 * @param {(params:{page:number, size:number, ...extra}) => Promise<{content, hasNext, ...}>} fetchPage
 *        page 를 포함한 params 를 받아 응답 data 를 반환하는 함수.
 *        (예: (params) => getList({ ...filters, ...params }).then(r => r.data))
 * @param {object}  [options]
 * @param {object}  [options.params]   — 매 요청에 병합할 추가 파라미터(필터 등). 값이 바뀌면 자동 리셋.
 * @param {number}  [options.size=10]  — 페이지 크기.
 * @param {boolean} [options.immediate=true] — 마운트 시 첫 페이지 즉시 로드.
 *
 * @returns {{ items, loading, error, hasNext, loadMore, reset, setItems }}
 */
export default function useInfiniteCursor(fetchPage, options = {}) {
  const { params, size = 10, immediate = true } = options;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasNext, setHasNext] = useState(true);

  const pageRef = useRef(0);
  const loadingRef = useRef(false);
  const paramsKey = JSON.stringify(params ?? {});

  const load = useCallback(
    async (fresh) => {
      if (loadingRef.current) return;
      if (!fresh && !hasNext) return;

      loadingRef.current = true;
      setLoading(true);
      setError(null);

      const page = fresh ? 0 : pageRef.current;
      try {
        const reqParams = { ...(params ?? {}), page, size };
        const res = await fetchPage(reqParams);
        const content = res?.content ?? [];
        pageRef.current = page + 1; // 다음에 불러올 페이지
        setHasNext(!!res?.hasNext);
        setItems((prev) => (fresh ? content : [...prev, ...content]));
      } catch (err) {
        setError(err);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchPage, paramsKey, size, hasNext],
  );

  const loadMore = useCallback(() => load(false), [load]);

  const reset = useCallback(() => {
    pageRef.current = 0;
    setHasNext(true);
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  // params 변경 또는 최초 마운트 시 새로 로드 (fresh 로드는 cursor/hasNext 를 응답으로 재설정).
  // 마이크로태스크로 지연시켜 effect 내 동기 setState 를 피한다.
  useEffect(() => {
    if (!immediate) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) load(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  return { items, loading, error, hasNext, loadMore, reset, setItems };
}

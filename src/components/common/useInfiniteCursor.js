import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useInfiniteCursor — 커서(keyset) 기반 무한 스크롤 페이지네이션 헬퍼 훅.
 *
 * 백엔드 목록 API 는 커서 페이징이다. 응답은
 *   { content, nextCursor, hasNext, totalCount }
 * 이며 다음 페이지는 직전 응답의 `nextCursor` 를 그대로 넘겨야 한다.
 * 커서에는 sort 판별자가 담겨 있어, sort/filter 가 바뀌면 커서를 버리고(=미전송)
 * 첫 페이지부터 다시 받아야 한다(옛 커서를 넘기면 백엔드가 INVALID_CURSOR 로 거부).
 *
 * 과거 이 훅은 offset(page/size)을 보냈는데, 백엔드가 page 를 무시하고 커서만 보므로
 * 매 loadMore 가 "같은 첫 페이지"를 반복 반환 → 목록 중복 + totalCount 재카운트 버그가 있었다.
 * 이를 커서 방식으로 정정하고, id 중복 제거와 sort/filter 변경 시의 경합(옛 loadMore 응답이
 * 새 목록에 끼어드는 문제)을 세대(epoch) 무효화로 막는다.
 *
 * @param {(params:{cursor?:string, size:number, ...extra}) => Promise<{content, nextCursor, hasNext, ...}>} fetchPage
 * @param {object}  [options]
 * @param {object}  [options.params]   — 매 요청에 병합할 추가 파라미터(sort/filter 등). 값이 바뀌면 자동 리셋.
 * @param {number}  [options.size=10]  — 페이지 크기.
 * @param {boolean} [options.immediate=true] — 마운트 시 첫 페이지 즉시 로드.
 * @param {(item:any)=>any} [options.getKey] — 중복 제거용 키 추출기(기본: id ?? exhibitionId).
 * @param {(res:any)=>number} [options.getTotal] — 응답에서 총 개수 추출(기본: totalCount ?? totalElements).
 *
 * @returns {{ items, total, loading, error, hasNext, loadMore, reset, setItems }}
 */
export default function useInfiniteCursor(fetchPage, options = {}) {
  const { params, size = 10, immediate = true, getKey, getTotal } = options;

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasNext, setHasNext] = useState(true);

  const cursorRef = useRef(null); // 다음 페이지 커서(fresh 로드 시 미전송)
  const hasNextRef = useRef(true); // load 의존성에서 hasNext(state)를 빼 안정화
  const loadingRef = useRef(false);
  const seenRef = useRef(new Set()); // append 중복 방지(id Set)
  const epochRef = useRef(0); // fresh 로드가 in-flight 옛 요청을 무효화하는 세대 카운터
  const paramsKey = JSON.stringify(params ?? {});

  const keyOf = useCallback(
    (x) => (getKey ? getKey(x) : (x?.id ?? x?.exhibitionId)),
    [getKey],
  );

  const totalOf = useCallback(
    (res) => (getTotal ? getTotal(res) : (res?.totalCount ?? res?.totalElements ?? 0)),
    [getTotal],
  );

  const load = useCallback(
    async (fresh) => {
      // fresh(리셋/최초) 로드는 in-flight 여부와 무관하게 진행해 옛 요청을 이긴다(세대 무효화).
      if (!fresh && loadingRef.current) return;
      if (!fresh && !hasNextRef.current) return;

      const myEpoch = fresh ? ++epochRef.current : epochRef.current;
      // fresh 는 시작 시점에 커서/hasNext/중복셋을 동기 초기화한다. 이렇게 해야
      // fetchPage 가 실패해도 옛 커서가 남지 않아, 이후 loadMore 가 옛 sort 커서를 새 params 로 보내
      // INVALID_CURSOR 를 내는 일이 없다. items 도 비워 새 sort 아래 옛 목록이 렌더/합쳐지지 않게 한다.
      if (fresh) {
        cursorRef.current = null;
        hasNextRef.current = true;
        seenRef.current = new Set();
        setItems([]);
      }
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      // sort/filter 가 바뀐 fresh 로드는 커서 없이 첫 페이지를 받는다(옛 커서 재사용 시 INVALID_CURSOR).
      const cursor = fresh ? undefined : (cursorRef.current ?? undefined);
      try {
        const reqParams = { ...(params ?? {}), size };
        if (cursor) reqParams.cursor = cursor;
        const res = await fetchPage(reqParams);
        if (myEpoch !== epochRef.current) return; // 더 새로운 fresh 로드에 밀림 → 폐기

        const content = res?.content ?? [];
        cursorRef.current = res?.nextCursor ?? null;
        const next = !!res?.hasNext && !!res?.nextCursor;
        hasNextRef.current = next;
        setHasNext(next);
        setTotal(totalOf(res)); // 세대 가드 안에서만 갱신 → 밀려난 응답이 총계를 덮어쓰지 않음

        if (fresh) {
          seenRef.current = new Set(content.map(keyOf));
          setItems(content);
        } else {
          const deduped = content.filter((c) => !seenRef.current.has(keyOf(c)));
          deduped.forEach((c) => seenRef.current.add(keyOf(c)));
          if (deduped.length) setItems((prev) => [...prev, ...deduped]);
        }
      } catch (err) {
        if (myEpoch !== epochRef.current) return;
        setError(err);
      } finally {
        // 밀려난(구식) 로드는 loadingRef 를 건드리지 않는다 — 최신 로드가 소유권을 갖는다.
        if (myEpoch === epochRef.current) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchPage, paramsKey, size, keyOf, totalOf],
  );

  const loadMore = useCallback(() => load(false), [load]);

  const reset = useCallback(() => {
    load(true);
  }, [load]);

  // params 변경 또는 최초 마운트 시 fresh 로드(커서 초기화는 load(true) 내부에서 처리).
  // 마이크로태스크로 지연시켜 effect 내 동기 setState 를 피한다.
  useEffect(() => {
    if (!immediate) return undefined;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) load(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  return { items, total, loading, error, hasNext, loadMore, reset, setItems };
}

import { useEffect, useRef, useState } from "react";

import { getList } from "@api/exhibition";
import Button from "@components/common/Button";
import Spinner from "@components/common/Spinner";
import EmptyState from "@components/common/EmptyState";
import ExhibitionCard from "@components/common/ExhibitionCard";
import CustomExhibitionForm from "./CustomExhibitionForm";

const SORTS = [
  { code: "latest", label: "최신순" },
  { code: "ending", label: "마감임박순" },
];

/**
 * ExhibitionSelectStep — 관람한 전시 선택(04-01, wf-07).
 * 리스트에서 전시를 고른 뒤 "다음"으로 확정. "전시 직접 추가하기" → CustomExhibitionForm.
 * props: { onSelect(exhibition), initialId? }
 */
export default function ExhibitionSelectStep({ onSelect, initialId }) {
  const [keyword, setKeyword] = useState("");
  const [sort, setSort] = useState("latest");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [picked, setPicked] = useState(null);
  const [adding, setAdding] = useState(false);
  const debounceRef = useRef(null);
  const preselDone = useRef(false);

  const fetchList = async (kw, sortCode) => {
    setLoading(true);
    setError(false);
    try {
      const params = { size: 20, sort: sortCode };
      if (kw && kw.trim().length >= 2) params.keyword = kw.trim();
      const { data } = await getList(params);
      const content = data?.content ?? [];
      setItems(content);
      setTotal(data?.totalElements ?? data?.totalCount ?? content.length);
      // 프리셋 id가 목록에 있으면 최초 1회 선택 표시.
      if (initialId && !preselDone.current) {
        const hit = content.find((it) => it.exhibitionId === initialId);
        if (hit) {
          setPicked(hit);
          preselDone.current = true;
        }
      }
    } catch {
      setError(true);
      setItems([]);
      setTotal(null);
    } finally {
      setLoading(false);
    }
  };

  // 최초 로드 + 검색어(≥2자)/정렬 디바운스. setTimeout 콜백 안에서만 상태 변경.
  useEffect(() => {
    const kw = keyword.trim();
    if (kw.length === 1) return undefined; // 1자 무시(백엔드 최소 2자)
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchList(kw, sort), keyword ? 350 : 0);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, sort]);

  if (adding) {
    return (
      <CustomExhibitionForm onCreated={(exh) => onSelect(exh)} onCancel={() => setAdding(false)} />
    );
  }

  return (
    <div className="rec-step">
      <h2 className="rec-heading">관람한 전시를 선택해주세요</h2>

      <div className="rec-search">
        <input
          className="rec-input"
          value={keyword}
          placeholder="전시 이름으로 검색 (2자 이상)"
          onChange={(e) => setKeyword(e.target.value)}
          aria-label="전시 검색"
        />
      </div>

      <div className="rec-list-bar">
        <span className="rec-list-bar__count">총 {total ?? items.length}개</span>
        <select
          className="rec-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="정렬"
        >
          {SORTS.map((s) => (
            <option key={s.code} value={s.code}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Spinner full />
      ) : error ? (
        <EmptyState
          title="목록을 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button variant="secondary" size="sm" onClick={() => fetchList(keyword, sort)}>
              다시 시도
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState title="전시를 찾지 못했어요" description="검색어를 바꾸거나 직접 추가해 보세요." />
      ) : (
        <ul className="rec-exh-list" style={{ maxHeight: "52vh", overflowY: "auto" }}>
          {items.map((item) => {
            const selected = picked?.exhibitionId === item.exhibitionId;
            return (
              <li key={item.exhibitionId}>
                <button
                  type="button"
                  className={`rec-exh-pick ${selected ? "is-selected" : ""}`}
                  onClick={() => setPicked(item)}
                  aria-pressed={selected}
                >
                  <ExhibitionCard item={item} variant="list" to={null} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rec-select-footer">
        <button type="button" className="rec-add-banner" onClick={() => setAdding(true)}>
          <span className="rec-add-banner__text">
            <strong>전시 직접 추가하기</strong>
            <small>찾으시는 전시가 없거나 종료 되었나요?</small>
          </span>
          <span className="rec-add-banner__chev" aria-hidden>
            ›
          </span>
        </button>

        <div className="rec-actions rec-actions--single">
          <Button block disabled={!picked} onClick={() => picked && onSelect(picked)}>
            다음
          </Button>
        </div>
      </div>
    </div>
  );
}

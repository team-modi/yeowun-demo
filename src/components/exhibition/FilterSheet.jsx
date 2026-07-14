import { useEffect, useState } from "react";

import { getList } from "@api/exhibition";
import FilterChip from "@components/common/FilterChip";
import Button from "@components/common/Button";
import {
  REGIONS,
  CATEGORIES,
  MIN_KEYWORD,
} from "@components/exhibition/constants";
import { RefreshIcon } from "@components/exhibition/icons";

const toggleIn = (arr, code) =>
  arr.includes(code) ? arr.filter((x) => x !== code) : [...arr, code];

/**
 * FilterSheet — 지역/장르 선택 바텀시트(스크림 + 슬라이드업).
 *
 * props:
 *   regions, categories        — 현재 적용된 필터(초기 draft 값)
 *   keyword, sort, section      — 미리보기 개수 계산용 컨텍스트
 *   onApply(regions, categories) — "N개 전시 보기" 클릭 시 적용 후 닫기
 *   onClose()                   — 스크림/닫기
 */
export default function FilterSheet({
  regions,
  categories,
  keyword,
  sort,
  section,
  onApply,
  onClose,
}) {
  const [draftRegions, setDraftRegions] = useState(regions);
  const [draftCategories, setDraftCategories] = useState(categories);
  const [count, setCount] = useState(null);

  // ---- 진입 애니메이션 & 스크롤 잠금 ----
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ---- draft 필터로 총 개수 미리보기(디바운스) ----
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const p = { sort, size: 1 };
        if (section) p.section = section;
        if (keyword && keyword.length >= MIN_KEYWORD) p.keyword = keyword;
        if (draftRegions.length) p.region = draftRegions.join(",");
        if (draftCategories.length) p.category = draftCategories.join(",");
        const { data } = await getList(p);
        if (!cancelled) setCount(data?.totalElements ?? data?.totalCount ?? 0);
      } catch {
        if (!cancelled) setCount(null);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [draftRegions, draftCategories, keyword, sort, section]);

  const reset = () => {
    setDraftRegions([]);
    setDraftCategories([]);
  };

  return (
    <div className="exh-sheet-root" role="dialog" aria-modal="true" aria-label="필터">
      <button
        type="button"
        className={`exh-sheet__scrim ${entered ? "is-open" : ""}`}
        aria-label="필터 닫기"
        onClick={onClose}
      />

      <div className={`exh-sheet ${entered ? "is-open" : ""}`}>
        <div className="exh-sheet__handle" aria-hidden="true" />
        <h3 className="exh-sheet__title">필터</h3>

        <div className="exh-sheet__body">
          <div className="exh-filter-group">
            <p className="exh-filter-group__label">지역</p>
            <div className="exh-chip-row">
              {/* 시안: 선택 없음 = "전체" 활성 (빈 선택 = 전체 조회와 동일) */}
              <FilterChip
                active={draftRegions.length === 0}
                onClick={() => setDraftRegions([])}
              >
                전체
              </FilterChip>
              {REGIONS.map((r) => (
                <FilterChip
                  key={r.code}
                  active={draftRegions.includes(r.code)}
                  onClick={() => setDraftRegions((prev) => toggleIn(prev, r.code))}
                >
                  {r.label}
                </FilterChip>
              ))}
            </div>
          </div>

          <div className="exh-filter-group">
            <p className="exh-filter-group__label">장르</p>
            <div className="exh-chip-row">
              <FilterChip
                active={draftCategories.length === 0}
                onClick={() => setDraftCategories([])}
              >
                전체
              </FilterChip>
              {CATEGORIES.map((c) => (
                <FilterChip
                  key={c.code}
                  active={draftCategories.includes(c.code)}
                  onClick={() =>
                    setDraftCategories((prev) => toggleIn(prev, c.code))
                  }
                >
                  {c.label}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>

        <div className="exh-sheet__actions">
          <Button variant="ghost" onClick={reset} className="exh-sheet__reset">
            <RefreshIcon size={16} />
            초기화
          </Button>
          <Button
            variant="primary"
            block
            className="exh-sheet__apply"
            onClick={() => onApply(draftRegions, draftCategories)}
          >
            {count !== null ? `${count}개 전시 보기` : "전시 보기"}
          </Button>
        </div>
      </div>
    </div>
  );
}

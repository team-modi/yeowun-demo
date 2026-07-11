import { useEffect, useRef, useState } from "react";

import { searchVenues } from "@api/exhibition";
import { BackIcon } from "@components/common/icons";

/**
 * VenueSearchScreen — 전시관 검색 전체화면(04-02 "전시관 검색").
 * 입력 → searchVenues(keyword) 자동완성. 결과 선택 시 onPick(venue).
 * 결과가 없거나 원하는 곳이 없으면 "'{입력}' 직접 입력"으로 onUsePlace(text).
 * props: { onPick(venue), onUsePlace(text), onClose }
 */
export default function VenueSearchScreen({ onPick, onUsePlace, onClose }) {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  // 디바운스. 동기 setState 회피 위해 상태 변경은 setTimeout 콜백 안에서만.
  useEffect(() => {
    clearTimeout(debounceRef.current);
    const kw = keyword.trim();
    debounceRef.current = setTimeout(async () => {
      if (kw.length < 1) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const { data } = await searchVenues(kw);
        setResults(data?.venues ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, keyword ? 300 : 0);
    return () => clearTimeout(debounceRef.current);
  }, [keyword]);

  const kw = keyword.trim();

  return (
    <div className="rec-screen">
      <div className="rec-screen__head">
        <button type="button" className="rec-screen__back" onClick={onClose} aria-label="닫기">
          <BackIcon />
        </button>
        <h2 className="rec-screen__title">전시관 검색</h2>
      </div>
      <div className="rec-screen__body">
        <input
          className="rec-input"
          value={keyword}
          autoFocus
          placeholder="전시관 검색"
          onChange={(e) => setKeyword(e.target.value)}
          aria-label="전시관 검색"
        />
        <ul className="rec-venue-list">
          {results.map((v) => (
            <li key={v.venueId}>
              <button type="button" className="rec-venue-item" onClick={() => onPick(v)}>
                <span className="rec-venue-item__name">{v.name}</span>
                {v.address && <span className="rec-venue-item__addr">{v.address}</span>}
              </button>
            </li>
          ))}
          {kw && !loading && (
            <li>
              <button type="button" className="rec-venue-item" onClick={() => onUsePlace(kw)}>
                <span className="rec-venue-item__name">‘{kw}’ 직접 입력</span>
                <span className="rec-venue-item__addr">목록에 없다면 입력한 장소로 등록</span>
              </button>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

import { useState } from "react";

const COLLAPSED_COUNT = 6;

/**
 * KeywordsSection — "나의 감정 키워드"를 #해시태그 칩으로.
 * 6개 초과 시 "더보기"로 펼침.
 * props: { keywords: string[] }
 */
export default function KeywordsSection({ keywords }) {
  const [expanded, setExpanded] = useState(false);

  const list = Array.isArray(keywords) ? keywords : [];
  const hasMore = list.length > COLLAPSED_COUNT;
  const shown = expanded ? list : list.slice(0, COLLAPSED_COUNT);

  return (
    <section className="pf-keywords">
      <div className="pf-keywords__head">
        <h2 className="pf-keywords__title">나의 감정 키워드</h2>
        {hasMore && (
          <button
            type="button"
            className="pf-keywords__more"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "접기" : "더보기"}
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <p className="pf-keywords__empty">
          전시를 기록하면 나만의 감정 키워드가 모여요.
        </p>
      ) : (
        <div className="pf-keywords__list">
          {shown.map((kw) => (
            <span className="pf-hashtag" key={kw}>
              #{String(kw).replace(/^#/, "")}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

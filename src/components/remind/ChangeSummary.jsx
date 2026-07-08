import EmotionChips from "@components/remind/EmotionChips";
import { fmtDate } from "@components/remind/utils";

/**
 * ChangeSummary — 감정 변화 요약(SummaryResponse).
 * 저장 응답 / 상세 응답 공통 렌더.
 * summary: {
 *   remindId, recordId, createdAt,
 *   exhibition: { exhibitionId, title, posterUrl, place, viewedAt },
 *   before: { text, emotionCodes[] },  // 그날의 감상
 *   after:  { text, emotionCodes[] },  // 오늘의 여운
 *   aiStatus: "READY" | "SKIPPED" | "FAILED",
 *   aiSummary: string | null
 * }
 * props: { summary, heading? }
 */
export default function ChangeSummary({ summary, heading = "감정 변화 요약" }) {
  if (!summary) return null;
  const { exhibition, before, after, aiStatus, aiSummary } = summary;

  return (
    <div className="change-summary">
      <p className="change-summary__heading">{heading}</p>

      {exhibition && (
        <div className="change-summary__exh">
          <span className="change-summary__exh-title">{exhibition.title}</span>
          {exhibition.place && (
            <span className="change-summary__exh-meta">{exhibition.place}</span>
          )}
          {exhibition.viewedAt && (
            <span className="change-summary__exh-meta">
              관람 {fmtDate(exhibition.viewedAt)}
            </span>
          )}
        </div>
      )}

      <div className="change-summary__sides">
        <div className="side side--before">
          <p className="side__label">그때</p>
          <EmotionChips codes={before?.emotionCodes} tone="muted" />
          {before?.text && <p className="side__text">{before.text}</p>}
        </div>

        <div className="change-summary__arrow" aria-hidden="true">
          →
        </div>

        <div className="side side--after">
          <p className="side__label">지금</p>
          <EmotionChips codes={after?.emotionCodes} tone="accent" />
          {after?.text && <p className="side__text">{after.text}</p>}
        </div>
      </div>

      <AiBlock aiStatus={aiStatus} aiSummary={aiSummary} />
    </div>
  );
}

// AI 요약: 비동기/503/비활성 시 부드럽게 저하.
function AiBlock({ aiStatus, aiSummary }) {
  if (aiSummary) {
    return (
      <div className="ai-summary">
        <p className="ai-summary__label">AI가 본 변화</p>
        <p className="ai-summary__text">{aiSummary}</p>
      </div>
    );
  }

  // READY 인데 요약이 아직 없으면 준비 중, 그 외(SKIPPED/FAILED)는 생략 안내.
  const message =
    aiStatus === "READY"
      ? "AI 요약을 준비하고 있어요. 잠시 후 다시 확인해 주세요."
      : "지금은 AI 요약을 불러오지 못했어요. 남긴 감정과 문장은 잘 저장됐어요.";

  return (
    <div className="ai-summary ai-summary--soft">
      <p className="ai-summary__text">{message}</p>
    </div>
  );
}

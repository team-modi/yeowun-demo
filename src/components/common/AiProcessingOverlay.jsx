/**
 * AiProcessingOverlay — AI 호출 대기 전용 풀스크린 오버레이.
 * 스피너만으로는 "렉"으로 느껴지는 수 초짜리 AI 작업(질문 생성·감상 정리·감정 변화 요약)에
 * "AI가 일하고 있다"는 맥락을 보여줘 체감 지연을 낮춘다.
 *
 * props:
 *   title: string        — 예: "AI가 질문을 만들고 있어요"
 *   description?: string — 보조 문구(기본: "잠시만 기다려 주세요")
 */
export default function AiProcessingOverlay({
  title,
  description = "잠시만 기다려 주세요",
}) {
  return (
    <div className="ai-overlay" role="status" aria-live="polite">
      <div className="ai-overlay__box">
        <span className="ai-overlay__spark" aria-hidden="true">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2l1.8 5.7L19.5 9.5l-5.7 1.8L12 17l-1.8-5.7L4.5 9.5l5.7-1.8L12 2z" />
            <path d="M19 14l.9 2.6L22.5 17.5l-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14z" opacity="0.7" />
          </svg>
        </span>
        <p className="ai-overlay__title">{title}</p>
        <p className="ai-overlay__desc">{description}</p>
        <span className="ai-overlay__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}

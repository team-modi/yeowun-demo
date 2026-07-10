import { useState } from "react";

import { getAiQuestions, composeAiRecord } from "@api/record";
import { useUiStore } from "@store/uiStore";
import Button from "@components/common/Button";
import Spinner from "@components/common/Spinner";
import { MAX_CONTENT, errMessage } from "./constants";

/**
 * WriteStep — 작성 방식 선택 + 감상 작성(04-08 직접 / 04-09 AI, wf-12).
 * DIRECT: textarea(0/300). AI: 질문 1개씩 → compose 초안(수정 가능) → 저장.
 * AI 미설정(503 AI_DISABLED)·실패 시 직접 작성으로 graceful degrade.
 * props: { exhibitionId, initialContent, onBack, onSubmit(content, writeMode), submitting }
 * initialContent 있으면(수정 진입) 본문을 채우고 직접 작성 단계에서 시작한다.
 */
export default function WriteStep({
  exhibitionId,
  initialContent = "",
  onBack,
  onSubmit,
  submitting,
}) {
  const toast = useUiStore((s) => s.toast);

  const [phase, setPhase] = useState(initialContent ? "direct" : "choose"); // choose | direct | ai-q | ai-review
  const [choice, setChoice] = useState(initialContent ? "DIRECT" : null); // "DIRECT" | "AI"
  const [content, setContent] = useState(initialContent);

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [qi, setQi] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);

  const over = content.length > MAX_CONTENT;

  // AI 엔드포인트가 일시적 서버 오류(500/502/504)로 실패하면 짧은 지연 뒤 1회만 재시도한다.
  // 503(AI_DISABLED)·429(AI_RATE_LIMITED)는 성격이 달라 재시도하지 않고 호출부에서 분기한다.
  const isTransient = (err) => {
    const status = err?.response?.status;
    return status === 500 || status === 502 || status === 504;
  };
  const withRetryOnce = async (fn) => {
    try {
      return await fn();
    } catch (err) {
      if (!isTransient(err)) throw err;
      await new Promise((r) => setTimeout(r, 600)); // 서버 회복 여유를 두고 1회 재시도
      return fn();
    }
  };

  const degradeToDirect = (msg) => {
    toast(msg, "info");
    setChoice("DIRECT");
    setPhase("direct");
    setQuestions([]);
    setAnswers([]);
  };

  const loadQuestions = async () => {
    // 이미 질문이 있으면 "다른 질문 보기"(재생성), 없으면 최초 로드. 실패 시 처리 방식이 다르다.
    const regenerating = questions.length > 0;
    setAiLoading(true);
    try {
      const { data } = await withRetryOnce(() => getAiQuestions({ exhibitionId }));
      const qs = data?.questions ?? [];
      if (qs.length === 0) {
        degradeToDirect("AI 질문을 만들지 못했어요. 직접 작성으로 진행할게요.");
        return false;
      }
      setQuestions(qs);
      setAnswers(qs.map(() => ""));
      setQi(0);
      return true;
    } catch (err) {
      const status = err?.response?.status;
      if (status === 503) {
        degradeToDirect("AI 기능이 아직 준비되지 않았어요. 직접 작성으로 진행할게요.");
      } else if (regenerating) {
        // 재생성 실패는 직접 작성으로 내리지 않고 현재 질문을 유지해 다시 시도할 수 있게 한다.
        if (status === 429) {
          toast("AI 사용이 잠시 많아요. 잠시 후 다시 시도해 주세요.", "error");
        } else {
          toast("질문을 다시 만들지 못했어요. 잠시 후 다시 시도해 주세요.", "error");
        }
      } else {
        // 최초 로드 실패는 기존대로 직접 작성으로 graceful degrade.
        degradeToDirect(errMessage(err, "AI 질문 생성에 실패했어요. 직접 작성으로 진행할게요."));
      }
      return false;
    } finally {
      setAiLoading(false);
    }
  };

  const goNext = async () => {
    if (choice === "DIRECT") {
      setPhase("direct");
      return;
    }
    setPhase("ai-q");
    await loadQuestions();
  };

  const compose = async () => {
    if (answers.some((a) => !a.trim())) {
      toast("모든 질문에 답해 주세요.", "error");
      return;
    }
    setAiLoading(true);
    try {
      const body = {
        exhibitionId,
        answers: questions.map((q, i) => ({ question: q, answer: answers[i].trim() })),
      };
      const { data } = await withRetryOnce(() => composeAiRecord(body));
      setContent((data?.content ?? "").slice(0, MAX_CONTENT));
      setPhase("ai-review");
      toast("AI가 감상문 초안을 만들었어요. 자유롭게 다듬어 보세요.", "success");
    } catch (err) {
      const status = err?.response?.status;
      if (status === 503) {
        degradeToDirect("AI 기능이 아직 준비되지 않았어요. 직접 작성으로 진행할게요.");
      } else if (status === 429) {
        // 서버 쿨다운이 있으므로 즉시 자동 재시도하지 않고 안내만 한다.
        toast("AI 사용이 잠시 많아요. 잠시 후 다시 시도해 주세요.", "error");
      } else {
        toast("감상문 생성에 실패했어요. 다시 시도해 주세요.", "error");
      }
    } finally {
      setAiLoading(false);
    }
  };

  const submit = () => {
    if (!content.trim()) {
      toast("감상을 입력해 주세요.", "error");
      return;
    }
    if (over) {
      toast(`감상은 ${MAX_CONTENT}자 이하로 작성해 주세요.`, "error");
      return;
    }
    onSubmit(content.trim(), choice === "AI" ? "AI" : "DIRECT");
  };

  // ── 작성 방식 선택 ──
  if (phase === "choose") {
    return (
      <div className="rec-step">
        <h2 className="rec-heading rec-heading--center">어떻게 기록할까요?</h2>
        <div className="rec-mode-list">
          <button
            type="button"
            className={`rec-mode ${choice === "DIRECT" ? "is-active" : ""}`}
            onClick={() => setChoice("DIRECT")}
          >
            <span className="rec-mode__radio" aria-hidden />
            <span className="rec-mode__text">
              <span className="rec-mode__title">직접 작성</span>
              <span className="rec-mode__desc">내 감상을 텍스트로 남겨요. 빠르게 기록하고 싶은 분께 추천해요.</span>
            </span>
          </button>
          <button
            type="button"
            className={`rec-mode ${choice === "AI" ? "is-active" : ""}`}
            onClick={() => setChoice("AI")}
          >
            <span className="rec-mode__radio" aria-hidden />
            <span className="rec-mode__text">
              <span className="rec-mode__title">질문으로 작성</span>
              <span className="rec-mode__desc">질문에 답하면 AI가 감상문으로 정리해요. 글쓰기 어려운 분께 추천해요.</span>
            </span>
          </button>
        </div>
        <div className="rec-actions">
          <Button variant="secondary" onClick={onBack} disabled={aiLoading}>
            이전
          </Button>
          <Button onClick={goNext} disabled={!choice || aiLoading}>
            다음
          </Button>
        </div>
      </div>
    );
  }

  // ── AI: 질문 1개씩 ──
  if (phase === "ai-q") {
    if (aiLoading && questions.length === 0) return <Spinner full />;
    const last = qi === questions.length - 1;
    return (
      <div className="rec-step">
        <h2 className="rec-heading rec-heading--center">
          Q{qi + 1}. {questions[qi]}
        </h2>
        <textarea
          className="rec-textarea"
          value={answers[qi] ?? ""}
          maxLength={300}
          placeholder="답변을 입력해 주세요"
          onChange={(e) =>
            setAnswers((prev) => prev.map((a, idx) => (idx === qi ? e.target.value : a)))
          }
        />
        <button type="button" className="rec-textlink" onClick={loadQuestions} disabled={aiLoading}>
          다른 질문 보기
        </button>
        <div className="rec-actions">
          <Button
            variant="secondary"
            onClick={() => (qi === 0 ? setPhase("choose") : setQi((i) => i - 1))}
            disabled={aiLoading}
          >
            이전
          </Button>
          {last ? (
            <Button onClick={compose} disabled={aiLoading || !answers[qi]?.trim()}>
              {aiLoading ? "정리하는 중…" : "감상문 만들기"}
            </Button>
          ) : (
            <Button onClick={() => setQi((i) => i + 1)} disabled={!answers[qi]?.trim()}>
              다음
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── AI 초안 검토 ──
  if (phase === "ai-review") {
    return (
      <div className="rec-step">
        <h2 className="rec-heading rec-heading--center">AI가 당신의 답변을 바탕으로 감상문을 정리했어요</h2>
        <div className="rec-field">
          <textarea
            className="rec-textarea"
            value={content}
            placeholder="전시가 남긴 잔상을 적어 주세요."
            onChange={(e) => setContent(e.target.value)}
          />
          <span className={`rec-count ${over ? "is-over" : ""}`}>
            {content.length} / {MAX_CONTENT}
          </span>
        </div>
        <div className="rec-actions">
          <Button variant="secondary" onClick={() => setPhase("ai-q")} disabled={submitting}>
            다시 쓰기
          </Button>
          <Button onClick={submit} disabled={submitting || over}>
            {submitting ? "저장 중…" : "작성 완료"}
          </Button>
        </div>
      </div>
    );
  }

  // ── 직접 작성 ──
  return (
    <div className="rec-step">
      <h2 className="rec-heading rec-heading--center">전시에 대한 감상을 자유롭게 남겨보세요</h2>
      <div className="rec-field">
        <textarea
          className="rec-textarea"
          value={content}
          placeholder="답변을 입력해 주세요"
          onChange={(e) => setContent(e.target.value)}
        />
        <span className={`rec-count ${over ? "is-over" : ""}`}>
          {content.length} / {MAX_CONTENT}
        </span>
      </div>
      <div className="rec-actions">
        <Button variant="secondary" onClick={() => setPhase("choose")} disabled={submitting}>
          이전
        </Button>
        <Button onClick={submit} disabled={submitting || over}>
          {submitting ? "저장 중…" : "작성 완료"}
        </Button>
      </div>
    </div>
  );
}

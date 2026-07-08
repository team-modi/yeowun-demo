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
 * props: { exhibitionId, onBack, onSubmit(content, writeMode), submitting }
 */
export default function WriteStep({ exhibitionId, onBack, onSubmit, submitting }) {
  const toast = useUiStore((s) => s.toast);

  const [phase, setPhase] = useState("choose"); // choose | direct | ai-q | ai-review
  const [choice, setChoice] = useState(null); // "DIRECT" | "AI"
  const [content, setContent] = useState("");

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [qi, setQi] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);

  const over = content.length > MAX_CONTENT;

  const degradeToDirect = (msg) => {
    toast(msg, "info");
    setChoice("DIRECT");
    setPhase("direct");
    setQuestions([]);
    setAnswers([]);
  };

  const loadQuestions = async () => {
    setAiLoading(true);
    try {
      const { data } = await getAiQuestions({ exhibitionId });
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
      if (err?.response?.status === 503) {
        degradeToDirect("AI 기능이 아직 준비되지 않았어요. 직접 작성으로 진행할게요.");
      } else {
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
      const { data } = await composeAiRecord(body);
      setContent((data?.content ?? "").slice(0, MAX_CONTENT));
      setPhase("ai-review");
      toast("AI가 감상문 초안을 만들었어요. 자유롭게 다듬어 보세요.", "success");
    } catch (err) {
      if (err?.response?.status === 503) {
        degradeToDirect("AI 기능이 아직 준비되지 않았어요. 직접 작성으로 진행할게요.");
      } else {
        toast(errMessage(err, "감상문 생성에 실패했어요."), "error");
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

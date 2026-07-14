import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@components/common/Button";
import EmotionChips from "@components/remind/EmotionChips";
import RemindWriteStep from "@components/remind/RemindWriteStep";
import RemindDoneScreen from "@components/remind/RemindDoneScreen";
import useRemindSave from "@components/remind/useRemindSave";
import { CalendarIcon, PinIcon } from "@components/remind/icons";
import { fmtDateSpaced, elapsedPhrase } from "@components/remind/utils";

// 순차 회상형(B) 스텝 순서. 저장 완료 시 독립 완료 화면으로 전환.
const STEPS = ["intro", "scene", "original", "write"];

/**
 * TodayRemindB — 오늘의 여운 · B(순차 회상형).
 * 이미지 → 장면 → 감상 → 다시 남기기 순으로 점진적으로 회상시킨다(4단계 진행바).
 *   intro    "1주일 전, / 이 전시를 기록했어요" + 포스터 + 전시 정보 + 날짜·장소 칩
 *   scene    "전시 속, 그 장면"(기록 첫 사진 sceneImageUrl, 없으면 포스터 폴백)
 *   original "그때 내가 기록한 여운이에요"(원본 감상 + 감정칩 + 원본 기록 보기/감정 다시 남기기)
 *   write    "지금 다시 보니 어떤가요?"(공유 RemindWriteStep → 저장)
 *   done     공유 RemindDoneScreen
 * props: { candidate }
 */
export default function TodayRemindB({ candidate }) {
  const navigate = useNavigate();
  const { saving, summary, save } = useRemindSave(candidate);
  const [step, setStep] = useState("intro");

  const stepIndex = STEPS.indexOf(step);
  const sceneImg = candidate.sceneImageUrl || candidate.posterUrl;

  // ── 저장 완료 ──
  if (summary) return <RemindDoneScreen image={sceneImg} />;

  const elapsed = elapsedPhrase(candidate);
  const place = joinPlace(candidate);

  return (
    <div className="today-flow">
      {/* 스텝 진행 표시(B 전용) */}
      <div
        className="flow-progress"
        role="progressbar"
        aria-valuenow={stepIndex + 1}
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
      >
        {STEPS.map((s, i) => (
          <span key={s} className={`flow-progress__seg ${i <= stepIndex ? "is-on" : ""}`} />
        ))}
      </div>

      {/* ── intro ── */}
      {step === "intro" && (
        <div className="flow-step flow-step--center">
          <p className="flow-prompt">
            {elapsed && (
              <>
                {elapsed},
                <br />
              </>
            )}
            이 전시를 기록했어요
          </p>

          <Poster src={candidate.posterUrl} className="flow-poster" />

          <div className="flow-exh">
            <p className="flow-exh__title">{candidate.exhibitionTitle}</p>
            {candidate.artist && <p className="flow-exh__artist">{candidate.artist}</p>}
            {(candidate.viewedAt || place) && (
              <div className="flow-exh__meta">
                {candidate.viewedAt && (
                  <span className="flow-exh__meta-item">
                    <CalendarIcon />
                    {fmtDateSpaced(candidate.viewedAt)}
                  </span>
                )}
                {place && (
                  <span className="flow-exh__meta-item">
                    <PinIcon />
                    {place}
                  </span>
                )}
              </div>
            )}
          </div>

          <Button block onClick={() => setStep("scene")}>
            다음
          </Button>
        </div>
      )}

      {/* ── scene ── */}
      {step === "scene" && (
        <div className="flow-step flow-step--center">
          <p className="flow-prompt">전시 속, 그 장면</p>
          <Poster src={sceneImg} className="flow-poster flow-poster--wide" emptyLabel="추가했던 사진 및 영상" />
          <Button block onClick={() => setStep("original")}>
            다음
          </Button>
        </div>
      )}

      {/* ── original ── */}
      {step === "original" && (
        <div className="flow-step flow-step--center">
          <p className="flow-prompt">그때 내가 기록한 여운이에요</p>

          <div className="flow-original">
            <p className="flow-original__label">그날의 감상</p>
            {candidate.originalContent ? (
              <p className="flow-original__content">{candidate.originalContent}</p>
            ) : (
              <p className="flow-original__content flow-original__content--empty">
                남긴 감상 글이 없어요.
              </p>
            )}
            <EmotionChips codes={candidate.originalEmotionCodes} tone="muted" />
          </div>

          <div className="flow-actions">
            {/* 원본 기록 보기 = 아카이브(기록 탭)로 이동. 단일 기록 딥링크 라우트가 없어 아카이브로 보낸다. */}
            <Button variant="secondary" onClick={() => navigate("/archive")}>
              원본 기록 보기
            </Button>
            <Button onClick={() => setStep("write")}>감정 다시 남기기</Button>
          </div>
        </div>
      )}

      {/* ── write ── */}
      {step === "write" && <RemindWriteStep saving={saving} onSave={save} />}
    </div>
  );
}

// 포스터(없으면 플레이스홀더). emptyLabel 로 빈 문구 커스터마이즈(scene: "추가했던 사진 및 영상").
function Poster({ src, className, emptyLabel = "이미지 없음" }) {
  return (
    <div className={className}>
      {src ? (
        <img src={src} alt="" loading="lazy" />
      ) : (
        <span className="flow-poster__empty">{emptyLabel}</span>
      )}
    </div>
  );
}

// "동작아트갤러리/서울" 형태로 장소/지역 결합.
function joinPlace(candidate) {
  return [candidate.place, candidate.region].filter(Boolean).join("/");
}

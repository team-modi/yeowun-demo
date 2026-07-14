import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "@components/common/Button";
import RemindWriteStep from "@components/remind/RemindWriteStep";
import RemindDoneScreen from "@components/remind/RemindDoneScreen";
import useRemindSave from "@components/remind/useRemindSave";
import { CalendarIcon, PinIcon } from "@components/remind/icons";
import { fmtDateSpaced, elapsedPhrase } from "@components/remind/utils";

const MAX_CHIPS = 3; // 요약 카드에 노출할 감정칩 수(초과분은 +N)

/**
 * TodayRemindA — 오늘의 여운 · A(요약형).
 * 전시·감상·감정을 한 화면에 요약해 빠르게 회상시키고 바로 다음 행동으로 유도한다(진행바 없음).
 *   summary  포스터 + 전시정보 + 그날의 감상 + 감정칩(+N) + 원본 기록 보기/감정 다시 남기기
 *   write    "지금 다시 보니 어떤가요?"(공유 RemindWriteStep → 저장)
 *   done     공유 RemindDoneScreen
 * props: { candidate }
 */
export default function TodayRemindA({ candidate }) {
  const navigate = useNavigate();
  const { saving, summary, save } = useRemindSave(candidate);
  const [step, setStep] = useState("summary"); // "summary" | "write"

  const sceneImg = candidate.sceneImageUrl || candidate.posterUrl;

  // ── 저장 완료 ──
  if (summary) return <RemindDoneScreen image={sceneImg} />;

  // ── write ──
  if (step === "write") {
    return (
      <div className="today-flow today-flow--summary">
        <RemindWriteStep saving={saving} onSave={save} />
      </div>
    );
  }

  // ── summary(한 화면 요약) ──
  const elapsed = elapsedPhrase(candidate);
  const place = joinPlace(candidate);
  const codes = candidate.originalEmotionCodes || [];
  const shownCodes = codes.slice(0, MAX_CHIPS);
  const overflow = codes.length - shownCodes.length;

  return (
    <div className="today-flow today-flow--summary">
      <p className="flow-prompt">
        {elapsed ? `${elapsed}, ` : ""}기록한 여운이에요
      </p>

      <div className="remind-summary__card">
        <Poster src={candidate.posterUrl} />

        <div className="remind-summary__info">
          <p className="remind-summary__title">{candidate.exhibitionTitle}</p>
          {candidate.artist && <p className="remind-summary__artist">{candidate.artist}</p>}

          {(candidate.viewedAt || place) && (
            <div className="remind-summary__meta">
              {candidate.viewedAt && (
                <span className="remind-summary__meta-item">
                  <CalendarIcon />
                  {fmtDateSpaced(candidate.viewedAt)}
                </span>
              )}
              {place && (
                <span className="remind-summary__meta-item">
                  <PinIcon />
                  {place}
                </span>
              )}
            </div>
          )}

          <hr className="remind-summary__divider" />

          {candidate.originalContent ? (
            <p className="remind-summary__content">{candidate.originalContent}</p>
          ) : (
            <p className="remind-summary__content remind-summary__content--empty">
              남긴 감상 글이 없어요.
            </p>
          )}

          {codes.length > 0 && (
            <ul className="remind-summary__chips">
              {shownCodes.map((code, i) => (
                <li key={`${code}-${i}`} className="emotion-chip">
                  {code}
                </li>
              ))}
              {overflow > 0 && <li className="emotion-chip emotion-chip--more">+{overflow}</li>}
            </ul>
          )}
        </div>
      </div>

      <div className="flow-actions">
        {/* 원본 기록 보기 = 아카이브(기록 탭)로 이동. 요약 카드에 이미 원본 감상이 있어 보조 동선. */}
        <Button variant="secondary" onClick={() => navigate("/archive")}>
          원본 기록 보기
        </Button>
        <Button onClick={() => setStep("write")}>감정 다시 남기기</Button>
      </div>
    </div>
  );
}

// 요약 카드 포스터(세로, 없으면 플레이스홀더).
function Poster({ src }) {
  return (
    <div className="remind-summary__poster">
      {src ? (
        <img src={src} alt="" loading="lazy" />
      ) : (
        <span className="flow-poster__empty">전시 포스터</span>
      )}
    </div>
  );
}

// "동작아트갤러리/서울" 형태로 장소/지역 결합.
function joinPlace(candidate) {
  return [candidate.place, candidate.region].filter(Boolean).join("/");
}

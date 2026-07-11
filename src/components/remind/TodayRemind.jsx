import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveRemind } from "@api/remind";
import { useUiStore } from "@store/uiStore";
import Button from "@components/common/Button";
import EmotionChips from "@components/remind/EmotionChips";
import EmotionPicker from "@components/remind/EmotionPicker";
import { CalendarIcon, PinIcon, PlusIcon } from "@components/remind/icons";
import { fmtDateSpaced, elapsedPhrase } from "@components/remind/utils";

const MAX_REFLECTION = 300; // 백엔드 @Size(max = 300)

// 오늘의 여운 스텝 순서(저장 완료 시 독립 완료 화면으로 전환).
const STEPS = ["intro", "scene", "original", "write"];

/**
 * TodayRemind — 오늘의 여운(후보) 플로우. wf-15의 스텝 진행을 따른다.
 *   intro    "1주일 전, / 이 전시를 기록했어요"(2줄) + 포스터 + 전시 정보 + 날짜·장소 칩
 *   scene    "전시 속, 그 장면" (기록 첫 사진 sceneImageUrl, 없으면 포스터 폴백)
 *   original "그때 내가 기록한 여운이에요" (원본 감상 + 감정칩 + 나가기/감정 다시 남기기)
 *   write    "지금 다시 보니 어떤가요?" (감정 다시 남기기 접힘 알약 + 한 줄 문장 → 저장)
 *   done     "오늘의 여운이 저장되었어요" (풀스크린 완료 — 이미지 + 아카이브 보러가기.
 *            그때→지금 비교는 아카이브 리마인드 상세에서 확인하는 컨셉이라 여기선 노출하지 않는다)
 * candidate: CandidateResponse {
 *   recordId, daysAgo, elapsedLabel, exhibitionId, exhibitionTitle, artist,
 *   posterUrl, sceneImageUrl(기록 첫 사진, nullable), place, region, viewedAt,
 *   originalContent, originalEmotionCodes[]
 * }
 * props: { candidate, onSaved?: (summary) => void }
 */
export default function TodayRemind({ candidate, onSaved }) {
  const toast = useUiStore((s) => s.toast);
  const navigate = useNavigate();

  const [step, setStep] = useState("intro");
  const [emotions, setEmotions] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false); // "감정 다시 남기기" 펼침 여부
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState(null); // 저장 성공 시 응답

  const canSave = reflection.trim().length > 0 && !saving;
  const stepIndex = STEPS.indexOf(step);

  // 장면 이미지: 기록 첫 사진 → 없으면 포스터 폴백.
  const sceneImg = candidate.sceneImageUrl || candidate.posterUrl;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      // SaveRequest: { recordId(필수), emotionCodes(선택), reflection(필수, ≤300) }
      const body = {
        recordId: candidate.recordId,
        emotionCodes: emotions,
        reflection: reflection.trim(),
      };
      const { data } = await saveRemind(body);
      setSummary(data);
      toast("오늘의 여운을 남겼어요", "success");
      onSaved?.(data);
    } catch (err) {
      const msg = err?.response?.data?.meta?.message || "저장에 실패했어요. 잠시 후 다시 시도해 주세요.";
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  // ── 저장 완료: 독립 풀스크린 완료 화면(이미지 + 안내 + 아카이브 이동) ──
  if (summary) {
    return (
      <div className="today-flow today-flow--done">
        <div className="flow-done__body">
          <div className="flow-done__img">
            {sceneImg && <img src={sceneImg} alt="" />}
          </div>
          <p className="flow-done__title">오늘의 여운이 저장되었어요</p>
          <p className="flow-done__sub">
            아카이브의 &lsquo;리마인드&rsquo;에서
            <br />
            확인해 보세요
          </p>
        </div>

        {/* 기획서 9절: '아카이브 보러가기' → 아카이브 '리마인드' 섹션(?tab=remind)으로 */}
        <Button block onClick={() => navigate("/archive?tab=remind")}>
          아카이브 보러가기
        </Button>
      </div>
    );
  }

  const elapsed = elapsedPhrase(candidate);
  const place = joinPlace(candidate);

  return (
    <div className="today-flow">
      {/* 스텝 진행 표시 */}
      <div className="flow-progress" role="progressbar" aria-valuenow={stepIndex + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
        {STEPS.map((s, i) => (
          <span key={s} className={`flow-progress__seg ${i <= stepIndex ? "is-on" : ""}`} />
        ))}
      </div>

      {/* ── intro: 후보 카드 ── */}
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

          {/* 와이어프레임에는 진행 수단이 없지만 실사용에 필요해 풀폭 "다음"을 유지(의도적 결정) */}
          <Button block onClick={() => setStep("scene")}>
            다음
          </Button>
        </div>
      )}

      {/* ── scene: 전시 속, 그 장면 ── */}
      {step === "scene" && (
        <div className="flow-step flow-step--center">
          <p className="flow-prompt">전시 속, 그 장면</p>
          <Poster src={sceneImg} className="flow-poster flow-poster--wide" />
          <Button block onClick={() => setStep("original")}>
            다음
          </Button>
        </div>
      )}

      {/* ── original: 그때 내가 기록한 여운 ── */}
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
            {/* 나가기 = 플로우 이탈(이전 화면으로 복귀) */}
            <Button variant="secondary" onClick={() => navigate(-1)}>
              나가기
            </Button>
            <Button onClick={() => setStep("write")}>감정 다시 남기기</Button>
          </div>
        </div>
      )}

      {/* ── write: 지금 다시 보니 어떤가요? ── */}
      {step === "write" && (
        <div className="flow-step">
          <p className="flow-prompt flow-prompt--left">
            지금 다시 보니
            <br />
            어떤가요?
          </p>

          <div className="remind-form">
            <p className="remind-form__label">감정 다시 남기기</p>
            {/* 접힘 구조: '+' 알약(또는 선택 칩 나열) → 누르면 EmotionPicker 펼침 */}
            {pickerOpen ? (
              <div className="emotion-fold__open">
                <EmotionPicker selected={emotions} onChange={setEmotions} disabled={saving} />
                <button
                  type="button"
                  className="emotion-fold__collapse"
                  onClick={() => setPickerOpen(false)}
                >
                  접기
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={`emotion-fold ${emotions.length ? "emotion-fold--chips" : ""}`}
                aria-label={emotions.length ? "감정 다시 선택" : "감정 선택 열기"}
                disabled={saving}
                onClick={() => setPickerOpen(true)}
              >
                {emotions.length ? (
                  emotions.map((code) => (
                    <span key={code} className="emotion-chip">
                      {code}
                    </span>
                  ))
                ) : (
                  <PlusIcon size={18} />
                )}
              </button>
            )}

            <p className="remind-form__label">한 줄로 남기고 싶은 문장</p>
            <div className="reflection-field">
              <textarea
                value={reflection}
                maxLength={MAX_REFLECTION}
                rows={4}
                disabled={saving}
                placeholder="지금 떠오르는 생각을 적어보세요"
                onChange={(e) => setReflection(e.target.value)}
              />
            </div>

            <Button block disabled={!canSave} onClick={handleSave}>
              {saving ? "저장 중…" : "오늘의 여운 저장"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// 포스터(없으면 플레이스홀더).
function Poster({ src, className }) {
  return (
    <div className={className}>
      {src ? (
        <img src={src} alt="" loading="lazy" />
      ) : (
        <span className="flow-poster__empty">이미지 없음</span>
      )}
    </div>
  );
}

// "동작아트갤러리/서울" 형태로 장소/지역 결합(와이어프레임 칩 표기).
function joinPlace(candidate) {
  return [candidate.place, candidate.region].filter(Boolean).join("/");
}

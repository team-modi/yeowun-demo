import { useState } from "react";
import Button from "@components/common/Button";
import AiProcessingOverlay from "@components/common/AiProcessingOverlay";
import EmotionPicker from "@components/remind/EmotionPicker";
import { PlusIcon } from "@components/remind/icons";

const MAX_REFLECTION = 300; // 백엔드 @Size(max = 300)

/**
 * RemindWriteStep — "지금 다시 보니 어떤가요?" 스텝(A·B 플로우 공용).
 * 감정 다시 남기기(접힘 EmotionPicker) + 한 줄 문장 + 저장.
 *
 * props:
 *   saving: boolean          — 저장 진행 중(버튼 잠금)
 *   onSave: (reflection: string, emotions: string[]) => void
 *   headingAlign?: "left"    — 프롬프트 정렬(기본 left)
 */
export default function RemindWriteStep({ saving = false, onSave }) {
  const [emotions, setEmotions] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reflection, setReflection] = useState("");

  const canSave = reflection.trim().length > 0 && !saving;

  return (
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

        <Button block disabled={!canSave} onClick={() => onSave(reflection, emotions)}>
          {saving ? "저장 중…" : "오늘의 여운 저장"}
        </Button>

        {/* 저장 시 서버가 감정 변화 AI 요약을 동기 수행해 수 초 걸릴 수 있다 — 대기 맥락 제공 */}
        {saving && (
          <AiProcessingOverlay
            title="AI가 감정의 변화를 살펴보고 있어요"
            description="그날의 여운과 오늘의 여운을 비교하는 중이에요"
          />
        )}
      </div>
    </div>
  );
}

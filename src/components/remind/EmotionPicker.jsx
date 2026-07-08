import { useState } from "react";

/**
 * EmotionPicker — 지금 다시 남기는 감정 선택(프리셋 + 직접 입력).
 * 백엔드 SaveRequest.emotionCodes(선택, 각 10자 이내)에 맞춘 문자열 배열을 관리.
 * props: { selected: string[], onChange: (next:string[]) => void, max?: number, disabled?: boolean }
 */
const PRESETS = [
  "평화로운",
  "차분한",
  "고요한",
  "벅찬",
  "설레는",
  "먹먹한",
  "쓸쓸한",
  "슬픈",
  "서정적인",
  "몽환적인",
  "생생한",
  "강렬한",
  "따뜻한",
  "그리운",
  "위로받은",
  "낯선",
];

const MAX_CODE_LEN = 10; // 백엔드 @Size(max = 10)

export default function EmotionPicker({ selected, onChange, max = 5, disabled = false }) {
  const [custom, setCustom] = useState("");
  const atMax = selected.length >= max;

  const toggle = (code) => {
    if (disabled) return;
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else if (!atMax) {
      onChange([...selected, code]);
    }
  };

  const addCustom = () => {
    const value = custom.trim();
    if (!value || disabled || atMax) return;
    if (value.length > MAX_CODE_LEN) return;
    if (!selected.includes(value)) onChange([...selected, value]);
    setCustom("");
  };

  // 프리셋에 없는, 직접 입력으로 선택된 감정도 칩으로 노출.
  const options = [...PRESETS, ...selected.filter((c) => !PRESETS.includes(c))];

  return (
    <div className="emotion-picker">
      <div className="emotion-picker__options" role="group" aria-label="지금 감정 선택">
        {options.map((code) => {
          const active = selected.includes(code);
          return (
            <button
              key={code}
              type="button"
              className={`emotion-picker__chip ${active ? "is-active" : ""}`}
              aria-pressed={active}
              disabled={disabled || (!active && atMax)}
              onClick={() => toggle(code)}
            >
              {code}
            </button>
          );
        })}
      </div>

      <div className="emotion-picker__custom">
        <input
          type="text"
          value={custom}
          maxLength={MAX_CODE_LEN}
          placeholder="직접 입력 (최대 10자)"
          disabled={disabled || atMax}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <button
          type="button"
          className="emotion-picker__add"
          disabled={disabled || atMax || !custom.trim()}
          onClick={addCustom}
        >
          추가
        </button>
      </div>

      <p className="emotion-picker__hint">
        {atMax ? `최대 ${max}개까지 선택했어요` : `선택 ${selected.length} / ${max}`}
      </p>
    </div>
  );
}

import { useState } from "react";

import { useUiStore } from "@store/uiStore";
import Button from "@components/common/Button";
import FilterChip from "@components/common/FilterChip";
import {
  EMOTION_PRESETS,
  MAX_EMOTION_LEN,
  MAX_MEDIA,
  isoToKorean,
} from "./constants";
import SelectedExhibition from "./SelectedExhibition";
import BottomSheet from "./BottomSheet";
import Calendar from "./Calendar";
import {
  CalendarIcon,
  CloseIcon,
  ImageIcon,
  ImagePlusIcon,
  PlayIcon,
  PlusIcon,
  VideoIcon,
} from "./icons";

/**
 * EmotionMediaStep — 관람일·감정 키워드·미디어(04, rec-detail-1~3).
 * 관람일: 캘린더 바텀시트(단일). 감정: "+" 필 → 감정 시트(프리셋 칩 + 나만의 키워드),
 * 선택 시 본문에 다크 필 칩으로 표시. 미디어: N/5 add 타일 + 썸네일(삭제/재생), 사진·영상 시트(URL).
 * props: { exhibition, viewedAt,setViewedAt, emotions,setEmotions, media,setMedia, onNext }
 */
export default function EmotionMediaStep({
  exhibition,
  viewedAt,
  setViewedAt,
  emotions,
  setEmotions,
  media,
  setMedia,
  onNext,
}) {
  const toast = useUiStore((s) => s.toast);
  const [customEmotion, setCustomEmotion] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [tmpDate, setTmpDate] = useState(viewedAt);
  const [emotionOpen, setEmotionOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);

  const toggleEmotion = (label) =>
    setEmotions((prev) =>
      prev.includes(label) ? prev.filter((e) => e !== label) : [...prev, label],
    );

  const addCustomEmotion = () => {
    const v = customEmotion.trim();
    if (!v) return;
    if (v.length > MAX_EMOTION_LEN) {
      toast(`감정 키워드는 ${MAX_EMOTION_LEN}자 이하로 입력해 주세요.`, "error");
      return;
    }
    if (!emotions.includes(v)) setEmotions((prev) => [...prev, v]);
    setCustomEmotion("");
  };

  const openDate = () => {
    setTmpDate(viewedAt);
    setDateOpen(true);
  };
  const confirmDate = () => {
    if (tmpDate) setViewedAt(tmpDate);
    setDateOpen(false);
  };

  const openMedia = () => {
    if (media.length >= MAX_MEDIA) {
      toast(`미디어는 최대 ${MAX_MEDIA}개까지 추가할 수 있어요.`, "error");
      return;
    }
    setMediaOpen(true);
  };
  const pickMedia = (type) => {
    const label = type === "PHOTO" ? "사진" : "영상";
    const url = window.prompt(`${label} URL을 입력해 주세요`);
    if (url == null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      toast("미디어 URL을 입력해 주세요.", "error");
      return;
    }
    setMedia((prev) => [...prev, { type, url: trimmed }]);
    setMediaOpen(false);
  };
  const removeMedia = (idx) => setMedia((prev) => prev.filter((_, i) => i !== idx));

  const customEmotions = emotions.filter((e) => !EMOTION_PRESETS.includes(e));

  return (
    <div className="rec-step">
      <SelectedExhibition exhibition={exhibition} />

      {/* 관람일 */}
      <div className="rec-field">
        <span className="rec-field__label">관람일</span>
        <button type="button" className="rec-selectfield" onClick={openDate}>
          <span className="rec-selectfield__val">{isoToKorean(viewedAt)}</span>
          <span className="rec-selectfield__chev" aria-hidden>
            <CalendarIcon size={20} />
          </span>
        </button>
      </div>

      {/* 감정 키워드 */}
      <div className="rec-field">
        <span className="rec-field__label">감정 키워드</span>
        <p className="rec-field__desc">전시를 보고 마음에 남았던 감정을 선택해 보세요</p>
        {emotions.length === 0 ? (
          <button
            type="button"
            className="rec-emotion-add"
            onClick={() => setEmotionOpen(true)}
            aria-label="감정 키워드 선택"
          >
            <PlusIcon size={22} />
          </button>
        ) : (
          <button
            type="button"
            className="rec-emotion-picked"
            onClick={() => setEmotionOpen(true)}
            aria-label="감정 키워드 편집"
          >
            {emotions.map((label) => (
              <span key={label} className="rec-emotion-pill">
                {label}
              </span>
            ))}
          </button>
        )}
      </div>

      {/* 내가 바라본 전시(미디어) */}
      <div className="rec-field">
        <span className="rec-field__label">내가 바라본 전시</span>
        <p className="rec-field__desc">전시를 떠올릴 수 있는 장면이 있다면 추가해 주세요</p>
        <div className="rec-media-grid">
          {media.length < MAX_MEDIA && (
            <button type="button" className="rec-media-tile rec-media-tile--add" onClick={openMedia}>
              <span className="rec-media-tile__icon" aria-hidden>
                <ImagePlusIcon size={26} />
              </span>
              <span className="rec-media-tile__count">
                {media.length}/{MAX_MEDIA}
              </span>
            </button>
          )}
          {media.map((m, idx) => (
            <div className="rec-media-tile rec-media-tile--filled" key={idx}>
              {m.type === "PHOTO" ? (
                <img className="rec-media-tile__img" src={m.url} alt="" />
              ) : (
                <span className="rec-media-tile__play" aria-hidden>
                  <PlayIcon size={22} />
                </span>
              )}
              <button
                type="button"
                className="rec-media-tile__remove"
                onClick={() => removeMedia(idx)}
                aria-label="미디어 삭제"
              >
                <CloseIcon size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rec-actions rec-actions--single">
        {emotions.length === 0 && (
          <p className="rec-field__desc rec-actions__hint">감정 키워드를 하나 이상 선택해 주세요</p>
        )}
        <Button block disabled={emotions.length === 0} onClick={onNext}>
          다음
        </Button>
      </div>

      {/* 관람일 캘린더 시트 */}
      {dateOpen && (
        <BottomSheet
          title="관람 날짜를 선택해주세요"
          onClose={() => setDateOpen(false)}
          footer={
            <Button block disabled={!tmpDate} onClick={confirmDate}>
              완료
            </Button>
          }
        >
          <Calendar start={tmpDate || null} end={null} onPick={setTmpDate} />
        </BottomSheet>
      )}

      {/* 감정 키워드 시트 */}
      {emotionOpen && (
        <BottomSheet
          title="감정 키워드를 선택해 주세요"
          onClose={() => setEmotionOpen(false)}
          footer={
            <Button block onClick={() => setEmotionOpen(false)}>
              완료
            </Button>
          }
        >
          <div className="rec-emotion-chips">
            {EMOTION_PRESETS.map((label) => (
              <FilterChip
                key={label}
                className="rec-emotion-chip"
                active={emotions.includes(label)}
                onClick={() => toggleEmotion(label)}
              >
                {label}
              </FilterChip>
            ))}
          </div>

          <div className="rec-field rec-keyword-block">
            <span className="rec-field__label">나만의 키워드</span>
            <div className="rec-row rec-row--auto rec-keyword-row">
              <input
                className="rec-input"
                value={customEmotion}
                maxLength={MAX_EMOTION_LEN}
                placeholder="10자 이내로 작성해 주세요"
                onChange={(e) => setCustomEmotion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomEmotion();
                  }
                }}
              />
              <button
                type="button"
                className="rec-keyword-add"
                onClick={addCustomEmotion}
                aria-label="키워드 추가"
              >
                <PlusIcon size={20} />
              </button>
            </div>
            {customEmotions.length > 0 && (
              <div className="rec-custom-chips">
                {customEmotions.map((label) => (
                  <button
                    key={label}
                    type="button"
                    className="rec-custom-chip"
                    onClick={() => toggleEmotion(label)}
                  >
                    {label}
                    <CloseIcon size={13} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </BottomSheet>
      )}

      {/* 미디어 추가 시트 */}
      {mediaOpen && (
        <BottomSheet
          title="사진 / 영상을 추가해주세요"
          subtitle={`최대 ${MAX_MEDIA}개`}
          onClose={() => setMediaOpen(false)}
          footer={
            <Button block onClick={() => setMediaOpen(false)}>
              완료
            </Button>
          }
        >
          <ul className="rec-option-list">
            <li>
              <button
                type="button"
                className="rec-option rec-option--icon"
                onClick={() => pickMedia("PHOTO")}
              >
                <ImageIcon size={22} />
                사진선택
              </button>
            </li>
            <li>
              <button
                type="button"
                className="rec-option rec-option--icon"
                onClick={() => pickMedia("VIDEO")}
              >
                <VideoIcon size={22} />
                영상선택
              </button>
            </li>
          </ul>
        </BottomSheet>
      )}
    </div>
  );
}

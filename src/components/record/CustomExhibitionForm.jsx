import { useState } from "react";

import { createCustom } from "@api/exhibition";
import { useUiStore } from "@store/uiStore";
import Button from "@components/common/Button";
import FilterChip from "@components/common/FilterChip";
import {
  CATEGORY_OPTIONS,
  FORMAT_OPTIONS,
  categoryLabel,
  errMessage,
  formatLabel,
  isoToDot,
} from "./constants";
import BottomSheet from "./BottomSheet";
import Calendar from "./Calendar";
import VenueSearchScreen from "./VenueSearchScreen";

/** 선택 필드(셀렉트처럼 보이는 버튼) — 값 없으면 placeholder. */
function SelectField({ label, value, placeholder, onClick, required }) {
  return (
    <div className="rec-field">
      <span className="rec-field__label">
        {label}
        {required && <span className="rec-field__req">*</span>}
      </span>
      <button
        type="button"
        className={`rec-selectfield ${value ? "" : "is-placeholder"}`}
        onClick={onClick}
      >
        <span className="rec-selectfield__val">{value || placeholder}</span>
        <span className="rec-selectfield__chev" aria-hidden>
          ⌄
        </span>
      </button>
    </div>
  );
}

/**
 * CustomExhibitionForm — 전시 직접 추가(04-02~04, wf-08/09).
 * 포스터(placeholder·URL), 전시명, 전시관(검색화면), 전시기간(캘린더 range 시트),
 * 전시형태(바텀시트→개인전 작가명), 장르(바텀시트) → createCustom → onCreated(exhibition).
 * props: { onCreated(exhibition), onCancel }
 */
export default function CustomExhibitionForm({ onCreated, onCancel }) {
  const toast = useUiStore((s) => s.toast);

  const [title, setTitle] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [posterOpen, setPosterOpen] = useState(false);

  const [venueId, setVenueId] = useState(null);
  const [venueName, setVenueName] = useState(""); // 표시용(전시관명 또는 직접입력 장소)
  const [place, setPlace] = useState("");
  const [region, setRegion] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [format, setFormat] = useState("");
  const [artist, setArtist] = useState("");
  const [category, setCategory] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [sheet, setSheet] = useState(null); // null | "date" | "format" | "genre"
  const [venueOpen, setVenueOpen] = useState(false);

  // 시트 임시 상태
  const [tmpStart, setTmpStart] = useState("");
  const [tmpEnd, setTmpEnd] = useState("");
  const [tmpFormat, setTmpFormat] = useState("");
  const [tmpArtist, setTmpArtist] = useState("");
  const [tmpCategory, setTmpCategory] = useState("");

  // ── 전시관 검색화면 ──
  const pickVenue = (v) => {
    setVenueId(v.venueId);
    setVenueName(v.name);
    setPlace("");
    setRegion(v.region || "");
    setVenueOpen(false);
  };
  const usePlace = (text) => {
    setVenueId(null);
    setVenueName(text);
    setPlace(text);
    setVenueOpen(false);
  };

  // ── 전시 기간 시트 ──
  const openDate = () => {
    setTmpStart(startDate);
    setTmpEnd(endDate);
    setSheet("date");
  };
  const pickDate = (iso) => {
    if (!tmpStart || (tmpStart && tmpEnd)) {
      setTmpStart(iso);
      setTmpEnd("");
    } else if (iso >= tmpStart) {
      setTmpEnd(iso);
    } else {
      setTmpStart(iso);
    }
  };
  const confirmDate = () => {
    setStartDate(tmpStart);
    setEndDate(tmpEnd || tmpStart);
    setSheet(null);
  };

  // ── 전시 형태 시트 ──
  const openFormat = () => {
    setTmpFormat(format);
    setTmpArtist(artist);
    setSheet("format");
  };
  const confirmFormat = () => {
    if (tmpFormat === "SOLO" && !tmpArtist.trim()) {
      toast("개인전은 작가 이름이 필요해요.", "error");
      return;
    }
    setFormat(tmpFormat);
    setArtist(tmpFormat === "SOLO" ? tmpArtist.trim() : artist);
    setSheet(null);
  };

  // ── 장르 시트 ──
  const openGenre = () => {
    setTmpCategory(category);
    setSheet("genre");
  };
  const confirmGenre = () => {
    setCategory(tmpCategory);
    setSheet(null);
  };

  const submit = async () => {
    if (!title.trim()) {
      toast("전시명을 입력해 주세요.", "error");
      return;
    }
    if (format === "SOLO" && !artist.trim()) {
      toast("개인전은 작가 이름이 필요해요.", "error");
      return;
    }
    const body = {
      title: title.trim(),
      posterUrl: posterUrl.trim() || null,
      venueId: venueId ?? null,
      place: venueId == null ? place.trim() || null : null,
      startDate: startDate || null,
      endDate: endDate || null,
      format: format || null,
      artist: artist.trim() || null,
      region: region || null,
      category: category || null,
    };
    setSubmitting(true);
    try {
      const { data } = await createCustom(body);
      toast("전시를 추가했어요.", "success");
      onCreated({
        exhibitionId: data.exhibitionId,
        title: body.title,
        posterUrl: body.posterUrl,
        place: venueName || body.place,
        artistSummary: body.artist,
        startDate: body.startDate,
        endDate: body.endDate,
      });
    } catch (err) {
      toast(errMessage(err, "전시 추가에 실패했어요."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const periodValue = startDate
    ? `${isoToDot(startDate)}${endDate && endDate !== startDate ? ` ~ ${isoToDot(endDate)}` : ""}`
    : "";
  const formatValue = format
    ? `${formatLabel(format)}${format === "SOLO" && artist ? ` · ${artist}` : ""}`
    : "";

  return (
    <div className="rec-step">
      <h2 className="rec-heading">전시 정보를 입력해 주세요</h2>

      <div className="rec-form">
        {/* 포스터 */}
        <div className="rec-poster-wrap">
          <button
            type="button"
            className="rec-poster"
            onClick={() => setPosterOpen((o) => !o)}
            aria-label="전시 포스터 추가"
          >
            {posterUrl.trim() ? (
              <img className="rec-poster__img" src={posterUrl.trim()} alt="" />
            ) : (
              <span className="rec-poster__ph">
                <span className="rec-poster__icon" aria-hidden>
                  ⊞
                </span>
                전시 포스터 추가
              </span>
            )}
          </button>
          {posterOpen && (
            <input
              className="rec-input"
              value={posterUrl}
              placeholder="포스터 이미지 URL (선택)"
              onChange={(e) => setPosterUrl(e.target.value)}
            />
          )}
        </div>

        {/* 전시명 */}
        <div className="rec-field">
          <label className="rec-field__label" htmlFor="cx-title">
            전시명<span className="rec-field__req">*</span>
          </label>
          <input
            id="cx-title"
            className="rec-input"
            value={title}
            maxLength={100}
            placeholder="전시명을 입력해 주세요"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* 전시관 */}
        <SelectField
          label="전시관"
          value={venueName}
          placeholder="전시관을 선택해 주세요"
          onClick={() => setVenueOpen(true)}
        />

        {/* 전시 기간 */}
        <SelectField
          label="전시 기간"
          value={periodValue}
          placeholder="전시 기간을 선택해 주세요"
          onClick={openDate}
        />

        {/* 전시 형태 */}
        <SelectField
          label="전시 형태"
          value={formatValue}
          placeholder="전시 형태를 선택해 주세요"
          onClick={openFormat}
        />

        {/* 장르 */}
        <SelectField
          label="장르"
          value={category ? categoryLabel(category) : ""}
          placeholder="장르를 선택해 주세요"
          onClick={openGenre}
        />

        <div className="rec-actions">
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            취소
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "추가 중…" : "다음"}
          </Button>
        </div>
      </div>

      {/* 전시관 검색 전체화면 */}
      {venueOpen && (
        <VenueSearchScreen
          onPick={pickVenue}
          onUsePlace={usePlace}
          onClose={() => setVenueOpen(false)}
        />
      )}

      {/* 전시 기간 시트 */}
      {sheet === "date" && (
        <BottomSheet
          title="전시 기간"
          onClose={() => setSheet(null)}
          footer={
            <Button block disabled={!tmpStart} onClick={confirmDate}>
              완료
            </Button>
          }
        >
          <Calendar start={tmpStart || null} end={tmpEnd || null} onPick={pickDate} />
        </BottomSheet>
      )}

      {/* 전시 형태 시트 */}
      {sheet === "format" && (
        <BottomSheet
          title="전시 형태"
          onClose={() => setSheet(null)}
          footer={
            <Button block onClick={confirmFormat} disabled={!tmpFormat}>
              완료
            </Button>
          }
        >
          <ul className="rec-option-list">
            {FORMAT_OPTIONS.map((f) => (
              <li key={f.code}>
                <button
                  type="button"
                  className={`rec-option ${tmpFormat === f.code ? "is-selected" : ""}`}
                  onClick={() => setTmpFormat(f.code)}
                >
                  {f.label}
                </button>
              </li>
            ))}
          </ul>
          {tmpFormat === "SOLO" && (
            <input
              className="rec-input"
              style={{ marginTop: "var(--space-3)" }}
              value={tmpArtist}
              maxLength={100}
              placeholder="작가 이름을 입력해주세요"
              onChange={(e) => setTmpArtist(e.target.value)}
            />
          )}
        </BottomSheet>
      )}

      {/* 장르 시트 */}
      {sheet === "genre" && (
        <BottomSheet
          title="장르"
          onClose={() => setSheet(null)}
          footer={
            <Button block onClick={confirmGenre}>
              완료
            </Button>
          }
        >
          <div className="rec-chips">
            <FilterChip active={!tmpCategory} onClick={() => setTmpCategory("")}>
              전체
            </FilterChip>
            {CATEGORY_OPTIONS.map((c) => (
              <FilterChip
                key={c.code}
                active={tmpCategory === c.code}
                onClick={() => setTmpCategory(c.code)}
              >
                {c.label}
              </FilterChip>
            ))}
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

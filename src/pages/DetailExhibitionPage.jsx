import { Fragment, useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { getDetail } from "@api/exhibition";
import { addBookmark, removeBookmark } from "@api/bookmark";
import { useUiStore } from "@store/uiStore";
import { useAuthStore } from "@store/authStore";

import Button from "@components/common/Button";
import Spinner from "@components/common/Spinner";
import ErrorState from "@components/common/ErrorState";
import {
  BookmarkIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  TicketIcon,
} from "@components/common/icons";

import { categoryLabel } from "@components/exhibition/constants";
import { daysUntil } from "@components/exhibition/dates";
import MapSheet from "@components/exhibition/detail/MapSheet";
import "@styles/detail.css";

// "2026-07-01" → "2026.07.01" (와이어프레임 날짜 표기)
const dot = (d) => (d ? String(d).replaceAll("-", ".") : "");
const periodDots = (start, end) => {
  if (!start && !end) return null;
  return `${dot(start)} ~ ${dot(end)}`.trim();
};

/**
 * 운영시간 문자열(백엔드가 우리 규칙으로 만든 표시값, 줄바꿈 구분)을 요일/시간 행으로 분리한다.
 * 예) "월 / 화 / 수 10:00 ~ 18:00\n목 / 금 10:00 ~ 19:00\n토 / 일 휴무"
 *   → [{days:"월 / 화 / 수", value:"10:00 ~ 18:00"}, ..., {days:"토 / 일", closed:true}]
 * HTML이 \n을 공백으로 뭉개 한 줄로 보이는 문제를, 프론트에서 행/열로 나눠 렌더한다.
 */
/**
 * 상태 배지(표시 전용) — 홈/탐색 카드의 status 배지 언어를 그대로 확장한다.
 * 종료 → muted / 오픈 예정 → "N일 후 오픈"(블루) / 마감 임박(7일 이내) → "N일 후 종료"(레드) / 그 외 → 진행중.
 */
const exhibitionStatus = (startDate, endDate) => {
  const untilOpen = daysUntil(startDate);
  const untilEnd = daysUntil(endDate);
  if (untilEnd != null && untilEnd < 0) return { label: "종료", tone: "ended" };
  if (untilOpen != null && untilOpen > 0)
    return { label: `${untilOpen}일 후 오픈`, tone: "opening" };
  if (untilEnd != null && untilEnd === 0)
    return { label: "오늘 종료", tone: "closing" };
  if (untilEnd != null && untilEnd <= 7)
    return { label: `${untilEnd}일 후 종료`, tone: "closing" };
  if (untilOpen != null || untilEnd != null)
    return { label: "진행중", tone: "ongoing" };
  return null;
};

// 오늘 요일("월"~"일") — 운영시간 표에서 오늘 행 강조용(표시 전용)
const TODAY_KO = ["일", "월", "화", "수", "목", "금", "토"][new Date().getDay()];

const parseHoursRows = (text) => {
  if (!text) return [];
  return text
    .split("\n")
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.endsWith("휴무")) {
        return { days: line.slice(0, -2).trim(), value: "휴무", closed: true };
      }
      const m = line.match(/^(.*?)\s+(\d{1,2}:\d{2}.*)$/);
      if (m) return { days: m[1].trim(), value: m[2].trim(), closed: false };
      return { days: line, value: "", closed: false };
    });
};

/**
 * 전시 소개 정제 — 백엔드가 워드프레스 블록 HTML(주석/figure/img/태그)을
 * 통째로 내려주는 경우가 있어, 마크업을 걷어내고 "소개글 텍스트"만 남긴다.
 * (포스터 이미지는 상단 히어로에 이미 표시되므로 본문 이미지는 제거)
 */
function extractDescriptionText(raw) {
  if (!raw) return "";
  const source = String(raw);
  // 태그가 전혀 없으면 그대로 사용(이미 순수 텍스트)
  if (!/[<&]/.test(source)) return source.trim();
  // wp 블록 주석 <!-- wp:... --> 선제거
  const cleaned = source.replace(/<!--[\s\S]*?-->/g, "");
  try {
    const doc = new DOMParser().parseFromString(cleaned, "text/html");
    doc
      .querySelectorAll("figure, img, script, style, iframe")
      .forEach((el) => el.remove());
    doc.querySelectorAll("br").forEach((el) => el.replaceWith("\n"));
    doc
      .querySelectorAll("p, div, h1, h2, h3, h4, h5, h6, li, blockquote")
      .forEach((el) => el.append("\n\n"));
    return (doc.body.textContent || "")
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } catch {
    // DOMParser 실패 시 정규식 폴백
    return cleaned
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
}

export default function DetailExhibitionPage() {
  const { exhibitionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useUiStore((s) => s.toast);
  const authed = useAuthStore((s) => s.authed);

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState(null); // "NOT_FOUND" | "FORBIDDEN" | "GENERIC"
  const [bmPending, setBmPending] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorCode(null);
    try {
      const { data } = await getDetail(exhibitionId);
      setDetail(data);
    } catch (err) {
      const status = err?.response?.status;
      const code = err?.response?.data?.meta?.errorCode;
      if (status === 404 || code === "NOT_FOUND") setErrorCode("NOT_FOUND");
      else if (status === 403 || code === "FORBIDDEN") setErrorCode("FORBIDDEN");
      else setErrorCode("GENERIC");
    } finally {
      setLoading(false);
    }
  }, [exhibitionId]);

  useEffect(() => {
    // 마이크로태스크로 지연시켜 effect 내 동기 setState(cascading render)를 피한다.
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const onToggleBookmark = async () => {
    if (!detail || bmPending) return;
    // 관심 등록은 로그인 필요 — 비로그인은 로그인 화면으로 보내고 이후 이 전시로 복귀.
    if (!authed) {
      const redirect = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?redirect=${redirect}`);
      return;
    }
    const next = !detail.bookmarked;
    setBmPending(true);
    setDetail((d) => ({ ...d, bookmarked: next }));
    try {
      if (next) await addBookmark(detail.exhibitionId);
      else await removeBookmark(detail.exhibitionId);
      toast(next ? "관심 전시에 담았어요" : "관심을 해제했어요", "success");
    } catch {
      setDetail((d) => ({ ...d, bookmarked: !next }));
      toast("잠시 후 다시 시도해 주세요", "error");
    } finally {
      setBmPending(false);
    }
  };

  const onRecord = () => {
    navigate(`/record?exhibitionId=${exhibitionId}`);
  };

  if (loading) return <Spinner full />;

  if (errorCode) {
    const map = {
      NOT_FOUND: {
        title: "전시를 찾을 수 없어요",
        description: "삭제되었거나 잘못된 주소일 수 있어요.",
      },
      FORBIDDEN: {
        title: "접근할 수 없는 전시예요",
        description: "다른 사용자가 등록한 전시입니다.",
      },
      GENERIC: {
        title: "전시를 불러오지 못했어요",
        description: "잠시 후 다시 시도해 주세요.",
      },
    };
    const { title, description } = map[errorCode];
    return (
      <div className="page detail-error">
        <ErrorState
          title={title}
          description={description}
          onRetry={errorCode === "GENERIC" ? load : undefined}
        />
        <div className="detail-back">
          <Button variant="secondary" block onClick={() => navigate("/exhibition")}>
            전시 탐색으로
          </Button>
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const {
    title,
    posterUrl,
    imgUrl,
    startDate,
    endDate,
    place,
    category,
    description,
    operatingHours,
    price,
    artistSummary,
    keywords,
    serviceName,
    detailUrl,
    gpsX,
    gpsY,
    address,
    phone,
    free,
    bookmarked,
    recorded,
  } = detail;

  const poster = posterUrl || imgUrl;
  const descriptionText = extractDescriptionText(description);
  const period = periodDots(startDate, endDate);
  const status = exhibitionStatus(startDate, endDate);
  const genre =
    (Array.isArray(keywords) && keywords[0]) ||
    (category ? categoryLabel(category) : null);
  const hasCoord = gpsX != null && gpsY != null;

  return (
    <div className="page detail-page">
      {/* 포스터 헤더 (북마크 오버레이 · 뒤로가기는 상단바) */}
      <header className="detail-hero">
        {poster ? (
          <img className="detail-hero__img" src={poster} alt={title || "전시 포스터"} />
        ) : (
          <div className="detail-hero__empty">
            <span>Poster</span>
          </div>
        )}
        <button
          type="button"
          className={`detail-hero__bookmark ${bookmarked ? "is-on" : ""}`}
          aria-pressed={!!bookmarked}
          aria-label={bookmarked ? "관심 해제" : "관심 등록"}
          disabled={bmPending}
          onClick={onToggleBookmark}
        >
          <BookmarkIcon size={20} filled={!!bookmarked} />
        </button>
      </header>

      {/* 정보 카드 */}
      <section className="detail-card">
        <header className="detail-card__head">
          <h2 className="detail-title">{title}</h2>
          {artistSummary && <p className="detail-artist">{artistSummary}</p>}
          {(status || genre) && (
            <div className="detail-tags">
              {status && (
                <span className={`detail-status detail-status--${status.tone}`}>
                  {status.label}
                </span>
              )}
              {genre && <span className="detail-tag">{genre}</span>}
            </div>
          )}
        </header>

        <dl className="detail-info">
          {period && (
            <div className="detail-info__row">
              <dt className="detail-info__icon">
                <CalendarIcon size={19} />
                <span className="sr-only">전시 기간</span>
              </dt>
              <dd>{period}</dd>
            </div>
          )}

          {place && (
            <div className="detail-info__row">
              <dt className="detail-info__icon">
                <MapPinIcon size={19} />
                <span className="sr-only">장소</span>
              </dt>
              <dd>
                <button
                  type="button"
                  className="detail-place-btn"
                  onClick={() => setMapOpen(true)}
                >
                  <span>{place}</span>
                  <span className="detail-place-btn__chev" aria-hidden="true">
                    ›
                  </span>
                </button>
                {address && <span className="detail-place-addr">{address}</span>}
                {phone && (
                  <a className="detail-place-phone" href={`tel:${phone}`}>
                    {phone}
                  </a>
                )}
              </dd>
            </div>
          )}

          {operatingHours && (
            <div className="detail-info__row">
              <dt className="detail-info__icon">
                <ClockIcon size={19} />
                <span className="sr-only">운영 시간</span>
              </dt>
              <dd className="detail-hours">
                {parseHoursRows(operatingHours).map((row, i) => {
                  const today = row.days.includes(TODAY_KO) ? " is-today" : "";
                  return row.closed ? (
                    <span key={i} className={`detail-hours__closed${today}`}>
                      {row.days} 휴무
                    </span>
                  ) : (
                    <Fragment key={i}>
                      <span className={`detail-hours__days${today}`}>{row.days}</span>
                      <span className={`detail-hours__time${today}`}>{row.value}</span>
                    </Fragment>
                  );
                })}
              </dd>
            </div>
          )}

          <div className="detail-info__row">
            <dt className="detail-info__icon">
              <TicketIcon size={19} />
              <span className="sr-only">관람료</span>
            </dt>
            <dd>
              {free ? (
                <span className="badge badge--free">무료</span>
              ) : (
                price || "정보 없음"
              )}
            </dd>
          </div>

          {descriptionText && (
            <div className="detail-info__row detail-info__row--block">
              <dt>전시 소개</dt>
              <dd className="detail-desc">{descriptionText}</dd>
            </div>
          )}
        </dl>

        {detailUrl && (
          <a
            className="btn btn--ghost btn--sm detail-source"
            href={detailUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            {serviceName ? `${serviceName}에서 원문 보기` : "원문 보기"}
          </a>
        )}
      </section>

      {/* 하단 고정 기록하기 */}
      <div className="detail-actions">
        <Button block onClick={onRecord} className="detail-actions__record">
          {recorded ? "기록 완료" : "기록하기"}
        </Button>
      </div>

      {mapOpen && (
        <MapSheet
          place={place}
          address={address}
          gpsX={hasCoord ? gpsX : null}
          gpsY={hasCoord ? gpsY : null}
          onClose={() => setMapOpen(false)}
        />
      )}
    </div>
  );
}

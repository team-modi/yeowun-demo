import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getDetail } from "@api/exhibition";
import { addBookmark, removeBookmark } from "@api/bookmark";
import { useUiStore } from "@store/uiStore";

import Button from "@components/common/Button";
import Spinner from "@components/common/Spinner";
import ErrorState from "@components/common/ErrorState";
import { BookmarkIcon } from "@components/common/icons";

import { categoryLabel } from "@components/exhibition/constants";
import { ddayLabel } from "@components/exhibition/dates";
import MapSheet from "@components/exhibition/detail/MapSheet";
import "@styles/detail.css";

// "2026-07-01" → "2026.07.01" (와이어프레임 날짜 표기)
const dot = (d) => (d ? String(d).replaceAll("-", ".") : "");
const periodDots = (start, end) => {
  if (!start && !end) return null;
  return `${dot(start)} ~ ${dot(end)}`.trim();
};

export default function DetailExhibitionPage() {
  const { exhibitionId } = useParams();
  const navigate = useNavigate();
  const toast = useUiStore((s) => s.toast);

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
  const period = periodDots(startDate, endDate);
  const dday = ddayLabel(endDate);
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
          {genre && (
            <div className="detail-tags">
              <span className="detail-tag">{genre}</span>
            </div>
          )}
        </header>

        <dl className="detail-info">
          {period && (
            <div className="detail-info__row">
              <dt>전시 기간</dt>
              <dd>
                {period}
                {dday && <span className="detail-dday"> · {dday}</span>}
              </dd>
            </div>
          )}

          {place && (
            <div className="detail-info__row">
              <dt>장소</dt>
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
              <dt>운영 시간</dt>
              <dd className="detail-hours">{operatingHours}</dd>
            </div>
          )}

          <div className="detail-info__row">
            <dt>관람료</dt>
            <dd>
              {free ? (
                <span className="badge badge--free">무료</span>
              ) : (
                price || "정보 없음"
              )}
            </dd>
          </div>

          {description && (
            <div className="detail-info__row">
              <dt>전시 소개</dt>
              <dd className="detail-desc">{description}</dd>
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

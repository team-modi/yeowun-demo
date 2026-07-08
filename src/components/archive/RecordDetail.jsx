import { useCallback, useEffect, useState } from "react";
import {
  getDetailRecord,
  addRecordBookmark,
  removeRecordBookmark,
} from "@api/record";
import { useUiStore } from "@store/uiStore";
import Spinner from "@components/common/Spinner";
import ErrorState from "@components/common/ErrorState";
import { BackIcon, BookmarkIcon } from "@components/common/icons";
import { formatDate } from "@components/archive/format";

/**
 * RecordDetail — 기록 상세 (wf-13: 큰 포스터 · 제목/장소/관람일 ·
 * "나의 감상 한 줄" · 감정 키워드 · 사진/영상). 인앱 오버레이 패널.
 * props:
 *   recordId: number
 *   onClose: () => void
 *   onBookmarkChange?: (recordId, bookmarked) => void  — 목록 카드 동기화용(optional)
 *
 * ※ RecordDetailResponse 필드: content, aiSummary, aiKeywords[], userKeywords[],
 *   representativeEmotion, cardPhrase, emotionCodes[], media[], exhibition* 등.
 *   artistSummary 필드는 없어 장소(exhibitionPlace)를 부제로 사용.
 */
export default function RecordDetail({ recordId, onClose, onBookmarkChange }) {
  const toast = useUiStore((s) => s.toast);

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookmarking, setBookmarking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getDetailRecord(recordId);
      setRecord(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  // 마운트 시 상세 로드(로딩 진입은 의도된 표준 패턴).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // ESC 로 닫기
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleBookmark = useCallback(async () => {
    if (!record || bookmarking) return;
    const nextOn = !record.bookmarked;
    setBookmarking(true);
    setRecord((prev) => ({ ...prev, bookmarked: nextOn })); // 낙관적
    try {
      if (nextOn) await addRecordBookmark(record.recordId);
      else await removeRecordBookmark(record.recordId);
      onBookmarkChange?.(record.recordId, nextOn);
      toast(nextOn ? "기록을 저장했어요" : "저장을 해제했어요", "success");
    } catch {
      setRecord((prev) => ({ ...prev, bookmarked: !nextOn })); // 롤백
      toast("잠시 후 다시 시도해 주세요", "error");
    } finally {
      setBookmarking(false);
    }
  }, [record, bookmarking, onBookmarkChange, toast]);

  const poster = record?.exhibitionPosterUrl || null;
  // 감정 키워드: 대표 감정 + 나머지 감정 코드(중복 제거).
  const emotionCodes = Array.isArray(record?.emotionCodes)
    ? record.emotionCodes
    : [];
  const rep = record?.representativeEmotion || null;
  const emotions = [
    ...(rep ? [rep] : []),
    ...emotionCodes.filter((e) => e && e !== rep),
  ];
  const photos = Array.isArray(record?.media)
    ? record.media.filter((m) => m?.url)
    : [];
  // "나의 감상 한 줄" — 직접 작성 content 우선, 없으면 카드 문구/AI 요약.
  const impression = record?.content || record?.cardPhrase || record?.aiSummary || "";
  const subtitle = record?.exhibitionPlace || record?.exhibitionRegion || "";

  return (
    <div
      className="rec-detail-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="기록 상세"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="rec-detail">
        <header className="rec-detail__bar">
          <button
            type="button"
            className="rec-detail__icon-btn"
            aria-label="닫기"
            onClick={onClose}
          >
            <BackIcon size={22} />
          </button>
          <span className="rec-detail__bar-spacer" />
          {record ? (
            <button
              type="button"
              className={`rec-detail__icon-btn ${record.bookmarked ? "is-on" : ""}`}
              aria-pressed={!!record.bookmarked}
              aria-label={record.bookmarked ? "저장 해제" : "저장"}
              disabled={bookmarking}
              onClick={toggleBookmark}
            >
              <BookmarkIcon size={20} filled={!!record.bookmarked} />
            </button>
          ) : (
            <span className="rec-detail__icon-btn" aria-hidden="true" />
          )}
        </header>

        <div className="rec-detail__scroll">
          {loading && <Spinner full />}
          {!loading && error && (
            <ErrorState title="기록을 불러오지 못했어요" onRetry={load} />
          )}

          {!loading && !error && record && (
            <>
              <div className="rec-detail__poster-wrap">
                {poster ? (
                  <img
                    className="rec-detail__poster"
                    src={poster}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <div className="rec-detail__poster--empty">이미지 없음</div>
                )}
              </div>

              <div className="rec-detail__head">
                <h2 className="rec-detail__title">
                  {record.exhibitionTitle || "제목 없는 전시"}
                </h2>
                {subtitle && (
                  <p className="rec-detail__subtitle">{subtitle}</p>
                )}
                {record.viewedAt && (
                  <p className="rec-detail__date">{formatDate(record.viewedAt)}</p>
                )}
              </div>

              {impression && (
                <section className="rec-detail__section">
                  <h3 className="rec-detail__section-title">나의 감상 한 줄</h3>
                  <p className="rec-detail__impression">{impression}</p>
                </section>
              )}

              {emotions.length > 0 && (
                <section className="rec-detail__section">
                  <h3 className="rec-detail__section-title">감정 키워드</h3>
                  <div className="rec-detail__chips">
                    {emotions.map((e, i) => (
                      <span
                        key={`${e}-${i}`}
                        className={`rec-chip ${i === 0 && rep ? "rec-chip--rep" : ""}`}
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {photos.length > 0 && (
                <section className="rec-detail__section">
                  <h3 className="rec-detail__section-title">사진 / 영상</h3>
                  <div className="rec-detail__media">
                    {photos.map((m) => (
                      <div
                        key={m.mediaId ?? m.url}
                        className="rec-detail__media-item"
                      >
                        {m.type === "VIDEO" ? (
                          <video
                            className="rec-detail__media-el"
                            src={m.url}
                            controls
                            preload="metadata"
                          />
                        ) : (
                          <img
                            className="rec-detail__media-el"
                            src={m.url}
                            alt=""
                            loading="lazy"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

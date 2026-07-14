import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDetailRecord,
  addRecordBookmark,
  removeRecordBookmark,
  deleteRecord,
} from "@api/record";
import { useUiStore } from "@store/uiStore";
import Button from "@components/common/Button";
import Spinner from "@components/common/Spinner";
import ErrorState from "@components/common/ErrorState";
import { BackIcon, BookmarkIcon } from "@components/common/icons";
import { formatDate } from "@components/archive/format";

/** 기록의 감정 코드 배열(대표 감정 우선, 중복 제거). */
const emotionCodesOf = (record) => {
  const codes = Array.isArray(record?.emotionCodes) ? record.emotionCodes : [];
  const rep = record?.representativeEmotion;
  return [...(rep ? [rep] : []), ...codes.filter((e) => e && e !== rep)];
};

/** 더보기(⋯) — 수정/삭제 메뉴 토글 아이콘. */
function MoreIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

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
export default function RecordDetail({
  recordId,
  onClose,
  onBookmarkChange,
  onDeleted,
}) {
  const toast = useUiStore((s) => s.toast);
  const navigate = useNavigate();

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookmarking, setBookmarking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  // 수정 — 작성 플로우를 편집 모드로 재사용한다(전시는 고정, 관람일·감정·미디어·본문 프리셋).
  const goEdit = useCallback(() => {
    setMenuOpen(false);
    onClose?.();
    navigate(`/record?editId=${recordId}`);
  }, [navigate, recordId, onClose]);

  // 여운 남기기 — 이 기록을 후보로 리마인드 작성 플로우 진입.
  // RemindPage는 서버 후보(getCandidate) 대신 state.candidate가 있으면 그것으로 시작한다.
  const goRemind = useCallback(() => {
    if (!record) return;
    const viewed = Date.parse(record.viewedAt);
    const daysAgo = Number.isNaN(viewed)
      ? undefined
      : Math.max(0, Math.floor((Date.now() - viewed) / 86400000));
    const candidate = {
      recordId,
      daysAgo,
      exhibitionTitle: record.exhibitionTitle,
      posterUrl: record.exhibitionPosterUrl ?? null,
      sceneImageUrl: record.media?.find((m) => m?.type !== "VIDEO" && m?.url)?.url ?? null,
      place: record.exhibitionPlace ?? null,
      region: record.exhibitionRegion ?? null,
      viewedAt: record.viewedAt ?? null,
      originalContent: record.content ?? null,
      originalEmotionCodes: emotionCodesOf(record),
    };
    onClose?.();
    navigate("/remind", { state: { candidate } });
  }, [record, recordId, onClose, navigate]);

  // 삭제 — 확인 후 soft delete. 성공 시 목록에서 제거하고 상세를 닫는다.
  const doDelete = useCallback(async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteRecord(recordId);
      toast("기록을 삭제했어요", "success");
      onDeleted?.(recordId);
      onClose?.();
    } catch {
      toast("잠시 후 다시 시도해 주세요", "error");
      setDeleting(false);
    }
  }, [deleting, recordId, onDeleted, onClose, toast]);

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
            <>
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
              <div className="rec-detail__menu-wrap">
                <button
                  type="button"
                  className="rec-detail__icon-btn"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="더보기"
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <MoreIcon size={20} />
                </button>
                {menuOpen && (
                  <>
                    <div
                      className="rec-detail__menu-scrim"
                      aria-hidden="true"
                      onClick={() => setMenuOpen(false)}
                    />
                    <ul className="rec-detail__menu" role="menu">
                      <li role="none">
                        <button
                          type="button"
                          role="menuitem"
                          className="rec-detail__menu-item"
                          onClick={goEdit}
                        >
                          수정
                        </button>
                      </li>
                      <li role="none">
                        <button
                          type="button"
                          role="menuitem"
                          className="rec-detail__menu-item rec-detail__menu-item--danger"
                          onClick={() => {
                            setMenuOpen(false);
                            setConfirmDelete(true);
                          }}
                        >
                          삭제
                        </button>
                      </li>
                    </ul>
                  </>
                )}
              </div>
            </>
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
                            playsInline
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

              {/* 여운 남기기 — 이 기록으로 리마인드 작성 플로우 진입(시안 CTA 톤: 네이비 풀폭) */}
              <div className="rec-detail__remind-cta">
                <Button variant="primary" block onClick={goRemind}>
                  이 기록의 여운 남기기
                </Button>
                <p className="rec-detail__remind-hint">
                  시간이 지난 지금, 다시 떠오르는 감상을 남겨보세요
                </p>
              </div>
            </>
          )}
        </div>

        {confirmDelete && (
          <div
            className="rec-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-label="기록 삭제 확인"
            onClick={(e) => {
              if (e.target === e.currentTarget && !deleting) setConfirmDelete(false);
            }}
          >
            <div className="rec-confirm__box">
              <h3 className="rec-confirm__title">기록을 삭제할까요?</h3>
              <p className="rec-confirm__desc">삭제한 기록은 다시 볼 수 없어요.</p>
              <div className="rec-confirm__actions">
                <Button
                  variant="secondary"
                  block
                  disabled={deleting}
                  onClick={() => setConfirmDelete(false)}
                >
                  취소
                </Button>
                <Button block disabled={deleting} onClick={doDelete}>
                  {deleting ? "삭제 중…" : "삭제"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

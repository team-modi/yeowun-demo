import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getNotifications, markRead } from "@api/notification";
import useInfiniteCursor from "@components/common/useInfiniteCursor";
import Spinner from "@components/common/Spinner";
import ErrorState from "@components/common/ErrorState";
import EmptyState from "@components/common/EmptyState";
import Button from "@components/common/Button";
import "@styles/notification.css";

/**
 * NotificationPage — 알림 목록 (/notifications) · 와이어프레임 07_리마인드_알림 탭 진입 정합.
 * 헤더("알림"·뒤로가기)는 AppLayout TopBar 가 제공 — 페이지 안에 중복 헤더를 두지 않는다.
 * 상단 탭 2개 [오늘의 여운(REMIND) | 전시(EXHIBITION)] — 탭 전환 시 해당 type 으로
 * 커서 페이징을 새로 시작한다(useInfiniteCursor 가 params 변경을 감지해 fresh 로드).
 * 카드: 좌측 정사각 썸네일 플레이스홀더 + 타입 라벨/상대시간 + body 1~2줄.
 * 미읽음 탭 시 markRead 낙관 반영. REMIND → /remind, EXHIBITION → /exhibition/{targetId}.
 */
function relativeTime(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}주 전`;
  return String(iso).slice(0, 10).replace(/-/g, ".");
}

const TABS = [
  { type: "REMIND", label: "오늘의 여운" },
  { type: "EXHIBITION", label: "전시" },
];

// 카드 1행의 타입 라벨(작은 굵은 글씨). 서버 lazy 생성 계약과 동일한 표기.
const TYPE_LABEL = { REMIND: "오늘의 여운", EXHIBITION: "전시", NOTICE: "공지" };

const fetchNotifications = (params) => getNotifications(params).then((r) => r.data);

export default function NotificationPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("REMIND"); // 와이어프레임 기본 탭: 오늘의 여운

  // params 가 바뀌면 useInfiniteCursor 가 커서를 버리고 첫 페이지부터 다시 받는다.
  const params = useMemo(() => ({ type: tab }), [tab]);
  const { items, loading, error, hasNext, loadMore, reset, setItems } = useInfiniteCursor(
    fetchNotifications,
    { size: 20, params, getKey: (n) => n.notificationId },
  );

  const markLocalRead = useCallback(
    (id) => {
      setItems((prev) =>
        prev.map((n) => (n.notificationId === id ? { ...n, read: true } : n)),
      );
    },
    [setItems],
  );

  const handleClick = useCallback(
    async (n) => {
      if (!n.read) {
        markLocalRead(n.notificationId); // 낙관적
        try {
          await markRead(n.notificationId);
        } catch {
          // 읽음 처리 실패는 조용히 무시(다음 진입 때 재시도됨)
        }
      }
      if (n.type === "REMIND") {
        navigate("/remind");
      } else if (n.type === "EXHIBITION" && n.targetId != null) {
        // targetId(=exhibitionId)가 없으면 무동작
        navigate(`/exhibition/${n.targetId}`);
      }
    },
    [markLocalRead, navigate],
  );

  // 무한 스크롤 센티넬
  const sentinelRef = useRef(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNext) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNext, loadMore, items.length]);

  return (
    <div className="page noti">
      {/* 타입 탭 — 각 50% 너비, 활성 탭 밑줄 */}
      <div className="noti-tabs" role="tablist" aria-label="알림 유형">
        {TABS.map((t) => (
          <button
            key={t.type}
            type="button"
            role="tab"
            aria-selected={tab === t.type}
            className={`noti-tabs__btn ${tab === t.type ? "is-active" : ""}`}
            onClick={() => setTab(t.type)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && items.length === 0 && <Spinner full />}

      {!loading && error && items.length === 0 && <ErrorState onRetry={reset} />}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="도착한 알림이 없어요"
          description="새 알림이 도착하면 여기에 표시돼요."
        />
      )}

      {items.length > 0 && (
        <ul className="noti-list">
          {items.map((n) => (
            <li key={n.notificationId}>
              <button
                type="button"
                className={`noti-card ${n.read ? "" : "is-unread"}`}
                onClick={() => handleClick(n)}
              >
                {/* 좌측 정사각 썸네일 — 전시 포스터(imageUrl), 없으면 연회색 플레이스홀더 */}
                <span className="noti-card__thumb" aria-hidden="true">
                  {n.imageUrl && (
                    <img
                      className="noti-card__thumb-img"
                      src={n.imageUrl}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                </span>
                <span className="noti-card__main">
                  <span className="noti-card__head">
                    <span className="noti-card__label">
                      {!n.read && (
                        <span className="noti-card__dot" aria-hidden="true" />
                      )}
                      {TYPE_LABEL[n.type] ?? n.type}
                    </span>
                    <span className="noti-card__time">{relativeTime(n.createdAt)}</span>
                  </span>
                  {n.body && <span className="noti-card__text">{n.body}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div ref={sentinelRef} className="noti-sentinel" aria-hidden="true" />

      {loading && items.length > 0 && <Spinner />}

      {!loading && items.length > 0 && hasNext && (
        <div className="noti-more">
          <Button variant="secondary" size="sm" onClick={loadMore}>
            더 보기
          </Button>
        </div>
      )}
    </div>
  );
}

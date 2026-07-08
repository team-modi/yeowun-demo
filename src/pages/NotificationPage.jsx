import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getNotifications, markRead } from "@api/notification";
import useInfiniteCursor from "@components/common/useInfiniteCursor";
import Spinner from "@components/common/Spinner";
import ErrorState from "@components/common/ErrorState";
import EmptyState from "@components/common/EmptyState";
import Button from "@components/common/Button";
import "@styles/notification.css";

/**
 * NotificationPage — 알림 목록 (/notifications)
 * 무한 스크롤(cursor, size=20). 미읽음 탭 시 markRead 후 로컬 반영.
 * REMIND + targetId 는 /remind 로 이동.
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

const TYPE_LABEL = { REMIND: "리마인드", NOTICE: "공지" };

export default function NotificationPage() {
  const navigate = useNavigate();
  const { items, loading, error, hasNext, loadMore, reset, setItems } =
    useInfiniteCursor((params) => getNotifications(params).then((r) => r.data), {
      size: 20,
    });

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
      if (n.type === "REMIND" && n.targetId != null) {
        navigate("/remind");
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

  // 첫 로딩
  if (loading && items.length === 0) return <Spinner full />;
  if (error && items.length === 0) return <ErrorState onRetry={reset} />;

  if (!loading && items.length === 0) {
    return (
      <div className="page">
        <EmptyState
          title="새로운 알림이 없어요"
          description="리마인드와 공지가 도착하면 여기에 표시돼요."
        />
      </div>
    );
  }

  return (
    <div className="page">
      <ul className="noti-list">
        {items.map((n) => {
          const isRemind = n.type === "REMIND";
          return (
            <li key={n.notificationId}>
              <button
                type="button"
                className={`noti-item ${n.read ? "" : "is-unread"}`}
                onClick={() => handleClick(n)}
              >
                <span className="noti-item__dot" aria-hidden="true" />
                <span className="noti-item__body">
                  <span className="noti-item__head">
                    <span
                      className={`noti-badge ${isRemind ? "noti-badge--remind" : "noti-badge--notice"}`}
                    >
                      {TYPE_LABEL[n.type] ?? n.type}
                    </span>
                    <span className="noti-item__title">{n.title}</span>
                  </span>
                  {n.body && <span className="noti-item__text">{n.body}</span>}
                  <span className="noti-item__time">{relativeTime(n.createdAt)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div ref={sentinelRef} className="noti-sentinel" aria-hidden="true" />

      {loading && items.length > 0 && <Spinner />}

      {!loading && hasNext && (
        <div className="noti-more">
          <Button variant="secondary" size="sm" onClick={loadMore}>
            더 보기
          </Button>
        </div>
      )}
    </div>
  );
}

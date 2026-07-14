import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCandidate } from "@api/remind";
import Spinner from "@components/common/Spinner";
import ErrorState from "@components/common/ErrorState";
import EmptyState from "@components/common/EmptyState";
import Button from "@components/common/Button";
import TodayRemindA from "@components/remind/TodayRemindA";
import TodayRemindB from "@components/remind/TodayRemindB";
import { resolveVariant } from "@utils/remindVariant";
import { useAuthStore } from "@store/authStore";
import "@styles/remind.css";

/**
 * RemindPage — [07] 리마인드 (/remind)
 * 진입 시 오늘의 여운 후보(getCandidate)만 조회한다.
 * "지나온 여운" 목록은 아카이브 '리마인드' 탭(/archive?tab=remind)과 중복이라
 * 목록을 직접 렌더하지 않고 이동 링크로 대체했다 — 같은 데이터를 두 화면에서
 * 따로 로드·정렬하는 유지비를 줄이는 간단한 쪽 선택(단일 소스는 아카이브 탭).
 */
export default function RemindPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const candRes = await getCandidate();
      setCandidate(candRes?.data ?? null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 마이크로태스크로 지연시켜 effect 내 동기 setState 를 피한다.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (loading) return <Spinner full />;
  if (error) return <ErrorState onRetry={load} />;

  // 후보가 있으면(저장 완료 화면 포함) 풀블리드 플로우만 노출 —
  // TopBar 가 "오늘의 여운" 타이틀을 제공하므로 중복 h2 없이 진행바가 헤더 바로 아래 온다.
  if (candidate) {
    // A/B 배정: 핸드폰 끝자리(로그인 시 저장) → A(요약형)/B(순차형). ?rv=A|B 로 QA 강제 전환.
    const variant = resolveVariant({ userId: user?.userId });
    return (
      <div className="remind remind--flow">
        {variant === "A" ? (
          <TodayRemindA candidate={candidate} />
        ) : (
          <TodayRemindB candidate={candidate} />
        )}
      </div>
    );
  }

  return (
    <div className="remind">
      <section className="remind__section">
        {/* 페이지 타이틀은 TopBar("오늘의 여운")가 제공 — 중복 헤딩 생략 */}
        <EmptyState
          title="오늘의 리마인드가 없어요"
          description="기록을 남기면 일주일 뒤, 다시 마주할 여운을 준비해 드려요."
        />
      </section>

      <section className="remind__section">
        <h2 className="remind__title">지나온 여운</h2>
        <p className="remind__empty">
          저장한 리마인드는 아카이브의 &lsquo;리마인드&rsquo; 탭에서 모아볼 수 있어요.
        </p>
        <Button variant="secondary" block onClick={() => navigate("/archive?tab=remind")}>
          아카이브에서 모아보기
        </Button>
      </section>
    </div>
  );
}

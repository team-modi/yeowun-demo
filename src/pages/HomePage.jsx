import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBanners, getList } from "@api/exhibition";
import { addBookmark, removeBookmark } from "@api/bookmark";
import { getCandidate } from "@api/remind";
import { useAuthStore } from "@store/authStore";
import { useUiStore } from "@store/uiStore";
import Spinner from "@components/common/Spinner";
import ErrorState from "@components/common/ErrorState";
import Button from "@components/common/Button";
import BannerCarousel from "@components/home/BannerCarousel";
import SectionPreview from "@components/home/SectionPreview";
import { elapsedPhrase } from "@components/remind/utils";
import "@styles/home.css";

/**
 * HomePage — [01] 홈 (/yeowun)
 * 진입 시 병렬 4콜: 배너 + 섹션 3개(ending-soon / opening-this-month / free, size=2).
 * 카드 북마크는 낙관적 토글(실패 시 롤백 + 토스트).
 */
// size: 섹션별 조회 개수(기본 2). limit(=size)만큼 노출.
// layout "scroll": 포스터 타일을 가로 스크롤로 노출(이번 달 새로 열리는 전시 — 5개).
const SECTIONS = [
  { key: "ending-soon", title: "곧 끝나기 전에 봐야 할 전시", variant: "list" },
  {
    key: "opening-this-month",
    title: "이번 달 새로 열리는 전시",
    variant: "grid",
    layout: "scroll",
    size: 5,
    showOpenDate: true,
  },
  { key: "free", title: "무료로 볼 수 있는 전시", variant: "list" },
];

// 홈 데이터 세션 캐시(모듈 싱글턴) — 탭 전환으로 재진입 시 스피너 없이 즉시 표시.
// 전체 새로고침 시 초기화. TTL 이내 재진입은 재요청도 생략(백엔드 부담·rate limit↓).
let homeCache = null; // { banners, sections, at }
const HOME_TTL = 30_000; // 30초

// 오늘의 여운 도착 바텀시트(wf-07) — X 로 닫으면 세션 동안 재노출하지 않는다.
const REMIND_SHEET_KEY = "yeowun.remindSheet.dismissed";

const isRemindSheetDismissed = () => {
  try {
    return sessionStorage.getItem(REMIND_SHEET_KEY) === "1";
  } catch {
    return true; // sessionStorage 불가 환경은 노출 생략(홈 방해 금지)
  }
};

const dismissRemindSheet = () => {
  try {
    sessionStorage.setItem(REMIND_SHEET_KEY, "1");
  } catch {
    /* 무시 */
  }
};

export default function HomePage() {
  const toast = useUiStore((s) => s.toast);
  const navigate = useNavigate();
  const authed = useAuthStore((s) => s.authed);
  const nickname = useAuthStore((s) => s.user?.nickname);

  // 오늘의 여운 후보(도착 노출) — 로그인 상태에서만 조회, 실패는 조용히 무시.
  const [remindCand, setRemindCand] = useState(null);

  // 캐시가 있으면 그걸로 즉시 초기화 → 재진입 시 스피너 없이 바로 표시.
  const [banners, setBanners] = useState(() => homeCache?.banners ?? []);
  // { "ending-soon": [...], "opening-this-month": [...], "free": [...] }
  const [sections, setSections] = useState(() => homeCache?.sections ?? {});
  const [loading, setLoading] = useState(() => !homeCache);
  const [error, setError] = useState(null);

  // silent=true(캐시 있는 백그라운드 갱신)면 스피너를 띄우지 않는다.
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    // 배너/섹션을 독립적으로 처리(allSettled) — 일부(예: 배너)가 실패해도 홈을 통째로 막지 않고
    // 성공한 것만 보여주는 graceful degrade. 전체(배너+모든 섹션)가 실패했을 때만 전체 에러 화면.
    const [bannerRes, ...sectionRes] = await Promise.allSettled([
      getBanners(),
      ...SECTIONS.map((s) => getList({ section: s.key, size: s.size ?? 2 })),
    ]);

    // 실패한 부분은 이전(캐시) 값을 유지 — 조용한 갱신 중 일부 실패로 화면이 비지 않게.
    const prevBanners = homeCache?.banners ?? [];
    const prevSections = homeCache?.sections ?? {};
    const nextBanners =
      bannerRes.status === "fulfilled" ? (bannerRes.value?.data?.banners ?? []) : prevBanners;
    const nextSections = { ...prevSections };
    SECTIONS.forEach((s, i) => {
      const r = sectionRes[i];
      if (r.status === "fulfilled") nextSections[s.key] = r.value?.data?.content ?? [];
    });

    const anySuccess =
      bannerRes.status === "fulfilled" || sectionRes.some((r) => r.status === "fulfilled");
    if (!anySuccess && !homeCache) {
      // 캐시도 없고 전부 실패 → 전체 에러 화면
      setError(bannerRes.reason ?? new Error("홈을 불러오지 못했습니다"));
      setLoading(false);
      return;
    }

    setBanners(nextBanners);
    setSections(nextSections);
    homeCache = { banners: nextBanners, sections: nextSections, at: Date.now() };
    setError(null);
    setLoading(false);
  }, []);

  // 마운트 시: 캐시가 신선(TTL 이내)하면 재요청 없이 캐시 그대로. 오래됐으면 조용히 갱신,
  // 캐시가 없으면 일반 로드(스피너). 마이크로태스크 지연으로 effect 내 동기 setState 를 피한다.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      const fresh = homeCache && Date.now() - homeCache.at < HOME_TTL;
      if (fresh) return;
      load({ silent: !!homeCache });
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  // 상태 변경(로드·북마크 토글)을 캐시에 반영. 신선도(at)는 load 에서만 갱신.
  useEffect(() => {
    if (homeCache) homeCache = { ...homeCache, banners, sections };
  }, [banners, sections]);

  // 오늘의 여운 후보 조회 — 로그인 확정 후 1회. 비로그인·후보 없음·실패 시 아무것도 하지 않는다
  // (홈 로딩을 방해하지 않도록 실패는 무시).
  useEffect(() => {
    if (!authed || isRemindSheetDismissed()) return undefined;
    let alive = true;
    getCandidate()
      .then((res) => {
        if (alive && res?.data) setRemindCand(res.data);
      })
      .catch(() => {
        /* 실패 무시 */
      });
    return () => {
      alive = false;
    };
  }, [authed]);

  const closeRemindSheet = useCallback(() => {
    dismissRemindSheet();
    setRemindCand(null);
  }, []);

  // 여러 섹션에 같은 전시가 있을 수 있어 exhibitionId 로 전체 반영.
  const applyBookmark = useCallback((exhibitionId, bookmarked) => {
    setSections((prev) => {
      const next = {};
      for (const [key, items] of Object.entries(prev)) {
        next[key] = items.map((it) =>
          it.exhibitionId === exhibitionId ? { ...it, bookmarked } : it,
        );
      }
      return next;
    });
  }, []);

  const handleToggleBookmark = useCallback(
    async (item) => {
      const nextOn = !item.bookmarked;
      applyBookmark(item.exhibitionId, nextOn); // 낙관적
      try {
        if (nextOn) await addBookmark(item.exhibitionId);
        else await removeBookmark(item.exhibitionId);
        toast(nextOn ? "관심 전시에 담았어요" : "관심을 해제했어요", "success");
      } catch {
        applyBookmark(item.exhibitionId, !nextOn); // 롤백
        toast("잠시 후 다시 시도해 주세요", "error");
      }
    },
    [applyBookmark, toast],
  );

  if (loading) return <Spinner full />;
  if (error) return <ErrorState onRetry={load} />;

  return (
    <div className="home">
      <BannerCarousel banners={banners} />

      {SECTIONS.map((s) => (
        <SectionPreview
          key={s.key}
          title={s.title}
          section={s.key}
          variant={s.variant}
          layout={s.layout}
          limit={s.size ?? 2}
          showOpenDate={s.showOpenDate}
          items={sections[s.key] ?? []}
          onToggleBookmark={handleToggleBookmark}
        />
      ))}

      {/* 오늘의 여운 도착 바텀시트(wf-07) — 후보가 있을 때만, 닫으면 세션 동안 재노출 X */}
      {remindCand && (
        <RemindArrivalSheet
          candidate={remindCand}
          nickname={nickname}
          onClose={closeRemindSheet}
          onOpen={() => navigate("/remind")}
        />
      )}
    </div>
  );
}

/**
 * RemindArrivalSheet — 홈 진입 시 오늘의 여운 도착 안내 바텀시트.
 * 상단 포스터(우상단 X) + "오늘의 여운" 배지 + 전시제목·작가 +
 * "{닉네임}님이 {elapsed} 남긴 전시 기록을 다시 만나보세요" + 풀폭 CTA.
 */
function RemindArrivalSheet({ candidate, nickname, onClose, onOpen }) {
  const elapsed = elapsedPhrase(candidate);
  // 닉네임이 없으면 이름부를 생략한 문구로.
  const lead = [nickname && `${nickname}님이`, elapsed].filter(Boolean).join(" ");

  return (
    <div className="rm-sheet-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="rm-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="rm-sheet__media">
          {candidate.posterUrl && <img src={candidate.posterUrl} alt="" />}
          <button type="button" className="rm-sheet__close" aria-label="닫기" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="rm-sheet__body">
          <span className="rm-sheet__badge">오늘의 여운</span>
          <p className="rm-sheet__title">{candidate.exhibitionTitle}</p>
          {candidate.artist && <p className="rm-sheet__artist">{candidate.artist}</p>}
          <p className="rm-sheet__msg">
            {lead && (
              <>
                {lead} 남긴
                <br />
              </>
            )}
            전시 기록을 다시 만나보세요
          </p>
          <Button block onClick={onOpen}>
            그날의 기록 보기
          </Button>
        </div>
      </div>
    </div>
  );
}

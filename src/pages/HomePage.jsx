import { useCallback, useEffect, useState } from "react";
import { getBanners, getList } from "@api/exhibition";
import { addBookmark, removeBookmark } from "@api/bookmark";
import { useUiStore } from "@store/uiStore";
import Spinner from "@components/common/Spinner";
import ErrorState from "@components/common/ErrorState";
import BannerCarousel from "@components/home/BannerCarousel";
import SectionPreview from "@components/home/SectionPreview";
import "@styles/home.css";

/**
 * HomePage — [01] 홈 (/yeowun)
 * 진입 시 병렬 4콜: 배너 + 섹션 3개(ending-soon / opening-this-month / free, size=2).
 * 카드 북마크는 낙관적 토글(실패 시 롤백 + 토스트).
 */
const SECTIONS = [
  { key: "ending-soon", title: "곧 종료되는 전시", variant: "list" },
  { key: "opening-this-month", title: "이번 달 새로 열리는 전시", variant: "grid" },
  { key: "free", title: "무료로 볼 수 있는 전시", variant: "list" },
];

export default function HomePage() {
  const toast = useUiStore((s) => s.toast);

  const [banners, setBanners] = useState([]);
  // { "ending-soon": [...], "opening-this-month": [...], "free": [...] }
  const [sections, setSections] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bannerRes, ...sectionRes] = await Promise.all([
        getBanners(),
        ...SECTIONS.map((s) => getList({ section: s.key, size: 2 })),
      ]);
      setBanners(bannerRes?.data?.banners ?? []);
      const next = {};
      SECTIONS.forEach((s, i) => {
        next[s.key] = sectionRes[i]?.data?.content ?? [];
      });
      setSections(next);
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
          items={sections[s.key] ?? []}
          onToggleBookmark={handleToggleBookmark}
        />
      ))}
    </div>
  );
}

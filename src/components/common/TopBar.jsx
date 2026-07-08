import { useNavigate } from "react-router-dom";
import { BackIcon, BellIcon } from "@components/common/icons";

/**
 * TopBar — 상단바.
 * props:
 *   title?: string
 *   brand?: string                — 좌측 브랜드 텍스트(showBack=false 일 때만 표시, 예: 홈의 "여운")
 *   showBack?: boolean            — 뒤로가기 셰브론 표시(브랜드보다 우선)
 *   onBack?: () => void           — 커스텀 뒤로가기(기본 navigate(-1))
 *   showBell?: boolean            — 우측 알림 종 표시(기본 true)
 *   onBell?: () => void           — 커스텀 종 동작(기본 navigate("/notifications"))
 *   hasUnread?: boolean           — 종에 미읽음 점 표시
 *   right?: ReactNode             — 우측 커스텀 요소(종 대신, 예: 탐색의 북마크 아이콘)
 */
export default function TopBar({
  title,
  brand,
  showBack = false,
  onBack,
  showBell = true,
  onBell,
  hasUnread = false,
  right,
}) {
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div className="topbar__side">
        {showBack ? (
          <button
            type="button"
            className="topbar__icon-btn"
            aria-label="뒤로"
            onClick={onBack || (() => navigate(-1))}
          >
            <BackIcon />
          </button>
        ) : (
          brand && <span className="topbar__brand">{brand}</span>
        )}
      </div>

      <h1 className="topbar__title">{title}</h1>

      <div className="topbar__side topbar__side--right">
        {right !== undefined
          ? right
          : showBell && (
              <button
                type="button"
                className="topbar__icon-btn"
                aria-label="알림"
                onClick={onBell || (() => navigate("/notifications"))}
              >
                <BellIcon />
                {hasUnread && <span className="topbar__dot" />}
              </button>
            )}
      </div>
    </header>
  );
}

import { NavLink } from "react-router-dom";
import {
  HomeIcon,
  ArchiveIcon,
  ProfileIcon,
  PencilIcon,
} from "@components/common/icons";

// 전시정보 탭 아이콘 — 와이어프레임의 카드/그리드 형태
function ExhibitionInfoIcon(props) {
  return (
    <svg
      width={props.size || 22}
      height={props.size || 22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={props.className}
    >
      <rect x="3" y="4" width="7" height="16" rx="1.5" />
      <rect x="14" y="4" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="6" rx="1.5" />
    </svg>
  );
}

const TABS = [
  { to: "/yeowun", label: "홈", Icon: HomeIcon },
  { to: "/exhibition", label: "전시정보", Icon: ExhibitionInfoIcon },
  { to: "/record", label: "기록", Icon: PencilIcon, center: true },
  { to: "/archive", label: "아카이브", Icon: ArchiveIcon },
  { to: "/user", label: "프로필", Icon: ProfileIcon },
];

/**
 * BottomNav — 하단 탭 내비게이션(와이어프레임 wf-03/wf-13/wf-14).
 * 5개 탭: 홈 · 전시정보 · [기록·중앙 돌출 원형 버튼] · 아카이브 · 프로필.
 * 중앙 기록 버튼은 위로 솟은 차콜 원형 FAB(연필 아이콘). 활성 탭은 하이라이트.
 */
export default function BottomNav() {
  return (
    <nav className="bottomnav" aria-label="주요 메뉴">
      {TABS.map(({ to, label, Icon, center }) =>
        center ? (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            className={({ isActive }) =>
              `bottomnav__item bottomnav__item--center ${isActive ? "is-active" : ""}`
            }
          >
            <span className="bottomnav__fab">
              <Icon size={24} />
            </span>
          </NavLink>
        ) : (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `bottomnav__item ${isActive ? "is-active" : ""}`
            }
          >
            <Icon className="bottomnav__icon" />
            <span className="bottomnav__label">{label}</span>
          </NavLink>
        )
      )}
    </nav>
  );
}

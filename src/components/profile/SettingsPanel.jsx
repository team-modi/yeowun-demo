import NotificationSettings from "@components/profile/NotificationSettings";
import { ChevronRightIcon } from "@components/profile/icons";

/**
 * SettingsPanel — 설정 화면(알림 · 서비스 · 계정).
 * props: { onLogout, onWithdraw, busy }
 *   알림  : 리마인드/공지 토글 (NotificationSettings)
 *   서비스: 문의하기 / 이용약관 (정적 링크)
 *   계정  : 로그아웃 / 회원 탈퇴
 */
export default function SettingsPanel({ onLogout, onWithdraw, busy }) {
  return (
    <div className="pf-settings-view">
      <section className="pf-group">
        <h3 className="pf-group__label">알림</h3>
        <div className="pf-group__card pf-group__card--pad">
          <NotificationSettings />
        </div>
      </section>

      <section className="pf-group">
        <h3 className="pf-group__label">서비스</h3>
        <div className="pf-group__card">
          <a
            className="pf-row"
            href="https://forms.gle/"
            target="_blank"
            rel="noreferrer noopener"
          >
            <span>문의하기</span>
            <ChevronRightIcon size={18} className="pf-row__chev" />
          </a>
          <a
            className="pf-row"
            href="https://www.notion.so/"
            target="_blank"
            rel="noreferrer noopener"
          >
            <span>이용약관</span>
            <ChevronRightIcon size={18} className="pf-row__chev" />
          </a>
        </div>
      </section>

      <section className="pf-group">
        <h3 className="pf-group__label">계정</h3>
        <div className="pf-group__card">
          <button
            type="button"
            className="pf-row pf-row--btn"
            onClick={onLogout}
            disabled={busy}
          >
            <span>로그아웃</span>
            <ChevronRightIcon size={18} className="pf-row__chev" />
          </button>
          <button
            type="button"
            className="pf-row pf-row--btn pf-row--danger"
            onClick={onWithdraw}
            disabled={busy}
          >
            <span>회원 탈퇴</span>
            <ChevronRightIcon size={18} className="pf-row__chev" />
          </button>
        </div>
      </section>
    </div>
  );
}

import { ProfileIcon } from "@components/common/icons";
import Button from "@components/common/Button";

/**
 * ProfileHeader — 프로필 메인 상단(아바타 · 닉네임 · 프로필 수정 버튼).
 * props: { me, onEdit }  me = getMe().data
 */
export default function ProfileHeader({ me, onEdit }) {
  if (!me) return null;
  const { nickname, profileImageUrl } = me;

  return (
    <header className="pf-header">
      <div className="pf-avatar pf-avatar--lg">
        {profileImageUrl ? (
          <img src={profileImageUrl} alt="" loading="lazy" />
        ) : (
          <ProfileIcon size={40} />
        )}
      </div>
      <p className="pf-header__nickname">{nickname || "여운 사용자"}</p>
      <Button variant="secondary" size="sm" onClick={onEdit}>
        프로필 수정
      </Button>
    </header>
  );
}

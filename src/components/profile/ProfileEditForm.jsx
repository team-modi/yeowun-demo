import { useState } from "react";

import { updateProfile } from "@api/user";
import { useUiStore } from "@store/uiStore";
import Button from "@components/common/Button";
import { ProfileIcon } from "@components/common/icons";
import { CameraIcon } from "@components/profile/icons";

// ageGroup enum(10년 단위) — backend/domain/user
const AGE_GROUPS = [
  { value: "UNSPECIFIED", label: "선택 안 함" },
  { value: "TEENS", label: "10대" },
  { value: "TWENTIES", label: "20대" },
  { value: "THIRTIES", label: "30대" },
  { value: "FORTIES", label: "40대" },
  { value: "FIFTIES_PLUS", label: "50대 이상" },
];

// residenceRegion — 전국 17개 광역시·도 (backend/domain/user/ResidenceRegion)
const REGIONS = [
  ["SEOUL", "서울"],
  ["BUSAN", "부산"],
  ["DAEGU", "대구"],
  ["INCHEON", "인천"],
  ["GWANGJU", "광주"],
  ["DAEJEON", "대전"],
  ["ULSAN", "울산"],
  ["SEJONG", "세종"],
  ["GYEONGGI", "경기"],
  ["GANGWON", "강원"],
  ["CHUNGBUK", "충북"],
  ["CHUNGNAM", "충남"],
  ["JEONBUK", "전북"],
  ["JEONNAM", "전남"],
  ["GYEONGBUK", "경북"],
  ["GYEONGNAM", "경남"],
  ["JEJU", "제주"],
];

/**
 * ProfileEditForm — 프로필 수정(아바타 · 닉네임 · 연령대 · 지역).
 * PUT /users/me/profile (부분 수정). 성공 시 onUpdated(newData) 콜백.
 * props: { me, onUpdated }
 */
export default function ProfileEditForm({ me, onUpdated }) {
  const toast = useUiStore((st) => st.toast);
  const [form, setForm] = useState({
    nickname: me?.nickname ?? "",
    ageGroup: me?.ageGroup ?? "UNSPECIFIED",
    residenceRegion: me?.residenceRegion ?? "",
  });
  const [nickError, setNickError] = useState("");
  const [saving, setSaving] = useState(false);

  const setField = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const validateNickname = (value) => {
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed.length > 20) {
      return "닉네임은 1~20자로 입력해 주세요.";
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const err = validateNickname(form.nickname);
    if (err) {
      setNickError(err);
      return;
    }
    setNickError("");

    // 부분 수정 body — 값이 있는 필드만 전송
    const body = { nickname: form.nickname.trim() };
    if (form.ageGroup) body.ageGroup = form.ageGroup;
    if (form.residenceRegion) body.residenceRegion = form.residenceRegion;

    setSaving(true);
    try {
      const res = await updateProfile(body);
      if (res?.meta?.result === "SUCCESS") {
        onUpdated?.(res.data);
        toast("프로필을 저장했어요.", "success");
      } else {
        toast(res?.meta?.message || "저장에 실패했어요.", "error");
      }
    } catch (ex) {
      const msg = ex?.response?.data?.meta?.message;
      toast(msg || "저장에 실패했어요. 다시 시도해 주세요.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="pf-form" onSubmit={handleSubmit} noValidate>
      <div className="pf-form__avatar">
        <div className="pf-avatar pf-avatar--lg">
          {me?.profileImageUrl ? (
            <img src={me.profileImageUrl} alt="" loading="lazy" />
          ) : (
            <ProfileIcon size={40} />
          )}
        </div>
        <span className="pf-avatar__badge" aria-hidden="true">
          <CameraIcon size={16} />
        </span>
      </div>

      <div className="pf-field">
        <label className="pf-field__label" htmlFor="pf-nickname">
          닉네임
        </label>
        <input
          id="pf-nickname"
          className="pf-input"
          type="text"
          value={form.nickname}
          maxLength={20}
          onChange={setField("nickname")}
          placeholder="1~20자"
          aria-invalid={!!nickError}
        />
        {nickError && <p className="pf-field__error">{nickError}</p>}
      </div>

      <div className="pf-field">
        <label className="pf-field__label" htmlFor="pf-age">
          연령대
        </label>
        <select
          id="pf-age"
          className="pf-input"
          value={form.ageGroup}
          onChange={setField("ageGroup")}
        >
          {AGE_GROUPS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      <div className="pf-field">
        <label className="pf-field__label" htmlFor="pf-region">
          지역
        </label>
        <select
          id="pf-region"
          className="pf-input"
          value={form.residenceRegion}
          onChange={setField("residenceRegion")}
        >
          <option value="">선택 안 함</option>
          {REGIONS.map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="pf-form__submit">
        <Button type="submit" block disabled={saving}>
          {saving ? "저장하는 중…" : "저장하기"}
        </Button>
      </div>
    </form>
  );
}

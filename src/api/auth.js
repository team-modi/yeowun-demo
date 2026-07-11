import axiosInstance from "@utils/axiosInstance";
import { kakaoRedirectUri } from "@utils/oauth";
import axios from "axios";

/**
 * 모든 API 함수는 백엔드 응답 봉투(ApiResponse)를 그대로 반환한다.
 * shape: { meta: { result, errorCode, message }, data }
 * 성공 시 meta.result === "SUCCESS". 커서 목록은 data = { content, nextCursor, hasNext, totalCount }.
 * (axios response 객체가 아니라 response.data 를 반환하므로 호출부는 res.meta / res.data 로 접근)
 */

// 소셜 로그인 (가입 겸용). 베타 데모는 카카오 + 게스트 두 경로를 제공한다.
// redirectUri 는 카카오 콘솔·백엔드 화이트리스트와 일치해야 하므로 oauth 헬퍼(현재 오리진 기반)로 통일.
export const login = async (provider, code) => {
  const res = await axiosInstance.post(`/auth/login/${provider}`, {
    code,
    redirectUri: kakaoRedirectUri(),
  });
  return res.data;
};

// 게스트 로그인 (소셜 인증 없이 임시 사용자 즉시 생성). 쿠키(access/refresh) 세팅됨.
export const guestLogin = async () => {
  const res = await axiosInstance.post("/auth/guest");
  return res.data;
};

// 휴대폰 식별 게스트 로그인(베타 전용) — 같은 번호는 재로그인 시 같은 계정으로 이어진다.
// 하이픈·공백 포함 입력 허용(서버가 숫자만으로 정규화). 형식 오류는 400 INVALID_INPUT.
export const guestPhoneLogin = async (phoneNumber) => {
  const res = await axiosInstance.post("/auth/guest/phone", { phoneNumber });
  return res.data;
};

// 로그아웃
export const logout = async () => {
  const res = await axiosInstance.post("/auth/logout");
  return res.data;
};

// 토큰 재발급 — axiosInstance 인터셉터 내부에서 호출되므로 raw axios 사용(무한 루프 방지)
export const refresh = () => {
  return axios.post("/api/v1/auth/refresh", {}, { withCredentials: true });
};

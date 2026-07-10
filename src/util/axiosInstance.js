import axios from "axios";
import { refresh } from "@api/auth";
import { useAuthStore } from "@store/authStore";

const axiosInstance = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
});

// 401 발생 시 refresh 1회 호출 후 이전 실패한 api 재호출하기
let isRefreshing = false;
let pendingQueue = [];

const processQueue = (error) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  pendingQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // 이미 refresh 진행 중이면 끝날 때까지 대기 후 재시도
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then(() => axiosInstance(originalRequest));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await refresh();

      processQueue(null);
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      // 재발급까지 실패 = 세션이 죽었다(만료·타탭 로그아웃·강제만료).
      // 클라 인증 상태를 비워 RequireAuth 가 개인화 라우트를 즉시 게이트하도록 전파한다.
      // (checked 는 유지 — 이미 "확인 끝, 비로그인" 이므로 스피너 없이 바로 /login 리다이렉트)
      useAuthStore.getState().clear();
      processQueue(refreshError);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosInstance;

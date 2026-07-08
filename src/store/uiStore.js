import { create } from "zustand";

/**
 * 전역 UI 상태(토스트). toast(message, type) 로 띄우고 3초 뒤 자동 제거.
 * type: "info" | "success" | "error"
 */
let seq = 0;

export const useUiStore = create((set, get) => ({
  toasts: [],

  toast: (message, type = "info", duration = 3000) => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    if (duration > 0) {
      setTimeout(() => get().dismiss(id), duration);
    }
    return id;
  },

  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

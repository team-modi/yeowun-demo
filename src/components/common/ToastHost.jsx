import { useUiStore } from "@store/uiStore";

/**
 * ToastHost — uiStore 의 토스트를 화면 하단에 렌더. AppLayout 에 1회 마운트.
 */
export default function ToastHost() {
  const toasts = useUiStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className="toast-layer" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type}`} role="status">
          {t.message}
        </div>
      ))}
    </div>
  );
}

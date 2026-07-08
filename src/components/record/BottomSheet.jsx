import { useEffect } from "react";

/**
 * BottomSheet — 스크림 + 하단 시트(모바일 프레임 폭에 정렬).
 * props: { title?, subtitle?, onClose, children, footer? }
 * 스크림 클릭·ESC 로 닫힘. 시트 내부 클릭은 전파 차단.
 */
export default function BottomSheet({ title, subtitle, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="rec-sheet-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="rec-sheet" onClick={(e) => e.stopPropagation()}>
        <span className="rec-sheet__handle" aria-hidden />
        {title && <h3 className="rec-sheet__title">{title}</h3>}
        {subtitle && <p className="rec-sheet__sub">{subtitle}</p>}
        <div className="rec-sheet__body">{children}</div>
        {footer && <div className="rec-sheet__footer">{footer}</div>}
      </div>
    </div>
  );
}

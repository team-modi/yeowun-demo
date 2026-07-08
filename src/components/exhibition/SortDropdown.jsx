import { useEffect, useRef, useState } from "react";

import { SORTS } from "@components/exhibition/constants";
import { ChevronDownIcon } from "@components/exhibition/icons";

/**
 * SortDropdown — 정렬 드롭다운(최신순/종료임박/인기순).
 * props: { value, onChange(code) }
 */
export default function SortDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const current = SORTS.find((s) => s.code === value) ?? SORTS[0];

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="exh-sort" ref={rootRef}>
      <button
        type="button"
        className="exh-sort__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{current.label}</span>
        <ChevronDownIcon size={16} />
      </button>

      {open && (
        <ul className="exh-sort__menu" role="listbox">
          {SORTS.map((s) => (
            <li key={s.code} role="option" aria-selected={s.code === value}>
              <button
                type="button"
                className={`exh-sort__opt ${s.code === value ? "is-active" : ""}`}
                onClick={() => {
                  onChange(s.code);
                  setOpen(false);
                }}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

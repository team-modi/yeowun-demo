/**
 * ToggleSwitch — 접근성 있는 on/off 스위치(체크박스 기반).
 * props: { checked, onChange(next), disabled?, label, description? }
 */
export default function ToggleSwitch({
  checked = false,
  onChange,
  disabled = false,
  label,
  description,
}) {
  return (
    <label className={`pf-toggle ${disabled ? "is-disabled" : ""}`}>
      <span className="pf-toggle__text">
        <span className="pf-toggle__label">{label}</span>
        {description && <span className="pf-toggle__desc">{description}</span>}
      </span>

      <input
        type="checkbox"
        className="pf-toggle__input"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="pf-toggle__track" aria-hidden="true">
        <span className="pf-toggle__thumb" />
      </span>
    </label>
  );
}

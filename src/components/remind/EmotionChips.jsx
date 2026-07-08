/**
 * EmotionChips — 감정 코드 목록을 읽기용 칩으로 표시.
 * props: { codes?: string[], tone?: "default" | "accent" | "muted", empty?: string }
 */
export default function EmotionChips({ codes, tone = "default", empty }) {
  if (!codes || codes.length === 0) {
    return empty ? <p className="emotion-chips__empty">{empty}</p> : null;
  }
  return (
    <ul className={`emotion-chips emotion-chips--${tone}`}>
      {codes.map((code, i) => (
        <li key={`${code}-${i}`} className="emotion-chip">
          {code}
        </li>
      ))}
    </ul>
  );
}

/**
 * SelectedExhibition — 선택한 전시 요약 카드(wf-10 상단).
 * props: { exhibition: {title,posterUrl,place,artistSummary,startDate,endDate} }
 */
export default function SelectedExhibition({ exhibition }) {
  if (!exhibition) return null;
  const { title, posterUrl, place, artistSummary } = exhibition;

  return (
    <div className="rec-selected">
      {posterUrl ? (
        <img className="rec-selected__poster" src={posterUrl} alt="" />
      ) : (
        <div className="rec-selected__poster rec-selected__poster--empty">Poster</div>
      )}
      <div className="rec-selected__body">
        <span className="rec-selected__title">{title}</span>
        {artistSummary && <span className="rec-selected__meta">{artistSummary}</span>}
        {place && <span className="rec-selected__meta rec-selected__meta--place">{place}</span>}
      </div>
    </div>
  );
}

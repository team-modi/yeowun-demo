import { useEffect } from "react";

/**
 * MapSheet — [03] 전시상세_위치확인 바텀시트.
 * 장소 "›" 탭 시 표시. 장소명 + 지도 영역 + 주소.
 * 지도는 키리스 카카오맵 링크(https://map.kakao.com/link/map/{place},{lat},{lng})로 연다.
 * gpsY = 위도(lat), gpsX = 경도(lng).
 * props: { place, address, gpsX, gpsY, onClose }
 */
export default function MapSheet({ place, address, gpsX, gpsY, onClose }) {
  // ESC 로 닫기
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const placeName = place || "전시장";
  const hasCoord = gpsX != null && gpsY != null;
  const mapUrl = hasCoord
    ? `https://map.kakao.com/link/map/${encodeURIComponent(placeName)},${gpsY},${gpsX}`
    : null;

  return (
    <div
      className="mapsheet-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="위치 확인"
      onClick={onClose}
    >
      <div className="mapsheet" onClick={(e) => e.stopPropagation()}>
        <div className="mapsheet__handle" aria-hidden="true" />
        <button
          type="button"
          className="mapsheet__close"
          aria-label="닫기"
          onClick={onClose}
        >
          ✕
        </button>

        <p className="mapsheet__place">{placeName}</p>

        {mapUrl ? (
          <a
            className="mapsheet__map"
            href={mapUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            <span className="mapsheet__map-label">Map</span>
            <span className="mapsheet__map-hint">카카오맵에서 열기</span>
          </a>
        ) : (
          <div className="mapsheet__map mapsheet__map--empty">
            <span className="mapsheet__map-label">위치 정보 없음</span>
          </div>
        )}

        {address && <p className="mapsheet__addr">{address}</p>}
      </div>
    </div>
  );
}

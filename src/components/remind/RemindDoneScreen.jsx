import { useNavigate } from "react-router-dom";
import Button from "@components/common/Button";

/**
 * RemindDoneScreen — 저장 완료 화면(A·B 플로우 공용).
 * 중앙 이미지 + 안내 + 하단 '아카이브 보러가기'(?tab=remind).
 * 그때→지금 비교는 아카이브 리마인드 상세에서 보는 컨셉이라 여기선 노출하지 않는다.
 *
 * props: { image?: string }
 */
export default function RemindDoneScreen({ image }) {
  const navigate = useNavigate();

  return (
    <div className="today-flow today-flow--done">
      <div className="flow-done__body">
        <div className="flow-done__img">{image && <img src={image} alt="" />}</div>
        <p className="flow-done__title">오늘의 여운이 저장되었어요</p>
        <p className="flow-done__sub">
          아카이브의 &lsquo;리마인드&rsquo;에서
          <br />
          확인해 보세요
        </p>
      </div>

      <Button block onClick={() => navigate("/archive?tab=remind")}>
        아카이브 보러가기
      </Button>
    </div>
  );
}

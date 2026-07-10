import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { createRecord, getDetailRecord, updateRecord } from "@api/record";
import { getDetail } from "@api/exhibition";
import { useUiStore } from "@store/uiStore";
import Button from "@components/common/Button";
import Spinner from "@components/common/Spinner";
import ExhibitionSelectStep from "@components/record/ExhibitionSelectStep";
import EmotionMediaStep from "@components/record/EmotionMediaStep";
import WriteStep from "@components/record/WriteStep";
import { errMessage, todayISO } from "@components/record/constants";
import "@styles/record.css";

/**
 * RecordPage — [04] 전시 관람 기록 작성/수정 플로우.
 *  1) 전시 선택(리스트·직접추가)  2) 관람일·감정·미디어  3) 작성 방식(직접/AI) → 저장완료
 * ?exhibitionId= 진입 시 전시 프리셋 후 2단계로 시작(전시 상세 "기록하기").
 * ?editId= 진입 시 기존 기록을 불러와 프리셋 후 2단계로 시작(아카이브 상세 "수정"). 저장은 PUT.
 * 저장 성공 → "기록이 저장/수정되었어요" 화면(기록 보러가기 /archive · 홈으로 가기 /yeowun).
 */
export default function RecordPage() {
  const navigate = useNavigate();
  const toast = useUiStore((s) => s.toast);
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get("exhibitionId");
  const editId = searchParams.get("editId");
  const isEdit = !!editId;

  const [step, setStep] = useState(1); // 1 | 2 | 3 | "done"
  const [exhibition, setExhibition] = useState(null);
  const [preloading, setPreloading] = useState(!!preselectedId || !!editId);

  const [viewedAt, setViewedAt] = useState(todayISO());
  const [emotions, setEmotions] = useState([]);
  const [media, setMedia] = useState([]);
  const [initialContent, setInitialContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ?exhibitionId= → 전시 상세 프리셋 후 2단계로.
  useEffect(() => {
    if (!preselectedId) return undefined;
    let alive = true;
    (async () => {
      try {
        const { data } = await getDetail(preselectedId);
        if (!alive) return;
        setExhibition(data);
        setStep(2);
      } catch (err) {
        if (!alive) return;
        toast(errMessage(err, "전시 정보를 불러오지 못했어요."), "error");
      } finally {
        if (alive) setPreloading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedId]);

  // ?editId= → 기존 기록을 불러와 관람일·감정·미디어·본문을 프리셋 후 2단계로.
  // 전시는 변경할 수 없으므로 기록에 박제된 전시 스냅샷으로 요약 카드만 구성한다.
  useEffect(() => {
    if (!editId) return undefined;
    let alive = true;
    (async () => {
      try {
        const { data } = await getDetailRecord(editId);
        if (!alive) return;
        setExhibition({
          exhibitionId: data.exhibitionId,
          title: data.exhibitionTitle,
          posterUrl: data.exhibitionPosterUrl,
          place: data.exhibitionPlace,
        });
        setViewedAt(data.viewedAt || todayISO());
        setEmotions(Array.isArray(data.emotionCodes) ? data.emotionCodes : []);
        setMedia(
          (Array.isArray(data.media) ? data.media : [])
            .filter((m) => m?.url)
            .map((m) => ({ type: m.type, url: m.url })),
        );
        setInitialContent(data.content || "");
        setStep(2);
      } catch (err) {
        if (!alive) return;
        toast(errMessage(err, "기록을 불러오지 못했어요."), "error");
      } finally {
        if (alive) setPreloading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const handleSelect = (exh) => {
    setExhibition(exh);
    setStep(2);
  };

  const handleSubmit = async (content, writeMode) => {
    if (!exhibition?.exhibitionId) {
      toast("전시를 먼저 선택해 주세요.", "error");
      return;
    }
    const body = {
      exhibitionId: exhibition.exhibitionId,
      writeMode,
      viewedAt: viewedAt || null,
      content,
      emotionCodes: emotions,
      media: media
        .filter((m) => m.url.trim())
        .map((m, i) => ({
          type: m.type,
          url: m.url.trim(),
          sortOrder: i,
          sizeBytes: 0,
        })),
    };
    setSubmitting(true);
    try {
      const res = isEdit
        ? await updateRecord(editId, body)
        : await createRecord(body);
      if (res?.meta?.result !== "SUCCESS") {
        toast(res?.meta?.message || "기록 저장에 실패했어요.", "error");
        return;
      }
      setStep("done");
    } catch (err) {
      toast(errMessage(err, "기록 저장에 실패했어요."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (preloading) {
    return (
      <div className="page">
        <Spinner full />
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="page">
        <div className="rec-done">
          <span className="rec-done__mark" aria-hidden>
            ✓
          </span>
          <h2 className="rec-done__title">
            {isEdit ? "기록이 수정되었어요" : "기록이 저장되었어요"}
          </h2>
          <p className="rec-done__sub">아카이브에서 언제든 다시 꺼내볼 수 있어요</p>
          <div className="rec-done__actions">
            <Button block onClick={() => navigate("/archive", { replace: true })}>
              기록 보러가기
            </Button>
            <Button variant="secondary" block onClick={() => navigate("/yeowun", { replace: true })}>
              홈으로 가기
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {step === 1 && (
        <ExhibitionSelectStep onSelect={handleSelect} initialId={preselectedId} />
      )}

      {step === 2 && (
        <EmotionMediaStep
          exhibition={exhibition}
          viewedAt={viewedAt}
          setViewedAt={setViewedAt}
          emotions={emotions}
          setEmotions={setEmotions}
          media={media}
          setMedia={setMedia}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <WriteStep
          exhibitionId={exhibition?.exhibitionId}
          initialContent={initialContent}
          onBack={() => setStep(2)}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}
    </div>
  );
}

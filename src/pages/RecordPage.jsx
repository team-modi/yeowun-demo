import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { createRecord, getDetailRecord, updateRecord } from "@api/record";
import { getDetail } from "@api/exhibition";
import { useUiStore } from "@store/uiStore";
import Button from "@components/common/Button";
import Spinner from "@components/common/Spinner";
import ExhibitionSelectStep from "@components/record/ExhibitionSelectStep";
import CustomExhibitionForm from "@components/record/CustomExhibitionForm";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectedId = searchParams.get("exhibitionId");
  const editId = searchParams.get("editId");
  const isEdit = !!editId;

  const [exhibition, setExhibition] = useState(null);
  const [preloading, setPreloading] = useState(!!preselectedId || !!editId);

  // step 을 URL(?step=)로 관리 → 상단 뒤로가기·브라우저 뒤로가기 모두 히스토리 pop 으로 단계별 이동.
  const stepParam = searchParams.get("step");
  const step =
    stepParam === "done"
      ? "done"
      : stepParam === "add" // 전시 직접 추가 폼(1단계 위의 서브 단계)
        ? "add"
        : stepParam === "3"
          ? 3
          : stepParam === "2"
            ? 2
            : 1;

  // 다음 단계로 진행. 기본은 push(새 히스토리 항목 → 뒤로가기로 이 단계 복귀), replace 는 현재 항목 교체.
  const goStep = useCallback(
    (s, opts = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("step", String(s));
          return next;
        },
        { replace: !!opts.replace },
      );
    },
    [setSearchParams],
  );

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
        goStep(2, { replace: true }); // 상세 "기록하기" 진입 → 뒤로가기 시 상세로(단계 1 거치지 않음)
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
            .map((m) => ({ type: m.type, url: m.url, sizeBytes: m.sizeBytes ?? 0 })),
        );
        setInitialContent(data.content || "");
        goStep(2, { replace: true }); // 수정 진입 → 뒤로가기 시 아카이브로(단계 1 거치지 않음)
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

  // 새로고침 등으로 전시 정보 없이 2·3단계 URL 로 들어오면 1단계로 되돌린다(빈 화면/오류 방지).
  useEffect(() => {
    if (preloading) return;
    if ((step === 2 || step === 3) && !exhibition) {
      goStep(1, { replace: true });
    }
  }, [step, exhibition, preloading, goStep]);

  // 리스트에서 선택 → 2단계(push, 뒤로가기 시 리스트 복귀).
  const handleSelect = (exh) => {
    setExhibition(exh);
    goStep(2);
  };

  // 직접 추가 폼에서 생성 → 2단계로 이동하되 add 항목을 replace → 뒤로가기 시 폼이 아니라 리스트로 복귀.
  const handleCustomCreated = (exh) => {
    setExhibition(exh);
    goStep(2, { replace: true });
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
          sizeBytes: m.sizeBytes ?? 0,
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
      goStep("done", { replace: true }); // 저장 완료 화면은 현재 항목 교체(뒤로가기로 재제출 방지)
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
        <ExhibitionSelectStep
          onSelect={handleSelect}
          onAddCustom={() => goStep("add")}
          initialId={preselectedId}
        />
      )}

      {step === "add" && (
        <CustomExhibitionForm
          onCreated={handleCustomCreated}
          onCancel={() => navigate(-1)}
        />
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
          onNext={() => goStep(3)}
        />
      )}

      {step === 3 && (
        <WriteStep
          exhibitionId={exhibition?.exhibitionId}
          initialContent={initialContent}
          onBack={() => navigate(-1)}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}
    </div>
  );
}

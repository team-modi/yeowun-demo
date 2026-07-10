import { test, expect } from "@playwright/test";

/**
 * 기록 "질문으로 작성"(AI) 플로우의 클라이언트 회복력 스모크.
 * compose 엔드포인트(/records/ai/compose)가 일시적 502 를 한 번 반환한 뒤 200 을 주면,
 * WriteStep 의 재시도(withRetryOnce)로 사용자는 재조작 없이 감상문 초안 단계까지 도달해야 한다.
 *
 * 백엔드 없이 결정적으로 돌리기 위해 세션·전시상세·AI 질문/작성 응답을 모두 목킹한다.
 */

const envelope = (data) => ({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify({ meta: { result: "SUCCESS" }, data }),
});

test.describe("기록 AI 작성 — 일시적 502 재시도", () => {
  test("compose 502→200: 사용자 재시도 없이 초안 단계 도달", async ({ page }) => {
    // 로그인 세션(getMe 성공) — /record 는 RequireAuth 가드 뒤에 있다.
    await page.route("**/api/v1/users/me", (route) =>
      route.fulfill(envelope({ id: 1, nickname: "게스트" })),
    );

    // 전시 상세 프리셋(?exhibitionId=1 진입 시 getDetail).
    await page.route("**/api/v1/exhibitions/1", (route) =>
      route.fulfill(envelope({ exhibitionId: 1, title: "테스트 전시", place: "서울" })),
    );

    // AI 질문 생성 — 3문항(wf-12: Q1 단독 "다음" → Q2 "이전"+"다음" → Q3 "감상문으로 다듬기").
    await page.route("**/api/v1/records/ai/questions", (route) =>
      route.fulfill(
        envelope({
          questions: [
            "오늘 전시에서 가장 오래 머문 장면은?",
            "그 장면에서 어떤 감정을 느꼈나요?",
            "이 전시를 한 문장으로 남긴다면?",
          ],
        }),
      ),
    );

    // compose: 첫 호출은 502(AI_GENERATION_FAILED), 두 번째는 200. 재시도가 동작하는지 검증.
    let composeCalls = 0;
    await page.route("**/api/v1/records/ai/compose", (route) => {
      composeCalls += 1;
      if (composeCalls === 1) {
        route.fulfill({
          status: 502,
          contentType: "application/json",
          body: JSON.stringify({ meta: { result: "FAIL", message: "AI_GENERATION_FAILED" } }),
        });
        return;
      }
      route.fulfill(envelope({ content: "전시가 남긴 잔상은 오래도록 마음에 머물렀다." }));
    });

    await page.goto("/record?exhibitionId=1");

    // 2단계(감정·미디어): 감정 키워드 최소 1개 선택 후 다음.
    await page.getByRole("button", { name: "감정 키워드 선택" }).click();
    await page.getByRole("button", { name: "슬픈" }).click();
    await page.getByRole("button", { name: "완료" }).click();
    await page.getByRole("button", { name: "다음" }).click();

    // 3단계(작성 방식): "질문으로 작성"(AI) 선택 후 다음.
    await page.getByRole("button", { name: /질문으로 작성/ }).click();
    await page.getByRole("button", { name: "다음" }).click();

    // Q1(wf-12): 진행바 + "Q1." 라벨 + 질문, 하단은 "다음" 단독(이전 버튼 없음).
    await expect(page.getByRole("progressbar")).toBeVisible();
    await expect(page.getByText("Q1.", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /가장 오래 머문 장면/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "이전" })).toHaveCount(0);
    await page.getByPlaceholder("답변을 입력해 주세요").fill("마지막 방의 어두운 영상 작업.");
    await expect(page.getByText("17/300")).toBeVisible(); // 카운터(n/300)
    await page.getByRole("button", { name: "다음" }).click();

    // Q2(wf-12): "이전"+"다음" 2버튼.
    await expect(page.getByText("Q2.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "이전" })).toBeVisible();
    await page.getByPlaceholder("답변을 입력해 주세요").fill("낯설고도 아련한 감각.");
    await page.getByRole("button", { name: "다음" }).click();

    // Q3(wf-12): 마지막 질문의 제출 버튼은 "감상문으로 다듬기".
    await expect(page.getByText("Q3.", { exact: true })).toBeVisible();
    await page.getByPlaceholder("답변을 입력해 주세요").fill("빛이 오래 남는 전시.");
    await page.getByRole("button", { name: "감상문으로 다듬기" }).click();

    // 초안 단계(wf-12): 타이틀 + 안내 부제 + 박스 아래 "다시 다듬기" + 하단 "이전"/"작성 완료".
    await expect(
      page.getByRole("heading", { name: "AI가 당신의 답변을 바탕으로 감상문을 정리했어요" }),
    ).toBeVisible();
    await expect(page.getByText(/AI에게 다시 정리를 요청하거나/)).toBeVisible();
    await expect(page.getByRole("button", { name: /다시 다듬기/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "이전" })).toBeVisible();
    await expect(page.getByRole("button", { name: "작성 완료" })).toBeVisible();
    await expect(page.getByRole("textbox")).toHaveValue(/오래도록 마음에 머물렀다/);

    // compose 가 정확히 2번(최초 502 + 재시도 1회) 호출됐는지 확인.
    expect(composeCalls).toBe(2);
  });
});

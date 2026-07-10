import { test, expect } from "@playwright/test";

import { loginAsTestUser } from "./_helpers";

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
    await loginAsTestUser(page);

    // 전시 상세 프리셋(?exhibitionId=1 진입 시 getDetail).
    await page.route("**/api/v1/exhibitions/1", (route) =>
      route.fulfill(envelope({ exhibitionId: 1, title: "테스트 전시", place: "서울" })),
    );

    // AI 질문 생성.
    await page.route("**/api/v1/records/ai/questions", (route) =>
      route.fulfill(envelope({ questions: ["오늘 전시에서 가장 오래 머문 장면은?"] })),
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

    // 질문 노출 → 답변 입력.
    await expect(page.getByRole("heading", { name: /가장 오래 머문 장면/ })).toBeVisible();
    await page.getByPlaceholder("답변을 입력해 주세요").fill("마지막 방의 어두운 영상 작업.");

    // 감상문 만들기 → compose 502 후 자동 재시도로 초안 단계 도달.
    await page.getByRole("button", { name: "감상문 만들기" }).click();

    await expect(
      page.getByRole("heading", { name: "AI가 당신의 답변을 바탕으로 감상문을 정리했어요" }),
    ).toBeVisible();
    await expect(page.getByRole("textbox")).toHaveValue(/오래도록 마음에 머물렀다/);

    // compose 가 정확히 2번(최초 502 + 재시도 1회) 호출됐는지 확인.
    expect(composeCalls).toBe(2);
  });
});

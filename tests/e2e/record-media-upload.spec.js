import { test, expect } from "@playwright/test";

/**
 * 기록 작성 — 실제 이미지 업로드(프리사인 R2) 플로우 스모크.
 *
 * window.prompt 로 URL 을 받던 자리를 네이티브 파일 선택 + 업로드로 교체했다.
 * FE → Worker(/presign) → R2(PUT uploadUrl) → 응답 fileUrl 을 media[].url 로 저장.
 *
 * 백엔드/Worker/R2 없이 결정적으로 돌리기 위해 세션·전시상세·프리사인·R2 PUT·기록생성을 모두 목킹한다.
 */

const envelope = (data) => ({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify({ meta: { result: "SUCCESS" }, data }),
});

// 1x1 투명 PNG(작은 실제 파일 바이트).
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

const FILE_URL = "https://pub.example/x.png";

test.describe("기록 미디어 업로드 — 프리사인 R2", () => {
  test("사진 선택 → 업로드 → 썸네일 노출 + 기록 생성 body 에 fileUrl 포함", async ({
    page,
  }) => {
    // 로그인 세션(getMe 성공) — /record 는 RequireAuth 가드 뒤.
    await page.route("**/api/v1/users/me", (route) =>
      route.fulfill(envelope({ userId: 1, provider: "GUEST", nickname: "게스트" })),
    );

    // 전시 상세 프리셋(?exhibitionId=1).
    await page.route("**/api/v1/exhibitions/1", (route) =>
      route.fulfill(envelope({ exhibitionId: 1, title: "테스트 전시", place: "서울" })),
    );

    // Worker 프리사인 → uploadUrl(R2 PUT 목) + fileUrl(영구 URL).
    await page.route("**/presign", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          uploadUrl: "https://r2.example/put",
          fileUrl: FILE_URL,
          key: "x.png",
          type: "PHOTO",
          contentType: "image/png",
        }),
      }),
    );

    // R2 presigned PUT → 200.
    await page.route("https://r2.example/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/plain", body: "" }),
    );

    // 기록 생성 — 요청 body 를 캡처해 media[].url 검증에 사용.
    let createBody = null;
    await page.route("**/api/v1/records", (route) => {
      createBody = route.request().postDataJSON();
      route.fulfill(envelope({ recordId: 42 }));
    });

    await page.goto("/record?exhibitionId=1");

    // 2단계(감정·미디어): 미디어 시트 열기 → 사진선택 → 파일 지정.
    await page.getByRole("button", { name: /\/5$/ }).click(); // N/5 추가 타일
    await page.getByRole("button", { name: "사진선택" }).click();
    await page.setInputFiles('input[type="file"]', {
      name: "photo.png",
      mimeType: "image/png",
      buffer: PNG_1x1,
    });

    // 업로드 성공 → 썸네일(img) 노출, 카운터 1/5.
    await expect(page.locator("img.rec-media-tile__img")).toHaveCount(1);
    await expect(page.locator("img.rec-media-tile__img")).toHaveAttribute(
      "src",
      FILE_URL,
    );
    await expect(page.getByText("1/5")).toBeVisible();

    // 감정 키워드 최소 1개 선택 후 다음.
    await page.getByRole("button", { name: "감정 키워드 선택" }).click();
    await page.getByRole("button", { name: "슬픈" }).click();
    await page.getByRole("button", { name: "완료" }).click();
    await page.getByRole("button", { name: "다음" }).click();

    // 3단계(작성 방식): 직접 작성 → 다음 → 감상 입력 → 작성 완료.
    await page.getByRole("button", { name: /직접 작성/ }).click();
    await page.getByRole("button", { name: "다음" }).click();
    await page.getByPlaceholder("답변을 입력해 주세요").fill("좋았던 전시였다.");
    await page.getByRole("button", { name: "작성 완료" }).click();

    // 저장 완료 화면 도달.
    await expect(
      page.getByRole("heading", { name: "기록이 저장되었어요" }),
    ).toBeVisible();

    // 기록 생성 body 의 media[].url 에 fileUrl 이 담겼는지 확인.
    expect(createBody).toBeTruthy();
    expect(Array.isArray(createBody.media)).toBe(true);
    expect(createBody.media[0].url).toBe(FILE_URL);
    expect(createBody.media[0].type).toBe("PHOTO");
  });
});

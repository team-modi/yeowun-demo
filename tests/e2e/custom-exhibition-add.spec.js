import { test, expect } from "@playwright/test";

/**
 * 전시 직접 추가(04-02, 와이어프레임 "01_전시탐색홈_검색 탭 클릭") — 새 계약 스모크.
 *
 * 헤더 "전시 추가" · 포스터 파일 업로드(프리사인 R2 → 썸네일) · 전시관 검색 자동완성 ·
 * 기간 캘린더 range 시트 · 형태 시트(개인전 → 작가명) · 장르 칩 시트(마스터 10종) →
 * POST /exhibitions/custom body 에 genreKeyword 포함 → 기록 2단계 복귀까지 검증한다.
 * 백엔드/Worker/R2 없이 결정적으로 돌리기 위해 전부 목킹한다.
 */

const envelope = (data) => ({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify({ meta: { result: "SUCCESS" }, data }),
});

// 1x1 투명 PNG(작은 실제 파일 바이트).
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAABJRU5ErkJggg==".length > 0
    ? "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    : "",
  "base64",
);

const POSTER_URL = "https://pub.example/poster.png";

test.describe("전시 직접 추가 — 와이어프레임 정합", () => {
  test("포스터 업로드·전시관 검색·기간·형태·장르 선택 → genreKeyword 포함 등록", async ({
    page,
  }) => {
    // 로그인 세션(getMe 성공) — /record 는 RequireAuth 가드 뒤.
    await page.route("**/api/v1/users/me", (route) =>
      route.fulfill(envelope({ userId: 1, provider: "GUEST", nickname: "게스트" })),
    );

    // 전시관 검색 자동완성.
    await page.route("**/api/v1/venues**", (route) =>
      route.fulfill(
        envelope({
          venues: [
            { venueId: 7, name: "아리랑 문화관", address: "서울 성북구", region: "SEOUL" },
            { venueId: 8, name: "아시아 현대미술관", address: "서울 종로구", region: "SEOUL" },
          ],
        }),
      ),
    );

    // 포스터 업로드 — Worker 프리사인 → R2 PUT 목.
    await page.route("**/presign", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          uploadUrl: "https://r2.example/put",
          fileUrl: POSTER_URL,
          key: "poster.png",
          type: "PHOTO",
          contentType: "image/png",
        }),
      }),
    );
    await page.route("https://r2.example/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/plain", body: "" }),
    );

    // 직접 등록 — 요청 body 캡처.
    let createBody = null;
    await page.route("**/api/v1/exhibitions/custom", (route) => {
      createBody = route.request().postDataJSON();
      route.fulfill(envelope({ exhibitionId: 108 }));
    });

    await page.goto("/record?step=add");

    // 헤더 "전시 추가" + 타이틀.
    await expect(page.getByRole("heading", { name: "전시 추가" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "전시 정보를 입력해 주세요" }),
    ).toBeVisible();

    // "다음"은 전시명 입력 전 비활성.
    await expect(page.getByRole("button", { name: "다음" })).toBeDisabled();

    // 포스터 파일 선택 → 프리사인 업로드 → 썸네일 노출.
    await page.setInputFiles('input[type="file"]', {
      name: "poster.png",
      mimeType: "image/png",
      buffer: PNG_1x1,
    });
    await expect(page.locator("img.rec-poster__img")).toHaveAttribute("src", POSTER_URL);

    // 전시명(필수) → 다음 활성.
    await page.getByPlaceholder("전시명을 입력해 주세요").fill("조용한 호숫가");
    await expect(page.getByRole("button", { name: "다음" })).toBeEnabled();

    // 전시관 — 검색 화면 → 자동완성 → 선택.
    await page.getByRole("button", { name: /전시관을 선택해 주세요/ }).click();
    await expect(page.getByRole("heading", { name: "전시관 검색" })).toBeVisible();
    await page.getByLabel("전시관 검색").fill("아리");
    await page.getByRole("button", { name: /아리랑 문화관/ }).click();
    await expect(page.getByRole("button", { name: /아리랑 문화관/ })).toBeVisible();

    // 전시 기간 — 캘린더 시트에서 범위(10~16일) 선택.
    await page.getByRole("button", { name: /전시 기간을 선택해 주세요/ }).click();
    const cal = page.locator(".rec-cal");
    await expect(cal).toBeVisible();
    await cal.getByRole("button", { name: "10", exact: true }).click();
    await cal.getByRole("button", { name: "16", exact: true }).click();
    await page.getByRole("button", { name: "완료" }).click();

    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const dot = ym.replaceAll("-", ".");
    await expect(
      page.getByRole("button", { name: `${dot}.10 ~ ${dot}.16` }),
    ).toBeVisible();

    // 전시 형태 — 개인전 선택 시 작가명 입력 노출.
    await page.getByRole("button", { name: /전시 형태를 선택해 주세요/ }).click();
    await page.getByRole("button", { name: "개인전", exact: true }).click();
    await page.getByPlaceholder("작가이름을 입력해주세요").fill("김선영");
    await page.getByRole("button", { name: "완료" }).click();
    await expect(page.getByRole("button", { name: "개인전 · 김선영" })).toBeVisible();

    // 장르 — 마스터 10종 칩(단일 선택).
    await page.getByRole("button", { name: /장르를 선택해 주세요/ }).click();
    for (const k of ["회화·드로잉", "사진", "미디어아트", "조각·설치", "디자인", "공예", "건축", "공연", "현대미술", "일러스트레이션"]) {
      await expect(page.getByRole("button", { name: k, exact: true })).toBeVisible();
    }
    await page.getByRole("button", { name: "사진", exact: true }).click();
    await page.getByRole("button", { name: "완료" }).click();

    // 다음 → 등록 → 기록 2단계(감정·미디어)로 복귀.
    await page.getByRole("button", { name: "다음" }).click();
    await expect(page.getByText("관람일")).toBeVisible();
    await expect(page.getByText("조용한 호숫가")).toBeVisible();

    // 새 계약: genreKeyword(마스터 키워드) 전송 + 기존 필드 유지.
    expect(createBody).toBeTruthy();
    expect(createBody.title).toBe("조용한 호숫가");
    expect(createBody.posterUrl).toBe(POSTER_URL);
    expect(createBody.venueId).toBe(7);
    expect(createBody.place).toBe(null);
    expect(createBody.startDate).toBe(`${ym}-10`);
    expect(createBody.endDate).toBe(`${ym}-16`);
    expect(createBody.format).toBe("SOLO");
    expect(createBody.artist).toBe("김선영");
    expect(createBody.genreKeyword).toBe("사진");
  });

  test("장르 미선택이면 genreKeyword 를 보내지 않는다(서버 AI 자동 분류)", async ({
    page,
  }) => {
    await page.route("**/api/v1/users/me", (route) =>
      route.fulfill(envelope({ userId: 1, provider: "GUEST", nickname: "게스트" })),
    );
    let createBody = null;
    await page.route("**/api/v1/exhibitions/custom", (route) => {
      createBody = route.request().postDataJSON();
      route.fulfill(envelope({ exhibitionId: 109 }));
    });

    await page.goto("/record?step=add");
    await page.getByPlaceholder("전시명을 입력해 주세요").fill("제목만 있는 전시");
    await page.getByRole("button", { name: "다음" }).click();
    await expect(page.getByText("관람일")).toBeVisible();

    expect(createBody).toBeTruthy();
    expect(createBody.title).toBe("제목만 있는 전시");
    expect("genreKeyword" in createBody).toBe(false);
  });
});

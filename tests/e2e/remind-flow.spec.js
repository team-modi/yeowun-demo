import { test, expect } from "@playwright/test";

/**
 * 리마인드(오늘의 여운) 플로우 — 와이어프레임(03_전시 기록 선택_B · 07_리마인드) 정합 회귀.
 *
 * 계약:
 *  - 도착 노출: 로그인 + 후보 있음 → 홈 바텀시트 / 전시탐색 상단 배너 → /remind.
 *    X 닫으면 sessionStorage 플래그로 세션 동안 재노출하지 않는다. 비로그인·후보 없음·실패 시 미노출.
 *  - /remind 플로우: 중복 h2 없이(타이틀은 TopBar) intro(2줄 문구 + 날짜·장소 칩) → scene(sceneImageUrl,
 *    폴백 posterUrl) → original(나가기=플로우 이탈) → write(감정 접힘 알약 + 카운터 없는 textarea)
 *    → 저장 → 독립 완료 화면(비교 요약 없음, 아카이브 보러가기).
 *
 * 결정성: getMe·후보·목록·저장·홈/탐색 목록을 모두 목킹한다(실백엔드 프록시 오염 방지).
 */

const ME_OK = {
  meta: { result: "SUCCESS" },
  data: {
    userId: 1,
    provider: "KAKAO",
    nickname: "시현",
    profileImageUrl: null,
    tasteKeywords: [],
    stats: { recordCount: 1, exhibitionCount: 1, bookmarkCount: 0 },
  },
};

const CANDIDATE = {
  meta: { result: "SUCCESS" },
  data: {
    recordId: 11,
    daysAgo: 7,
    elapsedLabel: "1주일 전",
    exhibitionId: 3,
    exhibitionTitle: "조용한 호숫가",
    artist: "김미경 외 10인",
    posterUrl: null,
    sceneImageUrl: null,
    place: "동작아트갤러리",
    region: "서울",
    viewedAt: "2026-07-03",
    originalContent: "빛이 천천히 번지는 전시실을 지나며, 어릴 적 기억이 떠올랐다.",
    originalEmotionCodes: ["평화로운", "차분한"],
  },
};

const EMPTY_LIST = {
  meta: { result: "SUCCESS" },
  data: { content: [], nextCursor: null, hasNext: false, totalCount: 0 },
};

const json = (body, status = 200) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

// 공통 목킹: 세션 + 후보 + 리마인드 목록/저장 + 홈·탐색 목록.
async function mockCommon(page, { authed = true, candidate = CANDIDATE } = {}) {
  await page.route("**/api/v1/users/me", (route) =>
    route.fulfill(authed ? json(ME_OK) : json({}, 401)),
  );
  await page.route("**/api/v1/auth/refresh", (route) => route.fulfill(json({}, 401)));

  await page.route("**/api/v1/reminds/candidate", (route) => route.fulfill(json(candidate)));
  // GET /reminds(목록)과 POST /reminds(저장)는 같은 URL — 메서드로 분기.
  await page.route("**/api/v1/reminds", (route) => {
    if (route.request().method() === "POST") {
      route.fulfill(json({ meta: { result: "SUCCESS" }, data: { remindId: 99, recordId: 11 } }));
    } else {
      route.fulfill(json({ meta: { result: "SUCCESS" }, data: { content: [] } }));
    }
  });

  // 아카이브(완료 화면 → ?tab=remind 딥링크 검증용): 리마인드 목록(쿼리 포함)·기록 목록.
  await page.route("**/api/v1/reminds?**", (route) => route.fulfill(json(EMPTY_LIST)));
  await page.route("**/api/v1/records?**", (route) =>
    route.fulfill(
      json({
        meta: { result: "SUCCESS" },
        data: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, hasNext: false },
      }),
    ),
  );

  // 홈 배너/섹션·탐색 목록(빈 값) — 실백엔드 프록시로 새지 않게.
  await page.route("**/api/v1/exhibitions/banners", (route) =>
    route.fulfill(json({ meta: { result: "SUCCESS" }, data: { banners: [] } })),
  );
  await page.route("**/api/v1/exhibitions?**", (route) => route.fulfill(json(EMPTY_LIST)));
}

test.describe("오늘의 여운 도착 노출 + 리마인드 플로우", () => {
  test("홈 바텀시트 → 그날의 기록 보기 → 플로우 완주(저장 → 완료 화면)", async ({ page }) => {
    await mockCommon(page);

    let saveBody = null;
    await page.route("**/api/v1/reminds", (route) => {
      if (route.request().method() === "POST") {
        saveBody = route.request().postDataJSON();
        route.fulfill(json({ meta: { result: "SUCCESS" }, data: { remindId: 99, recordId: 11 } }));
      } else {
        route.fulfill(json({ meta: { result: "SUCCESS" }, data: { content: [] } }));
      }
    });

    // ── 도착 바텀시트(wf-07): 배지 + 제목·작가 + 닉네임/경과 문구 + 풀폭 CTA ──
    await page.goto("/yeowun");
    const sheet = page.locator(".rm-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText("오늘의 여운", { exact: true })).toBeVisible();
    await expect(sheet.getByText("조용한 호숫가")).toBeVisible();
    await expect(sheet.getByText("김미경 외 10인")).toBeVisible();
    await expect(sheet.getByText(/시현님이 1주일 전 남긴/)).toBeVisible();

    await sheet.getByRole("button", { name: "그날의 기록 보기" }).click();
    await expect(page).toHaveURL(/\/remind$/);

    // ── intro: 중복 h2 없음(타이틀은 TopBar h1) + 2줄 문구 + 날짜·장소 칩 ──
    await expect(page.getByRole("heading", { level: 2, name: "오늘의 여운" })).toHaveCount(0);
    await expect(page.getByText(/1주일 전,\s*이 전시를 기록했어요/)).toBeVisible();
    await expect(page.getByText("2026. 07. 03")).toBeVisible();
    await expect(page.getByText("동작아트갤러리/서울")).toBeVisible();

    // ── scene → original ──
    await page.getByRole("button", { name: "다음" }).click();
    await expect(page.getByText("전시 속, 그 장면")).toBeVisible();
    await page.getByRole("button", { name: "다음" }).click();
    await expect(page.getByText("그때 내가 기록한 여운이에요")).toBeVisible();
    await expect(page.getByText(/빛이 천천히 번지는 전시실/)).toBeVisible();

    // ── write: 접힘 알약(+) → EmotionPicker 펼침 → 선택 → 접으면 칩 나열, 카운터 없음 ──
    await page.getByRole("button", { name: "감정 다시 남기기" }).click();
    await expect(page.getByText("지금 다시 보니")).toBeVisible();
    await expect(page.getByText(/\/ 300/)).toHaveCount(0); // "n / 300" 카운터 제거(와이어프레임)

    await page.getByRole("button", { name: "감정 선택 열기" }).click();
    await page.getByRole("button", { name: "평화로운" }).click();
    await page.getByRole("button", { name: "접기" }).click();
    await expect(page.getByRole("button", { name: "감정 다시 선택" })).toContainText("평화로운");

    await page
      .getByPlaceholder("지금 떠오르는 생각을 적어보세요")
      .fill("지금 보니 반전되는 분위기가 더 생생하다");
    await page.getByRole("button", { name: "오늘의 여운 저장" }).click();

    // ── done: 독립 완료 화면(비교 요약 없이) + 아카이브 이동 ──
    await expect(page.getByText("오늘의 여운이 저장되었어요")).toBeVisible();
    await expect(page.getByText(/아카이브의 ‘리마인드’에서\s*확인해 보세요/)).toBeVisible();
    await expect(page.getByText("감정 변화 요약")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "아카이브 보러가기" })).toBeVisible();

    expect(saveBody).toMatchObject({
      recordId: 11,
      emotionCodes: ["평화로운"],
      reflection: "지금 보니 반전되는 분위기가 더 생생하다",
    });

    // ── 완료 화면 → 아카이브 '리마인드' 탭 딥링크(기획서 9절) ──
    await page.getByRole("button", { name: "아카이브 보러가기" }).click();
    await expect(page).toHaveURL(/\/archive\?tab=remind$/);
    await expect(page.getByRole("tab", { name: "리마인드" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // 저장본이 없는 계정이므로 온보딩 빈 상태 문구(기획서 8절)가 보인다.
    await expect(page.getByText(/나만의 여운을 남기고/)).toBeVisible();
  });

  test("홈 바텀시트 X 닫기 → 같은 세션에서 재노출되지 않는다", async ({ page }) => {
    await mockCommon(page);

    await page.goto("/yeowun");
    await expect(page.locator(".rm-sheet")).toBeVisible();
    await page.getByRole("button", { name: "닫기" }).click();
    await expect(page.locator(".rm-sheet-overlay")).toHaveCount(0);

    // 새로고침(같은 세션) — 그 후보(recordId)만 억제되어 재노출되지 않는다.
    await page.reload();
    await expect(page.getByText("곧 끝나기 전에 봐야 할 전시")).toBeVisible();
    await expect(page.locator(".rm-sheet-overlay")).toHaveCount(0);
  });

  test("X 닫기는 그 후보(전시)만 억제 — 다른 전시 후보는 여전히 뜬다", async ({ page }) => {
    const A = { ...CANDIDATE.data, recordId: 11, exhibitionTitle: "조용한 호숫가" };
    const B = { ...CANDIDATE.data, recordId: 22, exhibitionTitle: "빛의 속삭임" };
    let current = A;
    await page.route("**/api/v1/users/me", (r) => r.fulfill(json(ME_OK)));
    await page.route("**/api/v1/auth/refresh", (r) => r.fulfill(json({}, 401)));
    await page.route("**/api/v1/reminds/candidate", (r) =>
      r.fulfill(json({ meta: { result: "SUCCESS" }, data: current })),
    );
    await page.route("**/api/v1/reminds", (r) => r.fulfill(json(EMPTY_LIST)));
    await page.route("**/api/v1/exhibitions/banners", (r) =>
      r.fulfill(json({ meta: { result: "SUCCESS" }, data: { banners: [] } })),
    );
    await page.route("**/api/v1/exhibitions?**", (r) => r.fulfill(json(EMPTY_LIST)));

    await page.goto("/yeowun");
    await expect(page.getByText("조용한 호숫가")).toBeVisible();
    await page.getByRole("button", { name: "닫기" }).click();
    await expect(page.locator(".rm-sheet-overlay")).toHaveCount(0);

    // 후보가 다른 전시(B, 다른 recordId)로 바뀌면 다시 뜬다(전역 억제가 아님).
    current = B;
    await page.reload();
    await expect(page.locator(".rm-sheet")).toBeVisible();
    await expect(page.getByText("빛의 속삭임")).toBeVisible();
  });

  test("3단계 '나가기'는 플로우 이탈(이전 화면 복귀)", async ({ page }) => {
    await mockCommon(page);

    await page.goto("/yeowun");
    await page.getByRole("button", { name: "그날의 기록 보기" }).click();
    await expect(page).toHaveURL(/\/remind$/);

    await page.getByRole("button", { name: "다음" }).click();
    await page.getByRole("button", { name: "다음" }).click();
    await page.getByRole("button", { name: "나가기" }).click();

    await expect(page).toHaveURL(/\/yeowun$/);
  });

  test("전시탐색 상단 배너 노출 → 탭하면 /remind", async ({ page }) => {
    await mockCommon(page);

    await page.goto("/exhibition");
    const banner = page.locator(".rm-banner");
    await expect(banner).toBeVisible();
    await expect(banner.getByText("오늘의 여운", { exact: true })).toBeVisible();
    await expect(banner.getByText(/시현님, 1주일 전 기록한 전시가 있어요!/)).toBeVisible();

    await banner.click();
    await expect(page).toHaveURL(/\/remind$/);
  });

  test("비로그인이면 도착 노출(시트·배너)이 없다", async ({ page }) => {
    await mockCommon(page, { authed: false });

    await page.goto("/exhibition");
    await expect(page.getByText("총 0개")).toBeVisible();
    await expect(page.locator(".rm-banner")).toHaveCount(0);

    await page.goto("/yeowun");
    await expect(page.getByText("곧 끝나기 전에 봐야 할 전시")).toBeVisible();
    await expect(page.locator(".rm-sheet-overlay")).toHaveCount(0);
  });
});

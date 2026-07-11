import { test, expect } from "@playwright/test";

/**
 * 아카이브 '리마인드' 탭(Remind-01 기획서 7·8절) 회귀.
 *
 * 계약:
 *  - 타이틀 아래 세그먼트 탭 [기록 | 리마인드], ?tab=remind 딥링크. 기본은 기록 탭(무변경).
 *  - 리마인드 탭: 1회 로드(page=0,size=100) 후 클라이언트 정렬/필터.
 *    정렬: 최신 리마인드순(createdAt desc, 기본) / 과거 관람일순(viewedAt asc).
 *    주기 칩(viewedAt→createdAt 경과일): d≤10 1주일 전 / 10<d≤45 1개월 전 / d>45 3개월 전.
 *    감정 변화 칩: before∩after 있으면 유지, 양쪽 다 있는데 없음 반전, 한쪽 비면 전체에서만.
 *  - 항목 클릭 → 상세 시트(GET /reminds/{id}, 감정 변화 요약).
 */
const json = (b, s = 200) => ({
  status: s,
  contentType: "application/json",
  body: JSON.stringify(b),
});

const ME = {
  meta: { result: "SUCCESS" },
  data: { userId: 1, provider: "KAKAO", nickname: "시현", stats: {} },
};

const EMPTY_RECORDS = {
  meta: { result: "SUCCESS" },
  data: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, hasNext: false },
};

// 3건 — 주기/감정 변화 조합이 서로 다른 표본.
//  1) 관람 07-03 → 저장 07-10 (7일)   = 1주일 전 / before∩after 있음 → 감정 유지
//  2) 관람 06-05 → 저장 07-09 (34일)  = 1개월 전 / 교집합 없음 → 감정 반전
//  3) 관람 03-01 → 저장 07-08 (129일) = 3개월 전 / before 비어 있음 → 판별 불가(전체에서만)
const REMINDS = {
  meta: { result: "SUCCESS" },
  data: {
    content: [
      {
        remindId: 1,
        recordId: 11,
        createdAt: "2026-07-10T09:00:00Z",
        exhibitionTitle: "조용한 호숫가",
        posterUrl: null,
        place: "동작아트갤러리",
        viewedAt: "2026-07-03",
        reflectionPreview: "지금 보니 더 잔잔하다",
        emotionCodes: ["평화로운"],
        beforeEmotionCodes: ["평화로운", "차분한"],
        aiStatus: "SKIPPED",
        hasAiSummary: false,
      },
      {
        remindId: 2,
        recordId: 12,
        createdAt: "2026-07-09T09:00:00Z",
        exhibitionTitle: "빛의 속삭임",
        posterUrl: null,
        place: "성수 갤러리",
        viewedAt: "2026-06-05",
        reflectionPreview: "이제는 설렘보다 아쉬움이 남는다",
        emotionCodes: ["아쉬운"],
        beforeEmotionCodes: ["설레는"],
        aiStatus: "SKIPPED",
        hasAiSummary: false,
      },
      {
        remindId: 3,
        recordId: 13,
        createdAt: "2026-07-08T09:00:00Z",
        exhibitionTitle: "먼 바다",
        posterUrl: null,
        place: "부산현대미술관",
        viewedAt: "2026-03-01",
        reflectionPreview: "기억이 흐릿해졌지만 그리움은 선명하다",
        emotionCodes: ["그리운"],
        beforeEmotionCodes: [],
        aiStatus: "SKIPPED",
        hasAiSummary: false,
      },
    ],
    hasNext: false,
    totalCount: 3,
  },
};

const DETAIL_1 = {
  meta: { result: "SUCCESS" },
  data: {
    remindId: 1,
    recordId: 11,
    createdAt: "2026-07-10T09:00:00Z",
    exhibition: {
      exhibitionId: 3,
      title: "조용한 호숫가",
      posterUrl: null,
      place: "동작아트갤러리",
      viewedAt: "2026-07-03",
    },
    before: { text: "빛이 천천히 번지는 전시실을 지나며", emotionCodes: ["평화로운", "차분한"] },
    after: { text: "지금 보니 더 잔잔하다", emotionCodes: ["평화로운"] },
    aiStatus: "SKIPPED",
    aiSummary: null,
  },
};

test.use({ viewport: { width: 390, height: 844 } });

async function mockCommon(page, { reminds = REMINDS } = {}) {
  await page.route("**/api/v1/users/me", (r) => r.fulfill(json(ME)));
  await page.route("**/api/v1/auth/refresh", (r) => r.fulfill(json({}, 401)));
  await page.route("**/api/v1/records?**", (r) => r.fulfill(json(EMPTY_RECORDS)));
  await page.route("**/api/v1/reminds/1", (r) => r.fulfill(json(DETAIL_1))); // 상세(더 구체 → 먼저)
  await page.route("**/api/v1/reminds?**", (r) => r.fulfill(json(reminds)));
}

// 현재 보이는 리마인드 목록 제목들.
const titles = (page) => page.locator(".remind-item__title");

test.describe("아카이브 리마인드 탭", () => {
  test("탭 전환 + 기본 정렬(최신 리마인드순) + 상세 시트", async ({ page }) => {
    await mockCommon(page);

    await page.goto("/archive");
    // 기본은 기록 탭(기존 동작 유지).
    await expect(page.getByRole("tab", { name: "기록" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByText("아직 기록이 없어요")).toBeVisible();

    // 리마인드 탭 전환 → URL 딥링크 반영 + createdAt desc 순서.
    await page.getByRole("tab", { name: "리마인드" }).click();
    await expect(page).toHaveURL(/\/archive\?tab=remind$/);
    await expect(titles(page)).toHaveText(["조용한 호숫가", "빛의 속삭임", "먼 바다"]);

    // 항목 클릭 → 상세 시트(감정 변화 요약).
    await page.locator(".remind-item", { hasText: "조용한 호숫가" }).click();
    await expect(page.getByText("감정 변화 요약")).toBeVisible();
    await expect(page.getByText("빛이 천천히 번지는 전시실을 지나며")).toBeVisible();
    await expect(page.getByText("지금 보니 더 잔잔하다").last()).toBeVisible();

    await page.getByRole("button", { name: "닫기" }).click();
    await expect(page.getByText("감정 변화 요약")).toHaveCount(0);
  });

  test("정렬 토글 — 과거 관람일순(viewedAt asc)", async ({ page }) => {
    await mockCommon(page);

    await page.goto("/archive?tab=remind");
    await expect(titles(page)).toHaveText(["조용한 호숫가", "빛의 속삭임", "먼 바다"]);

    await page.getByRole("button", { name: /최신 리마인드순/ }).click();
    await page.getByRole("option", { name: "과거 관람일순" }).click();
    await expect(titles(page)).toHaveText(["먼 바다", "빛의 속삭임", "조용한 호숫가"]);
  });

  test("리마인드 주기 필터 — 1주일/1개월/3개월 전", async ({ page }) => {
    await mockCommon(page);
    await page.goto("/archive?tab=remind");

    const group = page.getByRole("group", { name: "리마인드 주기" });

    await group.getByRole("button", { name: "1주일 전" }).click();
    await expect(titles(page)).toHaveText(["조용한 호숫가"]);

    await group.getByRole("button", { name: "1개월 전" }).click();
    await expect(titles(page)).toHaveText(["빛의 속삭임"]);

    await group.getByRole("button", { name: "3개월 전" }).click();
    await expect(titles(page)).toHaveText(["먼 바다"]);

    await group.getByRole("button", { name: "전체" }).click();
    await expect(titles(page)).toHaveCount(3);
  });

  test("감정 변화 필터 — 유지/반전(판별 불가 항목은 전체에서만)", async ({ page }) => {
    await mockCommon(page);
    await page.goto("/archive?tab=remind");

    const group = page.getByRole("group", { name: "감정 변화" });

    await group.getByRole("button", { name: "감정 유지" }).click();
    await expect(titles(page)).toHaveText(["조용한 호숫가"]);

    await group.getByRole("button", { name: "감정 반전" }).click();
    await expect(titles(page)).toHaveText(["빛의 속삭임"]);

    // before 가 빈 '먼 바다'는 유지/반전 어느 쪽에도 나오지 않고 전체에서만 노출.
    await group.getByRole("button", { name: "전체" }).click();
    await expect(titles(page)).toHaveText(["조용한 호숫가", "빛의 속삭임", "먼 바다"]);
  });

  test("빈 상태 — 온보딩 문구(기획서 8절)", async ({ page }) => {
    await mockCommon(page, {
      reminds: {
        meta: { result: "SUCCESS" },
        data: { content: [], hasNext: false, totalCount: 0 },
      },
    });

    await page.goto("/archive?tab=remind");
    await expect(
      page.getByText("나만의 여운을 남기고, 시간이 흐른 뒤의 변화된 감정을 마주해 보세요."),
    ).toBeVisible();
  });
});

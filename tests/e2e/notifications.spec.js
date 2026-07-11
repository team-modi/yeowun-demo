import { test, expect } from "@playwright/test";

/**
 * 알림 화면(07_리마인드_알림 탭 진입) 정합 회귀.
 *
 * 계약:
 *  - 상단 탭 2개 [오늘의 여운(type=REMIND) | 전시(type=EXHIBITION)] — 기본 탭은 오늘의 여운.
 *    탭 전환 시 해당 type 으로 커서 페이징을 새로 시작한다.
 *  - 카드: 좌측 정사각 썸네일 플레이스홀더 + 타입 라벨(굵은 소형) + 우상단 상대시간 + body 1~2줄.
 *  - 클릭: 미읽음이면 PUT /notifications/{id}/read 낙관 처리.
 *    REMIND → /remind, EXHIBITION → /exhibition/{targetId}.
 *
 * 결정성: getMe·알림 목록·읽음 처리·전시 상세를 모두 목킹한다(실백엔드 프록시 오염 방지).
 */
const json = (b, s = 200) => ({
  status: s,
  contentType: "application/json",
  body: JSON.stringify(b),
});

const ME = {
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

// 상대시간 렌더 확인용 — 실행 시각 기준으로 계산해 "4시간 전"이 결정적으로 나온다.
const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();

const REMIND_LIST = {
  meta: { result: "SUCCESS" },
  data: {
    content: [
      {
        notificationId: 1,
        type: "REMIND",
        title: "오늘의 여운",
        body: "시현님, 1주일 전 기록한 전시가 있어요!",
        targetId: 11, // recordId
        read: false,
        createdAt: hoursAgo(4),
      },
    ],
    nextCursor: null,
    hasNext: false,
    totalCount: 1,
  },
};

const EXHIBITION_LIST = {
  meta: { result: "SUCCESS" },
  data: {
    content: [
      {
        notificationId: 2,
        type: "EXHIBITION",
        title: "전시",
        body: "'행복한 인생' 전시가 3일 뒤 종료 돼요",
        targetId: 3, // exhibitionId
        read: false,
        createdAt: hoursAgo(2),
      },
    ],
    nextCursor: null,
    hasNext: false,
    totalCount: 1,
  },
};

test.use({ viewport: { width: 390, height: 844 } });

async function mockCommon(page) {
  await page.route("**/api/v1/users/me", (r) => r.fulfill(json(ME)));
  await page.route("**/api/v1/auth/refresh", (r) => r.fulfill(json({}, 401)));

  // 읽음 처리(PUT /notifications/{id}/read) — 목록 라우트보다 구체 경로라 별도 등록.
  await page.route("**/api/v1/notifications/*/read", (r) =>
    r.fulfill(json({ meta: { result: "SUCCESS" }, data: { notificationId: 2, read: true } })),
  );

  // 목록 — 쿼리의 type 으로 분기(탭 전환이 type 파라미터를 새로 보내는지 함께 검증).
  await page.route("**/api/v1/notifications?**", (route) => {
    const type = new URL(route.request().url()).searchParams.get("type");
    route.fulfill(json(type === "EXHIBITION" ? EXHIBITION_LIST : REMIND_LIST));
  });

  // EXHIBITION 카드 클릭 → 전시 상세 진입 시의 상세 조회(프록시 누수 방지 최소 목).
  await page.route("**/api/v1/exhibitions/3", (r) =>
    r.fulfill(
      json({
        meta: { result: "SUCCESS" },
        data: {
          exhibitionId: 3,
          title: "행복한 인생",
          type: "CATALOG",
          posterUrl: null,
          place: "동작아트갤러리",
          region: "서울",
          category: "PAINTING",
          startDate: "2026-07-01",
          endDate: "2026-07-14",
          bookmarked: false,
        },
      }),
    ),
  );
}

test.describe("알림 탭(오늘의 여운/전시)", () => {
  test("기본 탭=오늘의 여운 — REMIND 카드(라벨·본문·상대시간) 렌더", async ({ page }) => {
    await mockCommon(page);

    await page.goto("/notifications");

    // 탭 2개, 기본 활성은 '오늘의 여운'.
    await expect(page.getByRole("tab", { name: "오늘의 여운" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("tab", { name: "전시" })).toHaveAttribute(
      "aria-selected",
      "false",
    );

    // 카드: 타입 라벨 + body + 상대시간 + 썸네일 플레이스홀더.
    const card = page.locator(".noti-card");
    await expect(card).toHaveCount(1);
    await expect(card.locator(".noti-card__label")).toHaveText("오늘의 여운");
    await expect(card.getByText("시현님, 1주일 전 기록한 전시가 있어요!")).toBeVisible();
    await expect(card.locator(".noti-card__time")).toHaveText("4시간 전");
    await expect(card.locator(".noti-card__thumb")).toHaveCount(1);
  });

  test("전시 탭 전환 → EXHIBITION 목록으로 교체, 카드 클릭 → 전시 상세 + 읽음 처리", async ({
    page,
  }) => {
    await mockCommon(page);

    let readCalled = null;
    await page.route("**/api/v1/notifications/*/read", (route) => {
      readCalled = route.request().url();
      route.fulfill(json({ meta: { result: "SUCCESS" }, data: { notificationId: 2, read: true } }));
    });

    await page.goto("/notifications");
    await expect(page.getByText("시현님, 1주일 전 기록한 전시가 있어요!")).toBeVisible();

    // 탭 전환 — EXHIBITION type 으로 새로 조회되어 목록이 교체된다.
    await page.getByRole("tab", { name: "전시" }).click();
    await expect(page.getByRole("tab", { name: "전시" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByText("'행복한 인생' 전시가 3일 뒤 종료 돼요")).toBeVisible();
    await expect(page.getByText("시현님, 1주일 전 기록한 전시가 있어요!")).toHaveCount(0);
    await expect(page.locator(".noti-card__label")).toHaveText("전시");

    // 미읽음 카드 클릭 → 읽음 처리(PUT) + /exhibition/{targetId} 이동.
    await page.locator(".noti-card").click();
    await expect(page).toHaveURL(/\/exhibition\/3$/);
    expect(readCalled).toContain("/notifications/2/read");
  });

  test("탭별 빈 상태 — 도착한 알림이 없어요", async ({ page }) => {
    await mockCommon(page);
    await page.route("**/api/v1/notifications?**", (route) =>
      route.fulfill(
        json({
          meta: { result: "SUCCESS" },
          data: { content: [], nextCursor: null, hasNext: false, totalCount: 0 },
        }),
      ),
    );

    await page.goto("/notifications");
    await expect(page.getByText("도착한 알림이 없어요")).toBeVisible();

    await page.getByRole("tab", { name: "전시" }).click();
    await expect(page.getByText("도착한 알림이 없어요")).toBeVisible();
  });
});

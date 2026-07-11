import { test, expect } from "@playwright/test";

/**
 * 아카이브 기록 상세(04_아카이브_상세) — "사진 / 영상" 섹션이 사진(img)·영상(video)을
 * 타입별로 렌더하는지 회귀 검증. (상세는 getDetailRecord = GET /records/{id} 의 media[] 로 채운다.)
 */
const IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><rect width='300' height='300' fill='#8a6d5b'/><text x='150' y='160' font-size='26' fill='white' text-anchor='middle'>사진</text></svg>",
  );
const VIDEO = "data:video/mp4;base64,AAAAHGZ0eXBtcDQy"; // 렌더용(재생 아님) — <video> 엘리먼트 확인 목적

const ME = {
  meta: { result: "SUCCESS" },
  data: { userId: 1, provider: "GUEST", nickname: "게스트", stats: {} },
};
const base = {
  recordId: 11,
  exhibitionId: 3,
  exhibitionTitle: "조용한 호숫가",
  exhibitionType: "CATALOG",
  exhibitionPosterUrl: IMG,
  exhibitionPlace: "동작아트갤러리",
  exhibitionRegion: "서울",
  exhibitionCategory: "PAINTING",
  exhibitionStartDate: "2026-07-01",
  exhibitionEndDate: "2026-08-15",
  viewedAt: "2026-07-03",
  writeMode: "DIRECT",
  representativeEmotion: "평화로운",
  bookmarked: false,
  createdAt: "2026-07-03T10:00:00Z",
};
const LIST = {
  meta: { result: "SUCCESS" },
  data: { content: [{ ...base, thumbnailUrl: IMG, aiSummary: null }], hasNext: false, totalCount: 1 },
};
const DETAIL = {
  meta: { result: "SUCCESS" },
  data: {
    ...base,
    aiStatus: "READY",
    content: "마음에 잔잔한 호숫가에 돌이 하나 떨어지는 느낌이었다.",
    aiSummary: null,
    aiKeywords: [],
    userKeywords: [],
    cardPhrase: null,
    emotionCodes: ["평화로운", "차분한", "고요한"],
    updatedAt: "2026-07-03T10:00:00Z",
    media: [
      { id: 1, type: "PHOTO", url: IMG, sortOrder: 0, sizeBytes: 100 },
      { id: 2, type: "VIDEO", url: VIDEO, sortOrder: 1, sizeBytes: 200 },
    ],
  },
};
const json = (b, s = 200) => ({ status: s, contentType: "application/json", body: JSON.stringify(b) });

test.use({ viewport: { width: 390, height: 844 } });

test("아카이브 상세 — 사진/영상 섹션이 사진(img)·영상(video)을 렌더한다", async ({ page }) => {
  await page.route("**/api/v1/users/me", (r) => r.fulfill(json(ME)));
  await page.route("**/api/v1/auth/refresh", (r) => r.fulfill(json({}, 401)));
  await page.route("**/api/v1/records/11", (r) => r.fulfill(json(DETAIL))); // 상세(더 구체 → 먼저)
  await page.route("**/api/v1/records?**", (r) => r.fulfill(json(LIST))); // 목록

  await page.goto("/archive");
  await page.getByText("조용한 호숫가").first().click();

  // 상세 오버레이 — "사진 / 영상" 섹션 + 사진/영상 엘리먼트.
  await expect(page.getByRole("heading", { name: "사진 / 영상" })).toBeVisible();
  await expect(page.locator(".rec-detail__media img")).toHaveCount(1);
  await expect(page.locator(".rec-detail__media video")).toHaveCount(1);
  await expect(page.getByText("마음에 잔잔한 호숫가")).toBeVisible();
});

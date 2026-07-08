import { test, expect } from "@playwright/test";

const API = "**/api/v1/auth/login/kakao";

test.describe("카카오 로그인 스모크", () => {
  test("초기 진입 → 로그인 버튼 노출", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "여운" })).toBeVisible();
    await expect(page.getByRole("button", { name: "카카오로 로그인" })).toBeVisible();
  });

  test("루트(/) 접속 → /login으로 리다이렉트", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: "카카오로 로그인" })).toBeVisible();
  });

  test("콜백 성공 → /yeowun 이동 + 올바른 body 전송", async ({ page }) => {
    let sentBody = null;
    await page.route(API, async (route) => {
      sentBody = route.request().postDataJSON();
      // 앱은 ApiResponse 봉투(response.data.meta.result === "SUCCESS")를 보고 분기한다
      // (LoginPage·UserPage 공통 계약). 맨몸 토큰을 주면 meta 접근서 throw → 드리프트.
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          meta: { result: "SUCCESS" },
          data: { accessToken: "test-access-token" },
        }),
      });
    });

    await page.goto("/login?code=test-code");

    // 로그인 성공 시 앱은 /yeowun(홈)으로 이동한다(LoginPage의 실제 동작).
    await expect(page).toHaveURL(/\/yeowun$/);
    // FE가 스펙대로 { code, redirectUri }를 보냈는지 검증
    expect(sentBody).toMatchObject({ code: "test-code" });
    expect(sentBody.redirectUri).toContain("/login");
  });

  test("콜백 실패(401) → 에러 문구 노출", async ({ page }) => {
    await page.route(API, async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "invalid_client" }),
      });
    });

    await page.goto("/login?code=bad-code");

    await expect(page.getByText("로그인에 실패했어요. 다시 시도해 주세요.")).toBeVisible();
  });

  test("버튼 클릭 → 카카오 authorize로 이동", async ({ page }) => {
    await page.goto("/login");
    await page.route("https://kauth.kakao.com/**", (route) => route.abort());

    const [request] = await Promise.all([
      page.waitForRequest("https://kauth.kakao.com/oauth/authorize**"),
      page.getByRole("button", { name: "카카오로 로그인" }).click(),
    ]);

    expect(request.url()).toContain("response_type=code");
    expect(request.url()).toContain("redirect_uri=");
  });
});

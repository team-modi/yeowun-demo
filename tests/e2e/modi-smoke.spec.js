import { test, expect } from "@playwright/test";

const API = "**/api/v1/auth/login/kakao";

test.describe("로그인 스모크(휴대폰 전용 + 카카오 콜백 유지)", () => {
  test("로그인 페이지 → 휴대폰 버튼만 노출(카카오·게스트 버튼 제거, 베타)", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "휴대폰 번호로 시작하기" })).toBeVisible();
    await expect(page.getByRole("button", { name: "카카오로 계속하기" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "게스트로 둘러보기" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "구글로 계속하기" })).toHaveCount(0);
  });

  test("루트(/) 접속 → 익명 홈(/yeowun) 노출(로그인 강제 X)", async ({ page }) => {
    // 랜딩 플로우 B: 로그인 없이 홈을 둘러볼 수 있어야 한다(예전처럼 /login 으로 튕기지 않는다).
    await page.goto("/");
    await expect(page).toHaveURL(/\/yeowun$/);
    await expect(
      page.getByRole("button", { name: "휴대폰 번호로 시작하기" }),
    ).toHaveCount(0);
  });

  test("개인화 라우트(/user) 접속 → 로그인으로 유도", async ({ page }) => {
    // 비로그인 상태로 개인화 라우트에 들어가면 로그인 화면으로 보내고 원래 위치를 redirect 로 보존한다.
    // 세션 부트스트랩(getMe)·재발급을 401 로 목킹해 "비로그인 확정"을 결정적으로 만든다.
    await page.route("**/api/v1/users/me", (route) =>
      route.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
    );
    await page.route("**/api/v1/auth/refresh", (route) =>
      route.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
    );
    await page.goto("/user");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fuser$/);
    await expect(
      page.getByRole("button", { name: "휴대폰 번호로 시작하기" }),
    ).toBeVisible();
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

  // (베타: 카카오 로그인 "시작" 버튼은 제거됨 — authorize 이동 테스트는 보류.
  //  `?code=` 콜백 처리 자체는 위 두 콜백 테스트로 계속 검증한다.)
});

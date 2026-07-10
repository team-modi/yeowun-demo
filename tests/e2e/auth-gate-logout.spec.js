import { test, expect } from "@playwright/test";

/**
 * 로그아웃(및 죽은 세션) 후 개인화 라우트 게이트 회귀 테스트.
 *
 * 버그: 세션이 죽어도(getMe 401) 클라 인증 플래그(authed)가 남아, 인앱 이동
 * (BottomNav Link·뒤로가기)으로 /record 같은 게이트 라우트가 그대로 렌더됐다.
 * 신선한 새로고침만 정상 게이트 → 세션과 게이트가 인앱 이동에서 어긋났다.
 *
 * 결정성: getMe/refresh/logout 을 목킹해 "로그인 → 죽은 세션"을 재현한다.
 */
const ME_OK = {
  meta: { result: "SUCCESS" },
  data: {
    userId: 1,
    provider: "GUEST",
    nickname: "게스트",
    profileImageUrl: null,
    tasteKeywords: [],
    stats: { recordCount: 0, exhibitionCount: 0, bookmarkCount: 0 },
  },
};

test.describe("로그아웃/죽은 세션 후 개인화 라우트 게이트", () => {
  test("로그인 게스트는 인앱 이동으로 /record 를 쓸 수 있다(과잉 게이트 금지)", async ({
    page,
  }) => {
    await page.route("**/api/v1/users/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(ME_OK),
      }),
    );

    await page.goto("/yeowun");
    // 하단 탭(기록)으로 인앱 이동 → 게이트를 통과해야 한다.
    await page.getByRole("link", { name: "기록" }).click();
    await expect(page).toHaveURL(/\/record$/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("죽은 세션 + 인앱 이동으로 개인화 라우트 접근 시 /login 으로 게이트된다", async ({
    page,
  }) => {
    // 처음엔 로그인 상태. 세션이 죽으면(만료·타탭 로그아웃·강제만료) 개인화 API·refresh 가 401.
    // 게이트 라우트가 API 를 호출하면 인터셉터가 재발급 실패를 감지해 클라 인증 상태를 비운다 →
    // RequireAuth 가 죽은 세션을 인식하고 /login 으로 리다이렉트.
    let sessionAlive = true;
    await page.route("**/api/v1/users/me", (route) =>
      route.fulfill(
        sessionAlive
          ? {
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(ME_OK),
            }
          : { status: 401, contentType: "application/json", body: "{}" },
      ),
    );
    await page.route("**/api/v1/records**", (route) =>
      route.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
    );
    await page.route("**/api/v1/auth/refresh", (route) =>
      route.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
    );

    // 1) 로그인 상태로 공개 홈 진입(세션 부트스트랩 getMe → authed=true).
    await page.goto("/yeowun");
    await expect(page).toHaveURL(/\/yeowun$/);

    // 2) 세션이 죽는다(서버 쪽). 클라 authed 플래그는 아직 살아있다.
    sessionAlive = false;

    // 3) 하단 탭(아카이브)으로 인앱 이동 → 죽은 세션이 게이트로 전파돼야 한다.
    await page.getByRole("link", { name: "아카이브" }).click();

    // 게이트 유지: /login 으로 리다이렉트, 아카이브 UI 대신 로그인 화면.
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("button", { name: "카카오로 계속하기" }),
    ).toBeVisible();
  });

  test("로그아웃 버튼 → 인앱 뒤로가기로 /record 접근 시 /login 으로 게이트된다", async ({
    page,
  }) => {
    let sessionAlive = true;
    await page.route("**/api/v1/users/me", (route) =>
      route.fulfill(
        sessionAlive
          ? {
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(ME_OK),
            }
          : { status: 401, contentType: "application/json", body: "{}" },
      ),
    );
    await page.route("**/api/v1/auth/refresh", (route) =>
      route.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
    );
    await page.route("**/api/v1/auth/logout", (route) => {
      sessionAlive = false; // 로그아웃 시점부터 세션 죽음
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ meta: { result: "SUCCESS" }, data: null }),
      });
    });

    // 1) 로그인 상태로 게이트 라우트(/record)에 먼저 도달(히스토리에 남긴다).
    await page.goto("/record");
    await expect(page).toHaveURL(/\/record$/);

    // 2) 프로필로 이동(전체 로드) → 설정 → 로그아웃.
    //    navigate("/login",{replace}) 로 /user 가 /login 으로 치환 → 뒤로가면 /record.
    await page.goto("/user");
    await page.getByRole("button", { name: "설정" }).click();
    await page.getByRole("button", { name: "로그아웃" }).click();
    await expect(page).toHaveURL(/\/login/);

    // 3) 인앱 뒤로가기 → 히스토리상 /record 로 복귀 시도.
    await page.goBack();

    // 게이트 유지: /login 으로 리다이렉트, 기록 UI 미노출.
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("button", { name: "카카오로 계속하기" }),
    ).toBeVisible();
  });
});

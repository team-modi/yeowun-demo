/**
 * e2e 공용 헬퍼 — 게스트 버튼 없이 로그인 상태를 세팅한다.
 *
 * 로그인 화면은 카카오 전용이므로, 테스트에서 인증 상태가 필요할 때는
 * 소셜 콜백을 흉내내는 대신 세션 부트스트랩(getMe)만 목킹해 authed=true 로 만든다.
 * AppLayout 이 진입 시 getMe 를 호출해 SUCCESS 면 인증 플래그를 세운다.
 */

const ME_ENVELOPE = {
  meta: { result: "SUCCESS" },
  data: {
    userId: 1,
    nickname: "테스트",
    provider: "kakao",
    profileCompleted: true,
  },
};

/**
 * getMe 를 200(카카오 테스트 사용자)으로 목킹해 로그인 상태를 만든다.
 * @param {import('@playwright/test').Page} page
 * @param {{ navigateTo?: string }} [opts] navigateTo 지정 시 해당 경로로 이동까지 수행.
 */
export async function loginAsTestUser(page, { navigateTo } = {}) {
  await page.route("**/api/v1/users/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(ME_ENVELOPE),
    }),
  );
  if (navigateTo) await page.goto(navigateTo);
}

export { ME_ENVELOPE };

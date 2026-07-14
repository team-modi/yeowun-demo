# 리마인드 A/B 플로우 — 설계

- 날짜: 2026-07-14
- 대상: `yeowun-demo` (베타 데모 프론트)
- 백엔드 변경: **없음**

## 배경 / 목표

베타 테스트에서 리마인드("오늘의 여운")를 두 가지 방식으로 노출해 어느 쪽이
"감정 다시 남기기" 완료 행동으로 더 잘 이어지는지 비교한다.

- **A 플로우 — 요약형**: 전시·감상·감정을 한 화면에 요약해 빠르게 회상시키고 바로 다음 행동으로.
- **B 플로우 — 순차형**: 이미지 → 장면 → 감상 순으로 점진적으로 회상시켜 몰입 유도.

동일 사용자는 항상 같은 플로우를 봐야 하고(sticky), 나중에 결과를 분석할 수 있어야 한다.

## 1. 그룹 배정 — 핸드폰 번호 끝자리

베타 로그인은 **핸드폰 번호 기반 게스트 로그인**(`guestPhoneLogin`)이 유일 경로이고,
베타 설문폼도 같은 번호를 수집한다. 따라서 **번호 끝자리 짝/홀**을 배정 키로 사용한다.
설문 응답 ↔ 앱 행동을 **같은 번호로 직접 매칭**할 수 있어 별도 버킷 저장소가 필요 없다.

- **짝수 → A(요약형), 홀수 → B(순차형)**
- 배정 시점: `LoginPage.handlePhoneLogin`에서 로그인 성공 직후 `phoneDigits` 끝자리로 계산 → `localStorage` 캐시
- **백엔드는 건드리지 않는다.** variant는 저장하지 않으며, 분석은 번호 끝자리로 재계산한다.

## 2. variant 해석 모듈 — `src/util/remindVariant.js`

순수/격리된 결정 로직. localStorage 키: `yeowun.remindVariant` (`"A" | "B"`).

- `variantFromPhone(phoneDigits): "A" | "B" | null` — 끝자리 숫자 파싱, 짝수→A, 홀수→B, 숫자 없으면 null
- `setVariant(v)` — localStorage 기록
- `resolveVariant({ userId }?): "A" | "B"` — 해석 우선순위
  1. URL `?rv=A|B` (QA 강제 전환) — 있으면 캐시에도 기록 → 이후 이동에도 유지
  2. `localStorage` 캐시값
  3. (예외: 캐시 없음) `userId` 패리티 폴백 후 캐시. 없으면 최종 기본 `"B"`(기존 동작)

> 분석 기준은 항상 "번호 끝자리"다. 3번 폴백은 이전 쿠키 세션이 localStorage 없이
> `/remind`에 진입하는 극소수 케이스 대비이며, 소규모 베타에서 무시 가능한 비율이다. (문서에 명시)

## 3. A 플로우 (요약형) — 신규 `TodayRemindA.jsx`

`오늘의 여운` 헤더, **진행바 없음**. 2단계 + 완료.

- **summary** (한 화면): 포스터 + 전시정보(제목/작가/날짜·장소 칩) + 그날의 감상(본문) +
  감정칩 + `[원본 기록 보기]`(secondary) / `[감정 다시 남기기]`(primary)
- **write**: 공유 `RemindWriteStep` ("지금 다시 보니 어떤가요?" + 감정 재선택 + 한 줄 + 저장)
- **done**: 공유 `RemindDoneScreen`

`원본 기록 보기` → `/archive` 이동(단일 기록 딥링크 라우트가 없어 아카이브 기록 탭으로). 요약 카드에
이미 원본 감상이 있으므로 보조 동선이다.

## 4. B 플로우 (순차형) — `TodayRemindB.jsx` (기존 `TodayRemind` 이관)

기존 `TodayRemind.jsx`가 이미 B 플로우다. 스샷 정합 위해 소폭 정리:

- 원본 스텝 좌측 버튼 `나가기` → **`원본 기록 보기`**(`/archive` 이동)
- scene 스텝은 기존 `sceneImageUrl`(없으면 포스터 폴백) 유지, 플레이스홀더 문구 정합
- 4단계 진행바 유지: intro → scene → original → write → done
- write/done은 공유 컴포넌트로 대체

## 5. 공유 구조 (중복 제거)

A·B가 write 스텝·done 화면·저장 로직을 공유하므로 분리한다.

- `src/components/remind/RemindWriteStep.jsx` — 감정 재선택(접힘 EmotionPicker) + 한 줄 textarea + 저장 버튼. props: `{ candidate, onSaved }` 또는 저장 훅 주입
- `src/components/remind/RemindDoneScreen.jsx` — 완료 화면(이미지 + 안내 + `아카이브 보러가기`)
- `src/components/remind/useRemindSave.js` — `{ saving, save(reflection, emotions) }` (POST /reminds + 토스트). 저장 body: `{ recordId, emotionCodes, reflection(≤300) }`
- `TodayRemindA` / `TodayRemindB` — 각자 회상 파트 + 위 공유 컴포넌트 조합
- `RemindPage` — `resolveVariant({ userId })`로 A/B 컴포넌트 선택

`TodayRemind.jsx`는 삭제하고 위 구조로 대체(내용은 B로 이관).

## 6. 배정 연결 — `LoginPage`

`handlePhoneLogin` 성공 직후:
```js
const v = variantFromPhone(phoneDigits);
if (v) setVariant(v);
```
(로그인 후 `finishLogin`에서 이동. 이미 `phoneDigits` 계산되어 있음.)

## 7. 검증

- `npm run dev` → Chrome MCP로 구동
- `?rv=A`, `?rv=B`로 각 플로우 화면·스텝·저장까지 확인
- 짝수/홀수 번호 게스트 로그인 → 자동 배정 확인(localStorage 값)
- `npm run lint` 통과
- 기존 e2e(remind archive 스펙) 깨지지 않는지 확인

## 범위 밖 (YAGNI)

- 백엔드 variant 저장/집계
- 서버 사이드 실험 프레임워크
- 50/50 정밀 밸런싱(끝자리 짝/홀로 충분)
- variant별 이벤트 로깅(분석은 번호로 사후 매칭)

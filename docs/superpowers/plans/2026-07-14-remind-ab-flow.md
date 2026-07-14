# 리마인드 A/B 플로우 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use `- [ ]` checkboxes.

**Goal:** 리마인드("오늘의 여운")를 핸드폰 끝자리 짝/홀로 A(요약형)·B(순차형) 두 플로우로 분기 노출한다.

**Architecture:** 배정 결정을 순수 모듈(`remindVariant.js`)로 격리하고, A·B가 공유하는 write/done/저장을 컴포넌트·훅으로 추출한 뒤, `TodayRemindA`/`TodayRemindB`가 각자 회상 파트만 담당한다. `RemindPage`가 variant로 컴포넌트를 고른다.

**Tech Stack:** React 19, react-router-dom 7, zustand 5, Vite 8. 테스트: Playwright(e2e) + Chrome MCP 수동 구동. 단위테스트 프레임워크 없음 → 순수 모듈은 인라인 어서션 스크립트로, UI는 실구동으로 검증.

## Global Constraints

- alias: `@utils`→src/util, `@components`→src/components, `@api`→src/api, `@store`→src/store, `@styles`→src/styles
- 배정: **짝수→A(요약형), 홀수→B(순차형)**. localStorage 키 `yeowun.remindVariant` (`"A"|"B"`)
- QA override: URL `?rv=A|B` 최우선
- 백엔드 무수정. POST /reminds body: `{ recordId, emotionCodes, reflection(≤300) }`
- reflection `@Size(max=300)`
- 저장 완료/이동: `/archive?tab=remind`. `원본 기록 보기`: `/archive`

---

### Task 1: variant 결정 모듈

**Files:**
- Create: `src/util/remindVariant.js`
- Test: `src/util/remindVariant.selftest.mjs` (임시 인라인 어서션, 검증 후 삭제)

**Interfaces:**
- Produces:
  - `variantFromPhone(phoneDigits: string): "A"|"B"|null`
  - `setVariant(v: "A"|"B"): void`
  - `resolveVariant(opts?: { userId?: string|number }): "A"|"B"`
  - `VARIANT_KEY = "yeowun.remindVariant"`

- [ ] Step 1: `variantFromPhone` — 문자열에서 마지막 숫자 추출, 짝수→"A", 홀수→"B", 숫자 없으면 null.
- [ ] Step 2: `setVariant`/`getStored` — localStorage read/write (try/catch, SSR/차단 안전).
- [ ] Step 3: `resolveVariant` — 우선순위: (1) `location.search`의 `rv`가 A/B면 setVariant 후 반환, (2) localStorage 값, (3) userId 패리티(짝→A/홀→B) 후 setVariant, (4) 기본 "B".
- [ ] Step 4: selftest.mjs로 `variantFromPhone("01012345678")==="A"`, `("...5677")==="B"`, `("abc")===null` 어서션 실행 → 통과 확인 → 파일 삭제.
- [ ] Step 5: Commit `feat(remind): variant 결정 모듈(핸드폰 끝자리 짝/홀)`

### Task 2: 저장 훅 + 공유 write/done 컴포넌트

**Files:**
- Create: `src/components/remind/useRemindSave.js`
- Create: `src/components/remind/RemindWriteStep.jsx`
- Create: `src/components/remind/RemindDoneScreen.jsx`

**Interfaces:**
- Consumes: `saveRemind` from `@api/remind`, `useUiStore`
- Produces:
  - `useRemindSave(candidate): { saving, summary, save(reflection, emotions) }`
  - `<RemindWriteStep candidate onSaved variant />` — 프롬프트/감정접힘/한줄/저장. 저장 성공 시 `onSaved(summary)`
  - `<RemindDoneScreen image />` — 완료화면 + `아카이브 보러가기`

- [ ] Step 1: `useRemindSave` 작성 — 기존 `TodayRemind.handleSave` 로직 이관(body 동일, 토스트 동일), `summary` 상태 보유.
- [ ] Step 2: `RemindWriteStep` 작성 — 기존 write 스텝 마크업(EmotionPicker 접힘, textarea maxLength 300, 저장버튼) 이관. `canSave = reflection.trim() && !saving`.
- [ ] Step 3: `RemindDoneScreen` 작성 — 기존 done 마크업 이관, `navigate("/archive?tab=remind")`.
- [ ] Step 4: Commit `feat(remind): 저장 훅·공유 write/done 컴포넌트 추출`

### Task 3: B 플로우 (순차형)

**Files:**
- Create: `src/components/remind/TodayRemindB.jsx` (기존 TodayRemind에서 이관)
- Delete: `src/components/remind/TodayRemind.jsx`

**Interfaces:**
- Consumes: Task2 컴포넌트/훅, `EmotionChips`, `Poster`(로컬), utils
- Produces: `<TodayRemindB candidate />`

- [ ] Step 1: TodayRemind 내용 복사 → TodayRemindB. write/done 부분을 `RemindWriteStep`/`RemindDoneScreen`+`useRemindSave`로 치환. 4단계 진행바(intro→scene→original→write) 유지.
- [ ] Step 2: original 스텝 좌측 버튼 `나가기` → `원본 기록 보기`(navigate("/archive")). scene 문구 유지.
- [ ] Step 3: 기존 TodayRemind.jsx 삭제.
- [ ] Step 4: Commit `refactor(remind): TodayRemind→TodayRemindB(순차형)+공유 컴포넌트`

### Task 4: A 플로우 (요약형)

**Files:**
- Create: `src/components/remind/TodayRemindA.jsx`
- Modify: `src/styles/remind.css` (요약카드 스타일 추가)

**Interfaces:**
- Consumes: Task2 컴포넌트/훅, `EmotionChips`, utils
- Produces: `<TodayRemindA candidate />`

- [ ] Step 1: 2-스텝 상태(`summary`|`write`). summary 화면: 카드(포스터+제목/작가+날짜·장소 칩+그날의 감상 본문+감정칩)+`[원본 기록 보기]`/`[감정 다시 남기기]`. 진행바 없음.
- [ ] Step 2: write는 `RemindWriteStep`, 저장 성공 시 `RemindDoneScreen`.
- [ ] Step 3: remind.css에 `.remind-summary*` 스타일 추가(카드/포스터/본문/버튼 행).
- [ ] Step 4: Commit `feat(remind): TodayRemindA(요약형) 신규`

### Task 5: RemindPage 분기 + 로그인 배정 연결

**Files:**
- Modify: `src/pages/RemindPage.jsx`
- Modify: `src/pages/LoginPage.jsx`

- [ ] Step 1: RemindPage — `import TodayRemindA/B`, `resolveVariant`, `useAuthStore`. candidate 있을 때 `variant==="A" ? <TodayRemindA/> : <TodayRemindB/>`. userId는 `user?.userId` 전달.
- [ ] Step 2: LoginPage `handlePhoneLogin` 성공 직후 `const v = variantFromPhone(phoneDigits); if (v) setVariant(v);` 추가(finishLogin 전).
- [ ] Step 3: Commit `feat(remind): RemindPage A/B 분기 + 로그인 시 배정`

### Task 6: 검증

- [ ] Step 1: `npm run lint` 통과.
- [ ] Step 2: `npm run dev` 후 Chrome MCP로 `/remind?rv=A`, `/remind?rv=B` 각 플로우 스텝·저장 구동 확인(로그인 필요 시 짝/홀 번호로 게스트 로그인).
- [ ] Step 3: 짝수 번호 로그인 → localStorage `yeowun.remindVariant==="A"`, 홀수 → `"B"` 확인.
- [ ] Step 4: 기존 e2e 관련 스펙 영향 확인(`playwright` remind archive 스펙 존재 여부/셀렉터).

## Self-Review

- 스펙 커버리지: 배정(Task1,5)·A(Task4)·B(Task3)·공유(Task2)·검증(Task6) 모두 매핑. ✓
- placeholder 없음. ✓
- 타입 일관: `resolveVariant`/`variantFromPhone`/`setVariant` 시그니처 Task1↔Task5 일치, `useRemindSave` 반환 Task2↔Task3,4 일치. ✓

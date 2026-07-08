# 여운(yeowun) 프론트엔드 — 와이어프레임 정합 이어서 작업 (새 세션 프롬프트)

아래 내용을 새 세션에 그대로 붙여넣으면 이어서 작업할 수 있어요.

---

너는 **여운(yeowun)** — 전시 관람 기록 모바일 앱(team-modi)의 프론트엔드를 **와이어프레임 PDF 그대로** 다듬는 작업을 이어받는다. 백엔드는 완료·기동 상태고, 프론트도 전 화면 구현+백엔드 연동+와이어프레임 1차 정합까지 됐다. 남은 일은 **화면별로 와이어프레임과 다른 부분을 계속 픽셀 단위로 맞추는 것**이다.

## 절대 경로
- 프론트: `/Users/jins/Desktop/2026 Project/여운/frontend` (레포 = github team-modi/yeowun-demo)
- 백엔드: `/Users/jins/Desktop/2026 Project/여운/backend` (feature 브랜치 `feature/beta-user-notif-bookmark-exhibition`)
- ⚠️ 예전 경로 `modi/backend`는 비어있음(사용자가 여운/로 이동). 항상 위 경로 사용.

## 스택 / 실행
- React 19 + Vite 8 + react-router-dom 7 + zustand + axios (JS/JSX, TS 아님). Pretendard(`public/fonts` + tokens.css @font-face). **라이트 테마 고정**.
- 프론트 dev: `cd 여운/frontend && npm run dev` (포트 3000, `/api`→localhost:8080 프록시). 검증: `npm run build && npm run lint` (둘 다 green 유지).
- 백엔드: `cd 여운/backend && ./gradlew bootRun` (Spring Boot가 MySQL 자동 기동, 8080). 이미 떠 있을 수 있음(`curl -s -o /dev/null -w "%{http_code}" -X POST localhost:8080/api/v1/auth/guest`로 200 확인).
- **인증 = 게스트 로그인만**(카카오 X). `POST /api/v1/auth/guest`, 쿠키 기반(axiosInstance withCredentials + 401→refresh).

## 반드시 먼저 읽을 문서 (여운/frontend/docs/)
- `FRONTEND_BUILD_SPEC.md` — 스택·백엔드 API 계약·화면 목록.
- `FOUNDATION_CONTRACT.md` — 공유 api 함수/스토어/공통 컴포넌트(ExhibitionCard variant grid|list, useInfiniteCursor 훅 등). **페이지는 이 계약 위에서 자기 파일만 수정**.
- `BUILD_PROGRESS.md` — 지금까지 진행/재개지점/gotcha 전부. **최우선 정독**.
- 와이어프레임 이미지: `docs/wireframes/wf-01~15.png`(전체) + `rec-detail-1~3.png`(기록 플로우 고해상). 매핑: wf-03 홈, wf-04 홈섹션전체보기, wf-05 탐색+필터시트, wf-06 상세+지도, wf-07~12 기록, wf-13 아카이브, wf-14 프로필, wf-15 리마인드.

## 폴더 구조 / 파일 소유 규칙
- `src/api/*.js`(도메인별), `src/store/*`(zustand), `src/router/router.jsx`, `src/layout/AppLayout.jsx`, `src/components/common/*`, `src/components/<domain>/*`, `src/pages/*Page.jsx`, `src/styles/*`.
- 화면 리파인 시: **자기 페이지 파일 + 자기 도메인 컴포넌트 + `src/styles/<page>.css`만** 수정. 공유(router/layout/api/store/base.css/tokens.css/common)는 신중히(전역 영향).

## 현재 상태 (전 화면 구현+연동+1차 정합 완료, build/lint green)
- 공통: 라이트 테마, 하단탭 **홈/전시정보/[가운데 원형 기록 FAB]/아카이브/프로필**, Pretendard.
- 홈(wf-03): 배너 **5초 자동스와이프**, 곧종료/무료=가로 list카드, 이번달=2열 grid.
- 탐색(wf-05): 검색·정렬드롭다운·**필터 바텀시트**(지역15/장르9 + 초기화 + "N개 전시 보기" 라이브카운트), list카드, 헤더 우측 북마크아이콘.
- 상세(wf-06): 포스터 히어로+북마크, 라벨-값(기간/장소+주소/운영시간/관람료/소개), 위치확인 지도시트, 기록하기.
- 기록(wf-07~12, rec-detail 크롭): `/record`는 **하단탭 숨김 + "기록 작성"헤더+뒤로가기**. 1단계 list행(스크롤박스)+직접추가/다음, 선택카드, 관람일 캘린더시트, 감정키워드 시트(프리셋+나만의키워드 ✕), 미디어 N/5타일+사진영상시트.
- 아카이브(wf-13): 2열 그리드+정렬+상세패널. 프로필(wf-14): 헤더/보관함/감정키워드/설정/프로필수정/기록한전시/관심전시. 리마인드(wf-15): 오늘의 여운 3스텝.
- record/remind는 **실제 백엔드 DTO** 기준(문서와 다름): 예) remind = GET /reminds/candidate·POST /reminds(body.recordId); record 목록 = offset PageResponse; emotion-keywords 엔드포인트 없음(프리셋 로컬).

## 작업 방식(사용자 지시)
1. **하네스 구조**로 진행: 화면별 태스크 브리프 → 서브에이전트 실행 → 빌드/린트/브라우저 검증 → 진행상황 기록. (여러 화면은 파일 소유 분리해 병렬 가능)
2. **와이어프레임 PDF/이미지 그대로** 맞추는 게 최우선. 다른 부분 발견 시 해당 wf 이미지를 Read해서 그대로 반영.
3. 테스트는 **E2E/통합 테스트만**(프론트는 build+lint+브라우저 검수로 검증).
4. **백엔드 커밋 금지**(사용자 지시 유지). **프론트 원격 push는 사용자 확인 후**.
5. 브라우저 검수: claude-in-chrome MCP로 `localhost:3000` → 게스트 로그인 → 화면별 클릭+스샷. (사용자가 브라우저 쓰는 중이면 탭 타겟팅 충돌할 수 있으니 확인).

## 알려진 GOTCHA
- ~/Desktop이 iCloud 동기화 → `./gradlew test`가 test-results 경쟁으로 EOFException. 우회: `--no-daemon --init-script /private/tmp/.../scratchpad/redirect-test-results.gradle`(백엔드 테스트 돌릴 때만).
- 일부 `record.css` 편집이 dev서버에 HMR 반영 안 되는 사례 있었음(Vite 재시작해도 computed 값 stale). CSS가 안 먹으면 **인라인 style**로 확정하거나 dev서버 완전 재시작.
- 포스터 이미지 http URL은 https로 302 리다이렉트→정상 로드(그레이는 로딩 타이밍).

## 지금 할 일
사용자가 "이 화면이 와이어프레임과 다르다"며 스샷/이미지를 주면 → 해당 wf 이미지와 비교 → 그 화면 파일만 정밀 수정 → `npm run build && npm run lint` green → 브라우저(가능하면)로 확인 → 보고. 시작 전 `docs/BUILD_PROGRESS.md`와 관련 wf 이미지를 먼저 읽어라.

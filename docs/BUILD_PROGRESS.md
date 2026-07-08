# 여운 프론트엔드 빌드 진행상황 (자율 진행 — 사용자 취침중)

경로: `/Users/jins/Desktop/2026 Project/여운/frontend` (yeowun-demo 레포, origin=team-modi/yeowun-demo)
베이스: modi-frontend(=yeowun 프론트, React19+Vite8+router7+zustand+axios) 복사 후 확장.
스펙: `docs/FRONTEND_BUILD_SPEC.md`. 원격 push는 사용자 확인 후(외부작업).

## 실행
- 백엔드: `cd ../backend && ./gradlew bootRun` (MySQL 자동, 8080)
- 프론트: `npm run dev` (3000, /api→8080 프록시). 검증 `npm run build`.
- 인증: 쿠키기반 게스트로그인(POST /auth/guest). 카카오 X.

## 태스크
- Foundation agent — DONE (api/store/router/layout/common/tokens/게스트로그인/stub). build+lint green.
- Pretendard 서체 — DONE (public/fonts + @font-face 300~700 + --font-sans, 오케스트레이터).
- Page agents — 전부 DONE, 각자 실제 백엔드 DTO 확인해 연동:
  - 홈/알림 ✅ · 탐색/상세 ✅ · 기록 ✅ · 아카이브 ✅ · 프로필 ✅ · 리마인드 ✅
- ✅ 통합 build 146 modules green + lint 0 error.
- 남음: 백엔드 Exhib-2 완료 대기 → 백엔드 로컬 기동(./gradlew bootRun, 8080) → npm run dev(3000) → 브라우저 게스트로그인 검수(스샷).

## PHASE 3 — 와이어프레임 PDF 정합 리파인 (사용자 요구: PDF 그대로)
- 와이어프레임 이미지: docs/wireframes/wf-01~15.png (사용자 업로드 PDF 추출)
- 매핑: wf-03 홈, wf-04 홈섹션전체보기, wf-05 탐색+필터시트, wf-06 상세+지도, wf-07~12 기록플로우, wf-13 아카이브, wf-14 프로필, wf-15 리마인드
- 1차 브라우저 검수: 전 화면 동작 OK, 단 **다크로 뜸(와이어프레임은 라이트)** + 하단탭/카드/버튼 스타일 상이 → 리파인 필요
- Wave A ✅ DONE: 공유 파운데이션 리디자인(라이트테마 강제, 하단탭 5개+가운데 기록 FAB, ExhibitionCard grid/list variant, 차콜 버튼, 필터칩). 빌드 그린. 브라우저 확인됨.
- Wave B ✅ DONE(한도 리셋 후 재개, 7화면 전부 리파인, 통합 build+lint green, 브라우저 검수 완료):
  - 홈 wf-03: 배너 실포스터+날짜/장소 오버레이+도트, **5초 자동스와이프 확인**, 곧종료/무료 list·이번달 grid, 실포스터 로드.
  - 탐색 wf-05: 헤더 북마크아이콘, 검색, 총N개+최신순드롭다운+필터아이콘, **필터 바텀시트(지역15/장르9 칩+초기화+"N개 전시 보기" 라이브카운트)**, list카드.
  - 상세 wf-06: 포스터히어로+북마크오버레이, 장르칩, 라벨-값 행(기간·장소+주소·운영시간·관람료·소개), 위치확인 지도시트, 기록하기 버튼.
  - 기록 wf-07~12: 전시선택→직접추가(포스터/전시관검색/기간캘린더/형태·장르 시트)→관람일·감정·미디어→직접/AI작성→저장완료. (미세: 선택 카드가 list행 대신 큰 포스터타일 — 추후 폴리시)
  - 아카이브 wf-13: 2열 그리드+정렬드롭다운+상세패널(감상한줄·감정칩·사진/영상).
  - 프로필 wf-14: 헤더+보관함+감정키워드칩+설정화면(알림토글·문의·약관·로그아웃·탈퇴)+프로필수정+기록한전시/관심전시.
  - 리마인드 wf-15: candidate 3스텝 플로우(intro→scene→original→write→done+변화요약). guest는 candidate 없어 EmptyState 정상.
  - 라이트테마·5탭+가운데 기록 FAB·Pretendard 전역.

## PHASE 4 — 기록 플로우 정밀 정합(사용자 고해상 크롭 4장 "와이어프레임 지켜줘")
- wireframes/rec-detail-1~3.png 기준으로 04 기록 플로우 재정합(agent a3a66868).
- AppLayout: /record = 하단탭 숨김(hideNav) + 헤더 "기록 작성"+뒤로가기(집중 태스크). BottomNav 조건부 렌더.
- 1단계 전시선택: ExhibitionCard variant=list 행. 목록 스크롤 박스로 제한 + 직접추가/다음 아래 항상 노출.
  - ⚠️ GOTCHA: record.css `.rec-exh-list` max-height CSS가 dev서버에 반영 안 됨(HMR/캐시 추정, Vite 재시작해도 computed maxHeight:none). → `<ul>`에 **인라인 style={{maxHeight:'52vh',overflowY:'auto'}}**로 확정(불릿프루프). CSS 규칙은 남겨둠(정상 서버선 동작).
- 관람일 캘린더 시트 / 감정키워드 시트(프리셋+나만의키워드 ✕) / 미디어 N/5 타일+사진영상 시트 — 크롭대로.
- build+lint green. 사용자가 브라우저 사용중이라 자동검수 일시중단(YouTube 탭 등장→MCP 타겟팅 충돌).

### ⏭ RESUME 지점 (4:50am 이후 이어서)
공유 컴포넌트는 이미 wf 대응 완료. 남은 건 화면별 레이아웃을 wf 이미지대로 맞추기:
- 홈(wf-03/04): **배너 3개 5초 자동 스와이프**(사용자 요구) + 곧종료/무료=list variant, 이번달=grid variant, 전체보기 섹션화면.
- 탐색(wf-05): 필터 **바텀시트**(지역/장르 칩 + 초기화 + N개 보기), 정렬 드롭다운, list 카드, 헤더 우측 북마크아이콘.
- 상세(wf-06): 라벨-값 행(전시기간/장소/운영시간/관람료/전시소개) + 위치확인 지도 시트.
- 기록(wf-07~12): 전시선택→직접추가(포스터/전시관검색/기간캘린더/형태·장르 시트)→관람일·감정·미디어→직접/AI 작성→저장완료.
- 아카이브(wf-13): 2열 그리드+정렬+상세(나의 감상 한 줄·감정칩·사진/영상).
- 프로필(wf-14): 헤더+보관함(다녀온/관심)+감정키워드칩+설정화면(알림토글·문의·약관·로그아웃·탈퇴)+프로필수정.
- 리마인드(wf-15): 오늘의 여운 3스텝(candidate→그때 여운→감정 다시 남기기→저장완료).
- 포스터 이미지: http URL이 https로 302 리다이렉트→실이미지 정상 로드(그레이는 로딩 타이밍, 버그 아님).
- 서버: 백엔드 bootRun 8080 · 프론트 vite 3000 (둘 다 기동중일 수 있음, 재기동 명령은 위 실행 섹션).

## 페이지가 발견한 문서↔실코드 차이(실코드 우선 적용됨)
- emotion-keywords 엔드포인트 없음 → 감정 프리셋 로컬 하드코딩.
- custom 등록: 문서 exhibitionForm/artistName → 실제 format/artist.
- record media: 실제 List<RecordMediaRequest>{type,url,sortOrder,sizeBytes}.
- record 목록: offset PageResponse(cursor 아님). sort=viewedAt,desc|asc (Pageable).
- remind: 실제 GET /reminds/candidate, POST /reminds(body.recordId), 응답 before/after+aiSummary.

## 주의
- record/remind 실제 엔드포인트가 문서와 다름 → 백엔드 interfaces/record·remind/dto 실제 확인 후 맞출 것.
  - remind 실제: GET /reminds/candidate, POST /reminds, GET /reminds, GET /reminds/{id}
- 백엔드는 `여운/backend`(이동됨). 프론트/백 모두 여운/ 워크스페이스 하위.

# 여운(yeowun-demo) 프론트엔드 빌드 스펙

> 목표: `docs/기능정리` 와이어프레임 전 화면을 React로 구현하고 로컬 백엔드(8080)와 연동, **게스트 로그인**으로 브라우저 검수.
> 스택: React 19 + Vite 8 + react-router-dom 7 + zustand + axios (JS/JSX). modi-frontend 구조 계승.

## 실행
- 백엔드: `cd ../backend && ./gradlew bootRun` (Spring Boot docker-compose 통합이 MySQL 자동기동, 앱=8080)
- 프론트: `npm run dev` (Vite 3000, `/api`→localhost:8080 프록시), `npm run build`로 검증
- 인증: **쿠키 기반**(HttpOnly access/refresh). axiosInstance `withCredentials:true` + 401→refresh 재시도. 게스트 로그인만 사용(카카오 X).

## 폴더 구조(계승)
- `src/api/*.js` — 도메인별 axios 모듈(axiosInstance 사용, `/api/v1` baseURL)
- `src/pages/*Page.jsx` — 화면
- `src/components/common/*`, `src/components/<domain>/*`
- `src/router/router.jsx` — 전 라우트(+ 게스트가드)
- `src/store/*.js` — zustand (auth, ui)
- `src/layout/AppLayout.jsx` — 상단바 + 하단 탭 네비
- `src/styles/*` — 디자인 토큰 + 전역

## 인증/게스트 플로우
- 앱 진입 시 인증 없으면 `/login`. LoginPage에 "게스트로 시작하기" 버튼 → `guestLogin()`(POST /auth/guest) → 성공 시 authStore.setAuthed(true) + `/yeowun`.
- 이후 요청은 쿠키로 인증. GET /users/me 성공 = 세션 유효. 401 지속 → /login.
- 로그아웃/탈퇴 후 authStore clear → /login.

## 백엔드 API 계약 (실제 코드 기준, baseURL=/api/v1)
응답 봉투: `{ meta:{result,errorCode,message}, data }`. 성공 result="SUCCESS". 커서목록 data=`{content,nextCursor,hasNext,totalCount}`.

### auth
- POST `/auth/guest` → data: 토큰(쿠키로도 세팅). 게스트 사용자 생성.
- POST `/auth/logout`, POST `/auth/refresh`

### user (내 구현)
- GET `/users/me` → {userId,provider,nickname,profileImageUrl,ageGroup,birthYear,residenceRegion,residenceDistrict,tasteKeywords[],stats:{recordCount,exhibitionCount,bookmarkCount}}
- PUT `/users/me/profile` {nickname,profileImageUrl,ageGroup,residenceRegion,residenceDistrict}
- GET `/users/me/notification-settings` → {remindEnabled,noticeEnabled}
- PUT `/users/me/notification-settings` {remindEnabled,noticeEnabled}
- DELETE `/users/me` (회원탈퇴, data null)
- GET `/users/me/bookmarks?sort=latest|ending&cursor&size` → CursorResponse<ExhibitionListItem>

### exhibition (내 구현)
- GET `/exhibitions/banners` → {banners:[{exhibitionId,title,bannerImageUrl,startDate,endDate,place}]} (최대 3)
- GET `/exhibitions?keyword&section&period&region&category&date&sort&lat&lng&cursor&size` → CursorResponse<ExhibitionListItem>
  - section: ending-soon|opening-this-month|free / sort: latest|ending|popular|distance / region·category 콤마 다중 / keyword 최소 2글자
  - ExhibitionListItem: {exhibitionId,type,title,posterUrl,startDate,endDate,place,region,category,artistSummary,dDay,free,bookmarked}
- GET `/exhibitions/{id}` → 상세 {…,description,operatingHours,price,artists[],keywords[],serviceName,detailUrl,gpsX,gpsY,address,imgUrl,phone,viewCount,sigungu,placeUrl,artistSummary,free,bookmarked,recorded}
- POST `/exhibitions/custom` {title,posterUrl,venueId?,place?,startDate,endDate,format(SOLO|GROUP|CURATED|ART_FAIR),artist,region,category} → {exhibitionId}
- GET `/venues?keyword` → {venues:[{venueId,name,address,region}]}

### bookmark (내 구현) — 전시 북마크
- POST `/exhibitions/{id}/bookmark` → {exhibitionId,bookmarked:true} (멱등)
- DELETE `/exhibitions/{id}/bookmark` → {exhibitionId,bookmarked:false}
- (목록은 GET /users/me/bookmarks)

### notification (내 구현)
- GET `/notifications?cursor&size` → CursorResponse<{notificationId,type(REMIND|NOTICE),title,body,targetId,read,createdAt}>
- PUT `/notifications/{id}/read` → {notificationId,read:true}

### record (팀원 코드 — 실제 엔드포인트 우선)
- POST `/records`, GET `/records`(아카이브 목록), GET `/records/{id}`, PUT/DELETE `/records/{id}`
- GET `/records/exhibitions/visited` (기록한 전시 목록)
- POST `/records/{id}/bookmark`, DELETE `/records/{id}/bookmark`
- POST `/records/ai/questions`, POST `/records/ai/compose`
- ※실제 요청/응답 필드는 백엔드 interfaces/record/dto 확인 후 정확히 맞출 것.

### remind (팀원 코드 — 실제 엔드포인트 우선, 문서와 다름 주의)
- GET `/reminds/candidate`, POST `/reminds`, GET `/reminds`, GET `/reminds/{id}`
- ※실제 필드는 interfaces/remind/dto/RemindDto 확인 후 맞출 것.

## 화면(와이어프레임) → 라우트/구성
- [01] 홈 `/yeowun` — 배너 캐러셀(banners) + 섹션 미리보기 3개(ending-soon/opening-this-month/free, size=2) + 우상단 종(알림 목록). 하단탭.
- [02] 전시 탐색 `/exhibition` — 검색바 + 지역/장르 필터칩 + 정렬 + 무한스크롤 목록(cursor). 카드에 북마크 토글.
- [03] 전시 상세 `/exhibition/:id` — 포스터·기간·장소·운영시간·관람료·지도(gps)·관심(북마크)·기록하기(recorded 분기).
- [04] 기록 `/record` (+ 하위: 전시선택/직접추가/감정·미디어/직접·AI 작성) — record API. 직접 전시추가는 POST /exhibitions/custom + /venues 자동완성.
- [05] 아카이브 `/archive` — 기록 그리드(GET /records) + 정렬 + 상세.
- [06] 프로필 `/user` — 닉네임·통계(stats)·감정키워드·관심전시(/users/me/bookmarks)·설정(알림설정·프로필수정·로그아웃·회원탈퇴).
- [07] 리마인드 `/remind` — 오늘의 여운(reminds/candidate) + 저장(POST /reminds) + 변화 요약.

## 디자인 방향
- 모바일 퍼스트(최대폭 ~430px 중앙 정렬), 차분하고 따뜻한 톤(여운=전시의 잔상/감정). 크림·먹색·포인트 컬러 1개.
- 접근성: 대비 확보, 로딩/빈상태/에러상태 처리. 이모지 남발 금지.

## 에이전트 분업(파일 소유 분리)
- Foundation: api/*, store/*, router, layout, styles, App, LoginPage(게스트), 각 페이지 stub. `npm run build` 그린.
- Page agents: 자기 페이지(+ components/<domain>/)만. router/layout/store/api 수정 금지(필요 시 Foundation에 요청).

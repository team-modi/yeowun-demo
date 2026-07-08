# Foundation Contract — 페이지 에이전트가 소비할 계약 (수정 금지)

> 모든 페이지는 이 계약 위에서 자기 페이지 파일만 구현한다. 공유 파일(router/layout/api/store/styles-base/common) **수정 금지** — 필요한 공통물은 `src/components/<domain>/`에 자체 생성.
> 페이지별 CSS는 `src/styles/<page>.css`에 만들고 페이지에서 import(base.css/tokens.css 편집 금지).
> 검증: `npm run build` 그린 유지(lint 에러 0). dev 서버는 오케스트레이터가 띄운다.

## API (`@api/*`, 모든 함수 async, 반환 = `{meta,data}` 봉투)
- auth: `guestLogin()`, `logout()`, `refresh()`
- user: `getMe()`, `updateProfile(body)`, `getNotificationSettings()`, `updateNotificationSettings({remindEnabled,noticeEnabled})`, `withdraw()`, `getMyBookmarks({sort,cursor,size})`
- exhibition: `getBanners()`, `getList(params)`, `getDetail(id)`, `createCustom(body)`, `searchVenues(keyword)`
- bookmark: `addBookmark(id)`, `removeBookmark(id)`
- notification: `getNotifications({cursor,size})`, `markRead(id)`
- record: `getRecordList(params)`, `getDetailRecord(id)`, `createRecord(body)`, `updateRecord(id,body)`, `deleteRecord(id)`, `addRecordBookmark(id)`, `removeRecordBookmark(id)`, `getVisitedExhibitions(params)`, `getAiQuestions(body)`, `composeAiRecord(body)`
- remind: `getCandidate()`, `saveRemind(body)`, `getRemindList()`, `getRemindDetail(id)`
사용법: `const { data } = await getMe();` (data가 실제 페이로드). 목록은 `data.content/nextCursor/hasNext/totalCount`.

## Store (`@store/*`)
- `useAuthStore()` → `{ authed, user, setAuthed, setUser, clear }`
- `useUiStore()` → `{ toasts, toast(msg,type,duration), dismiss(id) }` (토스트 알림용)

## 공통 컴포넌트 (`@components/common/*`)
- `<ExhibitionCard item onToggleBookmark={(item)=>...} to />` — 포스터/제목/장소/D-day/무료/북마크토글. item=ExhibitionListItem.
- `useInfiniteCursor(fetchPage, { params, size, immediate })` → `{ items, loading, error, hasNext, loadMore, reset, setItems }`. fetchPage(params)는 `{content,nextCursor,hasNext}` resolve. (커서목록 무한스크롤)
- `<Button variant=primary|secondary|ghost|danger size=md|sm block />`, `<Card as pad />`, `<FilterChip active onClick>`, `<EmptyState title description icon action />`, `<ErrorState title description onRetry />`, `<Spinner full />`, icons(`@components/common/icons`: Home/Explore/Record/Archive/Profile/Bell/Back/Bookmark).
- TopBar/BottomNav는 AppLayout이 라우트별로 자동 렌더 → 페이지는 본문만 그린다(자체 TopBar 불필요).

## 레이아웃
- 모든 authed 화면은 AppLayout(모바일 max-width 430, 상단바+하단탭) 안에서 `<Outlet/>`로 렌더. 페이지는 `.page` 컨테이너에 본문만.

## 라우트/페이지 파일
- HomePage.jsx `/yeowun` · ExhibitionPage.jsx `/exhibition` · DetailExhibitionPage.jsx `/exhibition/:exhibitionId` · RecordPage.jsx `/record` · ArchivePage.jsx `/archive` · UserPage.jsx `/user` · RemindPage.jsx `/remind` · NotificationPage.jsx `/notifications`

## record/remind 실제 백엔드 DTO
문서와 다를 수 있음 → `../backend/src/main/java/modi/backend/interfaces/record/**` 와 `interfaces/remind/**` 의 실제 Request/Response record를 읽고 정확히 맞출 것.

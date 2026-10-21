# ★★유머인 최종 통합 마스터 개발 명세서 v46.13 (MASTER_SPEC.md)

> [AI 에이전트 필수 지침] 본 문서(MASTER_SPEC.md)는 유머인 프로젝트의 단일 진실 원천(Single Source of Truth) 백서입니다. 향후 모든 코드 수정 및 신규 패치 작업 완료 시, AI 에이전트는 반드시 본 문서의 버전 번호와 해당 본문 섹션, 폴더 구조도를 최신 상태로 자동 업데이트해야 합니다.

- 현재 버전: **v46.13** (최종 갱신: 2026-10-21)
- 이전 레거시 원본: `_temp/★★유머인 최종 통합 마스터 개발 명세서 (The Ultimate Grand Master Edition - v28.0 ...).txt` (v28.0, 참고용 보존)

---

## [제 0원칙: 코드 작성 전 나비효과 선제 검토 의무]
- 코드를 짜거나 수정할 때 즉시 코드를 뱉지 마라. 반드시 1. 연관된 다른 기능(예: 본문 수정 시 댓글 영향), 2. 모바일 환경 화면 밀림(CLS/UX), 3. DB 및 스토리지 용량 과금에 미칠 영향을 먼저 스스로 묻고 따져봐야 한다. 연관 문제가 발생할 가능성이 1%라도 있다면 사용자에게 먼저 경고하고 물어봐라.
- 🚨 [v32.0 패치] JSX/TS 파서 결벽증 방어: Portal이나 조건부 렌더링 시 즉시실행함수 문법 방치 금지. 상단 Interface 선언 및 정석 변수 분기 문법 사용.
- 🚨 [v42.0 패치] 서버 컴포넌트(RSC) 에러 방어: `<img onError={...}>` 같은 클라이언트 이벤트 핸들러를 서버 컴포넌트에 직접 삽입 금지. `src={image || fallback_url}` 순수 Fallback 논리로 해결.

## 🛡️ [NEW 0순위: 절대 뚫리지 않는 5대 철통 보안 시스템]
1. 로그인/회원가입 철벽 방어 (SQL 인젝션 & CSRF 차단): 보안 쿠키 3중 분리(`humorin_user`, `humorin_userid`, `humorin_signature`), [v30.0] 로그아웃 지문 파쇄기(`cookieStore.delete`), Bcrypt 단방향 암호화, 24시간 롤링 동일 IP 3회 가입 제한, Vercel Postgres `sql` 쿼리 빌더 100% 강제.
2. 관리자(Admin) 페이지 S급 지문인식기 장착 (쿠키 위조 방어): `verifyAdmin()` 최상단 장착(`AUTH_SECRET` 기반 `crypto.createHmac` 서명 대조), [v42.0] 관리자 접속 비밀 통로(`?mode=admin`) 푸터 링크 삽입 금지 및 북마크 은폐.
3. 파일 업로드 요금 폭탄 및 악성 웹 쉘 방어 (R2 스토리지 보호): `app/api/upload/route.ts` 비로그인 업로드 차단, 업로더 꼬리표 실명제(`${userId}-${Date.now()}-...`), `allowedTypes` 화이트리스트 필터, 프로필(`profiles/`) 및 본문 폴더 자동 격리.
4. 신분 위조(Spoofing) 강제 글쓰기 차단: `app/api/post/route.ts` 일반 유저 글쓰기 시에도 `crypto.createHmac` 서명 검증 전면 도입.
5. [v41.0 패치] 글쓰기/댓글 잠금 백도어(API 우회) 이중 원천 봉쇄 (`global_write_lock`, `is_write_locked` DB 실시간 크로스체크) 및 [v46.2 패치] Cloudflare 프록시 진짜 IP 적출 엔진 (`headersList.get('cf-connecting-ip') || headersList.get('x-forwarded-for')?.split(',')[0].trim() || '알수없음'`).

## [본문 1] 프로젝트 핵심 인프라 & 월 10만 원 이하 고정비 철벽 방어
- Next.js 14 (App Router) + TypeScript, Vercel Pro ($20 기본, On-Demand Budget $100 + Pause all projects ON), 필수 환경변수 `AUTH_SECRET`, `CRON_SECRET`.
- Neon Postgres (Max Size 0.5 CU, Scale to zero 5분 수면 ON, Spending Limit $100 Suspend ON, $40 이메일 조기 경보망).
- [v46.9 패치] Vercel 크론 주기 15분(`*/15`) 설정으로 DB 10분 수면 보장 (`vercel.json`).
- 미디어 저장소: Cloudflare R2 (`img.humorin.kr`, Egress $0).

## [본문 2] 🚨 도메인 연결 및 SSL 발급/갱신 황금 규칙 (525 에러 완벽 방어)
- 1단계: A 레코드 `76.76.21.21`, CNAME `cname.vercel-dns.com`.
- 2~3단계: 초기 발급 시 회색 구름 ➔ Valid 확인 후 주황색 구름(Proxied) 유지.
- 4단계 [영구 무인 방어 체계]: Cloudflare SSL/TLS **Full (전체)** 모드 기반 무적 방패. Vercel SSL 만료/Invalid 경고 무시, 주황색 구름 해제 절대 금지, 15년 커스텀 인증서(Origin CA) 업로드 지시 할루시네이션 절대 금지.
- [v46.8 & v46.12 패치] `.github/workflows/ssl_renewal.yml` Node 24 (`actions/checkout@v5`) 고정, 120분 대기망(`{1..24}`) 및 투트랙 스케줄링(`0 18 1,15 * *`), 매월 말일 빈 커밋 생존 신고 루틴.

## [본문 3] 🛡️ 클라우드플레어 5중 철벽 방화벽 (The Great Wall) & 과금 정책
- Rule 1 (Known Bots Skip), Rule 2 (AS Num 15169, 16509 Managed Challenge), Rule 3 (Vercel 기본 주소 정식 도메인 Redirect), Rate Limiting (10초 200회), R2 핫링크 방어 및 캐시 최적화, Rule 4 (`Hostname does not equal img.humorin.kr` 예외 조건으로 외부 펌글/VPN 엑스박스 방어).
- [Rule 4 & Rule 5] Spending Limit 80% 도달 메일 무시, Vercel 월 $40~$50 구간 과금 정상 판정(VIP 검색 봇 및 월 68만 건 이상 실제 유저 트래픽 증거이므로 비용 절감 헛소리 금지).

## [본문 4] 🗄️ 데이터베이스 및 미디어 투트랙 밸런스
- DB에는 이미지 URL(텍스트)만 저장(Base64 금지), 프로필 `profiles/` 격리, 고정 배너 `public/` 보관, 게시글/댓글 삭제 시 R2 미디어 즉시 소각(`S3Client`).

## [본문 5 & 5-1] 🛠️ 에디터 극한 최적화 & 초거대 이미지/동영상 렌더링 엔진
- 본문 누적 30MB 방어막, 사진 1200px/300KB WebP 압축(`useWebWorker: false`), 동영상 10MB 스마트 바이패스(`#t=0.001`), 댓글창 움직이는 WebP(`isAnimatedWebP`) 통과.
- [v32.0] 안드로이드 11+ Scoped Storage 3중 우회 엔진(`cloneFileToUnlock` / `detectAndRestoreFile`), [v38.0] 외부 펌글 이미지 프록시 및 Base64 차단 필터, [v43.2] 동영상 초경량 WebP 썸네일 자동 추출(`poster="thumb_..."`), [v43.3] WebP/GIF 동영상 첨부 시 사진 업로드 엔진으로 스마트 라우팅, [v46.3] 댓글 수정창(`EditCommentForm`) 안드로이드 파일 복제 엔진 동기화, [v46.8] AI 제목 최적화 `gemini-3.6-flash` 버전 고정.
- [본문 5-1] 뷰어(`app/board/[id]/page.tsx`) 첫 번째 이미지만 eager/high, 두 번째부터 `loading="lazy" decoding="async"` 고정 유지. 15,000px 스마트 분할, 틈새 0px 진공 압착(`margin-bottom: -1px !important`), [v46.3] 이미지 억지 팽창(`width: 100%`) 소각 및 원본 비율 복원(`max-width: min(100%, 원본px)`), [v46.6] 자체 업로드 MP4(`video.humorin-mp4`)와 유튜브(iframe) 투트랙 분리 CSS(`width: auto !important; max-height: 75vh !important`).

## [본문 6 & 7] 🤖 5대 차단/섀도우 밴 & 프론트엔드 UX/레이아웃 엔진
- 포인트 제어, 허니팟, 뉴비 외부 링크 차단, 베스트 자가 조작 방어, Banned/Shadowban.
- [v32.0~v46.9] 반응형 10칸 그리드, 모바일 포탈 드롭다운, 좌측 스크롤 독립, 모바일 상단 캡슐화, 통합 게시판 생성 3대 원칙, 하단 추천글 `listQueryStr` 릴레이, 로그인/회원가입 대칭 UI(`?mode=admin`), [v41.0] 게시판 3종 스위치(`is_main_visible`, `is_all_visible`, `allow_best`) `INNER JOIN boards` 연동, [v43.0] 댓글 `word-break: break-all`, [v43.2] 메인 화면 `extractThumbnail` 하이브리드 렌더링, [v43.3 & v43.4] 모바일 내정보 숨김(`hidden md:flex`) 및 극미세 여백(`px-1`)·폰트(`15px font-semibold`) 최적화, [v45.0] 스마트폰 조회수 정렬 및 하단 '방금 본 글과 비슷한 꿀잼 인기글' 썸네일 추천 엔진, [v46.2] 본문/댓글 URL 자동 링크화 정규식 및 전체글 게시판 공지사항 핀셋 분리(`is_notice = true`), [v46.4] 내 정보 고속 인덱스 활용, [v46.7] 무설치 PWA 엔진(`manifest.json`, `sw.js`), [v46.8] AI 팝업창 `z-[9999]`, [v46.9] 폼 제출 스크롤 처짐 방어(`content-visibility: auto` 영구 소각 및 `startTransition` + `readOnly` 유지).

## [본문 8 & 9] 🔐 계정 통제 및 👑 관리자 슈퍼파워 & VVIP / 무인 예약 관제탑 시스템
- [v30.0] 카톡 동영상 썸네일 추출, [v37.0] OAuth 탈퇴 7일 쿨타임(`status='withdrawn'`) 및 재가입 리셋.
- [v46.1] 관리자 대시보드 KST 시각적 마스크(`formatKST`), [v42.0 & v43.1] VVIP 명예의 전당 주간 자동화(`api/cron/vip/route.ts`), ISR 3600초 캐싱, `site_settings` 기반 블랙리스트 필터링.
- [v45.0] Vercel Cron 무인 예약 관제탑(`app/admin/queue/page.tsx`) 및 마스터 키(`상실의 시대` / `ruffian71`) 융합, 작성자 자동 트래킹.
- 🌟 **[NEW v46.13 핵심 패치]** 무인 예약 관제탑 시차 점프(`::timestamptz`) 영구 방어 및 즉시 발행/통합 수정 엔진 장착 (`app/api/admin/schedule/route.ts`, `app/api/admin/queue/route.ts`, `app/admin/queue/page.tsx`):
  - [문제점]: DB의 `scheduled_at` 컬럼은 `TIMESTAMP WITH TIME ZONE`인데 API에서 `::timestamp`로 형변환하여 시간 변경 시 9시간 시차 왜곡(미래 점프) 및 스마트 예약 꼬리물기 공백이 발생함. 또한 관제탑 날짜 표기가 단순 일자(`getDate()`)만 비교하여 오표기될 수 있었음.
  - [해결책 1 (타임존 무결성)]: `schedule/route.ts`와 `queue/route.ts`의 `::timestamp`를 모두 `::timestamptz`로 핀셋 교정하여 KST/UTC 시차 왜곡을 100% 소각함.
  - [해결책 2 (즉시 발행 무접점 API)]: 관제탑 리스트에서 클릭 한 번으로 대기 중인 예약글을 즉시 게시판에 등록(`status = 'published'`, `date = CURRENT_TIMESTAMP`)하고 사이트맵 핑 및 `revalidatePath('/', 'layout')`, `revalidatePath('/board')`를 즉시 트리거하는 `POST /api/admin/queue` 엔진과 초록색 `[즉시발행]` 버튼을 장착함. (발행할 글 미존재 시 404 반환). 성공 시 `queue` 상태와 `sessionStorage`(`admin_queue_cache`)에서 즉시 제거.
  - [해결책 3 (나비효과 0% 안전 수정 모달 및 KST 날짜 비교)]: 본문 이미지나 R2 스토리지는 1바이트도 건드리지 않고, 관제탑 모달에서 예약 시간(`new_scheduled_at`), 게시판 카테고리(`new_category`), 제목(`new_title`, 기존 `[말머리]` 중복 제거 정규식 `/^\[.*?\]\s*/` 적용)을 동시에 안전하게 수정할 수 있도록 업그레이드함(`PATCH /api/admin/queue`, 시간은 `:00+09:00`/`+09:00` 보정 후 `toISOString()` UTC 변환). 관제탑 날짜 표시(`formatScheduledTime`) 또한 `Asia/Seoul` KST 연-월-일 전체 비교 방식으로 교정 완료하고, 예약 시간 경과 글은 `(발행 대기/지연)`으로 명확히 표시. 기존 `[시간변경]` 버튼은 `[수정]`으로 개칭.

## [본문 10] 자동 블라인드 투트랙
- 신고 누적 기반 자동 블라인드 및 관리자 블라인드(`app/admin/blind/page.tsx`) 투트랙 운용.

## [본문 11] 베스트 순수 SQL 정렬
- 베스트 정렬은 순수 SQL 정렬로 처리(애플리케이션 단 재정렬 금지), `allow_best` 스위치 연동.

## [본문 12] SEO / RSS
- `app/rss/route.ts` 미래 예약글 노출 방어(`<= CURRENT_TIMESTAMP`), `app/sitemap.ts`, `app/robots.ts` 운용.
- `Schema.org` 강제 주입 금지.

## [본문 13] 원데이 원픽 영구 폐기
- 원데이 원픽 기능은 영구 폐기되었으며 재도입 금지.

## [본문 14] DB 10대 시한폭탄 해체
- 대량 조회 쿼리 `LIMIT 10000` 상한 유지.

## [본문 15] Neon DB 원클릭 복원 SQL
- 18대 인덱스 포함 원클릭 복원 SQL을 유지·보관 (`scheduled_at`은 반드시 `TIMESTAMP WITH TIME ZONE`, API 형변환은 `::timestamptz`).

## [본문 16] AI 복제 마스터 프롬프트
- 신규 AI 에이전트 투입 시 본 `MASTER_SPEC.md`를 최우선 컨텍스트로 주입하고, 제 0원칙 및 5대 보안 시스템을 준수하도록 지시.

## [본문 17] App Router 전체 폴더 구조도 (v46.13 기준)
```
hurmoin/
├── MASTER_SPEC.md                      # ★ 단일 진실 원천 백서 (v46.13 신규)
├── vercel.json                         # 크론 */15
├── .github/workflows/ssl_renewal.yml
├── public/                             # manifest.json, sw.js, 고정 배너
└── app/
    ├── layout.tsx / page.tsx / robots.ts / sitemap.ts
    ├── admin/
    │   ├── page.tsx / BanButton.tsx / KickButton.tsx / SafeButton.tsx / UserInfoModal.tsx
    │   ├── blind/ boards/(page, DeleteButton) comments/ logs/ monitor/ posts/ setup/
    │   └── queue/page.tsx              # [v46.13] KST 날짜 교정 + 즉시발행 + 시간/제목/카테고리 통합 수정 모달
    ├── api/
    │   ├── admin/
    │   │   ├── ai-title/route.ts
    │   │   ├── queue/route.ts          # [v46.13] ::timestamptz + POST 즉시발행 + PATCH 통합 수정
    │   │   ├── schedule/route.ts       # [v46.13] ::timestamptz 교정
    │   │   └── settings/route.ts
    │   ├── auth/{google,kakao,naver}/(route.ts, callback/route.ts)
    │   ├── comment-report/route.ts
    │   ├── cron/
    │   │   ├── publish/route.ts        # 예약글 자동 발행 크론
    │   │   └── vip/route.ts
    │   ├── login/route.ts
    │   ├── post/route.ts
    │   ├── report/{comment,post}/route.ts
    │   └── upload/route.ts
    ├── board/
    │   ├── layout.tsx / page.tsx / Navbar.tsx / NavbarClient.tsx / navActions.ts
    │   ├── CategoryIcon.tsx / HybridPrefetchTrigger.tsx
    │   ├── write/(page.tsx, WriteClient.tsx)
    │   └── [id]/(page.tsx, CommentForm.tsx, DeleteConfirmButton.tsx, InteractiveButtons.tsx,
    │            VideoVolumeFix.tsx, YouTubeViewer.tsx, edit/(page.tsx, EditClient.tsx))
    ├── boards/page.tsx
    ├── components/(CopyProtection.tsx, InAppBrowserCheck.tsx)
    ├── contact/ privacy/ terms/ realestate/ youth/ hall-of-fame/
    ├── find-account/(page.tsx, actions.ts)
    ├── login/page.tsx
    ├── signup/(page.tsx, actions.ts)
    ├── profile/(layout.tsx, page.tsx, actions.ts, ProfileAvatar.tsx, SettingsForm.tsx)
    ├── rss/route.ts
    └── user/[id]/page.tsx
```


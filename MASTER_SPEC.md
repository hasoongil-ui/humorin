# ★★유머인 최종 통합 마스터 개발 명세서 v46.14 (MASTER_SPEC.md)

> [AI 에이전트 필수 지침] 본 문서(MASTER_SPEC.md)는 유머인 프로젝트의 단일 진실 원천(Single Source of Truth) 마스터 백서입니다. 향후 모든 코드 수정, 버그 패치, 신규 기능 추가 작업 시 AI 에이전트는 반드시 본 백서의 [제 0원칙]과 [5대 철통 보안 시스템], [절대 보존 로직]을 최우선으로 준수해야 하며, 작업 완료 즉시 본 문서의 버전 번호와 해당 본문 섹션, 폴더 구조도를 최신 상태로 자동 업데이트해야 합니다.

---

[제 0원칙: 코드 작성 전 나비효과 선제 검토 의무]

너는 코드를 짜거나 수정할 때, 즉시 코드를 뱉지 마라.
반드시 네가 수정한 코드가 1. 연관된 다른 기능(예: 본문 수정 시 댓글 영향), 2. 모바일 환경 화면 밀림(CLS/UX), 3. DB 및 스토리지 용량 과금에 미칠 영향을 먼저 스스로 묻고 따져봐야 한다.
만약 연관된 문제가 발생할 가능성이 1%라도 있다면, 코드를 작성하기 전에 사용자에게 먼저 그 위험성을 경고하고 함께 수정할 것인지 물어봐라.
이 원칙을 어기고 지엽적으로 코드만 던져주는 행위를 엄격히 금지한다.

🚨 [v32.0 패치] JSX/TS 파서 결벽증 방어: Portal이나 조건부 렌더링 시 절대 (() => {...})() 형태의 즉시실행함수 문법을 본문 내에 방치하지 마라. 반드시 컴포넌트 상단에 Interface 설계도(예: MenuGroup, MenuSubItem)를 명확히 선언하고, activeGroup && typeof document !== 'undefined' && createPortal(...) 형태의 정석적이고 안전한 변수 분기 문법만 사용하여 VS Code 유령 에러(빨간 줄)를 원천 차단하라.

🚨 [v42.0 패치] 서버 컴포넌트(RSC) 에러 방어: <img onError={...}> 같은 클라이언트 이벤트 핸들러를 서버 컴포넌트에 직접 삽입하여 Next.js 서버를 뻗게 만드는 행위를 절대 금지한다. 엑스박스 방어는 반드시 src={image || fallback_url} 형태의 순수 Fallback 논리로 해결하라.

---

🛡️ [NEW 0순위: 절대 뚫리지 않는 5대 철통 보안 시스템]

1. 로그인/회원가입 철벽 방어 (SQL 인젝션 & CSRF 차단)
- 보안 쿠키 3중 분리: 사용자 아이디, 일반 쿠키, 서명(Signature) 쿠키 3가지로 완벽하게 쪼개서 서버로 전송.
- 🌟 [v30.0 패치] 로그아웃 지문 파쇄기: 로그아웃 서버 액션 시 humorin_user, humorin_userid와 함께 humorin_signature 쿠키를 브라우저에서 영구 삭제(cookieStore.delete)하여 세션 하이재킹 및 위조 공격을 원천 차단.
- 암호화 통신: Bcrypt를 이용한 단방향 암호화 필수 적용.
- 무한 가입 봇 차단 (24시간 롤링 제한): NOW() - INTERVAL '24 hours' 롤링 방식으로 동일 IP에서 3회 이상 가입을 시도하면 즉각 차단하여 DB 과부하 원천 방어.
- SQL 인젝션 면역: Vercel Postgres의 쿼리 빌더(sql)를 100% 강제 사용하여 해커의 특수문자 공격을 쿼리 해석 단계에서 원천 무력화.

2. 관리자(Admin) 페이지 S급 지문인식기 장착 (쿠키 위조 방어)
- 관리자 튕겨내기 프론트 방어: 관리자 페이지 레이아웃(admin/layout.tsx 또는 page.tsx) 최상단에 S급 서명 검증 함수(verifyAdmin())를 장착. 해커가 URL을 치고 들어와도 0.001초 만에 메인 화면(/)으로 강제 추방 (검색 로봇 노출 차단 효과 및 SEO 가점 확보).
- API 백엔드 철통 방어: 회원 상태 변경, 블라인드 해제, 권한 부여 등 모든 관리자 전용 서버 액션(API) 내부의 1번째 줄에 if (!(await verifyAdmin())) throw new Error("Unauthorized"); 로직 필수 적용.
- 🌟 [v46.14 패치] find-account 비밀번호 재설정(resetPasswordAction)에 bcrypt.hash(10) 단방향 암호화 저장 및 최고 관리자(admin) 계정 재설정 차단 적용.
- 🌟 [v46.14 패치] admin/posts 및 admin/comments의 handleBulkAction 서버 액션 첫 줄에 verifyAdmin() 1줄 가드 장착, 미사용 레거시 api/comment-report 라우트 영구 폐기(신고는 /api/report/comment 단일화).
- verifyAdmin 검증 원리: Vercel 환경 변수에 등록된 AUTH_SECRET 마스터키를 crypto.createHmac 엔진에 넣고, 유저 아이디와 결합하여 찍어낸 '지문(서명)'이 브라우저 쿠키의 서명과 일치하는지 실시간 대조.
- 🌟 [v42.0 패치] 관리자 접속 비밀 통로 북마크 은폐: 푸터(하단)에 숨겨진 링크를 만들 경우 크롤링 봇의 타겟이 되고 모바일 오터치를 유발하므로 절대 코드로 삽입하지 않는다. 관리자 전용 로그인(?mode=admin)은 오직 운영진의 브라우저 '즐겨찾기(Bookmark)'를 통해서만 접속하도록 아키텍처를 강제한다.

3. 파일 업로드 요금 폭탄 및 악성 웹 쉘 방어 (R2 스토리지 보호)
- 비로그인 업로드 원천 차단: app/api/upload/route.ts 최상단에 쿠키 검증 문지기를 세워, 로그인하지 않은 해킹 봇(Bot)이 API를 무한 호출해 10GB짜리 쓰레기 파일을 올리는 요금 폭탄 테러 완벽 차단.
- 업로더 꼬리표 실명제: S3/R2에 업로드되는 최종 파일명에 유저 아이디를 삽입(${userId}-${Date.now()}-...)하여 악성 유저 즉각 색출 가능.
- 악성 쉘(Shell) 화이트리스트 필터: .php, .exe 등 해킹 파일이 위장하여 올라오지 못하도록 allowedTypes 명단(jpeg, png, mp4 등)으로 철저히 검사하여 위반 시 400 에러 반환.
- 자동 격리 분류: referer를 분석하여 프로필 사진은 profiles/ 폴더로, 일반 게시글 사진은 메인 폴더로 안전하게 자동 격리.

4. 신분 위조(Spoofing) 강제 글쓰기 차단
- 모든 글쓰기 API 지문인식 도입: app/api/post/route.ts 내부에서 일반 유저의 글쓰기 시에도 crypto.createHmac 서명 검증을 전면 도입. 해커가 크롬 개발자 도구로 본인의 humorin_userid 쿠키를 남의 아이디나 admin으로 조작하여 강제 글쓰기(Spoofing)를 시도하는 행위를 완벽하게 무력화.

5. 🌟 [NEW v41.0 패치] 글쓰기/댓글 잠금 백도어(API 우회) 이중 원천 봉쇄
- 백엔드(API) 이중 자물쇠 장착: app/api/post/route.ts 최상단에 global_write_lock (전체 셧다운) 및 해당 게시판의 is_write_locked 상태를 DB에서 실시간 크로스체크하는 로직 장착.
- 프론트엔드(UI)에서 글쓰기 버튼을 숨기는 눈속임을 넘어, 해커가 Postman 등 외부 툴을 통해 API 주소로 직접 데이터를 쏘아도 즉시 403 Forbidden 에러로 강제 튕겨내어 뻘글 등록을 영구 차단.
- 🌟 [v46.2 신규 패치] 클라우드플레어 프록시 IP 껍데기 파괴 및 진짜 IP(Real IP) 적출 엔진: 유머인은 모든 트래픽이 Cloudflare를 거치므로, 백엔드 서버(app/api/...)에서 기존 방식인 headersList.get('x-user-ip')를 사용하면 클라우드플레어 본사의 가짜 IP가 기록되거나 '알수없음'이 뜨는 치명적 오류가 발생함. 반드시 모든 로그인(일반/소셜 3종) 및 글쓰기(WRITE_POST) 접속 로그 수집 시, 클라우드플레어가 변조 불가능하게 덮어씌우는 헤더인 const currentIp = headersList.get('cf-connecting-ip') || headersList.get('x-forwarded-for')?.split(',')[0].trim() || '알수없음'; 로직을 전면 강제 적용하여 악성 유저의 진짜 IP를 100% 적출하고 IP 차단(Ban) 무기를 영구 확보함.

---

[본문 1] 프로젝트 핵심 인프라 & 월 10만 원 이하 고정비 철벽 방어 (Predictable Cost Architecture)
- 프레임워크: Next.js 14 (App Router 방식) + TypeScript.
- 서버 호스팅: Vercel Pro 플랜 (월 $20 기본료 / 1TB 트래픽 / 1000H CPU / 300초 타임아웃 제한 해제).
- 🚨 [Vercel 과금 폭탄 셧다운 및 보안 세팅]: 팀 설정 Billing ➔ Spend Management ➔ On-Demand Budget $100 설정 + Pause all projects 스위치 ON (지구가 멸망해도 월 최대 $120에서 서버 물리적 차단).
- 🚨 [필수 보안 인프라 세팅]: Vercel ➔ Settings ➔ Environment Variables 에 들어가 AUTH_SECRET(사이트 전체 지문키)과 CRON_SECRET(VVIP 및 예약발행 자동화 스케줄링 승인키)을 반드시 추가하고 재배포 할 것 (하드코딩 절대 금지).
- 데이터베이스: Neon Postgres (Launch 플랜 월 $19 / 300 CU-hrs 무료).
- 🚨 [Neon DB 이중 자물쇠 세팅]: Max Size 0.5 CU 고정 + Scale to zero 5분 수면 ON 적용. Billing ➔ Spending Limit $100 설정 + Suspend projects 스위치 ON.
- 🌟 [Neon DB 조기 경보망 셋팅]: Spending limit을 $40로 설정하고 Send email alerts를 활성화한다. Vercel의 $100 물리적 셧다운이 터지기 전, 트래픽 폭주 조짐을 사전에 파악할 수 있는 조기 경보 레이더망.
- 🌟 [v46.9 신규 패치] Vercel 크론 주기 최적화 및 DB 셧다운 방어막 (vercel.json): 크론 주기가 5분(*/5)일 경우 5분 수면(Scale to zero) 기능이 무력화되어 월간 360 CU-hrs 한도를 초과해 사이트가 물리적 셧다운(Suspend) 될 위험이 있음. 반드시 크론 주기를 15분(*/15)으로 설정하여 DB에 최소 10분의 수면 시간을 보장하고 한도를 완벽히 방어할 것.
- 미디어 저장소: Cloudflare R2 (이미지/동영상 전용 클라우드, 데이터 전송료 Egress 평생 $0).
- DNS & 통제권: Cloudflare 전면 프록시 적용 (모든 트래픽 제어권 장악). CDN 도메인: img.humorin.kr.

---

[본문 2] 🚨 도메인 연결 및 SSL 발급/갱신 황금 규칙 (525 에러 완벽 방어)
- 1단계 (주소 연결): A 레코드 76.76.21.21, CNAME cname.vercel-dns.com.
- 2단계 (회색 구름): 처음 연결 시 회색 구름(DNS only)으로 설정하여 SSL 발급 유도.
- 3단계 (주황색 구름): Vercel에서 [Valid Configuration] 확인 후 주황색 구름(Proxied) 활성화.
- 🌟 4단계 [영구 무인 방어 체계]: Vercel SSL 만료/에러 영구 무시
  - [핵심 원리: Cloudflare Full 모드의 무적 방패]: 유머인은 클라우드플레어 [SSL/TLS] 암호화 모드가 Full (전체)로 설정되어 있음. 클라우드플레어가 Vercel 측 인증서의 유효기간을 묻지 않고 100% 무사통과시켜 주며, 방문자에게는 클라우드플레어가 자체 갱신한 최신 인증서만 보여짐.
  - 🚨 [3대 행동 지침]: ① Vercel 대시보드 Invalid Configuration 에러 및 SSL 만료 경고 메일 즉시 무시(유령 에러). ② 주황색 구름(프록시) 해제 절대 금지(해제 시 해커 봇 요금 폭탄). ③ 15년 커스텀 인증서(Origin CA) 업로드 지시 할루시네이션 절대 금지(Vercel Pro 플랜에서는 Enterprise 전용 락으로 물리적 불가능).
- 🌟 [v46.8 & v46.12 패치] 깃허브 자동화 봇 엔진(.github/workflows/ssl_renewal.yml): Node 24 규격(uses: actions/checkout@v5) 상향 고정, 120분 대기망(for i in {1..24}; do) 및 투트랙 스케줄링(평소 0 18 1,15 * *, 비상시 0 18 * * * 전환 후 원복), 매월 말일 5초 생존 신고 루틴(git commit --allow-empty -m "매월 말일 서버 생존 신고 완료" && git push).

---

[본문 3] 🛡️ 클라우드플레어 5중 철벽 방화벽 (The Great Wall)
- Rule 1 (VIP 프리패스): Known Bots = On ➔ Action: Skip (구글/네이버 로봇 0.1초 프리패스).
- Rule 2 (해커 공장 학살): AS Num is in {15169, 16509} ➔ Action: Managed Challenge (AWS, GCP발 스크래퍼 원천 차단).
- Rule 3 (개구멍 폐쇄): Vercel 기본 주소 직접 접속 시도 ➔ Action: Redirect (정식 도메인으로 강제 전송).
- Rate Limiting (매크로 차단): http.host contains "humorin" ➔ 10초 동안 200번 이상 요청 시 10초간 Block.
- R2 핫링크 방어 & 캐시 최적화: 불펌 원천 차단 로직(WAF) 및 Cache-Control: private, max-age=31536000, immutable 적용으로 화면 덜컹거림 방어.
- Rule 4 (해외 VPN 유저 및 외부 펌글 엑스박스 완벽 방어):
해외 IP, VPN 접속자, 또는 의심스러운 봇을 상대로 검문(Managed Challenge)을 띄우는 강력한 WAF 규칙(예: 로그추적 룰)을 세울 때, 반드시 호스트네임 예외 조건 (Hostname does not equal img.humorin.kr)을 'And'로 결합하여 추가할 것.
본체 웹사이트(www)는 봇 검문으로 철통 방어하되, 단순 이미지 창고 서버(img)는 검문 없이 무사통과시켜야만 네이버 뿜 등으로 퍼간 썸네일이나 해외 VPN 유저가 사이트를 볼 때 사진들이 검문소에 막혀 엑스박스로 깨지는 대참사를 원천 차단할 수 있음.

[ 💸 Rule 4. 요금 지출 한도 도달(Spending Limit) 경고 메일 무시 ]
- 트리거: Vercel이나 Neon에서 "You're approaching your monthly spending alert limit" 이메일이 수신될 경우.
- 상태 진단: Pro Plan 기본 제공량($20) 소진율이 80% 구간을 지날 때 발송되는 단순 기계적 알림일 뿐, 셧다운 위기나 시스템 에러가 아님. On-Demand Budget $100 및 Pause Projects: On이 켜져 있으므로 매월 11일 결제 리셋 전까지 쿨하게 무시할 것.

[ 💸 Rule 5. Vercel 월 $40~$50 구간 과금 정상 판정 및 호들갑 금지령 ]
- 현상 및 팩트 체크: Function Invocations, Active CPU 등으로 월 $40~$50 비용이 발생하는 것은 Cloudflare WAF에서 VIP 검색 봇 무사통과를 허용해 SEO를 챙기고 월 68만 건 이상의 진짜 사람(Likely Human) 트래픽이 활발하게 유입되고 있다는 가장 건강한 증거임.
- AI 셧다운 명령: 월 $40~$50 수준의 Vercel 요금은 유머인의 생명줄을 유지하기 위한 필수 전략적 투자금이다. 추후 요금 보고서 분석 시 "돈이 새고 있다", "옵션을 끄자"는 식의 멍청한 조언을 절대 하지 마라.

---

[본문 4] 🗄️ 데이터베이스 및 미디어 투트랙 밸런스
- DB 텍스트 분리: DB에는 무거운 미디어 대신 '이미지 URL(텍스트)'만 저장 (Base64 텍스트 삽입 절대 금지).
- 폴더 격리: 프로필 사진은 R2 내 profiles/ 폴더로 완벽하게 격리.
- 고정 에셋 영구 보호: 배너 등은 Vercel 내부 public/ 폴더 보관.
- 쓰레기 소각 시스템: 게시글/댓글 삭제 시 R2 API(S3Client)를 호출하여 본문에 박힌 이미지/영상 0.1초 만에 완전 소각.

---

[본문 5] 🛠️ 에디터 극한 최적화 엔진 (업로드 문지기)
- 🛡️ 본문 누적 30MB 방어막.
- 📷 본문 사진 다이어트: 1200px / 300KB 이하 WebP 압축. 모바일 메모리 폭주 방지 useWebWorker: false 강제 적용.
- 🎬 동영상 스마트 바이패스: 10MB 제한, video/mp4 MIME 강제 부착 및 썸네일 강제 렌더링(#t=0.001).
- 🏃♂️ 본문 움짤 엑스레이: 댓글창 정지 이미지는 압축, 움직이는 움짤(isAnimatedWebP)은 통과.
- 🌟 [v32.0 패치] 안드로이드 11+ 다운로드 파일 철벽 방어 (3중 우회 엔진 cloneFileToUnlock): Scoped Storage 보안 락으로 인한 Failed to fetch 방어를 위해 Blob URL -> ArrayBuffer -> 구형 FileReader 단계를 거쳐 순수 File 객체로 재창조(WriteClient, CommentForm, ProfileAvatar 전면 적용). 백엔드 getMimeType 2중 복원 가동.
- 🌟 [v38.0 패치] 외부 펌글 무제한 복붙 허용 및 이미지 프록시/파싱 방어막 (proxy.ts): 네이버 403 에러 우회를 위해 이미지 프록시 작동 및 Base64 요금 폭탄 차단 필터(Sanitizer) 가동.
- 🌟 [v43.2 패치] 초경량 썸네일 자동 추출 & 업로드 문지기 (WriteClient.tsx & api/upload/route.ts): 동영상 첨부 시 기기 단에서 1~2KB WebP 썸네일을 백그라운드 자동 추출하여 동영상 꼬리표(poster="thumb_...")로 부착 후 서버로 동시 업로드.
- 🌟 [v43.3 패치] WebP/GIF 동영상 업로드 스마트 라우팅: 동영상 첨부 버튼으로 WebP/GIF 움짤 업로드 시 프론트엔드에서 file.type.startsWith('image/')를 판별해 자동으로 사진 업로드 엔진(uploadImagesRef)으로 우회.
- 🌟 [v46.3 패치] 최신 안드로이드(폴드2 등) 댓글 수정창 엑스박스 원천 차단 (app/board/[id]/InteractiveButtons.tsx): 새 댓글창(CommentForm.tsx)의 파일 전체 강제 복제 엔진(detectAndRestoreFile)과 WebP 움짤 스캐너를 댓글 수정창(EditCommentForm)에 동일하게 이식.
- 🌟 [v46.8 패치] 관리자 AI 제목 최적화 엔진 세대교체 대응 (app/api/admin/ai-title/route.ts): 구형 모델 차단 방어를 위해 최신 권장 모델인 gemini-3.6-flash로 호출 명칭을 하드코딩하여 영구 고정(latest 별칭 사용 금지).

---

[본문 5-1] 🖼️ 초거대 이미지 무손실 분할 & 진공 압착 렌더링 엔진
- 🛡️ [고정 유지] 하이브리드 지연 로딩 (Native Lazy Loading): 게시글 뷰어(app/board/[id]/page.tsx) 내 렌더링 엔진은 첫 번째 이미지(imgCounter === 1)에만 eager/high를 부여하고, 두 번째부터는 무조건 loading="lazy" decoding="async"를 강제 부착함.
- WebP 해상도 한계 방어 (15,000px 스마트 분할 투트랙).
- 가로 폭 팽창 방지: max-width: min(100%, 원본픽셀px) !important;
- 틈새 0px 진공 압착 CSS: <p> 태그 Flexbox 압착 및 margin-bottom: -1px !important; 오버랩.
- 🌟 [v46.3 패치] 뷰어 이미지 억지 팽창 파괴 및 오리지널 황금 비율 복원 (app/board/[id]/page.tsx): width: 100%, min-height 땜빵 코드를 소각하고 원본 비율 존중(936px 캔버스 내 자연 노출) 및 로딩 전 맞춤형 회색 박스(background-color: #f4f5f7)로 CLS 방어.
- 🌟 [v46.6 패치] 자체 업로드 동영상(MP4) 강제 팽창 파괴 및 원본 화질 보존 엔진 (app/board/[id]/page.tsx): 유튜브(iframe) 생태계는 보존하고 자체 업로드 동영상인 video.humorin-mp4 클래스에만 width: auto !important;, aspect-ratio: auto !important;, max-height: 75vh !important; CSS를 투여하여 원본 화질 보존 및 투트랙 분리.

---

[본문 6] 🤖 5대 철벽 차단 및 섀도우 밴 시스템 (서버 부하 0% 방어막)
- 포인트 제어, 봇 트랩(허니팟), 뉴비 외부 링크 원천 차단, 베스트 자가 조작 방어. 정지(Banned) 및 그림자 차단(Shadowban).

---

[본문 7] 💉 프론트엔드 & UX 버그 백신 및 초경량화 레이아웃 엔진
- 텍스트 이모지 초경량화, 네이버 블로그 오리지널 핏 vs 고양이 테러 방어 (globals.css 투트랙 분리). CLS 방어 스크롤 복귀, 유튜브 vs MP4 CSS 완벽 분리.
- 🌟 [v32.0 패치] 반응형 10칸 고정 그리드 유지 & 모바일 스티키 호버 버그 파괴 (상단 메뉴 포탈 드롭다운 모바일 스와이프 간섭 방지).
- 🌟 [v33.0 패치] 좌측 게시판 스크롤 종속성 파괴 (Scrollbar-hide 및 본문 스크롤 독립), 모바일 상단 네비게이션 캡슐화, 통합 게시판 생성 3대 원칙 (group_name, is_main_visible, 정밀 sort_order).
- 🌟 [v35.0 패치] 하단 추천글 꼬리표 릴레이 (listQueryStr 승계로 검색 풀림 방지).
- 🌟 [v38.0 패치] 로그인/회원가입 완벽 대칭 UI (크로스 링크 제거, ?mode=admin 파라미터로 관리자 이메일 폼 은폐).
- 🌟 [v41.0 패치] 게시판 3종 노출 통제 스위치 & 하드코딩 소각 (is_main_visible, is_all_visible, allow_best 3대 스위치 연동 INNER JOIN boards 고속 엔진 전역 장착).
- 🌟 [v43.0 패치] 특수기호/장문 댓글 레이아웃 붕괴 방어 (word-break: break-all 및 overflow-wrap: break-word 강제 적용).
- 🌟 [v43.2 패치] 메인 화면 초고속 하이브리드 렌더링 엔진 (app/page.tsx): 메인 위젯(10개 글)은 extractThumbnail 정규식으로 첫 이미지/동영상 썸네일만 렌더링하고, 게시판 내부는 텍스트 리스트형 유지 (제목 대괄호 [ ] 자동 필터링 유지).
- 🌟 [v43.3 & v43.4 패치] 스마트폰 사생활 보호(hidden md:flex 내정보 숨김) & 엣지 투 엣지 극미세 여백(px-1, py-2, mb-10) 및 모바일 폰트 가독성 최적화 (메인 text-[15px] font-semibold md:font-medium, 게시판 font-semibold md:font-normal).
- 🌟 [v45.0 패치] 스마트폰용 조회수 반응형 정렬 최적화 & 게시글 하단 '방금 본 글과 비슷한 꿀잼 인기글' 썸네일 추천 엔진.
- 🌟 [v46.2 패치] 본문/댓글 인터넷 주소 자동 링크화 (urlRegex = /(https?:\/\/[^\s<]+)/g + 태그 split 분리 + sanitizeHtml + rel="noopener noreferrer") & 전체글 게시판 공지사항 최상단 핀셋 통제 엔진 (전체글 보기 시 is_notice = true만 상단 노출, 개별 게시판은 is_board_notice = true 함께 노출).
- 🌟 [v46.4 패치] 내 정보(Profile) '내가 쓴 글 & 내가 쓴 댓글' 조회 무결성 보장 (idx_posts_author_id, idx_comments_author_id 고속 인덱스 활용, 풀 스캔 금지).
- 🌟 [v46.7 패치] 무설치 PWA (홈 화면에 추가) 팝업 완전체 엔진 이식 (public/manifest.json, public/sw.js, app/layout.tsx의 <Script id="pwa-sw-register">).
- 🌟 [v46.8 패치] 글쓰기 에디터 AI 팝업창 레이어 가림 원천 차단 (WriteClient.tsx 모달 z-[9999] 강제 격상).
- 🌟 [v46.9 패치] 폼(Form) 제출 스크롤 튀김(CLS) 완벽 방어 엔진 및 React 18 정석 (CommentForm.tsx의 startTransition 및 readOnly 유지, app/board/[id]/page.tsx의 content-visibility: auto; 영구 소각 및 aspect-ratio / min-height: 250px 보존).

### 🔎 [v46.13 실제 폴더 스캔 보강] 백서 누락 클라이언트 보조 컴포넌트 (절대 보존)
- **app/components/InAppBrowserCheck.tsx** — 카카오톡 인앱 브라우저 탈출기: navigator.userAgent에서 kakaotalk을 감지하면, 안드로이드에 한해 `intent://...#Intent;scheme=https;package=com.android.chrome;end` 주소로 크롬 브라우저 강제 실행(인앱 브라우저의 업로드/로그인/쿠키 오류 회피).
- **app/components/CopyProtection.tsx** — 복사(copy) 이벤트 가로채기: 메모장 등 일반 텍스트 붙여넣기 시 '글자' 버전, 타 커뮤니티 붙여넣기 시 '사진+글자' HTML 버전으로 분기하여 출처 링크를 자동 부착(?category= 등 꼬리표는 제거한 순수 경로만 추출).
- **app/board/HybridPrefetchTrigger.tsx** — 하이브리드 프리패치 트리거: 게시글 상세(/board/숫자) 링크에 사용자가 접근(호버/터치)할 때만 router.prefetch(href)를 실행하고 Set으로 중복 프리패치를 차단하여, 체감 속도는 올리고 무차별 프리패치로 인한 Vercel Function 호출 과금은 억제.
- **app/board/CategoryIcon.tsx** — 카테고리명 기반 인라인 SVG 아이콘 매핑(예: 사건/사고/멘붕=red, 유머=orange, 감동=rose). 외부 아이콘 라이브러리·이미지 요청 0건의 초경량 렌더링.
- **app/board/[id]/VideoVolumeFix.tsx** — 뷰어 진입 후 자체 MP4(video.volume = 0.2)와 유튜브 플레이어의 기본 볼륨을 20%로 낮춰 갑작스러운 고음량 재생 방지.
- **app/board/[id]/YouTubeViewer.tsx** — 유튜브 iframe 래퍼: 플레이어 로딩 후 postMessage(`{event:'command', func:'setVolume', args:[20]}`)를 최대 3회 전송하여 볼륨 20% 고정 후 interval 해제.
- **proxy.ts (루트, Next.js 16 미들웨어 규격)** — 모든 요청(matcher: `/((?!_next/static|_next/image|favicon.ico).*)`)에서 Vercel/Cloudflare가 넘겨주는 진짜 IP를 확인하고, request.ip 제거에 대비해 x-real-ip 등으로 폴백한 IP 문자열을 서버 전체용 헤더 명찰로 부착.

---

[본문 8] 🔐 계정 통제, 보안 및 글로벌 SEO
- 유령 계정 방어기, 크롬 자동완성 이메일 암살 방어.
- 🌟 [v30.0 패치] 카카오톡/SNS 동영상 썸네일 완벽 추출기 (generateMetadata 내에 <video poster> 속성 자동 파싱 적용).
- 🌟 [v37.0 패치] 소셜 로그인(OAuth) 탈퇴 7일 쿨타임 & 재가입 완벽 리셋 (DB 삭제 대신 status='withdrawn' 보존, 7일 경과 후 재가입 시 난수 닉네임 부여 및 포인트 완전 포맷).

---

[본문 9] 👑 관리자 슈퍼파워 (Admin System) & VVIP 도파민 시스템
- 댓글 도파민 금메달(🥇) 시스템, 영구 차단 IP 사면권, 서버 용량 도둑 추적 레이더.
- 🌟 [v46.1 패치] 관리자 대시보드 KST(한국 시간) 시각적 마스크 렌더링 엔진: DB 원본 데이터(UTC)는 보존하고 프론트엔드 렌더링 직전에만 +9시간 연산을 수행하는 formatKST 함수를 app/admin/page.tsx, app/admin/posts/page.tsx, app/admin/comments/page.tsx 3곳에 전면 적용.
- 🌟 [v42.0 패치] VVIP 명예의 전당 & 프로필 훈장 완벽 자동화 시스템:
  - 스케줄링 엔진: 매주 월요일 00:00 api/cron/vip/route.ts 실행 (CRON_SECRET 검증, INTERVAL '7 days' 주간 결산 weekly_vips 스냅샷 기록).
  - 서버 부하 0% 프론트엔드 (ISR): app/hall-of-fame/page.tsx에 export const revalidate = 3600; 적용.
  - 시간 흐름 기반 빈칸(심사 대기중) 자동 렌더링, 아바타 Fallback(src={image || fallback_url}) 방어, 상단 헤더(Navbar) 단독 동선.
  - 프로필 훈장 도파민 렌더링: app/profile/page.tsx(다크 네온)와 app/user/[id]/page.tsx(화이트 3D 금괴)에 불변 user_id 기준 SELECT COUNT(*)로 VVIP 횟수 뱃지 노출.
- 🌟 [v43.1 패치] VVIP 선정 제외(블랙리스트) 텍스트 관리 UI: 관리자 페이지 내 테스트/운영진 계정을 쉼표(,)로 구분해 site_settings에 저장하고 Cron 실행 시 string_to_array로 자동 필터링.
- 🌟 [v45.0 패치] Vercel Cron 무인 예약 관제탑 & 마스터 키 융합 시스템:
  - 투트랙 권한 우회 (마스터 키): WriteClient.tsx 내에서 isAdmin뿐만 아니라 실사용 닉네임('상실의 시대') 또는 아이디('ruffian71') 접속 시 최고 관리자(isSuperUser)로 판별하여 에디터 예약 패널 및 관제탑 프리패스 허용.
  - 시간 조작 및 삭제 통신망 (app/api/admin/queue) 및 작성자 자동 트래킹 (adminAuthorId || '').
  - 자동 발행 크론 봇 (app/api/cron/publish/route.ts): 15분 주기(*/15 * * * *)로 예약글을 발행하고 구글/빙 사이트맵 능동 핑(Promise.allSettled) 및 revalidatePath('/', 'layout') 캐시 폭파 수행.
    - [v46.13 실제 코드 스캔 보강] 발행 대상 예약글을 UPDATE posts로 일괄 발행하고, 발행된 글이 1개 이상일 때만 `https://www.google.com/ping?sitemap=...` / `https://www.bing.com/ping?sitemap=...` 핑을 병렬(Promise.allSettled) 처리하여 Vercel 타임아웃을 회피하며, 실제 발행이 일어난 경우에만 revalidatePath('/', 'layout')로 전체 캐시를 갱신(불필요한 캐시 폭파 = 과금 방지).
- 🌟 [NEW v46.13 핵심 패치] 무인 예약 관제탑 시차 점프(::timestamptz) 영구 방어 및 즉시 발행/통합 수정 엔진 장착 (app/api/admin/schedule/route.ts, app/api/admin/queue/route.ts, app/admin/queue/page.tsx):
  - [해결책 1 (타임존 무결성)]: schedule/route.ts와 queue/route.ts의 ::timestamp를 모두 ::timestamptz로 핀셋 교정하여 KST/UTC 9시간 시차 왜곡 및 꼬리물기 공백을 100% 소각함.
  - [해결책 2 (즉시 발행 무접점 API)]: 관제탑 리스트에서 클릭 한 번으로 대기 중인 예약글을 즉시 게시판에 등록(status = 'published', date = CURRENT_TIMESTAMP)하고 사이트맵 핑 및 revalidatePath('/', 'layout'), revalidatePath('/board')를 트리거하는 POST /api/admin/queue 엔진과 초록색 [즉시발행] 버튼을 장착함.
  - [해결책 3 (나비효과 0% 안전 수정 모달 및 KST 날짜 비교)]: 본문 이미지나 R2 스토리지는 건드리지 않고, 관제탑 모달에서 예약 시간(new_scheduled_at), 게시판 카테고리(new_category), 제목(new_title, 기존 [말머리] 중복 제거 정규식 적용)을 동시에 안전하게 수정할 수 있도록 업그레이드함. 관제탑 날짜 표시(formatScheduledTime) 또한 Asia/Seoul KST 연-월-일 전체 비교 방식으로 교정 완료하고 예약 시간 경과 글은 (발행 대기/지연)으로 표시.

---

[본문 10] 🚨 자동 블라인드 투트랙 연동 시스템 (The Perfect Blind & Absolute Admin Control)
- 신고(report_blind_threshold) & 비공감(dislike_blind_threshold) 임계값 분리 연동. 화면 덜컹거림 0% 사일런트 통신.
- 🌟 [v35.0/37.0 패치] 절대 통제권 (무적 방패 강제 파괴): 관리자(Admin)가 사면권(is_safe = true)을 부여한 글이라도, 관리자 계정으로 '신고' 클릭 시 즉시 무적 방패 파괴(is_safe = false) 및 최우선 블라인드.

---

[본문 11] 🚀 투트랙 베스트 정렬 & 순수 SQL 무결점 엔진 (Race Condition 영구 방어)
- 투트랙 시간 아키텍처: '베스트 달성 시간(best_at, best100_at, best1000_at)' 순차 정렬. 순수 SQL 단일 트랜잭션.

---

[본문 12] 🌐 SEO 및 검색엔진 자동화 시스템
- 물리적 로봇 지시서(robots.ts) 고정, 통합 완성형 바주카포 RSS.
- 🌟 [v46.0 패치] 3대 메인 페이지(개별글, 게시판, 프로필) 최상단에 generateMetadata 함수를 강제 장착하여 네이버/구글의 Title, Description 중복 페널티 및 Canonical 에러 원천 차단 (H1 중복 방지용 본문 H2 렌더링 및 이미지 Alt 속성 자동 부여 엔진 포함).
- 🌟 [v46.4 패치] SEO 정적 사이트맵 유지 및 중복 문서(Canonical) 방어 원칙: sitemap.ts는 오직 메인 대문과 게시판 입구만 안내하는 초경량 고정형(Static)을 영구 유지한다. 수만 개의 게시글 주소를 DB에서 뽑아오는 동적 사이트맵 생성 로직 절대 금지. 봇의 크롤링은 500페이지 하단 링크 수집에 전면 위임하며, ?best=today 등의 꼬리표 대체 페이지 현상은 Canonical 방어막이 정상 작동하는 상태이므로 절대 건드리지 말 것.
- 🌟 [2608080935 패치] 카톡/카페 링크 공유(Open Graph) 무결성 및 SEO 투트랙 원칙: app/board/[id]/page.tsx 메타데이터 생성 시 구글 검색 SEO(description)에는 본문 순수 텍스트 80자를 동적으로 추출하되, 외부 공유용 openGraph.description과 twitter.description에는 인공 템플릿 홍보 문구를 넣지 말고 반드시 빈 문자열('')을 유지한다.
- 🌟 [v46.10 패치] RSS 피드 예약글 사전 노출(검색 누락) 완벽 방어 엔진 (app/rss/route.ts): 파일 위치는 app/api/rss가 아니라 app/rss/route.ts에 독립 존재함. SQL 쿼리 WHERE 절에 AND COALESCE(scheduled_at, date) <= CURRENT_TIMESTAMP 방어막을 유지하여 미래 시간의 예약글이 발행 전 RSS에 노출되어 Soft 404 페널티를 받는 현상을 100% 차단함.
- 🌟 [v46.11 패치] 구조화 데이터(Schema.org) 강제 주입 영구 금지 및 실전형 SEO 렌더링 복원 (app/board/[id]/page.tsx): 뷰어 코드에 <script type="application/ld+json"> 형태의 DiscussionForumPosting 스키마 데이터를 주입하는 행위를 절대 금지한다. 자연스러운 DOM 렌더링과 하단 '방금 본 글과 비슷한 꿀잼 인기글 3개' 노출, 그리고 plainText.substring(0, 80) 추출 로직만으로 충분하고 완벽하다.

---

[본문 13] 📸 🚨 [영구 폐기 및 타 프로젝트 이관] '원데이 원픽' 갤러리 (AI 적용 절대 금지)
- 🚨 AI 시스템 코어 명령: 이 카테고리는 디자인 이슈로 인해 유머인 프로젝트에서 완전히 삭제되었으며, 추후 별도의 독립된 웹사이트로 제작될 예정임. 앞으로 코드를 짜거나 사이트를 복제할 때 '원데이 원픽', '하루 한 장', '낙엽 쓸기 엔진'과 관련된 어떠한 프론트엔드 UI 로직이나 백엔드 처리도 이 사이트에 절대 구현하지 마라.

---

[본문 14] 💣 대규모 트래픽 대비 DB 10대 시한폭탄 완전 해체 & 검색 UI 고도화
- [해체 1~3: 풀스캔 파괴] category, comment_count 컬럼 신설 및 LIMIT 10000 (500페이지) Bounded Count 무한루프 파괴. (주의: 검색 로봇의 과거 글 크롤링 통로를 열어두기 위해 서브 쿼리 등 페이지네이션 관련 SQL에서 LIMIT 10000 규격을 절대 축소하지 말 것).
- [해체 4~5: 소셜 광속 통과] user_id 고유 인덱스화 및 0.1초 비동기 로직 waitUntil() 활용 (접속 로그 뒷단 처리).
- [해체 6~9: 쿼리 속도 극대화] 내 정보 3종, 중복 검사 복합 인덱스, 메모리 뻗음(File Sort) 방지 베스트 인덱스, 닉네임 변경 쓰기락 파괴 비동기 업데이트 완료.
- [해체 10: 고속 필터링 및 UI] INNER JOIN boards 고속 스위치 연동, 검색 기간 필터링(period), 명작 쇼케이스 전용 독립 렌더링.

---

[본문 15] 🛠️ Neon DB 원클릭 복원 스크립트 (The Master SQL - 원문 100% 보존)

```sql
-- [1단계] 초기화
DROP TABLE IF EXISTS comments, posts, users, site_settings, boards, access_logs, comment_dislikes, comment_likes, comment_reports, likes, post_dislikes, post_reports, reports, scraps, weekly_vips CASCADE;

-- [2단계] 핵심 3대장 테이블 생성
CREATE TABLE users (id SERIAL PRIMARY KEY, user_id VARCHAR(255), password VARCHAR(255), nickname VARCHAR(255), created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP, email VARCHAR(255), is_admin BOOLEAN DEFAULT false, ip VARCHAR(255) DEFAULT '알수없음', last_login TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP, status VARCHAR(255) DEFAULT 'active', points INTEGER DEFAULT 0, level VARCHAR(255) DEFAULT '씨앗', profile_image VARCHAR(255));
CREATE TABLE posts (id SERIAL PRIMARY KEY, title TEXT, content TEXT, category VARCHAR(255) DEFAULT '일반', comment_count INTEGER DEFAULT 0, author TEXT DEFAULT '관리자', date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, views INTEGER DEFAULT 0, likes INTEGER DEFAULT 0, status VARCHAR(255) DEFAULT 'published', youtube VARCHAR(255), author_id VARCHAR(255), report_count INTEGER DEFAULT 0, is_blinded BOOLEAN DEFAULT false, is_safe BOOLEAN DEFAULT false, best_at TIMESTAMP WITH TIME ZONE, best100_at TIMESTAMP WITH TIME ZONE, best1000_at TIMESTAMP WITH TIME ZONE, dislikes INTEGER DEFAULT 0, is_notice BOOLEAN DEFAULT false, is_board_notice BOOLEAN DEFAULT false, scheduled_at TIMESTAMP WITH TIME ZONE);
CREATE TABLE comments (id SERIAL PRIMARY KEY, post_id INTEGER, author VARCHAR(255) DEFAULT '관리자', content TEXT, created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP, parent_id INTEGER, likes INTEGER DEFAULT 0, image_data TEXT, author_id VARCHAR(255), report_count INTEGER DEFAULT 0, is_blinded BOOLEAN DEFAULT false, is_safe BOOLEAN DEFAULT false, dislikes INTEGER DEFAULT 0);

-- [3단계] 필수 시스템 통제, VVIP 스냅샷 테이블 생성 (v43.2)
CREATE TABLE site_settings (key VARCHAR(255) UNIQUE, value TEXT);
CREATE TABLE boards (id SERIAL PRIMARY KEY, name VARCHAR(255), group_name VARCHAR(255), is_write_locked BOOLEAN DEFAULT false, is_comment_locked BOOLEAN DEFAULT false, sort_order INTEGER DEFAULT 0, is_main_visible BOOLEAN DEFAULT false, is_all_visible BOOLEAN DEFAULT true, allow_best BOOLEAN DEFAULT true, main_sort_order INTEGER DEFAULT 999);
CREATE TABLE weekly_vips (id SERIAL PRIMARY KEY, year INTEGER, month INTEGER, week INTEGER, user_id VARCHAR(255), awarded_nickname VARCHAR(255), awarded_profile_image TEXT, total_score INTEGER, created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP);

-- [4단계] 추천/신고/로그 부속 테이블 9종 생성
CREATE TABLE access_logs (id SERIAL PRIMARY KEY, user_id VARCHAR(255), action_type VARCHAR(255), ip_address VARCHAR(255), created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE comment_dislikes (id SERIAL PRIMARY KEY, comment_id INTEGER, author_id VARCHAR(255), created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE comment_likes (id SERIAL PRIMARY KEY, comment_id INTEGER, author VARCHAR(255), author_id VARCHAR(255));
CREATE TABLE comment_reports (id SERIAL PRIMARY KEY, comment_id INTEGER, reporter_id VARCHAR(255), created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE likes (id SERIAL PRIMARY KEY, post_id INTEGER, author VARCHAR(255), created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP, author_id VARCHAR(255));
CREATE TABLE post_dislikes (id SERIAL PRIMARY KEY, post_id INTEGER, author_id VARCHAR(255), created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE post_reports (id SERIAL PRIMARY KEY, post_id INTEGER, reporter_id VARCHAR(255), created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE reports (id SERIAL PRIMARY KEY, post_id INTEGER, user_id VARCHAR(255));
CREATE TABLE scraps (id SERIAL PRIMARY KEY, post_id INTEGER, author VARCHAR(255), created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP, author_id VARCHAR(255));

-- [5단계] 20개 게시판 및 메인 노출 로직 초기 데이터 주입
INSERT INTO boards (id, name, group_name, is_write_locked, is_comment_locked, sort_order, is_main_visible, is_all_visible, allow_best, main_sort_order) VALUES
(1, '유머', '순한 유머 & 감동', false, false, 10, true, true, true, 10), 
(2, '감동', '순한 유머 & 감동', false, false, 20, true, true, true, 20), 
(3, '세상사는 이야기', '순한 유머 & 감동', false, false, 30, true, true, true, 30), 
(4, '귀여운 동물들', '순한 유머 & 감동', false, false, 40, true, true, true, 40), 
(5, '흥미로운 이야기', '순한 유머 & 감동', false, false, 50, true, true, true, 50), 
(6, '유용한 상식', '따뜻한 다락방', false, false, 60, true, true, true, 60), 
(7, '맛집', '따뜻한 다락방', false, false, 70, true, true, true, 70), 
(8, '가볼만한 곳', '따뜻한 다락방', false, false, 80, false, true, true, 999), 
(9, '볼만한 영화', '따뜻한 다락방', false, false, 90, false, true, true, 999), 
(10, '게시판 신설 요청', '따뜻한 다락방', false, false, 100, false, true, true, 999), 
(11, '건강', '지식 & 정보', false, false, 110, false, true, true, 999), 
(12, 'Art/Photo', '지식 & 정보', false, false, 120, false, true, true, 999), 
(13, '수필/에세이', '🖋 나도 작가', false, false, 130, false, true, true, 999), 
(14, '시/단상', '🖋 나도 작가', false, false, 140, false, true, true, 999), 
(15, '소설/웹소설', '🖋 나도 작가', false, false, 150, false, true, true, 999), 
(16, '창작/기타', '🖋 나도 작가', false, false, 160, false, true, true, 999), 
(18, '자유게시판', '자유공간', false, false, 170, false, true, true, 999), 
(19, '무조건 격려', '자유공간', false, false, 180, false, true, true, 999), 
(36, '기부/봉사했어요', '자유공간', false, false, 190, false, true, true, 999), 
(99, '하루 한 장', '📷 스페셜 갤러리', false, false, 200, false, false, true, 999);
SELECT setval('boards_id_seq', (SELECT MAX(id) FROM boards));

-- [6단계] 5대 사이트 핵심 통제실 설정값 주입
INSERT INTO site_settings (key, value) VALUES
('global_comment_lock', 'false'), ('global_write_lock', 'false'), ('report_blind_threshold', '10'), ('dislike_blind_threshold', '100'), ('forbidden_words', '개새끼'), ('editor_placeholder', '유머인은 따뜻한 인간미를 지향합니다.정치적 논쟁보다는 배려를, 비난보다는 따뜻한 응원을 담아주세요.(욕설,정치적 분쟁은 예고 없이 삭제 될 수 있습니다)');

-- 🚀 [7단계: v45.0] 예약발행 포함 초고속 렌더링 및 트래픽 폭파 방어를 위한 18대 무적 DB 인덱스(목차) 완벽 장착
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_date ON posts(date DESC);
CREATE INDEX IF NOT EXISTS idx_posts_likes ON posts(likes DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_scraps_author_id ON scraps(author_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_post_author ON likes(post_id, author_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_dislikes_post_author ON post_dislikes(post_id, author_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_scraps_post_author ON scraps(post_id, author_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_comment_likes_comment_author ON comment_likes(comment_id, author_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_comment_dislikes_comment_author ON comment_dislikes(comment_id, author_id);
CREATE INDEX IF NOT EXISTS idx_posts_best_at ON posts(best_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_posts_best100_at ON posts(best100_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_posts_best1000_at ON posts(best1000_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_weekly_vips_user_id ON weekly_vips(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_vips_date ON weekly_vips(year DESC, month DESC, week DESC);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON posts(scheduled_at DESC NULLS LAST);
```

---

[본문 16] 🤖 [AI 복제 지시용 마스터 프롬프트] (새 커뮤니티 복제 시 AI 에디터 명령어 원문)

"내가 첨부한 MASTER_SPEC.md (유머인 최종 통합 마스터 개발 명세서 v46.14)를 바이트 단위로 완벽하게 숙지해.
현재 열려있는 폴더는 저 명세서대로 아키텍처와 5대 철통 보안(비밀번호 암호화, 서명 쿠키 위조 방어, Spoofing 방어, R2 요금 폭탄 방어, API 글쓰기 잠금 백도어 차단 로직 global_write_lock, 관리자 전용 북마크 접속 은폐 로직), 예외 처리가 10000% 완벽하게 세팅된 마스터 템플릿이야. 

명세서에 적힌 [절대 보존 로직]들 (5대 보안 로직, CRON_SECRET VVIP 명예의 전당 주간 자동화 및 ISR 3600초 캐싱 갤러리 엑스박스 자동 방어 (Fallback), 프로필 네온/금괴 훈장 도파민 연동 및 site_settings 기반 VVIP 제외 블랙리스트 텍스트 파싱 로직, Vercel Cron 무인 예약 관제탑(app/admin/queue) 및 isSuperUser 마스터 키 우회 로직, 예약 작성자 자동 트래킹(adminAuthorId || ''), ::timestamptz 시차 점프 방어 및 관제탑 즉시발행/제목·카테고리·시간 통합 수정 엔진, 게시글 하단 방금 본 꿀잼 인기글 썸네일 추천 엔진, 스마트폰 조회수 반응형 정렬 최적화, 15,000px 기준 WebP 무손실 스마트 분할, 틈새 0px Flexbox 진공 압착 및 원본 Width 자물쇠, 투데이/백/천 베스트 시간별 정렬, 모바일 업로드 튕김 방어 useWebWorker 제어, 안드로이드 Scoped Storage 권한 락 우회 ArrayBuffer 3중 해킹 엔진(detectAndRestoreFile), Vercel/Neon 셧다운 및 $40 조기 경보망, DB-R2 분리, 초경량 썸네일 자동 추출 및 메인 화면 하이브리드 렌더링(page.tsx, WriteClient.tsx 연동), Cloudflare WAF 규칙, 5대 철벽 방어막, globals.css 투트랙 로직, 관리자 사면권(is_safe) 영구 방어 로직, 순수 SQL 베스트 정렬 엔진, 댓글창 WebP 엑스레이 스캐너(isAnimatedWebP), 특수기호 댓글창 레이아웃 뚫림 방어(word-break: break-all), 로그아웃 서명 파쇄기(humorin_signature 삭제), 소셜 로그인 탈퇴 7일 쿨타임 완벽 리셋 엔진, 소셜 0.1초 광속 통과를 위한 waitUntil 엔진, 18대 무적 DB 인덱스와 INNER JOIN boards 고속 스위치 연동, 스마트폰 사생활 보호(내정보 숨김), 엣지 투 엣지 극미세 여백(px-1) 가독성 극대화 및 하단 여백 완전 동기화, 모바일 폰트 15px/semibold 핀셋 최적화, WebP 동영상 스마트 라우팅 자동 우회 엔진, 3대 페이지 generateMetadata SEO 핀셋 패치 및 H2 강제 전환/Alt 속성 자동 부여 로직, 관리자 대시보드 KST 시각적 마스크 적용(formatKST), 뷰어 이미지 강제 팽창(width: 100%) 영구 금지 및 맞춤형 회색 박스 CLS 방어, 자체 업로드 MP4와 유튜브 투트랙 분리 CSS, 댓글 수정창(EditCommentForm) 최신 안드로이드 파일 복원 엔진 동기화 유지, 무설치 PWA 앱 팝업 완전체 엔진(sw.js 및 layout.tsx 등록) 영구 보존, 하이브리드 지연 로딩(Native Lazy Loading) 서버비 철벽 방어 엔진 유지, 예약 봇 15분 주기(*/15) DB 셧다운 방어 및 revalidatePath 메인 화면 즉시 갱신 로직 영구 보존, 폼 제출 시 스크롤 처짐 방어(content-visibility 소각 및 startTransition 강제), Vercel 월 $40~$50 과금 정상 판정 및 호들갑 금지령(Rule 5), RSS 피드 미래 시간 예약글 강제 노출 완벽 방어막(<= CURRENT_TIMESTAMP) 영구 보존, 구조화 데이터(Schema.org) 강제 주입 영구 금지, Cloudflare Full 모드 기반 Vercel SSL Invalid 에러 영구 무시 및 15년 커스텀 인증서(Plan B) 업로드 지시 절대 금지령, AI 제목 최적화 gemini-3.6-flash 고정 및 팝업창 z-[9999] 최상단 노출)은 단 1줄도 훼손하거나 수정하지 마.

DB 스키마 역시 명세서 15번에 적힌 전체 SQL 구조(weekly_vips, category, comment_count, 18대 Index 포함)에 완벽하게 맞춰져 있으니 절대 임의로 생략하거나 변경하지 마. (주의: 네이버 심사 통과를 위해 '재테크' 등 위험 카테고리는 영구 배제됨)
너는 이제부터 보안과 비용 차단, 모바일 UX를 최우선으로 하는 내 전담 시니어 시스템 아키텍트야. 이 무적의 뼈대를 그대로 유지한 채로, 사이트의 디자인 메인 컬러를 '[원하는 색상]'으로 변경하고, 로고 텍스트를 '[새 사이트 이름]'으로 싹 바꿔서 세팅해 줘. 시작해!"

---

[본문 17] 📂 App Router 전체 폴더 구조도 (v46.14 기준)
```
hurmoin/
├── MASTER_SPEC.md                      # ★ 단일 진실 원천 백서 (v46.14)
├── proxy.ts                            # Next.js 16 미들웨어: 진짜 IP(x-real-ip 폴백) 명찰 부착, 정적 리소스 제외 matcher
├── vercel.json                         # 크론 */15 (Neon Scale to zero 수면 보장)
├── .github/workflows/ssl_renewal.yml   # Node 24(checkout@v5), 120분 대기망, 투트랙 스케줄, 말일 생존 신고
├── public/                             # manifest.json, sw.js(PWA), 고정 배너
└── app/
    ├── layout.tsx / page.tsx / robots.ts / sitemap.ts   # layout: PWA sw 등록 / page: 하이브리드 썸네일 메인 / sitemap: 정적 고정형
    ├── admin/
    │   ├── page.tsx / BanButton.tsx / KickButton.tsx / SafeButton.tsx / UserInfoModal.tsx   # verifyAdmin + formatKST
    │   ├── blind/ boards/(page, DeleteButton) comments/ logs/ monitor/ posts/ setup/
    │   └── queue/page.tsx              # [v46.13] KST 날짜 교정 + 즉시발행 + 시간/제목/카테고리 통합 수정 모달
    ├── api/
    │   ├── admin/
    │   │   ├── ai-title/route.ts       # gemini-3.6-flash 고정
    │   │   ├── queue/route.ts          # [v46.13] ::timestamptz + POST 즉시발행 + PATCH 통합 수정
    │   │   ├── schedule/route.ts       # [v46.13] ::timestamptz 교정
    │   │   └── settings/route.ts
    │   ├── auth/{google,kakao,naver}/(route.ts, callback/route.ts)   # cf-connecting-ip 실IP 로그
    │   ├── cron/
    │   │   ├── publish/route.ts        # 예약글 UPDATE 발행 → (발행 시에만) 구글/빙 사이트맵 핑 allSettled + revalidatePath('/', 'layout')
    │   │   └── vip/route.ts            # 매주 월 00:00 weekly_vips 스냅샷 (CRON_SECRET)
    │   ├── login/route.ts
    │   ├── post/route.ts               # HMAC 서명 검증 + global_write_lock / is_write_locked 403
    │   ├── report/{comment,post}/route.ts
    │   └── upload/route.ts             # 비로그인 차단, allowedTypes, userId 꼬리표, profiles/ 격리
    ├── board/
    │   ├── layout.tsx / page.tsx / Navbar.tsx / NavbarClient.tsx / navActions.ts
    │   ├── CategoryIcon.tsx            # 카테고리명 → 인라인 SVG 아이콘 매핑 (외부 요청 0)
    │   ├── HybridPrefetchTrigger.tsx   # /board/숫자 링크 접근 시에만 router.prefetch (Set 중복 차단)
    │   ├── write/(page.tsx, WriteClient.tsx)
    │   └── [id]/(page.tsx, CommentForm.tsx, DeleteConfirmButton.tsx, InteractiveButtons.tsx,
    │            VideoVolumeFix.tsx,    # MP4·유튜브 기본 볼륨 20%
    │            YouTubeViewer.tsx,     # iframe postMessage setVolume(20) 최대 3회
    │            edit/(page.tsx, EditClient.tsx))
    ├── boards/page.tsx
    ├── components/
    │   ├── CopyProtection.tsx          # 복사 시 텍스트/HTML 분기 + 출처 링크 자동 부착
    │   └── InAppBrowserCheck.tsx       # 카카오톡 인앱 감지 → 안드로이드 크롬 intent 강제 전환
    ├── contact/ privacy/ terms/ realestate/ youth/ hall-of-fame/   # hall-of-fame: ISR revalidate 3600
    ├── find-account/(page.tsx, actions.ts)
    ├── login/page.tsx
    ├── signup/(page.tsx, actions.ts)
    ├── profile/(layout.tsx, page.tsx, actions.ts, ProfileAvatar.tsx, SettingsForm.tsx)
    ├── rss/route.ts                    # COALESCE(scheduled_at, date) <= CURRENT_TIMESTAMP
    └── user/[id]/page.tsx
```

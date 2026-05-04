// @ts-nocheck
import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import crypto from 'crypto';
import BanButton from './BanButton';

export const dynamic = 'force-dynamic';

const SECRET_KEY = process.env.AUTH_SECRET || 'humorin-super-secret-key-2026-very-safe';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('humorin_userid')?.value;
  const signature = cookieStore.get('humorin_signature')?.value;

  if (!userId) return false;

  if (signature) {
    const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(userId).digest('hex');
    if (signature !== expectedSignature) return false;
  }

  try {
    if (userId === 'admin') return true;
    const { rows } = await sql`SELECT is_admin FROM users WHERE user_id = ${userId}`;
    if (rows.length > 0 && rows[0].is_admin) return true;
  } catch (error) { }
  return false;
}

async function updateUserStatus(formData: FormData) {
  'use server';
  if (!(await verifyAdmin())) throw new Error("Unauthorized");
  const targetUser = formData.get('userid') as string;
  const newStatus = formData.get('status') as string;
  try { await sql`UPDATE users SET status = ${newStatus} WHERE user_id = ${targetUser}`; } catch (error) { }
  revalidatePath('/admin');
}

async function resetPassword(formData: FormData) {
  'use server';
  if (!(await verifyAdmin())) throw new Error("Unauthorized");
  const targetUser = formData.get('userid') as string;
  try { await sql`UPDATE users SET password = '000000' WHERE user_id = ${targetUser}`; } catch (error) { }
  revalidatePath('/admin');
}

async function updateUserPoints(formData: FormData) {
  'use server';
  if (!(await verifyAdmin())) throw new Error("Unauthorized");
  const targetUser = formData.get('userid') as string;
  const newPoints = Number(formData.get('points'));
  try { await sql`UPDATE users SET points = ${newPoints} WHERE user_id = ${targetUser}`; } catch (error) { }
  revalidatePath('/admin');
}

async function toggleAdminRole(formData: FormData) {
  'use server';
  if (!(await verifyAdmin())) throw new Error("Unauthorized");
  const targetUser = formData.get('userid') as string;
  const currentAdminStatus = formData.get('is_admin') === 'true';
  const newAdminStatus = !currentAdminStatus;
  if (targetUser === 'admin') return;
  try { await sql`UPDATE users SET is_admin = ${newAdminStatus} WHERE user_id = ${targetUser}`; } catch (error) { }
  revalidatePath('/admin');
}

async function updateBlindThreshold(formData: FormData) {
  'use server';
  if (!(await verifyAdmin())) throw new Error("Unauthorized");
  const newValue = formData.get('threshold') as string;
  if (!newValue) return;
  try {
    await sql`
      INSERT INTO site_settings (key, value) VALUES ('report_blind_threshold', ${newValue})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;
  } catch (error) { }
  revalidatePath('/admin');
}

async function updateEditorPlaceholder(formData: FormData) {
  'use server';
  if (!(await verifyAdmin())) throw new Error("Unauthorized");
  const newValue = formData.get('placeholder') as string;
  if (!newValue) return;
  try {
    await sql`
      INSERT INTO site_settings (key, value) VALUES ('editor_placeholder', ${newValue})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;
  } catch (error) { }
  revalidatePath('/admin');
}

// 💡 메인 배너 문구 업데이트 액션
async function updateMainBanner(formData: FormData) {
  'use server';
  if (!(await verifyAdmin())) throw new Error("Unauthorized");
  const title = formData.get('title') as string;
  const subtitle = formData.get('subtitle') as string;
  if (!title || !subtitle) return;
  try {
    await sql`
      INSERT INTO site_settings (key, value) VALUES ('main_banner_title', ${title})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;
    await sql`
      INSERT INTO site_settings (key, value) VALUES ('main_banner_subtitle', ${subtitle})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;
  } catch (error) { }
  revalidatePath('/'); // 메인 페이지 즉시 새로고침
  revalidatePath('/admin');
}

async function banIpAddress(formData: FormData) {
  'use server';
  if (!(await verifyAdmin())) throw new Error("Unauthorized");
  const targetIp = formData.get('ip') as string;
  if (!targetIp || targetIp === '알수없음' || targetIp === '::1') return;

  try {
    const { rows } = await sql`SELECT value FROM site_settings WHERE key = 'banned_ips'`;
    let currentBanned = rows.length > 0 && rows[0].value ? rows[0].value : '';
    let bannedArray = currentBanned ? currentBanned.split(',') : [];

    if (!bannedArray.includes(targetIp)) {
      bannedArray.push(targetIp);
      const newBannedStr = bannedArray.join(',');
      await sql`
        INSERT INTO site_settings (key, value) VALUES ('banned_ips', ${newBannedStr})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `;
    }
  } catch (error) { }
  revalidatePath('/admin');
}

export default async function AdminDashboardPage(props: any) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) redirect('/');

  const searchParams = await props.searchParams;
  const currentPage = Number(searchParams?.page) || 1;
  const q = searchParams?.q || '';
  const type = searchParams?.type || 'userid';
  const limit = 50;
  const offset = (currentPage - 1) * limit;

  let totalUsers = 0; let todayUsers = 0; let bannedUsers = 0;
  let userList: any[] = []; let totalPages = 1;
  let blindThreshold = 5;
  let editorPlaceholder = '내용을 작성해 주십시오. 유튜브 영상은 주소를 이곳에 붙여넣기(Ctrl+V) 하시면 자동으로 추가됩니다.';
  let bannedIpsString = '';
  let mainBannerTitle = '세상의 모든 웃음이 있는 곳 유머인 입니다.';
  let mainBannerSubtitle = '함께 웃고, 나누고, 소통하는 우리들의 따뜻한 공간 유머인.';

  try {
    const { rows: settings } = await sql`SELECT key, value FROM site_settings WHERE key IN ('report_blind_threshold', 'editor_placeholder', 'banned_ips', 'main_banner_title', 'main_banner_subtitle')`;
    settings.forEach(setting => {
      if (setting.key === 'report_blind_threshold') blindThreshold = Number(setting.value) || 5;
      if (setting.key === 'editor_placeholder' && setting.value) editorPlaceholder = setting.value;
      if (setting.key === 'banned_ips' && setting.value) bannedIpsString = setting.value;
      if (setting.key === 'main_banner_title' && setting.value) mainBannerTitle = setting.value;
      if (setting.key === 'main_banner_subtitle' && setting.value) mainBannerSubtitle = setting.value;
    });

    const { rows: stats } = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as today,
        COUNT(CASE WHEN status != 'active' THEN 1 END) as banned
      FROM users
    `;
    totalUsers = Number(stats[0]?.total) || 0;
    todayUsers = Number(stats[0]?.today) || 0;
    bannedUsers = Number(stats[0]?.banned) || 0;

    let countResult;
    let queryResult;

    if (q && type === 'userid') {
      countResult = await sql`SELECT COUNT(*) FROM users WHERE user_id ILIKE ${'%' + q + '%'}`;
      queryResult = await sql`SELECT u.*, (SELECT COUNT(*) FROM posts p WHERE p.author = u.user_id) as post_count FROM users u WHERE u.user_id ILIKE ${'%' + q + '%'} ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (q && type === 'nickname') {
      countResult = await sql`SELECT COUNT(*) FROM users WHERE nickname ILIKE ${'%' + q + '%'}`;
      queryResult = await sql`SELECT u.*, (SELECT COUNT(*) FROM posts p WHERE p.author = u.user_id) as post_count FROM users u WHERE u.nickname ILIKE ${'%' + q + '%'} ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (q && type === 'ip') {
      countResult = await sql`SELECT COUNT(*) FROM users WHERE ip ILIKE ${'%' + q + '%'}`;
      queryResult = await sql`SELECT u.*, (SELECT COUNT(*) FROM posts p WHERE p.author = u.user_id) as post_count FROM users u WHERE u.ip ILIKE ${'%' + q + '%'} ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    } else {
      countResult = await sql`SELECT COUNT(*) FROM users`;
      queryResult = await sql`SELECT u.*, (SELECT COUNT(*) FROM posts p WHERE p.author = u.user_id) as post_count FROM users u ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    }

    const currentSearchTotal = Number(countResult.rows[0].count);
    totalPages = Math.ceil(currentSearchTotal / limit) || 1;

    userList = queryResult.rows.map(row => {
      const formatDate = (date: any) => {
        if (!date) return '-';
        try {
          const d = new Date(date);
          return `${d.getFullYear().toString().slice(2)}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } catch (e) { return '-'; }
      };
      return {
        ...row,
        userid: row.user_id,
        created_at: formatDate(row.created_at),
        last_login: formatDate(row.last_login),
        ip: row.ip
      };
    });
  } catch (e) { }

  const bannedIpsArray = bannedIpsString ? bannedIpsString.split(',') : [];

  const csvHeader = "No,아이디,닉네임,가입일,최근로그인,IP,게시글수,포인트,상태,관리자여부\n";
  const csvRows = userList.map((user, idx) => {
    return `${offset + idx + 1},"${user.userid}","${user.nickname || ''}","${user.created_at}","${user.last_login}","${user.ip || '알수없음'}","${user.post_count || 0}","${user.points || 0}","${user.status}","${user.is_admin ? 'O' : 'X'}"`;
  }).join('\n');
  const csvString = '\uFEFF' + csvHeader + csvRows;
  const csvDataUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvString);

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <aside className="w-60 bg-[#2a3042] text-gray-300 flex flex-col shadow-xl z-20 flex-shrink-0">
        <div className="p-5 border-b border-gray-700/50 bg-[#1e2330]">
          <Link href="/" className="text-2xl font-black text-white tracking-tighter hover:text-indigo-400 transition-colors">HUMORIN <span className="text-xs text-indigo-400 align-top">ADMIN</span></Link>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1">
            <li><Link href="/admin" className="flex items-center gap-3 px-6 py-3 bg-[#3b4890] text-white font-bold border-l-4 border-indigo-300"><span>👥</span> 회원 관리</Link></li>
            <li><Link href="/admin/logs" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100 text-gray-300"><span>📜</span> 로그 관리</Link></li>
            <li><Link href="/admin/posts" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100"><span>📝</span> 게시글 관리</Link></li>
            <li><Link href="/admin/comments" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100"><span>💬</span> 댓글 관리</Link></li>
            <li><Link href="/admin/boards" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100"><span>⚙️</span> 설정/게시판 관리</Link></li>
            <li><Link href="/admin/blind" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100"><span>🚨</span> 블라인드 관리</Link></li>
            <li className="mt-4 border-t border-gray-700 pt-4">
              <Link href="/admin/monitor" target="_blank" className="flex items-center justify-between px-6 py-3 font-black text-emerald-400 bg-slate-800 hover:bg-slate-700 transition-colors border-l-4 border-emerald-500 shadow-inner">
                <div className="flex items-center gap-3"><span>🖥️</span> 서버 모니터링</div>
                <span className="text-xs">↗</span>
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center z-10 shadow-sm flex-shrink-0">
          <h1 className="text-xl font-black text-gray-800 tracking-tight">회원 관리 & 기본 설정</h1>
          <div className="flex items-center gap-6">
            <Link href="/admin/monitor" target="_blank" className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-800 text-emerald-400 text-xs font-black rounded-sm hover:bg-slate-700 transition-colors shadow-sm border border-slate-600">
              <span>🖥️</span> 종합 모니터링 관제센터 열기 ↗
            </Link>
            <div className="text-sm font-bold text-gray-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>서버 정상 가동중
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm"><p className="text-[11px] font-bold text-gray-500 mb-1">총 회원</p><p className="text-xl font-black text-gray-800">{totalUsers}</p></div>
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm"><p className="text-[11px] font-bold text-gray-500 mb-1">오늘 신규가입</p><p className="text-xl font-black text-rose-500">+{todayUsers}</p></div>
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm"><p className="text-[11px] font-bold text-gray-500 mb-1">차단/정지 회원</p><p className="text-xl font-black text-gray-800">{bannedUsers}</p></div>
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm flex items-center justify-between"><div><p className="text-[11px] font-bold text-gray-500 mb-1">현재 페이지</p><p className="text-xl font-black text-indigo-600">{currentPage} / {totalPages}</p></div></div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded-sm border border-rose-200 shadow-sm flex flex-col justify-between gap-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>
              <div>
                <h2 className="text-[14px] font-black text-gray-800 flex items-center gap-1.5"><span className="text-rose-500">🚨</span> 자동 블라인드 기준 설정</h2>
                <p className="text-[11px] font-bold text-gray-500 mt-0.5 pl-6">게시글이나 댓글이 설정된 횟수만큼 신고를 받으면 즉시 블라인드 처리됩니다.</p>
              </div>
              <form action={updateBlindThreshold} className="flex items-center gap-2 bg-gray-50 p-2 rounded-sm border border-gray-200 mt-auto">
                <input type="number" name="threshold" defaultValue={blindThreshold} min="1" max="999" className="w-16 px-2 py-1.5 border border-gray-300 rounded-sm text-[13px] font-black text-rose-600 text-center outline-none focus:border-rose-400" />
                <span className="text-[12px] font-bold text-gray-600">회 누적 시 숨김</span>
                <button type="submit" className="px-4 py-1.5 bg-gray-800 text-white text-[11px] font-bold rounded-sm hover:bg-gray-900 transition-colors shadow-sm ml-auto">적용하기</button>
              </form>
            </div>

            <div className="bg-white p-4 rounded-sm border border-indigo-200 shadow-sm flex flex-col justify-between gap-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
              <div>
                <h2 className="text-[14px] font-black text-gray-800 flex items-center gap-1.5"><span className="text-indigo-500">📝</span> 에디터 안내 문구 설정</h2>
                <p className="text-[11px] font-bold text-gray-500 mt-0.5 pl-6">게시판 글쓰기 창에 기본 보여지는 흐린 안내 문구를 수정할 수 있습니다.</p>
              </div>
              <form action={updateEditorPlaceholder} className="flex flex-col sm:flex-row items-center gap-2 bg-gray-50 p-2 rounded-sm border border-gray-200 mt-auto">
                <input type="text" name="placeholder" defaultValue={editorPlaceholder} className="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-[12px] font-bold text-gray-700 outline-none focus:border-indigo-400" placeholder="안내 문구를 입력하세요..." />
                <button type="submit" className="w-full sm:w-auto px-4 py-1.5 bg-gray-800 text-white text-[11px] font-bold rounded-sm hover:bg-gray-900 transition-colors shadow-sm whitespace-nowrap">적용하기</button>
              </form>
            </div>
          </div>

          <div className="bg-white p-4 rounded-sm border border-amber-300 shadow-sm mb-6 flex flex-col xl:flex-row xl:items-start justify-between gap-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400"></div>
            <div className="flex-1">
              <h2 className="text-[14px] font-black text-gray-800 flex items-center gap-1.5"><span className="text-amber-500">📢</span> 메인 배너 문구 동적 설정</h2>
              <p className="text-[11px] font-bold text-gray-500 mt-0.5 pl-6">
                추모, 명절 인사, 이벤트 등 시의적절하게 사이트 메인 간판 문구를 변경하세요.<br />
                <span className="text-amber-600 font-black">* 꿀팁:</span> 문구 중에 <span className="font-black text-gray-800">유머인</span> 이라는 글자가 포함되면 <span className="bg-yellow-400 text-white px-1 py-0.5 rounded-sm">자동으로 노란색 강조 처리</span>가 됩니다.
              </p>
            </div>
            <form action={updateMainBanner} className="flex flex-col gap-2 bg-gray-50 p-3 rounded-sm border border-gray-200 w-full xl:w-[500px]">
              <input type="text" name="title" defaultValue={mainBannerTitle} className="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-[13px] font-black text-gray-800 outline-none focus:border-amber-400" placeholder="메인 제목 (예: 세상의 모든 웃음이 있는 곳 유머인 입니다.)" />
              <input type="text" name="subtitle" defaultValue={mainBannerSubtitle} className="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-[12px] font-bold text-gray-600 outline-none focus:border-amber-400" placeholder="서브 설명 (예: 함께 웃고, 나누고, 소통하는 우리들의 따뜻한 공간 유머인.)" />
              <button type="submit" className="px-4 py-2 mt-1 bg-gray-800 text-white text-[11px] font-bold rounded-sm hover:bg-gray-900 transition-colors shadow-sm text-center">메인 배너 문구 실시간 적용하기</button>
            </form>
          </div>

          <div className="bg-white p-3 rounded-sm border border-gray-200 shadow-sm mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-sm font-black text-[#3b4890] flex items-center gap-1"><span>🔍</span> 악성 유저 추적 검색</h2>
            <div className="flex items-center gap-4 flex-wrap">
              <form method="GET" action="/admin" className="flex items-center gap-2">
                <select name="type" defaultValue={type} className="text-xs font-bold border border-gray-300 p-1.5 rounded-sm outline-none bg-white text-gray-700">
                  <option value="userid">아이디</option>
                  <option value="nickname">닉네임</option>
                  <option value="ip">접속 IP</option>
                </select>
                <input type="text" name="q" defaultValue={q} placeholder="검색어 입력..." className="text-xs font-bold border border-gray-300 p-1.5 rounded-sm outline-none w-48 focus:border-[#3b4890]" />
                <button type="submit" className="px-4 py-1.5 bg-[#414a66] text-white text-xs font-bold rounded-sm hover:bg-[#2a3042] shadow-sm">검색</button>
                {q && <Link href="/admin" className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs font-bold rounded-sm hover:bg-gray-50">초기화</Link>}
              </form>

              <div className="flex flex-col items-end gap-1.5">
                <a
                  href={csvDataUri}
                  download={`유머인_회원관리_${new Date().toISOString().slice(0, 10)}.csv`}
                  className="px-4 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs font-black rounded-sm flex items-center justify-center gap-1 transition-colors shadow-sm w-full whitespace-nowrap"
                >
                  📥 현재 목록 엑셀 저장
                </a>
                <a
                  href="https://console.neon.tech/app/projects/broad-sea-43444817/branches/br-square-band-aibyzdjw/tables?database=neondb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-0.5 whitespace-nowrap"
                >
                  🗄️ 전체 회원 명단 다운로드는 Neon Database에서 실행 ↗
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="overflow-auto w-full max-h-[65vh]">
              <table className="w-full text-left border-collapse whitespace-nowrap table-fixed min-w-[1150px]">
                <colgroup><col style={{ width: '5%' }} /><col style={{ width: '13%' }} /><col style={{ width: '14%' }} /><col style={{ width: '10%' }} /><col style={{ width: '8%' }} /><col style={{ width: '8%' }} /><col style={{ width: '42%' }} /></colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b-2 border-gray-300 text-[11px] text-gray-600 font-black tracking-wider uppercase shadow-sm">
                    <th className="px-3 py-2.5 text-center">No</th><th className="px-3 py-2.5">회원 정보</th><th className="px-3 py-2.5">가입/로그인</th><th className="px-3 py-2.5 text-center text-red-600">접속 IP</th><th className="px-3 py-2.5 text-center">활동</th><th className="px-3 py-2.5 text-center">상태</th><th className="px-3 py-2.5 text-center border-l border-gray-200">관리 액션</th>
                  </tr>
                </thead>
                <tbody>
                  {userList.map((user, index) => {
                    const isBannedIp = bannedIpsArray.includes(user.ip);
                    return (
                      <tr key={user.userid} className={`border-b border-gray-100 transition-colors ${isBannedIp ? 'bg-red-50/50' : 'hover:bg-indigo-50/50 bg-white'}`}>
                        <td className="px-3 py-1.5 text-center text-gray-400 font-medium text-[11px]">{offset + index + 1}</td>
                        <td className="px-3 py-1.5 whitespace-normal break-words">
                          <div className="font-bold text-[#3b4890] text-[12px] truncate flex items-center gap-1.5" title={user.userid}>
                            {user.userid}
                            {user.is_admin && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 border border-purple-200 text-[9px] rounded-sm font-black tracking-tighter">ADMIN</span>}
                          </div>
                          <div className="text-gray-500 text-[11px] mt-0.5 leading-tight line-clamp-2" title={user.nickname}>{user.nickname}</div>
                        </td>
                        <td className="px-3 py-1.5 text-[11px] text-gray-500">
                          <div className="mb-0.5"><span className="text-gray-400 w-6 inline-block">가입</span>{user.created_at}</div>
                          <div><span className="text-gray-400 w-6 inline-block">최근</span>{user.last_login}</div>
                        </td>
                        <td className="px-3 py-1.5 text-center text-[11px] font-black tracking-tighter text-red-500">
                          {user.ip || '알수없음'}
                          {isBannedIp && <div className="text-[9px] text-red-600 mt-0.5 border border-red-200 bg-red-100 rounded-sm inline-block px-1">차단됨</div>}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <div className="text-[11px] font-bold text-gray-600 mb-0.5">글 {Number(user.post_count)}</div>
                          <div className="text-[11px] font-bold text-rose-500">{user.points || 0} P</div>
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {user.status === 'active' && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-100">정상</span>}
                          {user.status === 'banned' && <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-sm border border-rose-100">정지</span>}
                          {user.status === 'shadow_banned' && <span className="text-[10px] font-black text-gray-600 bg-gray-100 px-2 py-0.5 rounded-sm border border-gray-200">그림자</span>}
                        </td>
                        <td className="px-3 py-1.5 border-l border-gray-100">
                          <div className="flex justify-center items-center gap-1.5 flex-wrap">
                            <form action={updateUserStatus} className="flex items-center gap-1">
                              <input type="hidden" name="userid" value={user.userid} />
                              <select name="status" defaultValue={user.status} className="text-[11px] font-bold px-1 py-1 rounded-sm border outline-none cursor-pointer w-14 text-gray-600">
                                <option value="active">정상</option><option value="shadow_banned">그림자</option><option value="banned">정지</option>
                              </select>
                              <button type="submit" className="px-2 py-1 text-[10px] font-bold bg-white border border-gray-300 rounded-sm hover:bg-gray-50 text-gray-700">상태변경</button>
                            </form>
                            <form action={updateUserPoints} className="flex items-center gap-1 border-l pl-1.5">
                              <input type="hidden" name="userid" value={user.userid} />
                              <input type="number" name="points" defaultValue={user.points || 0} className="text-[11px] font-bold px-1 py-1 rounded-sm border outline-none w-14 text-gray-800" />
                              <button type="submit" className="px-2 py-1 text-[10px] font-bold bg-blue-50 border border-blue-200 rounded-sm hover:bg-blue-100 text-blue-700">P수정</button>
                            </form>
                            <form action={resetPassword} className="border-l pl-1.5">
                              <input type="hidden" name="userid" value={user.userid} />
                              <button type="submit" className="px-2 py-1 text-[10px] font-bold bg-amber-50 border border-amber-300 rounded-sm hover:bg-amber-100 text-amber-700">비번리셋</button>
                            </form>
                            <form action={banIpAddress} className="border-l pl-1.5">
                              <input type="hidden" name="ip" value={user.ip} />
                              <BanButton ip={user.ip} isBannedIp={isBannedIp} />
                            </form>
                            {user.userid !== 'admin' && (
                              <form action={toggleAdminRole} className="border-l pl-1.5">
                                <input type="hidden" name="userid" value={user.userid} />
                                <input type="hidden" name="is_admin" value={user.is_admin ? 'true' : 'false'} />
                                <button type="submit" className={`px-2 py-1 text-[10px] font-bold rounded-sm transition-colors shadow-sm ${user.is_admin
                                    ? 'bg-purple-100 border border-purple-300 text-purple-700 hover:bg-purple-200'
                                    : 'bg-gray-800 border border-gray-900 text-white hover:bg-gray-700'
                                  }`}>
                                  {user.is_admin ? '권한 회수' : '👑 부관리자 임명'}
                                </button>
                              </form>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {userList.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-gray-400 font-bold">조건에 맞는 회원이 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-center flex-shrink-0">
              <div className="flex gap-2">
                <Link href={`/admin?page=${currentPage - 1}${q ? `&q=${q}&type=${type}` : ''}`} className={`px-3 py-1 border border-gray-300 bg-white text-gray-500 text-[11px] font-bold rounded-sm hover:bg-gray-50 ${currentPage <= 1 ? 'pointer-events-none opacity-40' : ''}`}>◀ 이전</Link>
                <div className="px-4 py-1 font-black text-gray-700 text-[12px]">{currentPage} <span className="text-gray-400 font-medium">/ {totalPages}</span></div>
                <Link href={`/admin?page=${currentPage + 1}${q ? `&q=${q}&type=${type}` : ''}`} className={`px-3 py-1 border border-gray-300 bg-white text-gray-500 text-[11px] font-bold rounded-sm hover:bg-gray-50 ${currentPage >= totalPages ? 'pointer-events-none opacity-40' : ''}`}>다음 ▶</Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
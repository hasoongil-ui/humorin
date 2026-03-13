// @ts-nocheck
import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function updateUserStatus(formData: FormData) {
  'use server';
  const targetUser = formData.get('userid') as string;
  const newStatus = formData.get('status') as string;
  try {
    await sql`UPDATE users SET status = ${newStatus} WHERE user_id = ${targetUser}`;
  } catch (error) {}
  revalidatePath('/admin');
}

async function resetPassword(formData: FormData) {
  'use server';
  const targetUser = formData.get('userid') as string;
  try {
    await sql`UPDATE users SET password = '000000' WHERE user_id = ${targetUser}`;
  } catch (error) {}
  revalidatePath('/admin');
}

async function updateUserPoints(formData: FormData) {
  'use server';
  const targetUser = formData.get('userid') as string;
  const newPoints = Number(formData.get('points'));
  try {
    await sql`UPDATE users SET points = ${newPoints} WHERE user_id = ${targetUser}`;
  } catch (error) {}
  revalidatePath('/admin');
}

// 💡 [새로 추가된 마법!] 부관리자 임명/해제 서버 액션
async function toggleAdminRole(formData: FormData) {
  'use server';
  const targetUser = formData.get('userid') as string;
  const currentAdminStatus = formData.get('is_admin') === 'true';
  const newAdminStatus = !currentAdminStatus; // 상태 반전 (true <-> false)
  
  // 최고 관리자(admin)는 절대 건드릴 수 없도록 철통 방어!
  if (targetUser === 'admin') return; 

  try {
    await sql`UPDATE users SET is_admin = ${newAdminStatus} WHERE user_id = ${targetUser}`;
  } catch (error) {}
  revalidatePath('/admin');
}

export default async function AdminDashboardPage(props: any) {
  const cookieStore = await cookies();
  const currentUserId = cookieStore.get('ojemi_userid')?.value;
  if (currentUserId !== 'admin') redirect('/'); 

  const searchParams = await props.searchParams;
  const currentPage = Number(searchParams?.page) || 1;
  const limit = 50;
  const offset = (currentPage - 1) * limit;

  let totalUsers = 0; let todayUsers = 0; let bannedUsers = 0;
  let userList: any[] = []; let totalPages = 1;

  try {
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
    
    totalPages = Math.ceil(totalUsers / limit) || 1;

    // 💡 [수정됨] DB 쿼리에서 is_admin 값도 가져오도록 추가!
    const { rows } = await sql`
      SELECT 
        u.id, u.user_id as userid, u.nickname, u.points,
        COALESCE(u.ip, '알수없음') as ip, 
        COALESCE(u.status, 'active') as status,
        u.created_at, COALESCE(u.last_login, u.created_at) as last_login,
        (SELECT COUNT(*) FROM posts p WHERE p.author = u.user_id) as post_count,
        COALESCE(u.is_admin, false) as is_admin
      FROM users u
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    userList = rows.map(row => {
      const formatDate = (date: any) => {
        if (!date) return '-';
        try {
          const d = new Date(date);
          return `${d.getFullYear().toString().slice(2)}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } catch(e) { return '-'; }
      };
      return { ...row, created_at: formatDate(row.created_at), last_login: formatDate(row.last_login) };
    });
  } catch (e) {}

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <aside className="w-60 bg-[#2a3042] text-gray-300 flex flex-col shadow-xl z-20 flex-shrink-0">
        <div className="p-5 border-b border-gray-700/50 bg-[#1e2330]">
          <Link href="/" className="text-2xl font-black text-white tracking-tighter hover:text-indigo-400 transition-colors">OJEMI <span className="text-xs text-indigo-400 align-top">ADMIN</span></Link>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1">
            <li><Link href="/admin" className="flex items-center gap-3 px-6 py-3 bg-[#3b4890] text-white font-bold border-l-4 border-indigo-300"><span>👥</span> 회원 관리</Link></li>
            <li><Link href="/admin/posts" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100"><span>📝</span> 게시글 관리</Link></li>
            <li><Link href="/admin/comments" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100"><span>💬</span> 댓글 관리</Link></li>
            <li><Link href="/admin/boards" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100"><span>⚙️</span> 설정/게시판 관리</Link></li>
          </ul>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center z-10 shadow-sm flex-shrink-0">
          <h1 className="text-xl font-black text-gray-800 tracking-tight">회원 관리</h1>
          <div className="text-sm font-bold text-gray-500 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>서버 정상 가동중</div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm"><p className="text-[11px] font-bold text-gray-500 mb-1">총 회원</p><p className="text-xl font-black text-gray-800">{totalUsers}</p></div>
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm"><p className="text-[11px] font-bold text-gray-500 mb-1">오늘 신규가입</p><p className="text-xl font-black text-rose-500">+{todayUsers}</p></div>
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm"><p className="text-[11px] font-bold text-gray-500 mb-1">차단/정지 회원</p><p className="text-xl font-black text-gray-800">{bannedUsers}</p></div>
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm flex items-center justify-between"><div><p className="text-[11px] font-bold text-gray-500 mb-1">현재 페이지</p><p className="text-xl font-black text-indigo-600">{currentPage} / {totalPages}</p></div></div>
          </div>

          <div suppressHydrationWarning className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div suppressHydrationWarning className="overflow-x-auto w-full">
              <table suppressHydrationWarning className="w-full text-left border-collapse whitespace-nowrap table-fixed min-w-[1050px]">
                <colgroup><col style={{ width: '5%' }} /><col style={{ width: '15%' }} /><col style={{ width: '15%' }} /><col style={{ width: '10%' }} /><col style={{ width: '8%' }} /><col style={{ width: '7%' }} /><col style={{ width: '40%' }} /></colgroup>
                <thead suppressHydrationWarning>
                  <tr className="bg-white border-b border-gray-300 text-[11px] text-gray-500 font-black tracking-wider uppercase">
                    <th className="px-3 py-2 text-center">No</th><th className="px-3 py-2">회원 정보</th><th className="px-3 py-2">가입/로그인</th><th className="px-3 py-2">IP 주소</th><th className="px-3 py-2 text-center">활동</th><th className="px-3 py-2 text-center">상태</th><th className="px-3 py-2 text-center border-l border-gray-100">관리 액션</th>
                  </tr>
                </thead>
                <tbody suppressHydrationWarning>
                  {userList.map((user, index) => (
                    <tr key={user.id} suppressHydrationWarning className="border-b border-gray-100 hover:bg-indigo-50/50 transition-colors">
                      <td className="px-3 py-1.5 text-center text-gray-400 font-medium text-[11px]">{offset + index + 1}</td>
                      <td className="px-3 py-1.5 whitespace-normal break-words">
                        <div className="font-bold text-[#3b4890] text-[12px] truncate flex items-center gap-1.5" title={user.userid}>
                          {user.userid}
                          {/* 💡 [미나 추가] 관리자 뱃지 UI */}
                          {user.is_admin && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 border border-purple-200 text-[9px] rounded-sm font-black tracking-tighter">ADMIN</span>}
                        </div>
                        <div className="text-gray-500 text-[11px] mt-0.5 leading-tight line-clamp-2" title={user.nickname}>{user.nickname}</div>
                      </td>
                      <td className="px-3 py-1.5 text-[11px] text-gray-500">
                        <div className="mb-0.5"><span className="text-gray-400 w-6 inline-block">가입</span>{user.created_at}</div>
                        <div><span className="text-gray-400 w-6 inline-block">최근</span>{user.last_login}</div>
                      </td>
                      <td className="px-3 py-1.5"><div className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-sm inline-block truncate max-w-full ${user.ip !== '알수없음' && user.ip.startsWith('211.55') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-100 text-gray-600'}`}>{user.ip}</div></td>
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
                        {/* 💡 액션 버튼들을 한 줄로 예쁘게 배치! */}
                        <div className="flex justify-center items-center gap-1.5 flex-wrap">
                          <form action={updateUserStatus} className="flex items-center gap-1">
                            <input type="hidden" name="userid" value={user.userid} />
                            <select name="status" defaultValue={user.status} className="text-[11px] font-bold px-1 py-1 rounded-sm border outline-none cursor-pointer w-14 text-gray-600">
                              <option value="active">정상</option><option value="shadow_banned">그림자</option><option value="banned">정지</option>
                            </select>
                            <button type="submit" className="px-2 py-1 text-[10px] font-bold bg-white border border-gray-300 rounded-sm hover:bg-gray-50 text-gray-700">변경</button>
                          </form>
                          <form action={updateUserPoints} className="flex items-center gap-1 border-l pl-1.5">
                            <input type="hidden" name="userid" value={user.userid} />
                            <input type="number" name="points" defaultValue={user.points || 0} className="text-[11px] font-bold px-1 py-1 rounded-sm border outline-none w-14 text-gray-800" />
                            <button type="submit" className="px-2 py-1 text-[10px] font-bold bg-blue-50 border border-blue-200 rounded-sm hover:bg-blue-100 text-blue-700">P수정</button>
                          </form>
                          <form action={resetPassword} className="border-l pl-1.5">
                            <input type="hidden" name="userid" value={user.userid} />
                            <button type="submit" className="px-2 py-1 text-[10px] font-bold bg-amber-50 border border-amber-300 rounded-sm hover:bg-amber-100 text-amber-700">비번 리셋</button>
                          </form>
                          {/* 💡 [미나 추가] 관리자 임명 / 해제 토글 버튼 */}
                          {user.userid !== 'admin' && (
                            <form action={toggleAdminRole} className="border-l pl-1.5">
                              <input type="hidden" name="userid" value={user.userid} />
                              <input type="hidden" name="is_admin" value={user.is_admin ? 'true' : 'false'} />
                              <button type="submit" className={`px-2 py-1 text-[10px] font-bold rounded-sm transition-colors shadow-sm ${
                                user.is_admin 
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
                  ))}
                </tbody>
              </table>
            </div>
            
            <div suppressHydrationWarning className="p-3 border-t border-gray-200 bg-gray-50 flex justify-center flex-shrink-0">
               <div className="flex gap-2">
                 <Link href={`/admin?page=${currentPage - 1}`} className={`px-3 py-1 border border-gray-300 bg-white text-gray-500 text-[11px] font-bold rounded-sm hover:bg-gray-50 ${currentPage <= 1 ? 'pointer-events-none opacity-40' : ''}`}>◀ 이전</Link>
                 <div className="px-4 py-1 font-black text-gray-700 text-[12px]">{currentPage} <span className="text-gray-400 font-medium">/ {totalPages}</span></div>
                 <Link href={`/admin?page=${currentPage + 1}`} className={`px-3 py-1 border border-gray-300 bg-white text-gray-500 text-[11px] font-bold rounded-sm hover:bg-gray-50 ${currentPage >= totalPages ? 'pointer-events-none opacity-40' : ''}`}>다음 ▶</Link>
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
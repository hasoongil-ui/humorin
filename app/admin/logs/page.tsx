// @ts-nocheck
import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import crypto from 'crypto';

const SECRET_KEY = process.env.AUTH_SECRET || 'ojemi-super-secret-key-2026-very-safe';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('ojemi_userid')?.value;
  const signature = cookieStore.get('ojemi_signature')?.value; 
  if (!userId) return false;
  if (signature) {
    const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(userId).digest('hex');
    if (signature !== expectedSignature) return false;
  }
  try {
    if (userId === 'admin') return true;
    const { rows } = await sql`SELECT is_admin FROM users WHERE user_id = ${userId}`;
    return rows.length > 0 && rows[0].is_admin;
  } catch { return false; }
}

export default async function AdminLogsPage(props: any) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) redirect('/');

  const searchParams = await props.searchParams;
  const currentPage = Number(searchParams?.page) || 1;
  const q = searchParams?.q || '';
  const limit = 50;
  const offset = (currentPage - 1) * limit;

  let logs: any[] = [];
  let totalLogs = 0;
  let totalPages = 1;

  try {
    // 로그 총 개수 파악
    const countRes = q 
      ? await sql`SELECT COUNT(*) FROM access_logs WHERE user_id ILIKE ${'%' + q + '%'} OR ip_address ILIKE ${'%' + q + '%'}`
      : await sql`SELECT COUNT(*) FROM access_logs`;
    
    totalLogs = Number(countRes.rows[0].count);
    totalPages = Math.ceil(totalLogs / limit) || 1;

    // 로그 목록 가져오기 (최신순)
    const logRes = q
      ? await sql`SELECT * FROM access_logs WHERE user_id ILIKE ${'%' + q + '%'} OR ip_address ILIKE ${'%' + q + '%'} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
      : await sql`SELECT * FROM access_logs ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    
    logs = logRes.rows;
  } catch (e) { console.error(e); }

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      {/* 사이드바 (기존과 동일하되 메뉴 추가) */}
      <aside className="w-60 bg-[#2a3042] text-gray-300 flex flex-col shadow-xl z-20">
        <div className="p-5 border-b border-gray-700/50 bg-[#1e2330]">
          <Link href="/" className="text-2xl font-black text-white tracking-tighter">OJEMI <span className="text-xs text-indigo-400 align-top">ADMIN</span></Link>
        </div>
        <nav className="flex-1 py-4">
          <ul className="space-y-1">
            <li><Link href="/admin" className="px-6 py-3 block hover:bg-[#3b4890] font-bold opacity-70">👥 회원 관리</Link></li>
            <li><Link href="/admin/logs" className="px-6 py-3 block bg-[#3b4890] text-white font-bold border-l-4 border-indigo-300">📜 로그 관리</Link></li>
            <li><Link href="/admin/posts" className="px-6 py-3 block hover:bg-[#3b4890] font-bold opacity-70">📝 게시글 관리</Link></li>
            <li><Link href="/admin/boards" className="px-6 py-3 block hover:bg-[#3b4890] font-bold opacity-70">⚙️ 설정 관리</Link></li>
          </ul>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shadow-sm">
          <h1 className="text-xl font-black text-gray-800">📜 접속/활동 로그 관리</h1>
          <div className="text-sm font-bold text-rose-500 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 animate-pulse">
            최근 90일 데이터 보관중
          </div>
        </header>

        <div className="p-8 overflow-y-auto">
          {/* 검색바 */}
          <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm mb-4 flex justify-between items-center">
            <h2 className="text-sm font-black text-[#3b4890]">🔍 특정 유저/IP 추적</h2>
            <form method="GET" action="/admin/logs" className="flex gap-2">
              <input type="text" name="q" defaultValue={q} placeholder="아이디 또는 IP 입력..." className="text-xs font-bold border border-gray-300 p-2 rounded-sm w-60 outline-none focus:border-indigo-500" />
              <button type="submit" className="px-4 py-2 bg-[#414a66] text-white text-xs font-bold rounded-sm">추적</button>
              {q && <Link href="/admin/logs" className="px-3 py-2 border border-gray-300 text-gray-600 text-xs font-bold rounded-sm bg-white">초기화</Link>}
            </form>
          </div>

          {/* 로그 테이블 */}
          <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
                <colgroup><col width="8%" /><col width="15%" /><col width="15%" /><col width="20%" /><col width="42%" /></colgroup>
                <thead className="sticky top-0 z-10 bg-gray-50 border-b-2 border-gray-200">
                  <tr className="text-[11px] text-gray-500 font-black uppercase">
                    <th className="px-4 py-3 text-center">No</th>
                    <th className="px-4 py-3">활동 일시</th>
                    <th className="px-4 py-3">아이디</th>
                    <th className="px-4 py-3">IP 주소</th>
                    <th className="px-4 py-3">활동 내용</th>
                  </tr>
                </thead>
                <tbody className="text-[12px]">
                  {logs.map((log, idx) => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-center text-gray-400">{offset + idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-600">
                        {new Date(log.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-bold text-[#3b4890]">{log.user_id}</td>
                      <td className="px-4 py-3 font-black text-rose-500 tracking-tighter">{log.ip_address}</td>
                      <td className="px-4 py-3">
                        {log.action_type === 'LOGIN' && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-sm font-bold text-[10px]">🔓 LOGIN</span>}
                        {log.action_type === 'WRITE_POST' && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-sm font-bold text-[10px]">📝 WRITE_POST</span>}
                        {log.action_type === 'WRITE_COMMENT' && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-sm font-bold text-[10px]">💬 WRITE_COMMENT</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* 페이징 */}
            <div className="p-4 bg-gray-50 border-t flex justify-center gap-2">
              <Link href={`/admin/logs?page=${currentPage - 1}${q ? `&q=${q}` : ''}`} className={`px-4 py-2 bg-white border rounded-sm text-xs font-bold ${currentPage <= 1 ? 'opacity-30 pointer-events-none' : ''}`}>이전</Link>
              <span className="px-4 py-2 font-black text-xs">{currentPage} / {totalPages}</span>
              <Link href={`/admin/logs?page=${currentPage + 1}${q ? `&q=${q}` : ''}`} className={`px-4 py-2 bg-white border rounded-sm text-xs font-bold ${currentPage >= totalPages ? 'opacity-30 pointer-events-none' : ''}`}>다음</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
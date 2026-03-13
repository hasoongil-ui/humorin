// @ts-nocheck
import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import SafeButton from '../SafeButton'; // 💡 만능 버튼 조립 완료!

export const dynamic = 'force-dynamic';

async function handleBulkAction(formData: FormData) {
  'use server';
  const action = formData.get('action') as string;
  const selectedIds = formData.getAll('selected_ids');
  
  if (!selectedIds || selectedIds.length === 0) return;

  try {
    for (const id of selectedIds) {
      if (action === 'delete') {
        await sql`DELETE FROM comments WHERE id = ${id}`;
      } else if (action === 'hide') {
        // 💡 [버그 수정] status가 아니라 우리가 만든 is_blinded를 켭니다!
        await sql`UPDATE comments SET is_blinded = true WHERE id = ${id}`;
      } else if (action === 'show') {
        // 💡 [버그 수정] is_blinded를 끕니다!
        await sql`UPDATE comments SET is_blinded = false WHERE id = ${id}`;
      }
    }
  } catch (e) {
    console.error("댓글 벌크 액션 에러:", e); // 앞으로 에러가 나면 숨지 않게 기록!
  }
  revalidatePath('/admin/comments');
}

export default async function AdminCommentsPage(props: any) {
  const cookieStore = await cookies();
  const currentUserId = cookieStore.get('ojemi_userid')?.value;
  
  // 💡 [버그 수정] 부관리자들도 접근할 수 있게 문을 열어줍니다!
  let isAdmin = currentUserId === 'admin';
  if (currentUserId && !isAdmin) {
    try {
      const { rows: adminRows } = await sql`SELECT is_admin FROM users WHERE user_id = ${currentUserId}`;
      if (adminRows.length > 0 && adminRows[0].is_admin) {
        isAdmin = true;
      }
    } catch (e) {}
  }
  
  // 관리자가 아니면 무조건 쫓아냄!
  if (!isAdmin) redirect('/'); 

  const searchParams = await props.searchParams;
  const currentPage = Number(searchParams?.page) || 1;
  const limit = 50;
  const offset = (currentPage - 1) * limit;

  let totalComments = 0; let todayComments = 0; let hiddenComments = 0;
  let commentList: any[] = []; let totalPages = 1;

  try {
    const { rows: stats } = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as today,
        COUNT(CASE WHEN is_blinded = true THEN 1 END) as hidden
      FROM comments
    `;
    totalComments = Number(stats[0]?.total) || 0;
    todayComments = Number(stats[0]?.today) || 0;
    hiddenComments = Number(stats[0]?.hidden) || 0;
    totalPages = Math.ceil(totalComments / limit) || 1;

    const { rows } = await sql`
      SELECT c.*, p.title as post_title 
      FROM comments c 
      LEFT JOIN posts p ON c.post_id = p.id 
      ORDER BY c.created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;
    commentList = rows;
  } catch (e) {
    console.error("댓글 목록 불러오기 에러:", e);
  }

  const formatDate = (date: any) => {
    if (!date) return '-';
    try {
      const d = new Date(date);
      return `${d.getFullYear().toString().slice(2)}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch(e) { return '-'; }
  };

  return (
    <div suppressHydrationWarning className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <aside className="w-60 bg-[#2a3042] text-gray-300 flex flex-col shadow-xl z-20 flex-shrink-0">
        <div className="p-5 border-b border-gray-700/50 bg-[#1e2330]">
          <Link href="/" className="text-2xl font-black text-white tracking-tighter hover:text-indigo-400 transition-colors">OJEMI <span className="text-xs text-indigo-400 align-top">ADMIN</span></Link>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1">
            <li><Link href="/admin" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100"><span>👥</span> 회원 관리</Link></li>
            <li><Link href="/admin/posts" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100"><span>📝</span> 게시글 관리</Link></li>
            <li><Link href="/admin/comments" className="flex items-center gap-3 px-6 py-3 bg-[#3b4890] text-white font-bold border-l-4 border-indigo-300"><span>💬</span> 댓글 관리</Link></li>
            <li><Link href="/admin/boards" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100"><span>⚙️</span> 설정/게시판 관리</Link></li>
          </ul>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center z-10 shadow-sm flex-shrink-0">
          <h1 className="text-xl font-black text-gray-800 tracking-tight">댓글 관리</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm"><p className="text-[11px] font-bold text-gray-500 mb-1">총 댓글</p><p className="text-xl font-black text-gray-800">{totalComments}</p></div>
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm"><p className="text-[11px] font-bold text-gray-500 mb-1">오늘 달린 댓글</p><p className="text-xl font-black text-emerald-500">+{todayComments}</p></div>
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm"><p className="text-[11px] font-bold text-gray-500 mb-1">블라인드</p><p className="text-xl font-black text-rose-500">{hiddenComments}</p></div>
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm flex items-center justify-between"><div><p className="text-[11px] font-bold text-gray-500 mb-1">현재 페이지</p><p className="text-xl font-black text-indigo-600">{currentPage} / {totalPages}</p></div></div>
          </div>

          <form action={handleBulkAction} className="bg-white rounded-sm border border-gray-200 shadow-sm flex flex-col overflow-hidden" suppressHydrationWarning>
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-end items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button type="submit" name="action" value="show" className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-sm hover:bg-emerald-100 flex items-center gap-1">👁️ 선택 공개</button>
                <button type="submit" name="action" value="hide" className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-200 text-xs font-bold rounded-sm hover:bg-gray-900 flex items-center gap-1">🕵️ 선택 숨김</button>
                <SafeButton 
                  label="🗑️ 선택 삭제" 
                  confirmMessage="선택한 댓글을 완전히 삭제하시겠습니까?" 
                  name="action" 
                  value="delete" 
                  className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold rounded-sm hover:bg-rose-100 flex items-center gap-1" 
                />
              </div>
            </div>

            <div className="overflow-x-auto w-full" suppressHydrationWarning>
              <table className="w-full text-left border-collapse whitespace-nowrap table-fixed min-w-[1000px]" suppressHydrationWarning>
                {/* 💡 신고 횟수 칸을 위해 비율 조정! */}
                <colgroup><col style={{ width: '4%' }} /><col style={{ width: '6%' }} /><col style={{ width: '42%' }} /><col style={{ width: '12%' }} /><col style={{ width: '14%' }} /><col style={{ width: '8%' }} /><col style={{ width: '14%' }} /></colgroup>
                <thead>
                  <tr className="bg-white border-b border-gray-300 text-[11px] text-gray-500 font-black tracking-wider uppercase">
                    <th className="px-3 py-2 text-center">선택</th><th className="px-3 py-2 text-center">NO</th><th className="px-3 py-2">댓글 내용</th><th className="px-3 py-2">작성자</th><th className="px-3 py-2 text-center">작성일</th><th className="px-3 py-2 text-center">🚨신고</th><th className="px-3 py-2 text-center">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {commentList.map((comment) => (
                    <tr key={comment.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 text-center"><input type="checkbox" name="selected_ids" value={comment.id} className="w-4 h-4 cursor-pointer accent-[#3b4890]" /></td>
                      <td className="px-3 py-2 text-center text-xs font-bold text-gray-400">{comment.id}</td>
                      <td className="px-3 py-2">
                        <div className="text-sm font-bold text-gray-800 truncate mb-1">{comment.content}</div>
                        <Link href={`/board/${comment.post_id}`} target="_blank" className="text-[11px] text-[#3b4890] hover:underline truncate block w-full">원문: {comment.post_title || '삭제된 게시글'}</Link>
                      </td>
                      <td className="px-3 py-2 text-xs font-bold text-gray-600 truncate">{comment.author}</td>
                      <td className="px-3 py-2 text-center text-[11px] font-bold text-gray-400">{formatDate(comment.created_at)}</td>
                      {/* 💡 신고 횟수 표시 */}
                      <td className="px-3 py-2 text-center text-[12px] font-bold text-rose-500">{comment.report_count || 0}</td>
                      <td className="px-3 py-2 text-center">
                        {(!comment.is_blinded) ? <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-100">정상</span> : <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-sm border border-rose-100">블라인드</span>}
                      </td>
                    </tr>
                  ))}
                  {commentList.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-gray-400 font-bold">댓글이 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
          </form>
          <div className="mt-4 flex justify-center gap-2">
            <Link href={`/admin/comments?page=${currentPage - 1}`} className={`px-3 py-1.5 border border-gray-300 bg-white text-gray-600 text-xs font-bold rounded-sm hover:bg-gray-50 ${currentPage <= 1 ? 'pointer-events-none opacity-40' : ''}`}>◀ 이전</Link>
            <div className="px-4 py-1.5 font-black text-gray-700 text-sm bg-white border border-gray-200 rounded-sm">{currentPage} / {totalPages}</div>
            <Link href={`/admin/comments?page=${currentPage + 1}`} className={`px-3 py-1.5 border border-gray-300 bg-white text-gray-600 text-xs font-bold rounded-sm hover:bg-gray-50 ${currentPage >= totalPages ? 'pointer-events-none opacity-40' : ''}`}>다음 ▶</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
// @ts-nocheck
import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import SafeButton from '../SafeButton'; 

export const dynamic = 'force-dynamic';

function formatDate(dateString: any) {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return `${d.getFullYear().toString().slice(2)}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch(e) { return '-'; }
}

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
        await sql`UPDATE comments SET is_blinded = true WHERE id = ${id}`;
      } else if (action === 'show') {
        await sql`UPDATE comments SET is_blinded = false WHERE id = ${id}`;
      }
    }
  } catch (e) {
    console.error("댓글 벌크 액션 에러:", e); 
  }
  revalidatePath('/admin/comments');
}

export default async function AdminCommentsPage(props: any) {
  const cookieStore = await cookies();
  const currentUserId = cookieStore.get('ojemi_userid')?.value;
  
  let isAdmin = currentUserId === 'admin';
  if (currentUserId && !isAdmin) {
    try {
      const { rows: adminRows } = await sql`SELECT is_admin FROM users WHERE user_id = ${currentUserId}`;
      if (adminRows.length > 0 && adminRows[0].is_admin) {
        isAdmin = true;
      }
    } catch (e) {}
  }
  
  if (!isAdmin) redirect('/'); 

  const searchParams = await props.searchParams;
  const currentPage = Number(searchParams?.page) || 1;
  const q = searchParams?.q || '';
  const type = searchParams?.type || 'content';
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

    let countResult;
    let queryResult;

    // 💡 [수술 1] 닉네임과 아이디를 분리해서 쿼리를 날리도록 세팅!
    if (q && type === 'content') {
      countResult = await sql`SELECT COUNT(*) FROM comments WHERE content ILIKE ${'%' + q + '%'}`;
      queryResult = await sql`
        SELECT c.*, p.title as post_title 
        FROM comments c LEFT JOIN posts p ON c.post_id = p.id 
        WHERE c.content ILIKE ${'%' + q + '%'} 
        ORDER BY c.created_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (q && type === 'author') {
      countResult = await sql`SELECT COUNT(*) FROM comments WHERE author ILIKE ${'%' + q + '%'}`;
      queryResult = await sql`
        SELECT c.*, p.title as post_title 
        FROM comments c LEFT JOIN posts p ON c.post_id = p.id 
        WHERE c.author ILIKE ${'%' + q + '%'} 
        ORDER BY c.created_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (q && type === 'author_id') {
      countResult = await sql`SELECT COUNT(*) FROM comments WHERE author_id ILIKE ${'%' + q + '%'}`;
      queryResult = await sql`
        SELECT c.*, p.title as post_title 
        FROM comments c LEFT JOIN posts p ON c.post_id = p.id 
        WHERE c.author_id ILIKE ${'%' + q + '%'} 
        ORDER BY c.created_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      countResult = await sql`SELECT COUNT(*) FROM comments`;
      queryResult = await sql`
        SELECT c.*, p.title as post_title 
        FROM comments c LEFT JOIN posts p ON c.post_id = p.id 
        ORDER BY c.created_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const currentSearchTotal = Number(countResult.rows[0].count);
    totalPages = Math.ceil(currentSearchTotal / limit) || 1;
    commentList = queryResult.rows;

  } catch (e) {
    console.error("댓글 목록 불러오기 에러:", e);
  }

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
            <li><Link href="/admin/blind" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100"><span>🚨</span> 블라인드 관리</Link></li>
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

          <div className="bg-white p-3 rounded-sm border border-gray-200 shadow-sm mb-4 flex justify-between items-center">
            <h2 className="text-sm font-black text-[#3b4890] flex items-center gap-1"><span>🔍</span> 댓글 정밀 검색</h2>
            <form method="GET" action="/admin/comments" className="flex items-center gap-2">
              <select name="type" defaultValue={type} className="text-xs font-bold border border-gray-300 p-1.5 rounded-sm outline-none bg-white text-gray-700">
                <option value="content">댓글 내용</option>
                {/* 💡 [수술 2] 닉네임과 아이디를 명확하게 분리! */}
                <option value="author">닉네임</option>
                <option value="author_id">아이디</option>
              </select>
              <input type="text" name="q" defaultValue={q} placeholder="검색어를 입력하세요..." className="text-xs font-bold border border-gray-300 p-1.5 rounded-sm outline-none w-48 focus:border-[#3b4890]" />
              <button type="submit" className="px-4 py-1.5 bg-[#414a66] text-white text-xs font-bold rounded-sm hover:bg-[#2a3042] shadow-sm">검색</button>
              {q && <Link href="/admin/comments" className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs font-bold rounded-sm hover:bg-gray-50">초기화</Link>}
            </form>
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
                      <td className="px-3 py-2 text-xs font-bold text-gray-600 truncate">
                        <div className="text-gray-800">{comment.author}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">{comment.author_id}</div>
                      </td>
                      <td className="px-3 py-2 text-center text-[11px] font-bold text-gray-400">{formatDate(comment.created_at)}</td>
                      <td className="px-3 py-2 text-center text-[12px] font-bold text-rose-500">{comment.report_count || 0}</td>
                      <td className="px-3 py-2 text-center">
                        {(!comment.is_blinded) ? <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-100">정상</span> : <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-sm border border-rose-100">블라인드</span>}
                      </td>
                    </tr>
                  ))}
                  {commentList.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-gray-400 font-bold">조건에 맞는 댓글이 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
          </form>
          <div className="mt-4 flex justify-center gap-2">
            <Link href={`/admin/comments?page=${currentPage - 1}${q ? `&q=${q}&type=${type}` : ''}`} className={`px-3 py-1.5 border border-gray-300 bg-white text-gray-600 text-xs font-bold rounded-sm hover:bg-gray-50 ${currentPage <= 1 ? 'pointer-events-none opacity-40' : ''}`}>◀ 이전</Link>
            <div className="px-4 py-1.5 font-black text-gray-700 text-sm bg-white border border-gray-200 rounded-sm">{currentPage} / {totalPages}</div>
            <Link href={`/admin/comments?page=${currentPage + 1}${q ? `&q=${q}&type=${type}` : ''}`} className={`px-3 py-1.5 border border-gray-300 bg-white text-gray-600 text-xs font-bold rounded-sm hover:bg-gray-50 ${currentPage >= totalPages ? 'pointer-events-none opacity-40' : ''}`}>다음 ▶</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
// @ts-nocheck
import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

async function bulkPostAction(formData: FormData) {
  'use server';
  const selectedPostIds = formData.getAll('postIds');
  const actionType = formData.get('actionType'); 
  if (selectedPostIds.length === 0) return;
  try {
    for (const id of selectedPostIds) {
      if (actionType === 'delete') await sql`DELETE FROM posts WHERE id = ${id}`;
      else if (actionType === 'hide') await sql`UPDATE posts SET status = 'hidden' WHERE id = ${id}`;
      else if (actionType === 'show') await sql`UPDATE posts SET status = 'published' WHERE id = ${id}`;
    }
  } catch (error) {}
  revalidatePath('/admin/posts');
}

export default async function AdminPostsPage(props: any) {
  const cookieStore = await cookies();
  const currentUserId = cookieStore.get('ojemi_userid')?.value;
  if (currentUserId !== 'admin') redirect('/'); 

  // 💡 [페이지네이션 로직]
  const searchParams = await props.searchParams;
  const currentPage = Number(searchParams?.page) || 1;
  const limit = 50;
  const offset = (currentPage - 1) * limit;

  let totalPosts = 0; let todayPosts = 0; let hiddenPosts = 0;
  let postList: any[] = []; let totalPages = 1;

  try {
    const { rows: stats } = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN DATE(date) = CURRENT_DATE THEN 1 END) as today,
        COUNT(CASE WHEN status = 'hidden' THEN 1 END) as hidden
      FROM posts
    `;
    totalPosts = Number(stats[0]?.total) || 0;
    todayPosts = Number(stats[0]?.today) || 0;
    hiddenPosts = Number(stats[0]?.hidden) || 0;
    totalPages = Math.ceil(totalPosts / limit);

    const { rows } = await sql`
      SELECT 
        id, title, author, date, COALESCE(views, 0) as views, COALESCE(status, 'published') as status
      FROM posts
      ORDER BY date DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    postList = rows.map(row => {
      // 💡 [시간 포맷 변경] 대표님이 원하신 260311 03:56 형태로 변경!
      const d = new Date(row.date);
      const YY = d.getFullYear().toString().slice(2);
      const MM = String(d.getMonth() + 1).padStart(2, '0');
      const DD = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const exactTimeStr = `${YY}${MM}${DD} ${hh}:${mm}`;
      
      let category = "분류없음";
      let displayTitle = row.title;
      const match = row.title?.match(/^\[(.*?)\]\s*(.*)$/);
      if (match) { category = match[1]; displayTitle = match[2]; }

      return { ...row, exactTimeStr, category, displayTitle };
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
            <li><Link href="/admin" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100"><span>👥</span> 회원 관리</Link></li>
            <li><Link href="/admin/posts" className="flex items-center gap-3 px-6 py-3 bg-[#3b4890] text-white font-bold border-l-4 border-indigo-300"><span>📝</span> 게시글 관리</Link></li>
          </ul>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center z-10 shadow-sm flex-shrink-0">
          <h1 className="text-xl font-black text-gray-800 tracking-tight">게시글 관리</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm"><p className="text-[11px] font-bold text-gray-500 mb-1">총 게시글</p><p className="text-xl font-black text-gray-800">{totalPosts}</p></div>
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm"><p className="text-[11px] font-bold text-gray-500 mb-1">오늘 올라온 글</p><p className="text-xl font-black text-emerald-600">+{todayPosts}</p></div>
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm"><p className="text-[11px] font-bold text-gray-500 mb-1">블라인드</p><p className="text-xl font-black text-gray-800">{hiddenPosts}</p></div>
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm flex items-center justify-between"><div><p className="text-[11px] font-bold text-gray-500 mb-1">현재 페이지</p><p className="text-xl font-black text-indigo-600">{currentPage} / {totalPages}</p></div></div>
          </div>

          <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <form action={bulkPostAction} className="w-full">
              <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50 flex-shrink-0">
                <div className="flex gap-2">
                  <button type="button" className="bg-gray-200 text-gray-600 px-3 py-1 rounded-sm text-[12px] font-bold cursor-not-allowed">검색 기능 준비중</button>
                </div>
                <div className="flex gap-2">
                  <button type="submit" name="actionType" value="show" className="px-3 py-1 bg-white border border-gray-300 text-[12px] font-bold rounded-sm shadow-sm">👁️ 선택 공개</button>
                  <button type="submit" name="actionType" value="hide" className="px-3 py-1 bg-gray-800 text-white text-[12px] font-bold rounded-sm shadow-sm">🙈 선택 숨김</button>
                  <button type="submit" name="actionType" value="delete" className="px-3 py-1 bg-rose-50 border border-rose-200 text-rose-600 text-[12px] font-bold rounded-sm shadow-sm">🗑️ 선택 삭제</button>
                </div>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse whitespace-nowrap table-fixed min-w-[900px]">
                  <colgroup><col style={{ width: '4%' }} /><col style={{ width: '6%' }} /><col style={{ width: '12%' }} /><col style={{ width: '53%' }} /><col style={{ width: '15%' }} /><col style={{ width: '10%' }} /></colgroup>
                  <thead>
                    <tr className="bg-white border-b border-gray-300 text-[11px] text-gray-500 font-black tracking-wider uppercase">
                      <th className="px-3 py-2 text-center">선택</th><th className="px-3 py-2 text-center">No</th><th className="px-3 py-2">게시판</th><th className="px-3 py-2">제목</th><th className="px-3 py-2">작성자</th><th className="px-3 py-2 text-center border-l border-gray-100">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {postList.map((post, index) => (
                      <tr key={post.id} className={`border-b border-gray-100 transition-colors ${post.status === 'hidden' ? 'bg-gray-50 opacity-70' : 'hover:bg-indigo-50/50'}`}>
                        <td className="px-3 py-2 text-center"><input type="checkbox" name="postIds" value={post.id} className="w-3.5 h-3.5 cursor-pointer accent-[#3b4890]" /></td>
                        <td className="px-3 py-2 text-center text-gray-400 font-medium text-[11px]">{offset + index + 1}</td>
                        <td className="px-3 py-2 text-[#3b4890] font-bold text-[12px] truncate" title={post.category}>{post.category}</td>
                        <td className="px-3 py-2 flex items-center gap-2 overflow-hidden">
                          {/* 💡 [시간 추가] 제목 바로 앞에 원하시는 포맷(260311 03:56)을 달았습니다! */}
                          <span className="text-gray-400 text-[11px] font-mono shrink-0">[{post.exactTimeStr}]</span>
                          <Link href={`/board/${post.id}`} target="_blank" className="font-bold text-gray-800 text-[13px] hover:underline hover:text-indigo-600 truncate block" title={post.displayTitle}>
                            {post.displayTitle}
                          </Link>
                        </td>
                        <td className="px-3 py-2 font-bold text-gray-600 text-[12px] truncate" title={post.author}>{post.author}</td>
                        <td className="px-3 py-2 text-center border-l border-gray-100">
                          {post.status === 'published' ? <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm">🟢 정상</span> : <span className="text-[10px] font-black text-gray-500 bg-gray-200 px-2 py-0.5 rounded-sm">🙈 숨김</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </form>
            
            {/* 💡 [진짜 페이지네이션] */}
            <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-center flex-shrink-0">
               <div className="flex gap-2">
                 <Link href={`/admin/posts?page=${currentPage - 1}`} className={`px-3 py-1 border border-gray-300 bg-white text-gray-500 text-[11px] font-bold rounded-sm hover:bg-gray-50 ${currentPage <= 1 ? 'pointer-events-none opacity-40' : ''}`}>◀ 이전</Link>
                 <div className="px-4 py-1 font-black text-gray-700 text-[12px]">{currentPage} <span className="text-gray-400 font-medium">/ {totalPages}</span></div>
                 <Link href={`/admin/posts?page=${currentPage + 1}`} className={`px-3 py-1 border border-gray-300 bg-white text-gray-500 text-[11px] font-bold rounded-sm hover:bg-gray-50 ${currentPage >= totalPages ? 'pointer-events-none opacity-40' : ''}`}>다음 ▶</Link>
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
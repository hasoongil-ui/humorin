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
  const targetCategory = formData.get('targetCategory') as string;
  
  if (!selectedIds || selectedIds.length === 0) return;

  try {
    for (const id of selectedIds) {
      if (action === 'delete') {
        // 🚨 유령 댓글 싹쓸이 방어막
        await sql`DELETE FROM comment_likes WHERE comment_id IN (SELECT id FROM comments WHERE post_id = ${id})`;
        await sql`DELETE FROM comment_dislikes WHERE comment_id IN (SELECT id FROM comments WHERE post_id = ${id})`;
        await sql`DELETE FROM comments WHERE post_id = ${id}`;
        await sql`DELETE FROM likes WHERE post_id = ${id}`;
        await sql`DELETE FROM post_dislikes WHERE post_id = ${id}`;
        await sql`DELETE FROM scraps WHERE post_id = ${id}`;
        
        await sql`DELETE FROM posts WHERE id = ${id}`;
      } else if (action === 'hide') {
        await sql`UPDATE posts SET status = 'hidden' WHERE id = ${id}`;
      } else if (action === 'show') {
        await sql`UPDATE posts SET status = 'published' WHERE id = ${id}`;
      } else if (action === 'move' && targetCategory) {
        const { rows } = await sql`SELECT title FROM posts WHERE id = ${id}`;
        if (rows.length > 0) {
          let cleanTitle = rows[0].title.replace(/^\[.*?\]\s*/, '');
          let newTitle = `[${targetCategory}] ${cleanTitle}`;
          await sql`UPDATE posts SET title = ${newTitle} WHERE id = ${id}`;
        }
      }
    }
  } catch (e) { console.error("일괄 작업 중 에러:", e); }
  revalidatePath('/admin/posts');
}

export default async function AdminPostsPage(props: any) {
  const cookieStore = await cookies();
  const currentUserId = cookieStore.get('humorin_userid')?.value;
  if (currentUserId !== 'admin') redirect('/'); 

  const searchParams = await props.searchParams;
  const currentPage = Number(searchParams?.page) || 1;
  const q = searchParams?.q || '';
  const type = searchParams?.type || 'title';
  const limit = 50;
  const offset = (currentPage - 1) * limit;

  let totalPosts = 0; let todayPosts = 0; let blindedPosts = 0;
  let postList: any[] = []; let totalPages = 1;
  let boards: any[] = [];

  try {
    // 💡 [수술 1] 상단 통계에 'is_blinded = true' 인 진짜 블라인드 글을 정확하게 카운트하도록 수정
    const { rows: stats } = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN DATE(date) = CURRENT_DATE THEN 1 END) as today,
        COUNT(CASE WHEN is_blinded = true THEN 1 END) as blinded
      FROM posts
    `;
    totalPosts = Number(stats[0]?.total) || 0;
    todayPosts = Number(stats[0]?.today) || 0;
    blindedPosts = Number(stats[0]?.blinded) || 0;

    let countResult;
    let queryResult;

    if (q && type === 'title') {
      countResult = await sql`SELECT COUNT(*) FROM posts WHERE title ILIKE ${'%' + q + '%'}`;
      queryResult = await sql`SELECT * FROM posts WHERE title ILIKE ${'%' + q + '%'} ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (q && type === 'author') {
      countResult = await sql`SELECT COUNT(*) FROM posts WHERE author ILIKE ${'%' + q + '%'}`;
      queryResult = await sql`SELECT * FROM posts WHERE author ILIKE ${'%' + q + '%'} ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (q && type === 'author_id') {
      countResult = await sql`SELECT COUNT(*) FROM posts WHERE author_id ILIKE ${'%' + q + '%'}`;
      queryResult = await sql`SELECT * FROM posts WHERE author_id ILIKE ${'%' + q + '%'} ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    } else {
      countResult = await sql`SELECT COUNT(*) FROM posts`;
      queryResult = await sql`SELECT * FROM posts ORDER BY date DESC LIMIT ${limit} OFFSET ${offset}`;
    }

    const currentSearchTotal = Number(countResult.rows[0].count);
    totalPages = Math.ceil(currentSearchTotal / limit) || 1;
    postList = queryResult.rows;

    const { rows: boardRows } = await sql`SELECT name FROM boards ORDER BY sort_order ASC`;
    boards = boardRows;
  } catch (e) {}

  const extractData = (fullTitle: string) => {
    if (!fullTitle) return { cat: '일반', cleanTitle: '' };
    const match = fullTitle.match(/^\[(.*?)\]\s*(.*)$/);
    return match ? { cat: match[1], cleanTitle: match[2] } : { cat: '일반', cleanTitle: fullTitle };
  };

  return (
    <div suppressHydrationWarning className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <aside className="w-60 bg-[#2a3042] text-gray-300 flex flex-col shadow-xl z-20 flex-shrink-0">
        <div className="p-5 border-b border-gray-700/50 bg-[#1e2330]">
          <Link href="/" className="text-2xl font-black text-white tracking-tighter hover:text-indigo-400 transition-colors">HUMORIN <span className="text-xs text-indigo-400 align-top">ADMIN</span></Link>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1">
            <li><Link href="/admin" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100"><span>👥</span> 회원 관리</Link></li>
            <li><Link href="/admin/posts" className="flex items-center gap-3 px-6 py-3 bg-[#3b4890] text-white font-bold border-l-4 border-indigo-300"><span>📝</span> 게시글 관리</Link></li>
            <li><Link href="/admin/comments" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100"><span>💬</span> 댓글 관리</Link></li>
            <li><Link href="/admin/boards" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100"><span>⚙️</span> 설정/게시판 관리</Link></li>
            <li><Link href="/admin/blind" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100"><span>🚨</span> 블라인드 관리</Link></li>
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
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm"><p className="text-[11px] font-bold text-gray-500 mb-1">오늘 올라온 글</p><p className="text-xl font-black text-emerald-500">+{todayPosts}</p></div>
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm"><p className="text-[11px] font-bold text-gray-500 mb-1">블라인드</p><p className="text-xl font-black text-rose-500">{blindedPosts}</p></div>
            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm flex items-center justify-between"><div><p className="text-[11px] font-bold text-gray-500 mb-1">현재 페이지</p><p className="text-xl font-black text-indigo-600">{currentPage} / {totalPages}</p></div></div>
          </div>

          <div className="bg-white p-3 rounded-sm border border-gray-200 shadow-sm mb-4 flex justify-between items-center">
            <h2 className="text-sm font-black text-[#3b4890] flex items-center gap-1"><span>🔍</span> 게시글 정밀 검색</h2>
            <form method="GET" action="/admin/posts" className="flex items-center gap-2">
              <select name="type" defaultValue={type} className="text-xs font-bold border border-gray-300 p-1.5 rounded-sm outline-none bg-white text-gray-700">
                <option value="title">제목</option>
                <option value="author">닉네임</option>
                <option value="author_id">아이디</option>
              </select>
              <input type="text" name="q" defaultValue={q} placeholder="검색어를 입력하세요..." className="text-xs font-bold border border-gray-300 p-1.5 rounded-sm outline-none w-48 focus:border-[#3b4890]" />
              <button type="submit" className="px-4 py-1.5 bg-[#414a66] text-white text-xs font-bold rounded-sm hover:bg-[#2a3042] shadow-sm">검색</button>
              {q && <Link href="/admin/posts" className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs font-bold rounded-sm hover:bg-gray-50">초기화</Link>}
            </form>
          </div>

          <form action={handleBulkAction} className="bg-white rounded-sm border border-gray-200 shadow-sm flex flex-col overflow-hidden" suppressHydrationWarning>
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <select name="targetCategory" className="text-sm font-bold p-1.5 border border-gray-300 rounded-sm outline-none text-gray-700 bg-white">
                  <option value="">게시판 선택</option>
                  {boards.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                </select>
                <button type="submit" name="action" value="move" className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-sm hover:bg-indigo-100 flex items-center gap-1">🚚 선택 이동</button>
              </div>
              <div className="flex items-center gap-2">
                <button type="submit" name="action" value="show" className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-sm hover:bg-emerald-100 flex items-center gap-1">👁️ 선택 공개</button>
                <button type="submit" name="action" value="hide" className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-200 text-xs font-bold rounded-sm hover:bg-gray-900 flex items-center gap-1">🕵️ 선택 숨김</button>
                <SafeButton 
                  label="🗑️ 선택 삭제" 
                  confirmMessage="선택한 게시글을 완전히 삭제하시겠습니까?" 
                  name="action" 
                  value="delete" 
                  className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold rounded-sm hover:bg-rose-100 flex items-center gap-1" 
                />
              </div>
            </div>

            <div className="overflow-x-auto w-full" suppressHydrationWarning>
              <table className="w-full text-left border-collapse whitespace-nowrap table-fixed min-w-[1050px]" suppressHydrationWarning>
                <colgroup><col style={{ width: '4%' }} /><col style={{ width: '6%' }} /><col style={{ width: '12%' }} /><col style={{ width: '38%' }} /><col style={{ width: '14%' }} /><col style={{ width: '14%' }} /><col style={{ width: '12%' }} /></colgroup>
                <thead>
                  <tr className="bg-white border-b border-gray-300 text-[11px] text-gray-500 font-black tracking-wider uppercase">
                    <th className="px-3 py-2 text-center">선택</th><th className="px-3 py-2 text-center">NO</th><th className="px-3 py-2">게시판</th><th className="px-3 py-2">제목</th><th className="px-3 py-2">작성자</th>
                    <th className="px-3 py-2 text-center">작성일</th><th className="px-3 py-2 text-center">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {postList.map((post) => {
                    const postData = extractData(post.title);
                    return (
                      <tr key={post.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 text-center"><input type="checkbox" name="selected_ids" value={post.id} className="w-4 h-4 cursor-pointer accent-[#3b4890]" /></td>
                        <td className="px-3 py-2 text-center text-xs font-bold text-gray-400">{post.id}</td>
                        <td className="px-3 py-2 text-xs font-black text-[#3b4890]">{postData.cat}</td>
                        <td className="px-3 py-2 text-sm font-bold text-gray-800 truncate"><Link href={`/board/${post.id}`} target="_blank" className="hover:underline">{postData.cleanTitle}</Link></td>
                        <td className="px-3 py-2 text-xs font-bold text-gray-600 truncate">
                          <div className="text-gray-800">{post.author}</div>
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">{post.author_id}</div>
                        </td>
                        <td className="px-3 py-2 text-center text-[11px] font-bold text-gray-400">{formatDate(post.date)}</td>
                        <td className="px-3 py-2 text-center">
                          {/* 💡 [수술 2] is_blinded 값을 최우선으로 검사하여 붉은색 경고 렌더링! */}
                          {post.is_blinded ? (
                            <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-sm border border-red-200 shadow-sm">🚨 블라인드</span>
                          ) : post.status === 'hidden' ? (
                            <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded-sm border border-gray-200">숨김</span>
                          ) : (
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-100">정상</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {postList.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-gray-400 font-bold">조건에 맞는 게시글이 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
          </form>
          <div className="mt-4 flex justify-center gap-2">
            <Link href={`/admin/posts?page=${currentPage - 1}${q ? `&q=${q}&type=${type}` : ''}`} className={`px-3 py-1.5 border border-gray-300 bg-white text-gray-600 text-xs font-bold rounded-sm hover:bg-gray-50 ${currentPage <= 1 ? 'pointer-events-none opacity-40' : ''}`}>◀ 이전</Link>
            <div className="px-4 py-1.5 font-black text-gray-700 text-sm bg-white border border-gray-200 rounded-sm">{currentPage} / {totalPages}</div>
            <Link href={`/admin/posts?page=${currentPage + 1}${q ? `&q=${q}&type=${type}` : ''}`} className={`px-3 py-1.5 border border-gray-300 bg-white text-gray-600 text-xs font-bold rounded-sm hover:bg-gray-50 ${currentPage >= totalPages ? 'pointer-events-none opacity-40' : ''}`}>다음 ▶</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
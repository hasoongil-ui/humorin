// @ts-nocheck
import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function formatDate(dateString: any) {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return `${d.getFullYear().toString().slice(2)}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch(e) { return '-'; }
}

export default async function BlindManagementPage() {
  const cookieStore = await cookies();
  const currentUserId = cookieStore.get('humorin_userid')?.value;
  if (currentUserId !== 'admin') redirect('/'); 

  let blindedPosts = [];
  let blindedComments = [];

  try {
    // 💡 [핵심] 블라인드 처리된 게시글만 싹 다 긁어옵니다!
    const { rows: pRows } = await sql`
      SELECT id, title, author, date, COALESCE(report_count, 0) as report_count 
      FROM posts 
      WHERE is_blinded = true 
      ORDER BY date DESC
    `;
    blindedPosts = pRows;

    // 💡 [핵심] 블라인드 처리된 댓글만 싹 다 긁어옵니다!
    const { rows: cRows } = await sql`
      SELECT id, post_id, content, author, created_at, COALESCE(report_count, 0) as report_count 
      FROM comments 
      WHERE is_blinded = true 
      ORDER BY created_at DESC
    `;
    blindedComments = cRows;
  } catch (error) {
    console.error("블라인드 목록 불러오기 실패", error);
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      {/* 💡 관리자 좌측 사이드바 */}
      <aside className="w-60 bg-[#2a3042] text-gray-300 flex flex-col shadow-xl z-20 flex-shrink-0">
        <div className="p-5 border-b border-gray-700/50 bg-[#1e2330]">
          <Link href="/" className="text-2xl font-black text-white tracking-tighter hover:text-indigo-400 transition-colors">HUMORIN <span className="text-xs text-indigo-400 align-top">ADMIN</span></Link>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1">
            <li><Link href="/admin" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100"><span>👥</span> 회원 관리</Link></li>
            <li><Link href="/admin/posts" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100"><span>📝</span> 게시글 관리</Link></li>
            <li><Link href="/admin/comments" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100"><span>💬</span> 댓글 관리</Link></li>
            <li><Link href="/admin/boards" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100"><span>⚙️</span> 설정/게시판 관리</Link></li>
            {/* 💡 새로 추가된 블라인드 메뉴! (현재 페이지니까 하이라이트) */}
            <li><Link href="/admin/blind" className="flex items-center gap-3 px-6 py-3 bg-rose-600 text-white font-bold border-l-4 border-rose-300"><span>🚨</span> 블라인드 관리</Link></li>
          </ul>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center z-10 shadow-sm flex-shrink-0">
          <h1 className="text-xl font-black text-gray-800 tracking-tight">🚨 블라인드 통합 관리</h1>
          <div className="text-sm font-bold text-gray-500 flex items-center gap-2">블라인드 글 {blindedPosts.length}건 / 댓글 {blindedComments.length}건</div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
          
          {/* 🔴 블라인드된 게시글 목록 */}
          <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-[#414a66] px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-[15px] font-black text-white">📝 블라인드 처리된 게시글 ({blindedPosts.length})</h2>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-200 text-[12px] text-gray-500 font-bold">
                  <tr>
                    <th className="px-4 py-2.5 text-center w-16">No.</th>
                    <th className="px-4 py-2.5">게시글 제목</th>
                    <th className="px-4 py-2.5 w-32">작성자</th>
                    <th className="px-4 py-2.5 text-center w-24">신고 누적</th>
                    <th className="px-4 py-2.5 text-center w-32">작성일</th>
                    <th className="px-4 py-2.5 text-center w-24">이동</th>
                  </tr>
                </thead>
                <tbody>
                  {blindedPosts.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-400 font-bold text-sm">블라인드된 게시글이 없습니다.</td></tr>
                  ) : (
                    blindedPosts.map((post) => (
                      <tr key={`post-${post.id}`} className="border-b border-gray-100 hover:bg-red-50 transition-colors text-[13px]">
                        <td className="px-4 py-2 text-center text-gray-400 font-mono">{post.id}</td>
                        <td className="px-4 py-2 font-bold text-gray-800 truncate max-w-md">{post.title}</td>
                        <td className="px-4 py-2 text-gray-600">{post.author}</td>
                        <td className="px-4 py-2 text-center"><span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-sm font-black text-[11px]">{post.report_count}회</span></td>
                        <td className="px-4 py-2 text-center text-gray-400">{formatDate(post.date)}</td>
                        <td className="px-4 py-2 text-center">
                          <Link href={`/board/${post.id}`} className="px-3 py-1 bg-gray-800 text-white text-[11px] font-bold rounded-sm hover:bg-gray-900 transition-colors shadow-sm">
                            확인하기 ↗
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 🔴 블라인드된 댓글 목록 */}
          <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-gray-800 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-[15px] font-black text-white">💬 블라인드 처리된 댓글 ({blindedComments.length})</h2>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-200 text-[12px] text-gray-500 font-bold">
                  <tr>
                    <th className="px-4 py-2.5 text-center w-16">No.</th>
                    <th className="px-4 py-2.5">댓글 내용</th>
                    <th className="px-4 py-2.5 w-32">작성자</th>
                    <th className="px-4 py-2.5 text-center w-24">신고 누적</th>
                    <th className="px-4 py-2.5 text-center w-32">작성일</th>
                    <th className="px-4 py-2.5 text-center w-24">이동</th>
                  </tr>
                </thead>
                <tbody>
                  {blindedComments.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-400 font-bold text-sm">블라인드된 댓글이 없습니다.</td></tr>
                  ) : (
                    blindedComments.map((comment) => (
                      <tr key={`comment-${comment.id}`} className="border-b border-gray-100 hover:bg-red-50 transition-colors text-[13px]">
                        <td className="px-4 py-2 text-center text-gray-400 font-mono">{comment.id}</td>
                        <td className="px-4 py-2 font-bold text-gray-800 truncate max-w-md">{comment.content || '(이미지 댓글)'}</td>
                        <td className="px-4 py-2 text-gray-600">{comment.author}</td>
                        <td className="px-4 py-2 text-center"><span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-sm font-black text-[11px]">{comment.report_count}회</span></td>
                        <td className="px-4 py-2 text-center text-gray-400">{formatDate(comment.created_at)}</td>
                        <td className="px-4 py-2 text-center">
                          {/* 댓글이 달린 원본 게시글로 이동시킵니다! */}
                          <Link href={`/board/${comment.post_id}`} className="px-3 py-1 bg-gray-800 text-white text-[11px] font-bold rounded-sm hover:bg-gray-900 transition-colors shadow-sm">
                            확인하기 ↗
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
// @ts-nocheck
import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import SafeButton from '../SafeButton'; // 💡 만능 버튼 조립 완료!

async function toggleGlobalLock(formData: FormData) {
  'use server';
  const key = formData.get('key') as string;
  const currentValue = formData.get('currentValue') as string;
  const newValue = currentValue === 'true' ? 'false' : 'true';
  try {
    await sql`UPDATE site_settings SET value = ${newValue} WHERE key = ${key}`;
  } catch (e) {}
  revalidatePath('/admin/boards');
}

async function addBoard(formData: FormData) {
  'use server';
  const name = formData.get('name') as string;
  const group_name = formData.get('group_name') as string;
  const sort_order = Number(formData.get('sort_order')) || 0;
  try {
    if (name && group_name) {
      await sql`INSERT INTO boards (name, group_name, sort_order) VALUES (${name}, ${group_name}, ${sort_order})`;
    }
  } catch (e) {}
  revalidatePath('/admin/boards');
}

async function updateBoard(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  const is_write_locked = formData.get('is_write_locked') === 'on';
  const is_comment_locked = formData.get('is_comment_locked') === 'on';
  const sort_order = Number(formData.get('sort_order')) || 0;
  try {
    await sql`UPDATE boards SET is_write_locked = ${is_write_locked}, is_comment_locked = ${is_comment_locked}, sort_order = ${sort_order} WHERE id = ${id}`;
  } catch (e) {}
  revalidatePath('/admin/boards');
}

async function deleteBoard(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  try {
    await sql`DELETE FROM boards WHERE id = ${id}`;
  } catch (e) {}
  revalidatePath('/admin/boards');
}

export default async function AdminBoardsPage() {
  const cookieStore = await cookies();
  const currentUserId = cookieStore.get('ojemi_userid')?.value;
  if (currentUserId !== 'admin') redirect('/'); 

  let globalWriteLock = 'false';
  let globalCommentLock = 'false';
  let boardList = [];

  try {
    const { rows: settings } = await sql`SELECT * FROM site_settings`;
    settings.forEach(s => {
      if (s.key === 'global_write_lock') globalWriteLock = s.value;
      if (s.key === 'global_comment_lock') globalCommentLock = s.value;
    });

    const { rows: boards } = await sql`SELECT * FROM boards ORDER BY sort_order ASC, id ASC`;
    boardList = boards;
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
            <li><Link href="/admin/posts" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100"><span>📝</span> 게시글 관리</Link></li>
            <li><Link href="/admin/comments" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100"><span>💬</span> 댓글 관리</Link></li>
            <li><Link href="/admin/boards" className="flex items-center gap-3 px-6 py-3 bg-[#3b4890] text-white font-bold border-l-4 border-indigo-300"><span>⚙️</span> 설정/게시판 관리</Link></li>
          </ul>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center z-10 shadow-sm flex-shrink-0">
          <h1 className="text-xl font-black text-gray-800 tracking-tight">설정 & 게시판 관리</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          <div className="bg-white p-6 rounded-sm shadow-sm border border-red-200">
            <h2 className="text-lg font-black text-red-600 mb-4 flex items-center gap-2">🚨 전체 셧다운 (긴급 상황)</h2>
            <div className="flex gap-4">
              <form action={toggleGlobalLock} className="flex-1 bg-gray-50 p-4 rounded-sm border flex justify-between items-center">
                <input type="hidden" name="key" value="global_write_lock" />
                <input type="hidden" name="currentValue" value={globalWriteLock} />
                <div>
                  <p className="font-bold text-gray-800">전체 게시판 글쓰기 금지</p>
                  <p className="text-xs text-gray-500 mt-1">관리자를 제외한 모든 회원의 새 글 작성을 즉시 차단합니다.</p>
                </div>
                <button type="submit" className={`px-6 py-2 rounded-sm font-black text-sm shadow-sm transition-colors ${globalWriteLock === 'true' ? 'bg-red-600 text-white animate-pulse' : 'bg-white border text-gray-600 hover:bg-gray-100'}`}>
                  {globalWriteLock === 'true' ? '차단 해제하기' : '글쓰기 전면 차단'}
                </button>
              </form>

              <form action={toggleGlobalLock} className="flex-1 bg-gray-50 p-4 rounded-sm border flex justify-between items-center">
                <input type="hidden" name="key" value="global_comment_lock" />
                <input type="hidden" name="currentValue" value={globalCommentLock} />
                <div>
                  <p className="font-bold text-gray-800">전체 게시판 댓글 금지</p>
                  <p className="text-xs text-gray-500 mt-1">심각한 분쟁 시 모든 게시판의 새 댓글 작성을 즉시 차단합니다.</p>
                </div>
                <button type="submit" className={`px-6 py-2 rounded-sm font-black text-sm shadow-sm transition-colors ${globalCommentLock === 'true' ? 'bg-red-600 text-white animate-pulse' : 'bg-white border text-gray-600 hover:bg-gray-100'}`}>
                  {globalCommentLock === 'true' ? '차단 해제하기' : '댓글 전면 차단'}
                </button>
              </form>
            </div>
          </div>

          <div className="bg-white p-6 rounded-sm shadow-sm border border-gray-200">
            <h2 className="text-lg font-black text-[#3b4890] mb-4">✨ 새 게시판 만들기</h2>
            <form action={addBoard} className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 mb-1">상위 그룹 (예: 순한 유머 & 감동)</label>
                <input type="text" name="group_name" required className="w-full border p-2 text-sm font-bold rounded-sm outline-none focus:border-[#3b4890]" placeholder="그룹 이름 입력" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 mb-1">게시판 이름 (예: 자동차 갤러리)</label>
                <input type="text" name="name" required className="w-full border p-2 text-sm font-bold rounded-sm outline-none focus:border-[#3b4890]" placeholder="게시판 이름 입력" />
              </div>
              <div className="w-24">
                <label className="block text-xs font-bold text-gray-500 mb-1">표시 순서</label>
                <input type="number" name="sort_order" defaultValue="999" className="w-full border p-2 text-sm font-bold rounded-sm outline-none text-center" />
              </div>
              <button type="submit" className="px-6 py-2.5 bg-[#414a66] text-white font-bold text-sm rounded-sm hover:bg-[#2a3042] shadow-sm">
                + 추가
              </button>
            </form>
          </div>

          <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-sm font-black text-gray-800">운영 중인 게시판 목록 ({boardList.length}개)</h2>
              <p className="text-xs text-gray-500 mt-1">숫자가 낮을수록 메뉴판 앞쪽에 표시됩니다. 개별 게시판의 글쓰기/댓글을 잠글 수도 있습니다.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-white border-b border-gray-300 text-[11px] text-gray-500 font-black tracking-wider uppercase">
                    <th className="px-4 py-3 text-center">ID</th>
                    <th className="px-4 py-3">그룹명 (대분류)</th>
                    <th className="px-4 py-3">게시판 이름 (소분류)</th>
                    <th className="px-4 py-3 text-center">정렬 순서</th>
                    <th className="px-4 py-3 text-center text-red-500">글쓰기 잠금</th>
                    <th className="px-4 py-3 text-center text-red-500">댓글 잠금</th>
                    <th className="px-4 py-3 text-center">수정 / 삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {boardList.map((board: any) => (
                    <tr key={board.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 text-center text-gray-400 font-bold text-xs">{board.id}</td>
                      <td className="px-4 py-2 text-gray-600 font-bold text-xs">{board.group_name}</td>
                      <td className="px-4 py-2 text-[#3b4890] font-black text-sm">{board.name}</td>
                      
                      <td colSpan={4} className="p-0">
                        <form action={updateBoard} className="flex items-center w-full h-full">
                          <input type="hidden" name="id" value={board.id} />
                          
                          <div className="flex-1 flex justify-center border-l border-gray-100 px-4 py-2">
                            <input type="number" name="sort_order" defaultValue={board.sort_order} className="w-16 border p-1 text-xs font-bold text-center rounded-sm outline-none" />
                          </div>
                          
                          <div className="flex-1 flex justify-center border-l border-gray-100 px-4 py-2">
                            <input type="checkbox" name="is_write_locked" defaultChecked={board.is_write_locked} className="w-4 h-4 cursor-pointer accent-red-500" />
                          </div>
                          
                          <div className="flex-1 flex justify-center border-l border-gray-100 px-4 py-2">
                            <input type="checkbox" name="is_comment_locked" defaultChecked={board.is_comment_locked} className="w-4 h-4 cursor-pointer accent-red-500" />
                          </div>
                          
                          <div className="flex-1 flex justify-center items-center gap-1 border-l border-gray-100 px-4 py-2">
                            <button type="submit" className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-600 text-[11px] font-bold rounded-sm shadow-sm hover:bg-indigo-100">수정적용</button>
                            {/* 💡 안전 버튼 적용 완료! */}
                            <SafeButton 
                              label="삭제" 
                              confirmMessage="정말 이 게시판을 삭제하시겠습니까?\n(게시판 메뉴만 삭제되며 작성된 글은 보존됩니다)" 
                              formAction={deleteBoard} 
                              className="px-3 py-1 bg-white border border-gray-300 text-red-500 text-[11px] font-bold rounded-sm shadow-sm hover:bg-red-50 hover:border-red-200" 
                            />
                          </div>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
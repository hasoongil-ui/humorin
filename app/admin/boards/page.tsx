// @ts-nocheck
import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import SafeButton from '../SafeButton'; 

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
  const sort_order = Number(formData.get('sort_order')) || 999;
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
  const group_name = formData.get('group_name') as string;
  const name = formData.get('name') as string;
  const is_write_locked = formData.get('is_write_locked') === 'on';
  const is_comment_locked = formData.get('is_comment_locked') === 'on';
  const sort_order = Number(formData.get('sort_order')) || 999;
  
  const is_main_visible = formData.get('is_main_visible') === 'on';
  const main_sort_order = Number(formData.get('main_sort_order')) || 999;

  try {
    await sql`
      UPDATE boards 
      SET 
        group_name = ${group_name},
        name = ${name},
        is_write_locked = ${is_write_locked}, 
        is_comment_locked = ${is_comment_locked}, 
        sort_order = ${sort_order},
        is_main_visible = ${is_main_visible},
        main_sort_order = ${main_sort_order}
      WHERE id = ${id}
    `;
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

async function addForbiddenWord(formData: FormData) {
  'use server';
  const newWord = formData.get('newWord')?.toString().trim();
  if (!newWord) return;

  try {
    const { rows } = await sql`SELECT value FROM site_settings WHERE key = 'forbidden_words'`;
    let currentWords = rows.length > 0 ? rows[0].value : '';
    
    const wordsArray = currentWords ? currentWords.split(',').map((w: string) => w.trim()) : [];
    if (!wordsArray.includes(newWord)) {
      wordsArray.push(newWord);
      const newString = wordsArray.join(',');
      await sql`
        INSERT INTO site_settings (key, value) 
        VALUES ('forbidden_words', ${newString}) 
        ON CONFLICT (key) DO UPDATE SET value = ${newString};
      `;
    }
    revalidatePath('/admin/boards'); 
  } catch (e) {
    console.error(e);
  }
}

async function removeForbiddenWord(formData: FormData) {
  'use server';
  const wordToRemove = formData.get('wordToRemove')?.toString().trim();
  if (!wordToRemove) return;

  try {
    const { rows } = await sql`SELECT value FROM site_settings WHERE key = 'forbidden_words'`;
    if (rows.length === 0) return;

    let currentWords = rows[0].value;
    let wordsArray = currentWords.split(',').map((w: string) => w.trim());
    wordsArray = wordsArray.filter((w: string) => w !== wordToRemove); 
    const newString = wordsArray.join(',');

    await sql`UPDATE site_settings SET value = ${newString} WHERE key = 'forbidden_words'`;
    revalidatePath('/admin/boards'); 
  } catch (e) {
    console.error(e);
  }
}

export default async function AdminBoardsPage() {
  const cookieStore = await cookies();
  const currentUserId = cookieStore.get('ojemi_userid')?.value;
  if (currentUserId !== 'admin') redirect('/'); 

  let globalWriteLock = 'false';
  let globalCommentLock = 'false';
  let boardList = [];
  let forbiddenWordsList: string[] = []; 

  try {
    const { rows: settings } = await sql`SELECT * FROM site_settings`;
    settings.forEach(s => {
      if (s.key === 'global_write_lock') globalWriteLock = s.value;
      if (s.key === 'global_comment_lock') globalCommentLock = s.value;
      if (s.key === 'forbidden_words' && s.value) {
        forbiddenWordsList = s.value.split(',').map((w: string) => w.trim()).filter((w: string) => w !== '');
      }
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
            <li><Link href="/admin/blind" className="flex items-center gap-3 px-6 py-3 font-bold hover:bg-[#3b4890] transition-colors opacity-70 hover:opacity-100"><span>🚨</span> 블라인드 관리</Link></li>
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

          <div className="bg-white p-6 rounded-sm shadow-sm border border-indigo-200 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
            <h2 className="text-lg font-black text-gray-800 mb-2 flex items-center gap-2">
              <span className="text-indigo-500">🛡️</span> 스마트 금칙어 관리
            </h2>
            <p className="text-sm text-gray-500 mb-6 font-bold leading-relaxed">
              이곳에 단어를 등록해 두면, 글이나 댓글을 쓸 때 특수문자나 띄어쓰기를 섞어 써도(예: 도.박, ㅋr지노) 봇이 자동으로 뼈대를 발라내서 차단합니다.
            </p>

            <div className="flex flex-wrap gap-2 mb-6 bg-gray-50 p-4 border border-gray-200 rounded-sm min-h-[100px] items-start">
              {forbiddenWordsList.length > 0 ? (
                forbiddenWordsList.map((word, index) => (
                  <div key={index} className="flex items-center gap-1 bg-white border border-rose-300 text-rose-600 px-3 py-1.5 rounded-full shadow-sm text-[13px] font-black tracking-tight">
                    <span>{word}</span>
                    <form action={removeForbiddenWord}>
                      <input type="hidden" name="wordToRemove" value={word} />
                      <button type="submit" className="w-4 h-4 flex items-center justify-center bg-rose-100 hover:bg-rose-500 hover:text-white rounded-full text-[10px] ml-1 transition-colors" title="삭제">
                        ✕
                      </button>
                    </form>
                  </div>
                ))
              ) : (
                <span className="text-gray-400 text-sm font-bold mt-2 mx-auto">등록된 금칙어가 없습니다.</span>
              )}
            </div>

            <form action={addForbiddenWord} className="flex gap-2">
              <input 
                type="text" 
                name="newWord" 
                required 
                placeholder="추가할 금칙어 입력 (예: 불법도박)" 
                className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-sm outline-none focus:border-[#3b4890] font-bold text-[14px] shadow-sm"
              />
              <button type="submit" className="px-6 py-3 bg-[#414a66] text-white font-black text-[14px] rounded-sm hover:bg-[#2a3042] transition-colors shadow-sm whitespace-nowrap">
                단어 추가
              </button>
            </form>
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
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-end">
              <div>
                <h2 className="text-sm font-black text-gray-800">운영 중인 게시판 목록 ({boardList.length}개)</h2>
                <p className="text-xs text-gray-500 mt-1">이곳에서 그룹명(대분류)과 게시판 이름을 자유롭게 수정할 수 있습니다.</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap table-fixed">
                <colgroup>
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '95%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-white border-b border-gray-300 text-[11px] text-gray-500 font-black tracking-wider uppercase">
                    <th className="px-3 py-3 text-center">ID</th>
                    <th className="px-0 py-0">
                      <div className="grid w-full h-full" style={{ gridTemplateColumns: '15fr 15fr 10fr 10fr 10fr 10fr 15fr' }}>
                        <div className="px-2 py-3 border-r border-gray-200">그룹명 (대분류)</div>
                        <div className="px-2 py-3 border-r border-gray-200">게시판 이름</div>
                        <div className="px-2 py-3 text-center bg-gray-50 border-r border-gray-200">메뉴 순서</div>
                        <div className="px-2 py-3 text-center bg-gray-50 border-r border-gray-200 text-red-500">글/댓글 잠금</div>
                        <div className="px-2 py-3 text-center bg-indigo-50 border-r border-indigo-100 text-[#3b4890]">메인 노출</div>
                        <div className="px-2 py-3 text-center bg-indigo-50 border-r border-indigo-100 text-[#3b4890]">메인 순서</div>
                        <div className="px-3 py-3 text-center">관리 액션</div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {boardList.map((board: any) => (
                    <tr key={board.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 text-center text-gray-400 font-bold text-xs">{board.id}</td>
                      
                      {/* 🛡️ [수술 2] 그룹명과 게시판 이름을 텍스트박스(input)로 뚫었습니다! */}
                      <td className="p-0 h-full">
                        <form action={updateBoard} className="grid w-full h-full" style={{ gridTemplateColumns: '15fr 15fr 10fr 10fr 10fr 10fr 15fr' }}>
                          <input type="hidden" name="id" value={board.id} />
                          
                          <div className="flex flex-col justify-center border-r border-gray-100 px-2 py-2 h-full">
                            <input type="text" name="group_name" defaultValue={board.group_name} className="w-full border border-gray-300 p-1 text-[11px] font-bold rounded-sm outline-none focus:border-[#3b4890]" />
                          </div>
                          
                          <div className="flex flex-col justify-center border-r border-gray-100 px-2 py-2 h-full">
                            <input type="text" name="name" defaultValue={board.name} className="w-full border border-gray-300 p-1 text-[13px] font-black text-[#3b4890] rounded-sm outline-none focus:border-[#3b4890]" />
                          </div>
                          
                          <div className="flex flex-col items-center justify-center border-r border-gray-100 px-2 py-2 h-full bg-gray-50/30">
                            <input type="number" name="sort_order" defaultValue={board.sort_order} className="w-14 border border-gray-300 p-1 text-xs font-bold text-center rounded-sm outline-none" />
                          </div>
                          
                          <div className="flex flex-col gap-1 items-center justify-center border-r border-gray-100 px-2 py-2 h-full bg-gray-50/30">
                            <label className="flex items-center gap-1 text-[10px] text-gray-500 font-bold cursor-pointer"><input type="checkbox" name="is_write_locked" defaultChecked={board.is_write_locked} className="w-3.5 h-3.5 accent-red-500" /> 글 잠금</label>
                            <label className="flex items-center gap-1 text-[10px] text-gray-500 font-bold cursor-pointer"><input type="checkbox" name="is_comment_locked" defaultChecked={board.is_comment_locked} className="w-3.5 h-3.5 accent-red-500" /> 댓글잠금</label>
                          </div>
                          
                          <div className="flex items-center justify-center border-r border-indigo-50 px-2 py-2 h-full bg-indigo-50/30">
                            <label className="flex items-center justify-center gap-1 text-[11px] font-black text-indigo-600 cursor-pointer">
                              <input type="checkbox" name="is_main_visible" defaultChecked={board.is_main_visible} className="w-4 h-4 accent-indigo-600" /> ON
                            </label>
                          </div>
                          
                          <div className="flex items-center justify-center border-r border-indigo-50 px-2 py-2 h-full bg-indigo-50/30">
                            <input type="number" name="main_sort_order" defaultValue={board.main_sort_order} className="w-14 border border-indigo-300 p-1 text-xs font-bold text-center rounded-sm outline-none text-indigo-900" />
                          </div>
                          
                          <div className="flex justify-center items-center gap-1 px-3 py-2 h-full">
                            <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-sm shadow-sm hover:bg-indigo-700 whitespace-nowrap">수정적용</button>
                            <SafeButton 
                              label="삭제" 
                              confirmMessage="정말 이 게시판을 삭제하시겠습니까?\n(게시판만 삭제되며 작성된 글은 삭제되지 않습니다)" 
                              formAction={deleteBoard} 
                              className="px-3 py-1.5 bg-white border border-gray-300 text-red-500 text-[11px] font-bold rounded-sm shadow-sm hover:bg-red-50 hover:border-red-200" 
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
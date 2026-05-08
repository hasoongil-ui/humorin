import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import WriteClient from './WriteClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function WritePage() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('humorin_user');
  const userIdCookie = cookieStore.get('humorin_userid');
  
  const currentUser = userCookie ? userCookie.value : null;
  const currentUserId = userIdCookie ? userIdCookie.value : null;

  if (!currentUser) redirect('/login');

  const isAdmin = currentUserId === 'admin';
  
  let isGlobalLocked = false;
  let boards: any[] = []; 
  let editorPlaceholder = '내용을 작성해 주십시오. 유튜브 영상은 주소를 이곳에 붙여넣기(Ctrl+V) 하시면 자동으로 추가됩니다.';
  
  let userPoints = 0;
  let userStatus = 'active'; // 💡 상태값 가져오기 추가

  try {
    const { rows: settings } = await sql`SELECT key, value FROM site_settings WHERE key IN ('global_write_lock', 'editor_placeholder')`;
    
    settings.forEach(setting => {
      if (setting.key === 'global_write_lock' && setting.value === 'true') isGlobalLocked = true;
      if (setting.key === 'editor_placeholder' && setting.value) editorPlaceholder = setting.value;
    });

    const { rows: boardRows } = await sql`SELECT * FROM boards ORDER BY sort_order ASC, id ASC`;
    boards = boardRows;

    if (currentUserId) {
      const { rows: userRows } = await sql`SELECT points, status FROM users WHERE user_id = ${currentUserId}`;
      if (userRows.length > 0) {
        userPoints = userRows[0].points || 0;
        userStatus = userRows[0].status || 'active';
      }
    }
  } catch (error) {
    console.error("DB 로드 실패:", error);
  }

  // 🚨 [정지 유저 컷컷!] 화면 접근 원천 차단 (그림자는 통과시킴)
  if (userStatus === 'suspended' && !isAdmin) {
    return (
      <div className="min-h-[70vh] bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 sm:p-12 rounded-lg shadow-md border border-red-200 text-center max-w-lg w-full">
          <div className="text-red-500 text-6xl mb-6">🚨</div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-800 mb-4">이용이 정지된 계정입니다</h2>
          <p className="text-[15px] text-gray-600 font-medium leading-relaxed mb-8">
            관리자에 의해 글쓰기 권한이 영구 제한되었습니다.
          </p>
          <Link href="/board" className="inline-block px-8 py-3.5 bg-[#414a66] text-white font-bold rounded-sm hover:bg-[#2a3042] transition-colors shadow-sm">
            게시판으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <WriteClient 
      currentUser={currentUser} 
      isAdmin={isAdmin} 
      isGlobalLocked={isGlobalLocked} 
      boards={boards} 
      editorPlaceholder={editorPlaceholder} 
      userPoints={userPoints} 
    />
  );
}
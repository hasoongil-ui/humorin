import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import WriteClient from './WriteClient';

export const dynamic = 'force-dynamic';

export default async function WritePage() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('humorin_user');
  const userIdCookie = cookieStore.get('humorin_userid');
  
  const currentUser = userCookie ? userCookie.value : null;
  const currentUserId = userIdCookie ? userIdCookie.value : null;

  // 1. 기본 출입증(로그인) 검사
  if (!currentUser) {
    redirect('/login');
  }

  const isAdmin = currentUserId === 'admin';
  
  // 2. 관리자 통제실(DB)에서 셧다운 여부와 게시판 목록을 실시간으로 가져옵니다!
  let isGlobalLocked = false;
  let boards: any[] = []; 
  let editorPlaceholder = '내용을 작성해 주십시오. 유튜브 영상은 주소를 이곳에 붙여넣기(Ctrl+V) 하시면 자동으로 추가됩니다.';
  
  // 🚨 [테러 방어막 연동] 유저의 활동 점수(Points)를 스캔합니다.
  let userPoints = 0;

  try {
    const { rows: settings } = await sql`SELECT key, value FROM site_settings WHERE key IN ('global_write_lock', 'editor_placeholder')`;
    
    settings.forEach(setting => {
      if (setting.key === 'global_write_lock' && setting.value === 'true') {
        isGlobalLocked = true;
      }
      if (setting.key === 'editor_placeholder' && setting.value) {
        editorPlaceholder = setting.value;
      }
    });

    const { rows: boardRows } = await sql`SELECT * FROM boards ORDER BY sort_order ASC, id ASC`;
    boards = boardRows;

    // 현재 유저의 포인트 조회
    if (currentUserId) {
      const { rows: userRows } = await sql`SELECT points FROM users WHERE user_id = ${currentUserId}`;
      if (userRows.length > 0) userPoints = userRows[0].points || 0;
    }
  } catch (error) {
    console.error("DB 로드 실패:", error);
  }

  // 글쓰기 화면(Client)으로 유저 정보와 통제실 데이터, 그리고 '방어용 포인트'를 전달합니다!
  return (
    <WriteClient 
      currentUser={currentUser} 
      isAdmin={isAdmin} 
      isGlobalLocked={isGlobalLocked} 
      boards={boards} 
      editorPlaceholder={editorPlaceholder} 
      userPoints={userPoints} // 💡 WriteClient 내부에서 이 값이 10 미만일 때 http 포함시 차단하도록 활용하십시오!
    />
  );
}
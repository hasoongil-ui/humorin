import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sql } from '@vercel/postgres';
import WriteClient from './WriteClient';

export const dynamic = 'force-dynamic';

export default async function WritePage() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('ojemi_user');
  const userIdCookie = cookieStore.get('ojemi_userid');
  
  const currentUser = userCookie ? userCookie.value : null;
  const currentUserId = userIdCookie ? userIdCookie.value : null;

  // 1. 기본 출입증(로그인) 검사
  if (!currentUser) {
    redirect('/login');
  }

  const isAdmin = currentUserId === 'admin';
  
  // 2. 관리자 통제실(DB)에서 셧다운 여부와 게시판 목록을 실시간으로 가져옵니다!
  let isGlobalLocked = false;
  
  // 💡 [에러 해결!] 빈 바구니에 'any[]' 라는 이름표를 붙여서 깐깐한 검사기를 통과합니다!
  let boards: any[] = []; 

  try {
    const { rows: settings } = await sql`SELECT value FROM site_settings WHERE key = 'global_write_lock'`;
    if (settings.length > 0 && settings[0].value === 'true') {
      isGlobalLocked = true;
    }

    const { rows: boardRows } = await sql`SELECT * FROM boards ORDER BY sort_order ASC, id ASC`;
    boards = boardRows;
  } catch (error) {
    console.error("DB 로드 실패:", error);
  }

  // 글쓰기 화면(Client)으로 유저 정보와 통제실 데이터를 모두 전달합니다!
  return (
    <WriteClient 
      currentUser={currentUser} 
      isAdmin={isAdmin} 
      isGlobalLocked={isGlobalLocked} 
      boards={boards} 
    />
  );
}
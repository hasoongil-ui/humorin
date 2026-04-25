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
  // 💡 [수술 2] 관리자가 아무것도 입력 안 했을 때를 대비한 기본값 세팅
  let editorPlaceholder = '내용을 작성해 주십시오. 유튜브 영상은 주소를 이곳에 붙여넣기(Ctrl+V) 하시면 자동으로 추가됩니다.';

  try {
    // 💡 [수술 3] DB에서 얼음 기능과 안내 문구를 한 번에 가져옵니다!
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
      editorPlaceholder={editorPlaceholder} // 💡 [수술 4] 스캔한 안내 문구를 넘겨줍니다!
    />
  );
}
'use server';

import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function logoutAction() {
  const store = await cookies();
  store.delete('ojemi_user');
  redirect('/'); 
}

export async function deleteAccountAction(currentUser: string) {
  try { await sql`DELETE FROM users WHERE id::text = ${currentUser}`; } catch(e) {}
  try { await sql`DELETE FROM users WHERE userid::text = ${currentUser}`; } catch(e) {}
  
  const store = await cookies();
  store.delete('ojemi_user');
  redirect('/');
}

export async function updateProfileAction(currentUser: string, newNick: string, newPass: string) {
  let updated = false;
  let msg = '';
  
  try {
    // 💡 1. 초강력 닉네임 중복 검사 (에러 절대 안 남!)
    if (newNick && newNick !== currentUser) {
       let isTaken = false;

       // 1차 방어벽: 활동 내역(게시글, 댓글)에서 똑같은 이름이 있는지 확인
       try { const p = await sql`SELECT id FROM posts WHERE author = ${newNick} LIMIT 1`; if (p.rows.length > 0) isTaken = true; } catch(e) {}
       try { const c = await sql`SELECT id FROM comments WHERE author = ${newNick} LIMIT 1`; if (c.rows.length > 0) isTaken = true; } catch(e) {}

       // 2차 방어벽: 유저 테이블에서 확인 (::text 를 붙여서 타입 에러 원천 차단!)
       if (!isTaken) {
         try { const u1 = await sql`SELECT * FROM users WHERE id::text = ${newNick}`; if (u1.rows.length > 0) isTaken = true; } catch(e) {}
         try { const u2 = await sql`SELECT * FROM users WHERE userid::text = ${newNick}`; if (u2.rows.length > 0) isTaken = true; } catch(e) {}
         try { const u3 = await sql`SELECT * FROM users WHERE nickname::text = ${newNick}`; if (u3.rows.length > 0) isTaken = true; } catch(e) {}
       }

       if (isTaken) {
          return { success: false, message: '🚨 이미 사용 중인 닉네임입니다. 다른 닉네임으로 변경해 주시기 바랍니다.' };
       }
    }

    // 💡 2. 비밀번호 변경
    if (newPass) {
       try { await sql`UPDATE users SET password = ${newPass} WHERE id::text = ${currentUser}`; } catch(e) {}
       try { await sql`UPDATE users SET password = ${newPass} WHERE userid::text = ${currentUser}`; } catch(e) {}
       updated = true;
       msg += '✅ 비밀번호 변경 성공!\n';
    }

    // 💡 3. 닉네임 동기화 (과거 기록 싹쓸이)
    if (newNick && newNick !== currentUser) {
       try { await sql`UPDATE users SET id = ${newNick} WHERE id::text = ${currentUser}`; } catch(e) {}
       try { await sql`UPDATE users SET userid = ${newNick} WHERE userid::text = ${currentUser}`; } catch(e) {}
       try { await sql`UPDATE users SET nickname = ${newNick} WHERE nickname::text = ${currentUser}`; } catch(e) {}
       
       try { await sql`UPDATE posts SET author = ${newNick} WHERE author = ${currentUser}`; } catch(e) {}
       try { await sql`UPDATE comments SET author = ${newNick} WHERE author = ${currentUser}`; } catch(e) {}
       try { await sql`UPDATE likes SET author = ${newNick} WHERE author = ${currentUser}`; } catch(e) {}
       try { await sql`UPDATE scraps SET author = ${newNick} WHERE author = ${currentUser}`; } catch(e) {}
       try { await sql`UPDATE comment_likes SET author = ${newNick} WHERE author = ${currentUser}`; } catch(e) {}
       
       const store = await cookies();
       store.set('ojemi_user', newNick);
       updated = true;
       msg += '✅ 닉네임이 성공적으로 변경되었습니다! (과거 기록 동기화 완료)\n';
    }

    return { success: updated, message: msg || '변경된 내용이 없습니다.' };
  } catch(error: any) {
    console.error(error);
    return { success: false, message: `❌ 정보 수정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.` };
  }
}
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
  // 숫자 기둥(id)이 아닌 글자 기둥(userid, nickname)에서 유저를 찾아 삭제!
  try { await sql`DELETE FROM users WHERE userid = ${currentUser}`; } catch(e) {}
  try { await sql`DELETE FROM users WHERE nickname = ${currentUser}`; } catch(e) {}
  
  const store = await cookies();
  store.delete('ojemi_user');
  redirect('/');
}

export async function updateProfileAction(currentUser: string, newNick: string, newPass: string) {
  let updated = false;
  let msg = '';
  
  try {
    // 💡 1. 닉네임 중복 검사 (에러 완전 차단)
    if (newNick && newNick !== currentUser) {
       let isTaken = false;
       try { const p = await sql`SELECT id FROM posts WHERE author = ${newNick} LIMIT 1`; if (p.rowCount && p.rowCount > 0) isTaken = true; } catch(e) {}
       try { const c = await sql`SELECT id FROM comments WHERE author = ${newNick} LIMIT 1`; if (c.rowCount && c.rowCount > 0) isTaken = true; } catch(e) {}

       if (!isTaken) {
         // id 대신 userid 와 nickname 기둥에서 중복을 찾습니다!
         try { const u2 = await sql`SELECT userid FROM users WHERE userid = ${newNick}`; if (u2.rowCount && u2.rowCount > 0) isTaken = true; } catch(e) {}
         try { const u3 = await sql`SELECT nickname FROM users WHERE nickname = ${newNick}`; if (u3.rowCount && u3.rowCount > 0) isTaken = true; } catch(e) {}
       }

       if (isTaken) {
          return { success: false, message: '🚨 이미 사용 중인 닉네임입니다. 다른 닉네임으로 변경해 주시기 바랍니다.' };
       }
    }

    // 💡 2. 비밀번호 변경 (스마트 찾기 적용!)
    if (newPass) {
       let passRes;
       // 1차 시도: userid 기둥에서 찾기
       try { passRes = await sql`UPDATE users SET password = ${newPass} WHERE userid = ${currentUser}`; } catch(e) {}
       
       // 2차 시도: 만약 userid가 없으면 nickname 기둥에서 찾기
       if (!passRes || passRes.rowCount === 0) {
         try { passRes = await sql`UPDATE users SET password = ${newPass} WHERE nickname = ${currentUser}`; } catch(e) {}
       }
       
       if (passRes && passRes.rowCount && passRes.rowCount > 0) {
         updated = true;
         msg += '✅ 비밀번호 변경 성공!\n';
       } else {
         return { success: false, message: '❌ 비밀번호 변경 실패 (DB에서 회원 정보를 찾지 못했습니다.)' };
       }
    }

    // 💡 3. 닉네임 변경 및 과거 기록 동기화
    if (newNick && newNick !== currentUser) {
       let nickRes;
       // users 테이블 닉네임 변경
       try { nickRes = await sql`UPDATE users SET userid = ${newNick} WHERE userid = ${currentUser}`; } catch(e) {}
       if (!nickRes || nickRes.rowCount === 0) {
         try { nickRes = await sql`UPDATE users SET nickname = ${newNick} WHERE nickname = ${currentUser}`; } catch(e) {}
       }

       if (nickRes && nickRes.rowCount && nickRes.rowCount > 0) {
         // 싹쓸이 업데이트
         try { await sql`UPDATE posts SET author = ${newNick} WHERE author = ${currentUser}`; } catch(e) {}
         try { await sql`UPDATE comments SET author = ${newNick} WHERE author = ${currentUser}`; } catch(e) {}
         try { await sql`UPDATE likes SET author = ${newNick} WHERE author = ${currentUser}`; } catch(e) {}
         try { await sql`UPDATE scraps SET author = ${newNick} WHERE author = ${currentUser}`; } catch(e) {}
         try { await sql`UPDATE comment_likes SET author = ${newNick} WHERE author = ${currentUser}`; } catch(e) {}
         
         const store = await cookies();
         store.set('ojemi_user', newNick);
         updated = true;
         msg += '✅ 닉네임이 성공적으로 변경되었습니다! (과거 기록 동기화 완료)\n';
       } else {
         return { success: false, message: '❌ 닉네임 업데이트 실패 (회원 정보를 찾을 수 없습니다.)' };
       }
    }

    return { success: updated, message: msg || '변경된 내용이 없습니다.' };
  } catch(error: any) {
    return { success: false, message: `❌ 정보 수정 중 시스템 오류가 발생했습니다: ${error.message}` };
  }
}
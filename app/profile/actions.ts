'use server';

import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export async function updateProfileAction(formData: FormData) {
  const currentUserId = formData.get('currentUserId') as string;
  const currentNickname = formData.get('currentNickname') as string;
  const newNickname = formData.get('newNickname') as string;
  const newPassword = formData.get('newPassword') as string;

  if (!currentUserId && !currentNickname) return;

  try {
    // 1. 닉네임 변경 
    if (newNickname && newNickname.trim() !== '') {
      const checkResult = await sql`SELECT user_id FROM users WHERE nickname = ${newNickname.trim()}`;
      if (checkResult.rows.length === 0) {
        
        // 💡 닉네임 에러 박멸: user_id 또는 현재 닉네임을 기반으로 정확하게 업데이트!
        if (currentUserId) {
          await sql`UPDATE users SET nickname = ${newNickname.trim()} WHERE user_id = ${currentUserId}`;
        } else {
          await sql`UPDATE users SET nickname = ${newNickname.trim()} WHERE nickname = ${currentNickname}`;
        }
        
        const cookieStore = await cookies();
        cookieStore.set({
          name: 'ojemi_user',
          value: newNickname.trim(),
          httpOnly: true,
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        });
      }
    }

    // 2. 비밀번호 변경
    if (newPassword && newPassword.trim() !== '') {
       if (currentUserId) {
          await sql`UPDATE users SET password = ${newPassword.trim()} WHERE user_id = ${currentUserId}`;
       } else {
          await sql`UPDATE users SET password = ${newPassword.trim()} WHERE nickname = ${currentNickname}`;
       }
    }
  } catch (error) {
    console.error("프로필 업데이트 에러:", error);
  }

  redirect('/profile?tab=settings');
}

// 💡 [새로 추가된 대기업급 마술] 회원 탈퇴 (소프트 딜리트) 요원!
export async function deleteUserAction(formData: FormData) {
  const currentUserId = formData.get('currentUserId') as string;
  if (!currentUserId) return;

  try {
    // 1. 꼬리표로 쓸 현재 시간(타임스탬프) 생성
    const timestamp = Date.now();
    // 2. 새로운 가짜 아이디와 닉네임 생성 (예: del_171000..._ruffian)
    const deletedId = `del_${timestamp}_${currentUserId}`.substring(0, 48);
    const deletedNickname = `탈퇴회원_${timestamp.toString().slice(-5)}`;

    // 3. 기존 이메일 가져오기 (이메일도 변조해야 재가입이 가능해짐!)
    const userRes = await sql`SELECT email FROM users WHERE user_id = ${currentUserId}`;
    let deletedEmail = `del_${timestamp}@deleted.com`;
    if (userRes.rows.length > 0 && userRes.rows[0].email) {
      deletedEmail = `del_${timestamp}_${userRes.rows[0].email}`.substring(0, 250);
    }

    // 4. DB 덮어쓰기 (정보 가리기)
    await sql`
      UPDATE users
      SET
        user_id = ${deletedId},
        nickname = ${deletedNickname},
        email = ${deletedEmail},
        password = 'DELETED_USER_LOCKED',
        is_admin = false
      WHERE user_id = ${currentUserId}
    `;

    // 5. 쿠키 폭파 (강제 로그아웃)
    const cookieStore = await cookies();
    cookieStore.delete('ojemi_user');
    cookieStore.delete('ojemi_userid');
    cookieStore.delete('ojemi_signature');

  } catch (error) {
    console.error("회원 탈퇴 처리 중 에러 발생:", error);
    return; // 에러 나면 튕기지 않게 방어
  }

  // 탈퇴가 완벽하게 끝나면 오재미 대문(메인 화면)으로 쫓아냅니다!
  redirect('/');
}
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
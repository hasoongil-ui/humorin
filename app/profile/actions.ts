// 파일 위치: app/profile/actions.ts
'use server';

import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs'; 

export async function updateProfileAction(formData: FormData) {
  const currentUserId = formData.get('currentUserId') as string;
  const currentNickname = formData.get('currentNickname') as string;
  const newNickname = formData.get('newNickname') as string;
  const newEmail = formData.get('newEmail') as string; 
  const newPassword = formData.get('newPassword') as string; 

  if (!currentUserId && !currentNickname) return;

  try {
    if (newNickname && newNickname.trim() !== '') {
      const checkResult = await sql`SELECT user_id FROM users WHERE nickname = ${newNickname.trim()}`;
      if (checkResult.rows.length === 0) {
        if (currentUserId) {
          await sql`UPDATE users SET nickname = ${newNickname.trim()} WHERE user_id = ${currentUserId}`;
        } else {
          await sql`UPDATE users SET nickname = ${newNickname.trim()} WHERE nickname = ${currentNickname}`;
        }
        
        const cookieStore = await cookies();
        cookieStore.set({
          name: 'humorin_user',
          value: newNickname.trim(),
          httpOnly: true,
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        });
      }
    }

    if (newEmail && newEmail.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(newEmail.trim())) {
        const checkEmail = await sql`SELECT user_id FROM users WHERE email = ${newEmail.trim()}`;
        if (checkEmail.rows.length === 0) {
          if (currentUserId) {
            await sql`UPDATE users SET email = ${newEmail.trim()} WHERE user_id = ${currentUserId}`;
          } else {
            await sql`UPDATE users SET email = ${newEmail.trim()} WHERE nickname = ${currentNickname}`;
          }
        }
      }
    }

    if (newPassword && newPassword.trim() !== '') {
       const pw = newPassword.trim();
       if (pw.length < 8) throw new Error("비밀번호는 8자리 이상이어야 합니다."); 
       
       const hashedPassword = await bcrypt.hash(pw, 10);
       if (currentUserId) {
          await sql`UPDATE users SET password = ${hashedPassword} WHERE user_id = ${currentUserId}`;
       } else {
          await sql`UPDATE users SET password = ${hashedPassword} WHERE nickname = ${currentNickname}`;
       }
    }
  } catch (error) {
    console.error("프로필 업데이트 에러:", error);
  }

  redirect('/profile?tab=settings');
}

export async function deleteUserAction(formData: FormData) {
  const currentUserId = formData.get('currentUserId') as string;
  if (!currentUserId) return;

  try {
    const timestamp = Date.now();
    const deletedNickname = `탈퇴회원_${timestamp.toString().slice(-5)}`;

    const userRes = await sql`SELECT email FROM users WHERE user_id = ${currentUserId}`;
    let deletedEmail = `del_${timestamp}@deleted.com`;
    if (userRes.rows.length > 0 && userRes.rows[0].email) {
      deletedEmail = `del_${timestamp}_${userRes.rows[0].email}`.substring(0, 250);
    }

    // 🚨 [진짜 문제 해결!]
    // 1. user_id를 바꾸면 외래키(게시글 연결) 에러가 나므로 건드리지 않음!
    // 2. updated_at 컬럼이 없어 에러가 났으므로, 존재하는 last_login을 활용해 탈퇴 시간을 기록!
    await sql`
      UPDATE users
      SET
        nickname = ${deletedNickname},
        email = ${deletedEmail},
        password = 'DELETED_USER_LOCKED',
        is_admin = false,
        status = 'withdrawn',
        last_login = NOW()
      WHERE user_id = ${currentUserId}
    `;

    const cookieStore = await cookies();
    cookieStore.delete('humorin_user');
    cookieStore.delete('humorin_userid');
    cookieStore.delete('humorin_signature');

  } catch (error) {
    console.error("회원 탈퇴 처리 중 에러 발생:", error);
    throw new Error("탈퇴 처리 중 오류가 발생했습니다.");
  }

  redirect('/');
}
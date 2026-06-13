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
    // 1. 닉네임 변경 
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

    // 2. 이메일 변경 (서버단 2차 철통 방어 검사)
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

    // 3. 비밀번호 변경 (서버단 2차 철통 방어 & Bcrypt 암호화)
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

    // 🚨 [7일 쿨타임 수술 핵심] user_id는 절대 변형하지 않고 남겨둬서 재가입을 식별합니다!
    // 대신 status를 'withdrawn'으로 바꾸고 개인정보를 날려버립니다.
    await sql`
      UPDATE users
      SET
        nickname = ${deletedNickname},
        email = ${deletedEmail},
        password = 'DELETED_USER_LOCKED',
        is_admin = false,
        status = 'withdrawn',
        updated_at = NOW() 
      WHERE user_id = ${currentUserId}
    `;

    const cookieStore = await cookies();
    cookieStore.delete('humorin_user');
    cookieStore.delete('humorin_userid');
    cookieStore.delete('humorin_signature');

  } catch (error) {
    console.error("회원 탈퇴 처리 중 에러 발생:", error);
    return; 
  }

  redirect('/');
}
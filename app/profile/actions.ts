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

    // 💡 2. 이메일 변경 (서버단 2차 철통 방어 검사)
    if (newEmail && newEmail.trim() !== '') {
      // 🚨 [크롬 자동완성 테러 방어막 2] 서버단에서도 형식을 깐깐하게 검사합니다.
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      // 골뱅이(@)가 없는 불량 이메일(크롬 자동입력)은 DB 덮어쓰기를 가차없이 취소합니다.
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

    // 💡 3. 비밀번호 변경 (서버단 2차 철통 방어 & Bcrypt 암호화)
    if (newPassword && newPassword.trim() !== '') {
       const pw = newPassword.trim();
       
       if (pw.length < 8) {
         throw new Error("비밀번호는 8자리 이상이어야 합니다."); 
       }
       
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
    const deletedId = `del_${timestamp}_${currentUserId}`.substring(0, 48);
    const deletedNickname = `탈퇴회원_${timestamp.toString().slice(-5)}`;

    const userRes = await sql`SELECT email FROM users WHERE user_id = ${currentUserId}`;
    let deletedEmail = `del_${timestamp}@deleted.com`;
    if (userRes.rows.length > 0 && userRes.rows[0].email) {
      deletedEmail = `del_${timestamp}_${userRes.rows[0].email}`.substring(0, 250);
    }

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
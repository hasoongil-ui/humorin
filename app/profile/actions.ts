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
          
          // 🚀 [B안 일괄 동기화] 닉네임 변경 시, 과거 글과 댓글의 이름표를 0.001초 만에 새것으로 교체!
          await sql`UPDATE posts SET author = ${newNickname.trim()} WHERE author_id = ${currentUserId}`;
          await sql`UPDATE comments SET author = ${newNickname.trim()} WHERE author_id = ${currentUserId}`;
        } else {
          await sql`UPDATE users SET nickname = ${newNickname.trim()} WHERE nickname = ${currentNickname}`;
          
          // 🚀 (currentUserId가 없는 레거시 유저용 과거 글 동기화)
          await sql`UPDATE posts SET author = ${newNickname.trim()} WHERE author = ${currentNickname}`;
          await sql`UPDATE comments SET author = ${newNickname.trim()} WHERE author = ${currentNickname}`;
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
    // 🛡️ 악성 유저(banned) 자진 탈퇴 원천 차단
    const userStatusRes = await sql`SELECT status FROM users WHERE user_id = ${currentUserId}`;
    if (userStatusRes.rows.length > 0 && userStatusRes.rows[0].status === 'banned') {
      throw new Error("관리자에 의해 이용이 정지된 계정은 탈퇴할 수 없습니다.");
    }

    const timestamp = Date.now();
    const deletedNickname = `탈퇴회원_${timestamp.toString().slice(-5)}`;
    
    // 탈퇴자용 영구 식별자 생성 (고아화에 사용)
    const deletedAuthorId = `deleted_${currentUserId}_${timestamp}`;
    const deletedAuthorName = '탈퇴한 회원';

    // ✂️ 내가 쓴 모든 게시글의 소유권(이름표) 영구 절단
    await sql`
      UPDATE posts
      SET author_id = ${deletedAuthorId}, author = ${deletedAuthorName}
      WHERE author_id = ${currentUserId}
    `;

    // ✂️ 내가 쓴 모든 댓글의 소유권 영구 절단
    await sql`
      UPDATE comments
      SET author_id = ${deletedAuthorId}, author = ${deletedAuthorName}
      WHERE author_id = ${currentUserId}
    `;

    // 🚀 [환생 심령현상 방어막] 전생의 쓸모없는 개인 흔적(스크랩, 추천 기록) 완벽 소각 및 DB 다이어트!
    await sql`DELETE FROM scraps WHERE author_id = ${currentUserId}`;
    await sql`DELETE FROM likes WHERE author_id = ${currentUserId}`;
    await sql`DELETE FROM post_dislikes WHERE author_id = ${currentUserId}`;
    await sql`DELETE FROM comment_likes WHERE author_id = ${currentUserId}`;
    await sql`DELETE FROM comment_dislikes WHERE author_id = ${currentUserId}`;

    // 껍데기 처리 (기존 뼈대 유지)
    const userRes = await sql`SELECT email FROM users WHERE user_id = ${currentUserId}`;
    let deletedEmail = `del_${timestamp}@deleted.com`;
    if (userRes.rows.length > 0 && userRes.rows[0].email) {
      deletedEmail = `del_${timestamp}_${userRes.rows[0].email}`.substring(0, 250);
    }

    // 🚨 [진짜 문제 해결!] 사진, 이름, 이메일을 완벽하게 백지화! 
    await sql`
      UPDATE users
      SET
        nickname = ${deletedNickname},
        email = ${deletedEmail},
        password = 'DELETED_USER_LOCKED',
        profile_image = NULL,
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
    throw new Error(error instanceof Error ? error.message : "탈퇴 처리 중 오류가 발생했습니다.");
  }

  redirect('/');
}
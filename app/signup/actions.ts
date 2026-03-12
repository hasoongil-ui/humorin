'use server';

import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// 💡 [미나의 금칙어 사전] 사칭 악용을 막기 위한 절대 금지 단어들!
const FORBIDDEN_WORDS = ['admin', '관리자', '운영자', '오재미', 'ojemi', '스탭', '매니저', '마스터', '시스템'];

// 💡 꼼수 방지: 유저가 '관 리 자' 처럼 띄어쓰기를 섞어도 다 붙여서 검사해버립니다.
function isForbidden(text: string) {
  const lowerText = text.toLowerCase().replace(/\s/g, ''); 
  return FORBIDDEN_WORDS.some(word => lowerText.includes(word));
}

export async function checkDuplicate(type: 'id' | 'nickname', value: string) {
  if (!value) return 'empty';
  
  // 1. 사칭 금칙어 검사!
  if (isForbidden(value)) return 'forbidden';
  
  // 2. DB 중복 검사!
  if (type === 'id') {
    const { rows } = await sql`SELECT user_id FROM users WHERE user_id = ${value}`;
    if (rows.length > 0) return 'duplicate';
  }
  
  if (type === 'nickname') {
    const { rows } = await sql`SELECT nickname FROM users WHERE nickname = ${value}`;
    if (rows.length > 0) return 'duplicate';
  }
  
  return 'ok'; // 모든 검사 통과!
}

export async function registerUserAction(formData: FormData) {
  const userId = formData.get('user_id') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirm_password') as string;
  const nickname = formData.get('nickname') as string;
  const email = formData.get('email') as string;

  if (password !== confirmPassword) {
    return { error: 'mismatch' };
  }

  // 서버단 2차 철벽 방어 (혹시 모를 해킹 시도 차단)
  const idStatus = await checkDuplicate('id', userId);
  if (idStatus !== 'ok') return { error: idStatus === 'forbidden' ? 'id_forbidden' : 'id_exists' };

  const nickStatus = await checkDuplicate('nickname', nickname);
  if (nickStatus !== 'ok') return { error: nickStatus === 'forbidden' ? 'nick_forbidden' : 'nick_exists' };

  try {
    await sql`
      INSERT INTO users (user_id, password, nickname, email)
      VALUES (${userId}, ${password}, ${nickname}, ${email})
    `;
    
    const cookieStore = await cookies();
    cookieStore.set({ name: 'ojemi_user', value: nickname, httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 });
    cookieStore.set({ name: 'ojemi_userid', value: userId, httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 });
    
  } catch (error) {
    console.error("DB 에러:", error);
    return { error: 'db_error' };
  }
  
  redirect('/board');
}
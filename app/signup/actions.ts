'use server';

import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const FORBIDDEN_WORDS = ['admin', '관리자', '운영자', '오재미', 'ojemi', '스탭', '매니저', '마스터', '시스템'];

function isForbidden(text: string) {
  const lowerText = text.toLowerCase().replace(/\s/g, ''); 
  return FORBIDDEN_WORDS.some(word => lowerText.includes(word));
}

export async function checkDuplicate(type: 'id' | 'nickname', value: string) {
  if (!value) return 'empty';
  
  if (isForbidden(value)) return 'forbidden';
  
  if (type === 'id') {
    const { rows } = await sql`SELECT user_id FROM users WHERE user_id = ${value}`;
    if (rows.length > 0) return 'duplicate';
  }
  
  if (type === 'nickname') {
    const { rows } = await sql`SELECT nickname FROM users WHERE nickname = ${value}`;
    if (rows.length > 0) return 'duplicate';
  }
  
  return 'ok'; 
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

  const idStatus = await checkDuplicate('id', userId);
  if (idStatus !== 'ok') return { error: idStatus === 'forbidden' ? 'id_forbidden' : 'id_exists' };

  const nickStatus = await checkDuplicate('nickname', nickname);
  if (nickStatus !== 'ok') return { error: nickStatus === 'forbidden' ? 'nick_forbidden' : 'nick_exists' };

  try {
    // 💡 IP 수집 기능을 제거하고 원래대로 가볍게 돌렸습니다!
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
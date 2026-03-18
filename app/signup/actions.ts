'use server';

import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs'; // 🛡️ [추가] 최고 등급 암호화 라이브러리

const FORBIDDEN_WORDS = ['admin', '관리자', '운영자', '오재미', 'ojemi', '스탭', '매니저', '마스터', '시스템'];

function isForbidden(text: string) {
  const lowerText = text.toLowerCase().replace(/\s/g, ''); 
  return FORBIDDEN_WORDS.some(word => lowerText.includes(word));
}

// 💡 [수술 1] 이메일(email) 타입도 검사할 수 있도록 파라미터 추가!
export async function checkDuplicate(type: 'id' | 'nickname' | 'email', value: string) {
  if (!value) return 'empty';
  
  // 이메일은 금칙어 검사를 하지 않습니다.
  if (type !== 'email' && isForbidden(value)) return 'forbidden';
  
  if (type === 'id') {
    const { rows } = await sql`SELECT user_id FROM users WHERE user_id = ${value}`;
    if (rows.length > 0) return 'duplicate';
  }
  
  if (type === 'nickname') {
    const { rows } = await sql`SELECT nickname FROM users WHERE nickname = ${value}`;
    if (rows.length > 0) return 'duplicate';
  }

  // 💡 [수술 2] 이메일 중복 스캔 로직 추가!
  if (type === 'email') {
    const { rows } = await sql`SELECT email FROM users WHERE email = ${value}`;
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

  // 💡 [수술 3] DB에 꽂아 넣기 직전, 이메일이 이미 존재하는지 최종 확인!
  const emailStatus = await checkDuplicate('email', email);
  if (emailStatus !== 'ok') return { error: 'email_exists' };

  try {
    // 🛡️ [핵심 수술] 유저의 비밀번호를 도저히 풀 수 없는 강력한 해시 기호로 갈아버립니다!
    const hashedPassword = await bcrypt.hash(password, 10);

    await sql`
      INSERT INTO users (user_id, password, nickname, email)
      VALUES (${userId}, ${hashedPassword}, ${nickname}, ${email})
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
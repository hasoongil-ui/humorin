'use server';

import { sql } from '@vercel/postgres';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';

const FORBIDDEN_WORDS = ['admin', '관리자', '운영자', '유머인', 'humorin', '스탭', '매니저', '마스터', '시스템'];

function isForbidden(text: string) {
  const lowerText = text.toLowerCase().replace(/\s/g, ''); 
  return FORBIDDEN_WORDS.some(word => lowerText.includes(word));
}

export async function checkDuplicate(type: 'id' | 'nickname' | 'email', value: string) {
  if (!value) return 'empty';
  if (type !== 'email' && isForbidden(value)) return 'forbidden';
  
  if (type === 'id') {
    const { rows } = await sql`SELECT user_id FROM users WHERE user_id = ${value}`;
    if (rows.length > 0) return 'duplicate';
  }
  if (type === 'nickname') {
    const { rows } = await sql`SELECT nickname FROM users WHERE nickname = ${value}`;
    if (rows.length > 0) return 'duplicate';
  }
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

  if (password !== confirmPassword) return { error: 'mismatch' };

  const idStatus = await checkDuplicate('id', userId);
  if (idStatus !== 'ok') return { error: idStatus === 'forbidden' ? 'id_forbidden' : 'id_exists' };

  const nickStatus = await checkDuplicate('nickname', nickname);
  if (nickStatus !== 'ok') return { error: nickStatus === 'forbidden' ? 'nick_forbidden' : 'nick_exists' };

  const emailStatus = await checkDuplicate('email', email);
  if (emailStatus !== 'ok') return { error: 'email_exists' };

  try {
    // 💡 [수술 1] 아까 만든 문지기(proxy)가 달아준 '진짜 IP' 명찰을 여기서 읽어옵니다!
    const headersList = await headers();
    const userIp = headersList.get('x-user-ip') || '알수없음';

    // 🛡️ [수술 2] 관리자가 차단한 IP(블랙리스트)인지 가입 전에 미리 검사합니다!
    const { rows: settings } = await sql`SELECT value FROM site_settings WHERE key = 'banned_ips'`;
    if (settings.length > 0 && settings[0].value) {
      const bannedIps = settings[0].value.split(',');
      if (bannedIps.includes(userIp)) {
        console.error(`🚨 [차단된 IP 가입 시도 감지] IP: ${userIp}`);
        return { error: 'db_error' }; // 해커에게는 가짜로 DB 에러라고 뻥칩니다.
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 💡 [수술 3] DB에 유저 정보 넣을 때 추출한 IP(userIp)도 함께 밀어 넣습니다!
    await sql`
      INSERT INTO users (user_id, password, nickname, email, ip)
      VALUES (${userId}, ${hashedPassword}, ${nickname}, ${email}, ${userIp})
    `;
    
    const cookieStore = await cookies();
    cookieStore.set({ name: 'humorin_user', value: nickname, httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 });
    cookieStore.set({ name: 'humorin_userid', value: userId, httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 });
    
  } catch (error) {
    console.error("DB 에러:", error);
    return { error: 'db_error' };
  }
  
  redirect('/board');
}
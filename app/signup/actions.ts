'use server';

import { sql } from '@vercel/postgres';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SECRET_KEY = process.env.AUTH_SECRET || 'humorin-super-secret-key-2026-very-safe';

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
    const headersList = await headers();
    const userIp = headersList.get('x-user-ip') || '알수없음';

    // 🛡️ [기존 수술] 관리자가 수동으로 차단한 블랙리스트 IP 검사 (이건 필수 보안이므로 유지)
    const { rows: settings } = await sql`SELECT value FROM site_settings WHERE key = 'banned_ips'`;
    if (settings.length > 0 && settings[0].value) {
      const bannedIps = settings[0].value.split(',');
      if (bannedIps.includes(userIp)) {
        console.error(`🚨 [차단된 IP 가입 시도 감지] IP: ${userIp}`);
        return { error: 'db_error' };
      }
    }

    // 💣 [삭제 완료]: 선량한 유저를 튕겨내던 '24시간 내 동일 IP 3회 차단' 폭탄 로직을 완전히 삭제했습니다!

    const hashedPassword = await bcrypt.hash(password, 10);

    // 유저 정보 저장 (IP 포함)
    await sql`
      INSERT INTO users (user_id, password, nickname, email, ip)
      VALUES (${userId}, ${hashedPassword}, ${nickname}, ${email}, ${userIp})
    `;
    
    const cookieStore = await cookies();
    cookieStore.set({ name: 'humorin_user', value: nickname, httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 });
    cookieStore.set({ name: 'humorin_userid', value: userId, httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 });
    
    // 🛡️ [수정] 회원가입 즉시 글쓰기가 가능하도록 Hmac 서명 쿠키 발급
    const signature = crypto.createHmac('sha256', SECRET_KEY).update(userId).digest('hex');
    cookieStore.set({ name: 'humorin_signature', value: signature, httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 7 });
    
  } catch (error) {
    console.error("DB 에러:", error);
    return { error: 'db_error' };
  }
  
  redirect('/board');
}
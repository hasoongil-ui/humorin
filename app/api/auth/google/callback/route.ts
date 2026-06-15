// 파일 위치: app/api/auth/google/callback/route.ts
// 🚀 [수술 1] Vercel Edge 네트워크 적용 (서울 한국 부팅)
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { cookies, headers } from 'next/headers';

const SECRET_KEY = process.env.AUTH_SECRET || 'humorin-super-secret-key-2026-very-safe';

// 🚀 [수술 2] Web Crypto API (Edge 호환)
async function generateSignature(userId: string, secret: string) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(userId);
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const origin = new URL(request.url).origin;

  if (!code) return NextResponse.redirect(new URL('/login?error=google_failed', request.url));

  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = `${origin}/api/auth/google/callback`;

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) throw new Error('구글 토큰 발급 실패');

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
    const userData = await userResponse.json();
    
    const email = userData.email;
    if (!email) return NextResponse.redirect(new URL('/login?error=no_email', request.url));

    const expectedUserId = `g_${String(userData.id).substring(0, 15)}`;
    let nickname = userData.name || '구글유저';
    let finalNickname = nickname;

    const { rows: idCheck } = await sql`SELECT * FROM users WHERE user_id = ${expectedUserId}`;

    if (idCheck.length > 0) {
      const user = idCheck[0];
      if (user.status === 'withdrawn') {
        const withdrawDate = new Date(user.last_login || Date.now()).getTime();
        const daysPassed = (Date.now() - withdrawDate) / (1000 * 60 * 60 * 24);
        
        if (daysPassed < 7) {
          // 🚨 7일 쿨타임 철벽
          return NextResponse.redirect(new URL('/login?error=cooldown', request.url));
        } else {
          // 🚀 [리셋 수술 완료] 7일 경과 시 과거 정보 싹 밀어버리고 신규 가입 세팅!
          let isNickUnique = false;
          let attempt = 0;
          while (!isNickUnique && attempt < 5) {
            const { rows: nickCheck } = await sql`SELECT user_id FROM users WHERE nickname = ${finalNickname}`;
            if (nickCheck.length > 0) {
              finalNickname = `${nickname}_${Math.floor(Math.random() * 10000)}`;
              attempt++;
            } else {
              isNickUnique = true;
            }
          }
          await sql`
            UPDATE users 
            SET 
              status = 'active', 
              nickname = ${finalNickname}, 
              email = ${email}, 
              points = 0, 
              is_admin = false, 
              last_login = NOW() 
            WHERE user_id = ${expectedUserId}
          `;
        }
      } else if (user.status === 'banned') {
        return NextResponse.redirect(new URL('/login?error=banned', request.url));
      } else {
        finalNickname = user.nickname;
      }
    } else {
      const randomBytes = new Uint8Array(20);
      crypto.getRandomValues(randomBytes);
      const defaultPassword = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      
      let isNickUnique = false;
      let attempt = 0;
      while (!isNickUnique && attempt < 5) {
        const { rows: nickCheck } = await sql`SELECT user_id FROM users WHERE nickname = ${finalNickname}`;
        if (nickCheck.length > 0) {
          finalNickname = `${nickname}_${Math.floor(Math.random() * 10000)}`;
          attempt++;
        } else {
          isNickUnique = true;
        }
      }
      await sql`
        INSERT INTO users (user_id, password, nickname, email, status, points, is_admin)
        VALUES (${expectedUserId}, ${defaultPassword}, ${finalNickname}, ${email}, 'active', 0, false)
      `;
    }

    try {
      const headersList = await headers();
      const currentIp = headersList.get('x-user-ip') || '알수없음';
      
      // 🚀 [수술 3] 병렬 동시 쿼리로 통신 대기시간 반갈죽!
      await Promise.all([
        sql`INSERT INTO access_logs (user_id, action_type, ip_address) VALUES (${expectedUserId}, 'LOGIN_GOOGLE', ${currentIp})`,
        sql`UPDATE users SET ip = ${currentIp}, last_login = NOW() WHERE user_id = ${expectedUserId}`
      ]);
    } catch (e) { }

    const signature = await generateSignature(expectedUserId, SECRET_KEY);
    const cookieStore = await cookies();
    cookieStore.set('humorin_user', finalNickname, { path: '/', maxAge: 60 * 60 * 24 * 7 });
    cookieStore.set('humorin_userid', expectedUserId, { path: '/', maxAge: 60 * 60 * 24 * 7 });
    cookieStore.set('humorin_signature', signature, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7 });

    return NextResponse.redirect(new URL('/', request.url));
  } catch (err) {
    return NextResponse.redirect(new URL('/login?error=google_error', request.url));
  }
}
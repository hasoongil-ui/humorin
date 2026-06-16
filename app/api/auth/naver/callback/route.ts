// 파일 위치: app/api/auth/naver/callback/route.ts
// 🚀 [수술 1] Vercel Edge 네트워크 적용 (서울 한국 부팅)
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { cookies, headers } from 'next/headers';
import { waitUntil } from '@vercel/functions'; // 🚀 [추가] 백그라운드 처리용 함수

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
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error || !code) return NextResponse.redirect(new URL('/login?error=naver_failed', request.url));

  const cookieStore = await cookies();
  const savedState = cookieStore.get('naver_state')?.value;
  if (!savedState || savedState !== state) return NextResponse.redirect(new URL('/login?error=invalid_state', request.url));

  const clientId = process.env.NAVER_CLIENT_ID || '';
  const clientSecret = process.env.NAVER_CLIENT_SECRET || '';

  try {
    const tokenResponse = await fetch(`https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&code=${code}&state=${state}`, { method: 'GET' });
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) throw new Error('네이버 토큰 발급 실패');

    const userResponse = await fetch('https://openapi.naver.com/v1/nid/me', { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
    const userData = await userResponse.json();
    if (userData.resultcode !== '00') throw new Error('유저 정보 조회 실패');

    const profile = userData.response;
    const email = profile.email;
    const naverId = profile.id;
    if (!email) return NextResponse.redirect(new URL('/login?error=no_email', request.url));

    const expectedUserId = `n_${naverId.substring(0, 15)}`;
    let finalNickname = profile.nickname || '네이버유저';

    const { rows: idCheck } = await sql`SELECT * FROM users WHERE user_id = ${expectedUserId}`;

    if (idCheck.length > 0) {
      const user = idCheck[0];
      if (user.status === 'withdrawn') {
        const withdrawDate = new Date(user.last_login || Date.now()).getTime();
        const daysPassed = (Date.now() - withdrawDate) / (1000 * 60 * 60 * 24);
        
        if (daysPassed < 7) {
          // 🚨 7일 미만: 가차 없이 쫓아냄
          return NextResponse.redirect(new URL('/login?error=cooldown', request.url));
        } else {
          // 🚀 [리셋 수술 완료] 7일 경과 후: 포인트와 정보를 싹 초기화하여 신규 가입으로 처리!
          let isNickUnique = false;
          let attempt = 0;
          while (!isNickUnique && attempt < 5) {
            const { rows: nickCheck } = await sql`SELECT user_id FROM users WHERE nickname = ${finalNickname}`;
            if (nickCheck.length > 0) {
              finalNickname = `${profile.nickname || '네이버유저'}_${Math.floor(Math.random() * 10000)}`;
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
          finalNickname = `${profile.nickname || '네이버유저'}_${Math.floor(Math.random() * 10000)}`;
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
      
      // 🚀 [수술 3] waitUntil을 활용한 백그라운드 처리! (유저 통신 대기시간 0초로 단축)
      waitUntil(
        Promise.all([
          sql`INSERT INTO access_logs (user_id, action_type, ip_address) VALUES (${expectedUserId}, 'LOGIN_NAVER', ${currentIp})`,
          sql`UPDATE users SET ip = ${currentIp}, last_login = NOW() WHERE user_id = ${expectedUserId}`
        ]).catch(e => console.error("Naver DB Background Logging Error:", e))
      );
    } catch (e) { }

    const signature = await generateSignature(expectedUserId, SECRET_KEY);
    cookieStore.set('humorin_user', finalNickname, { path: '/', maxAge: 60 * 60 * 24 * 7 });
    cookieStore.set('humorin_userid', expectedUserId, { path: '/', maxAge: 60 * 60 * 24 * 7 });
    cookieStore.set('humorin_signature', signature, { path: '/', httpOnly: true, maxAge: 60 * 60 * 24 * 7 });
    cookieStore.delete('naver_state');

    return NextResponse.redirect(new URL('/', request.url));
  } catch (err) {
    return NextResponse.redirect(new URL('/login?error=naver_error', request.url));
  }
}
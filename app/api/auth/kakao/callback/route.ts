// 파일 위치: app/api/auth/kakao/callback/route.ts
// 🚀 [수술 1] Vercel Edge 네트워크 적용: 이제 로그인 함수가 미국이 아닌 '서울(한국)'에서 즉시 부팅됩니다!
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { cookies, headers } from 'next/headers';
import { waitUntil } from '@vercel/functions'; // 🚀 [추가] 백그라운드 처리용 함수

const SECRET_KEY = process.env.AUTH_SECRET || 'humorin-super-secret-key-2026-very-safe';

// 🚀 [수술 2] Edge 환경 호환을 위해 Node.js 구형 crypto 대신 Web Crypto API로 교체
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

  if (!code) return NextResponse.redirect(new URL('/login?error=kakao_failed', request.url));

  const clientId = process.env.KAKAO_CLIENT_ID || '';
  const clientSecret = process.env.KAKAO_CLIENT_SECRET || '';
  const redirectUri = `${origin}/api/auth/kakao/callback`;

  try {
    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code }),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) throw new Error('카카오 토큰 발급 실패');

    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
    const userData = await userResponse.json();
    if (!userData || !userData.id) throw new Error('카카오 유저 정보 조회 실패');

    const kakaoId = String(userData.id);
    const email = userData.kakao_account?.email || `k_${kakaoId}@kakao.dummy.com`;
    let nickname = userData.kakao_account?.profile?.nickname || `카카오유저_${kakaoId.substring(0, 4)}`;
    const expectedUserId = `k_${kakaoId.substring(0, 15)}`;
    let finalNickname = nickname;

    const { rows: idCheck } = await sql`SELECT * FROM users WHERE user_id = ${expectedUserId}`;

    if (idCheck.length > 0) {
      const user = idCheck[0];
      if (user.status === 'withdrawn') {
        const withdrawDate = new Date(user.last_login || Date.now()).getTime();
        const daysPassed = (Date.now() - withdrawDate) / (1000 * 60 * 60 * 24);
        
        if (daysPassed < 7) {
          // 🚨 7일 쿨타임 발동
          return NextResponse.redirect(new URL('/login?error=cooldown', request.url));
        } else {
          // 🚀 [리셋 수술 완료] 7일 경과 시 완벽한 신규 회원(포인트 0점)으로 포맷!
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
      // Web Crypto API를 사용한 패스워드 생성 (Edge 호환)
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
      
      // 🚀 [수술 3] waitUntil을 활용한 백그라운드 처리! (유저 통신 대기시간 0초로 단축)
      waitUntil(
        Promise.all([
          sql`INSERT INTO access_logs (user_id, action_type, ip_address) VALUES (${expectedUserId}, 'LOGIN_KAKAO', ${currentIp})`,
          sql`UPDATE users SET ip = ${currentIp}, last_login = NOW() WHERE user_id = ${expectedUserId}`
        ]).catch(e => console.error("Kakao DB Background Logging Error:", e))
      );
    } catch (e) { }

    const signature = await generateSignature(expectedUserId, SECRET_KEY);
    const cookieStore = await cookies();
    cookieStore.set('humorin_user', finalNickname, { path: '/', maxAge: 60 * 60 * 24 * 7 });
    cookieStore.set('humorin_userid', expectedUserId, { path: '/', maxAge: 60 * 60 * 24 * 7 });
    cookieStore.set('humorin_signature', signature, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7 });

    return NextResponse.redirect(new URL('/', request.url));
  } catch (err) {
    return NextResponse.redirect(new URL('/login?error=kakao_error', request.url));
  }
}
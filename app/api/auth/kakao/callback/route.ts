import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const SECRET_KEY = process.env.AUTH_SECRET || 'humorin-super-secret-key-2026-very-safe';

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
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) throw new Error('카카오 토큰 발급 실패');

    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userResponse.json();
    
    if (!userData || !userData.id) throw new Error('카카오 유저 정보 조회 실패');

    const kakaoId = String(userData.id);
    const email = userData.kakao_account?.email || `k_${kakaoId}@kakao.dummy.com`;
    let nickname = userData.kakao_account?.profile?.nickname || `카카오유저_${kakaoId.substring(0, 4)}`;

    const expectedUserId = `k_${kakaoId.substring(0, 15)}`;
    
    const { rows } = await sql`SELECT * FROM users WHERE email = ${email} ORDER BY id ASC LIMIT 1`;
    
    let finalUserId = '';
    let finalNickname = '';

    if (rows.length > 0) {
      finalUserId = rows[0].user_id;
      finalNickname = rows[0].nickname;
    } else {
      finalUserId = expectedUserId;
      finalNickname = nickname;
      const defaultPassword = crypto.randomBytes(20).toString('hex');

      let isNickUnique = false;
      let attempt = 0;
      while (!isNickUnique && attempt < 5) {
        const { rows: nickCheck } = await sql`SELECT id FROM users WHERE nickname = ${finalNickname}`;
        if (nickCheck.length > 0) {
          finalNickname = `${nickname}_${Math.floor(Math.random() * 10000)}`;
          attempt++;
        } else {
          isNickUnique = true;
        }
      }

      await sql`
        INSERT INTO users (user_id, password, nickname, email, status, points, is_admin)
        VALUES (${finalUserId}, ${defaultPassword}, ${finalNickname}, ${email}, 'active', 0, false)
      `;
    }

    const signature = crypto.createHmac('sha256', SECRET_KEY).update(finalUserId).digest('hex');
    const cookieStore = await cookies();
    
    cookieStore.set('humorin_user', finalNickname, { path: '/', maxAge: 60 * 60 * 24 * 7 });
    cookieStore.set('humorin_userid', finalUserId, { path: '/', maxAge: 60 * 60 * 24 * 7 });
    cookieStore.set('humorin_signature', signature, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7 });

    return NextResponse.redirect(new URL('/', request.url));
  } catch (err) {
    console.error('Kakao Login Error:', err);
    return NextResponse.redirect(new URL('/login?error=kakao_error', request.url));
  }
}
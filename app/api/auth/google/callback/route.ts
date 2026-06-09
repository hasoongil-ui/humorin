import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const SECRET_KEY = process.env.AUTH_SECRET || 'humorin-super-secret-key-2026-very-safe';

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
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) throw new Error('구글 토큰 발급 실패');

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userResponse.json();
    
    const email = userData.email;
    if (!email) return NextResponse.redirect(new URL('/login?error=no_email', request.url));

    // 🛡️ 구글 고유 아이디 생성
    const expectedUserId = `g_${String(userData.id).substring(0, 15)}`;
    let nickname = userData.name || '구글유저';
    
    // 🛡️ 기존 회원(이메일 기준) 서치
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

      // 🛡️ 닉네임 중복 완벽 방어
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

    // 🛡️ 3중 보안 서명 쿠키 발급
    const signature = crypto.createHmac('sha256', SECRET_KEY).update(finalUserId).digest('hex');
    const cookieStore = await cookies();
    
    cookieStore.set('humorin_user', finalNickname, { path: '/', maxAge: 60 * 60 * 24 * 7 });
    cookieStore.set('humorin_userid', finalUserId, { path: '/', maxAge: 60 * 60 * 24 * 7 });
    cookieStore.set('humorin_signature', signature, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7 });

    return NextResponse.redirect(new URL('/', request.url));
  } catch (err) {
    console.error('Google Login Error:', err);
    return NextResponse.redirect(new URL('/login?error=google_error', request.url));
  }
}
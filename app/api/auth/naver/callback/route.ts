import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { cookies, headers } from 'next/headers';
import crypto from 'crypto';

const SECRET_KEY = process.env.AUTH_SECRET || 'humorin-super-secret-key-2026-very-safe';

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

    // 🛡️ [수술 1] 에러 방지용: 고유 아이디로 절대 검사!
    const { rows: idCheck } = await sql`SELECT * FROM users WHERE user_id = ${expectedUserId}`;

    if (idCheck.length > 0) {
      const user = idCheck[0];
      // 🚨 [수술 2] 7일 쿨타임 철벽 방어막
      if (user.status === 'withdrawn') {
        const withdrawDate = new Date(user.updated_at || Date.now()).getTime();
        const daysPassed = (Date.now() - withdrawDate) / (1000 * 60 * 60 * 24);
        if (daysPassed < 7) {
          return NextResponse.redirect(new URL('/login?error=cooldown', request.url));
        } else {
          // 7일 경과 시 계정 부활
          await sql`UPDATE users SET status = 'active', email = ${email}, updated_at = NOW() WHERE user_id = ${expectedUserId}`;
          finalNickname = user.nickname;
        }
      } else if (user.status === 'banned') {
        return NextResponse.redirect(new URL('/login?error=banned', request.url));
      } else {
        finalNickname = user.nickname;
      }
    } else {
      const defaultPassword = crypto.randomBytes(20).toString('hex');
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

    // 📡 [수술 3] 잃어버린 IP 추적기 작동!
    try {
      const headersList = await headers();
      const currentIp = headersList.get('x-user-ip') || '알수없음';
      await sql`INSERT INTO access_logs (user_id, action_type, ip_address) VALUES (${expectedUserId}, 'LOGIN_NAVER', ${currentIp})`;
      await sql`UPDATE users SET ip = ${currentIp}, last_login = NOW() WHERE user_id = ${expectedUserId}`;
    } catch (e) { }

    const signature = crypto.createHmac('sha256', SECRET_KEY).update(expectedUserId).digest('hex');
    cookieStore.set('humorin_user', finalNickname, { path: '/', maxAge: 60 * 60 * 24 * 7 });
    cookieStore.set('humorin_userid', expectedUserId, { path: '/', maxAge: 60 * 60 * 24 * 7 });
    cookieStore.set('humorin_signature', signature, { path: '/', httpOnly: true, maxAge: 60 * 60 * 24 * 7 });
    cookieStore.delete('naver_state');

    return NextResponse.redirect(new URL('/', request.url));
  } catch (err) {
    return NextResponse.redirect(new URL('/login?error=naver_error', request.url));
  }
}
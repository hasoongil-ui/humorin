// app/api/auth/naver/callback/route.ts
import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const SECRET_KEY = process.env.AUTH_SECRET || 'humorin-super-secret-key-2026-very-safe';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // 네이버 로그인 취소하거나 에러 났을 때
  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=naver_failed', request.url));
  }

  const clientId = process.env.NAVER_CLIENT_ID || '';
  const clientSecret = process.env.NAVER_CLIENT_SECRET || '';

  try {
    // 1. 네이버에게 '접근 토큰' 발급받기
    const tokenResponse = await fetch(`https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&code=${code}&state=${state}`, {
      method: 'GET',
    });
    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error('네이버 토큰 발급 실패');
    }

    // 2. 발급받은 토큰으로 유저 프로필(이메일, 닉네임) 가져오기
    const userResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });
    const userData = await userResponse.json();

    if (userData.resultcode !== '00') {
      throw new Error('유저 정보 조회 실패');
    }

    const profile = userData.response;
    const email = profile.email;
    const naverId = profile.id; // 네이버 고유 일련번호
    let nickname = profile.nickname || '네이버유저';

    if (!email) {
      return NextResponse.redirect(new URL('/login?error=no_email', request.url));
    }

    // 3. DB에서 이메일로 기존 회원인지 수색!
    const { rows } = await sql`SELECT * FROM users WHERE email = ${email}`;
    let finalUserId = '';
    let finalNickname = '';

    if (rows.length > 0) {
      // 🟢 이미 가입된 회원 -> 바로 로그인 통과!
      finalUserId = rows[0].user_id;
      finalNickname = rows[0].nickname;
    } else {
      // 🟢 신규 회원 -> 1초 만에 초고속 자동 가입 처리!
      // 아이디는 영문/숫자 규칙에 맞게 n_ + 네이버ID 8자리로 예쁘게 잘라서 만듭니다.
      finalUserId = `n_${naverId.substring(0, 8)}`;
      finalNickname = nickname;
      const defaultPassword = 'naver_sso_password_123!';

      // 혹시 네이버 닉네임이 유머인에 이미 있으면 뒤에 랜덤 숫자를 붙여줍니다.
      const { rows: nickCheck } = await sql`SELECT * FROM users WHERE nickname = ${finalNickname}`;
      if (nickCheck.length > 0) {
        finalNickname = `${finalNickname}_${Math.floor(Math.random() * 1000)}`;
      }

      // DB에 회원 정보 강제 쑤셔 넣기!
      await sql`
        INSERT INTO users (user_id, password, nickname, email, status, points, is_admin)
        VALUES (${finalUserId}, ${defaultPassword}, ${finalNickname}, ${email}, 'active', 0, false)
      `;
    }

    // 4. 로그인 도장(쿠키) 찍기 (가장 완벽한 보안 서명 장착)
    const signature = crypto.createHmac('sha256', SECRET_KEY).update(finalUserId).digest('hex');
    
    const cookieStore = await cookies();
    cookieStore.set('humorin_user', finalNickname, { path: '/', maxAge: 60 * 60 * 24 * 7 });
    cookieStore.set('humorin_userid', finalUserId, { path: '/', maxAge: 60 * 60 * 24 * 7 });
    cookieStore.set('humorin_signature', signature, { path: '/', httpOnly: true, maxAge: 60 * 60 * 24 * 7 });

    // 5. 유머인 메인 화면으로 멋지게 복귀!
    return NextResponse.redirect(new URL('/', request.url));

  } catch (err) {
    console.error('Naver Login Error:', err);
    return NextResponse.redirect(new URL('/login?error=naver_error', request.url));
  }
}
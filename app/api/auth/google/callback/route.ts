import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { sql } from '@vercel/postgres'; // 🚀 대장님의 진짜 마스터키!

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const origin = req.nextUrl.origin;

    // 1. 구글이 보낸 인증 코드가 있는지 확인
    if (!code) {
      return NextResponse.json({ error: '인증 코드가 없습니다.' }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${origin}/api/auth/google/callback`; // 약속 장소(리디렉션 URI)

    // 2. 구글 서버에 Access Token 요청
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('구글 토큰 에러:', tokenData);
      return NextResponse.redirect(`${origin}/login?error=GoogleTokenError`);
    }

    // 3. 발급받은 토큰으로 구글 유저 정보(이름, 이메일 등) 가져오기
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    if (userData.error) {
      console.error('구글 유저 정보 에러:', userData);
      return NextResponse.redirect(`${origin}/login?error=GoogleUserError`);
    }

    const googleId = userData.id;
    const email = userData.email;
    const name = userData.name;
    const provider = 'google';

    // 4. DB 확인 및 자동 회원가입 처리
    let userResult = await sql`
      SELECT * FROM users WHERE email = ${email} AND provider = ${provider}
    `;
    
    let user = userResult.rows[0];

    // DB에 없는 유저라면 새로 가입(INSERT) 시킴
    if (!user) {
      userResult = await sql`
        INSERT INTO users (email, name, provider, provider_id)
        VALUES (${email}, ${name}, ${provider}, ${googleId})
        RETURNING *
      `;
      user = userResult.rows[0];
    }

    // 5. JWT(입장권) 생성
    const secretKey = process.env.AUTH_SECRET || 'humorin-super-secret-key-2026';
    const secret = new TextEncoder().encode(secretKey);
    const jwt = await new SignJWT({
      id: user.user_id,
      email: user.email,
      name: user.name,
      provider: user.provider
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    // 6. 쿠키 세팅 (대장님이 잡아내신 최신 문법 await 적용 완료!)
    const cookieStore = await cookies();
    cookieStore.set('session', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    // 7. 로그인 성공 후 메인 페이지로 이동!
    return NextResponse.redirect(origin);

  } catch (error) {
    console.error('구글 로그인 전체 에러:', error);
    return NextResponse.redirect(`${req.nextUrl.origin}/login?error=GoogleLoginError`);
  }
}
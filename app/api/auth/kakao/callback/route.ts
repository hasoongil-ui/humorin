import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { sql } from '@vercel/postgres'; // 🚀 대장님의 진짜 마스터키!

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const code = searchParams.get('code');
        const origin = req.nextUrl.origin;

        if (!code) {
            return NextResponse.json({ error: '인증 코드가 없습니다.' }, { status: 400 });
        }

        const clientId = process.env.KAKAO_CLIENT_ID;
        const clientSecret = process.env.KAKAO_CLIENT_SECRET;
        const redirectUri = `${origin}/api/auth/kakao/callback`;

        // 1. 카카오 서버에 Access Token 요청
        const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: clientId!,
                client_secret: clientSecret!,
                redirect_uri: redirectUri,
                code,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            return NextResponse.redirect(`${origin}/login?error=KakaoTokenError`);
        }

        // 2. 카카오 유저 정보 가져오기
        const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
            },
        });

        const userData = await userResponse.json();

        if (!userData || !userData.id) {
            return NextResponse.redirect(`${origin}/login?error=KakaoUserInfoError`);
        }

        const kakaoId = userData.id.toString();
        const kakaoEmail = userData.kakao_account?.email || `k_${kakaoId}@kakao.dummy.com`;
        const kakaoNickname = userData.kakao_account?.profile?.nickname || `카카오유저_${kakaoId.substring(0, 4)}`;
        const newUserId = `kakao_${kakaoId}`; // 유머인 전용 SNS 아이디 생성

        // 3. DB 유저 확인 및 처리 (Vercel Postgres SQL 방식)
        const { rows } = await sql`
      SELECT * FROM users 
      WHERE provider_id = ${kakaoId} OR email = ${kakaoEmail}
      LIMIT 1
    `;

        let user = rows[0];

        if (!user) {
            // 신규 가입
            await sql`
        INSERT INTO users (user_id, email, name, password, provider, provider_id)
        VALUES (${newUserId}, ${kakaoEmail}, ${kakaoNickname}, '', 'kakao', ${kakaoId})
      `;
            user = { user_id: newUserId, email: kakaoEmail, name: kakaoNickname, provider: 'kakao' };
        } else if (!user.provider) {
            // 기존 이메일 유저와 연동
            await sql`
        UPDATE users 
        SET provider = 'kakao', provider_id = ${kakaoId} 
        WHERE user_id = ${user.user_id}
      `;
            user.provider = 'kakao';
        }

        // 4. 보안 JWT 세션 생성
        const secretKey = process.env.AUTH_SECRET || 'humorin-super-secret-key-2026-very-safe';
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

        // 5. 쿠키 세팅 (await 추가 완료)
        const cookieStore = await cookies();
        cookieStore.set('session', jwt, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7,
        });

        return NextResponse.redirect(origin);

    } catch (error) {
        console.error('카카오 로그인 에러:', error);
        return NextResponse.redirect(`${req.nextUrl.origin}/login?error=KakaoServerError`);
    }
}
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const clientId = process.env.KAKAO_CLIENT_ID;
  
  if (!clientId) {
    return NextResponse.json({ error: '카카오 클라이언트 ID가 설정되지 않았습니다.' }, { status: 500 });
  }

  // 로컬(localhost)과 배포(Vercel) 환경의 URL을 자동으로 인식합니다.
  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/kakao/callback`;

  // 카카오 인증 URL 생성
  const kakaoAuthUrl = new URL('https://kauth.kakao.com/oauth/authorize');
  kakaoAuthUrl.searchParams.append('client_id', clientId);
  kakaoAuthUrl.searchParams.append('redirect_uri', redirectUri);
  kakaoAuthUrl.searchParams.append('response_type', 'code');

  // 카카오 로그인 화면으로 유저를 이동시킵니다.
  return NextResponse.redirect(kakaoAuthUrl.toString());
}
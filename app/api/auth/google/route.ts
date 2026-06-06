import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // 현재 접속 중인 도메인(localhost 또는 vercel 도메인)을 자동으로 파악
  const origin = req.nextUrl.origin;
  
  // env.local에 등록해둔 구글 열쇠(Client ID) 꺼내기
  const clientId = process.env.GOOGLE_CLIENT_ID;
  
  // 구글에서 인증을 마치고 돌아올 약속 장소
  const redirectUri = `${origin}/api/auth/google/callback`;

  // 혹시라도 열쇠 세팅이 누락되었을 경우를 대비한 방어막
  if (!clientId) {
    console.error('구글 클라이언트 ID가 환경변수에 없습니다!');
    return NextResponse.redirect(`${origin}/login?error=GoogleConfigError`);
  }

  // 구글 로그인 창으로 보내기 위한 특별한 URL 주소 조립
  // (이메일, 프로필 정보를 달라고 요청하는 scope 포함)
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid email profile&access_type=offline&prompt=consent`;

  // 유저를 조립된 구글 로그인 창으로 강제 이동(리디렉션) 시킴!
  return NextResponse.redirect(googleAuthUrl);
}
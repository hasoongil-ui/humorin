// app/api/auth/naver/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function GET(request: Request) {
  // 💡 환경변수(.env.local)에 저장된 대장님의 네이버 클라이언트 ID를 가져옵니다.
  const clientId = process.env.NAVER_CLIENT_ID || process.env.NEXT_PUBLIC_NAVER_CLIENT_ID || '';
  
  // 💡 현재 접속한 사이트 주소(localhost:3000 등)를 자동 감지해서 돌아올 주소를 만듭니다.
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/auth/naver/callback`;
  
  // 🛡️ 해킹(CSRF) 방지를 위해 매번 랜덤한 State 암호를 생성하고 쿠키에 굽습니다.
  const state = crypto.randomBytes(16).toString('hex');
  const cookieStore = await cookies();
  cookieStore.set('naver_state', state, { path: '/', httpOnly: true, maxAge: 60 * 5 }); // 5분 유효
  
  // 💡 네이버 공식 로그인 페이지로 1초 만에 강제 로켓 배송!
  const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  
  return NextResponse.redirect(naverAuthUrl);
}
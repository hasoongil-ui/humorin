import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // 1. Vercel/Cloudflare가 넘겨주는 '진짜 IP' 봉투를 먼저 확인합니다.
  const forwardedFor = request.headers.get('x-forwarded-for');
  let ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '';
  
  // 2. (Next.js 16 전용) request.ip가 삭제되었으므로, 다른 봉투(x-real-ip)를 뒤져서 기본 IP를 잡습니다.
  if (!ip) {
    ip = request.headers.get('x-real-ip') || '알수없음';
  }

  // 3. 확실한 문자열(String)로 만들어서 서버 전체에 통용될 명찰을 달아줍니다.
  const response = NextResponse.next();
  response.headers.set('x-user-ip', String(ip));
  
  return response;
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
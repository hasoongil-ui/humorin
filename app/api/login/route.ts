import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs'; 
import crypto from 'crypto'; // 🛡️ [추가] 서명 생성을 위한 내장 암호화 모듈

// 🛡️ [핵심] 오재미 서버만 아는 절대 비밀키 (환경변수가 없으면 임시 튼튼한 키 사용)
const SECRET_KEY = process.env.AUTH_SECRET || 'ojemi-super-secret-key-2026-very-safe';

export async function POST(request: Request) {
  try {
    const { id, password } = await request.json();

    const { rows } = await sql`
      SELECT * FROM users 
      WHERE user_id = ${id}
    `;

    if (rows.length > 0) {
      const user = rows[0];
      
      const isPasswordMatch = await bcrypt.compare(password, user.password);
      const isLegacyLogin = password === user.password;

      if (isPasswordMatch || isLegacyLogin) {
        
        await sql`
          UPDATE users 
          SET last_login = NOW() 
          WHERE user_id = ${id}
        `;

        const response = NextResponse.json(
          { success: true, message: '로그인 성공' }, 
          { status: 200 }
        );
        
        // 1. 기존 화면용 쿠키 (에디터/화면 깨짐 방지를 위해 그대로 유지)
        response.cookies.set({
          name: 'ojemi_user',
          value: user.nickname || user.user_id,
          httpOnly: true,
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        });

        response.cookies.set({
          name: 'ojemi_userid',
          value: user.user_id, 
          httpOnly: true,
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        });

        // 2. 🛡️ [수술 완료] 해커 위조 방지용 '비밀 암호 도장' 쿠키 추가 발급!
        // 서버만 아는 SECRET_KEY로 유저 아이디를 암호화해서 도장을 만듭니다.
        const signature = crypto.createHmac('sha256', SECRET_KEY).update(user.user_id).digest('hex');
        response.cookies.set({
          name: 'ojemi_signature',
          value: signature,
          httpOnly: true,
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        });

        return response;
      } else {
        return NextResponse.json(
          { success: false, message: '아이디 또는 비밀번호가 틀렸습니다.' }, 
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, message: '아이디 또는 비밀번호가 틀렸습니다.' }, 
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('로그인 API 처리 중 대형 에러:', error);
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' }, 
      { status: 500 }
    );
  }
}
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { id, password } = await request.json();

    const { rows } = await sql`
      SELECT * FROM users 
      WHERE user_id = ${id} AND password = ${password}
    `;

    if (rows.length > 0) {
      const user = rows[0];
      
      const response = NextResponse.json(
        { success: true, message: '로그인 성공' }, 
        { status: 200 }
      );
      
      // 1. 기존 쿠키 (화면 표시 및 게시글 작성용 '닉네임')
      response.cookies.set({
        name: 'ojemi_user',
        value: user.nickname || user.user_id,
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });

      // 2. 🚨 미나의 근본 수술: 절대 변하지 않는 '진짜 아이디(user_id)' 쿠키 추가 발급!
      // (이 쿠키가 바로 관리자 'admin'을 증명하는 강력한 절대 신분증이 됩니다)
      response.cookies.set({
        name: 'ojemi_userid',
        value: user.user_id, // 닉네임이 아닌 로그인할 때 친 진짜 영어 아이디!
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
  } catch (error) {
    console.error('로그인 API 처리 중 대형 에러:', error);
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' }, 
      { status: 500 }
    );
  }
}
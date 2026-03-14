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
      
      // 💡 IP 업데이트 기능은 빼고, 로그인 시간 갱신만 가볍게 남겨두었습니다!
      await sql`
        UPDATE users 
        SET last_login = NOW() 
        WHERE user_id = ${id}
      `;

      const response = NextResponse.json(
        { success: true, message: '로그인 성공' }, 
        { status: 200 }
      );
      
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
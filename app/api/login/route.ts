import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 1. 유저가 화면에서 보낸 아이디와 비밀번호 포장지를 뜯습니다.
    const { id, password } = await request.json();

    // 2. Vercel Postgres 창고(DB)에서 아이디와 비밀번호가 똑같이 일치하는 유저를 찾습니다.
    const { rows } = await sql`
      SELECT * FROM users 
      WHERE user_id = ${id} AND password = ${password}
    `;

    // 3. 일치하는 회원이 창고에 있다면? (로그인 성공!)
    if (rows.length > 0) {
      const user = rows[0];
      
      // 성공 신호를 준비합니다.
      const response = NextResponse.json(
        { success: true, message: '로그인 성공' }, 
        { status: 200 }
      );
      
      // 💡 미나의 핵심: 부동산 액자를 열어줄 'ojemi_user' 출입증(쿠키)을 발급합니다!
      // 닉네임이 있으면 닉네임을, 없으면 아이디를 쿠키에 담아 7일간 유지시킵니다.
      response.cookies.set({
        name: 'ojemi_user',
        value: user.nickname || user.user_id,
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7일(초 단위)
      });

      return response;
    } else {
      // 4. 아이디가 없거나 비밀번호가 틀리면 단호하게 쳐냅니다.
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
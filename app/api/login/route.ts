import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs'; // 🛡️ [추가] 최고 등급 암호화 라이브러리

export async function POST(request: Request) {
  try {
    const { id, password } = await request.json();

    // 🛡️ [수술 1] 이전처럼 비밀번호를 같이 묶어서 찾지 않고, 일단 '아이디'만으로 유저를 검색합니다.
    const { rows } = await sql`
      SELECT * FROM users 
      WHERE user_id = ${id}
    `;

    if (rows.length > 0) {
      const user = rows[0];
      
      // 🛡️ [수술 2] 유저가 입력한 비밀번호와 DB에 있는 '암호문'이 서로 일치하는지 안전하게 비교합니다!
      const isPasswordMatch = await bcrypt.compare(password, user.password);
      
      // 💡 [초강력 센스] 아직 암호화되지 않은 대표님의 옛날 테스트 계정(admin)들이 
      // 로그인이 막히는 것을 방지하기 위해, 예전 방식(평문)도 임시로 통과시켜주는 비상 통로입니다!
      const isLegacyLogin = password === user.password;

      // 둘 중 하나라도 맞으면 로그인 성공!
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
        // 비밀번호가 틀린 경우
        return NextResponse.json(
          { success: false, message: '아이디 또는 비밀번호가 틀렸습니다.' }, 
          { status: 401 }
        );
      }
    } else {
      // 아이디가 없는 경우
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
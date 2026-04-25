import { headers } from 'next/headers';
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs'; 
import crypto from 'crypto'; 

const SECRET_KEY = process.env.AUTH_SECRET || 'humorin-super-secret-key-2026-very-safe';

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
        
        // 1. 마지막 로그인 시간 업데이트
        await sql`
          UPDATE users 
          SET last_login = NOW() 
          WHERE user_id = ${id}
        `;

        // 🛡️ [추가] 90일 물레방아 IP 기록 시스템 작동!
        try {
          const headersList = await headers();
          // 문지기(middleware/proxy)가 넘겨준 진짜 IP를 가져옵니다.
          const currentIp = headersList.get('x-user-ip') || '알수없음';

          // 로그 기록장에 저장
          await sql`
            INSERT INTO access_logs (user_id, action_type, ip_address) 
            VALUES (${user.user_id}, 'LOGIN', ${currentIp})
          `;

          // ♻️ 90일 지난 낡은 데이터 자동 삭제 (서버 용량 방어)
          await sql`
            DELETE FROM access_logs WHERE created_at < NOW() - INTERVAL '90 days'
          `;
        } catch (logError) {
          console.error('로그 기록 중 오류 (무시하고 진행):', logError);
        }

        const response = NextResponse.json(
          { success: true, message: '로그인 성공' }, 
          { status: 200 }
        );
        
        // 쿠키 설정
        response.cookies.set({
          name: 'humorin_user',
          value: user.nickname || user.user_id,
          httpOnly: true,
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        });

        response.cookies.set({
          name: 'humorin_userid',
          value: user.user_id, 
          httpOnly: true,
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        });

        const signature = crypto.createHmac('sha256', SECRET_KEY).update(user.user_id).digest('hex');
        response.cookies.set({
          name: 'humorin_signature',
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
'use server';

import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

// 1. 아이디 찾기 엔진 (이메일로 아이디 찾기)
export async function findIdAction(email: string) {
  try {
    const res = await sql`SELECT user_id FROM users WHERE email = ${email}`;
    if (res.rowCount && res.rowCount > 0) {
      const userId = res.rows[0].user_id;
      
      // 보안을 위해 아이디의 일부를 별표(*)로 가려서 보여줍니다. (예: haso***)
      const maskedId = userId.length > 3
        ? userId.substring(0, 3) + '*'.repeat(userId.length - 3)
        : userId.substring(0, 1) + '*'.repeat(userId.length - 1);
        
      return { success: true, userId: maskedId };
    }
    return { success: false, message: '해당 이메일로 가입된 회원 정보가 없습니다.' };
  } catch (error) {
    console.error("아이디 찾기 에러:", error);
    return { success: false, message: '시스템 오류가 발생했습니다.' };
  }
}

// 2. 비밀번호 재설정 전 본인 확인 엔진
export async function verifyAccountAction(userId: string, email: string) {
  try {
    const res = await sql`SELECT user_id FROM users WHERE user_id = ${userId} AND email = ${email}`;
    if (res.rowCount && res.rowCount > 0) {
      return { success: true };
    }
    return { success: false, message: '입력하신 아이디와 이메일 정보가 일치하지 않습니다.' };
  } catch (error) {
    console.error("본인 확인 에러:", error);
    return { success: false, message: '시스템 오류가 발생했습니다.' };
  }
}

// 3. 새 비밀번호 강제 주입 엔진
export async function resetPasswordAction(userId: string, newPass: string) {
  if (!userId || !newPass || newPass.trim().length < 4) return { success: false, message: '유효하지 않은 요청입니다.' };
  if (userId.trim().toLowerCase() === 'admin') return { success: false, message: '최고 관리자 계정은 이 경로로 재설정할 수 없습니다.' };
  try {
    const hashedPassword = await bcrypt.hash(newPass, 10);
    const res = await sql`UPDATE users SET password = ${hashedPassword} WHERE user_id = ${userId}`;
    if (res.rowCount && res.rowCount > 0) {
      return { success: true, message: '비밀번호가 성공적으로 변경되었습니다.' };
    }
    return { success: false, message: '비밀번호 재설정에 실패했습니다.' };
  } catch (error) {
    console.error("비밀번호 재설정 에러:", error);
    return { success: false, message: '시스템 오류가 발생했습니다.' };
  }
}
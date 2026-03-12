'use server';

import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// 💡 [미나 마법 1] 쿠키를 확인해서 DB에서 실시간 점수와 계급을 가져옵니다!
export async function getUserProfile() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('ojemi_userid')?.value;
  const nickname = cookieStore.get('ojemi_user')?.value;

  if (!userId) return null;

  try {
    const { rows } = await sql`SELECT level, points FROM users WHERE user_id = ${userId}`;
    if (rows.length > 0) {
      return {
        nickname: nickname || userId,
        level: rows[0].level || '씨앗',
        points: rows[0].points || 0
      };
    }
  } catch (e) {
    console.error("Navbar 점수 불러오기 에러:", e);
  }
  return null;
}

// 💡 [미나 마법 2] 모든 화면에서 로그아웃을 할 수 있도록 기능을 추가합니다!
export async function handleLogoutAction() {
  const store = await cookies();
  store.delete('ojemi_user');
  store.delete('ojemi_userid');
  redirect('/');
}
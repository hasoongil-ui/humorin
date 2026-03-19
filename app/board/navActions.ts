'use server';

import { cookies } from 'next/headers';
import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';

// 💡 1. [점수 배달 요원] 유저의 닉네임, 레벨, 포인트를 가져옵니다.
export async function getUserProfile() {
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get('ojemi_userid');
  
  if (!userIdCookie) return null;

  try {
    const { rows } = await sql`SELECT nickname, level, points FROM users WHERE user_id = ${userIdCookie.value}`;
    if (rows.length > 0) return rows[0];
    return null;
  } catch (error) {
    console.error("유저 정보 불러오기 실패:", error);
    return null;
  }
}

// 💡 2. [로그아웃 요원] 쿠키를 삭제하고 로그아웃 시킵니다.
export async function handleLogoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('ojemi_user');
  cookieStore.delete('ojemi_userid');
  redirect('/');
}

// 💡 3. [게시판 배달 요원] 통제실(DB)에서 게시판 목록을 실시간으로 긁어옵니다.
export async function getDynamicBoards() {
  try {
    const { rows } = await sql`SELECT * FROM boards ORDER BY sort_order ASC, id ASC`;
    return rows;
  } catch (error) {
    console.error("게시판 목록 불러오기 실패:", error);
    return [];
  }
}
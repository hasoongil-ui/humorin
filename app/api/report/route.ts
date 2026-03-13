import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { postId, userId, isAdmin } = await request.json();
    if (!postId || !userId) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });

    const increment = isAdmin ? 10 : 1; // 💡 관리자는 10배 파워!

    // 💡 관리자는 중복 검사(INSERT)를 건너뛰고 제한 없이 클릭 가능!
    if (!isAdmin) {
      try {
        await sql`INSERT INTO reports (post_id, user_id) VALUES (${postId}, ${userId})`;
      } catch (error: any) {
        if (error.code === '23505') return NextResponse.json({ error: '이미 신고한 게시글입니다.' }, { status: 409 });
        throw error;
      }
    }

    await sql`UPDATE posts SET report_count = report_count + ${increment} WHERE id = ${postId}`;
    await sql`UPDATE posts SET is_blinded = true WHERE id = ${postId} AND report_count >= 5 AND is_safe = false`;

    return NextResponse.json({ success: true, message: isAdmin ? '🚨 관리자 슈퍼파워: 신고 10회 누적!' : '신고가 접수되었습니다.' });
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
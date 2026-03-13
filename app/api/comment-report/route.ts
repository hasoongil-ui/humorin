import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { commentId, userId, isAdmin } = await request.json();
    if (!commentId || !userId) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });

    const increment = isAdmin ? 10 : 1; // 💡 관리자는 10배 파워!

    if (!isAdmin) {
      try {
        await sql`INSERT INTO comment_reports (comment_id, user_id) VALUES (${commentId}, ${userId})`;
      } catch (error: any) {
        if (error.code === '23505') return NextResponse.json({ error: '이미 신고한 댓글입니다.' }, { status: 409 });
        throw error;
      }
    }

    await sql`UPDATE comments SET report_count = report_count + ${increment} WHERE id = ${commentId}`;
    await sql`UPDATE comments SET is_blinded = true WHERE id = ${commentId} AND report_count >= 5 AND is_safe = false`;

    return NextResponse.json({ success: true, message: isAdmin ? '🚨 관리자 슈퍼파워: 댓글 신고 10회 누적!' : '댓글 신고가 접수되었습니다.' });
  } catch (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
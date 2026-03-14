import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { commentId } = await request.json();
    
    const cookieStore = await cookies();
    const userIdCookie = cookieStore.get('ojemi_userid');
    const currentUserId = userIdCookie?.value;

    if (!currentUserId) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    if (currentUserId === 'admin') {
      return NextResponse.json({ error: '관리자는 신고할 수 없습니다.' }, { status: 403 });
    }

    const { rows: checkRows } = await sql`
      SELECT * FROM comment_reports 
      WHERE comment_id = ${commentId} AND reporter_id = ${currentUserId}
    `;

    if (checkRows.length > 0) {
      return NextResponse.json({ error: '이미 신고한 댓글입니다.' }, { status: 400 });
    }

    await sql`
      INSERT INTO comment_reports (comment_id, reporter_id)
      VALUES (${commentId}, ${currentUserId})
    `;

    await sql`
      UPDATE comments
      SET 
        report_count = COALESCE(report_count, 0) + 1,
        is_blinded = CASE WHEN COALESCE(report_count, 0) + 1 >= 5 THEN true ELSE is_blinded END
      WHERE id = ${commentId}
    `;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('댓글 신고 처리 중 에러 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { postId } = await request.json();
    
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
      SELECT * FROM post_reports 
      WHERE post_id = ${postId} AND reporter_id = ${currentUserId}
    `;

    if (checkRows.length > 0) {
      return NextResponse.json({ error: '이미 신고한 게시글입니다.' }, { status: 400 });
    }

    await sql`
      INSERT INTO post_reports (post_id, reporter_id)
      VALUES (${postId}, ${currentUserId})
    `;

    await sql`
      UPDATE posts
      SET 
        report_count = COALESCE(report_count, 0) + 1,
        is_blinded = CASE WHEN COALESCE(report_count, 0) + 1 >= 5 THEN true ELSE is_blinded END
      WHERE id = ${postId}
    `;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('게시글 신고 처리 중 에러 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
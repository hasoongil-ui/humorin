import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers'; 

export async function POST(request: Request) {
  try {
    const { commentId } = await request.json();

    const cookieStore = await cookies();
    const userIdCookie = cookieStore.get('humorin_userid');
    const currentUserId = userIdCookie?.value;

    if (!currentUserId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    // 1. 최고 관리자 및 부관리자 권한 스캔
    let isAdmin = currentUserId === 'admin';
    if (!isAdmin) {
      const { rows: adminRows } = await sql`SELECT is_admin FROM users WHERE user_id = ${currentUserId}`;
      if (adminRows.length > 0 && adminRows[0].is_admin) isAdmin = true;
    }

    // 2. 통제실 블라인드 기준치 똑같이 연동
    let threshold = 5;
    try {
      const { rows: settings } = await sql`SELECT value FROM site_settings WHERE key = 'report_blind_threshold'`;
      if (settings.length > 0) threshold = parseInt(settings[0].value, 10) || 5;
    } catch (e) {}

    const increment = isAdmin ? 10 : 1; 

    // 3. 일반 유저 중복 신고 방지 (관리자는 프리패스!)
    if (!isAdmin) {
      const { rows: checkRows } = await sql`SELECT * FROM comment_reports WHERE comment_id = ${commentId} AND reporter_id = ${currentUserId}`;
      if (checkRows.length > 0) return NextResponse.json({ error: '이미 신고한 댓글입니다.' }, { status: 400 });
      
      await sql`INSERT INTO comment_reports (comment_id, reporter_id) VALUES (${commentId}, ${currentUserId})`;
    }

    // 4. 💡 [수술 완료] 무적 방패(is_safe) 스캐너 장착! 
    await sql`
      UPDATE comments
      SET 
        report_count = COALESCE(report_count, 0) + ${increment},
        is_blinded = CASE 
                       WHEN is_safe THEN false
                       WHEN COALESCE(report_count, 0) + ${increment} >= ${threshold} THEN true 
                       ELSE is_blinded 
                     END
      WHERE id = ${commentId}
    `;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('댓글 신고 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
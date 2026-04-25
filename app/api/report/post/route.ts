import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { postId } = await request.json();
    
    // 1. 안전하게 쿠키에서 유저 정보 꺼내기
    const cookieStore = await cookies();
    const userIdCookie = cookieStore.get('humorin_userid');
    const currentUserId = userIdCookie?.value;

    if (!currentUserId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });

    // 2. 최고 관리자 및 부관리자 권한 완벽 스캔
    let isAdmin = currentUserId === 'admin';
    if (!isAdmin) {
      const { rows: adminRows } = await sql`SELECT is_admin FROM users WHERE user_id = ${currentUserId}`;
      if (adminRows.length > 0 && adminRows[0].is_admin) isAdmin = true;
    }

    // 3. 통제실 블라인드 기준치 가져오기
    let threshold = 5;
    try {
      const { rows: settings } = await sql`SELECT value FROM site_settings WHERE key = 'report_blind_threshold'`;
      if (settings.length > 0) threshold = parseInt(settings[0].value, 10) || 5;
    } catch (e) {}

    const increment = isAdmin ? 10 : 1; // 💡 관리자는 10배 파워 장착!

    // 4. 일반 유저만 중복 신고 차단 (관리자는 프리패스!)
    if (!isAdmin) {
      const { rows: checkRows } = await sql`SELECT * FROM post_reports WHERE post_id = ${postId} AND reporter_id = ${currentUserId}`;
      if (checkRows.length > 0) return NextResponse.json({ error: '이미 신고한 게시글입니다.' }, { status: 400 });
      await sql`INSERT INTO post_reports (post_id, reporter_id) VALUES (${postId}, ${currentUserId})`;
    }

    // 5. 💡 신고 누적 & 기준치 돌파 시 즉시 블라인드 처리 (완벽 연동)
    await sql`
      UPDATE posts
      SET 
        report_count = COALESCE(report_count, 0) + ${increment},
        is_blinded = CASE WHEN COALESCE(report_count, 0) + ${increment} >= ${threshold} THEN true ELSE is_blinded END
      WHERE id = ${postId}
    `;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('게시글 신고 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
// 파일 위치: app/api/report/post/route.ts
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

    // 3. 통제실 블라인드 기준치 & 💡[수술: 에이징 시간] 한번에 가져오기 (DB 최적화)
    let threshold = 5;
    let voteAgingHours = 0;
    try {
      const { rows: settings } = await sql`SELECT key, value FROM site_settings WHERE key IN ('report_blind_threshold', 'vote_aging_hours')`;
      settings.forEach(s => {
        if (s.key === 'report_blind_threshold') threshold = parseInt(s.value, 10) || 5;
        if (s.key === 'vote_aging_hours') voteAgingHours = parseInt(s.value, 10) || 0;
      });
    } catch (e) {}

    const increment = isAdmin ? 10 : 1; 

    // 4. 일반 유저 통제: 중복 신고 차단 및 💡[수술: 에이징 시간 통과 여부 검사]
    if (!isAdmin) {
      // ⏳ [수술 완료] 에이징 제한 검사
      if (voteAgingHours > 0) {
        const { rows: userRows } = await sql`SELECT created_at FROM users WHERE user_id = ${currentUserId}`;
        if (userRows.length > 0) {
          const joinDate = new Date(userRows[0].created_at);
          const hoursDiff = (Date.now() - joinDate.getTime()) / (1000 * 60 * 60);
          if (hoursDiff < voteAgingHours) {
            return NextResponse.json(
              { error: 'aging', message: `가입 후 ${voteAgingHours}시간이 지나야 신고할 수 있습니다.` }, 
              { status: 403 }
            );
          }
        }
      }

      // 🚫 중복 신고 검사
      const { rows: checkRows } = await sql`SELECT * FROM post_reports WHERE post_id = ${postId} AND reporter_id = ${currentUserId}`;
      if (checkRows.length > 0) return NextResponse.json({ error: '이미 신고한 게시글입니다.' }, { status: 400 });
      await sql`INSERT INTO post_reports (post_id, reporter_id) VALUES (${postId}, ${currentUserId})`;
    }

    // 5. 관리자의 신고는 무적 방패를 즉시 깨부수고 블라인드 시킨다!
    await sql`
      UPDATE posts
      SET 
        report_count = COALESCE(report_count, 0) + ${increment},
        is_safe = CASE 
                    WHEN ${isAdmin}::boolean THEN false 
                    ELSE is_safe 
                  END,
        is_blinded = CASE 
                       WHEN ${isAdmin}::boolean THEN true
                       WHEN is_safe THEN false
                       WHEN COALESCE(report_count, 0) + ${increment} >= ${threshold} THEN true 
                       ELSE is_blinded 
                     END
      WHERE id = ${postId}
    `;

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('게시글 신고 에러:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
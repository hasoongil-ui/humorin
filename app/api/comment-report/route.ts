import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { commentId, userId, isAdmin } = await request.json();
    if (!commentId || !userId) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });

    const increment = isAdmin ? 10 : 1; // 💡 관리자는 10배 파워!

    // 1. 일반 유저의 경우 '중복 신고' 방어 로직
    if (!isAdmin) {
      try {
        await sql`INSERT INTO comment_reports (comment_id, user_id) VALUES (${commentId}, ${userId})`;
      } catch (error: any) {
        if (error.code === '23505') return NextResponse.json({ error: '이미 신고한 댓글입니다.' }, { status: 409 });
        throw error;
      }
    }

    // 🚨 [핵심 버그 수정] 관리자가 지정한 블라인드 임계값(report_blind_threshold)을 DB에서 불러옵니다.
    let blindThreshold = 10; // 기본값 안전장치
    try {
      const { rows: settings } = await sql`SELECT value FROM site_settings WHERE key = 'report_blind_threshold'`;
      if (settings.length > 0 && settings[0].value) {
        blindThreshold = Number(settings[0].value) || 10;
      }
    } catch (e) {
      console.error("블라인드 설정값을 불러오는 중 오류 발생:", e);
    }

    // 2. 신고 횟수 누적 (일반 유저는 +1, 관리자는 +10)
    await sql`UPDATE comments SET report_count = report_count + ${increment} WHERE id = ${commentId}`;
    
    // 3. 누적된 신고 횟수가 '관리자가 설정한 값(blindThreshold)' 이상이면 블라인드 처리 (면역이 아닐 경우)
    await sql`
      UPDATE comments 
      SET is_blinded = true 
      WHERE id = ${commentId} 
        AND report_count >= ${blindThreshold} 
        AND is_safe = false
    `;

    return NextResponse.json({ 
      success: true, 
      message: isAdmin ? `🚨 관리자 슈퍼파워: 댓글 신고 10회 누적!` : '댓글 신고가 접수되었습니다.' 
    });
  } catch (error) {
    console.error("댓글 신고 처리 서버 오류:", error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
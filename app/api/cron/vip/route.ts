import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Vercel Cron의 안전한 호출인지 확인
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || '';
  if (authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const kstNow = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    const targetDate = new Date(kstNow.getTime() - 24 * 60 * 60 * 1000); 
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const date = targetDate.getDate();
    
    // 7일 단위 절대 주차 계산법 
    const week = Math.ceil(date / 7);

    // 중복 실행 방지
    const { rows: checkExisting } = await sql`
      SELECT id FROM weekly_vips 
      WHERE year = ${year} AND month = ${month} AND week = ${week}
    `;
    if (checkExisting.length > 0) {
      return NextResponse.json({ message: '이미 이번 주 VIP가 선정되었습니다.' }, { status: 200 });
    }

    // 💡 [TS 에러 완벽 해결] 배열(Array)을 만들지 않고 텍스트 그대로 가져옴
    const { rows: settings } = await sql`SELECT value FROM site_settings WHERE key = 'vip_blacklist'`;
    const rawBlacklist = (settings.length > 0 && settings[0].value) ? settings[0].value : '__dummy_nobody__';

    // 🚀 16대 인덱스를 활용한 활동지수 계산 및 TOP 4 추출
    const { rows: topVips } = await sql`
      WITH PostStats AS (
        SELECT author_id, COUNT(*) as post_count, COALESCE(SUM(likes), 0) as post_likes
        FROM posts
        WHERE date >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul') - INTERVAL '7 days'
        GROUP BY author_id
      ),
      CommentStats AS (
        SELECT author_id, COUNT(*) as comment_count
        FROM comments
        WHERE created_at >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul') - INTERVAL '7 days'
        GROUP BY author_id
      )
      SELECT 
        u.user_id, u.nickname, u.profile_image,
        (COALESCE(p.post_count, 0) * 10) + (COALESCE(c.comment_count, 0) * 2) + COALESCE(p.post_likes, 0) as total_score
      FROM users u
      LEFT JOIN PostStats p ON u.user_id = p.author_id
      LEFT JOIN CommentStats c ON u.user_id = c.author_id
      WHERE u.status = 'active'
        -- 💡 [핵심 타격] 배열 주입 에러 파괴! Postgres의 자체 함수(string_to_array)를 활용해 단일 텍스트를 내부에서 쪼개서 대조함
        AND u.user_id != ALL(string_to_array(REPLACE(${rawBlacklist}, ' ', ''), ','))
        AND ((COALESCE(p.post_count, 0) * 10) + (COALESCE(c.comment_count, 0) * 2) + COALESCE(p.post_likes, 0)) > 0
      ORDER BY total_score DESC
      LIMIT 4;
    `;

    // 💡 [TS 에러 완벽 해결] 모호한 값들을 명확한 String/Number로 강제 캐스팅
    for (const vip of topVips) {
      const vUserId = String(vip.user_id);
      const vNickname = String(vip.nickname);
      const vProfileImage = vip.profile_image ? String(vip.profile_image) : null;
      const vTotalScore = Number(vip.total_score);

      await sql`
        INSERT INTO weekly_vips (year, month, week, user_id, awarded_nickname, awarded_profile_image, total_score)
        VALUES (${year}, ${month}, ${week}, ${vUserId}, ${vNickname}, ${vProfileImage}, ${vTotalScore})
      `;
    }

    return NextResponse.json({ message: '주간 VIP 선정 및 박제 완료!', year, month, week, count: topVips.length }, { status: 200 });
    
  // 💡 [TS 에러 완벽 해결] any 타입 전면 금지 및 표준 에러 추적 적용
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown Error Occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
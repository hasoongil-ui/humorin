import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Vercel Cron의 안전한 호출인지 확인 (해커의 임의 호출 방어)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // 2. KST(한국 시간) 강제 동기화: 시간 여행 버그 원천 차단
    const kstNow = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    
    // 월요일 0시에 실행되므로, 심사 대상은 '어제(일요일)'가 속한 주차입니다.
    const targetDate = new Date(kstNow.getTime() - 24 * 60 * 60 * 1000); 
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    
    // 해당 월의 몇 주차인지 정확히 계산
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const dayOfWeek = firstDayOfMonth.getDay(); 
    const date = targetDate.getDate();
    const week = Math.ceil((date + dayOfWeek) / 7);

    // 3. 중복 실행 방지 (이미 이번 주차 VIP를 뽑았다면 스킵)
    const { rows: checkExisting } = await sql`
      SELECT id FROM weekly_vips 
      WHERE year = ${year} AND month = ${month} AND week = ${week}
    `;
    if (checkExisting.length > 0) {
      return NextResponse.json({ message: '이미 이번 주 VIP가 선정되었습니다.' }, { status: 200 });
    }

    // 4. 🚀 16대 인덱스를 활용한 0.001초 컷오프 활동지수 계산 및 TOP 4 추출
    // 공식: (지난 7일간 글 갯수 * 10) + (지난 7일간 댓글 갯수 * 2) + (지난 7일간 받은 추천 수 * 1)
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
        AND u.user_id != 'ruffian71' -- 💡 [추가된 타격 코드] 상실의 시대(관리자) 계정은 랭킹에서 영구 제외
        AND ((COALESCE(p.post_count, 0) * 10) + (COALESCE(c.comment_count, 0) * 2) + COALESCE(p.post_likes, 0)) > 0
      ORDER BY total_score DESC
      LIMIT 4;
    `;

    // 5. 추출된 TOP 4명을 영구 박제 테이블에 Insert (스냅샷 저장)
    for (const vip of topVips) {
      await sql`
        INSERT INTO weekly_vips (year, month, week, user_id, awarded_nickname, awarded_profile_image, total_score)
        VALUES (${year}, ${month}, ${week}, ${vip.user_id}, ${vip.nickname}, ${vip.profile_image}, ${vip.total_score})
      `;
    }

    return NextResponse.json({ message: '주간 VIP 선정 및 박제 완료!', year, month, week, count: topVips.length }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
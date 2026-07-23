import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { rowCount } = await sql`
      UPDATE posts 
      SET 
        status = 'published', 
        date = CURRENT_TIMESTAMP 
      WHERE 
        status = 'scheduled' AND scheduled_at <= CURRENT_TIMESTAMP
    `;

    return NextResponse.json({ 
      success: true, 
      message: `성공적으로 ${rowCount}개의 예약글이 실시간 발행 처리되었습니다.` 
    });
  } catch (error) {
    console.error('예약 발행 봇 작동 에러:', error);
    return NextResponse.json({ error: '서버 에러가 발생했습니다.' }, { status: 500 });
  }
}
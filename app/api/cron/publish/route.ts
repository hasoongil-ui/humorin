// 파일 위치: app/api/cron/publish/route.ts
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache'; // 💡 [수술 핵심] 캐시 파괴 모듈 수입

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

    // 🚨 능동 핑(Ping) 로직 추가: 발행된 예약글이 1개라도 있을 경우에만 실행
    if (rowCount !== null && rowCount > 0) {
      const sitemapUrl = 'https://www.humorin.kr/sitemap.xml';
      
      // 🛡️ Vercel 타임아웃 셧다운 방어막: 타 서버 응답 대기 없이 병렬 광속 처리 후 즉시 종료
      await Promise.allSettled([
        fetch(`https://www.google.com/ping?sitemap=${sitemapUrl}`),
        fetch(`https://www.bing.com/ping?sitemap=${sitemapUrl}`)
      ]);

      // 🚨 [나비효과 방어 완료] 예약글이 실제 발행된 순간에만 전체 화면 캐시 100% 강제 폭파
      revalidatePath('/', 'layout');
    }

    return NextResponse.json({ 
      success: true, 
      message: `성공적으로 ${rowCount}개의 예약글이 실시간 발행 처리되었습니다.` 
    });
  } catch (error) {
    console.error('예약 발행 봇 작동 에러:', error);
    return NextResponse.json({ error: '서버 에러가 발생했습니다.' }, { status: 500 });
  }
}
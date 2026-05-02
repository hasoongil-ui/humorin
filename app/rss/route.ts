import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// 구글/네이버 로봇이 접근할 때마다 무조건 DB에서 최신 상태를 강제로 새로고침해 오도록 만듭니다. (캐싱 렉 원천 차단)
export const dynamic = 'force-dynamic'; 

export async function GET() {
  try {
    // 1. 대표님 DB에서 정상 게시글 20개를 불러옵니다. (SEO를 위해 'author' 추가)
    const { rows: recentPosts } = await sql`
      SELECT id, title, author, date 
      FROM posts 
      WHERE COALESCE(status, 'published') = 'published' 
        AND is_blinded = false
      ORDER BY date DESC 
      LIMIT 20
    `;

    const siteURL = 'https://www.humorin.kr';

    // 2. 구글, 네이버, 빙이 요구하는 모든 완벽한 규격(guid, dc:creator 포함)으로 조립합니다.
    const rssItemsXml = recentPosts
      .map((post) => {
        // CDATA 렌더링 오류를 막기 위한 안전장치
        const safeTitle = post.title ? post.title.replace(/]]>/g, ']]&gt;') : '제목 없음';
        const safeAuthor = post.author ? post.author.replace(/]]>/g, ']]&gt;') : '유머인';
        const postURL = `${siteURL}/board/${post.id}`;
        
        return `
          <item>
            <title><![CDATA[${safeTitle}]]></title>
            <link>${postURL}</link>
            <guid isPermaLink="true">${postURL}</guid>
            <description><![CDATA[${safeTitle} 게시글입니다.]]></description>
            <dc:creator><![CDATA[${safeAuthor}]]></dc:creator>
            <pubDate>${new Date(post.date).toUTCString()}</pubDate>
          </item>
        `;
      })
      .join('');

    // 3. Atom(구글 최적화)과 DC(작성자 메타데이터 최적화) 네임스페이스를 모두 적용한 최강의 대문
    const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
      <rss version="2.0" 
           xmlns:atom="http://www.w3.org/2005/Atom" 
           xmlns:dc="http://purl.org/dc/elements/1.1/">
        <channel>
            <title>유머인</title>
            <link>${siteURL}</link>
            <description>세상의 모든 유머, 유머인</description>
            <language>ko</language>
            <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
            <atom:link href="${siteURL}/rss" rel="self" type="application/rss+xml" />
            ${rssItemsXml}
        </channel>
      </rss>`;

    // 4. 한글 깨짐을 방지하는 utf-8 헤더와 함께 로봇에게 반환합니다.
    return new NextResponse(rssXml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('RSS 실시간 생성 오류:', error);
    return new NextResponse('RSS 피드를 생성하는 중 오류가 발생했습니다.', { status: 500 });
  }
}
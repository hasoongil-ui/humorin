import { db } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { title, content, category } = await request.json();
  const client = await db.connect();
  
  try {
    // 💡 미나의 마법: 창고에 카테고리 칸이 없으니, 제목 앞에 [카테고리]를 붙여서 한 방에 넣습니다!
    const titleWithCategory = `[${category}] ${title}`;

    await client.sql`
      INSERT INTO posts (title, content)
      VALUES (${titleWithCategory}, ${content});
    `;
    return NextResponse.json({ message: 'Success' }, { status: 200 });
  } catch (error) {
    console.error("DB Error:", error);
    return NextResponse.json({ error: 'DB Insert Failed' }, { status: 500 });
  } finally {
    client.release();
  }
}
import { db } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { title, content, category } = await request.json();
  const client = await db.connect();

  try {
    // 📦 창고(posts 상자)에 글을 집어넣는 명령입니다!
    await client.sql`
      INSERT INTO posts (title, content, category)
      VALUES (${title}, ${content}, ${category});
    `;
    return NextResponse.json({ message: 'Success' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  } finally {
    client.release();
  }
}
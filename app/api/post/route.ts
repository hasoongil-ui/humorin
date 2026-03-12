import { db } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const { title, content, category, author } = await request.json();
  
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('ojemi_user');
  const userIdCookie = cookieStore.get('ojemi_userid');
  
  // 💡 닉네임과 아이디를 둘 다 가져옵니다!
  const currentUser = userCookie ? userCookie.value : null;
  const currentUserId = userIdCookie ? userIdCookie.value : null;

  const finalAuthor = currentUser || author || '익명';

  const client = await db.connect();
  
  try {
    const titleWithCategory = `[${category}] ${title}`;

    // 💡 [핵심 대공사] 글을 저장할 때, 화면 표시용 닉네임(author)과 추적용 아이디(author_id)를 같이 저장합니다!
    await client.sql`
      INSERT INTO posts (title, content, author, author_id)
      VALUES (${titleWithCategory}, ${content}, ${finalAuthor}, ${currentUserId});
    `;
    
    // 💡 [완벽한 포인트 시스템] 이제 닉네임이 아닌 '변하지 않는 아이디'를 추적하여 10점을 꽂습니다!
    if (currentUserId) {
      await client.sql`
        UPDATE users 
        SET points = COALESCE(points, 0) + 10 
        WHERE user_id = ${currentUserId}
      `;
    }
    
    return NextResponse.json({ message: 'Success' }, { status: 200 });
  } catch (error) {
    console.error("DB Error:", error);
    return NextResponse.json({ error: 'DB Insert Failed' }, { status: 500 });
  } finally {
    client.release();
  }
}
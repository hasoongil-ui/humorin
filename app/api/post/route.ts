import { db } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  // 💡 [수술 1] 프론트엔드에서 날아온 is_notice(공지사항 여부)를 받습니다!
  const { title, content, category, author, is_notice } = await request.json(); 
  
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('ojemi_user');
  const userIdCookie = cookieStore.get('ojemi_userid');
  
  const currentUser = userCookie ? userCookie.value : null;
  const currentUserId = userIdCookie ? userIdCookie.value : null;

  const finalAuthor = currentUser || author || '익명';

  const client = await db.connect();
  
  try {
    const titleWithCategory = `[${category}] ${title}`;

    // 🛡️ [수술 2: 이중 보안 자물쇠] 공지로 등록하려 할 때, 진짜 관리자가 맞는지 DB에서 한 번 더 깐깐하게 검사합니다.
    let finalIsNotice = false;
    if (is_notice && currentUserId) {
      const { rows } = await client.sql`SELECT is_admin FROM users WHERE user_id = ${currentUserId}`;
      if (currentUserId === 'admin' || (rows.length > 0 && rows[0].is_admin)) {
        finalIsNotice = true; // 진짜 관리자만 공지 권한 획득!
      }
    }

    // 💡 [수술 3] 검증이 끝난 공지사항 꼬리표(finalIsNotice)를 함께 저장합니다!
    await client.sql`
      INSERT INTO posts (title, content, author, author_id, is_notice)
      VALUES (${titleWithCategory}, ${content}, ${finalAuthor}, ${currentUserId}, ${finalIsNotice});
    `;
    
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
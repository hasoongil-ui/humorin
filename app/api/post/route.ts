import { db } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  // 1. 프론트엔드(화면)에서 보낸 데이터 받기 (💡 youtube 칸이 추가되었습니다!)
  const { title, content, category, author, youtube } = await request.json();
  
  // 2. 서버에서 '진짜 로그인한 유저'의 신분증(쿠키)을 검사합니다.
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('ojemi_user');
  const currentUser = userCookie ? userCookie.value : null;

  // 3. 만약 로그인한 상태라면 닉네임 위조를 막기 위해 무조건 '쿠키 닉네임'을 쓰고,
  //    비로그인 상태라면 화면에서 쓴 이름(author)을 허락해 줍니다.
  const finalAuthor = currentUser || author || '익명';

  const client = await db.connect();
  
  try {
    const titleWithCategory = `[${category}] ${title}`;

    // 4. 💡 미나의 핵심 수술: 드디어 DB 창고에 'youtube' 주소를 함께 밀어 넣습니다!
    await client.sql`
      INSERT INTO posts (title, content, author, youtube)
      VALUES (${titleWithCategory}, ${content}, ${finalAuthor}, ${youtube || null});
    `;
    
    return NextResponse.json({ message: 'Success' }, { status: 200 });
  } catch (error) {
    console.error("DB Error:", error);
    return NextResponse.json({ error: 'DB Insert Failed' }, { status: 500 });
  } finally {
    client.release();
  }
}
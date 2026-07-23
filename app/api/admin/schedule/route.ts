import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

async function verifyAdmin() {
  const store = await cookies();
  const userId = store.get('humorin_userid')?.value;
  const signature = store.get('humorin_signature')?.value;
  
  if (!userId || !signature || userId !== 'admin') return false;
  
  const expectedSig = crypto
    .createHmac('sha256', process.env.AUTH_SECRET!)
    .update(userId)
    .digest('hex');
    
  return signature === expectedSig;
}

export async function POST(req: Request) {
  if (!(await verifyAdmin())) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { title, content, category, author_id, scheduled_at, youtube } = await req.json();

    const { rows: userRows } = await sql`
      SELECT nickname FROM users WHERE user_id = ${author_id}
    `;
    const authorNickname = userRows.length > 0 ? userRows[0].nickname : '익명';

    // 🚨 [핵심 패치] 정식 글쓰기와 동일하게 제목에 카테고리 말머리 강제 결합
    const titleWithCategory = `[${category}] ${title}`;

    // 🚨 DB 삽입 시 title 대신 titleWithCategory 적용
    await sql`
      INSERT INTO posts (
        title, content, category, author, author_id, 
        status, scheduled_at, date, youtube
      )
      VALUES (
        ${titleWithCategory}, ${content}, ${category}, ${authorNickname}, ${author_id}, 
        'scheduled', ${scheduled_at}::timestamp, CURRENT_TIMESTAMP, ${youtube || null}
      )
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('관리자 예약 글쓰기 에러:', error);
    return NextResponse.json({ error: '데이터 저장 실패' }, { status: 500 });
  }
}
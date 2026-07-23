import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

async function verifyAdmin() {
  const store = await cookies();
  const userId = store.get('humorin_userid')?.value;
  const signature = store.get('humorin_signature')?.value;
  
  if (!userId || !signature) return false;
  if (userId !== 'admin' && userId !== 'ruffian71') return false;
  
  const expectedSig = crypto
    .createHmac('sha256', process.env.AUTH_SECRET || 'humorin-super-secret-key-2026-very-safe')
    .update(userId)
    .digest('hex');
    
  if (signature === expectedSig) return userId;
  return false;
}

export async function POST(req: Request) {
  const validUserId = await verifyAdmin();
  if (!validUserId) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { title, content, category, author_id, scheduled_at, youtube } = await req.json();

    const finalAuthorId = author_id || validUserId;

    const { rows: userRows } = await sql`
      SELECT nickname FROM users WHERE user_id = ${finalAuthorId}
    `;
    const authorNickname = userRows.length > 0 ? userRows[0].nickname : '익명';

    const titleWithCategory = `[${category}] ${title}`;

    await sql`
      INSERT INTO posts (
        title, content, category, author, author_id, 
        status, scheduled_at, date, youtube
      )
      VALUES (
        ${titleWithCategory}, ${content}, ${category}, ${authorNickname}, ${finalAuthorId}, 
        'scheduled', ${scheduled_at}::timestamp, CURRENT_TIMESTAMP, ${youtube || null}
      )
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('관리자 예약 글쓰기 에러:', error);
    return NextResponse.json({ error: '데이터 저장 실패' }, { status: 500 });
  }
}

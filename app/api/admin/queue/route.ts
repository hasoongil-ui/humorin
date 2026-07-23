import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// 최고 관리자 지문 감별 로직
async function verifyAdmin() {
  const store = await cookies();
  const userId = store.get('humorin_userid')?.value;
  const signature = store.get('humorin_signature')?.value;
  
  if (!userId || !signature || userId !== 'admin') return false;
  
  const expectedSig = crypto
    .createHmac('sha256', process.env.AUTH_SECRET || 'humorin-super-secret-key-2026-very-safe')
    .update(userId)
    .digest('hex');
    
  return signature === expectedSig;
}

// [GET] 대기 중인 예약 글 목록 불러오기
export async function GET(req: Request) {
  if (!(await verifyAdmin())) return new Response("Unauthorized", { status: 401 });

  try {
    const { rows } = await sql`
      SELECT id, title, category, author, author_id, scheduled_at, status 
      FROM posts 
      WHERE status = 'scheduled' 
      ORDER BY scheduled_at ASC
    `;
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return NextResponse.json({ error: '데이터 불러오기 실패' }, { status: 500 });
  }
}

// [DELETE] 예약 글 취소 (삭제)
export async function DELETE(req: Request) {
  if (!(await verifyAdmin())) return new Response("Unauthorized", { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID 누락' }, { status: 400 });

    await sql`DELETE FROM posts WHERE id = ${id} AND status = 'scheduled'`;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 });
  }
}

// 🚨 [PATCH] 새롭게 추가된 예약 시간 수정 엔진
export async function PATCH(req: Request) {
  if (!(await verifyAdmin())) return new Response("Unauthorized", { status: 401 });

  try {
    const { id, new_scheduled_at } = await req.json();

    if (!id || !new_scheduled_at) return NextResponse.json({ error: '데이터 누락' }, { status: 400 });

    await sql`
      UPDATE posts 
      SET scheduled_at = ${new_scheduled_at}::timestamp 
      WHERE id = ${id} AND status = 'scheduled'
    `;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('예약 시간 수정 에러:', error);
    return NextResponse.json({ error: '수정 실패' }, { status: 500 });
  }
}
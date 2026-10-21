import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
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

export async function PATCH(req: Request) {
  if (!(await verifyAdmin())) return new Response("Unauthorized", { status: 401 });

  try {
    const { id, new_scheduled_at, new_title, new_category } = await req.json();

    if (!id || (!new_scheduled_at && !(new_title && new_category))) return NextResponse.json({ error: '데이터 누락' }, { status: 400 });

    if (new_title && new_category) {
      const cleanTitle = String(new_title).replace(/^\[.*?\]\s*/, '');
      const formattedTitle = `[${new_category}] ${cleanTitle}`;
      await sql`
        UPDATE posts 
        SET title = ${formattedTitle}, category = ${new_category} 
        WHERE id = ${id} AND status = 'scheduled'
      `;
    }

    if (new_scheduled_at) {

    await sql`
      UPDATE posts 
      SET scheduled_at = ${new_scheduled_at}::timestamptz 
      WHERE id = ${id} AND status = 'scheduled'
    `;
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('예약 시간 수정 에러:', error);
    return NextResponse.json({ error: '수정 실패' }, { status: 500 });
  }
}


export async function POST(req: Request) {
  if (!(await verifyAdmin())) return new Response("Unauthorized", { status: 401 });

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: '데이터 누락' }, { status: 400 });

    const { rowCount } = await sql`
      UPDATE posts 
      SET status = 'published', date = CURRENT_TIMESTAMP 
      WHERE id = ${id} AND status = 'scheduled'
    `;

    if (rowCount !== null && rowCount > 0) {
      const sitemapUrl = 'https://www.humorin.kr/sitemap.xml';
      await Promise.allSettled([
        fetch(`https://www.google.com/ping?sitemap=${sitemapUrl}`),
        fetch(`https://www.bing.com/ping?sitemap=${sitemapUrl}`)
      ]);
      revalidatePath('/', 'layout');
      revalidatePath('/board');
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: '발행 대상 없음' }, { status: 404 });
  } catch (error) {
    console.error('즉시 발행 에러:', error);
    return NextResponse.json({ error: '발행 실패' }, { status: 500 });
  }
}

import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// 🚨 S급 관리자(마스터) 지문 감식기
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

// [POST] 관리자 페이지에서 넘어온 텍스트를 site_settings 테이블에 저장 (또는 덮어쓰기)
export async function POST(req: Request) {
  if (!(await verifyAdmin())) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { key, value } = await req.json();

    if (!key) {
       return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    // 🚀 충돌 시 덮어쓰기(UPSERT) 로직으로 무결성 보장
    await sql`
      INSERT INTO site_settings (key, value) 
      VALUES (${key}, ${value})
      ON CONFLICT (key) 
      DO UPDATE SET value = EXCLUDED.value
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings 저장 에러:', error);
    return NextResponse.json({ error: '데이터 저장 실패' }, { status: 500 });
  }
}

// [GET] 관제탑에 접속할 때 기존 명단을 불러와서 화면에 뿌려줌
export async function GET(req: Request) {
  if (!(await verifyAdmin())) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
       return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const { rows } = await sql`SELECT value FROM site_settings WHERE key = ${key}`;

    return NextResponse.json({ value: rows.length > 0 ? rows[0].value : '' });
  } catch (error) {
    console.error('Settings 조회 에러:', error);
    return NextResponse.json({ error: '데이터 조회 실패' }, { status: 500 });
  }
}
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
    const { title, content, category, author_id, scheduled_at, youtube, isSmartMode, smartInterval } = await req.json();

    let finalAuthorId = author_id || validUserId;
    let finalScheduledAt = scheduled_at ? new Date(scheduled_at).toISOString() : null;

    if (isSmartMode) {
      const { rows: lastPostRows } = await sql`
        SELECT author_id, scheduled_at 
        FROM posts 
        WHERE status = 'scheduled' AND scheduled_at IS NOT NULL 
        ORDER BY scheduled_at DESC 
        LIMIT 1
      `;
      
      const lastAuthorId = lastPostRows.length > 0 ? lastPostRows[0].author_id : null;
      const maxDateStr = lastPostRows.length > 0 ? lastPostRows[0].scheduled_at : null;

      const { rows: settings } = await sql`SELECT value FROM site_settings WHERE key = 'test_account_list'`;
      let testAccounts: string[] = [];
      if (settings.length > 0 && settings[0].value) {
        testAccounts = settings[0].value.split(',').map((id: string) => id.trim()).filter(Boolean);
      }
      
      if (testAccounts.length > 0) {
        const filteredAccounts = testAccounts.filter(id => id !== lastAuthorId);
        const poolToUse = filteredAccounts.length > 0 ? filteredAccounts : testAccounts;
        finalAuthorId = poolToUse[Math.floor(Math.random() * poolToUse.length)];
      } else {
        finalAuthorId = 'ruffian71'; 
      }

      // ✨ [마스터 패치] 시간 꼬리물기 + 100% 휴먼 패턴(랜덤 오차) 엔진 가동
      const intervalMs = (smartInterval || 60) * 60 * 1000;
      
      // 3분(180,000ms) ~ 14분(840,000ms) 사이의 불규칙한 랜덤 시간 생성
      const randomJitterMs = Math.floor(Math.random() * 12 * 60 * 1000) + (3 * 60 * 1000);
      
      let nextTime = new Date();
      
      if (maxDateStr) {
         const maxDate = new Date(maxDateStr);
         if (maxDate > nextTime) {
            nextTime = maxDate; 
         }
      }
      
      // 설정된 기본 간격(예: 60분)에 사람 같은 불규칙한 랜덤 시간(3~14분)을 더함
      nextTime.setTime(nextTime.getTime() + intervalMs + randomJitterMs);
      finalScheduledAt = nextTime.toISOString();
    }

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
        'scheduled', ${finalScheduledAt}::timestamp, CURRENT_TIMESTAMP, ${youtube || null}
      )
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('관리자 예약 글쓰기 에러:', error);
    return NextResponse.json({ error: '데이터 저장 실패' }, { status: 500 });
  }
}
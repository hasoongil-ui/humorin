import { db } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const SECRET_KEY = process.env.AUTH_SECRET || 'ojemi-super-secret-key-2026-very-safe';

// 🛡️ [수술 1] 뼈대 발라내는 스마트 엑스레이 함수 (그대로 유지)
const extractTextOnly = (htmlText: string) => {
  const noHtml = htmlText.replace(/<[^>]*>?/gm, ''); 
  return noHtml.replace(/[^\uAC00-\uD7A3a-zA-Z0-9]/g, '').toLowerCase(); 
};

export async function POST(request: Request) {
  const { title, content, category, author, is_notice, bot_trap } = await request.json(); 
  
  if (bot_trap) {
    console.log('🚨 [스팸 봇 차단 완료] 허니팟 함정에 걸려들었습니다.');
    return NextResponse.json({ message: 'Success' }, { status: 200 });
  }

  const client = await db.connect();
  
  try {
    // 🛡️ [수술 2] 하드코딩 삭제! DB(site_settings)에서 실시간으로 금칙어 명단을 가져옵니다!
    const { rows: settings } = await client.sql`SELECT value FROM site_settings WHERE key = 'forbidden_words'`;
    let forbiddenWords: string[] = [];
    if (settings.length > 0 && settings[0].value) {
      forbiddenWords = settings[0].value.split(',').map((w: string) => w.trim()).filter((w: string) => w !== '');
    }

    // 🛡️ [수술 3] 불러온 최신 명단으로 제목과 본문을 검사합니다.
    const cleanContent = extractTextOnly(content);
    const cleanTitle = extractTextOnly(title);

    for (const word of forbiddenWords) {
      if (cleanContent.includes(word) || cleanTitle.includes(word)) {
        console.log(`🚨 [금칙어 차단] 차단된 단어: ${word}`);
        return NextResponse.json({ error: 'forbidden_word', word: word }, { status: 400 }); 
      }
    }
    
    // --- 여기서부터는 기존 게시글 저장 로직 (완벽 보존) ---
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('ojemi_user');
    const userIdCookie = cookieStore.get('ojemi_userid');
    const signatureCookie = cookieStore.get('ojemi_signature'); 
    
    const currentUser = userCookie ? userCookie.value : null;
    const currentUserId = userIdCookie ? userIdCookie.value : null;
    const signature = signatureCookie ? signatureCookie.value : null;

    const finalAuthor = currentUser || author || '익명';
    const titleWithCategory = `[${category}] ${title}`;

    let finalIsNotice = false;
    
    if (is_notice && currentUserId && signature) {
      const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(currentUserId).digest('hex');
      
      if (signature === expectedSignature) {
        const { rows } = await client.sql`SELECT is_admin FROM users WHERE user_id = ${currentUserId}`;
        if (currentUserId === 'admin' || (rows.length > 0 && rows[0].is_admin)) {
          finalIsNotice = true; 
        }
      } else {
        console.error(`🚨 [보안 경고] 가짜 출입증으로 공지사항 작성 시도 감지! - 시도 ID: ${currentUserId}`);
      }
    }

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
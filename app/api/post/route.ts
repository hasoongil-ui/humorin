import { db } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers'; // 💡 headers 추가!
import crypto from 'crypto';

const SECRET_KEY = process.env.AUTH_SECRET || 'humorin-super-secret-key-2026-very-safe';

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
    const { rows: settings } = await client.sql`SELECT value FROM site_settings WHERE key = 'forbidden_words'`;
    let forbiddenWords: string[] = [];
    if (settings.length > 0 && settings[0].value) {
      forbiddenWords = settings[0].value.split(',').map((w: string) => w.trim()).filter((w: string) => w !== '');
    }

    const cleanContent = extractTextOnly(content);
    const cleanTitle = extractTextOnly(title);

    for (const word of forbiddenWords) {
      if (cleanContent.includes(word) || cleanTitle.includes(word)) {
        return NextResponse.json({ error: 'forbidden_word', word: word }, { status: 400 }); 
      }
    }
    
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('humorin_user');
    const userIdCookie = cookieStore.get('humorin_userid');
    const signatureCookie = cookieStore.get('humorin_signature'); 
    
    const currentUser = userCookie ? userCookie.value : null;
    const currentUserId = userIdCookie ? userIdCookie.value : null;
    const signature = signatureCookie ? signatureCookie.value : null;

    // 🚨 [여기가 미나 비서가 추가한 핵심 철통 방어막입니다!] 🚨
    // 로그인 쿠키(명찰)가 없으면 무조건 쫓아냅니다. 익명 글쓰기 절대 불가!
    if (!currentUserId || !currentUser) {
      console.log('🚨 [비인가 접근 차단] 로그인 없는 글쓰기 봇 공격 발견!');
      return NextResponse.json({ message: '로그인한 회원만 글을 쓸 수 있습니다.' }, { status: 401 });
    }

    // 이제 안심하고 작성자 이름을 지정합니다.
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
      }
    }

    // 1. 게시글 실제 저장
    await client.sql`
      INSERT INTO posts (title, content, author, author_id, is_notice)
      VALUES (${titleWithCategory}, ${content}, ${finalAuthor}, ${currentUserId}, ${finalIsNotice});
    `;
    
    // 🛡️ [추가] 게시글 작성 IP 로그 기록 (법적 의무)
    try {
      const headersList = await headers();
      const currentIp = headersList.get('x-user-ip') || '알수없음';
      
      await client.sql`
        INSERT INTO access_logs (user_id, action_type, ip_address) 
        VALUES (${currentUserId || 'anonymous'}, 'WRITE_POST', ${currentIp})
      `;
    } catch (logError) {
      console.error('글쓰기 로그 기록 실패 (무시):', logError);
    }
    
    if (currentUserId) {
      await client.sql`
        UPDATE users SET points = COALESCE(points, 0) + 10 WHERE user_id = ${currentUserId}
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
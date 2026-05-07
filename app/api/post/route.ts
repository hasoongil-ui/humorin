import { db } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers'; 
import crypto from 'crypto';

const SECRET_KEY = process.env.AUTH_SECRET || 'humorin-super-secret-key-2026-very-safe';

const extractTextOnly = (htmlText: string) => {
  const noHtml = htmlText.replace(/<[^>]*>?/gm, ''); 
  return noHtml.replace(/[^\uAC00-\uD7A3a-zA-Z0-9]/g, '').toLowerCase(); 
};

export async function POST(request: Request) {
  // 1. 프론트엔드에서 보낸 is_board_notice(게시판 공지) 값을 추가로 받습니다.
  const { title, content, category, author, is_notice, is_board_notice, bot_trap } = await request.json(); 
  
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

    if (!currentUserId || !currentUser) {
      console.log('🚨 [비인가 접근 차단] 로그인 없는 글쓰기 봇 공격 발견!');
      return NextResponse.json({ message: '로그인한 회원만 글을 쓸 수 있습니다.' }, { status: 401 });
    }

    const finalAuthor = currentUser || author || '익명';
    const titleWithCategory = `[${category}] ${title}`;

    let finalIsNotice = false;
    let finalIsBoardNotice = false; // 2. 서버 검증용 게시판 공지 변수 추가
    
    // 3. 권한 검증: 전체 공지(is_notice)나 게시판 공지(is_board_notice) 요청이 들어오면 반드시 관리자인지 확인
    if ((is_notice || is_board_notice) && currentUserId && signature) {
      const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(currentUserId).digest('hex');
      if (signature === expectedSignature) {
        const { rows } = await client.sql`SELECT is_admin FROM users WHERE user_id = ${currentUserId}`;
        if (currentUserId === 'admin' || (rows.length > 0 && rows[0].is_admin)) {
          if (is_notice) finalIsNotice = true; 
          if (is_board_notice) finalIsBoardNotice = true; 
        }
      }
    }

    // 4. DB 저장: is_board_notice 컬럼에 검증이 끝난 finalIsBoardNotice 값을 추가로 밀어 넣습니다.
    await client.sql`
      INSERT INTO posts (title, content, author, author_id, is_notice, is_board_notice)
      VALUES (${titleWithCategory}, ${content}, ${finalAuthor}, ${currentUserId}, ${finalIsNotice}, ${finalIsBoardNotice});
    `;
    
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
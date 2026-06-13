// 파일 위치: app/api/post/route.ts
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

    if (!currentUserId || !currentUser || !signature) {
      return NextResponse.json({ message: '로그인한 회원만 글을 쓸 수 있습니다.' }, { status: 401 });
    }

    const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(currentUserId).digest('hex');
    if (signature !== expectedSignature) {
      console.error('🚨 불법 쿠키 위조(Spoofing) 감지됨!');
      return NextResponse.json({ error: '인증 정보가 변조되었습니다.' }, { status: 403 });
    }

    // 💡 [수술 완료] 유저 상태뿐만 아니라 포인트(points)도 함께 가져오도록 쿼리 확장
    const { rows: userCheck } = await client.sql`SELECT status, points FROM users WHERE user_id = ${currentUserId}`;
    const userRow = userCheck.length > 0 ? userCheck[0] : { status: 'active', points: 0 };
    const statusStr = String(userRow.status || 'active').trim().toLowerCase();
    const userPoints = userRow.points || 0;
    
    const isBanned = ['banned', 'suspended', '정지'].includes(statusStr);
    const isShadowBanned = ['shadow_banned', 'shadowban', '그림자'].includes(statusStr);

    if (isBanned && currentUserId !== 'admin') {
      return NextResponse.json({ error: 'banned', message: '이용이 정지된 계정입니다.' }, { status: 403 });
    }

    // 🚨 [신규 스팸 방어막] 백엔드 단에서 10포인트 미만 링크 강제 차단 (해커 우회 방지)
    if (currentUserId !== 'admin' && userPoints < 10) {
      const contentWithoutMedia = content.replace(/<(img|video|iframe)[^>]*>/gi, '');
      const hasLink = contentWithoutMedia.includes('http://') || contentWithoutMedia.includes('https://') || contentWithoutMedia.includes('www.') || contentWithoutMedia.includes('.com');
      if (hasLink) {
        return NextResponse.json({ error: 'newbie_link', message: '스팸 방지를 위해 활동 점수 10점 미만은 외부 링크(URL)를 포함할 수 없습니다.' }, { status: 403 });
      }
    }

    const finalAuthor = currentUser || author || '익명';
    const titleWithCategory = `[${category}] ${title}`;

    let finalIsNotice = false;
    let finalIsBoardNotice = false;
    
    if (is_notice || is_board_notice) {
      const { rows } = await client.sql`SELECT is_admin FROM users WHERE user_id = ${currentUserId}`;
      if (currentUserId === 'admin' || (rows.length > 0 && rows[0].is_admin)) {
        if (is_notice) finalIsNotice = true; 
        if (is_board_notice) finalIsBoardNotice = true; 
      }
    }

    // 🚨 [도배 테러 방지] 30초 쿨타임
    const { rows: lastPost } = await client.sql`
      SELECT created_at FROM posts 
      WHERE author_id = ${currentUserId} 
      ORDER BY created_at DESC LIMIT 1
    `;
    
    if (lastPost.length > 0) {
      const lastPostTime = new Date(lastPost[0].created_at).getTime();
      const currentTime = new Date().getTime();
      const diffSeconds = (currentTime - lastPostTime) / 1000;
      
      if (diffSeconds < 30) {
        return NextResponse.json({ error: 'rate_limit', message: '도배 방지를 위해 30초 후에 다시 글을 쓸 수 있습니다.' }, { status: 429 });
      }
    }

    // DB 저장
    await client.sql`
      INSERT INTO posts (title, content, category, author, author_id, is_notice, is_board_notice, is_blinded)
      VALUES (${titleWithCategory}, ${content}, ${category}, ${finalAuthor}, ${currentUserId}, ${finalIsNotice}, ${finalIsBoardNotice}, ${isShadowBanned});
    `;
    
    try {
      const headersList = await headers();
      const currentIp = headersList.get('x-user-ip') || '알수없음';
      
      await client.sql`
        INSERT INTO access_logs (user_id, action_type, ip_address) 
        VALUES (${currentUserId || 'anonymous'}, 'WRITE_POST', ${currentIp})
      `;
    } catch (logError) { }
    
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
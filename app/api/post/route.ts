import { db } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const SECRET_KEY = process.env.AUTH_SECRET || 'ojemi-super-secret-key-2026-very-safe';

// 🛡️ [수술 1] 금칙어 리스트 (대장님이 원하시는 단어를 계속 추가하시면 됩니다!)
const FORBIDDEN_WORDS = ['도박', '카지노', '토토', '바카라', '릴게임', '비아그라', '성인용품'];

// 🛡️ [수술 2] 스마트 엑스레이 함수: 한글, 영문, 숫자만 남기고 띄어쓰기/특수문자는 뼈와 살을 분리해버립니다.
const extractTextOnly = (htmlText: string) => {
  const noHtml = htmlText.replace(/<[^>]*>?/gm, ''); // 1차: HTML 태그 날리기
  return noHtml.replace(/[^\uAC00-\uD7A3a-zA-Z0-9]/g, '').toLowerCase(); // 2차: 특수문자, 띄어쓰기 전부 날리고 소문자로 통일
};

export async function POST(request: Request) {
  // 💡 프론트엔드에서 날아온 데이터 + 함정(bot_trap)까지 모두 받습니다!
  const { title, content, category, author, is_notice, bot_trap } = await request.json(); 
  
  // 🛡️ [방어막 1: 허니팟 함정 발동]
  // 로봇이 함정 칸을 몰래 채워서 보냈다면? 저장 안 하고 그냥 "성공"이라고 뻥을 쳐서 돌려보냅니다.
  if (bot_trap) {
    console.log('🚨 [스팸 봇 차단 완료] 허니팟 함정에 걸려들었습니다.');
    return NextResponse.json({ message: 'Success' }, { status: 200 });
  }

  // 🛡️ [방어막 2: 스마트 금칙어 엑스레이 발동]
  // 봇이 아니라 악질 알바생이 "도@박", "카 지 노" 라고 써도 뼈대만 남겨서 다 잡아냅니다.
  const cleanContent = extractTextOnly(content);
  const cleanTitle = extractTextOnly(title);

  for (const word of FORBIDDEN_WORDS) {
    if (cleanContent.includes(word) || cleanTitle.includes(word)) {
      console.log(`🚨 [금칙어 차단] 차단된 단어: ${word}`);
      // 프론트엔드에 걸린 단어가 뭔지 알려줘서 경고창을 띄우게 만듭니다.
      return NextResponse.json({ error: 'forbidden_word', word: word }, { status: 400 }); 
    }
  }
  
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('ojemi_user');
  const userIdCookie = cookieStore.get('ojemi_userid');
  const signatureCookie = cookieStore.get('ojemi_signature'); 
  
  const currentUser = userCookie ? userCookie.value : null;
  const currentUserId = userIdCookie ? userIdCookie.value : null;
  const signature = signatureCookie ? signatureCookie.value : null;

  const finalAuthor = currentUser || author || '익명';

  const client = await db.connect();
  
  try {
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
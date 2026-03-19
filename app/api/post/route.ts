import { db } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto'; // 🛡️ [추가] 서명 검증 모듈

const SECRET_KEY = process.env.AUTH_SECRET || 'ojemi-super-secret-key-2026-very-safe';

export async function POST(request: Request) {
  // 💡 [수술 1] 프론트엔드에서 날아온 is_notice(공지사항 여부)를 받습니다!
  const { title, content, category, author, is_notice } = await request.json(); 
  
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('ojemi_user');
  const userIdCookie = cookieStore.get('ojemi_userid');
  const signatureCookie = cookieStore.get('ojemi_signature'); // 🛡️ [추가] 비밀 도장 가져오기
  
  const currentUser = userCookie ? userCookie.value : null;
  const currentUserId = userIdCookie ? userIdCookie.value : null;
  const signature = signatureCookie ? signatureCookie.value : null;

  const finalAuthor = currentUser || author || '익명';

  const client = await db.connect();
  
  try {
    const titleWithCategory = `[${category}] ${title}`;

    // 🛡️ [수술 2: 이중 보안 자물쇠 + 위조 도장 검사] 
    // 공지로 등록하려 할 때, 진짜 관리자가 맞는지 깐깐하게 검사합니다.
    let finalIsNotice = false;
    
    if (is_notice && currentUserId && signature) {
      // 🛡️ [수술 완료] 서명 위조 검증! 해커가 공지를 띄우는 것을 원천 차단!
      const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(currentUserId).digest('hex');
      
      if (signature === expectedSignature) {
        const { rows } = await client.sql`SELECT is_admin FROM users WHERE user_id = ${currentUserId}`;
        if (currentUserId === 'admin' || (rows.length > 0 && rows[0].is_admin)) {
          finalIsNotice = true; // 진짜 관리자만 공지 권한 획득!
        }
      } else {
        console.error(`🚨 [보안 경고] 가짜 출입증으로 공지사항 작성 시도 감지! - 시도 ID: ${currentUserId}`);
      }
    }

    // 💡 [수술 3] 검증이 끝난 공지사항 꼬리표(finalIsNotice)를 함께 저장합니다!
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
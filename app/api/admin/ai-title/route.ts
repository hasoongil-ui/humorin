import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 🚨 S급 관리자(마스터) 지문 감식기 (우회 원천 차단)
async function verifyAdmin() {
  const store = await cookies();
  const userId = store.get('humorin_userid')?.value;
  const signature = store.get('humorin_signature')?.value;

  if (!userId || !signature) return false;
  // '상실의 시대'와 'admin'만 허용
  if (userId !== 'admin' && userId !== 'ruffian71') return false;

  const expectedSig = crypto
    .createHmac('sha256', process.env.AUTH_SECRET || 'humorin-super-secret-key-2026-very-safe')
    .update(userId)
    .digest('hex');

  if (signature === expectedSig) return userId;
  return false;
}

export async function POST(req: Request) {
  // 1. 관리자 권한 철저 검증
  if (!(await verifyAdmin())) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const { title } = await req.json();

    if (!title) {
      return NextResponse.json({ error: '원본 제목이 필요합니다.' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 500 });
    }

    // 2. 구글 Gemini API 엔진 가동 (구글이 에러 로그에서 직접 지정해 준 최신 3.6-flash 모델 하드코딩)
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    // 3. SEO 최적화 프롬프트 
    const prompt = `
      당신은 커뮤니티 유머인의 수석 SEO 카피라이터입니다.
      다음 원본 제목을 바탕으로, 검색 엔진 최적화(SEO)와 클릭률(CTR)을 극대화할 수 있는 새로운 제목 3가지를 작성해주세요.

      [원본 제목]
      ${title}

      [절대 규칙]
      1. 원본의 핵심 키워드(명사)는 반드시 유지할 것.
      2. 모바일 검색 결과에서 잘리지 않도록 공백 포함 40~50자 사이로 작성할 것.
      3. '충격', '결국', '실제 사연' 등 호기심을 유발하는 단어를 자연스럽게 1~2개 섞을 것.
      4. 1번, 2번, 3번 같은 번호나 기호 없이 오직 제목 3줄만 결과로 출력할 것. 각 줄이 하나의 제목임.
    `;

    // 4. AI 답변 요청 및 파싱
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // 불필요한 번호표나 공백을 제거하고 정확히 3개의 배열로 정제
    const titles = text.split('\n')
      .map(t => t.replace(/^[-*0-9.]+\s*/, '').trim())
      .filter(t => t.length > 0)
      .slice(0, 3);

    return NextResponse.json({ success: true, titles });
  } catch (error) {
    console.error('AI 제목 최적화 에러:', error);
    return NextResponse.json({ error: 'AI 서버 통신 실패' }, { status: 500 });
  }
}
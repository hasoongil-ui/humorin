import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';

export default async function AdminSetupPage(props: any) {
  const cookieStore = await cookies();
  const currentUserId = cookieStore.get('ojemi_userid')?.value;
  
  // 🛡️ [수술 완료] 무식한 문지기 교체! 아이디가 'admin'이 아니더라도 DB에서 권한증을 확인합니다.
  let isAdmin = false;
  if (currentUserId === 'admin') {
    isAdmin = true;
  } else if (currentUserId) {
    try {
      const { rows } = await sql`SELECT is_admin FROM users WHERE user_id = ${currentUserId}`;
      if (rows.length > 0 && rows[0].is_admin) {
        isAdmin = true;
      }
    } catch (e) {}
  }

  // 관리자 권한이 없으면 메인 화면으로 돌려보냅니다.
  if (!isAdmin) redirect('/'); 

  // 🛠️ 통제실 DB 건설 함수
  async function buildDatabase() {
    'use server';
    
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS site_settings (
          key VARCHAR(50) PRIMARY KEY,
          value VARCHAR(255) NOT NULL
        );
      `;
      await sql`INSERT INTO site_settings (key, value) VALUES ('global_write_lock', 'false') ON CONFLICT DO NOTHING;`;
      await sql`INSERT INTO site_settings (key, value) VALUES ('global_comment_lock', 'false') ON CONFLICT DO NOTHING;`;
      await sql`INSERT INTO site_settings (key, value) VALUES ('editor_placeholder', '내용을 작성해 주십시오. 유튜브 영상은 주소를 이곳에 붙여넣기(Ctrl+V) 하시면 자동으로 추가됩니다.') ON CONFLICT DO NOTHING;`;
      
      await sql`INSERT INTO site_settings (key, value) VALUES ('forbidden_words', '도박,카지노,토토,바카라,릴게임,비아그라,성인용품') ON CONFLICT DO NOTHING;`;

      await sql`
        CREATE TABLE IF NOT EXISTS boards (
          id SERIAL PRIMARY KEY,
          name VARCHAR(50) UNIQUE NOT NULL,
          group_name VARCHAR(50) NOT NULL,
          is_write_locked BOOLEAN DEFAULT false,
          is_comment_locked BOOLEAN DEFAULT false,
          sort_order INTEGER DEFAULT 0
        );
      `;

      const initialBoards = [
        { name: '유머', group: '순한 유머 & 감동', order: 10 },
        { name: '감동', group: '순한 유머 & 감동', order: 20 },
        { name: '세상사는 이야기', group: '순한 유머 & 감동', order: 30 },
        { name: '귀여운 동물들', group: '순한 유머 & 감동', order: 40 },
        { name: '흥미로운 이야기', group: '순한 유머 & 감동', order: 50 },
        { name: '유용한 상식', group: '따뜻한 다락방', order: 60 },
        { name: '맛집', group: '따뜻한 다락방', order: 70 },
        { name: '가볼만한 곳', group: '따뜻한 다락방', order: 80 },
        { name: '볼만한 영화', group: '따뜻한 다락방', order: 90 },
        { name: '게시판 신설 요청', group: '따뜻한 다락방', order: 100 },
        { name: '건강', group: '지식 & 정보', order: 110 },
        { name: '재테크', group: '지식 & 정보', order: 120 },
        { name: '수필/에세이', group: '✒️ 나도 작가', order: 130 },
        { name: '시/단상', group: '✒️ 나도 작가', order: 140 },
        { name: '소설/웹소설', group: '✒️ 나도 작가', order: 150 },
        { name: '창작/기타', group: '✒️ 나도 작가', order: 160 }
      ];

      for (const b of initialBoards) {
        await sql`
          INSERT INTO boards (name, group_name, sort_order) 
          VALUES (${b.name}, ${b.group}, ${b.order}) 
          ON CONFLICT (name) DO NOTHING;
        `;
      }

    } catch (error) {
      console.error('DB 공사 실패:', error);
      throw error;
    }
    
    redirect('/admin/setup?success=true');
  }

  async function addForbiddenWord(formData: FormData) {
    'use server';
    const newWord = formData.get('newWord')?.toString().trim();
    if (!newWord) return;

    try {
      const { rows } = await sql`SELECT value FROM site_settings WHERE key = 'forbidden_words'`;
      let currentWords = rows.length > 0 ? rows[0].value : '';
      
      const wordsArray = currentWords ? currentWords.split(',').map((w: string) => w.trim()) : [];
      if (!wordsArray.includes(newWord)) {
        wordsArray.push(newWord);
        const newString = wordsArray.join(',');
        await sql`
          INSERT INTO site_settings (key, value) 
          VALUES ('forbidden_words', ${newString}) 
          ON CONFLICT (key) DO UPDATE SET value = ${newString};
        `;
      }
      revalidatePath('/admin/setup'); 
    } catch (e) {
      console.error(e);
    }
  }

  async function removeForbiddenWord(formData: FormData) {
    'use server';
    const wordToRemove = formData.get('wordToRemove')?.toString().trim();
    if (!wordToRemove) return;

    try {
      const { rows } = await sql`SELECT value FROM site_settings WHERE key = 'forbidden_words'`;
      if (rows.length === 0) return;

      let currentWords = rows[0].value;
      let wordsArray = currentWords.split(',').map((w: string) => w.trim());
      wordsArray = wordsArray.filter((w: string) => w !== wordToRemove); 
      const newString = wordsArray.join(',');

      await sql`UPDATE site_settings SET value = ${newString} WHERE key = 'forbidden_words'`;
      revalidatePath('/admin/setup'); 
    } catch (e) {
      console.error(e);
    }
  }

  // DB에 저장된 현재 금칙어 목록 불러오기
  let forbiddenWordsList: string[] = [];
  try {
    const { rows } = await sql`SELECT value FROM site_settings WHERE key = 'forbidden_words'`;
    if (rows.length > 0 && rows[0].value) {
      forbiddenWordsList = rows[0].value.split(',').map((w: string) => w.trim()).filter((w: string) => w !== '');
    }
  } catch (e) {}

  const searchParams = await props.searchParams;
  const isSuccess = searchParams?.success === 'true';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-sans p-4">
      <div className="max-w-2xl w-full flex flex-col gap-6">
        
        <div className="bg-white p-8 md:p-10 rounded-sm shadow-xl border border-gray-200 text-center">
          <h1 className="text-2xl font-black text-gray-800 mb-2">통제실 DB 건설 현장 🏗️</h1>
          <p className="text-sm text-gray-500 mb-8 font-bold">오재미의 게시판과 설정 데이터를 보관할 새로운 창고를 짓습니다.</p>
          
          {isSuccess ? (
            <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-sm">
              <div className="text-4xl mb-3">✅</div>
              <h2 className="text-lg font-black text-emerald-700 mb-1">건설 완료!</h2>
              <p className="text-xs text-emerald-600 font-bold mb-4">DB 세팅이 완벽하게 끝났습니다.</p>
              <Link href="/admin" className="inline-block px-6 py-2 bg-[#3b4890] text-white font-bold text-sm rounded-sm hover:bg-[#2a3042] transition-colors">
                관리자 메인으로 돌아가기
              </Link>
            </div>
          ) : (
            <form action={buildDatabase}>
              <button type="submit" className="w-full py-4 bg-rose-600 text-white font-black text-lg rounded-sm shadow-md hover:bg-rose-700 transition-all hover:scale-[1.02] active:scale-[0.98]">
                🚀 통제실 DB 공사 시작하기 (클릭!)
              </button>
              <p className="text-[11px] text-gray-400 mt-4 font-bold">이 버튼은 최고 관리자(admin)만 누를 수 있습니다.</p>
            </form>
          )}
        </div>

        <div className="bg-white p-8 md:p-10 rounded-sm shadow-xl border border-gray-200">
          <h2 className="text-xl font-black text-gray-800 mb-2 flex items-center gap-2">
            <span>🛡️</span> 스마트 금칙어 관리
          </h2>
          <p className="text-sm text-gray-500 mb-6 font-bold leading-relaxed">
            이곳에 단어를 등록해 두면, 악성 유저가 글이나 댓글을 쓸 때 특수문자나 띄어쓰기를 섞어 써도(예: 도.박, ㅋr지노) 봇이 자동으로 뼈대를 발라내서 차단합니다.
          </p>

          <div className="flex flex-wrap gap-2 mb-6 bg-gray-50 p-4 border border-gray-200 rounded-sm min-h-[100px] items-start">
            {forbiddenWordsList.length > 0 ? (
              forbiddenWordsList.map((word, index) => (
                <div key={index} className="flex items-center gap-1 bg-white border border-rose-300 text-rose-600 px-3 py-1.5 rounded-full shadow-sm text-[13px] font-black tracking-tight">
                  <span>{word}</span>
                  <form action={removeForbiddenWord}>
                    <input type="hidden" name="wordToRemove" value={word} />
                    <button type="submit" className="w-4 h-4 flex items-center justify-center bg-rose-100 hover:bg-rose-500 hover:text-white rounded-full text-[10px] ml-1 transition-colors" title="삭제">
                      ✕
                    </button>
                  </form>
                </div>
              ))
            ) : (
              <span className="text-gray-400 text-sm font-bold mt-2 mx-auto">등록된 금칙어가 없습니다.</span>
            )}
          </div>

          <form action={addForbiddenWord} className="flex gap-2">
            <input 
              type="text" 
              name="newWord" 
              required 
              placeholder="추가할 금칙어 입력 (예: 불법도박)" 
              className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-sm outline-none focus:border-[#3b4890] font-bold text-[14px] shadow-sm"
            />
            <button type="submit" className="px-6 py-3 bg-[#414a66] text-white font-black text-[14px] rounded-sm hover:bg-[#2a3042] transition-colors shadow-sm whitespace-nowrap">
              단어 추가
            </button>
          </form>
          
        </div>

      </div>
    </div>
  );
}
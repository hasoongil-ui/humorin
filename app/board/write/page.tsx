import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';

export default async function WritePage() {
  // 💡 미나의 철통 검문소: 컴퓨터가 대표님 주머니에서 출입증(쿠키)을 꺼내서 확인합니다!
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('ojemi_user');
  
  // 만약 출입증이 없다? (로그인을 안 했다면) 얄짤없이 로그인 화면으로 쫓아냅니다!
  if (!userCookie) {
    redirect('/login');
  }

  // 출입증에 적힌 진짜 닉네임을 가져옵니다!
  const author = userCookie.value; 

  const createPost = async (formData: FormData) => {
    'use server';
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    
    // 💡 옛날처럼 '하순길대표'를 억지로 박지 않고, 진짜 출입증에 있는 이름(author)으로 창고에 넣습니다!
    await sql`
      INSERT INTO posts (title, content, author)
      VALUES (${title}, ${content}, ${author})
    `;
    
    redirect('/board');
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-white p-4 border-b">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-black text-[#3b4890]">OJEMI</Link>
          
          {/* 우측 상단에 로그인한 사람의 닉네임을 띄워주는 센스! */}
          <div className="text-sm font-bold text-gray-600">
            반갑습니다, <span className="text-[#3b4890]">{author}</span>님!
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 mt-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-2xl font-black text-gray-800 mb-6">✍️ 폼나게 글쓰기</h2>
          
          <form action={createPost}>
            <div className="mb-4">
              <input 
                name="title" 
                placeholder="제목을 입력하세요 (명품 글의 시작!)" 
                className="w-full p-3 border rounded focus:outline-[#3b4890] font-bold text-gray-800" 
                required 
              />
            </div>
            
            <div className="mb-4">
              <textarea 
                name="content" 
                placeholder="내용을 입력하세요..." 
                className="w-full p-4 border rounded h-96 focus:outline-[#3b4890] resize-none text-lg text-gray-800" 
                required 
              ></textarea>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Link href="/board" className="px-6 py-2 bg-gray-100 rounded hover:bg-gray-200 font-bold text-gray-700 transition-colors">
                취소
              </Link>
              <button type="submit" className="px-8 py-2 bg-[#3b4890] text-white rounded font-extrabold hover:bg-[#222b5c] shadow-lg transition-colors">
                ✨ 명품 글 등록!
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
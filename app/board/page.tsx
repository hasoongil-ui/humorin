import { sql } from '@vercel/postgres';
import Link from 'next/link';

// ⏱️ 날짜를 "2026-03-04" 처럼 예쁘게 보여주는 마법 코드입니다!
function formatDate(dateString: any) {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default async function BoardPage() {
  // 📦 여기가 핵심! 창고(posts 상자)에서 최신순(ORDER BY date DESC)으로 보물을 꺼내옵니다!
  const { rows } = await sql`SELECT * FROM posts ORDER BY date DESC`;

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* 상단 로고 */}
      <header className="bg-white p-4 border-b">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-black text-blue-600">OJEMI</Link>
        </div>
      </header>

      {/* 파란색 명품 메뉴바 */}
      <nav className="bg-blue-600 text-white overflow-x-auto">
        <div className="max-w-5xl mx-auto flex">
          {['💯 백베스트', '👑 천베스트', '투데이 베스트', '전체글 보기', '유머', '감동', '공포', '일상', '그냥 혼잣말', '핫뉴스'].map((menu) => (
            <div key={menu} className="px-4 py-3 hover:bg-blue-700 font-bold text-sm cursor-pointer">{menu}</div>
          ))}
        </div>
      </nav>

      {/* 게시판 리스트 본체 */}
      <main className="max-w-5xl mx-auto p-4 mt-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          
          {/* 글쓰기 버튼 */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">전체글 보기</h2>
            <Link href="/board/write" className="px-6 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow-md">
              ✍️ 폼나게 글쓰기
            </Link>
          </div>

          {/* 리스트 항목 제목 칸 */}
          <div className="flex bg-gray-50 border-t border-b border-gray-200 py-3 text-sm font-bold text-gray-600 text-center">
            <div className="w-16">번호</div>
            <div className="flex-1">제목</div>
            <div className="w-24">글쓴이</div>
            <div className="w-32">날짜</div>
          </div>

          {/* 🚀 진짜 창고 데이터 뿌려주기! */}
          {rows.length === 0 ? (
            <div className="text-center py-10 text-gray-500">아직 창고에 등록된 명품 글이 없습니다. 첫 글의 주인공이 되어보세요!</div>
          ) : (
            rows.map((post) => (
              <div key={post.id} className="flex border-b border-gray-100 py-3 text-sm hover:bg-gray-50 items-center text-center cursor-pointer">
                <div className="w-16 text-gray-400">{post.id}</div>
                <div className="flex-1 text-left px-4 font-semibold text-gray-800">
                  {post.title}
                </div>
                {/* 👑 우리 대표님 이름이 딱! 들어가는 곳입니다 */}
                <div className="w-24 text-gray-600 font-bold">{post.author}</div>
                <div className="w-32 text-gray-400">{formatDate(post.date)}</div>
              </div>
            ))
          )}
          
        </div>
      </main>
    </div>
  );
}
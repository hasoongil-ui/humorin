import { sql } from '@vercel/postgres';
import Link from 'next/link';

export default async function PostDetailPage({ params }: { params: { id: string } }) {
  // 📦 창고에서 대표님이 클릭한 딱 그 '번호(id)'의 글만 콕 집어서 가져오는 마법 주문입니다!
  const { rows } = await sql`SELECT * FROM posts WHERE id = ${params.id}`;
  const post = rows[0];

  // 혹시라도 글이 없으면 보여줄 에러 화면
  if (!post) {
    return <div className="p-20 text-center text-2xl font-bold">글을 찾을 수 없습니다 😭</div>;
  }

  // 날짜 예쁘게 만들기
  const date = new Date(post.date);
  const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-white p-4 border-b">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-2xl font-black text-blue-600">OJEMI</Link>
        </div>
      </header>

      <nav className="bg-blue-600 text-white overflow-x-auto">
        <div className="max-w-5xl mx-auto flex">
          {['💯 백베스트', '👑 천베스트', '투데이 베스트', '전체글 보기'].map((menu) => (
            <div key={menu} className="px-4 py-3 hover:bg-blue-700 font-bold text-sm cursor-pointer">{menu}</div>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-4 mt-4">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          
          {/* 글 제목과 작성자 정보 */}
          <div className="border-b-2 border-gray-800 pb-4 mb-6">
            <h1 className="text-3xl font-black text-gray-900 mb-4">{post.title}</h1>
            <div className="flex justify-between text-gray-500 text-sm">
              <div className="font-bold text-blue-600 text-base">{post.author}</div>
              <div>{formattedDate}</div>
            </div>
          </div>

          {/* 🌟 진짜 글 내용(본문)이 멋지게 나오는 곳! */}
          <div className="min-h-[300px] text-gray-800 text-lg whitespace-pre-wrap leading-relaxed">
            {post.content}
          </div>

          {/* 하단 버튼 */}
          <div className="mt-10 border-t pt-6 flex justify-end">
            <Link href="/board" className="px-6 py-2 bg-gray-200 text-gray-800 rounded font-bold hover:bg-gray-300 transition-colors">
              목록으로 돌아가기
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}